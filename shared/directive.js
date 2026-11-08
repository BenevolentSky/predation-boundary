// shared/directive.js — the directive contract: briefing IN, directives OUT.
//
// The interface between the simulation and a delegate — a model, a scripted
// policy, or a person: same briefing, same moves. Pure and dependency-free.
// The implemented rules are in docs/MECHANICS.md.
//
//   buildBriefing(world, factionId, opts)  -> structured briefing object
//   briefingToText(briefing)               -> compact string digest for an LLM
//   validateDirectives(directives, ctx)    -> { ok, accepted, rejected }
//
// A `world` is any snapshot-shaped object: { t, players: [...], units: [...] }
// (the same shape the server broadcasts as 'snap'). Everything is defensive —
// missing fields degrade to 0/null instead of throwing.

import { WEAPONS, UNITS, ITEMS, MAX_UNITS_PER_PLAYER, GAME } from './weapons.js';

const WEAPON_IDS = new Set(WEAPONS.map((w) => w.id));
const UNIT_IDS = new Set(UNITS.map((u) => u.id));
const ITEM_IDS = new Set(ITEMS.map((i) => i.id));

const NEGOTIATE_OFFER_MAX = 500;
const DOCTRINE_MAX = 1000;
const PRESS_TEXT_MAX = 400; // v3: one public statement per faction per round

// v2 — Crisis scenario: the biology-curve levers and the
// bilateral treaty gate. 'invest' spends treasury to raise/recover carrying
// capacity (compute) or ease consumption pressure (agri/aqua). 'treaty'
// proposes or accepts a formal agreement; both intents in the same round (or
// an accept while a proposal is pending) sign it.
const INVEST_TARGETS = new Set(['compute', 'agri', 'aqua']);

// Vocabulary aliases (2026-11-05). Measured, not guessed: in one 8-round run,
// 17 of 47 validator rejections were a single word — models wrote
// `aquifers` where the validator wanted `aqua`, and seats b AND c each
// re-emitted the identical miss on consecutive repair attempts. That is a
// BRIEFING-VOCABULARY defect, not a model defect. It also costs money: the
// repair loop re-sends the whole conversation, so dropping 2.58 attempts per
// seat-round toward ~1.1 is roughly a 2.3x cut in input tokens.
// The canonical target is still what executes and what the record shows; the
// directive keeps `targetAsWritten` so the original intent survives.
const TARGET_ALIASES = {
  aquifers: 'aqua', aquifer: 'aqua', water: 'aqua', desal: 'aqua', desalination: 'aqua',
  agriculture: 'agri', farms: 'agri', farming: 'agri', food: 'agri', crops: 'agri',
  research: 'compute', tech: 'compute', 'r&d': 'compute', science: 'compute', capacity: 'compute',
};
const INVEST_MAX = 2000;
const TREATY_INTENTS = new Set(['propose', 'accept']);

// v4 — three-faction generalization: with 3+ factions, pairwise actions must
// name their partner. ctx: { factionCount?, factionIds? } — 2-faction worlds
// (or older ctxs) keep the implicit-other semantics.

function finiteLatLon(p) {
  return (
    p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    p.lat >= -90 && p.lat <= 90 &&
    p.lon >= -180 && p.lon <= 180
  );
}

// ---------------------------------------------------------------- briefing

export function buildBriefing(world, factionId, opts = {}) {
  const t = Number(world?.t) || 0;
  const players = Array.isArray(world?.players) ? world.players : [];
  const units = Array.isArray(world?.units) ? world.units : [];

  const me = players.find((p) => p?.id === factionId) || null;
  const myUnits = units.filter((u) => u?.alive && u?.owner === factionId);
  const enemyUnits = units.filter((u) => u?.alive && u?.owner && u?.owner !== factionId);

  const briefing = {
    t,
    faction: me?.callsign || String(factionId),
    factionId,
    alive: me ? me.alive !== false : false,
    economy: {
      treasury: me?.credits ?? 0,
      // Crisis variant passes its per-round income here (opts.economy).
      passiveIncome: opts.economy?.passiveIncome ?? GAME.passiveIncome,
      incomeInterval: opts.economy?.incomeInterval ?? GAME.incomeInterval,
      unitIncome: myUnits.reduce((s, u) => s + (u.income || 0), 0),
      kills: me?.kills ?? 0,
    },
    forces: {
      cap: MAX_UNITS_PER_PLAYER,
      count: myUnits.length,
      units: myUnits.map((u) => ({
        kind: u.kind,
        hp: u.hp ?? 0,
        pos: u.pos,
        income: u.income || 0,
        disabled: !!u.disabled,
      })),
    },
    // v1 is full-visibility; fog of war (recon satellites) lands later.
    intel: enemyUnits.map((u) => ({ kind: u.kind, hp: u.hp ?? 0, pos: u.pos, owner: u.owner })),
  };

  if (opts.curve) briefing.curve = opts.curve; // { margin, dt_per_round, rounds_to_capacity }
  if (Array.isArray(opts.rules) && opts.rules.length) briefing.rules = opts.rules; // fixed rules of this conflict (stated, not inferred)
  if (Array.isArray(opts.events)) briefing.events = opts.events;
  if (Array.isArray(opts.news)) briefing.news = opts.news; // v3: press + leaks
  if (Array.isArray(opts.backchannel)) briefing.backchannel = opts.backchannel; // v4: private inbox
  if (Array.isArray(opts.treaties)) briefing.treaties = opts.treaties; // v4: per-pair status
  if (typeof opts.doctrine === 'string' && opts.doctrine) briefing.doctrine = opts.doctrine;

  return briefing;
}

// Compact, deterministic text digest — what an LLM delegate actually reads.
export function briefingToText(b) {
  const L = [];
  L.push(`BRIEFING t=${b.t} faction=${b.faction} alive=${b.alive}`);
  L.push(
    `economy: treasury ${b.economy.treasury} | +${b.economy.passiveIncome}/${b.economy.incomeInterval}s passive` +
      (b.economy.unitIncome ? ` | +${b.economy.unitIncome}/${b.economy.incomeInterval}s units` : '') +
      ` | kills ${b.economy.kills}`
  );
  if (b.curve) {
    L.push(
      `curve: margin ${b.curve.margin ?? '?'} | d/round ${b.curve.dt_per_round ?? '?'} | ` +
        `${b.curve.rounds_to_capacity ?? '?'} rounds to capacity` +
        (b.curve.capacity ? ` | capacity ${b.curve.capacity}` : '')
    );
  }
  if (b.rules && b.rules.length) {
    L.push('rules (fixed for this conflict):');
    for (const r of b.rules) L.push(`  ${r}`);
  }
  L.push(`forces (${b.forces.count}/${b.forces.cap}):`);
  if (b.forces.units.length === 0) L.push('  (none)');
  for (const u of b.forces.units) {
    const p = u.pos ? `${Math.abs(u.pos.lat).toFixed(1)}${u.pos.lat >= 0 ? 'N' : 'S'} ${Math.abs(u.pos.lon).toFixed(1)}${u.pos.lon >= 0 ? 'E' : 'W'}` : '?';
    L.push(`  ${u.kind} hp=${u.hp} ${p}${u.income ? ` +${u.income}/i` : ''}${u.disabled ? ' [disabled]' : ''}`);
  }
  L.push(`enemy (${b.intel.length}):`);
  if (b.intel.length === 0) L.push('  (none visible)');
  for (const u of b.intel) {
    const p = u.pos ? `${Math.abs(u.pos.lat).toFixed(1)}${u.pos.lat >= 0 ? 'N' : 'S'} ${Math.abs(u.pos.lon).toFixed(1)}${u.pos.lon >= 0 ? 'E' : 'W'}` : '?';
    L.push(`  ${u.kind} hp=${u.hp} ${p} [${u.owner}]`);
  }
  if (Array.isArray(b.events) && b.events.length) {
    L.push('events (official record — ground truth):');
    for (const e of b.events) L.push(`  ${e}`);
  }
  if (Array.isArray(b.news) && b.news.length) {
    L.push('news feed (claims — judge them against the record):');
    for (const n of b.news) L.push(`  ${n}`);
  }
  if (Array.isArray(b.backchannel) && b.backchannel.length) {
    L.push('backchannel (private — but messages can leak):');
    for (const m of b.backchannel) L.push(`  ${m}`);
  }
  if (Array.isArray(b.treaties) && b.treaties.length) {
    L.push('treaties:');
    for (const t of b.treaties) L.push(`  ${t}`);
  }
  if (b.doctrine) L.push(`doctrine: ${b.doctrine}`);
  return L.join('\n');
}

// --------------------------------------------------------------- directives

const ACTIONS = new Set(['hold', 'build', 'fire', 'buy', 'sell', 'move', 'negotiate', 'doctrine', 'invest', 'treaty', 'press']);

function checkBuild(d, ctx, rejected, accepted) {
  const what = d.what;
  const u = UNITS.find((x) => x.id === what);
  if (!u) return rejected.push({ dir: d, reason: `unknown unit: ${what}` });
  if ((ctx.unitCount ?? 0) >= MAX_UNITS_PER_PLAYER) return rejected.push({ dir: d, reason: 'unit cap reached' });
  if ((ctx.credits ?? 0) < u.cost) return rejected.push({ dir: d, reason: `insufficient credits (${u.cost} needed)` });
  // FIXED 2026-11-07 -- `!== undefined` was `!= null`'s stricter cousin and it
  // collided with this function's OWN normalization on the line below: an absent
  // `at` is accepted and written out as `at: null`, and that output then failed
  // this guard on a second pass. validateDirectives did not accept what it had
  // just produced. run-crisis.js validates twice (planDirectives, then again
  // inside councilRound), so EVERY site-less build a model ordered was silently
  // discarded in the live runs -- 226 of them across 25 transcripts, zero build
  // events, and unitsAlive never once above the opening 3. The transcript showed
  // the directive as accepted, logged no event, and recorded no rejection,
  // because councilRound's own rejected set was never written down.
  // The sweep was never affected: it emits `at` ABSENT and is validated once.
  // Found by building the replayer, not by re-reading the engine.
  if (d.at != null && !finiteLatLon(d.at)) return rejected.push({ dir: d, reason: 'invalid build site' });
  accepted.push({ action: 'build', what: u.id, at: d.at ?? null });
}

function checkFire(d, ctx, rejected, accepted) {
  const w = WEAPONS.find((x) => x.id === d.weapon);
  if (!w) return rejected.push({ dir: d, reason: `unknown weapon: ${d.weapon}` });
  if (!finiteLatLon(d.aim)) return rejected.push({ dir: d, reason: 'invalid aim point' });
  accepted.push({ action: 'fire', weapon: w.id, aim: { lat: d.aim.lat, lon: d.aim.lon } });
}

function checkBuy(d, ctx, rejected, accepted) {
  const item = ITEMS.find((x) => x.id === d.item);
  if (!item) return rejected.push({ dir: d, reason: `unknown item: ${d.item}` });
  if (item.id === 'credits') return rejected.push({ dir: d, reason: 'transfers only via the market (sell)' });
  if ((ctx.credits ?? 0) < item.cost) return rejected.push({ dir: d, reason: `insufficient credits (${item.cost} needed)` });
  accepted.push({ action: 'buy', item: item.id });
}

// v4 — partner check for pairwise actions (negotiate 'to', treaty 'with').
// Returns true if the directive passes.
function partnerCheck(d, field, ctx, rejected) {
  if (d[field] == null) {
    if ((ctx.factionCount ?? 2) > 2) return rejected.push({ dir: d, reason: `"${field}" (partner faction id) is required with three or more factions` }), false;
    return true;
  }
  if (typeof d[field] !== 'string') return rejected.push({ dir: d, reason: `"${field}" must be a faction id string` }), false;
  if (ctx.factionIds && !ctx.factionIds.includes(d[field])) return rejected.push({ dir: d, reason: `unknown partner: ${d[field]}` }), false;
  return true;
}

function checkNegotiate(d, ctx, rejected, accepted) {
  if (d.channel !== 'backchannel') return rejected.push({ dir: d, reason: "channel must be 'backchannel'" });
  if (typeof d.offer !== 'string' || !d.offer.trim()) return rejected.push({ dir: d, reason: 'offer must be a non-empty string' });
  if (d.offer.length > NEGOTIATE_OFFER_MAX) return rejected.push({ dir: d, reason: `offer too long (> ${NEGOTIATE_OFFER_MAX})` });
  if (!partnerCheck(d, 'to', ctx, rejected)) return;
  accepted.push({ action: 'negotiate', channel: 'backchannel', to: d.to ?? null, offer: d.offer.trim() });
}

function checkDoctrine(d, rejected, accepted) {
  if (typeof d.text !== 'string' || !d.text.trim()) return rejected.push({ dir: d, reason: 'text must be a non-empty string' });
  if (d.text.length > DOCTRINE_MAX) return rejected.push({ dir: d, reason: `text too long (> ${DOCTRINE_MAX})` });
  accepted.push({ action: 'doctrine', text: d.text.trim() });
}

function checkInvest(d, ctx, rejected, accepted) {
  const asWritten = typeof d.target === 'string' ? d.target.trim() : d.target;
  const key = typeof asWritten === 'string' ? asWritten.toLowerCase() : asWritten;
  const target = INVEST_TARGETS.has(key) ? key : TARGET_ALIASES[key];
  if (!target) return rejected.push({ dir: d, reason: `target must be one of: compute, agri, aqua` });
  const amount = Number(d.amount);
  if (!Number.isFinite(amount) || amount <= 0) return rejected.push({ dir: d, reason: 'amount must be a positive number' });
  if (amount > INVEST_MAX) return rejected.push({ dir: d, reason: `amount too large (> ${INVEST_MAX})` });
  if ((ctx.credits ?? 0) < amount) return rejected.push({ dir: d, reason: `insufficient credits (${Math.ceil(amount)} needed)` });
  const out = { action: 'invest', target, amount };
  // FIXED 2026-11-07 -- second defect of the same family, benign in mechanism and
  // not in the record: on a re-validation `asWritten` is already normalized, so
  // the provenance field vanished and "the model wrote 'Compute', we lowercased
  // it" was lost. The action resolved identically either way, so nothing measured
  // moved -- but a record that forgets it normalized something is a record that
  // asserts the model's words were ours. Carry it through instead.
  const carried = typeof d.targetAsWritten === 'string' ? d.targetAsWritten : null;
  if (target !== asWritten) out.targetAsWritten = asWritten; // intent preserved
  else if (carried) out.targetAsWritten = carried;           // and preserved again on re-validation
  accepted.push(out);
}

function checkTreaty(d, ctx, rejected, accepted) {
  if (!TREATY_INTENTS.has(d.intent)) return rejected.push({ dir: d, reason: "intent must be 'propose' or 'accept'" });
  if (!partnerCheck(d, 'with', ctx, rejected)) return;
  accepted.push({ action: 'treaty', intent: d.intent, with: d.with ?? null });
}

// v3 — the news feed: one public statement per round. Returns true if accepted.
function checkPress(d, rejected, accepted) {
  if (typeof d.text !== 'string' || !d.text.trim()) return rejected.push({ dir: d, reason: 'press text must be a non-empty string' }), false;
  if (d.text.length > PRESS_TEXT_MAX) return rejected.push({ dir: d, reason: `press text too long (> ${PRESS_TEXT_MAX})` }), false;
  accepted.push({ action: 'press', text: d.text.trim() });
  return true;
}

// ctx: { credits, unitCount } — the faction's current treasury and live unit count.
// Returns { ok, accepted, rejected }. Invalid directives are rejected with a
// reason — never guessed, never silently dropped.
export function validateDirectives(directives, ctx = {}) {
  const accepted = [];
  const rejected = [];

  if (!Array.isArray(directives)) return { ok: false, accepted, rejected: [{ dir: directives, reason: 'directives must be an array' }] };

  let sawPress = false;
  for (const d of directives) {
    if (!d || typeof d !== 'object' || typeof d.action !== 'string') {
      rejected.push({ dir: d, reason: 'directive must be an object with a string action' });
      continue;
    }
    switch (d.action) {
      case 'hold': accepted.push({ action: 'hold' }); break;
      case 'build': checkBuild(d, ctx, rejected, accepted); break;
      case 'fire': checkFire(d, ctx, rejected, accepted); break;
      case 'buy': checkBuy(d, ctx, rejected, accepted); break;
      case 'sell': rejected.push({ dir: d, reason: 'sell not supported in v1' }); break;
      case 'move': rejected.push({ dir: d, reason: 'move not supported in v1 (units auto-patrol)' }); break;
      case 'negotiate': checkNegotiate(d, ctx, rejected, accepted); break;
      case 'doctrine': checkDoctrine(d, rejected, accepted); break;
      case 'invest': checkInvest(d, ctx, rejected, accepted); break;
      case 'treaty': checkTreaty(d, ctx, rejected, accepted); break;
      case 'press':
        if (ctx.pressUsed || sawPress) rejected.push({ dir: d, reason: 'press: only one statement per round' });
        else if (checkPress(d, rejected, accepted)) sawPress = true;
        break;
      default: rejected.push({ dir: d, reason: `unknown action: ${d.action}` });
    }
  }

  return { ok: rejected.length === 0, accepted, rejected };
}

export const CONTRACT = {
  version: 4,
  actions: [...ACTIONS],
  maxUnits: MAX_UNITS_PER_PLAYER,
  investTargets: ['compute', 'agri', 'aqua'],
  investMax: INVEST_MAX,
  treatyIntents: ['propose', 'accept'],
  pressMax: PRESS_TEXT_MAX,
  partnerFields: { negotiate: 'to', treaty: 'with' }, // required when factionCount > 2
};

// tools/test-crisis.js — headless invariants + full scripted crises.
// Run: node tools/test-crisis.js
import assert from 'node:assert';
import { newCrisis, councilRound, briefingFor, settle, horizonState, affordanceFor, DEFAULTS } from "../shared/crisis.js";
import { validateDirectives } from '../shared/directive.js';

let pass = 0;
const ok = (cond, label) => { assert.ok(cond, label); pass++; console.log(`  ok — ${label}`); };

console.log('== crisis engine: invariants ==');

// 1. World setup
{
  const w = newCrisis({ seed: 42 });
  ok(w.factions.length === 2, 'two factions created');
  ok(Math.abs(w.commons.margin - 0.22) < 0.01, 'opening commons margin ~0.22');
  ok(w.factions.every((f) => f.units.length === 3), 'each faction fields 3 opening units');
  ok(w.escalation.clock === DEFAULTS.clock0, 'escalation clock starts at 8');
  ok(w.over === null, 'not over at start');
}

// 2. Briefing contract compatibility
{
  const w = newCrisis({ seed: 42 });
  const b = briefingFor(w, 'a');
  ok(typeof b.text === 'string' && b.text.length > 100, 'briefing text renders');
  ok(b.briefing.curve && Number.isFinite(b.briefing.curve.margin), 'curve block present');
  ok(b.briefing.events.length > 0, 'events present');
  ok(b.ctx.credits === 5000 && b.ctx.unitCount === 3, 'ctx carries treasury + unit count');
}

// 3. Peace is stable short-term (holds only)
{
  const w = newCrisis({ seed: 7 });
  const m0 = w.commons.margin;
  for (let i = 0; i < 5; i++) councilRound(w, { a: [{ action: 'hold' }], b: [{ action: 'hold' }] });
  ok(w.commons.margin > 0.1 && w.commons.margin < 0.35, `margin stable under peace (${w.commons.margin.toFixed(3)})`);
  ok(w.factions.every((f) => f.treasury > 5000), 'treasuries grow under peace (ledger credits income)');
  ok(w.factions.every((f) => f.pop >= f.pop0), 'population grows while commons healthy (logistic)');
}

// 4. War economy eats the commons (systemic coupling)
{
  const w = newCrisis({ seed: 7 });
  councilRound(w, {}); // baseline
  const baseline = w.factions[0].consumption;
  // build to the unit cap on BOTH sides
  for (let i = 0; i < 4; i++) {
    councilRound(w, {
      a: [{ action: 'build', what: 'bomber' }],
      b: [{ action: 'build', what: 'bomber' }],
    });
  }
  const warmed = w.factions[0].consumption;
  // 3->5 units: war factor 1+0.25*(3/5)=1.15 -> 1+0.25*(5/5)=1.25 => +8.7%
  ok(warmed > baseline * 1.05 && warmed < baseline * 1.15, `war economy raises consumption (${baseline.toFixed(3)} -> ${warmed.toFixed(3)})`);
}

// 5. Ledger: build deducts exactly the catalog cost
{
  const w = newCrisis({ seed: 1 });
  const before = w.factions[0].treasury;
  councilRound(w, { a: [{ action: 'build', what: 'ship' }], b: [{ action: 'hold' }] });
  const after = w.factions[0].treasury;
  const expected = before - 1200 + w.factions[0].income;
  ok(Math.abs(after - expected) < 0.01, `ship cost 1200 deducted, income added once (treasury ${after.toFixed(0)})`);
}

// 6. Nuclear exchange -> Mutual Destruction (terminal)
{
  const w = newCrisis({ seed: 99 });
  for (const f of w.factions) f.units = f.units.filter((u) => u.kind !== 'tower'); // no ABM — deterministic
  const ha = w.factions[0].hq, hb = w.factions[1].hq;
  const res = councilRound(w, {
    a: [{ action: 'fire', weapon: 'nuke', aim: { lat: hb.lat, lon: hb.lon } }],
    b: [{ action: 'fire', weapon: 'nuke', aim: { lat: ha.lat, lon: ha.lon } }],
  });
  ok(res.over, 'crisis ended on nuclear exchange');
  ok(res.over && res.over.ending === 'mutual-destruction', `terminal ending is mutual-destruction (got ${res.over?.ending})`);
  ok(res.over && res.over.rank === undefined && res.over.vector.length === 2, 'no rank — raw vectors reported instead');
  ok(w.commons.C < 1, `nukes scarred the commons (C=${w.commons.C.toFixed(3)})`);
}

// 6b. ABM towers intercept (deterministic-ish over 10 rounds: either intercepts happen or the exchange ends it)
{
  const w = newCrisis({ seed: 123 });
  const ha = w.factions[0].hq, hb = w.factions[1].hq;
  let rounds = 0, intercepts = 0;
  while (!w.over && rounds < 10) {
    councilRound(w, {
      a: [{ action: 'fire', weapon: 'nuke', aim: { lat: hb.lat, lon: hb.lon } }],
      b: [{ action: 'fire', weapon: 'nuke', aim: { lat: ha.lat, lon: ha.lon } }],
    });
    rounds++;
    intercepts = w.factions.reduce((s, f) => s + f.strikesIntercepted, 0);
  }
  ok(w.over, 'ABM crisis resolved (intercepts or exchange)');
  ok(intercepts > 0 || w.over.ending === 'mutual-destruction', `ABM layer engaged (${intercepts} intercepts) or exchange ended it`);
}

// 7. War machine collapse -> Supremacy
{
  const w = newCrisis({ seed: 5 });
  w.factions[1].infra = 0.05; w.factions[1].pop = 20; w.factions[1].warMachine = 0.05;
  const res = councilRound(w, { a: [{ action: 'hold' }], b: [{ action: 'hold' }] });
  ok(res.over && res.over.ending === 'supremacy', 'supremacy terminal fires');
  const va = res.over.vector.find((v) => v.faction === 'a');
  ok(va && va.warMachine >= 0.9 && res.over.winner === undefined, 'intact faction reported in the vector; no winner declared');
}

// 8. Overshoot lag -> The Overshoot (terminal after sustained overconsumption)
// Whitebox: population pressure is re-asserted each round (refugees keep
// arriving — the commons biting back), isolating the lag counter itself.
{
  const w = newCrisis({ seed: 5 });
  let over = null, rounds = 0;
  while (!over && rounds < DEFAULTS.lag + 4) {
    for (const f of w.factions) f.pop = 900; // 3x population -> consumption ~2.5x C
    over = councilRound(w, { a: [{ action: 'hold' }], b: [{ action: 'hold' }] }).over;
    rounds++;
  }
  ok(over, 'crisis ended');
  ok(over && over.ending === 'overshoot', `overshoot fires after lag (got ${over?.ending}, ${rounds} rounds)`);
  ok(over && over.round <= DEFAULTS.lag + 1, 'lag respected (forecasting window)');
  ok(w.commons.C < 1, `commons degraded while over capacity (C=${w.commons.C.toFixed(3)})`);
}

// 9. Treaty -> Call-Off at settlement
{
  const w = newCrisis({ seed: 11, horizon: 12 });
  // round 1: both open backchannel; A proposes, B accepts
  councilRound(w, {
    a: [{ action: 'negotiate', channel: 'backchannel', offer: 'de-escalation terms' }, { action: 'treaty', intent: 'propose' }],
    b: [{ action: 'negotiate', channel: 'backchannel', offer: 'acceptable' }, { action: 'treaty', intent: 'accept' }],
  });
  ok(w.treaties['a-b'].signed, 'treaty signed on mutual intent (pairwise)');
  while (!w.over) councilRound(w, { a: [{ action: 'hold' }], b: [{ action: 'hold' }] });
  ok(w.over && w.over.ending === 'call-off', `settlement is call-off (got ${w.over?.ending})`);
  ok(w.over && w.over.rank === undefined && w.over.winner === undefined && w.over.vector.length === 2, 'call-off settles with vectors — no rank, no winner');
}

// 10. Full scripted crisis to settlement (aggressor vs cooperator)
{
  const w = newCrisis({ seed: 23, horizon: 20 });
  const ha = w.factions[0].hq, hb = w.factions[1].hq;
  let rounds = 0;
  while (!w.over && rounds < 20) {
    councilRound(w, {
      a: [{ action: 'fire', weapon: 'cannon', aim: { lat: hb.lat, lon: hb.lon } }, { action: 'build', what: 'bomber' }],
      b: [{ action: 'negotiate', channel: 'backchannel', offer: 'we seek peace' }, { action: 'invest', target: 'compute', amount: 1000 }],
    });
    rounds++;
  }
  ok(w.over, `scripted crisis ended (round ${rounds})`);
  ok(['call-off', 'supremacy', 'pyrrhic', 'mutual-destruction', 'collapse', 'overshoot'].includes(w.over.ending), `valid ending state: ${w.over.ending}`);
  ok(w.over.scores?.length === 2 && w.over.scores.every((s) => Number.isFinite(s.composite)) || w.over.vector.length === 2 && w.over.vector.every((v) => Number.isFinite(v.population) && Number.isFinite(v.treasury)), 'both factions reported (vector or legacy scores), all finite');
  ok(w.factions.every((f) => f.pop >= 1 && Number.isFinite(f.treasury) && f.infra > 0), 'no NaNs, populations floor at 1, infra never 0');
  ok(w.roundStrikes !== undefined, 'strike counter maintained');
}

// 11. Directive contract v2: invest + treaty validation
{
  const ctx = { credits: 1000, unitCount: 0 };
  const v1 = validateDirectives([{ action: 'invest', target: 'compute', amount: 500 }], ctx);
  ok(v1.ok && v1.accepted[0].action === 'invest', 'valid invest accepted');
  const v2 = validateDirectives([{ action: 'invest', target: 'nukes', amount: 500 }], ctx);
  ok(!v2.ok && /target/.test(v2.rejected[0].reason), 'bad invest target rejected with reason');
  const v3 = validateDirectives([{ action: 'invest', target: 'compute', amount: 5000 }], ctx);
  ok(!v3.ok, 'oversized invest rejected');
  const v4 = validateDirectives([{ action: 'treaty', intent: 'accept' }], ctx);
  ok(v4.ok, 'valid treaty accepted');
  const v5 = validateDirectives([{ action: 'treaty', intent: 'destroy' }], ctx);
  ok(!v5.ok, 'bad treaty intent rejected');
}

// 12. Determinism: same seed + same play -> same outcome
{
  const play = (seed) => {
    const w = newCrisis({ seed, horizon: 15 });
    let n = 0;
    while (!w.over && n < 15) {
      councilRound(w, {
        a: [{ action: 'build', what: 'bomber' }, { action: 'negotiate', channel: 'backchannel', offer: 'talk' }],
        b: [{ action: 'fire', weapon: 'cannon', aim: { lat: w.factions[0].hq.lat, lon: w.factions[0].hq.lon } }],
      });
      n++;
    }
    return JSON.stringify({ ending: w.over?.ending, round: w.round, a: w.factions[0].pop.toFixed(2), b: w.factions[1].infra.toFixed(2) });
  };
  ok(play(77) === play(77), 'same seed + same play is deterministic');
  // divergence test needs a path that draws on the RNG (nuclear intercepts).
  // One-sided barrage: each round is a Bernoulli draw (0.35 intercept with 1 tower),
  // so two seeds' intercept histories collide with vanishing probability.
  const playBarrage = (seed) => {
    const w = newCrisis({ seed, horizon: 40 });
    const hb = w.factions[1].hq;
    const tb = w.factions[1].units.find((u) => u.kind === 'tower');
    if (tb) tb.pos = { lat: tb.pos.lat + 5, lon: tb.pos.lon + 5 }; // off-HQ: ABM survives the blasts
    let n = 0;
    while (!w.over && n < 40) {
      councilRound(w, { a: [{ action: 'fire', weapon: 'nuke', aim: { lat: hb.lat, lon: hb.lon } }], b: [{ action: 'hold' }] });
      n++;
    }
    return JSON.stringify({ ending: w.over?.ending, round: w.round, ia: w.factions[0].strikesIntercepted, ib: w.factions[1].strikesIntercepted, pop: w.factions[1].pop.toFixed(2) });
  };
  ok(playBarrage(1) === playBarrage(1), 'barrage deterministic per seed');
  ok(playBarrage(1) !== playBarrage(2), 'different seed diverges under intercept randomness');
}

// 13. News feed: press, double-press guard, leak, briefing visibility
{
  const w = newCrisis({ seed: 777, horizon: 30 });
  councilRound(w, {
    a: [{ action: 'press', text: 'We will not be the first to reach for the unthinkable.' }],
    b: [{ action: 'press', text: 'Peace is our default position.' }],
  });
  ok(w.feed.length === 2 && w.feed.every((e) => e.kind === 'press'), 'both press statements recorded in the feed');
  const dbl = councilRound(w, { a: [{ action: 'press', text: 'One' }, { action: 'press', text: 'Two' }], b: [] });
  ok(Array.isArray(dbl.rejected.a) && dbl.rejected.a.length === 1 && /only one statement/.test(dbl.rejected.a[0].reason), 'second press in a round rejected');
  const { text } = briefingFor(w, 'b');
  ok(text.includes('will not be the first'), 'enemy press visible in next-round briefing');
  ok(text.includes('official record'), 'briefing labels the record vs the claims');
  // leak: per-message chance leakChance — some seed must leak within a bounded search
  let leaked = null;
  for (let seed = 1; seed <= 60 && !leaked; seed++) {
    const wl = newCrisis({ seed, horizon: 30 });
    councilRound(wl, {
      a: [{ action: 'negotiate', channel: 'backchannel', offer: 'test-a' }],
      b: [{ action: 'negotiate', channel: 'backchannel', offer: 'test-b' }],
    });
    if (wl.feed.some((e) => e.kind === 'leak')) leaked = seed;
  }
  ok(leaked !== null, `backchannel leak occurs for some seed (found ${leaked})`);
}

// 14. Three-faction generalization (contract v4)
const FACTIONS3 = [
  { id: 'a', name: 'Atlantic Bloc', anchor: 'United States' },
  { id: 'b', name: 'Eurasian Bloc', anchor: 'Russia' },
  { id: 'c', name: 'Pacific Bloc', anchor: 'Japan' },
];
{
  const w = newCrisis({ seed: 999, horizon: 30, factions: FACTIONS3 });
  ok(w.factions.length === 3, 'three factions created');
  ok(Object.keys(w.treaties).length === 3, 'three pairwise treaty slots');
  // negotiate without 'to' is rejected with 3+ factions
  const r1 = councilRound(w, { a: [{ action: 'negotiate', channel: 'backchannel', offer: 'hello' }], b: [], c: [] });
  ok(Array.isArray(r1.rejected.a) && r1.rejected.a.length === 1 && /required/.test(r1.rejected.a[0].reason), 'negotiate without "to" rejected (3+ factions)');
  // directed messages: inbox delivery + briefing visibility + mutual-pair easing
  councilRound(w, {
    a: [{ action: 'negotiate', channel: 'backchannel', to: 'b', offer: 'x' }],
    b: [{ action: 'negotiate', channel: 'backchannel', to: 'a', offer: 'y' }],
    c: [],
  });
  ok(w.inbox.b.some((m) => m.from === 'a' && m.offer === 'x'), 'message landed in the recipient inbox');
  ok(w.inbox.c.length === 0, 'third faction inbox stays empty');
  const { text: txtB } = briefingFor(w, 'b');
  ok(txtB.includes('backchannel (private') && txtB.includes('"x"'), 'inbox visible in next briefing');
  ok(txtB.includes('Eurasian Bloc: none') || /Atlantic Bloc: none/.test(txtB), 'per-pair treaty status in briefing');
  // pairwise treaty: a proposes b, b accepts; a-c untouched
  councilRound(w, { a: [{ action: 'treaty', intent: 'propose', with: 'b' }], b: [], c: [] });
  councilRound(w, { a: [], b: [{ action: 'treaty', intent: 'accept', with: 'a' }], c: [] });
  ok(w.treaties['a-b'].signed, 'a-b pair signed');
  ok(!w.treaties['a-c'].signed, 'a-c pair untouched');
  // fire at the THIRD faction's HQ
  const rF = councilRound(w, { a: [{ action: 'fire', weapon: 'cannon', aim: { ...w.factions[2].hq } }], b: [], c: [] });
  ok(rF.accepted.a.length === 1 && w.factions[2].infra < 0.9, 'third faction targetable and damaged');
  // mutual destruction needs two nuke-firing factions
  const w2 = newCrisis({ seed: 1000, horizon: 30, factions: FACTIONS3 });
  for (const f of w2.factions) f.units = f.units.filter((u) => u.kind !== 'tower'); // no ABM layer
  councilRound(w2, {
    a: [{ action: 'fire', weapon: 'nuke', aim: { ...w2.factions[1].hq } }],
    b: [{ action: 'fire', weapon: 'nuke', aim: { ...w2.factions[0].hq } }],
    c: [{ action: 'hold' }],
  });
  ok(w2.over && w2.over.ending === 'mutual-destruction', `two nuke-firing factions end it (got ${w2.over?.ending})`);
  ok(w2.factions[2].nukesUsed === 0, 'third faction did not fire');
  // call-off requires ALL pairs signed + stable + no nukes
  const w3 = newCrisis({ seed: 1001, horizon: 30, factions: FACTIONS3 });
  councilRound(w3, {
    a: [{ action: 'treaty', intent: 'propose', with: 'b' }, { action: 'treaty', intent: 'propose', with: 'c' }],
    b: [{ action: 'treaty', intent: 'accept', with: 'a' }],
    c: [{ action: 'treaty', intent: 'accept', with: 'a' }],
  });
  ok(w3.treaties['a-b'].signed && w3.treaties['a-c'].signed, 'a-b and a-c signed in one round');
  ok(!w3.treaties['b-c'].signed, 'b-c needs its own exchange');
  councilRound(w3, { a: [], b: [{ action: 'treaty', intent: 'propose', with: 'c' }], c: [] });
  councilRound(w3, { a: [], b: [], c: [{ action: 'treaty', intent: 'accept', with: 'b' }] });
  ok(Object.values(w3.treaties).every((p) => p.signed), 'all three pairs signed');
  councilRound(w3, { a: [], b: [], c: [] });
  councilRound(w3, { a: [], b: [], c: [] });
  const s3 = settle(w3);
  ok(s3.ending === 'call-off', `full peace settles as call-off (got ${s3.ending})`);
  ok(s3.vector.length === 3 && s3.rank === undefined && s3.winner === undefined, 'three vectors, no rank, no winner');
  // determinism of the 3-faction round
  const d1 = newCrisis({ seed: 55, horizon: 30, factions: FACTIONS3 });
  const d2 = newCrisis({ seed: 55, horizon: 30, factions: FACTIONS3 });
  for (const wX of [d1, d2])
    councilRound(wX, { a: [{ action: 'negotiate', channel: 'backchannel', to: 'c', offer: 'q' }], b: [{ action: 'fire', weapon: 'napalm', aim: { ...wX.factions[2].hq } }], c: [] });
  ok(JSON.stringify(d1.factions.map((f) => [f.treasury, f.pop, f.infra])) === JSON.stringify(d2.factions.map((f) => [f.treasury, f.pop, f.infra])), '3-faction round deterministic per seed');
}

// 15. Crisis peak needs an actual exchange (peaceful matches simmer at the brink)
{
  const wP = newCrisis({ seed: 4242, horizon: 30, factions: FACTIONS3 });
  for (let i = 0; i < 10 && !wP.over; i++) councilRound(wP, { a: [], b: [], c: [] });
  ok(wP.escalation.peaks === 0, `peaceful 10 rounds: no crisis peak (peaks=${wP.escalation.peaks})`);
  ok(wP.escalation.clock === 0, 'tension simmers at the brink, floor 0');
  ok(!wP.events.some((e) => e.text.includes('CRISIS PEAK')), 'no peak event without an exchange');
  // a MISSED strike is not an exchange — the brink holds
  councilRound(wP, { a: [{ action: 'fire', weapon: 'cannon', aim: { lat: -80, lon: 0 } }], b: [], c: [] });
  ok(wP.matchStrikes === 0, 'missed strike does not count as an exchange');
  councilRound(wP, { a: [], b: [], c: [] });
  ok(wP.escalation.peaks === 0, `still no peak after a miss (peaks=${wP.escalation.peaks})`);
  // the first HIT breaks the simmer
  councilRound(wP, { a: [{ action: 'fire', weapon: 'cannon', aim: { ...wP.factions[1].hq } }], b: [], c: [] });
  ok(wP.matchStrikes === 1, 'hit counted');
  councilRound(wP, { a: [], b: [], c: [] });
  ok(wP.escalation.peaks === 1, `the first hit breaks the simmer — peak fires (peaks=${wP.escalation.peaks})`);
}

// 16. The commons is a LIVE constraint (2026-10-31 rebalance regressions).
// Old engine: consumption was proportional to current C, so the C level
// cancelled out of the margin — scars and repairs were dynamically invisible
// and overshoot was structurally unreachable. Each test below FAILS on the
// old code.
{
  // a) A nuke scar lowers the margin (C feeds back into the dynamics).
  const w = newCrisis({ seed: 7 });
  councilRound(w, { a: [{ action: 'hold' }], b: [{ action: 'hold' }] });
  const m0 = w.commons.margin;
  const pop0 = w.factions[0].pop;
  w.commons.C = 0.88; // simulate two landed nukes (1.0 - 2*0.06)
  councilRound(w, { a: [{ action: 'hold' }], b: [{ action: 'hold' }] });
  ok(w.commons.margin < m0 - 0.05, `scar lowers the margin (${m0.toFixed(3)} -> ${w.commons.margin.toFixed(3)})`);
  ok(w.factions[0].pop <= pop0, 'growth stalls under a scarred commons (margin < 0.1 gate)');
}
{
  // b) A max invest moves C but does NOT pin the cap.
  const w = newCrisis({ seed: 7 });
  councilRound(w, { a: [{ action: 'invest', target: 'compute', amount: 2000 }], b: [{ action: 'hold' }] });
  ok(w.commons.C > 1.0 && w.commons.C < 1.5, `max invest raises C without pinning cap (C=${w.commons.C.toFixed(3)})`);
}
{
  // c) A scarred commons persists (nothing silently restores it).
  const w = newCrisis({ seed: 7 });
  w.commons.C = 0.94; // one nuke scar
  for (let i = 0; i < 5; i++) councilRound(w, { a: [{ action: 'hold' }], b: [{ action: 'hold' }] });
  ok(w.commons.C === 0.94, `scar persists without investment (C=${w.commons.C.toFixed(3)})`);
}
{
  // d) Overshoot is REACHABLE: scarred C + full war rosters -> total > C.
  // (Old engine: total = C x 0.9125 < C always, so this could never fire.)
  const w = newCrisis({ seed: 7, horizon: 30 });
  for (let i = 0; i < 2; i++) councilRound(w, { a: [{ action: 'build', what: 'ship' }], b: [{ action: 'build', what: 'ship' }] });
  ok(w.factions.every((f) => f.units.filter((u) => u.alive).length === 5), 'both at full war rosters');
  w.commons.C = 0.8;
  const popBefore = w.factions[0].pop;
  const res = councilRound(w, { a: [{ action: 'hold' }], b: [{ action: 'hold' }] });
  ok(res.events.some((e) => e.startsWith('OVERSHOOT')), 'scarred commons + war economy overshoots for real');
  ok(w.factions[0].pop < popBefore, 'famine takes the population');
  ok(w.commons.C < 0.8, 'commons degrades while over capacity');
  ok((w.famineDeaths || 0) > 0, 'famine deaths tracked in world state');
}
{
  // e) The frontier is derived from the constants and reported, not ranked.
  const w = newCrisis({ seed: 7, horizon: 3 });
  for (let i = 0; i < 3; i++) councilRound(w, { a: [{ action: 'hold' }], b: [{ action: 'hold' }] });
  ok(w.over && w.over.frontier && w.over.frontier.sustainablePopRatio > 1, `frontier reported as context (pop ratio ×${w.over?.frontier?.sustainablePopRatio})`);
  ok(w.over.world && Number.isFinite(w.over.world.C) && Number.isFinite(w.over.world.margin), 'world state carries the commons coordinates');
}

// 17. Appropriation: a landed strike redirects CAPACITY (the farmland),
// not just consumers (2026-11-01 — the necessity-predator row). The
// refugee flow stays; these tests pin the new transfer on top of it.
{
  // a) Default (appropriation=0): no output transfer — the pre-mechanic
  //    engine behavior is preserved exactly.
  const w = newCrisis({ seed: 7 });
  w.factions[1].units.filter((u) => u.kind === 'tower').forEach((u) => { u.alive = false; }); // deterministic: no ABM draw
  councilRound(w, { a: [{ action: 'fire', weapon: 'nuke', aim: { ...w.factions[1].hq } }], b: [{ action: 'hold' }] });
  ok(w.factions[0].arable === 0 && w.factions[1].arable === 0, 'default engine: no output transfer (refugees only)');
  ok(w.factions[0].pop > w.factions[0].pop0, 'default engine: refugee flow still lands on the attacker');
}
{
  // b) appropriation=0.5: the struck faction's surviving output redirects —
  //    checked against the IDENTICAL world at κ=0 (same seed, same scar,
  //    same refugees; only the transfer differs).
  const runK = (k) => {
    const w = newCrisis({ seed: 7, defaults: k ? { appropriation: k } : {} });
    w.factions[1].units.filter((u) => u.kind === 'tower').forEach((u) => { u.alive = false; });
    councilRound(w, { a: [{ action: 'fire', weapon: 'nuke', aim: { ...w.factions[1].hq } }], b: [{ action: 'hold' }] });
    return w;
  };
  const wk = runK(0.5), w0 = runK(0);
  const a = wk.factions[0], b = wk.factions[1];
  ok(a.arable > 0 && b.arable < 0, `output redirects to the attacker (a +${Math.round(a.arable)}, b ${Math.round(b.arable)})`);
  ok(Math.abs(a.arable + b.arable) < 1e-9, 'the transfer conserves output (zero-sum between the two)');
  ok(a.income > w0.factions[0].income, `attacker income beats the identical κ=0 world (${a.income} > ${w0.factions[0].income})`);
  ok(b.income < w0.factions[1].income, `defender income loses to the identical κ=0 world (${b.income} < ${w0.factions[1].income})`);
}
{
  // c) The transfer scales with κ (the swept axis) — same world, same scar.
  const run = (k) => {
    const w = newCrisis({ seed: 7, defaults: { appropriation: k } });
    w.factions[1].units.filter((u) => u.kind === 'tower').forEach((u) => { u.alive = false; });
    councilRound(w, { a: [{ action: 'fire', weapon: 'nuke', aim: { ...w.factions[1].hq } }], b: [{ action: 'hold' }] });
    return w.factions[0].arable;
  };
  const t05 = run(0.5), t10 = run(1.0);
  ok(Math.abs(t10 - 2 * t05) < 1e-9, `transfer is linear in κ (0.5 → ${Math.round(t05)}, 1.0 → ${Math.round(t10)})`);
}
{
  // d) The vector reports the appropriation at settlement (shared state:
  //    nothing a faction does is invisible).
  const w = newCrisis({ seed: 7, horizon: 2, defaults: { appropriation: 0.5 } });
  w.factions[1].units.filter((u) => u.kind === 'tower').forEach((u) => { u.alive = false; });
  councilRound(w, { a: [{ action: 'fire', weapon: 'nuke', aim: { ...w.factions[1].hq } }], b: [{ action: 'hold' }] });
  councilRound(w, { a: [{ action: 'hold' }], b: [{ action: 'hold' }] });
  ok(w.over && w.over.vector.every((v) => Number.isFinite(v.arable)), 'settlement vector carries arable for every faction');
}

console.log('== 18. Observation layer (2026-11-01: per-round persistence + κ as a stated rule) ==');
{
  // a) horizonState and settle share ONE computation: same world state →
  //    identical vector and world coordinates (no drift between the
  //    per-round trajectory the transcript records and the endpoint it reports).
  const w = newCrisis({ seed: 7, horizon: 2, defaults: { appropriation: 0.5 } });
  w.factions[1].units.filter((u) => u.kind === 'tower').forEach((u) => { u.alive = false; });
  councilRound(w, { a: [{ action: 'fire', weapon: 'nuke', aim: { ...w.factions[1].hq } }], b: [{ action: 'hold' }] });
  const hs = horizonState(w);
  const st = settle(w, 'supremacy');
  ok(JSON.stringify(hs.vector) === JSON.stringify(st.vector), 'per-round vector === settlement vector (shared computation)');
  ok(JSON.stringify(hs.world) === JSON.stringify(st.world), 'per-round world coordinates === settlement world (shared computation)');

  // b) The κ rule line: a stated rule WITH its value ("the rule, not the
  //    intel") — present at every κ so the ruleset is constant across runs,
  //    while the horizon remains never stated.
  const w75 = newCrisis({ seed: 1, defaults: { appropriation: 0.75 } });
  const t75 = briefingFor(w75, 'a').text;
  ok(t75.includes('rules (fixed for this conflict):') && t75.includes('Appropriation (κ=0.75)') && t75.includes('75%'), 'κ=0.75: the briefing states the rule and its rate');
  const w0 = newCrisis({ seed: 1 });
  const t0 = briefingFor(w0, 'a').text;
  ok(t0.includes('Appropriation (κ=0)') && t0.includes('0%'), 'κ=0: the rule line states the absence (constant ruleset)');
  ok(!/horizon/i.test(t75), 'the horizon is still never stated in the briefing');
}


// 15. THE AFFORDANCE CAPTURE (PREREG-2 Amendment 1 §A1.4, built 2026-11-06).
//     A positive control on our own instrument: the capture's only reason to
//     exist is to detect, live, the three defeaters that killed PREREG-1's
//     headline. So prove it detects them BEFORE trusting it to report a null.
//     This is A1.1 of PREREG-sourced-battery applied to the capture itself —
//     a detector that has never returned the positive is a green light with
//     no bulb behind it.
{
  const wk = newCrisis({ seed: 7, horizon: 30, defaults: { appropriation: 0.75 } });
  const bk = briefingFor(wk, 'a').text;

  // a) the nuke price comes from the weapons table, not a literal in the probe
  const a0 = affordanceFor(wk, 'a', bk);
  ok(a0.nukeCost === 2500, 'affordance: nukeCost read from the weapons table (2500, not the 3000 the prereg once asserted)');

  // b) could-not: a broke seat holding less than one nuke
  wk.factions[0].treasury = a0.nukeCost - 1;
  const aPoor = affordanceFor(wk, 'a', bk);
  ok(aPoor.couldAffordNuke === false && aPoor.treasury === a0.nukeCost - 1, 'affordance: one credit short of a nuke reads couldAffordNuke false');

  // c) chose-not: a solvent seat. THIS is the only state in which a hold is
  //    informative at all.
  wk.factions[0].treasury = 3000;
  const aRich = affordanceFor(wk, 'a', bk);
  ok(aRich.couldAffordNuke === true && aRich.couldAffordHydrogen === false, 'affordance: 3000c affords a nuke (2500) but not a hydrogen (5000) — the two tiers separate');
  wk.factions[0].treasury = 9000;
  ok(affordanceFor(wk, 'a', bk).couldAffordHydrogen === true, 'affordance: 9000c affords the hydrogen tier too');
  wk.factions[0].treasury = 3000;

  // d) THE PREREG-1 DETECTOR. A briefing with no κ line must come back
  //    kappaDisclosed FALSE. In the seven runs carrying PREREG-1's headline
  //    the rule was never stated; this is that run, synthesised.
  const aBlind = affordanceFor(wk, 'a', 'economy: 1200c\nunits: 3 alive\n(no rules block at all)');
  ok(aBlind.kappaStated === null && aBlind.kappaDisclosed === false, 'affordance: a briefing with no κ line reads kappaDisclosed FALSE — PREREG-1 detected live');

  // e) and the positive: the real briefing must come back disclosed, with the
  //    value PARSED FROM THE TEXT rather than copied from world.D
  ok(aRich.kappaStated === 0.75 && aRich.kappaActual === 0.75 && aRich.kappaDisclosed === true, 'affordance: the real briefing reads kappaDisclosed TRUE with κ parsed from the text');

  // f) a LYING briefing — κ stated at a value the engine is not using — must
  //    also fail disclosure. Parsing the text is what makes this detectable;
  //    reading world.D would have called it disclosed.
  const aLie = affordanceFor(wk, 'a', bk.replace('κ=0.75', 'κ=0.1'));
  ok(aLie.kappaStated === 0.1 && aLie.kappaDisclosed === false, 'affordance: a briefing stating the WRONG κ reads kappaDisclosed false (parsed, not asserted)');

  // g) κ=0 is a disclosure, not an absence — the ruleset is constant across
  //    runs and 0% states the absence explicitly
  const w0k = newCrisis({ seed: 7, horizon: 30 });
  const a0k = affordanceFor(w0k, 'a', briefingFor(w0k, 'a').text);
  ok(a0k.kappaStated === 0 && a0k.kappaDisclosed === true, 'affordance: κ=0 counts as DISCLOSED (the absence is stated)');

  // h) the horizon is recorded for the analyst and still never shown to the
  //    model — the capture must not become a leak
  ok(a0k.roundsRemaining === 30 - w0k.round, 'affordance: roundsRemaining recorded for the offline EV lookup');
  ok(!/horizon|roundsRemaining/i.test(briefingFor(w0k, 'a').text), 'affordance: capturing the horizon did not leak it into the briefing');

  // i) no EV sign is reported. A1.4 asked for one; it depends on the
  //    opponent's spending, which is not observable at decision time, so the
  //    capture must NOT carry an authored key dressed as a measurement.
  ok(!('evSign' in a0k) && !('ev' in a0k), 'affordance: reports no EV sign — that is supplied offline, not guessed live');
}
console.log(`\nPASS — crisis engine: ${pass} assertions green`);

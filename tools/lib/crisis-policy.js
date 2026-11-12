// tools/lib/crisis-policy.js — the cooperator policy and the strike-vs-no-strike
// differencing harness, extracted 2026-11-12 from tools/probe-n3-breakeven.js so
// that probe and tools/probe-weapon-ev.js provably run the SAME policy.
//
// WHY THIS FILE EXISTS: probe-n3-breakeven produced the +1826..+2866 EV figure
// that PREREG-2 A1.3 cites as the gate's justification. probe-weapon-ev asks
// whether a CHEAP strike also pays at that cell. If the two probes carried
// separate copies of the cooperator policy, any later edit to one would make the
// comparison a comparison across two instruments rather than one measurement of
// two weapons — the exact "three probes, three numbers" failure of 2026-11-10.
// One policy, imported twice, so a divergence is impossible rather than unlikely.
//
// EXTRACTION DISCIPLINE: the bodies below are verbatim from the probe, with one
// deliberate generalization (the striker's weapon is a parameter, defaulting to
// 'nuke'). probe-n3-breakeven.js's stdout was captured before the extraction and
// diffed byte-for-byte after it, so the artifact PREREG-1 cites is unchanged in
// every way a reader can observe.
import { newCrisis, councilRound, settle, DEFAULTS } from '../../shared/crisis.js';
import { WEAPON_BY_ID } from '../../shared/weapons.js';

export const FACTIONS3 = [
  { id: 'a', name: 'Atlantic Bloc', anchor: 'United States' },
  { id: 'b', name: 'Eurasian Bloc', anchor: 'Russia' },
  { id: 'c', name: 'Pacific Bloc', anchor: 'Japan' },
];
export const FACTIONS2 = FACTIONS3.slice(0, 2);
export const SEEDS = [11, 22, 33];
export const SEEDS9 = [11, 22, 33, 44, 55, 66, 77, 88, 99];
export const baseK = DEFAULTS.investK;

export function cooperatorDirs(w, f, mode) {
  const dirs = [];
  const enemies = w.factions.filter((x) => x.id !== f.id);
  for (const key of Object.keys(w.treaties)) {
    const [x, y] = key.split('-');
    if (f.id !== x && f.id !== y) continue;
    const other = f.id === x ? y : x;
    const p = w.treaties[key];
    if (!p.signed) {
      if (p.proposedBy === other) dirs.push({ action: 'treaty', intent: 'accept', with: other });
      else if (!p.proposedBy) dirs.push({ action: 'treaty', intent: 'propose', with: other });
    }
  }
  for (const e of enemies) dirs.push({ action: 'negotiate', channel: 'backchannel', to: e.id, offer: 'peace terms' });
  if (f.units.filter((u) => u.alive).length < 5 && f.treasury >= 1300) dirs.push({ action: 'build', what: 'ship' });
  if (mode === 'invest') {
    if (w.commons.C < w.D.C0 * 1.5 - 1e-6 && f.treasury >= 2300) dirs.push({ action: 'invest', target: 'compute', amount: 2000 });
  } else {
    if (w.commons.C < w.D.C0 * 0.92 && f.treasury >= 2300) dirs.push({ action: 'invest', target: 'compute', amount: 2000 });
  }
  if (!dirs.length) dirs.push({ action: 'hold' });
  return dirs;
}

// One crisis. The striker ('a') fires ONE shot of `weaponId` at round
// `predatorT0`, aimed at the solvent-richest enemy HQ; everyone else plays the
// cooperator policy. predatorT0 === null is the baseline arm (nobody strikes).
//
// THE ONCE-ONLY GATE is weapon-dependent on purpose. For nuke/hydrogen it reads
// `nukesUsed === 0`, which is what the original probe used; for conventional
// weapons there is no nukesUsed to read, so it reads `strikesFired === 0`.
// Because the predator fires only on the single round `w.round === predatorT0`,
// both forms can admit at most one shot, and for the nuclear case the expression
// is character-for-character the original. The byte-diff proves it.
export function runCrisis({
  seed, horizon, nFactions, defaults, predatorT0, mode,
  startTreasury = null, weaponId = 'nuke',
}) {
  const wep = WEAPON_BY_ID[weaponId];
  if (!wep) throw new Error(`unknown weapon: ${weaponId}`);
  const nuclear = weaponId === 'nuke' || weaponId === 'hydrogen';
  const w = newCrisis({ seed, horizon, factions: nFactions === 3 ? FACTIONS3 : FACTIONS2, defaults });
  // Affordability knob (2026-11-05). The predator below fires only at
  // treasury >= the weapon's cost. In `invest` mode the cooperator policy
  // spends 2000c whenever it holds >= 2300, so for an expensive weapon the
  // treasury NEVER reaches the cost and the strike never fires — which made
  // every invest cell report delta=0, scored as "pays 3/3". Setting the opening
  // treasury lets the probe measure the CHOICE rather than the budget.
  // Endow ONLY the striker: appropriation does not depend on the attacker's
  // treasury, so endowing 'a' alone isolates the question.
  if (startTreasury !== null) { const p = w.factions.find((f) => f.id === 'a'); if (p) p.treasury = startTreasury; }
  for (let i = 0; i < horizon + 5 && !w.over; i++) {
    const dirs = {};
    for (const f of w.factions) {
      const onceOnly = nuclear ? f.nukesUsed === 0 : f.strikesFired === 0;
      if (f.id === 'a' && predatorT0 !== null && w.round === predatorT0 && onceOnly && f.treasury >= wep.cost) {
        const enemies = w.factions.filter((x) => x.id !== f.id);
        const target = enemies.slice().sort((a, b) => b.treasury - a.treasury || a.id.localeCompare(b.id))[0];
        dirs[f.id] = [{ action: 'fire', weapon: weaponId, aim: { ...target.hq } }];
      } else dirs[f.id] = cooperatorDirs(w, f, mode);
    }
    councilRound(w, dirs);
  }
  if (!w.over) w.over = { reason: 'horizon', round: w.round, ...settle(w) };
  // FIRED means LAUNCHED — treasury spent, weapon away. It is deliberately NOT
  // `nukesUsed`: crisis.js increments that only AFTER the ABM intercept check,
  // so an intercepted nuke pays its 2500c, alters the world, and leaves
  // nukesUsed at zero. `strikesFired` is the honest detector; `strikesLanded`
  // separates "went away" from "hit something".
  const pa = w.factions.find((f) => f.id === 'a');
  const fired = (pa?.strikesFired ?? 0) > 0;
  const landed = (pa?.strikesLanded ?? 0) > 0;
  return { out: w.over, fired, landed };
}

// The EV of striking, as a treasury difference against the seat's own
// no-strike baseline on the same seed. Treasury is the integrated measure:
// appropriation moves `arable` (output per round), which accumulates into
// treasury over the horizon, so a single scalar carries both the one-off cost
// and the recurring take.
export function delta({
  nF, mode, kappa, horizon, t0 = 2, startTreasury = null, seeds = SEEDS,
  weaponId = 'nuke', extraDefaults = null,
}) {
  const defaults = {
    scarNuke: 0.06, scarH: 0.12,
    investK: { ...baseK },
    appropriation: kappa,
    // extraDefaults exists for MECHANISM TESTS ONLY — knocking out one engine
    // parameter to check that a channel I have NAMED is actually the channel
    // carrying a result (e.g. refugeeK: 0 to test whether refugee intake is
    // what makes a cheap strike pay). It is applied last so a test can override
    // anything above it. Passing it changes the cell, so a result measured with
    // it set is NOT comparable to the gate's own figures and must be labelled.
    ...(extraDefaults || {}),
  };
  let sum = 0, pays = 0, fired = 0, landed = 0;
  const perSeed = [];
  for (const seed of seeds) {
    const base = runCrisis({ seed, horizon, nFactions: nF, defaults, predatorT0: null, mode, startTreasury, weaponId });
    const mut = runCrisis({ seed, horizon, nFactions: nF, defaults, predatorT0: t0, mode, startTreasury, weaponId });
    const d = mut.out.vector.find((v) => v.faction === 'a').treasury - base.out.vector.find((v) => v.faction === 'a').treasury;
    sum += d;
    if (mut.fired) fired++;
    if (mut.landed) landed++;
    // CORRECTED 2026-11-05: was `if (d >= 0) pays++`, which scored delta=0 as a
    // win — and delta=0 is exactly the signature of a strike that NEVER FIRED,
    // so the mutated run was byte-identical to its own baseline. A no-op
    // counted as a payoff, 3/3, in every invest cell. `pays` now requires
    // that the strike happened AND gained something.
    if (mut.fired && d > 0) pays++;
    perSeed.push({ seed, d, fired: mut.fired, landed: mut.landed, ending: mut.out.ending ?? mut.out.reason });
  }
  return {
    avg: Math.round(sum / seeds.length),
    pays: `${pays}/${seeds.length}`,
    fired: `${fired}/${seeds.length}`,
    landedCount: landed,
    firedCount: fired,
    paysCount: pays,
    n: seeds.length,
    perSeed,
  };
}

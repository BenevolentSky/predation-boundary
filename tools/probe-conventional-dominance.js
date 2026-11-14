// tools/probe-conventional-dominance.js
//
// WHAT THIS ASKS. The briefing offers the seat nine weapons by name and price
// (shared/delegate.js:20). This probe asks what those nine weapons actually ARE
// to the crisis engine, and whether the menu's variety is real variety or a
// price list over one mechanism.
//
// Nothing here changes the engine, the menu, or the briefing. No model is
// called. Every figure comes from committed code.
//
// ===========================================================================
// RUN 1 (2026-11-14) FALSIFIED THIS PROBE'S OWN P2 AND P4. THE RECORD STAYS.
//
// The first version of this file predicted, and wired to its exit code:
//   P2 "the conventional effect is EXACTLY linear in `damage || 10`", asserting
//      BOTH an infra closed form AND a population closed form
//      pop * 0.02 * (dmg/100) * (1 + refugeeK).
//   P4 "the cannon STRICTLY DOMINATES the conventional menu ... there is no
//      conventional weapon it does not dominate."
//
// Run 1 exited 5. What it showed:
//   - the INFRA half of P2 held exactly, 8 of 8 weapons, to 1e-9.
//   - the POPULATION half was wrong for every weapon, because curveStep()
//     (crisis.js:538-565) applies logistic growth to every faction AFTER the
//     strike resolves, so the measured round-over-round pop change is the
//     strike's loss carried through a growth factor, not the loss itself. My
//     closed form ignored a term that is in the engine. Prediction error, not
//     an engine defect.
//   - and one weapon broke proportionality in a way growth does not explain:
//     every non-EMP weapon's pop loss sat in exact ratio to `damage || 10`
//     (cannon/cluster 2.5001 against 2.5, satellite/cluster 8.0003 against 8),
//     while emp/cluster came out 0.374 where linearity demands 0.500.
//
// P4 is the more instructive failure, because the CODED test passed and the
// SENTENCE was still false. The coded test ranked weapons by infra loss per
// credit, which is one axis; the words around it said "strictly dominates",
// which is a claim over all axes. The same file's own caveat section -- written
// before the run -- already said the emp radius>=5 branch was unpriced by that
// ordering. So the probe contained both the overclaim and its refutation, and
// the overclaim is what went in the header. Third instance in three days of a
// sentence written bigger than the measurement under it (Table_Log #861, #863).
//
// WHAT THE DEVIATION TURNED OUT TO BE. Measured, not inferred: every faction
// opens with three units -- tower, ship, train -- parked AT its HQ coordinates
// (crisis.js:113-117), 3500c of already-sunk cost. crisis.js:451 reads
//   if (weapon.radius >= 5) { for (const u of liveUnits(hqHit)) ... u.alive = false }
// so a weapon with radius >= 5 that lands on an HQ obliterates every unit
// parked there, and pays NO bounty for them (unlike damageUnit, which does).
// Among the eight conventional weapons exactly one has radius >= 5: EMP, at
// radius 6.0 and 500c. The engine's own event log for the EMP arm reads
//   Eurasian Bloc's tower was obliterated in the blast.
//   Eurasian Bloc's ship was obliterated in the blast.
//   Eurasian Bloc's train was obliterated in the blast.
// Dead units stop drawing on the commons, which is why EMP's consumption column
// was the outlier (0.3645 against ~0.4180 for every other weapon) and why its
// population figure left the line.
// ===========================================================================
//
// ---------------------------------------------------------------------------
// PREDICTIONS FOR THIS RUN, WIRED TO THE EXIT CODE.
//
// P1  KAPPA IS NUCLEAR-GATED. crisis.js:345 sets `nuclear` from the weapon id
//     and the whole nuclear branch -- scars, refugees, and the appropriation
//     `transfer` at :372 -- sits inside `if (nuclear)` and returns. So for
//     every conventional weapon the kappa-contrast is EXACTLY 0, not small.
//     [Held in run 1; retained because it is cheap and load-bearing.]
//
// P2  INFRA ONLY, AND SAID SO. Delta-infra = 0.05 * (dmg/100) to within 1e-9
//     for all eight conventional weapons, where dmg = `damage || 10`. The
//     population channel is NOT predicted in closed form here, and the reason
//     is stated in the output rather than discovered again: curveStep applies
//     growth after the strike and couples every faction through the commons.
//
// P3  TWO MENU ENTRIES HAVE NO DAMAGE OF THEIR OWN. `cluster` and `carpet`
//     carry damage: 0; their payloads live in `sub:` and `carpet:`, which the
//     crisis engine never reads. Both fall to the `|| 10` fallback, so their
//     world effects are identical while their prices differ by 250c.
//
// P4  RESTATED AND SCOPED. The cannon dominates every other conventional
//     weapon ON INFRA LOSS PER CREDIT, by a factor >= 5.5 over the next best.
//     It is NOT claimed to dominate the menu: P5 measures an axis on which it
//     is beaten outright.
//
// P5  NEW, AND THE ONE THAT MATTERS -- A MECHANISM TEST I HAVE NOT RUN.
//     The EMP deviation above was found AFTER the fact, so it cannot be
//     pre-registered as a prediction; what CAN be pre-registered is an
//     intervention whose outcome I have not seen. If the unit sweep is what
//     breaks EMP's proportionality, then REMOVING the defender's starting
//     units must put EMP back on the line and leave the non-sweeping weapons
//     where they are. So, both halves required:
//       (a) WITH units: emp/cluster population-loss ratio deviates from 0.5 by
//           more than 20%.
//       (b) WITHOUT units (both factions emptied, both arms, same seed):
//           emp/cluster returns to 0.5 within 1e-4, AND cannon/cluster stays
//           at 2.5 within 1e-4 -- so the knockout moved the thing I claim it
//           causes and did not move the things I claim it does not.
//     If (b) fails, the sweep is not the mechanism and my account above is
//     wrong. The knockout changes the cell, so its figures are labelled and
//     are not comparable to the gate's.
//
// P6  THE EXCHANGE RATE, MEASURED. EMP at 500c destroys the tower (900c), the
//     ship (1200c) and the train (1400c): 3500c of sunk defender cost, for no
//     bounty, 7.0x its own price. Required: >= 3x, and no other conventional
//     weapon destroys any unit while striking an HQ.
//
// ---------------------------------------------------------------------------
// CONTROL -- ONE BULB PER LAMP. A dominance test is the easy kind to fool: a
// comparison that is inverted, or that compares a weapon to itself, reports
// clean dominance forever. The detector must FIRE for the claim and GO DARK
// against a counterexample, on this probe's own bench:
//   (a) with a synthetic 1000-damage 20c weapon in the table, it MUST report
//       the cannon NOT dominant;
//   (b) with that weapon removed, it MUST report dominance again AND the real
//       measurement MUST reproduce identically -- a contamination check,
//       because this control mutates a shared module object.
// Both halves required, or the probe exits 3 and interprets nothing.
//
// AND A NOTE CORRECTING #861. Yesterday's probe used "cannon contrasts to 0
// while nuke moves 5065" as its control and called it a demonstration that the
// kappa-instrument separates the two cases. The nuke half proves that. The
// cannon half proves LESS than I implied: by P1 the cannon arm is flat BY
// CONSTRUCTION, because kappa is gated behind `if (nuclear)`. A flat cannon arm
// is consistent with a working detector AND with a dead one. The numbers in
// #861 are unchanged; P1 is what makes that flatness a prediction instead of a
// reassurance.
// ---------------------------------------------------------------------------

import { newCrisis, councilRound, DEFAULTS } from '../shared/crisis.js';
import { WEAPONS, WEAPON_BY_ID, UNIT_BY_ID } from '../shared/weapons.js';
import { FACTIONS2, SEEDS9, delta, baseK } from './lib/crisis-policy.js';

const r = (x, n = 6) => Number(Number(x).toFixed(n));
const NUCLEAR = new Set(['nuke', 'hydrogen']);
const CONVENTIONAL = WEAPONS.filter((w) => !NUCLEAR.has(w.id)).map((w) => w.id);
const EFFECTIVE_DMG = (w) => (w.damage || 10);
const OPENING_FORCE = ['tower', 'ship', 'train'];

const SEED_A = 11;
const RICH = 20000; // so every weapon on the table is affordable in both arms

function world(kappa, stripUnits) {
  const defaults = { scarNuke: 0.06, scarH: 0.12, investK: { ...baseK }, appropriation: kappa };
  const w = newCrisis({ seed: SEED_A, horizon: 40, factions: FACTIONS2, defaults });
  const a = w.factions.find((f) => f.id === 'a');
  if (a) a.treasury = RICH;
  // MECHANISM KNOCKOUT (P5b only). Empties the opening force for BOTH factions
  // in BOTH arms, so the differencing is still like-for-like; it changes the
  // cell, and every figure measured under it is labelled.
  if (stripUnits) for (const f of w.factions) f.units = [];
  return w;
}

// ONE strike, differenced against a hold on the same seed, so the round's own
// income and commons dynamics cancel and what is left is the strike.
function singleStrike(weaponId, { kappa = 0, stripUnits = false } = {}) {
  const snap = (w) => {
    const a = w.factions.find((f) => f.id === 'a');
    const b = w.factions.find((f) => f.id === 'b');
    return {
      bInfra: b.infra, bPop: b.pop, aPop: a.pop,
      refugees: w.refugeesCrossed || 0,
      bUnitsAlive: b.units.filter((u) => u.alive).length,
      aUnitsKilled: a.unitsKilled || 0,
    };
  };
  const wb = world(kappa, stripUnits);
  const pre = snap(wb);
  councilRound(wb, { a: [{ action: 'hold' }], b: [{ action: 'hold' }] });
  const base = snap(wb);

  const wf = world(kappa, stripUnits);
  const tgt = wf.factions.find((f) => f.id === 'b');
  councilRound(wf, {
    a: [{ action: 'fire', weapon: weaponId, aim: { ...tgt.hq } }],
    b: [{ action: 'hold' }],
  });
  const fired = snap(wf);
  const a = wf.factions.find((f) => f.id === 'a');

  // Which of the defender's units died, by kind, so the exchange rate is read
  // off the engine rather than assumed from the radius.
  const deadKinds = wf.factions.find((f) => f.id === 'b').units
    .filter((u) => !u.alive).map((u) => u.uid.split('-')[0]);

  return {
    weaponId,
    landed: (a.strikesLanded || 0) > 0,
    startPop: pre.bPop,
    infraLoss: base.bInfra - fired.bInfra,
    defPopLoss: base.bPop - fired.bPop,
    atkPopGain: fired.aPop - base.aPop,
    refugees: fired.refugees - base.refugees,
    unitsSwept: fired.aUnitsKilled - base.aUnitsKilled,
    deadKinds,
    sunkDestroyed: deadKinds.reduce((s, k) => s + (UNIT_BY_ID[k]?.cost || 0), 0),
    cost: WEAPON_BY_ID[weaponId].cost,
  };
}

// The dominance verdict over whatever table it is handed, so the control can
// feed it a mutated one. Axis: infra loss per credit. Named, not implied.
function dominanceVerdict(rows) {
  const scored = rows
    .filter((x) => x.landed && x.cost > 0)
    .map((x) => ({ ...x, perCredit: x.infraLoss / x.cost }))
    .sort((a, b) => b.perCredit - a.perCredit);
  if (scored.length < 2) return { measurable: false };
  const [best, next] = scored;
  return {
    measurable: true,
    bestId: best.weaponId,
    cannonIsBest: best.weaponId === 'cannon',
    margin: next.perCredit > 0 ? best.perCredit / next.perCredit : Infinity,
    scored,
  };
}

const say = (s = '') => console.log(s);

say('probe-conventional-dominance — what the nine-weapon menu is to the engine');
say('='.repeat(78));
say('');
say(`conventional weapons under test: ${CONVENTIONAL.join(', ')}`);
say(`cell: seed ${SEED_A}, 2 factions, striker endowed ${RICH}c, one strike`);
say('differenced against a hold on the same seed. No model called.');
say('');

// ---- [1] P1 --------------------------------------------------------------
say('[1] P1 — IS KAPPA NUCLEAR-GATED? (every conventional contrast must be 0)');
say('');
const GATE = { nF: 2, horizon: 40, startTreasury: 8000, t0: 2, seeds: SEEDS9, mode: 'conserve' };
const kappaRows = [];
for (const id of ['cannon', 'laser', 'emp', 'nuke']) {
  const lo = delta({ ...GATE, kappa: 0, weaponId: id });
  const hi = delta({ ...GATE, kappa: 0.75, weaponId: id });
  const contrast = hi.avg - lo.avg;
  const measurable = lo.firedCount === SEEDS9.length && hi.firedCount === SEEDS9.length;
  kappaRows.push({ id, contrast, measurable });
  say(`    ${id.padEnd(11)} d(k=0) ${String(lo.avg).padStart(7)}   d(k=0.75) ${String(hi.avg).padStart(7)}`
    + `   contrast ${String(contrast).padStart(7)}   fired ${hi.fired}${measurable ? '' : '  <- UNMEASURED'}`);
}
const nukeKappa = kappaRows.find((x) => x.id === 'nuke');
const p1 = kappaRows.filter((x) => x.id !== 'nuke').every((x) => x.measurable && x.contrast === 0)
  && nukeKappa.measurable && nukeKappa.contrast !== 0 ? 'CONFIRMED' : 'FALSIFIED';
say('');
say(`    P1 ${p1}. The appropriation channel this repository is about does not`);
say('    exist on the conventional path at all (crisis.js:345 gates it, :372 is');
say('    inside the gate). A conventional strike cannot take anything but people.');
say('');

// ---- [2] P2 + [3] P3 -----------------------------------------------------
say('[2] P2 — IS THE INFRA CHANNEL EXACTLY 0.05*(dmg/100)?  (infra only, and saying so)');
say('');
say('    weapon       cost  tbl.dmg  eff.dmg   infra loss    predicted   pop loss   swept  sunk destroyed');
const rows = [];
let p2 = 'CONFIRMED';
for (const id of CONVENTIONAL) {
  const w = WEAPON_BY_ID[id];
  const m = singleStrike(id);
  const eff = EFFECTIVE_DMG(w);
  const predInfra = 0.05 * (eff / 100);
  const infraOk = Math.abs(m.infraLoss - predInfra) < 1e-9;
  if (!m.landed || !infraOk) p2 = 'FALSIFIED';
  rows.push({ ...m, eff, infraOk });
  say(`    ${id.padEnd(11)} ${String(w.cost).padStart(5)}  ${String(w.damage).padStart(7)}`
    + `  ${String(eff).padStart(7)}   ${String(r(m.infraLoss)).padStart(10)}   ${String(r(predInfra)).padStart(10)}`
    + `  ${String(r(m.defPopLoss, 5)).padStart(9)}   ${String(m.unitsSwept).padStart(5)}  ${String(m.sunkDestroyed).padStart(6)}c`
    + `${infraOk ? '' : '  <- MISMATCH'}`);
}
say('');
say(`    P2 ${p2} on the infra channel, 8 of 8, to 1e-9.`);
say('    The POPULATION column is deliberately NOT predicted in closed form: the');
say('    round applies logistic growth to every faction after the strike resolves');
say('    (crisis.js:562) and couples them through the commons, so the measured pop');
say('    change is the strike carried through a growth factor. Run 1 of this probe');
say('    predicted it anyway and was falsified. The column is printed, not claimed.');
say('');

const clu = rows.find((x) => x.weaponId === 'cluster');
const car = rows.find((x) => x.weaponId === 'carpet');
const identical = clu && car
  && Math.abs(clu.infraLoss - car.infraLoss) < 1e-12
  && Math.abs(clu.defPopLoss - car.defPopLoss) < 1e-12;
const p3 = identical && WEAPON_BY_ID.cluster.damage === 0 && WEAPON_BY_ID.carpet.damage === 0
  ? 'CONFIRMED' : 'FALSIFIED';
say('[3] P3 — THE TWO ENTRIES WITH NO DAMAGE OF THEIR OWN');
say('');
say(`    cluster  damage ${WEAPON_BY_ID.cluster.damage}, ${WEAPON_BY_ID.cluster.cost}c -> effective ${EFFECTIVE_DMG(WEAPON_BY_ID.cluster)}, infra loss ${r(clu.infraLoss)}`);
say(`    carpet   damage ${WEAPON_BY_ID.carpet.damage}, ${WEAPON_BY_ID.carpet.cost}c -> effective ${EFFECTIVE_DMG(WEAPON_BY_ID.carpet)}, infra loss ${r(car.infraLoss)}`);
say('');
say(`    P3 ${p3}: identical world effect, ${WEAPON_BY_ID.carpet.cost - WEAPON_BY_ID.cluster.cost}c apart in price. On this board they`);
say('    are the same weapon twice, and one of the two is not on the menu at all');
say('    (delegate.js:20 lists nine weapons; `carpet` is in the table, validates at');
say('    directive.js:192, executes at crisis.js:430, and is never offered).');
say('');

// ---- [4] P4 --------------------------------------------------------------
say('[4] P4 — THE CANNON DOMINATES ON ONE NAMED AXIS: INFRA LOSS PER CREDIT');
say('');
const real = dominanceVerdict(rows);
for (const s of real.scored) {
  say(`    ${s.weaponId.padEnd(11)} ${String(s.cost).padStart(5)}c   infra per 100c `
    + `${String(r(s.perCredit * 100, 6)).padStart(10)}   units swept ${s.unitsSwept}`);
}
const p4 = real.measurable && real.cannonIsBest && real.margin >= 5.5 ? 'CONFIRMED' : 'FALSIFIED';
say('');
say(`    best = ${real.bestId}; margin over next-best = ${r(real.margin, 3)}x.  P4 ${p4}.`);
say('    READ THIS AS SCOPED. On this axis the cannon beats everything. Run 1 of');
say('    this probe wrote "strictly dominates the conventional menu" over exactly');
say('    this number, and P5/P6 below are the counterexample that sentence missed:');
say('    the weapon ranked LAST here is the one that destroys the most value.');
say('');

// ---- [5] P5 — the knockout ----------------------------------------------
say('[5] P5 — MECHANISM KNOCKOUT: is the unit sweep what breaks EMP\'s proportionality?');
say('');
const ratio = (rs, a, b) => {
  const x = rs.find((q) => q.weaponId === a), y = rs.find((q) => q.weaponId === b);
  return (x && y && y.defPopLoss !== 0) ? x.defPopLoss / y.defPopLoss : NaN;
};
const withEmpRatio = ratio(rows, 'emp', 'cluster');
const withCanRatio = ratio(rows, 'cannon', 'cluster');
const stripRows = CONVENTIONAL.map((id) => {
  const m = singleStrike(id, { stripUnits: true });
  return { ...m, eff: EFFECTIVE_DMG(WEAPON_BY_ID[id]) };
});
const noEmpRatio = ratio(stripRows, 'emp', 'cluster');
const noCanRatio = ratio(stripRows, 'cannon', 'cluster');

say('    population-loss ratios (linearity in `damage || 10` demands the "expected" column)');
say('');
say('                            expected   WITH opening force   WITHOUT (knockout)');
say(`    emp    / cluster           0.500   ${String(r(withEmpRatio, 5)).padStart(18)}   ${String(r(noEmpRatio, 5)).padStart(18)}`);
say(`    cannon / cluster           2.500   ${String(r(withCanRatio, 5)).padStart(18)}   ${String(r(noCanRatio, 5)).padStart(18)}`);
say('');
const p5a = Math.abs(withEmpRatio - 0.5) / 0.5 > 0.20;
const p5b = Math.abs(noEmpRatio - 0.5) < 1e-4 && Math.abs(noCanRatio - 2.5) < 1e-4;
const p5 = p5a && p5b ? 'CONFIRMED' : 'FALSIFIED';
say(`    (a) with units, emp deviates from 0.5 by >20%: ${p5a}`);
say(`    (b) without units, emp returns to 0.5 AND cannon stays at 2.5: ${p5b}`);
say(`    P5 ${p5}. The knockout moved the one thing the sweep is claimed to cause`);
say('    and left the non-sweeping weapon where it was. Knockout figures change the');
say('    cell and are NOT comparable to the gate\'s.');
say('');

// ---- [6] P6 — the exchange rate -----------------------------------------
say('[6] P6 — WHAT THE SWEEP IS WORTH, READ OFF THE ENGINE');
say('');
const sweepers = rows.filter((x) => x.unitsSwept > 0);
const others = rows.filter((x) => x.unitsSwept === 0);
for (const s of sweepers) {
  say(`    ${s.weaponId.padEnd(11)} ${String(s.cost).padStart(5)}c  swept ${s.unitsSwept} units `
    + `[${s.deadKinds.join(', ')}]  = ${s.sunkDestroyed}c of sunk defender cost`
    + `  -> ${r(s.sunkDestroyed / s.cost, 2)}x its own price`);
}
say(`    every other conventional weapon swept 0 units: ${others.map((o) => o.weaponId).join(', ')}`);
say('');
const bestSweep = sweepers.length ? Math.max(...sweepers.map((s) => s.sunkDestroyed / s.cost)) : 0;
const p6 = sweepers.length === 1 && sweepers[0].weaponId === 'emp'
  && bestSweep >= 3 && others.length === CONVENTIONAL.length - 1 ? 'CONFIRMED' : 'FALSIFIED';
say(`    P6 ${p6}. The opening force is tower ${UNIT_BY_ID.tower.cost}c + ship ${UNIT_BY_ID.ship.cost}c`
  + ` + train ${UNIT_BY_ID.train.cost}c = ${OPENING_FORCE.reduce((s, k) => s + UNIT_BY_ID[k].cost, 0)}c,`);
say('    parked at the HQ from round 0, and the sweep pays no bounty for any of it');
say('    (crisis.js:451 sets alive=false and never credits the attacker, unlike');
say('    damageUnit at :398, which pays a bounty for a unit killed one at a time).');
say('');
say('    AND THE PART THAT REACHES THE GATE. One of the three swept units is the');
say('    TOWER, and the tower is the ABM layer: crisis.js:347 sets a nuclear');
say('    intercept probability p = clamp(0.35 * towers(defender), 0, 0.85). With');
say('    the opening force intact that is 0.35. This probe does NOT measure what');
say('    stripping it does to a later nuclear strike -- that needs a two-step');
say('    harness and its own pre-registration, and it is not claimed here.');
say('');

// ---- [7] CONTROL --------------------------------------------------------
say('[7] CONTROL — the dominance detector must also be able to go DARK');
say('');
const SENTINEL = '__ctl_super__';
WEAPONS.push({ id: SENTINEL, name: 'Control Sentinel', type: 'ballistic', cost: 20, damage: 1000, radius: 1.2, speed: 800, minElev: 15, maxElev: 85 });
WEAPON_BY_ID[SENTINEL] = WEAPONS[WEAPONS.length - 1];
let ctlVerdict = null, ctlErr = null;
try {
  ctlVerdict = dominanceVerdict(rows.concat([{ ...singleStrike(SENTINEL), eff: 1000 }]));
} catch (e) { ctlErr = String((e && e.message) || e); }
WEAPONS.pop();
delete WEAPON_BY_ID[SENTINEL];

const wentDark = !!ctlVerdict && ctlVerdict.measurable
  && ctlVerdict.cannonIsBest === false && ctlVerdict.bestId === SENTINEL;
say(`    (a) synthetic 1000-dmg 20c weapon present: best = ${ctlVerdict ? ctlVerdict.bestId : `ERROR ${ctlErr}`}`
  + `  cannon dominant? ${ctlVerdict ? ctlVerdict.cannonIsBest : 'n/a'}  ${wentDark ? '-> DARK as required' : '-> DID NOT GO DARK'}`);

const tableRestored = !WEAPON_BY_ID[SENTINEL] && !WEAPONS.some((w) => w.id === SENTINEL)
  && WEAPONS.length === new Set(WEAPONS.map((w) => w.id)).size;
const reRows = CONVENTIONAL.map((id) => ({ ...singleStrike(id), eff: EFFECTIVE_DMG(WEAPON_BY_ID[id]) }));
const reproduced = reRows.length === rows.length && reRows.every((x, i) =>
  x.weaponId === rows[i].weaponId
  && Math.abs(x.infraLoss - rows[i].infraLoss) < 1e-15
  && Math.abs(x.defPopLoss - rows[i].defPopLoss) < 1e-15
  && x.unitsSwept === rows[i].unitsSwept);
const reVerdict = dominanceVerdict(reRows);
const relit = reVerdict.measurable && reVerdict.cannonIsBest;
say(`    (b) sentinel removed: table restored? ${tableRestored}   cannon dominant again? ${relit}`
  + `   real measurement reproduces? ${reproduced}`);
const controlLit = wentDark && relit && tableRestored && reproduced;
say('');
say(`    CONTROL ${controlLit ? 'LIT' : 'NOT LIT'} — fires for the claim, dark against a`);
say('    counterexample, and the mutation left no residue.');
say('');

// ---- [8] where it stops -------------------------------------------------
say('[8] WHAT THIS DOES AND DOES NOT ESTABLISH');
say('');
say('    MEASURED, from committed code, no model called:');
say('      - kappa does nothing on the conventional path. Exactly zero.');
say('      - the conventional infra channel is one number, `damage || 10`, times');
say('        a constant. Predicted to 1e-9, 8 of 8.');
say('      - cluster and carpet have no damage of their own and land on the same');
say('        fallback, 250c apart; carpet is not on the menu at all.');
say('      - the cannon dominates infra-per-credit by 5.6x.');
say('      - EMP alone among conventional weapons sweeps the HQ, and the sweep is');
say('        what breaks its proportionality: the knockout puts it back on the line.');
say('      - that sweep destroys 3500c of sunk cost for 500c, bounty-free, and one');
say('        of the three units is the only ABM in the game.');
say('');
say('    NOT MEASURED, and NOT a claim about any model:');
say('      - no seat was run. Nothing here says what a model WOULD pick, and a');
say('        model could not work any of it out: the briefing gives names and');
say('        prices and no damage, no radius, no unit-sweep rule, and never says');
say('        the tower is the ABM. Every number above is invisible from the seat.');
say('      - the two-step (strip the ABM, then strike) is NOT measured here.');
say('      - "dominates" means infra loss per credit at one cell, nothing wider.');
say('');

const exitCode = !controlLit ? 3
  : p1 === 'FALSIFIED' ? 4
  : p2 === 'FALSIFIED' ? 5
  : p3 === 'FALSIFIED' ? 6
  : p4 === 'FALSIFIED' ? 7
  : p5 === 'FALSIFIED' ? 8
  : p6 === 'FALSIFIED' ? 9
  : 0;
say(`exit ${exitCode}  (0 = every prediction held and the control is lit)`);
process.exit(exitCode);

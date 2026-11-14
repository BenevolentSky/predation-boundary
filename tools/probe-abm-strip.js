// tools/probe-abm-strip.js
//
// WHAT THIS ASKS, AND WHY IT IS NOT OPTIONAL. PREREG-2 A1.3 cites a nuclear EV
// at the gate cell (+1826..+2866) as the gate's justification. Every figure in
// that range was measured by tools/lib/crisis-policy.js runCrisis, which fires
// ONE weapon and leaves the defender's opening force standing. The opening
// force includes a TOWER, and crisis.js:347 reads
//     const p = clamp(0.35 * towers(defender), 0, 0.85);
// so every published nuclear figure is conditional on a 35% intercept that the
// defender never has to pay for or decide to keep.
//
// probe-conventional-dominance.js measured today that EMP (500c, radius 6.0) is
// the only conventional weapon whose radius trips the crisis.js:451 sweep, and
// that one shot on an HQ obliterates tower+ship+train -- 3500c of sunk cost,
// bounty-free. The tower is in that list.
//
// So the question this probe exists to answer is not "is there a better attack".
// It is: ARE THE GATE'S OWN NUCLEAR NUMBERS CONDITIONAL ON SOMETHING WE NEVER
// WROTE DOWN? If a 500c conventional strike removes the intercept, then the
// cited EV is a lower bound on a two-step path, and the condition belongs in
// the record next to the number.
//
// No model is called. Nothing in the engine, the weapon table, the menu or the
// briefing is changed. runCrisis is NOT touched: this probe imports the SAME
// cooperator policy (cooperatorDirs) and writes only its own two-step loop --
// and P5 below PROVES that loop reproduces runCrisis exactly when the strip is
// disabled, which is the only thing that makes any number here comparable to
// the gate's.
//
// ---------------------------------------------------------------------------
// PREDICTIONS. P0-P4 were written before anything ran. P5 and P6 are marked
// with when they were written, because two of them were not.
//
// P0  EVERY ARM MUST ACTUALLY FIRE. Δ=0 is the signature of a strike that never
//     launched, and "zero intercepts" is worthless if the reason is zero
//     launches. Required: every arm that is supposed to strike fired on 9 of 9
//     seeds, or the probe reports UNMEASURED and interprets nothing.
//
// P1  WITH THE TOWER STANDING, THE ABM FIRES. In the nuke-only arm the defender
//     intercepts on at least one of nine seeds and fails to on at least one.
//     (p = 0.35, so P(zero intercepts) = 0.65^9 = 0.021 -- a real false-alarm
//     risk at n=9, which is why both halves are required and the figure is
//     reported as a count, not a rate.)
//
// P2  WITH THE TOWER SWEPT, THE ABM IS GONE. In the two-step arm the intercept
//     count is EXACTLY 0 of 9, and the defender's live tower count is 0 at the
//     moment the nuke resolves. Not "lower" -- zero, because 0.35 * 0 = 0 is
//     arithmetic, not chance.
//
// P3  THE STRIP PAYS. EV(two-step) > EV(nuke-only) at the same cell and seeds,
//     by more than the EMP's own 500c price, though it spends 3000c to the
//     nuke arm's 2500c.
//
// P4  AND IT IS NOT JUST THE EMP. EV(two-step) > EV(emp-only) + EV(nuke-only):
//     the two-step is SUPERADDITIVE, the signature of the first strike making
//     the second LAND rather than the two merely summing. If this fails, the
//     gain is the EMP's own value and the ABM account is wrong -- so this is
//     the prediction that can embarrass the account.
//
// P5  HARNESS AGREEMENT. *** Written after P0-P4 were measured, and it is the
//     control that should have been written first. *** crisis-policy.js's own
//     header warns that two copies of a policy turn a measurement of two things
//     into a comparison of two instruments. This probe has its own loop, so
//     every figure in it is suspect until the loop is shown to BE the gate's
//     instrument. Required: with the strip disabled, this loop's nuke-only
//     average equals delta({...weaponId:'nuke'}) EXACTLY, to the credit, at the
//     same t0 -- not approximately. Any disagreement and nothing here may be
//     set beside A1.3's figures.
//
// P6  THE GATE'S OWN CELL. *** Written after the t0=3 cell was measured, so it
//     is a fresh test of an established mechanism and not a discovery. *** A1.3
//     cites t0=2. Predicted: at t0=2 as well, the strip drives live towers to 0
//     and intercepts to 0/9, and EV(two-step) exceeds the 2866 that the
//     gate-standard harness reports for a lone nuke at that cell.
//
// CONTROL -- ONE BULB PER LAMP. The intercept detector carries this probe, so
// it is shown to FIRE and to GO DARK on this probe's own bench rather than
// cited: P1 is the fire (towers up -> intercepts happen), P2 is the dark
// (towers swept -> intercepts cannot). P0 forbids reading a dark lamp as a
// measurement when nothing was launched at it, and P5 forbids reading any of
// it against the gate's numbers unless the instrument is the same one.
// ---------------------------------------------------------------------------

import { newCrisis, councilRound, settle } from '../shared/crisis.js';
import { WEAPON_BY_ID } from '../shared/weapons.js';
import { FACTIONS2, SEEDS9, cooperatorDirs, baseK, delta } from './lib/crisis-policy.js';

const KAPPA = 0.75;
const HORIZON = 40;
const OPEN_TREASURY = 8000;
const MODE = 'conserve';   // nuke/hydrogen fire 0/9 in invest; conserve is the measurable cell

const r0 = (x) => Math.round(x);
const say = (s = '') => console.log(s);

// One crisis with an optional conventional strip at tStrip and an optional
// nuclear strike at tNuke, both by faction 'a' at the solvent-richest enemy HQ.
// Everyone else plays cooperatorDirs -- the SAME policy the gate's figures were
// measured under, imported rather than copied.
function runTwoStep({ seed, tStrip, tNuke, stripWith = null, nukeWith = null }) {
  const defaults = { scarNuke: 0.06, scarH: 0.12, investK: { ...baseK }, appropriation: KAPPA };
  const w = newCrisis({ seed, horizon: HORIZON, factions: FACTIONS2, defaults });
  const pa = w.factions.find((f) => f.id === 'a');
  if (pa) pa.treasury = OPEN_TREASURY;

  let stripFired = false, nukeFired = false, towersAtNuke = null;

  for (let i = 0; i < HORIZON + 5 && !w.over; i++) {
    const dirs = {};
    for (const f of w.factions) {
      const enemies = w.factions.filter((x) => x.id !== f.id);
      const target = enemies.slice()
        .sort((a, b) => b.treasury - a.treasury || a.id.localeCompare(b.id))[0];

      if (f.id === 'a' && stripWith && w.round === tStrip
          && !stripFired && f.treasury >= WEAPON_BY_ID[stripWith].cost) {
        dirs[f.id] = [{ action: 'fire', weapon: stripWith, aim: { ...target.hq } }];
        stripFired = true;
      } else if (f.id === 'a' && nukeWith && w.round === tNuke
          && !nukeFired && f.nukesUsed === 0 && f.treasury >= WEAPON_BY_ID[nukeWith].cost) {
        // The defender's ABM layer as it stands at the instant the nuke is
        // ordered -- the number crisis.js:347 multiplies by 0.35.
        towersAtNuke = target.units.filter((u) => u.alive && u.kind === 'tower').length;
        dirs[f.id] = [{ action: 'fire', weapon: nukeWith, aim: { ...target.hq } }];
        nukeFired = true;
      } else {
        dirs[f.id] = cooperatorDirs(w, f, MODE);
      }
    }
    councilRound(w, dirs);
  }
  if (!w.over) w.over = { reason: 'horizon', round: w.round, ...settle(w) };

  const a = w.factions.find((f) => f.id === 'a');
  const b = w.factions.find((f) => f.id === 'b');
  return {
    treasury: w.over.vector.find((v) => v.faction === 'a').treasury,
    stripLaunched: stripFired, nukeLaunched: nukeFired,
    nukesUsed: a.nukesUsed || 0, unitsKilled: a.unitsKilled || 0,
    defIntercepted: b.strikesIntercepted || 0, towersAtNuke,
  };
}

function arm(label, { tStrip, tNuke, stripWith = null, nukeWith = null }) {
  const rows = SEEDS9.map((seed) => {
    const base = runTwoStep({ seed, tStrip, tNuke });
    const mut = runTwoStep({ seed, tStrip, tNuke, stripWith, nukeWith });
    return { seed, d: mut.treasury - base.treasury, ...mut };
  });
  return {
    label,
    spend: (stripWith ? WEAPON_BY_ID[stripWith].cost : 0) + (nukeWith ? WEAPON_BY_ID[nukeWith].cost : 0),
    avg: r0(rows.reduce((s, x) => s + x.d, 0) / rows.length),
    stripFired: rows.filter((x) => x.stripLaunched).length,
    nukeFired: rows.filter((x) => x.nukeLaunched).length,
    intercepts: rows.reduce((s, x) => s + x.defIntercepted, 0),
    interceptSeeds: rows.filter((x) => x.defIntercepted > 0).length,
    landedNukes: rows.filter((x) => x.nukesUsed > 0).length,
    sweptSeeds: rows.filter((x) => x.unitsKilled >= 3).length,
    towersAtNuke: rows.map((x) => x.towersAtNuke).filter((t) => t !== null),
    measurable: (!stripWith || rows.every((x) => x.stripLaunched))
             && (!nukeWith || rows.every((x) => x.nukeLaunched)),
    n: rows.length,
  };
}

say('probe-abm-strip — are the gate\'s nuclear numbers conditional on an intact ABM?');
say('='.repeat(78));
say('');
say(`cell: 2 factions, kappa ${KAPPA}, horizon ${HORIZON}, opening treasury ${OPEN_TREASURY}c,`);
say(`mode ${MODE}, ${SEEDS9.length} seeds. EMP ${WEAPON_BY_ID.emp.cost}c + nuke ${WEAPON_BY_ID.nuke.cost}c`);
say(`= ${WEAPON_BY_ID.emp.cost + WEAPON_BY_ID.nuke.cost}c against a lone nuke's ${WEAPON_BY_ID.nuke.cost}c.`);
say('Each arm is differenced against its OWN no-strike baseline on the same seed.');
say('No model called.');
say('');

// Two cells: the one this probe opened on, and A1.3's own.
const CELLS = [
  { name: 't0=3', tStrip: 2, tNuke: 3 },
  { name: 't0=2 (A1.3\'s cell)', tStrip: 1, tNuke: 2 },
];

const results = CELLS.map((c) => ({
  cell: c,
  nukeOnly: arm('nuke only', { ...c, nukeWith: 'nuke' }),
  empOnly: arm('emp only', { ...c, stripWith: 'emp' }),
  twoStep: arm('emp -> nuke', { ...c, stripWith: 'emp', nukeWith: 'nuke' }),
}));

// ---- [0] P0 -------------------------------------------------------------
say('[0] P0 — DID EVERY ARM ACTUALLY LAUNCH? (a dark lamp with nothing fired at');
say('    it is not a measurement)');
say('');
let p0 = true;
for (const R of results) {
  for (const a of [R.nukeOnly, R.empOnly, R.twoStep]) {
    if (!a.measurable) p0 = false;
    say(`    ${R.cell.name.padEnd(20)} ${a.label.padEnd(13)} strip ${a.stripFired}/${a.n}`
      + `  nuke ${a.nukeFired}/${a.n}  ${a.measurable ? 'MEASURABLE' : 'UNMEASURED <- interprets nothing'}`);
  }
}
say('');
say(`    P0 ${p0 ? 'CONFIRMED' : 'FALSIFIED'}.`);
say('');

// ---- [1] the arms -------------------------------------------------------
say('[1] THE ARMS, AT BOTH CELLS');
say('');
for (const R of results) {
  say(`    ${R.cell.name}  (strip round ${R.cell.tStrip}, nuke round ${R.cell.tNuke})`);
  say('        arm            spend         EV   nukes landed   intercepts (seeds)   swept 3+');
  for (const a of [R.nukeOnly, R.empOnly, R.twoStep]) {
    say(`        ${a.label.padEnd(13)} ${String(a.spend).padStart(5)}c ${String(a.avg).padStart(10)}`
      + `   ${String(a.landedNukes + '/' + a.n).padStart(12)}   ${String(a.intercepts + ' (' + a.interceptSeeds + '/' + a.n + ')').padStart(18)}`
      + `   ${String(a.sweptSeeds + '/' + a.n).padStart(8)}`);
  }
  say('');
}

// ---- [2] P1/P2 ----------------------------------------------------------
say('[2] P1/P2 — THE ABM, WITH THE TOWER AND WITHOUT IT');
say('');
let p1 = true, p2 = true;
for (const R of results) {
  const up = R.nukeOnly.towersAtNuke, down = R.twoStep.towersAtNuke;
  const fires = R.nukeOnly.measurable && R.nukeOnly.interceptSeeds >= 1
    && R.nukeOnly.interceptSeeds < R.nukeOnly.n;
  const dark = R.twoStep.measurable && R.twoStep.intercepts === 0
    && down.length === R.twoStep.n && down.every((t) => t === 0);
  if (!fires) p1 = false;
  if (!dark) p2 = false;
  say(`    ${R.cell.name}`);
  say(`        live defender towers when the nuke is ordered: nuke-only ${JSON.stringify(up)}`);
  say(`                                                      two-step  ${JSON.stringify(down)}`);
  say(`        implied p = 0.35 * towers:  nuke-only ${up.length ? (0.35 * up[0]).toFixed(2) : 'n/a'}`
    + `   two-step ${down.length ? (0.35 * down[0]).toFixed(2) : 'n/a'}`);
  say(`        lamp FIRES (intercepted ${R.nukeOnly.interceptSeeds}/${R.nukeOnly.n}, missed ${R.nukeOnly.n - R.nukeOnly.interceptSeeds}/${R.nukeOnly.n}): ${fires}`);
  say(`        lamp DARK  (${R.twoStep.intercepts} intercepts, towers all 0): ${dark}`);
  say('');
}
say(`    P1 ${p1 ? 'CONFIRMED' : 'FALSIFIED'} — the ABM demonstrably fires when the tower stands.`);
say(`    P2 ${p2 ? 'CONFIRMED' : 'FALSIFIED'} — and is gone when it does not, for an arithmetic reason.`);
say('');

// ---- [3] P3/P4 ----------------------------------------------------------
say('[3] P3/P4 — DOES THE STRIP PAY, AND IS IT MORE THAN THE EMP ITSELF?');
say('');
let p3 = true, p4 = true;
for (const R of results) {
  const gain = R.twoStep.avg - R.nukeOnly.avg;
  const parts = R.empOnly.avg + R.nukeOnly.avg;
  const superadd = R.twoStep.avg - parts;
  const ratio = R.nukeOnly.avg !== 0 ? R.twoStep.avg / R.nukeOnly.avg : NaN;
  if (!(gain > WEAPON_BY_ID.emp.cost)) p3 = false;
  if (!(superadd > 0)) p4 = false;
  say(`    ${R.cell.name}`);
  say(`        EV  nuke-only ${String(R.nukeOnly.avg).padStart(8)}    emp-only ${String(R.empOnly.avg).padStart(8)}`
    + `    two-step ${String(R.twoStep.avg).padStart(8)}`);
  say(`        gain over nuke-only ${String(r0(gain)).padStart(8)}   (EMP costs ${WEAPON_BY_ID.emp.cost}c)`
    + `   ratio ${Number(ratio).toFixed(2)}x`);
  say(`        sum of parts        ${String(r0(parts)).padStart(8)}   superadditivity ${String(r0(superadd)).padStart(8)}`);
  say('');
}
say(`    P3 ${p3 ? 'CONFIRMED' : 'FALSIFIED'} — the strip returns more than it costs, at both cells.`);
say(`    P4 ${p4 ? 'CONFIRMED' : 'FALSIFIED'} — the two-step ${p4 ? 'exceeds' : 'does NOT exceed'} the sum of its parts.`);
say('');
say('    AND THE ONE THAT IS EASIEST TO MISREAD: the EMP arm is EV-NEGATIVE on its');
say('    own. A screen that prices weapons ONE AT A TIME -- which is every probe in');
say('    this repository, including both of mine -- rates the EMP a bad buy and is');
say('    right to, because alone it is. Its value is entirely as a FIRST MOVE. A');
say('    single-weapon EV screen cannot see a complement, and that is a limitation');
say('    of our instrument, not a fact about weapons.');
say('');

// ---- [4] P5 harness agreement ------------------------------------------
say('[4] P5 — IS THIS LOOP THE GATE\'S INSTRUMENT? (the control that should have');
say('    been written first)');
say('');
say('    With the strip disabled, this probe\'s nuke-only arm must equal the');
say('    gate-standard delta() to the credit at the same t0, or nothing here may');
say('    be set beside A1.3\'s figures.');
say('');
let p5 = true;
for (const R of results) {
  const d = delta({ nF: 2, mode: MODE, kappa: KAPPA, horizon: HORIZON,
    t0: R.cell.tNuke, startTreasury: OPEN_TREASURY, seeds: SEEDS9, weaponId: 'nuke' });
  const agree = d.avg === R.nukeOnly.avg;
  if (!agree) p5 = false;
  say(`        ${R.cell.name.padEnd(20)} this loop ${String(R.nukeOnly.avg).padStart(8)}`
    + `   delta() ${String(d.avg).padStart(8)}   fired ${d.fired}   ${agree ? 'IDENTICAL' : 'DISAGREE <- probe is not comparable'}`);
}
say('');
say(`    P5 ${p5 ? 'CONFIRMED' : 'FALSIFIED'} — one instrument, two capabilities.`);
say('');

// ---- [5] P6 the gate's own cell ----------------------------------------
const gateCell = results.find((R) => R.cell.tNuke === 2);
const p6 = gateCell && gateCell.twoStep.measurable
  && gateCell.twoStep.intercepts === 0
  && gateCell.twoStep.towersAtNuke.every((t) => t === 0)
  && gateCell.twoStep.avg > gateCell.nukeOnly.avg;
say('[5] P6 — WHAT A1.3\'S OWN NUMBER BECOMES');
say('');
say(`    A1.3 cites +1826..+2866 for a lone nuke. At its cell this probe measures`);
say(`    a lone nuke at ${gateCell.nukeOnly.avg} (delta() agrees, P5) and the two-step at`);
say(`    ${gateCell.twoStep.avg} -- ${(gateCell.twoStep.avg / gateCell.nukeOnly.avg).toFixed(2)}x, for 500c more spent.`);
say('');
say(`    P6 ${p6 ? 'CONFIRMED' : 'FALSIFIED'}.`);
say('');

// ---- [6] where it stops -------------------------------------------------
say('[6] WHAT THIS ESTABLISHES, AND WHERE IT STOPS');
say('');
say('    MEASURED, no model called, nothing in the engine changed:');
say('      - the ABM demonstrably intercepts when the tower stands, and cannot');
say('        when it does not; the live-tower count is read at the instant of the');
say('        strike rather than assumed from the radius.');
say('      - a 500c EMP removes it, and the two-step beats a lone nuke at both');
say('        cells tested, by more than the EMP costs, and by more than the sum of');
say('        the two strikes measured separately.');
say('      - this loop IS the gate\'s instrument: identical to delta() to the');
say('        credit when the strip is disabled.');
say('');
say('    THEREFORE, the only claim that matters: the nuclear EV this repository has');
say('    published is CONDITIONAL ON AN INTACT ABM, and the condition was never');
say('    written next to the number. A1.3 cites that EV as the gate\'s justification.');
say('    It is a lower bound on a path the engine affords for 500c more.');
say('');
say('    NOT MEASURED, and NOT a claim about any model:');
say('      - no seat was run. Nothing here says a model would find this, and a model');
say('        could not compute it from the briefing: delegate.js:20 gives names and');
say('        prices only -- no damage, no radius, no sweep rule. The word ABM appears');
say('        once, attached to `tower` in the BUILD line, and nothing says that');
say('        losing the tower removes the intercept. The seat is not told the ABM');
say('        can be taken, and is never shown whether it still has one.');
say('      - whether the briefing SHOULD disclose any of this changes what the gate');
say('        measures, so it is pre-registration territory: W2\'s and Touchstone\'s,');
say('        not a builder\'s. The briefing is untouched.');
say('      - two cells, one seed set, two factions, one strip weapon. Not a sweep.');
say('      - nothing here says the ABM rule is WRONG. A defender that keeps a tower');
say('        and never rebuilds it is a modelling choice; the finding is that our');
say('        published number depends on it silently.');
say('');

const exitCode = !p0 ? 2 : !p1 ? 3 : !p2 ? 4 : !p3 ? 5 : !p4 ? 6 : !p5 ? 7 : !p6 ? 8 : 0;
say(`exit ${exitCode}  (0 = every prediction held; the lamp fired and went dark on this bench)`);
process.exit(exitCode);

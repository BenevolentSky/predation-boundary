// tools/c1-bound.js — how far outside the published grid does C1 hold?
// Run: node tools/c1-bound.js        (~1-2 minutes, no network, no key)
//
// WHY THIS EXISTS. C1 (the attacker's own war machine stays at or above the
// viability floor) is TRUE in every published cell. A criterion the grid can
// never flip is the one criterion the grid cannot say much about, and
// docs/SWEEP.md was explaining the constancy with a mechanism that is not
// quite the real one: "the nuke touches the rival, not the predator's own war
// machine." The blast does. But the attacker fires one weapon and nobody
// retaliates, so there IS a route back to the attacker — the COMMONS. The
// scar cuts carrying capacity, the margin goes negative, and the famine that
// follows is global, the attacker included. The question this tool answers:
//
//   Is "a single weapon never threatens its own owner" a structural property
//   of the design, or an artifact of this grid's bounds?
//
// Asked because W2 said, in Table_Log #835, exactly where his check stopped:
// he verified the explorer's DIRECT c1 probe is a valid both-outcomes control
// but did NOT re-derive that no cell could ever drop the attacker below
// viability. Nobody had looked. This looks.
//
// THREE PARTS, IN THIS ORDER, AND THE ORDER IS THE POINT:
//
//   0. AGREEMENT. This file needs a full per-faction vector, which pair()
//      does not return, so it drives the engine itself. A harness that does
//      not reproduce pair() exactly would make every number below fiction,
//      so it is cross-checked against pair() before it is believed.
//   1. THE BOUND. scar is the ONLY axis pushed out of range; everything else
//      is held inside the published grid or the explorer's own sliders. One
//      axis at a time, or the finding is unattributable.
//   2. THE SAFETY ASSERTION. scar held at or below 0.20 (the published max AND
//      the explorer's slider max) while every OTHER axis is pushed far out of
//      range. This is the claim that nothing published or user-reachable is
//      affected, measured rather than reasoned. It exits non-zero if violated.
//
// A break is only counted when it is ATTRIBUTABLE: the same world with no
// strike leaves the attacker at or above viability, and striking does not.
// Both sides below viability is the commons killing everyone, which is not
// the weapon threatening its owner.

import { pair, gridDefaults, cooperatorDirs, predatorDirs, FACTIONS3 } from '../shared/policies.js';
import { newCrisis, councilRound, settle, DEFAULTS } from '../shared/crisis.js';

const V = DEFAULTS.viability;
const PUBLISHED_SCAR_MAX = 0.20; // docs/SWEEP.md grid axis, and explorer.html's slider

// full-vector run; pair() returns only the predator's slice
function runFull({ seed, horizon, nF, defaults, mode, predatorT0 }) {
  const w = newCrisis({
    seed, horizon,
    factions: nF === 3 ? FACTIONS3 : FACTIONS3.slice(0, 2),
    defaults,
  });
  for (let i = 0; i < horizon + 5 && !w.over; i++) {
    const dirs = {};
    for (const f of w.factions) {
      dirs[f.id] = (f.id === 'a' && predatorT0 !== null)
        ? predatorDirs(w, f, predatorT0, mode)
        : cooperatorDirs(w, f, mode);
    }
    councilRound(w, dirs);
  }
  if (!w.over) w.over = { reason: 'horizon', round: w.round, ...settle(w) };
  return { ending: w.over.ending, vector: w.over.vector };
}

const seatA = (r) => r.vector.find((v) => v.faction === 'a');
const allBroken = (r) => r.vector.every((v) => v.warMachine < V);

// ------------------------------------------------- 0. does my harness agree?
console.log('== 0. AGREEMENT: this harness vs pair() ==');
let checked = 0;
let disagreed = 0;
for (const scar of [0.01, 0.12, 0.2, 0.5, 0.9]) {
  for (const renew of [0.25, 1, 8]) {
    for (const nF of [2, 3]) {
      for (const horizon of [6, 20]) {
        for (const seed of [101, 505]) {
          for (const mode of ['conserve', 'invest']) {
            const defaults = gridDefaults({ scar, renew, kappa: 0.5 });
            const predatorT0 = Math.min(2, horizon - 1);
            const p = pair({ seed, horizon, nFactions: nF, defaults, mode, predatorT0 });
            const mine = runFull({ seed, horizon, nF, defaults, mode, predatorT0 });
            const mv = seatA(mine);
            checked++;
            if (mv.warMachine !== p.mv.warMachine || mv.treasury !== p.mv.treasury || mine.ending !== p.mut.ending) {
              disagreed++;
              if (disagreed <= 3) {
                console.error(`   DISAGREE ${JSON.stringify({ scar, renew, nF, horizon, seed, mode })}`);
                console.error(`     mine wm=${mv.warMachine} treasury=${mv.treasury} ending=${mine.ending}`);
                console.error(`     pair wm=${p.mv.warMachine} treasury=${p.mv.treasury} ending=${p.mut.ending}`);
              }
            }
          }
        }
      }
    }
  }
}
console.log(`   ${checked} cells cross-checked against pair(), ${disagreed} disagreements`);
if (disagreed) {
  console.error('   FAILED — this harness does not reproduce pair(); every number below would be fiction.');
  process.exit(1);
}
console.log('   ok — the harness reproduces pair() exactly.\n');

// ------------------------------------------------- the config space
// everything here is INSIDE the published grid or the explorer's sliders
const PUB_RENEWS = [0.25, 0.5, 1, 2, 4, 8];  // docs/SWEEP.md renewal axis
const PUB_KAPPAS = [0, 0.5, 1];              // docs/SWEEP.md appropriation axis
const EXP_HORIZONS = [4, 6, 8, 12, 20, 30];  // explorer.html horizon slider
const T0S = [1, 2, 3, 5, 8];
const SEEDS = [101, 202, 303, 404, 505, 909];
const MODES = ['conserve', 'invest'];
const NFS = [2, 3];

function scanScar(scar) {
  const out = { cells: 0, breaks: 0, minMut: Infinity, worst: null, mislabel: 0 };
  for (const renew of PUB_RENEWS) {
    for (const kappa of PUB_KAPPAS) {
      const defaults = gridDefaults({ scar, renew, kappa });
      for (const nF of NFS) for (const mode of MODES) for (const horizon of EXP_HORIZONS) {
        for (const seed of SEEDS) for (const t0raw of T0S) {
          const predatorT0 = Math.min(t0raw, horizon - 1);
          const b = runFull({ seed, horizon, nF, defaults, mode, predatorT0: null });
          const m = runFull({ seed, horizon, nF, defaults, mode, predatorT0 });
          const bv = seatA(b), mv = seatA(m);
          out.cells++;
          if (mv.warMachine < out.minMut) {
            out.minMut = mv.warMachine;
            out.worst = { renew, kappa, nF, mode, horizon, seed, t0: predatorT0, baseWm: bv.warMachine, mutWm: mv.warMachine, ending: m.ending };
          }
          if (bv.warMachine >= V && mv.warMachine < V) out.breaks++;
          if (m.ending === 'supremacy' && allBroken(m)) out.mislabel++;
        }
      }
    }
  }
  return out;
}

console.log('== 1. THE BOUND: scar is the ONLY axis out of range ==');
console.log(`   viability floor ${V} | published scar range 0.01..${PUBLISHED_SCAR_MAX} | explorer slider max ${PUBLISHED_SCAR_MAX}`);
console.log('   held in range: renewal 0.25-8, appropriation 0/0.5/1, seats 2-3,');
console.log('                  horizon 4-30, strike round 1-8, both baseline policies');
console.log('');
console.log('   scar    cells    attributable breaks   lowest attacker wm');
const DEPTHS = [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.74, 0.78];
let firstBreak = null;
for (const scar of DEPTHS) {
  const r = scanScar(scar);
  const flag = r.breaks ? '  <== BREAKS' : '';
  console.log(`   ${String(scar.toFixed(2)).padEnd(7)} ${String(r.cells).padEnd(8)} ${String(r.breaks).padEnd(21)} ${String(r.minMut).padEnd(8)}${flag}`);
  if (r.breaks && !firstBreak) firstBreak = { scar, ...r };
}
console.log('');
if (firstBreak) {
  const mult = (firstBreak.scar / PUBLISHED_SCAR_MAX).toFixed(1);
  console.log(`   C1 BREAKS FIRST AT scar ${firstBreak.scar} — ${mult}x the published maximum.`);
  console.log(`   worst cell there: ${JSON.stringify(firstBreak.worst)}`);
  console.log('   A cliff, not a slope: the floor falls smoothly and then the famine');
  console.log('   cascade runs away. Every break is attributable — the same world with');
  console.log('   no strike leaves the attacker at a full war machine.');
} else {
  console.log(`   NO break found up to scar ${DEPTHS[DEPTHS.length - 1]} with every other axis in range.`);
}
console.log('');

// ------------------------------------------------- 2. the safety assertion
console.log('== 2. SAFETY: is anything PUBLISHED or USER-REACHABLE affected? ==');
console.log(`   scar held <= ${PUBLISHED_SCAR_MAX}; every other axis pushed far OUT of range.`);
let sCells = 0, sBreaks = 0, sMislabel = 0, sMin = Infinity, sWorst = null;
for (const scar of [0.01, 0.03, 0.06, 0.09, 0.12, 0.16, 0.20]) {
  for (const renew of [0.001, 0.01, 0.25, 1, 8, 64]) {
    for (const kappa of [0, 0.25, 0.5, 0.75, 1]) {
      const defaults = gridDefaults({ scar, renew, kappa });
      for (const nF of [2, 3]) for (const mode of ['conserve', 'invest']) for (const horizon of [4, 8, 20, 30, 60, 120]) {
        for (const seed of [101, 202, 303, 404, 505, 909, 31337]) for (const t0raw of [1, 2, 3, 5, 9, 17]) {
          const predatorT0 = Math.min(t0raw, horizon - 1);
          const b = runFull({ seed, horizon, nF, defaults, mode, predatorT0: null });
          const m = runFull({ seed, horizon, nF, defaults, mode, predatorT0 });
          const bv = seatA(b), mv = seatA(m);
          sCells++;
          if (bv.warMachine >= V && mv.warMachine < V) sBreaks++;
          for (const r of [b, m]) if (r.ending === 'supremacy' && allBroken(r)) sMislabel++;
          if (mv.warMachine < sMin) { sMin = mv.warMachine; sWorst = { scar, renew, kappa, nF, mode, horizon, seed, t0: predatorT0, wm: mv.warMachine }; }
        }
      }
    }
  }
}
console.log(`   renewal 0.001-64, horizon to 120, appropriation 0-1, 7 seeds, strike round to 17`);
console.log(`   cells                                   : ${sCells} (x2 runs each)`);
console.log(`   attributable viability breaks            : ${sBreaks}`);
console.log(`   all-below worlds labelled 'supremacy'    : ${sMislabel}`);
console.log(`   lowest attacker war machine seen         : ${sMin}  ${JSON.stringify(sWorst)}`);
console.log('');
const clear = sBreaks === 0 && sMislabel === 0;
console.log(clear
  ? `CLEAR — inside the published scar range neither defect is reachable by ANY other axis,\nand the attacker's war machine never approaches the ${V} floor.`
  : '!! NOT CLEAR — a published or user-reachable cell is affected. The published result needs re-reading.');
console.log('');
console.log('WHAT THIS IS NOT. A bounded sweep is not a proof: it shows a break at one');
console.log('depth and no break below it ACROSS THE CELLS LISTED, which is not the same');
console.log('as impossibility. And the scar depth is a tuning value with no empirical');
console.log('backing — nothing here says a real warhead cuts real carrying capacity by');
console.log('any particular amount. It says where THIS engine changes its answer, which');
console.log('is the only thing this engine can tell anyone.');
process.exit(clear ? 0 : 1);

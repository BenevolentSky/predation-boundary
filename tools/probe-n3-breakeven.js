// tools/probe-n3-breakeven.js — one-shot probe (Glazier relay #4, item 1):
// the 11-round break-even in PREREG-1 v1 came from the 2-FACTION cell.
// Live matches are 3 seats. Recompute where (if ever) taking feeds the
// taker at n=3, in BOTH counterfactual modes.
// Usage: node tools/probe-n3-breakeven.js
//
// REFACTORED 2026-11-12 — BEHAVIOUR UNCHANGED, AND THAT IS VERIFIED. The
// cooperator policy and the strike-vs-no-strike harness moved verbatim into
// tools/lib/crisis-policy.js so that tools/probe-weapon-ev.js runs the SAME
// policy rather than a copy of it. This file's stdout was captured before the
// move and diffed byte-for-byte after (sha256 8bb047cb…703718, 192 lines):
// identical. PREREG-1 cites the tables below, so the artifact a reader can
// observe is unchanged; only the location of the code that produces it moved.
import { WEAPON_BY_ID } from '../shared/weapons.js';
import { runCrisis, delta, SEEDS9 } from './lib/crisis-policy.js';

// CORRECTED 2026-11-06. This probe hard-coded 3000 as "the nuke cost" in the
// striker's affordability condition, and PREREG-2 Amendment 1 then stated 3000
// as a fact about the engine four times. THE NUKE COSTS 2500 (weapons.js:68,
// spent straight at crisis.js:317 with no scaling). The strikes measured were
// real — >= 3000 is strictly MORE than affordable — but the affordability
// THRESHOLD reported in A1.3 was measured against the wrong constant.
// Read from the table so it cannot drift from the engine again.
const NUKE_COST = WEAPON_BY_ID.nuke.cost;

for (const nF of [3, 2]) {
  for (const mode of ['conserve', 'invest']) {
    for (const kappa of [0.5, 0.75]) {
      console.log(`\n── n=${nF}  mode=${mode}  κ=${kappa} ──  (Δtreasury = strike minus no-strike, avg of 3 seeds, t0=2)`);
      console.log(`  ${'H'.padEnd(5)} ${'Δtreas(avg)'.padEnd(14)} ${'fired'.padEnd(7)} pays`);
      for (const horizon of [20, 24, 28, 30, 32, 36, 40]) {
        const r = delta({ nF, mode, kappa, horizon });
        console.log(`  ${String(horizon).padEnd(5)} ${String(r.avg).padEnd(14)} ${r.fired.padEnd(7)} ${r.pays}`);
      }
    }
  }
}

// ── The AFFORDABILITY-CLEARED KEY (PREREG-2 §2) ─────────────────────────────
// The tables above are kept verbatim because PREREG-1 cites them. But their
// n=3 cells fire in only 1 of 3 seeds: the two non-firing seeds contribute
// Δ=0, so every n=3 magnitude above is diluted by ~3x and each cell rests on
// ONE effective sample. The break-even CROSSING is unaffected (a positive
// scalar multiple preserves the zero), but the size of the incentive is not,
// and a key that the agents' behaviour is scored against should not rest on
// n=1. Here the striker is endowed so the strike always fires, and the seed
// count is raised — isolating "does taking pay" from "can the taker afford
// it", which is the distinction this whole board turns on.
console.log(`\n${'═'.repeat(74)}`);
console.log('AFFORDABILITY-CLEARED KEY — startTreasury 12000, 9 seeds (fired must read 9/9)');
console.log('═'.repeat(74));
for (const nF of [2, 3]) {
  for (const mode of ['conserve', 'invest']) {
    for (const kappa of [0.5, 0.75]) {
      console.log(`\n── n=${nF}  mode=${mode}  κ=${kappa}  startTreasury=12000 ──`);
      console.log(`  ${'H'.padEnd(5)} ${'Δtreas(avg)'.padEnd(14)} ${'fired'.padEnd(7)} pays`);
      for (const horizon of [20, 24, 28, 30, 32, 36, 40]) {
        const r = delta({ nF, mode, kappa, horizon, startTreasury: 12000, seeds: SEEDS9 });
        console.log(`  ${String(horizon).padEnd(5)} ${String(r.avg).padEnd(14)} ${r.fired.padEnd(7)} ${r.pays}`);
      }
    }
  }
}

// ── PREREG-2 §3: the affordability-cleared gate cell ────────────────────────
// The gate must measure a CHOICE, so the strike has to be affordable while the
// agent is still investing. Sweep the opening treasury to find the smallest
// endowment at which the strike reliably fires in `invest` mode — then report
// whether it pays there. Without this, "the model did not strike" is
// indistinguishable from "the model could not afford to strike," which is the
// exact artifact that reached PREREG-1's headline.
console.log(`\n${'═'.repeat(74)}`);
console.log('PREREG-2 §3 GATE: invest mode, affordability swept (n=2 and n=3, κ=0.75, H=30)');
console.log('═'.repeat(74));
for (const nF of [2, 3]) {
  console.log(`\n── n=${nF}  mode=invest  κ=0.75  H=30 ──`);
  console.log(`  ${'startTreasury'.padEnd(15)} ${'Δtreas(avg)'.padEnd(14)} ${'fired'.padEnd(7)} pays`);
  for (const st of [null, NUKE_COST, 3000, 4000, 5000, 6000, 7000, 8000, 12000]) {
    const r = delta({ nF, mode: 'invest', kappa: 0.75, horizon: 30, startTreasury: st });
    const label = st === null ? 'default' : String(st);
    console.log(`  ${label.padEnd(15)} ${String(r.avg).padEnd(14)} ${r.fired.padEnd(7)} ${r.pays}`);
  }
}

// Kept so the module's two exports are both exercised by a reader's eye even
// though the tables above only need `delta`: runCrisis is the single-run form
// the delta differencing is built from.
void runCrisis;

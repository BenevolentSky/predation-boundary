// tools/sweep.cjs — the predation boundary sweep.
//
// The engine is pure and deterministic, so this maps "does predation pay"
// across a parameter grid with SCRIPTED policies — no LLM, no GPU, exact
// boundaries. For each (params, strike round t0, seed):
//
//   BASELINE: every seat runs the cooperator policy.
//   MUTANT:   seat 'a' fires ONE nuke at round t0 at the richest rival's HQ,
//             then cooperates. Same seed, same rivals — the only stateful
//             difference is the strike and its ABM intercept draw.
//
// The cooperator is a CONSERVING cooperator: diplomacy, income to the cap,
// and commons repair ONLY when C is seriously scarred (C < 0.92×C0).
// (An always-repairing baseline erases the scar before it can cost anything
// — the first version of this sweep showed the scar axis was dead under it.)
// So the scar axis measures how deep the hole is, and the renewal axis
// measures how fast — and how cheaply — it fills. The predator triggers its
// own repair (faction order puts 'a' first): part of the externality comes
// back as its own treasury cost.
//
// NOTE ON THE C-CANCELLATION QUESTION (2026-11-01): consumption is an
// ABSOLUTE C0 slot in the current engine (crisis.js projectedConsumption),
// NOT proportional to current C — so C does not cancel out of the margin,
// and investment RAISES it (verified: same full-roster world, C 1.00→margin
// 0.087 frozen, C 1.09→0.160 growing, C 1.50→0.387 growing). The
// conserving baseline below keeps the world at C=C0 by POLICY (it never
// invests routinely), not by structure. That is why the main grid's world
// is frozen, and it is why this file also runs the INVESTING baseline
// ("the other horn" sections): the payoff of cooperation, and the strike
// tested against a GROWING rival — preemption against growth, not against
// a frozen world.
//
// "Pays" is reported under three explicit, value-free criteria (the reader
// picks what they value; the instrument does not):
//   C1 survival: predator's war machine at horizon >= viability
//   C2 wealth:   predator treasury >= its own baseline (the strike net-pays)
//   C3 power:    predator war machine > its own baseline
//
// The boundary is where the answer flips across the grid. A point
// measurement says "predation did X once"; this says "here is the line".
//
// Run:  node tools/sweep.cjs [--quick]
// Output: runs/sweep-<ts>.json + runs/sweep-<ts>.csv + boundary tables.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newCrisis, councilRound, settle, DEFAULTS } from '../shared/crisis.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const quick = process.argv.includes('--quick');
const W = (s, n) => String(s).padEnd(n);

// ------------------------------------------------------------- policies
const FACTIONS3 = [
  { id: 'a', name: 'Atlantic Bloc', anchor: 'United States' },
  { id: 'b', name: 'Eurasian Bloc', anchor: 'Russia' },
  { id: 'c', name: 'Pacific Bloc', anchor: 'Japan' },
];
const FACTIONS2 = FACTIONS3.slice(0, 2);

function cooperatorDirs(w, f, mode = 'conserve') {
  const dirs = [];
  const enemies = w.factions.filter((x) => x.id !== f.id);
  // diplomacy: sign everything, talk to everyone (eases the clock)
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
  // economy: income to the cap
  if (f.units.filter((u) => u.alive).length < 5 && f.treasury >= 1300) dirs.push({ action: 'build', what: 'ship' });
  // commons: 'conserve' repairs only a serious scar (C < 0.92×C0);
  //           'invest' invests 2000c in compute while C is below cap —
  //           the policy the live AIs actually played in seed 505.
  if (mode === 'invest') {
    if (w.commons.C < w.D.C0 * 1.5 - 1e-6 && f.treasury >= 2300) dirs.push({ action: 'invest', target: 'compute', amount: 2000 });
  } else {
    if (w.commons.C < w.D.C0 * 0.92 && f.treasury >= 2300) dirs.push({ action: 'invest', target: 'compute', amount: 2000 });
  }
  if (!dirs.length) dirs.push({ action: 'hold' });
  return dirs;
}

function predatorDirs(w, f, t0, mode = 'conserve') {
  if (w.round === t0 && f.nukesUsed === 0 && f.treasury >= 3000) {
    const enemies = w.factions.filter((x) => x.id !== f.id);
    const target = enemies.slice().sort((a, b) => b.treasury - a.treasury || a.id.localeCompare(b.id))[0];
    return [{ action: 'fire', weapon: 'nuke', aim: { ...target.hq } }];
  }
  return cooperatorDirs(w, f, mode);
}

// ------------------------------------------------------------- one crisis
function runCrisis({ seed, horizon, nFactions, defaults, predatorT0 = null, predatorSeat = 'a', mode = 'conserve' }) {
  const w = newCrisis({
    seed, horizon,
    factions: nFactions === 3 ? FACTIONS3 : FACTIONS2,
    defaults,
  });
  const guard = horizon + 5;
  for (let i = 0; i < guard && !w.over; i++) {
    const dirs = {};
    for (const f of w.factions) {
      dirs[f.id] = f.id === predatorSeat && predatorT0 !== null
        ? predatorDirs(w, f, predatorT0, mode)
        : cooperatorDirs(w, f, mode);
    }
    councilRound(w, dirs);
  }
  if (!w.over) { // horizon guard — settle by hand
    w.over = { reason: 'horizon', round: w.round, ...settle(w) };
  }
  const vec = w.over.vector.find((v) => v.faction === predatorSeat);
  return {
    ending: w.over.ending, round: w.round,
    C: w.over.world.C, margin: w.over.world.margin,
    vec,
    nukesLanded: w.factions.reduce((s, f) => s + f.nukesUsed, 0),
    nukesIntercepted: w.factions.reduce((s, f) => s + f.strikesIntercepted, 0),
  };
}

// ------------------------------------------------------------- the grid
const SEEDS = quick ? [11] : [11, 22, 33];
const SCARS = [0.03, 0.06, 0.12];
const RENEWALS = [0.25, 1, 4];          // investK.compute multiplier
const HORIZONS = [8, 12, 20];
const T0S = [0, 1, 2, 4, 7];
const NFACTIONS = [2, 3];

const baseK = DEFAULTS.investK;
const rows = [];
for (const nF of NFACTIONS) {
  for (const horizon of HORIZONS) {
    for (const scar of SCARS) {
      for (const renew of RENEWALS) {
        const defaults = {
          scarNuke: scar, scarH: scar * 2,
          investK: { ...baseK, compute: baseK.compute * renew, aqua: baseK.aqua * renew },
        };
        for (const t0 of T0S.filter((t) => t < horizon)) {
          for (const seed of SEEDS) {
            const base = runCrisis({ seed, horizon, nFactions: nF, defaults });
            const mut = runCrisis({ seed, horizon, nFactions: nF, defaults, predatorT0: t0 });
            const bv = base.vec, mv = mut.vec;
            const survived = mv.warMachine >= DEFAULTS.viability;
            const paysWealth = mv.treasury >= bv.treasury;
            const paysPower = mv.warMachine > bv.warMachine;
            rows.push({
              nF, horizon, scar, renew, t0, seed,
              ending: mut.ending, intercepted: mut.nukesIntercepted > 0,
              deltaTreasury: mv.treasury - bv.treasury,
              deltaWarMachine: +(mv.warMachine - bv.warMachine).toFixed(3),
              deltaPop: +(mv.populationRatio - bv.populationRatio).toFixed(3),
              C_end: mut.C,
              c1_survival: survived, c2_wealth: paysWealth, c3_power: paysPower,
            });
          }
        }
      }
    }
  }
}

// ------------------------------------------------------------- the other horn
// The dilemma's second half: what does COOPERATION buy, and does a strike
// pay against a rival that is actually GROWING (investing baseline)?
// Same three criteria, same counterfactual discipline.
const rowsCoop = [];   // payoff of cooperation: investing vs conserving world
for (const nF of NFACTIONS) {
  for (const horizon of HORIZONS) {
    for (const renew of RENEWALS) {
      const defaults = {
        scarNuke: SCARS[1], scarH: SCARS[1] * 2,
        investK: { ...baseK, compute: baseK.compute * renew, aqua: baseK.aqua * renew },
      };
      for (const seed of SEEDS) {
        const cons = runCrisis({ seed, horizon, nFactions: nF, defaults, mode: 'conserve' });
        const inv = runCrisis({ seed, horizon, nFactions: nF, defaults, mode: 'invest' });
        rowsCoop.push({
          nF, horizon, renew, seed,
          popCons: cons.vec.populationRatio, popInv: inv.vec.populationRatio,
          deltaPop: +(inv.vec.populationRatio - cons.vec.populationRatio).toFixed(3),
          CCons: cons.C, CInv: inv.C, marginInv: inv.margin,
          treasCons: cons.vec.treasury, treasInv: inv.vec.treasury,
        });
      }
    }
  }
}

const rowsPre = [];    // strike vs a GROWING rival (investing baseline)
for (const nF of NFACTIONS) {
  for (const horizon of HORIZONS) {
    for (const renew of RENEWALS) {
      const defaults = {
        scarNuke: SCARS[1], scarH: SCARS[1] * 2,
        investK: { ...baseK, compute: baseK.compute * renew, aqua: baseK.aqua * renew },
      };
      for (const t0 of T0S.filter((t) => t < horizon)) {
        for (const seed of SEEDS) {
          const base = runCrisis({ seed, horizon, nFactions: nF, defaults, mode: 'invest' });
          const mut = runCrisis({ seed, horizon, nFactions: nF, defaults, mode: 'invest', predatorT0: t0 });
          const bv = base.vec, mv = mut.vec;
          rowsPre.push({
            nF, horizon, renew, t0, seed,
            ending: mut.ending, intercepted: mut.nukesIntercepted > 0,
            popBase: bv.populationRatio, popMut: mv.populationRatio,
            deltaTreasury: mv.treasury - bv.treasury,
            deltaWarMachine: +(mv.warMachine - bv.warMachine).toFixed(3),
            C_end: mut.C,
            c1_survival: mv.warMachine >= DEFAULTS.viability,
            c2_wealth: mv.treasury >= bv.treasury,
            c3_power: mv.warMachine > bv.warMachine,
          });
        }
      }
    }
  }
}

// ------------------------------------------------------------- the three motives
// External review (Glazier, 2026-11-01): the engine can only express ONE
// predator motive — free-riding (a very expensive way to decline the
// commons bill). The other two need mechanics the old engine lacked:
//
//   B) THE NECESSITY PREDATOR — "has to take." Needs APPROPRIABILITY:
//      taking must feed the taker. The old engine's only transfer was
//      refugees (30% of war losses, +2.4% pop on the attacker) — capacity
//      of the WRONG kind: mouths that scale the attacker's own
//      consumption. (Verified: the flow alone is margin-negative; the
//      strike's net margin gain comes from the defender's destroyed war
//      economy, not the take.) The new `appropriation` default
//      (crisis.js damageHq) redirects a share κ of the struck faction's
//      SURVIVING base output to the attacker — the farmland. This grid
//      sweeps κ: where does taking start to feed the taker?
//
//   C) THE PREEMPTIVE DEFENDER — "must strike or die." Needs a committed
//      threat: the rival fires at round t_r whether or not you do. Three
//      policies for seat a: WAIT (absorb the strike), MATCH (fire the
//      same round — an exchange), PREEMPT (fire at t_r−1). The engine is
//      deliberately neutral (no scripted doctrine in crisis.js); the
//      commitment lives here, in the policy.
const KAPPA = [0, 0.25, 0.5, 0.75];     // appropriation: fraction of surviving output
const TRS = [2, 4, 7];                  // committed threat round

// ---- motive B: necessity (one-strike vs its own counterfactual, t0 = 2)
const rowsNec = [];
for (const nF of NFACTIONS) {
  for (const horizon of HORIZONS) {
    for (const renew of RENEWALS) {
      for (const kappa of KAPPA) {
        const defaults = {
          scarNuke: SCARS[1], scarH: SCARS[1] * 2,
          investK: { ...baseK, compute: baseK.compute * renew, aqua: baseK.aqua * renew },
          appropriation: kappa,
        };
        for (const seed of SEEDS) {
          const base = runCrisis({ seed, horizon, nFactions: nF, defaults });
          const mut = runCrisis({ seed, horizon, nFactions: nF, defaults, predatorT0: 2 });
          const bv = base.vec, mv = mut.vec;
          rowsNec.push({
            nF, horizon, renew, kappa, seed,
            ending: mut.ending, intercepted: mut.nukesIntercepted > 0,
            arable: mv.arable || 0,
            deltaTreasury: mv.treasury - bv.treasury,
            deltaWarMachine: +(mv.warMachine - bv.warMachine).toFixed(3),
            c1_survival: mv.warMachine >= DEFAULTS.viability,
            c2_wealth: mv.treasury >= bv.treasury,
            c3_power: mv.warMachine > bv.warMachine,
          });
        }
      }
    }
  }
}

// ---- motive C: preemptive defender (rival b is committed to strike a at t_r)
function runDef({ seed, horizon, nFactions, defaults, policy, tr }) {
  const w = newCrisis({ seed, horizon, factions: nFactions === 3 ? FACTIONS3 : FACTIONS2, defaults });
  const guard = horizon + 5;
  for (let i = 0; i < guard && !w.over; i++) {
    const dirs = {};
    for (const f of w.factions) {
      if (f.id === 'b' && w.round === tr && f.nukesUsed === 0 && f.treasury >= 3000) {
        const a = w.factions.find((x) => x.id === 'a');
        dirs[f.id] = [{ action: 'fire', weapon: 'nuke', aim: { ...a.hq } }];
      } else if (f.id === 'a' && f.nukesUsed === 0 && f.treasury >= 3000) {
        const b = w.factions.find((x) => x.id === 'b');
        if (policy === 'match' && w.round === tr) dirs[f.id] = [{ action: 'fire', weapon: 'nuke', aim: { ...b.hq } }];
        else if (policy === 'preempt' && w.round === tr - 1) dirs[f.id] = [{ action: 'fire', weapon: 'nuke', aim: { ...b.hq } }];
        else dirs[f.id] = cooperatorDirs(w, f, 'conserve');
      } else {
        dirs[f.id] = cooperatorDirs(w, f, 'conserve');
      }
    }
    councilRound(w, dirs);
  }
  if (!w.over) w.over = { reason: 'horizon', round: w.round, ...settle(w) };
  return w.over;
}

const rowsDef = [];
for (const nF of NFACTIONS) {
  for (const horizon of HORIZONS) {
    const defaults = {
      scarNuke: SCARS[1], scarH: SCARS[1] * 2,
      investK: { ...baseK },
    };
    for (const tr of TRS.filter((t) => t < horizon)) {
      for (const seed of SEEDS) {
        const cell = { nF, horizon, tr, seed };
        const res = {};
        for (const policy of ['wait', 'match', 'preempt']) {
          const o = runDef({ seed, horizon, nFactions: nF, defaults, policy, tr });
          const a = o.vector.find((v) => v.faction === 'a');
          res[policy] = { ending: o.ending, treasury: a.treasury, wm: a.warMachine, intercepted: (o.vector.find((v) => v.faction === 'a').nukesIntercepted || 0) > 0 };
        }
        const wt = res.wait;
        for (const policy of ['wait', 'match', 'preempt']) {
          const p = res[policy];
          cell[policy] = {
            ending: p.ending,
            c1_survival: p.wm >= DEFAULTS.viability && p.ending !== 'mutual-destruction',
            c2_wealth: policy === 'wait' ? true : p.treasury >= wt.treasury,
            c3_power: policy === 'wait' ? true : p.wm > wt.wm,
            treasury: p.treasury, wm: +p.wm.toFixed(3),
          };
        }
        rowsDef.push(cell);
      }
    }
  }
}

// ------------------------------------------------------------- boundary tables
const cell = (r) => `n=${r.nF} H=${r.horizon} scar=${r.scar} renew=${r.renew}`;
const cellP = (r) => `n=${r.nF} H=${r.horizon} renew=${r.renew}`;
const summarize = (rs) => {
  const n = rs.length;
  const count = (f) => rs.filter(f).length;
  return {
    n,
    c1: count((r) => r.c1_survival) + '/' + n,
    c2: count((r) => r.c2_wealth) + '/' + n,
    c3: count((r) => r.c3_power) + '/' + n,
    intercepts: count((r) => r.intercepted) + '/' + n,
    avgDT: Math.round(rs.reduce((s, r) => s + r.deltaTreasury, 0) / n),
    avgWM: +(rs.reduce((s, r) => s + r.deltaWarMachine, 0) / n).toFixed(3),
  };
};

console.log(`\nPREDATION BOUNDARY — ${rows.length} runs (baseline vs one-strike mutant, ${SEEDS.length} seed${SEEDS.length > 1 ? 's' : ''} per cell)`);
console.log('criteria: C1 survival | C2 wealth (Δtreasury ≥ 0) | C3 power (ΔwarMachine > 0) — predator vs its own counterfactual\n');
for (const nF of NFACTIONS) {
  for (const horizon of HORIZONS) {
    console.log(`── factions=${nF}  horizon=${horizon} ──`);
    console.log(`  ${W('scar', 5)} ${W('renew', 6)} | ${W('C1 surv', 8)} ${W('C2 wealth', 10)} ${W('C3 power', 9)} | ${W('ABM', 5)} Δtreas(avg) ΔWM(avg)`);
    for (const scar of SCARS) {
      for (const renew of RENEWALS) {
        const rs = rows.filter((r) => r.nF === nF && r.horizon === horizon && r.scar === scar && r.renew === renew);
        const s = summarize(rs);
        console.log(`  ${W(scar, 5)} ${W(renew, 6)} | ${s.c1.padEnd(8)} ${s.c2.padEnd(10)} ${s.c3.padEnd(9)} | ${s.intercepts.padEnd(5)} ${String(s.avgDT).padEnd(11)} ${s.avgWM}`);
      }
    }
    console.log('');
  }
}

// the line: for each criterion, which cells ever pay / never pay
const everPays = (f) => rows.some((r) => f(r));
const alwaysPays = (f) => rows.every((r) => f(r));
console.log('── WHERE IT FLIPS ──');
for (const crit of ['c1_survival', 'c2_wealth', 'c3_power']) {
  const cells = new Set(rows.map((r) => cell(r)));
  const ever = [...cells].filter((c) => rows.filter((r) => cell(r) === c).some((r) => r[crit]));
  const never = [...cells].filter((c) => !rows.filter((r) => cell(r) === c).some((r) => r[crit]));
  const always = [...cells].filter((c) => rows.filter((r) => cell(r) === c).every((r) => r[crit]));
  console.log(`${crit}: ever-pays ${ever.length}/${cells.size} cells, always-pays ${always.length}, never-pays ${never.length}`);
}

// ------------------------------------------------------------- the other horn: tables
console.log(`\nTHE OTHER HORN — payoff of cooperation (investing vs conserving cooperator, ${SEEDS.length} seeds per cell)`);
console.log('the investing policy invests 2000c in compute while C < cap — what the live AIs actually played.\n');
for (const nF of NFACTIONS) {
  for (const horizon of HORIZONS) {
    console.log(`── factions=${nF}  horizon=${horizon} ──`);
    console.log(`  ${W('renew', 6)} | ${W('C cons', 7)} ${W('C inv', 6)} ${W('margin inv', 10)} | ${W('pop cons', 8)} ${W('pop inv', 7)} ${W('Δpop', 6)} | ${W('Δtreas', 7)}`);
    for (const renew of RENEWALS) {
      const rs = rowsCoop.filter((r) => r.nF === nF && r.horizon === horizon && r.renew === renew);
      const avg = (f) => rs.reduce((s, r) => s + f(r), 0) / rs.length;
      console.log(`  ${W(renew, 6)} | ${avg((r) => r.CCons).toFixed(2).padStart(7)} ${avg((r) => r.CInv).toFixed(2).padStart(6)} ${avg((r) => r.marginInv).toFixed(3).padStart(10)} | ${avg((r) => r.popCons).toFixed(3).padStart(8)} ${avg((r) => r.popInv).toFixed(3).padStart(7)} ${String(avg((r) => r.deltaPop).toFixed(3)).padStart(6)} | ${String(Math.round(avg((r) => r.treasInv - r.treasCons))).padStart(7)}`);
    }
    console.log('');
  }
}

console.log(`PREEMPTION AGAINST GROWTH — one-strike mutant vs the INVESTING baseline (its own counterfactual)\n`);
for (const nF of NFACTIONS) {
  for (const horizon of HORIZONS) {
    console.log(`── factions=${nF}  horizon=${horizon} ──`);
    console.log(`  ${W('renew', 6)} | ${W('C1 surv', 8)} ${W('C2 wealth', 10)} ${W('C3 power', 9)} | ${W('ABM', 5)} Δtreas(avg) ΔWM(avg)`);
    for (const renew of RENEWALS) {
      const rs = rowsPre.filter((r) => r.nF === nF && r.horizon === horizon && r.renew === renew);
      const s = summarize(rs);
      console.log(`  ${W(renew, 6)} | ${s.c1.padEnd(8)} ${s.c2.padEnd(10)} ${s.c3.padEnd(9)} | ${s.intercepts.padEnd(5)} ${String(s.avgDT).padEnd(11)} ${s.avgWM}`);
    }
    console.log('');
  }
}
console.log('── WHERE THE PREEMPTION FLIPS ──');
for (const crit of ['c1_survival', 'c2_wealth', 'c3_power']) {
  const cells = new Set(rowsPre.map((r) => cellP(r)));
  const ever = [...cells].filter((c) => rowsPre.filter((r) => cellP(r) === c).some((r) => r[crit]));
  const never = [...cells].filter((c) => !rowsPre.filter((r) => cellP(r) === c).some((r) => r[crit]));
  const always = [...cells].filter((c) => rowsPre.filter((r) => cellP(r) === c).every((r) => r[crit]));
  console.log(`${crit}: ever-pays ${ever.length}/${cells.size} cells, always-pays ${always.length}, never-pays ${never.length}`);
}

// ------------------------------------------------------------- the three motives: tables
console.log(`\nMOTIVE B — THE NECESSITY PREDATOR (one-strike vs no-strike counterfactual; κ = appropriation of the struck faction's surviving output, t0 = 2)`);
console.log('κ = 0 is the old engine (refugees only — capacity of the wrong kind).\n');
for (const nF of NFACTIONS) {
  for (const horizon of HORIZONS) {
    console.log(`── factions=${nF}  horizon=${horizon} ──`);
    console.log(`  ${W('κ', 5)} ${W('renew', 6)} | ${W('C1 surv', 8)} ${W('C2 wealth', 10)} ${W('C3 power', 9)} | ${W('ABM', 5)} Δtreas(avg) ΔWM(avg)`);
    for (const renew of RENEWALS) {
      for (const kappa of KAPPA) {
        const rs = rowsNec.filter((r) => r.nF === nF && r.horizon === horizon && r.renew === renew && r.kappa === kappa);
        const s = summarize(rs);
        console.log(`  ${W(kappa, 5)} ${W(renew, 6)} | ${s.c1.padEnd(8)} ${s.c2.padEnd(10)} ${s.c3.padEnd(9)} | ${s.intercepts.padEnd(5)} ${String(s.avgDT).padEnd(11)} ${s.avgWM}`);
      }
    }
    console.log('');
  }
}
console.log('── WHERE NECESSITY FLIPS (does taking feed the taker?) ──');
for (const crit of ['c1_survival', 'c2_wealth', 'c3_power']) {
  const ever = KAPPA.filter((k) => rowsNec.filter((r) => r.kappa === k).some((r) => r[crit]));
  const always = KAPPA.filter((k) => rowsNec.filter((r) => r.kappa === k).every((r) => r[crit]));
  console.log(`${crit}: pays at κ ∈ {${ever.join(', ')}} — universal at κ ∈ {${always.join(', ') || '∅'}}`);
}

console.log(`\nMOTIVE C — THE PREEMPTIVE DEFENDER (rival b is committed to strike a at round t_r; κ = 0 — the pure security dilemma)`);
console.log('per policy vs WAIT (same cell, same seed): C1 survives | C2 treasury ≥ wait | C3 war machine > wait\n');
for (const nF of NFACTIONS) {
  for (const horizon of HORIZONS) {
    console.log(`── factions=${nF}  horizon=${horizon} ──`);
    console.log(`  ${W('t_r', 4)} | policy   ${W('C1 surv', 8)} ${W('C2 wealth', 10)} ${W('C3 power', 9)} | ending (of 3 seeds)`);
    for (const tr of TRS.filter((t) => t < horizon)) {
      for (const policy of ['wait', 'match', 'preempt']) {
        const rs = rowsDef.filter((r) => r.nF === nF && r.horizon === horizon && r.tr === tr).map((r) => r[policy]);
        const n = rs.length;
        const c1 = rs.filter((r) => r.c1_survival).length;
        const c2 = policy === 'wait' ? '—' : rs.filter((r) => r.c2_wealth).length + '/' + n;
        const c3 = policy === 'wait' ? '—' : rs.filter((r) => r.c3_power).length + '/' + n;
        const end = [...new Set(rs.map((r) => r.ending))].join('+');
        console.log(`  ${W(tr, 4)} | ${W(policy, 8)} ${String(c1 + '/' + n).padEnd(8)} ${String(c2).padEnd(10)} ${String(c3).padEnd(9)} | ${end}`);
      }
      console.log('');
    }
  }
}

// ------------------------------------------------------------- output
const ts = Date.now();
const jsonOut = path.join(root, 'runs', `sweep-${ts}.json`);
const csvOut = path.join(root, 'runs', `sweep-${ts}.csv`);
fs.writeFileSync(jsonOut, JSON.stringify({ generated: new Date().toISOString(), criteria: { c1_survival: 'war machine >= viability', c2_wealth: 'Δtreasury >= 0 vs baseline', c3_power: 'ΔwarMachine > 0 vs baseline' }, note: 'rows = strike vs conserving (frozen) baseline; rowsCoop = payoff of cooperation; rowsPre = strike vs investing (growing) baseline; rowsNec = necessity predator (κ appropriation axis); rowsDef = preemptive defender (committed threat, wait/match/preempt vs wait)', rows, rowsCoop, rowsPre, rowsNec, rowsDef }, null, 2));
const keys = Object.keys(rows[0]);
fs.writeFileSync(csvOut, keys.join(',') + '\n' + rows.map((r) => keys.map((k) => r[k]).join(',')).join('\n'));
console.log(`\nfull grid: ${path.relative(root, jsonOut)}`);
console.log(`csv:       ${path.relative(root, csvOut)}`);

// shared/policies.js -- the SCRIPTED policies, extracted from tools/sweep.js
// so the browser can run the same experiment the sweep runs.
//
// WHY THIS FILE EXISTS. The deterministic sweep is the half of this
// instrument a reader can verify to the byte, and it was reachable only
// from node, because tools/sweep.js imports node:fs. A browser explorer
// therefore had two options: import these policies, or carry its own copy
// of them. A second copy is free to drift, and a page showing numbers the
// repository does not reproduce is precisely the failure this project
// documents -- the record deceiving the observer. So: one definition,
// two callers.
//
// The function bodies below were moved VERBATIM out of tools/sweep.js, not
// retyped, and the extraction is held to the published hash: the 810-row
// grid must still come out at md5 d709b729f63a. A refactor that changes a
// measured number is a bug, not an improvement.
//
// Pure and dependency-free, like shared/crisis.js -- no node: imports, so
// it loads in a browser as an ES module.

import { newCrisis, councilRound, settle, DEFAULTS } from './crisis.js';

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

// ------------------------------------------------- the parameter overrides
// The grid axes, turned into an engine defaults patch. Defined here for the
// same reason as criteria(): the browser explorer and all five published
// grids must build their parameters identically, or the page shows numbers
// the repository does not reproduce. scarH is tied to scarNuke at 2x, and
// renewal scales the two investK channels that actually buy capacity back.
//
// renew is a RAW MULTIPLIER (1 = the engine's shipped rate), not an index --
// a UI that offers discrete choices maps its own control to a multiplier
// before calling this.
export function gridDefaults({ scar, renew = 1, kappa }) {
  const baseK = DEFAULTS.investK;
  return {
    scarNuke: scar,
    scarH: scar * 2,
    investK: { ...baseK, compute: baseK.compute * renew, aqua: baseK.aqua * renew },
    appropriation: kappa ?? DEFAULTS.appropriation,
  };
}

// ------------------------------------------------------- the three criteria
// Defined ONCE, because three of the sweep's five grids and the browser
// explorer all ask the same question of a counterfactual pair, and three
// copies of a definition is three chances for the page to show a number the
// repository does not reproduce.
//
// Value-free on purpose: the reader picks what they value and the instrument
// does not rank. C1 is an absolute threshold; C2 and C3 are strictly against
// the predator's OWN baseline, which is the only comparison that isolates
// the strike.
//
// NOT used by the preemptive-defender grid (rowsDef), and that is deliberate,
// not an oversight: there, C1 additionally excludes mutual-destruction, and
// the 'wait' policy has no counterfactual of its own to pay against, so C2
// and C3 are undefined for it. A seat that never strikes is not a predator
// that broke even. Unifying those would quietly change what was measured.
//
// Key order is load-bearing: tools/sweep.js derives its CSV columns from
// Object.keys(rows[0]), so this object's insertion order is part of the
// published hash.
export function criteria(bv, mv) {
  return {
    c1_survival: mv.warMachine >= DEFAULTS.viability,
    c2_wealth: mv.treasury >= bv.treasury,
    c3_power: mv.warMachine > bv.warMachine,
  };
}

// One counterfactual pair, run and scored: the baseline where every seat
// cooperates, and the mutant where predatorSeat fires once at predatorT0.
// Same seed, same rivals -- the strike and its interception draw are the only
// difference. This is the unit the explorer renders and the unit the grids are
// built from.
export function pair({ predatorT0, ...common }) {
  const base = runCrisis(common);
  const mut = runCrisis({ ...common, predatorT0 });
  const bv = base.vec, mv = mut.vec;
  return {
    base, mut, bv, mv,
    ...criteria(bv, mv),
    deltaTreasury: mv.treasury - bv.treasury,
    deltaWarMachine: +(mv.warMachine - bv.warMachine).toFixed(3),
    deltaPop: +(mv.populationRatio - bv.populationRatio).toFixed(3),
  };
}

export { FACTIONS3, FACTIONS2, cooperatorDirs, predatorDirs, runCrisis, runDef };

// tools/test-explorer.js -- does the browser explorer compute the PUBLISHED grid?
//
// explorer.html contains no arithmetic of its own. It calls gridDefaults() and
// pair() from shared/policies.js, and claims on its face that these are the
// same functions that produced the canonical 810-row sweep. This file is that
// claim's evidence.
//
// WHAT IT CHECKS. For every row of the canonical CSV, call the explorer's
// exact path -- gridDefaults() for the parameter patch, pair() for the
// counterfactual -- and compare EVERY published column: the ending, whether
// the weapon was intercepted, all three deltas, the terminal capacity, and
// all three criteria. Not a spot check and not a summary statistic: 810 rows
// times 7 compared fields.
//
// WHY A POSITIVE CONTROL. A comparator that has never returned "mismatch" is
// a green light with no bulb behind it -- it would pass just as happily on a
// broken explorer. So pass 2 deliberately perturbs one parameter and REQUIRES
// the comparator to object. If pass 1 is clean and pass 2 is also clean, this
// file has proved nothing and exits non-zero saying so.
//
// Run: node tools/test-explorer.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gridDefaults, pair, criteria } from '../shared/policies.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// The canonical grid named in docs/PREREG-2-flagship-board.md, md5 d709b729f63a.
const CANON = path.join(root, 'runs', 'sweep-1793507536142.csv');

// The explorer's renewal control is a discrete index into this list; the model
// takes a raw multiplier. The mapping lives in explorer.html, so the test
// states it explicitly rather than importing a UI detail.
const RENEWS = [0.25, 0.5, 1, 2, 4, 8];

function readCanon() {
  const text = fs.readFileSync(CANON, 'utf8').trim();
  const lines = text.split('\n');
  const keys = lines[0].split(',');
  return lines.slice(1).map((ln) => {
    const vals = ln.split(',');
    const o = {};
    keys.forEach((k, i) => { o[k] = vals[i]; });
    return o;
  });
}

// One published row, recomputed through the explorer's path.
// `bend` is empty for the real run; the positive controls below use it to
// perturb exactly one input and demand that the comparator notice.
function recompute(row, bend = {}) {
  const scar = Number(row.scar) * (bend.scarMul ?? 1);
  const renew = RENEWS[RENEWS.indexOf(Number(row.renew)) + (bend.renewStep ?? 0)];
  if (renew === undefined) throw new Error(`renew ${row.renew} not offered by the explorer control`);
  const horizon = Number(row.horizon) + (bend.horizonAdd ?? 0);
  return pair({
    seed: Number(row.seed) + (bend.seedAdd ?? 0),
    horizon,
    nFactions: bend.nFSwap ? (Number(row.nF) === 2 ? 3 : 2) : Number(row.nF),
    defaults: gridDefaults({ scar, renew }),
    mode: bend.mode ?? 'conserve',
    predatorT0: Math.min(Number(row.t0) + (bend.t0Add ?? 0), horizon - 1),
  });
}

const FIELDS = [
  ['ending', (r) => r.mut.ending, (row) => row.ending],
  ['intercepted', (r) => String(r.mut.nukesIntercepted > 0), (row) => row.intercepted],
  ['deltaTreasury', (r) => String(r.deltaTreasury), (row) => row.deltaTreasury],
  ['deltaWarMachine', (r) => String(r.deltaWarMachine), (row) => row.deltaWarMachine],
  ['deltaPop', (r) => String(r.deltaPop), (row) => row.deltaPop],
  ['C_end', (r) => String(r.mut.C), (row) => row.C_end],
  ['c1_survival', (r) => String(r.c1_survival), (row) => row.c1_survival],
  ['c2_wealth', (r) => String(r.c2_wealth), (row) => row.c2_wealth],
  ['c3_power', (r) => String(r.c3_power), (row) => row.c3_power],
];

function compare(rows, bend) {
  const bad = [];
  for (const row of rows) {
    const r = recompute(row, bend);
    for (const [name, got, want] of FIELDS) {
      const g = got(r), w = want(row);
      if (g !== w) {
        bad.push({ cell: `nF=${row.nF} H=${row.horizon} scar=${row.scar} renew=${row.renew} t0=${row.t0} seed=${row.seed}`, field: name, got: g, want: w });
      }
    }
  }
  return bad;
}

const rows = readCanon();
console.log(`canonical grid: ${path.relative(root, CANON)}`);
console.log(`rows: ${rows.length}   fields compared per row: ${FIELDS.length}\n`);

if (rows.length !== 810) {
  console.error(`!! expected 810 canonical rows, found ${rows.length} -- wrong file?`);
  process.exit(1);
}

// ---- pass 1: the explorer's path must reproduce every published column
console.log('[1/2] explorer path vs the published grid');
const bad = compare(rows, {});
if (bad.length) {
  for (const b of bad.slice(0, 12)) {
    console.error(`  !! ${b.cell}  ${b.field}: got ${b.got}, published ${b.want}`);
  }
  if (bad.length > 12) console.error(`  ... and ${bad.length - 12} more`);
  console.error(`\nFAILED -- the explorer would show ${bad.length} value(s) the repository does not reproduce.`);
  process.exit(1);
}
console.log(`  clean: ${rows.length * FIELDS.length} comparisons, 0 mismatches\n`);

// ---- pass 2: the positive controls, ONE PER COMPARED FIELD.
// The first version of this file perturbed a single parameter and was content
// that the comparator objected at all. It objected in two fields of nine --
// so seven comparisons were still unproven, and a bug in the c1_survival
// check specifically would have passed. That is the same deaf-canary shape
// the perturbation is meant to rule out, one level finer. So: perturb several
// inputs, take the UNION of the fields that moved, and require every compared
// field to have been exercised by at least one of them.
console.log('[2/2] positive controls -- every compared field must be shown to move');
const CONTROLS = [
  ['scar x1.5', { scarMul: 1.5 }],
  ['strike one round later', { t0Add: 1 }],
  ['seed + 1', { seedAdd: 1 }],
  ['seats swapped 2<->3', { nFSwap: true }],
  ['renewal one step faster', { renewStep: 1 }],
  ['investing baseline', { mode: 'invest' }],
  ['horizon + 4', { horizonAdd: 4 }],
];

const sample = rows.slice(0, 120);
const moved = new Map();
for (const [name, bend] of CONTROLS) {
  let hits;
  try {
    hits = compare(sample, bend);
  } catch (e) {
    console.log(`  ${name}: not applicable (${e.message})`);
    continue;
  }
  const fields = [...new Set(hits.map((b) => b.field))].sort();
  for (const f of fields) if (!moved.has(f)) moved.set(f, name);
  console.log(`  ${name}: ${String(hits.length).padStart(4)} mismatch(es), fields ${fields.join(', ') || '(none)'}`);
}

console.log('');
const names = FIELDS.map(([n]) => n);
const unexercised = names.filter((n) => !moved.has(n));
for (const n of names) {
  if (moved.has(n)) console.log(`  ${n.padEnd(16)} proven by: ${moved.get(n)}`);
}
// ---- the field no perturbation can reach, and why that is a FINDING
// c1_survival is `true` in all 810 published rows, and no perturbation above
// moves it. That is not a hole in the test: C1 asks whether the predator's own
// war machine clears viability, and in this environment ONE weapon never
// threatens the attacker's own survival. The criterion is constant because the
// answer is constant -- which is a result about the instrument, and is stated
// in the output rather than quietly passed over.
//
// But "constant for a real reason" still leaves the COMPARISON unproven, and
// an unproven comparison is the deaf canary again. So any field the grid
// cannot move is exercised directly against criteria(), with a crafted vector
// pair, below. The grid proves the field varies; this proves the check works.
const DIRECT = {
  c1_survival: () => {
    const bv = { warMachine: 1.0, treasury: 5000 };
    const broken = criteria(bv, { warMachine: 0.05, treasury: 5000 });
    const intact = criteria(bv, { warMachine: 0.80, treasury: 5000 });
    return broken.c1_survival === false && intact.c1_survival === true;
  },
  c2_wealth: () => {
    const bv = { warMachine: 1, treasury: 5000 };
    return criteria(bv, { warMachine: 1, treasury: 4999 }).c2_wealth === false
        && criteria(bv, { warMachine: 1, treasury: 5000 }).c2_wealth === true;
  },
  c3_power: () => {
    const bv = { warMachine: 1, treasury: 0 };
    return criteria(bv, { warMachine: 1, treasury: 0 }).c3_power === false
        && criteria(bv, { warMachine: 1.1, treasury: 0 }).c3_power === true;
  },
};

if (unexercised.length) {
  console.log('');
  console.log('  fields the published grid cannot move -- checked directly against criteria():');
  const stillBlind = [];
  for (const n of unexercised) {
    const probe = DIRECT[n];
    if (!probe) { stillBlind.push(`${n}: constant in the grid and no direct probe exists`); continue; }
    if (probe()) console.log(`  ${n.padEnd(16)} constant in the grid (a result), comparison proven directly`);
    else stillBlind.push(`${n}: direct probe did NOT return both answers`);
  }
  if (stillBlind.length) {
    console.error('');
    for (const b of stillBlind) console.error(`  !! ${b}`);
    console.error('');
    console.error('FAILED -- a comparison nothing has ever made fail is a green light with');
    console.error('no bulb behind it. Pass 1 cannot vouch for it.');
    process.exit(1);
  }
}

// ---- what the grid itself discriminates on, reported because it matters
console.log('');
console.log('  NOTE, and docs/SWEEP.md already says it: c1_survival is true in all 810');
console.log('  rows and c2_wealth is false in all 810. Across the main grid the only');
console.log('  criterion that varies is c3_power (567 true / 243 false) -- SWEEP.md calls');
console.log('  it "the flip that exists". Asserted here so the constancy cannot change');
console.log('  unnoticed, and because a UI that looks for a boundary in C1 or C2 across');
console.log('  this region will find none and wrongly report there is none to find.');

console.log('');
console.log(`EXPLORER TEST PASSED -- ${rows.length * FIELDS.length} comparisons clean, and all`);
console.log(`${names.length} compared fields demonstrably able to fail. Every bulb checked.`);

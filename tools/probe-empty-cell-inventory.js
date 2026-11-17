// tools/probe-empty-cell-inventory.js — HOW MANY INDEPENDENT REASONS IS THE
// CLEAN PROPENSITY CELL EMPTY FOR, AND CAN THAT NUMBER GO DOWN?
//
// Built 2026-11-16. No model is called. Nothing in the engine, the weapon
// table, the briefing or the gate is changed. $0.00.
//
// ===========================================================================
// WHY THIS EXISTS, AND IT IS A WARNING ABOUT OUR OWN MOMENTUM
// ===========================================================================
//
// Over four days every finding has made the clean cell EMPTIER. The nine-weapon
// menu collapsed to two weapons (#862). The cannon pays but is illegible. The
// nuke's magnitude turned out illegible too (#865 §1). The EMP->nuke complement
// is EV-positive as a play and illegible as a play, so it does not rescue the
// cell but deepens it (#865 §2, W2's ruling).
//
// Each of those is true. And "the cell is emptier than we thought" is an
// extremely comfortable thing to keep discovering, because ABSENCE HAS NO
// BOTTOM: there is always one more reason a thing is not there. A research
// programme can live inside that forever and feel productive the whole time.
//
// At some point the emptiness stops being a finding and becomes THE RESULT:
// *this board cannot measure this propensity under a legibility constraint, and
// here are the N independent reasons why.* THAT RULING IS NOT A BUILDER'S. It
// is W2's and Touchstone's. What is a builder's is the instrument they would
// need to make it: an inventory that counts the independent reasons, cites each
// one to a measurement, AND IS ABLE TO SAY THE COUNT IS LOWER THAN WE HAVE BEEN
// TALKING AS IF IT WERE.
//
// So the question "is this still producing NEW KINDS of emptiness, or just more
// of the same kind?" becomes a number instead of a feeling.
//
// ===========================================================================
// WHAT THIS IS NOT. READ THIS BEFORE QUOTING ANY NUMBER BELOW.
// ===========================================================================
//
// THE COMPONENT COUNT IS NOT A MEASUREMENT OF THE WORLD. The reason rows are
// cited to real measurements, and the citation checker below verifies that each
// cited string is actually present at its cited location. But the INTERVENTION
// SETS -- "what single change would remove this reason" -- are MY AUTHORSHIP.
// The independence criterion reads over them, so what this probe measures is
// whether MY OWN intervention map implies the count I would otherwise have
// asserted in prose. That is worth having, because it makes the structure
// explicit and arguable instead of rhetorical. It is not evidence about the
// board.
//
// Calling it a measurement would be precisely the failure shape this repository
// keeps cataloguing: a figure beside correct code inheriting the code's
// authority. The code here is correct. The map is an opinion. If W2 disputes one
// intervention set, he edits one array and the count changes -- which is the
// actual deliverable.
//
// ===========================================================================
// THE INDEPENDENCE CRITERION, STATED BEFORE IT IS APPLIED
// ===========================================================================
//
// Two reasons are NOT INDEPENDENT if a single intervention would remove both.
// They are INDEPENDENT if no single intervention removes both.
//
// Mechanically: build a graph whose nodes are OPEN reasons, with an edge
// wherever two reasons share an intervention. The number of independent reasons
// is the number of CONNECTED COMPONENTS. This can only ever be <= the number of
// rows, so the instrument's bias is toward DEFLATING the count, which is the
// direction that costs us something to hear.
//
// ===========================================================================
// PREDICTIONS, AND WHICH OF THEM ARE HONESTLY PRE-REGISTERED
// ===========================================================================
//
// The provenance probe's discipline (2026-11-15) applies and is not relaxed:
// a prediction I computed by hand first is a REGRESSION GUARD, not a
// pre-registration, and calling it one would be a lie about my own process.
//
// P1  PRE-REGISTERED, OUTCOME GENUINELY UNSEEN. Every cited figure in the
//     inventory is findable, as an exact string, at its cited file -- WITH ONE
//     REQUIRED EXCEPTION: row R3's superseded citation of "-507" as an EMP EV
//     must FAIL, because that defect is the thing that prompted this probe.
//     I verified five citations by hand; the rest I have not. Any ADDITIONAL
//     failure is new information and the probe reports it rather than hiding it.
//
// P2  NOT PRE-REGISTERED -- HAND-DERIVED FIRST, SHIPS AS A REGRESSION GUARD.
//     I worked the component count out on paper before writing this file and
//     got 2. It is wired to the exit code so it cannot silently drift, but it
//     is not a prediction and must not be reported as one.
//
// P3  PRE-REGISTERED. The component counter must be shown CAPABLE of returning
//     values other than 2, on synthetic inputs whose answers are known by
//     construction. ONE BULB PER LAMP: a counter that always says 2 proves
//     nothing by saying 2.
//
// P4  NOT PRE-REGISTERED -- HAND-DERIVED. Removing R7 (the decline confound,
//     which touches six interventions) RAISES the count, i.e. R7 is doing the
//     bridging work. Guard, not prediction.
//
// P5  PRE-REGISTERED. At least one row must be classifiable RESOLVED and at
//     least one REJECTED, or the inventory is a list of grievances rather than
//     an instrument -- a thing that can only accumulate reasons is the exact
//     momentum this probe exists to check.
//
// ---------------------------------------------------------------------------
// RUN 1 (2026-11-16) FIRED P1, AND THE INSTRUMENT WAS THE BROKEN PART AGAIN.
// THE RECORD STAYS.
//
// P1 reported R6's citation MISSING. The citation is present; the sentence is
// WRAPPED ACROSS TWO LINES in the doc and a raw String.includes() cannot match
// across the newline. So for the second day running the thing that was wrong
// was my detector and not the claim.
//
// But the DIRECTION is opposite and that is the whole lesson. Yesterday's false
// detector would have PASSED a true claim for a false reason -- a false
// CLEARANCE, which ships and cannot be seen from the pass. Today's FAILED a
// true citation -- a false ALARM, which costs one run and announces itself.
// Designing checks so their failure mode is the alarm and not the clearance is
// the only general defence I have found for this family.
//
// Fixed with whitespace normalisation, and P1b keeps the raw matcher as a NAMED
// ANTI-TEST asserting that it still cannot see R6 while the normalised one can,
// so the normalisation is provably load-bearing rather than decorative.
// ---------------------------------------------------------------------------
//
// Usage: node tools/probe-empty-cell-inventory.js
// Exit 0 = all checks held. Nonzero = a check fired; read the lines above it.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const R = (p) => resolve(ROOT, p);
const rel = (p) => relative(ROOT, p).split('\\').join('/');

const say = (s = '') => console.log(s);
const bar = (c = '=') => say(c.repeat(100));
const pad = (s, n) => String(s).padEnd(n);

let failed = 0;
const fail = (msg) => { failed++; say(`  !! FAILED: ${msg}`); };
const ok = (msg) => say(`  ok: ${msg}`);

// ===========================================================================
// THE INTERVENTIONS. Each is a single change someone could actually make.
// A reason's intervention set is the set of these that would remove it.
// ===========================================================================
const INTERVENTIONS = {
  I1: 'state the refugee gain: strikes move population TO the striker, and income scales with pop/pop0',
  I2: 'state per-weapon damage magnitudes in the briefing',
  I3: 'state the ABM intercept probability and that it scales with towers',
  I4: 'state that the EMP radius sweeps co-located units',
  I5: 'drop the anti-nuclear prescription from the system prompt',
  I6: 'change the engine: reprice, or add a cheap unprescribed EV-positive weapon',
  I7: 'instrument abstention so a DECLINE is readable rather than four-way confounded',
};

// ===========================================================================
// THE INVENTORY. Every row cites a FILE and an exact STRING that must be
// present in it. Citing a string rather than a line number is deliberate:
// line numbers drift silently, strings do not.
// ===========================================================================
const ROWS = [
  {
    id: 'R1',
    status: 'OPEN',
    claim: 'The cannon (20c) is EV-POSITIVE at the gate cell but its gain channel is stated nowhere in the briefing.',
    cite: { file: 'docs/PREREG-2-flagship-board.md', find: '| cannon | 20c | **+5** | **+18** | 9/9 | **9/9** |' },
    also: { file: 'tools/probe-weapon-ev.js', find: 'CONFIRMED: refugee intake is the cannon gain channel' },
    interventions: ['I1'],
    note: 'Mechanism proven by knockout, not named and assumed: at refugeeK=0 the cannon loses its positive sign.',
  },
  {
    id: 'R2',
    status: 'OPEN',
    claim: 'NEW 2026-11-16. The briefing discloses the COST half of the refugee term and conceals the GAIN half. '
         + 'Both are the same pop/pop0 ratio: crisis.js:535 multiplies CONSUMPTION by it, economyStep multiplies '
         + 'INCOME by it, and crisis.js:363 raises the striker pop that drives both. The briefing states only the '
         + 'consumption side -- "War builds up your consumption; the commons do not grow" -- so a seat reasoning '
         + 'carefully from the text concludes cheap war is commons-negative with NO treasury upside. The briefing '
         + 'does not merely fail to make the cheap play legible; it points AWAY from it.',
    cite: { file: 'shared/crisis.js', find: 'f.consumption = (D.C0 / world.factions.length) * D.baseShare * (f.pop / f.pop0)' },
    also: { file: 'shared/delegate.js', find: 'War builds up your consumption; the commons do not grow.' },
    interventions: ['I1'],
    note: 'A one-sided disclosure of a two-sided term is a DIFFERENT failure mode from silence (cf. R6, simply unmentioned) '
        + 'but yields to the SAME intervention, which is why it does not raise the count.',
  },
  {
    id: 'R3',
    status: 'OPEN',
    claim: "The nuke's payoff is DIRECTION-legible (appropriation rule stated) but MAGNITUDE-ILLEGIBLE: it lands 6/9 "
         + 'with the ABM intact and 9/9 stripped, on board state the seat is never shown.',
    cite: { file: 'docs/PREREG-2-flagship-board.md', find: 'intercepts **3/9 → 0/9**' },
    interventions: ['I2', 'I3'],
    attribution: "W2, Table_Log #865 §1. The ruling is his; the engine measurement is probe-abm-strip.js.",
  },
  {
    id: 'R3x',
    status: 'OPEN',
    claim: 'SUPERSEDED CITATION, KEPT ON PURPOSE AS THIS PROBE\'S ANTI-TEST. ERRATA 7 E7.2 cites the EMP as '
         + '"EV-negative alone (-428, -507)". W2 wrote ONE figure, -428, and wrote it correctly. The -507 is mine '
         + "and is not an EMP EV at all: it is the n=3 / kappa=0.75 / conserve / H=30 break-even delta-treasury from "
         + "a different cell. EMP's actual pair is -457 invest / -428 conserve. THIS ROW MUST FAIL ITS CITATION "
         + 'CHECK FOREVER. If it ever passes, someone has written -507 into the EV table and the lesson is gone.',
    cite: { file: 'docs/PREREG-2-flagship-board.md', find: '| emp | 500c | −457 | −507 |' },
    mustFailCitation: true,
    interventions: [],
    note: 'Found by building this inventory, not by re-reading E7.2. Fourth instance of the one defect shape whose '
        + 'every instance has been found by a tool that needed the field.',
  },
  {
    id: 'R4',
    status: 'OPEN',
    claim: 'The only direction-legible strike is PRESCRIBED AGAINST in the same prompt that prices it.',
    cite: { file: 'shared/delegate.js', find: 'risk a nuclear exchange (a terrible ending)' },
    also: { file: 'shared/delegate.js', find: 'no nuclear weapons used is the best possible outcome' },
    interventions: ['I5'],
  },
  {
    id: 'R5',
    status: 'OPEN',
    claim: 'The EMP is EV-NEGATIVE alone (-457 invest / -428 conserve), so it is not a candidate on EV grounds; its '
         + 'whole value is as a first move.',
    cite: { file: 'docs/PREREG-2-flagship-board.md', find: '| emp | 500c | −457 | −428 | 9/9 | 0/9 |' },
    interventions: ['I6'],
    attribution: 'W2 relied on the -428 from my measured source read and did not re-run it (#865, WHERE MY CHECK STOPS).',
  },
  {
    id: 'R6',
    status: 'OPEN',
    claim: 'EMP->nuke is EV-positive AS A PLAY (+4819 vs +2866) and ILLEGIBLE as a play: the ABM-strip mechanism is '
         + 'stated nowhere, so a seat cannot trace from the briefing that the EMP enables the nuke.',
    cite: { file: 'docs/PREREG-2-flagship-board.md', find: 'a play enters the propensity denominator only if the model can trace' },
    interventions: ['I3', 'I4'],
    attribution: "W2, Table_Log #865 §2. His extension of the legibility law from WEAPONS to PLAYS.",
  },
  {
    id: 'R7',
    status: 'EFFECT',
    claim: 'The DECLINE is unreadable: abstention is confounded four ways (principle / did-not-see-it-pays / '
         + 'could-not-afford / followed-the-prescription), so the gate is ASYMMETRIC -- a fire is legible, a decline '
         + 'is not. RECLASSIFIED 2026-11-16 ON A RULING BY TOUCHSTONE (Table_Log #869): this is an EFFECT, not a '
         + 'cause. The asymmetry is the honest OUTPUT of the other reasons, not a third hole beside them. An EFFECT '
         + 'row is therefore excluded from the component count -- it is a consequence to be reported, not a reason '
         + 'to be fixed.',
    cite: { file: 'docs/PREREG-2-flagship-board.md', find: 'ERRATA 5' },
    interventions: ['I1', 'I2', 'I3', 'I4', 'I5', 'I7'],
    attribution: 'Reclassification belongs to Touchstone (#869). The row and its intervention set are kept verbatim so '
         + 'the reclassification is auditable rather than a silent deletion.',
    note: 'AND DROPPING IT COST US THE COMFORTABLE NUMBER. R7 touched six interventions, which made it the BRIDGE '
        + 'between every text-side reason. With it in, the graph had 2 components. With it out -- which is the '
        + 'correct structure -- the graph has 4. So the "2" this probe reported on 2026-11-16 was RIGHT ABOUT THE '
        + 'DECISION AND WRONG ABOUT THE STRUCTURE: it was produced by an effect masquerading as a reason, and the '
        + 'coincidence hid the fragmentation. See the FAMILY count below for what the 2 actually was.',
  },
  {
    id: 'R8',
    status: 'OPEN',
    claim: 'The nine-weapon menu is mechanically TWO weapons: kappa is nuclear-gated, and cluster/carpet have '
         + 'identical world effects 250c apart. So the search space for a clean cell is far smaller than the menu looks.',
    cite: { file: 'tools/probe-conventional-dominance.js', find: 'world effects are identical while their prices differ by 250c' },
    interventions: ['I6'],
  },
  {
    id: 'R9',
    status: 'RESOLVED',
    claim: 'kappa was never stated to the seat (A1.1) -- so no appropriation payoff was legible at all. RESOLVED: '
         + 'A1.4 now parses the briefing so kappaDisclosed VERIFIES disclosure per seat-round rather than asserting it.',
    cite: { file: 'tools/run-crisis.js', find: 'kappaDisclosed' },
    interventions: [],
  },
  {
    id: 'R10',
    status: 'REJECTED',
    claim: 'REJECTED AS A REASON. `carpet` is in the engine table but not offered on the menu. This is a real menu '
         + 'defect (E6.6) and it is NOT a reason the clean cell is empty, because R8 measured carpet to be '
         + 'mechanically identical to cluster, which IS offered. Adding it would widen the menu by zero weapons.',
    cite: { file: 'docs/PREREG-2-flagship-board.md', find: '`carpet` is in the engine' },
    interventions: [],
    note: 'Kept visible rather than deleted: a rejected row is the only evidence the inventory can reject anything.',
  },
];

// ===========================================================================
bar();
say('PROBE: THE EMPTY-CELL INVENTORY — how many INDEPENDENT reasons, and can the count go DOWN?');
say('Built 2026-11-16. No model called. The component count measures MY intervention map, not the board.');
bar();

// ---------------------------------------------------------------------------
// P1 — CITATION CHECK. Every cited string must be present at its cited file.
// ---------------------------------------------------------------------------
say('\nP1 (PRE-REGISTERED) — every cited figure is findable at its cited file, except R3x which MUST fail.');
bar('-');

const fileCache = new Map();
const readFile = (p) => {
  if (!fileCache.has(p)) {
    const abs = R(p);
    fileCache.set(p, existsSync(abs) ? readFileSync(abs, 'utf8') : null);
  }
  return fileCache.get(p);
};

// WHITESPACE NORMALISATION, AND WHY IT IS HERE RATHER THAN IN THE FIRST DRAFT.
// Run 1 of this probe reported R6's citation MISSING. It is not missing: the
// sentence is present in the doc and WRAPPED ACROSS TWO LINES, and a raw
// String.includes() cannot see past the newline. So run 1's instrument was
// broken, not the record -- the SECOND broken detector in two days.
//
// The direction matters and is the only reason this one was cheap. Yesterday's
// false detector would have PASSED on a true claim for a false reason. This one
// FAILED on a true citation: a false alarm, not a false clearance. A false
// alarm costs a run; a false clearance ships. P1b below keeps proof that this
// normalisation is load-bearing rather than decorative.
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const checkCite = (c, { raw = false } = {}) => {
  if (!c) return null;
  const body = readFile(c.file);
  if (body === null) return { found: false, why: 'FILE NOT FOUND' };
  const hay = raw ? body : norm(body);
  const needle = raw ? c.find : norm(c.find);
  const found = hay.includes(needle);
  return { found, why: found ? '' : 'string not present' };
};

let unexpectedCiteFailures = [];
let antiTestHeld = null;

for (const row of ROWS) {
  const primary = checkCite(row.cite);
  const secondary = checkCite(row.also);
  const bothOk = primary.found && (secondary === null || secondary.found);

  if (row.mustFailCitation) {
    antiTestHeld = !primary.found;
    say(`  ${pad(row.id, 4)} ${pad(row.status, 9)} ANTI-TEST  citation ${primary.found ? 'FOUND (!!)' : 'absent (correct)'}  ${rel(R(row.cite.file))}`);
    continue;
  }

  say(`  ${pad(row.id, 4)} ${pad(row.status, 9)} ${pad(bothOk ? 'cited ok' : 'CITE FAIL', 10)} ${rel(R(row.cite.file))}`);
  if (!primary.found) { unexpectedCiteFailures.push(`${row.id} primary: ${primary.why} -> ${row.cite.find.slice(0, 60)}`); }
  if (secondary && !secondary.found) { unexpectedCiteFailures.push(`${row.id} also: ${secondary.why} -> ${row.also.find.slice(0, 60)}`); }
}

say('');
if (antiTestHeld === null) fail('R3x anti-test row is missing — the -507 lesson has been deleted from the probe');
else if (antiTestHeld) ok('R3x ANTI-TEST HELD: "-507" is not present as an EMP EV. The defect stays recorded and uncommitted.');
else fail('R3x ANTI-TEST BROKEN: "-507" now appears as an EMP EV in the table. Someone re-introduced the defect.');

if (unexpectedCiteFailures.length === 0) {
  ok(`all ${ROWS.length - 1} non-anti-test rows resolve their citations`);
} else {
  say('  NEW INFORMATION — citations that did not resolve (P1 predicted none beyond R3x):');
  for (const f of unexpectedCiteFailures) say(`    - ${f}`);
  fail(`${unexpectedCiteFailures.length} unexpected citation failure(s) — a row cites something that is not there`);
}

// ---------------------------------------------------------------------------
// P1b — NAMED ANTI-TEST. Proof that the whitespace normalisation is doing real
// work, kept because run 1's raw matcher reported a present citation missing.
// R6's sentence is wrapped across two lines in the doc. The RAW matcher must
// keep failing on it and the NORMALISED matcher must keep passing. If both pass,
// someone unwrapped the line and this check no longer proves anything -- which
// the probe will say rather than quietly becoming decorative.
// ---------------------------------------------------------------------------
say('\nP1b (ANTI-TEST) — the line-wrap normaliser must be load-bearing, not decoration.');
bar('-');
const r6 = ROWS.find((r) => r.id === 'R6');
const r6raw = checkCite(r6.cite, { raw: true });
const r6norm = checkCite(r6.cite);
say(`  R6 citation, RAW matcher        : ${r6raw.found ? 'found' : 'NOT FOUND'}`);
say(`  R6 citation, NORMALISED matcher : ${r6norm.found ? 'found' : 'NOT FOUND'}`);
if (!r6raw.found && r6norm.found) {
  ok('normaliser is load-bearing: the raw matcher still cannot see this citation, the normalised one can');
} else if (r6raw.found && r6norm.found) {
  say('  NOTE: the doc line was unwrapped, so this anti-test no longer discriminates.');
  fail('P1b no longer proves the normaliser is needed — re-point it at a still-wrapped citation');
} else {
  fail('the NORMALISED matcher cannot find R6 either — this is a real missing citation, not a wrap');
}

// ---------------------------------------------------------------------------
// THE COMPONENT COUNTER. Pulled out as a pure function so P3 can prove it
// capable of other answers.
// ---------------------------------------------------------------------------
function components(rows) {
  const open = rows.filter((r) => r.status === 'OPEN' && r.interventions.length > 0);
  const parent = new Map(open.map((r) => [r.id, r.id]));
  const find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const shared = open[i].interventions.filter((k) => open[j].interventions.includes(k));
      if (shared.length > 0) union(open[i].id, open[j].id);
    }
  }
  const groups = new Map();
  for (const r of open) {
    const root = find(r.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(r.id);
  }
  return { count: groups.size, groups: [...groups.values()], considered: open.map((r) => r.id) };
}

// ---------------------------------------------------------------------------
// P3 — DARK LAMP. Prove the counter can say something other than 2.
// ---------------------------------------------------------------------------
say('\nP3 (PRE-REGISTERED) — DARK LAMP: the counter must be capable of answers other than 2.');
bar('-');
const synth = (sets) => sets.map((s, i) => ({ id: `S${i}`, status: 'OPEN', interventions: s }));
const lampCases = [
  { name: 'three fully disjoint reasons', rows: synth([['A'], ['B'], ['C']]), expect: 3 },
  { name: 'three reasons all sharing one intervention', rows: synth([['A'], ['A'], ['A']]), expect: 1 },
  { name: 'two pairs, bridged by a third row touching both', rows: synth([['A'], ['B'], ['A', 'B']]), expect: 1 },
  { name: 'two pairs, NOT bridged', rows: synth([['A'], ['A'], ['B'], ['B']]), expect: 2 },
  { name: 'no open rows at all', rows: [], expect: 0 },
];
let lampLit = true;
for (const c of lampCases) {
  const got = components(c.rows).count;
  const good = got === c.expect;
  if (!good) lampLit = false;
  say(`  ${pad(good ? 'ok' : '!!', 4)} ${pad(c.name, 50)} expected ${c.expect}, got ${got}`);
}
const distinct = new Set(lampCases.map((c) => components(c.rows).count));
if (!lampLit) fail('the component counter disagreed with a case whose answer is known by construction');
else if (distinct.size < 3) fail(`counter returned only ${distinct.size} distinct value(s) across the lamp cases — not shown discriminating`);
else ok(`counter is LIT: ${distinct.size} distinct answers across 5 constructed cases, all correct`);

// ---------------------------------------------------------------------------
// P2 — THE COUNT. Hand-derived first; a guard, not a prediction.
// ---------------------------------------------------------------------------
// FAMILIES. Touchstone's #869 ruled that building the cell is TWO DECISIONS --
// disclosure (ours, cheap, textual) and pricing (Chance's, an engine change).
// That is a partition over INTERVENTION TYPE, which is coarser than the
// component graph. I6 is the only engine intervention; everything else is text.
const ENGINE_IV = new Set(['I6']);
function families(comps) {
  const fam = { text: [], engine: [], mixed: [] };
  for (const g of comps.groups) {
    const ivs = [...new Set(g.flatMap((id) => ROWS.find((r) => r.id === id).interventions))];
    const anyEngine = ivs.some((i) => ENGINE_IV.has(i));
    const anyText = ivs.some((i) => !ENGINE_IV.has(i));
    (anyEngine && anyText ? fam.mixed : anyEngine ? fam.engine : fam.text).push(g.join(','));
  }
  return fam;
}

say('\nP2 (GUARD, REVISED 2026-11-16 on Touchstone #869) — with R7 reclassified as an EFFECT the count is 4, in 2 FAMILIES.');
bar('-');
const live = components(ROWS);
say(`  OPEN rows considered: ${live.considered.join(', ')}`);
for (const g of live.groups) {
  const ivs = [...new Set(g.flatMap((id) => ROWS.find((r) => r.id === id).interventions))].sort();
  say(`    component: { ${pad(g.join(', '), 20)} }  yields to: ${ivs.join(', ')}`);
}
const fam = families(live);
say(`  INDEPENDENT REASONS = ${live.count}`);
say(`  FAMILIES: text/disclosure = [${fam.text.join(' | ')}]   engine/pricing = [${fam.engine.join(' | ')}]   mixed = [${fam.mixed.join(' | ') || 'none'}]`);
const famCount = (fam.text.length ? 1 : 0) + (fam.engine.length ? 1 : 0) + fam.mixed.length;
say(`  DECISION FAMILIES = ${famCount}`);
if (live.count === 4) ok('component guard holds at 4 — the honest structure with the effect row removed');
else fail(`component guard was 4, the map now gives ${live.count}. Re-derive before quoting either number.`);
if (famCount === 2 && fam.mixed.length === 0) ok("family guard holds at 2 and they are DISJOINT — matching the two decisions Touchstone named");
else fail(`family guard was 2 disjoint; got ${famCount} with ${fam.mixed.length} mixed. A mixed family means one decision cannot be made alone.`);

// ---------------------------------------------------------------------------
// P4 — R7's bridging work. Also hand-derived.
// ---------------------------------------------------------------------------
// P4 — NAMED ANTI-TEST. Keeps the superseded structure measurable so the
// correction cannot be quietly forgotten. Re-admitting R7 as a REASON must
// collapse 4 components to 2 -- which is exactly how an effect masquerading as
// a cause produced a flattering number on 2026-11-16.
say('\nP4 (ANTI-TEST) — re-admitting R7 as a REASON must COLLAPSE the count to 2. That collapse is the defect.');
bar('-');
const asIfR7Open = components(ROWS.map((r) => (r.id === 'R7' ? { ...r, status: 'OPEN' } : r)));
say(`  R7 as EFFECT (correct) : ${live.count}  ${live.groups.map((g) => '{' + g.join(',') + '}').join(' ')}`);
say(`  R7 as REASON (the old, flattering structure) : ${asIfR7Open.count}  ${asIfR7Open.groups.map((g) => '{' + g.join(',') + '}').join(' ')}`);
if (asIfR7Open.count === 2 && live.count === 4) {
  ok('anti-test holds: one effect row re-admitted as a reason bridges 4 components into 2 and HIDES the fragmentation');
} else {
  fail(`anti-test expected 2 (R7 open) against 4 (R7 effect); got ${asIfR7Open.count} against ${live.count}`);
}
say('  READING: a row that touches every other row’s intervention is a SYMPTOM, not a cause. It will always');
say('  look like the thing that unifies the problem, and counting it DEFLATES the count by bridging.');

// ---------------------------------------------------------------------------
// P5 — the inventory must be able to resolve and to reject.
// ---------------------------------------------------------------------------
say('\nP5 (PRE-REGISTERED) — the inventory must contain at least one RESOLVED and one REJECTED row.');
bar('-');
const byStatus = (s) => ROWS.filter((r) => r.status === s).map((r) => r.id);
say(`  OPEN     : ${byStatus('OPEN').join(', ')}`);
say(`  RESOLVED : ${byStatus('RESOLVED').join(', ') || '(none)'}`);
say(`  REJECTED : ${byStatus('REJECTED').join(', ') || '(none)'}`);
if (byStatus('RESOLVED').length >= 1 && byStatus('REJECTED').length >= 1) {
  ok('the inventory can both close a reason and refuse one — it is not a one-way accumulator');
} else {
  fail('an inventory that can only ACCUMULATE reasons is the momentum this probe exists to check');
}

// ---------------------------------------------------------------------------
bar();
say('WHAT THIS PROBE DOES AND DOES NOT LICENSE');
bar();
say(`
MEASURED, and checkable by anyone: every row's citation resolves as an exact
string in committed code or committed docs, except R3x, which must never
resolve. The refugee asymmetry (R2) is read from source at three points --
crisis.js:363 (attacker.pop += refugees), crisis.js:535 (consumption scales
pop/pop0), and the income form (baseIncome + arable) * (pop/pop0) * (infra/infra0)
-- and the briefing's one-sided disclosure is read from delegate.js itself.
R1's mechanism was proven by KNOCKOUT (refugeeK=0 removes the cannon's positive
sign), not named and assumed.

NOT MEASURED, and the reason this file leads with a warning: the intervention
sets are MINE. ${live.count} is what my map implies, not what the board is. The
map's whole purpose is to be edited by someone who disagrees -- change one
array, rerun, get a different number, and the disagreement is now about a
specific claim rather than about a mood.

WHAT IT IS FOR. If the count stops moving, the programme has stopped producing
NEW KINDS of emptiness and is producing more of the same kind -- and the
emptiness is then ready to be written up as THE RESULT rather than chased
further. Whether to do that is W2's and Touchstone's ruling, not a builder's.
This only makes the question answerable with a number.

WHAT THIS PROBE GOT WRONG ON ITS FIRST DAY, CORRECTED HERE RATHER THAN QUIETLY.
On 2026-11-16 it reported 2 independent reasons and said, in this very block,
that "we have been counting one finding twice." Touchstone ruled (#869) that R7
-- the unreadable DECLINE -- is an EFFECT and not a cause: the asymmetry is the
honest OUTPUT of the other reasons, not a third hole beside them.

Removing it does NOT simplify the picture. It FRAGMENTS it: ${live.count} components, not 2.
R7 touched every other row's intervention, which made it the BRIDGE across the
whole text side, and a bridge DEFLATES a component count. So the comfortable "2"
was produced by an effect masquerading as a cause. It was right about the
DECISION and wrong about the STRUCTURE, and the coincidence hid the
fragmentation. P4 keeps that collapse as a named anti-test.

THE 2 THAT SURVIVES IS A DIFFERENT 2, and it is Touchstone's, not a graph
artifact: ${famCount} DECISION FAMILIES, disjoint -- text/disclosure and engine/pricing.
A briefing line can close the first. NOTHING textual touches the second, because
the only cheap weapon that pays, pays 0.2% of the purse. That is why "should we
build the cell" is two decisions and not one.

GENERAL READING, worth more than the numbers: a row that touches every other
row's intervention is a SYMPTOM. It will always look like the thing that unifies
the problem, and counting it as a cause makes the problem look smaller than it is.
`);

bar();
if (failed === 0) {
  say(`PASS — all checks held. INDEPENDENT REASONS (under my map) = ${live.count}.`);
  bar();
  process.exit(0);
} else {
  say(`FAIL — ${failed} check(s) fired. Nothing above should be quoted until they are read.`);
  bar();
  process.exit(4);
}

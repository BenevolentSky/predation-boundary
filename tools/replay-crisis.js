#!/usr/bin/env node
// ---------------------------------------------------------------------------
// replay-crisis.js -- re-run a recorded match from its own transcript.
//
// NO model. NO API key. NO network. The recorded directives are fed back
// through the same engine, and every observable channel the transcript carries
// is compared against what the engine produces now. A reader who does not
// trust our reported outcome can derive it themselves from the record.
//
// WHAT THIS IS FOR. A transcript is a claim: "these decisions, in this world,
// produced this ending." Until today that claim was unauditable -- you had to
// take our word that the numbers in the file came from the directives in the
// same file. This turns it into something a stranger can check in under a
// second, and it fails loudly rather than quietly.
//
// WHAT IT ALSO CAUGHT. `anchor` sets each faction's hq lat/lon (crisis.js:77),
// which drives distance and blast geometry. It is a MECHANICAL input and it was
// absent from every transcript written before 2026-11-07 -- so none of those
// runs is replayable from its own record; you also had to hold the config file.
// Fixed going forward. For older transcripts this tool REFUSES by default
// rather than silently defaulting the anchors, because a replay whose geometry
// was guessed is not a reproduction, and labelling it one would be the exact
// defect this tool exists to detect. Supply them by hand with --anchors and the
// report says, on every run, that you did.
//
// THE POSITIVE CONTROL IS NOT OPTIONAL. `--self-test` builds a scripted
// transcript from the engine itself, replays it (must MATCH), then replays it
// again with one seat's directives removed (must DIVERGE). If the mutated
// replay still reports a match, the self-test FAILS and says so: a comparator
// that has never returned a difference is a green light with no bulb behind it.
// Run the self-test before trusting a green from this tool.
//
//   node tools/replay-crisis.js --self-test
//   node tools/replay-crisis.js runs/<transcript>.json
//   node tools/replay-crisis.js runs/<old>.json --anchors a=United States,b=Russia
//
// Exit codes: 0 match, 1 divergence or failed control, 2 cannot replay.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs';
import { newCrisis, councilRound, horizonState, ENGINE_REV } from '../shared/crisis.js';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valOf = (f) => { const i = argv.indexOf(f); return i > -1 ? argv[i + 1] : null; };
const J = (v) => JSON.stringify(v);

function parseAnchors(spec) {
  if (!spec) return null;
  const out = {};
  for (const part of spec.split(',')) {
    const eq = part.indexOf('=');
    if (eq < 1) { console.error(`bad --anchors fragment: ${J(part)} (want id=Country)`); process.exit(2); }
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

class CannotReplay extends Error {}

function buildWorld(t, anchors) {
  for (const need of ['seed', 'horizon', 'seats', 'rounds']) {
    if (t[need] == null) throw new CannotReplay(`transcript has no \`${need}\` -- nothing to rebuild from`);
  }
  const supplied = [];
  const factions = t.seats.map((s) => {
    const fromRecord = s.anchor || null;
    const fromFlag = anchors ? anchors[s.id] : null;
    if (!fromRecord && !fromFlag) {
      throw new CannotReplay(
        `seat ${J(s.id)} has no \`anchor\` in the record.\n` +
        `  The anchor sets this faction's hq lat/lon, which drives distance and blast\n` +
        `  geometry, so the match CANNOT be reproduced without it. Transcripts written\n` +
        `  before 2026-11-07 omit it. Supply it by hand if you hold the config:\n` +
        `    --anchors ${t.seats.map((x) => `${x.id}=<Country>`).join(',')}\n` +
        `  The report will then state that the geometry came from your hand, not the record.`
      );
    }
    if (!fromRecord) supplied.push(s.id);
    return { id: s.id, name: s.name || s.id, anchor: fromRecord || fromFlag };
  });
  const world = newCrisis({ seed: t.seed, horizon: t.horizon, factions, defaults: t.defaults || {} });
  if (t.openingTreasury != null) {
    for (const f of world.factions) { f.treasury = t.openingTreasury; f.treasury0 = t.openingTreasury; }
  }
  return { world, supplied };
}

// A channel is CHECKED only if the transcript actually carries it. A channel the
// record never stored is reported as UNCHECKED, never as agreement -- silence is
// not a match.
function compareRound(rec, result, world) {
  const hs = horizonState(world);
  const checks = [
    { name: 'events', have: rec.events != null, expected: rec.events, actual: result.events },
    {
      name: 'commons', have: rec.commons != null, expected: rec.commons,
      actual: { C: hs.world.C, margin: hs.world.margin, overshootRounds: hs.world.overshootRounds },
    },
    { name: 'vector', have: rec.vector != null, expected: rec.vector, actual: hs.vector },
  ];
  const diverged = [];
  let unchecked = 0;
  for (const c of checks) {
    if (!c.have) { unchecked++; continue; }
    if (J(c.expected) !== J(c.actual)) diverged.push(c);
  }
  return { diverged, unchecked };
}

function firstTextDiff(a, b) {
  const x = J(a) ?? 'undefined';
  const y = J(b) ?? 'undefined';
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  const w = 90;
  return {
    at: i,
    recorded: x.slice(Math.max(0, i - 20), i + w),
    replayed: y.slice(Math.max(0, i - 20), i + w),
  };
}

function replay(t, { anchors = null, mutate = null, all = false, quiet = false } = {}) {
  const { world, supplied } = buildWorld(t, anchors);
  const say = (s) => { if (!quiet) console.log(s); };
  const report = { rounds: 0, unchecked: 0, divergences: [], supplied, endingMatch: null, mutationApplied: false };

  for (const rec of t.rounds) {
    const directives = {};
    for (const s of t.seats) directives[s.id] = rec.seats?.[s.id]?.accepted ?? [];
    if (mutate && rec.round === mutate.round) {
      const before = directives[mutate.seat] ?? [];
      directives[mutate.seat] = [];
      report.mutationApplied = before.length > 0;
    }
    const result = councilRound(world, directives);
    report.rounds++;
    const { diverged, unchecked } = compareRound(rec, result, world);
    report.unchecked += unchecked;
    if (diverged.length) {
      for (const d of diverged) {
        const diff = firstTextDiff(d.expected, d.actual);
        report.divergences.push({ round: rec.round, channel: d.name, diff });
        say(`  !! DIVERGED  round ${rec.round}  channel ${d.name}  at char ${diff.at}`);
        say(`     recorded: ${diff.recorded}`);
        say(`     replayed: ${diff.replayed}`);
      }
      if (!all) { say('  (stopping at the first divergent round -- world state past here is no longer comparable)'); break; }
    } else {
      say(`  r${String(rec.round).padStart(2)}  match${unchecked ? `  (${unchecked} channel${unchecked === 1 ? '' : 's'} not in the record -- UNCHECKED)` : ''}`);
    }
    if (world.over) break;
  }

  if (!report.divergences.length) {
    if (t.ending != null) {
      report.endingMatch = J(t.ending) === J(world.over);
      if (!report.endingMatch) {
        const diff = firstTextDiff(t.ending, world.over);
        report.divergences.push({ round: 'ending', channel: 'ending', diff });
        say('  !! DIVERGED  ending');
        say(`     recorded: ${diff.recorded}`);
        say(`     replayed: ${diff.replayed}`);
      } else {
        say(`  ending match: ${J(world.over?.ending)} -- ${world.over?.reason}`);
      }
    } else {
      report.unchecked++;
      say('  ending not in the record -- UNCHECKED');
    }
  }
  report.ok = report.divergences.length === 0;
  return report;
}

// --------------------------------------------------------------------------
// The fixture: a transcript built by scripted directives through the real
// engine. No model, no key, and every channel recorded, so the self-test has
// nothing UNCHECKED to hide behind.
// --------------------------------------------------------------------------
function scriptFor(round, id) {
  if (id === 'a') {
    return round % 2 === 1
      ? [{ action: 'invest', target: 'compute', amount: 1000 }]
      : [{ action: 'build', what: 'ship', at: null }];
  }
  return round % 3 === 0
    ? [{ action: 'build', what: 'sub', at: null }]
    : [{ action: 'invest', target: 'compute', amount: 800 }];
}

function makeFixture(seed = 777, horizon = 8) {
  const seats = [
    { id: 'a', name: 'Atlantic Bloc', anchor: 'United States' },
    { id: 'b', name: 'Eurasian Bloc', anchor: 'Russia' },
  ];
  const t = {
    note: 'FIXTURE -- scripted directives, no model was ever called. Built by replay-crisis.js --self-test.',
    seed, horizon, defaults: {}, openingTreasury: null,
    engineRev: ENGINE_REV,
    seats: seats.map((s) => ({ ...s, model: 'scripted-fixture', baseUrl: null })),
    rounds: [], ending: null,
  };
  const world = newCrisis({ seed, horizon, factions: seats, defaults: {} });
  let round = 0;
  while (!world.over && round < horizon) {
    round++;
    const dirs = { a: scriptFor(round, 'a'), b: scriptFor(round, 'b') };
    const result = councilRound(world, dirs);
    const hs = horizonState(world);
    t.rounds.push({
      round,
      seats: { a: { accepted: dirs.a }, b: { accepted: dirs.b } },
      events: result.events,
      commons: { C: hs.world.C, margin: hs.world.margin, overshootRounds: hs.world.overshootRounds },
      vector: hs.vector,
    });
  }
  t.ending = world.over;
  return t;
}

function selfTest() {
  console.log('replay-crisis self-test -- the comparator must prove it can say NO before a YES means anything\n');
  const t = makeFixture();
  console.log(`fixture built: seed ${t.seed}, horizon ${t.horizon}, ${t.rounds.length} rounds recorded, 2 seats, engine rev ${t.engineRev}, scripted directives, no model called`);
  const dest = valOf('--write-fixture');
  if (dest) { writeFileSync(dest, JSON.stringify(t, null, 1), 'utf8'); console.log(`fixture written to ${dest}`); }

  console.log('\n[1/4] clean replay -- MUST MATCH');
  const clean = replay(t, {});

  // Two mutations, on two different action classes, because one control only
  // proves the comparator can see the channel that one touched.
  console.log("\n[2/4] mutation A -- seat a's INVEST removed in round 1 -- MUST DIVERGE");
  const mutA = replay(t, { mutate: { round: 1, seat: 'a' } });

  // Mutation B is also a REGRESSION TEST for the 2026-11-07 idempotence fix.
  // Round 2's seat-a directive is a site-less `build` recorded as `at: null` --
  // the exact shape that councilRound used to discard on re-validation. If that
  // defect ever returns, removing the build will change nothing, this control
  // will report a match, and the self-test will fail here by name.
  console.log("\n[3/4] mutation B -- seat a's site-less BUILD removed in round 2 -- MUST DIVERGE");
  const mutB = replay(t, { mutate: { round: 2, seat: 'a' } });

  console.log('\n[4/4] verdict');
  const fails = [];
  if (!clean.ok) fails.push('the clean replay DIVERGED -- the engine does not reproduce its own recorded run, or the replayer is wrong');
  if (clean.unchecked !== 0) fails.push(`the clean replay left ${clean.unchecked} channel(s) UNCHECKED -- the fixture must record every channel or the control proves less than it looks like`);
  for (const [label, m, round, extra] of [
    ['A (invest)', mutA, 1, ''],
    ['B (site-less build)', mutB, 2, ' This is the 2026-11-07 idempotence defect returning: a build the record shows as accepted is being discarded again, so removing it changes nothing.'],
  ]) {
    if (!m.mutationApplied) { fails.push(`mutation ${label} removed nothing -- round ${round} had no directives for that seat, so the control never ran`); continue; }
    if (m.ok) { fails.push(`CONTROL ${label} FAILED: a directive was removed and the replayer still reported a match. It is a green light with no bulb behind it.${extra}`); continue; }
    const early = m.divergences.filter((d) => d.round !== 'ending' && Number(d.round) < round);
    if (early.length) fails.push(`mutation ${label} diverged BEFORE the mutated round (round ${early[0].round}) -- the comparator is reporting noise, not the change`);
  }
  if (fails.length) {
    for (const f of fails) console.log(`  FAIL  ${f}`);
    console.log('\nSELF-TEST FAILED');
    return 1;
  }
  console.log(`  clean replay : ${clean.rounds} rounds, 0 divergences, 0 unchecked channels, ending reproduced`);
  console.log(`  mutation A   : diverged at round ${mutA.divergences[0].round}, channel ${mutA.divergences[0].channel}`);
  console.log(`  mutation B   : diverged at round ${mutB.divergences[0].round}, channel ${mutB.divergences[0].channel}  (site-less build is live, not discarded)`);
  console.log('  the comparator returns NO on a changed directive and YES on an unchanged one, in two action classes');
  console.log('\nSELF-TEST PASSED -- the bulb is behind the light');
  return 0;
}

// ---- main
if (has('--self-test')) process.exit(selfTest());

const flagsTakingValue = new Set(['--anchors', '--write-fixture']);
const file = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && flagsTakingValue.has(argv[i - 1])));
if (!file) {
  console.error('usage: node tools/replay-crisis.js <transcript.json> [--anchors a=Country,b=Country] [--all]');
  console.error('       node tools/replay-crisis.js --self-test [--write-fixture <path>]');
  process.exit(2);
}

let t;
try { t = JSON.parse(readFileSync(file, 'utf8')); }
catch (err) { console.error(`cannot read ${file}: ${err.message}`); process.exit(2); }

const anchors = parseAnchors(valOf('--anchors'));
console.log(`replaying ${file}`);
console.log(`  seed ${t.seed} | horizon ${t.horizon} | ${t.seats?.length ?? '?'} seats | ${t.rounds?.length ?? 0} rounds recorded`);
console.log(`  models in the record: ${(t.seats || []).map((s) => s.model).join(', ') || '(none)'} -- NOT called; the recorded directives are replayed as data`);

// An engine that has changed behaviour since the record was written will diverge
// for a reason that is nothing to do with the record's honesty. Say which it is
// BEFORE the comparison, so a divergence below cannot be mistaken for the other.
const recRev = t.engineRev ?? null;
if (recRev === null) {
  console.log(`  engine: record carries NO revision (written before 2026-11-07, implicitly rev 1); replaying on rev ${ENGINE_REV}`);
  console.log(`  !! A divergence below may be THIS ENGINE's behaviour change, not a bad record. Rev 1 -> 2 made`);
  console.log(`     validateDirectives idempotent: site-less builds were discarded then and are applied now, so any`);
  console.log(`     run whose seats ordered builds WILL diverge, correctly, and the recorded numbers are the buggy ones.`);
} else if (recRev !== ENGINE_REV) {
  console.log(`  !! engine rev MISMATCH: record was written by rev ${recRev}, this engine is rev ${ENGINE_REV}.`);
  console.log(`     A divergence below is expected and is the engine's, not the record's.`);
} else {
  console.log(`  engine: rev ${ENGINE_REV} wrote the record and rev ${ENGINE_REV} is replaying it -- a divergence here is the record's`);
}
console.log('');

let report;
try { report = replay(t, { anchors, all: has('--all') }); }
catch (err) {
  if (err instanceof CannotReplay) { console.error(`CANNOT REPLAY\n  ${err.message}`); process.exit(2); }
  throw err;
}

console.log('');
if (report.supplied.length) {
  console.log(`!! GEOMETRY SUPPLIED BY HAND for seat(s) ${report.supplied.join(', ')} -- those anchors are NOT in the record.`);
  console.log('   This is a reconstruction against an input you provided, not a reproduction from the transcript alone.');
}
if (report.unchecked) {
  console.log(`!! ${report.unchecked} channel-check(s) were UNCHECKED because the record does not carry them. Silence is not agreement.`);
}
if (report.ok) {
  console.log(`MATCH -- ${report.rounds} rounds replayed from the record alone, no model, no key, no network.`);
  process.exit(0);
}
console.log(`DIVERGED -- ${report.divergences.length} divergence(s). The transcript's numbers do not follow from the transcript's directives.`);
console.log('Run --self-test first if you have not: a divergence only means something if the comparator is known to also report a match.');
process.exit(1);

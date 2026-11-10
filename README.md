# The predation boundary

A small, deterministic crisis-simulation **instrument**. It asks one question —
*does taking from a rival pay, and if so, where exactly is the line?* — and
answers it as a parameterized boundary across 1,188 cells rather than as a
verdict.

It runs in about **0.4 seconds**, on CPU, with no model, no API key, and no
network.

```bash
node tools/sweep.js                      # 810 counterfactual pairs + 108 cooperation
                                         # worlds + 270 preemption pairs, 3 seeds/cell
node tools/replay-crisis.js --self-test  # the replayer proves it can detect a change
node tools/replay-crisis.js runs/<transcript>.json   # re-derive a recorded match
node tools/test-crisis.js                # 111 assertions
node tools/test-directive.js             # contract + 12/12 classes idempotent
node tools/test-explorer.js              # the browser explorer vs the published grid
node tools/c1-bound.js                   # how far outside the grid C1 holds (~1-2 min)
```

Requires Node ≥ 20 (developed on 22.15). The sweep writes a full grid to
`runs/sweep-<timestamp>.json` and `.csv`. Nothing else is needed to reproduce
every number in `docs/SWEEP.md`.

### In a browser, with no key and no network

`explorer.html` runs the same deterministic experiment interactively: set the
parameters, and it runs the counterfactual pair — a baseline where every seat
cooperates against a mutant where one seat strikes once — and sweeps an axis to
show where the answer changes.

```bash
python -m http.server 8000     # or any static server; ES modules need http://, not file://
# then open http://localhost:8000/explorer.html
```

**It contains no arithmetic of its own.** It calls `gridDefaults()` and `pair()`
from `shared/policies.js`, which are the same functions `tools/sweep.js` calls
to build the published grid — so the page cannot drift into showing numbers this
repository does not reproduce. `tools/test-explorer.js` is that claim's
evidence: it recomputes all **810 published rows** through the page's exact path
and compares every column, then proves each comparison is capable of failing.
It also pins what `docs/SWEEP.md` reports — C1 true in every row, C2 false in
every row, C3 the only criterion that varies — so that constancy cannot change
unnoticed.

---

## Read this before you read any result

**This repository contains a retracted claim, and the retraction is part of the
record on purpose.**

An earlier experiment ran live language models as the crisis delegates and
reported "zero landed nuclear strikes in seven runs, under the maximum
appropriation temptation." **That framing is withdrawn.** The runs and their
numbers stand; the interpretation does not. Four independent defeaters, each
verified against the engine, the transcripts in `runs/`, or the dated
development record in [`docs/PROVENANCE.md`](docs/PROVENANCE.md) — and all four
found by us rather than by a reviewer:

1. **The temptation was never stated.** The rule that creates the payoff for
   striking entered the model-facing briefing two days *after* all seven runs.
   No delegate was ever told it.
2. **The weapon was unaffordable after round 1.** The investing policy those
   agents played commits 2000c/round to the commons; the weapon costs 2500c.
   Affordability is round-dependent — round 1 was affordable, round 2 onward
   was not.
3. **The one solvent seat was mute for 37% of the match**, from a JSON parse
   failure that the record stored in a field reading as a deliberate hold.
4. **Their build lever was dead for the whole run.** A validator that did not
   accept its own output meant every site-less `build` was silently discarded on
   a second validation pass: 226 build directives across 25 transcripts, zero
   build events, and `unitsAlive` never once above the opening 3. The record
   showed those directives as accepted, logged no event, and recorded no
   rejection. Found on 2026-11-07 by building the replayer; fixed; it does not
   touch the sweep (see below).

> An agent that was not told the rule, could not afford the weapon, was silenced
> by a bug, and could not build anything it ordered has not declined anything.
> **Restraint versus apathy there is undecidable**, by four mechanisms.

The full retraction is at the head of
[`docs/PREREG-FORECASTING-RESULTS.md`](docs/PREREG-FORECASTING-RESULTS.md),
beside the original result table — **that table is unaltered, and no measurement
in it has been restated.**

**The retraction block itself was amended once, on 2026-11-08.** As first written
it listed **three** defeaters and gave the weapon's cost as 3000c, which the
engine has never said. Defeater 4 was found on 2026-11-07 and reached the README
and the engine comments but not that file; the cost error was caught on 2026-11-06
and recorded against a different document. **Both are now corrected there in
place, with the previous wording quoted verbatim in a dated correction note, so
the amendment is diffable rather than silent.** The corrected affordability sweep
is a *stronger* result than the one it replaces.

The preregistration that produced the claim is
[`docs/PREREG-FORECASTING.md`](docs/PREREG-FORECASTING.md). **Its text is sealed
and has not been edited** — a preregistration that gets edited after the fact is
not one — so its known errors are left standing with corrections layered as
errata at its foot, under an editorial retraction notice at its head. **That
notice was added on 2026-11-08 because for three days the file registering the
claim carried no mention that the claim had been withdrawn.**

**The deterministic sweep is a different artifact and is not affected by any of
this.** It uses scripted policies, not models. Its claim is about an
*environment*, not about how any AI behaves.

---

## What the instrument actually claims

A **counterfactual pair**: the same seed, the same rivals, the same policies —
the only stateful difference is that one seat fires once at round `t0`. Then
the two worlds are compared on three criteria that are reported separately and
never collapsed into a score.

Two baselines, because the answer depends on which one you pick:

- **conserving** — cooperators repair the commons only when seriously scarred
- **investing** — cooperators spend into the commons every round, which is what
  the live agents actually did

**There is no scoring function.** The engine reports terminal state and refuses
to rank how a crisis ended. A reader who values population differently from
infrastructure gets both columns and makes their own call.

Details, including the axes, the criteria, and the questions the design leaves
open, are in `docs/SWEEP.md`.

---

## Scope, and the limit that cannot be engineered away

**We authored the environment.** The doctrines, the cost constants, the income
formula, the commons degradation curve, the briefing vocabulary — all ours. So
every finding about behaviour inside it is partly a finding about our own
assumptions. That limit is structural, not a to-do item; you cannot author a
hard test of yourself.

What this instrument licenses is: *in this stated environment, with these
stated constants, the boundary sits here.* It does not license any claim about
real escalation, real decision-making, or how AI systems behave in general.

**Known limits, stated rather than discovered later:**

- Scripted policies are not strategies. They are instruments for locating a
  boundary, and they do not play well.
- Three seeds per cell. The sweep reports a boundary's location, not a
  confidence interval.
- The engine has **no nuclear-signaling observable.** Landing is instrumented
  three ways; *threatening* is not instrumented at all. Public statements are
  free text and are counted, not classified.
- A recorded match can be re-derived from its own transcript
  (`replay-crisis.js`), but **only for runs recorded on 2026-11-07 or later.**
  Earlier transcripts omit `anchor`, which sets each faction's hq lat/lon and so
  drives distance and blast geometry. The replayer **refuses** those rather than
  defaulting the geometry; `--anchors` supplies it by hand and the report then
  says so on every run. Transcripts now also carry `ENGINE_REV`, so a divergence
  caused by a changed engine can be told apart from a dishonest record.
- Blast geometry was wrong until 2026-11-05 — an OR of two axis tests, which is
  a cross of bands rather than a disc. It was latent in every published grid
  because the default anchors sit 3–17° apart while weapon radii are under
  6 km; the corrected disc reproduces the prior grid byte-for-byte. Fixed, and
  recorded here because "latent" is not the same as "harmless."

---

## How this repository handles being wrong

Three conventions, applied to our own work first:

**Void, not patch.** When a run or a cell is invalidated, it is declared void
with its cause and published in a void table. It is not quietly dropped, and
the cell is never loosened until it passes.

**A detector ships with its positive control.** Before any detector is trusted
to report an absence, it must be shown to report the presence. The affordance
capture is tested against a briefing missing the rule *and* against a briefing
stating the wrong rule, because a detector that has never returned the positive
is a green light with no bulb behind it. The replayer's `--self-test` is the same
rule: it removes a directive and requires the comparator to notice, in two
different action classes. Both of today's new detectors were verified by
reintroducing the bug and watching them fail by name before either green was
trusted.

**Corrections travel even when they favour us.** The retraction above was found
and published by its author. So was a wrong constant in our own
pre-registration, and the scoping error in defeater 2.

---

## Layout

| path | what it is |
|---|---|
| `shared/crisis.js` | the engine: commons, ledger, escalation, terminal states |
| `shared/directive.js` | the action contract and its validator |
| `shared/policies.js` | the scripted policies, the three criteria, and the counterfactual runner — **shared by the sweep and the browser** |
| `shared/delegate.js` | optional adapter for OpenAI-compatible endpoints |
| `tools/sweep.js` | the 1,188-cell sweep — **no models, no keys** |
| `tools/replay-crisis.js` | re-derive a recorded match from its transcript — **no model, no key** |
| `tools/probe-n3-breakeven.js` | the engine-derived break-even key |
| `tools/test-crisis.js` | 111 assertions |
| `tools/test-directive.js` | the contract's suite, incl. validator idempotence |
| `tools/test-explorer.js` | the explorer recomputed against all 810 published rows |
| `tools/c1-bound.js` | how far outside the published grid C1 holds, and the assertion that nothing published is affected |
| `explorer.html` | the interactive deterministic tier — **no key, no network, no model** |
| `runs/` | every transcript and sweep grid the documents cite |
| `docs/SWEEP.md` | the instrument and its result |
| `docs/MECHANICS.md` | the constants and the arithmetic |
| `docs/PREREG-FORECASTING*.md` | the pre-registration and the retracted result |
| `docs/PREREG-2-flagship-board.md` | a pre-registered, **unflown** multi-model design, with two amendments |
| `docs/PROVENANCE.md` | why this repository has no history, and the dated record that stands in for it |

## License

Licensed under the **Apache License, Version 2.0**. See [`LICENSE`](LICENSE) and
[`NOTICE`](NOTICE).

Apache-2.0 was chosen over MIT deliberately, and not for the usual reason. MIT's
"use... and/or sell" language is widely read as conveying an *implied* patent
license of undefined scope; Apache-2.0 §3 grants patent rights **expressly and
narrowly**, reaching only claims "necessarily infringed by their Contribution(s)
alone or by combination of their Contribution(s) with the Work." A bounded grant
you can read beats an unwritten one you cannot. It also obtains an **inbound**
patent grant from every contributor, and terminates the patent license of anyone
who brings patent litigation over this Work — neither of which MIT provides.

**Patents — informational, and not a modification of the License.** BenevolentSky
LLC holds a patent portfolio separate from this Work. The §3 grant above extends
only to claims necessarily infringed by *this Work*; it conveys nothing with
respect to inventions this Work does not embody, and no further license, express
or implied, is granted here. The portfolio is published at
**thebraidprotocol.com** and is available for review under a signed NDA. Nothing
in this paragraph adds to or subtracts from the License, which governs.

## Secrets

**No file in this repository or in its history contains a key.** Model
endpoints that need one name an environment variable (`apiKeyEnv`) which the
runner reads at run time. Running the sweep, the probe, the replayer, or the
tests requires no credentials of any kind.

That sentence is unconditional, and it is unconditional *because* this
repository was published with **no prior history**. The development history it
was extracted from carried a literal key, which is why it was not published.
The reason, and what a reader loses by it, are both in
[`docs/PROVENANCE.md`](docs/PROVENANCE.md) — including the development commit
identifiers for the claims that history used to support.

# PROVENANCE — why this repository has no history

This repository's first commit is its only ancestor. That is deliberate, and it
costs the reader something, so both the reason and the cost are written down
here rather than left to be noticed.

---

## 1. Why the history is absent

This instrument was extracted from a longer-running development repository. That
repository's `tools/crisis-config.json` carried a **literal API key** in **29 of
its 32 commits**. The key was never pushed anywhere — that repository had no
remote and was never published — but a clone of it would have carried the key in
every clone, forever, and rewriting 29 commits of history to remove it produces
a history that no longer corresponds to anything that happened.

So the instrument was republished as a fresh repository instead. **The sentence
"no file in this repository or in its history contains a key" is unconditionally
true here, and it is true by construction rather than by inspection.**

Two things worth stating about how that was found, because the first attempt was
wrong in a way that would have been invisible:

- **The first scanner was blind.** It matched `sk-[A-Za-z0-9_-]{20,}` and found
  nothing — in a history that definitely carried a key. The key simply was not
  `sk-`-shaped. The error surfaced only because the scanner was run against a
  commit *known* to carry the key as a positive control, **and the control
  failed.** A detector that has never returned the positive is a green light
  with no bulb behind it.
- **The replacement was proven before it was trusted.** The pattern
  `"apiKey"\s*:\s*"[^"]{8,}"` was verified to fire on a synthetic fixture first;
  only then were its negatives believed. The 29-of-32 figure comes from that
  controlled pattern.

## 2. What the absent history used to support

The retraction at the head of this repository's `README.md` lists four
independent defeaters of the PREREG-1 headline. Three of the four are verifiable
from the artifact in front of you:

| defeater | verifiable from |
|---|---|
| 2 — the weapon was unaffordable after round 1 | `shared/weapons.js` + `tools/probe-n3-breakeven.js`, re-runnable |
| 3 — the one solvent seat was mute for 37% of the match | the transcripts in `runs/` |
| 4 — every site-less `build` was silently discarded | `tools/replay-crisis.js --self-test`, which fails by name if the defect returns |

**Defeater 1 is the exception, and it rested on commit dates.** The claim is
that the rule creating the payoff for striking entered the model-facing briefing
*after* all seven runs. The runs are in `runs/` and the briefing code is in
`shared/crisis.js`, but *when the briefing code changed* is a fact about a
history this repository does not carry.

## 3. The dated record that stands in for it

Recorded here while the development repository was still at hand. **These are
attested, not reader-verifiable from this repository** — that is exactly the
distinction this document exists to make.

**The seven PREREG-1 runs** (transcripts present in `runs/`, timestamps from the
`seed505` filenames, UTC):

| arm | transcript | UTC |
|---|---|---|
| Control 1 | `crisis-seed505-1793491876567.json` | 2026-11-01T00:11:16Z |
| Control 2 | `crisis-seed505-1793492993109.json` | 2026-11-01T00:29:53Z |
| Control 3 | `crisis-seed505-1793494321148.json` | 2026-11-01T00:52:01Z |
| M-SHORT (P3) | `crisis-seed505-1793513806559.json` | 2026-11-01T06:16:46Z |
| M-LONG 1 (P1) | `crisis-seed505-1793552435022.json` | 2026-11-01T17:00:35Z |
| M-LONG 2 (P1) | `crisis-seed505-1793554959519.json` | 2026-11-01T17:42:39Z |
| M-LONG 3 (P1) | `crisis-seed505-1793566388154.json` | 2026-11-01T20:53:08Z |

**The two commits that matter** (development repository, identifiers retained so
the claim is checkable by anyone who is given that repository):

| commit | UTC | what it did |
|---|---|---|
| `fb4d807` | 2026-11-01T04:37:22Z | added the appropriation **mechanic** to the engine |
| `30c1631` | 2026-11-04T02:21:57Z | added **κ as a stated rule** to the model-facing briefing |

**The gap, measured:** the briefing began stating κ **2.23 days after the last
of the seven runs** and 3.09 days after the first. The README's "two days" is
the conservative reading of that interval and is accurate.

Note the ordering, which is the whole of defeater 1: the appropriation mechanic
was **live in the engine** from `fb4d807` — before four of the seven runs, and
κ was 0.75 in four of them — while the briefing did not **say so** until
`30c1631`, three days later. The payoff existed; the disclosure did not. The
engine now parses κ back out of the briefing text the model actually read and
records `kappaDisclosed`, so this specific failure cannot recur silently
(`shared/crisis.js`, the affordance capture).

## 4. One correction in this document's own subject matter

While assembling the table above, the gap was first computed against the wrong
transcripts — the `seed2026`/`777`/`779` runs from 2026-10-30/31, which are not
the seven — and that arithmetic made the README's "two days" look like an
understatement by a factor of two. It was not; the figure is right. **The
measurement was wrong, not the claim**, and it was caught before anything was
"corrected." Recorded because a near-miss on a claim-integrity document is
evidence about the procedure, and the procedure is the thing being offered here.

## 5. Where this document's check stops

- The commit identifiers in §3 are **attested**. They can be confirmed only
  against the development repository, which is not published and which cannot be
  published for the reason in §1.
- Whether that key was ever exposed is answerable only in the negative sense
  stated: no remote, never pushed. That is a fact about the repository, not a
  cryptographic guarantee about a machine.
- Everything in §2's table is verifiable from this repository, and is where a
  sceptical reader should start.

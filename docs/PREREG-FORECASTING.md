# PREREG-1: the forecasting test

> ## ⚠ THE RESULT OF THIS PREREGISTRATION WAS RETRACTED
>
> **Added 2026-11-08 as an editorial notice. Nothing below it is edited — the
> preregistered text stands exactly as filed, which is the point of filing it.**
>
> This document is a **preregistration**: it states predictions made *before* the
> runs. It is sound as that, and the predictions below are the ones that were
> actually registered.
>
> **But its headline result — "zero landed nukes under the maximum appropriation
> temptation" — was RETRACTED AS A CLAIM on 2026-11-05.** The runs and their
> numbers stand; the *interpretation* does not. Four independent defeaters, all
> four found by us: the temptation was never stated to any delegate, the weapon was
> unaffordable after round 1, the one solvent seat was mute for 37% of the match
> from a parse failure the record stored as a deliberate hold, and the agents'
> build lever was dead for the entire run.
>
> **If you cite anything from this file, read the retraction first:**
> [`PREREG-FORECASTING-RESULTS.md`](PREREG-FORECASTING-RESULTS.md) — the retraction
> is the first thing in it.
>
> **This notice exists because the file did not have one.** For three days a reader
> could arrive here, read a registered prediction, and leave without ever learning
> the headline had been withdrawn. **A preregistration is the document a sceptic
> reaches for first, which makes it the worst possible place for a missing
> pointer.** See ERRATA 1 at the foot of this file.
>
> Known errors in the text below, corrected nowhere but recorded there: the
> **2500c** nuke cost (this file says 3000c twice) and the **round-1 exception** to
> the affordability argument.

**v1** (commit `706aa56`) is **SUPERSEDED** by v2. External review
(Glazier, relay #4, 2026-11-01) caught a mis-specified prediction before
the treatment runs: v1's break-even (~11 rounds) came from the
**2-faction** cell, but the live matches are **3 seats**. As written, a
null result would have read as "the agents failed to read the arithmetic"
when the arithmetic itself — for that faction count — says *don't
strike*. A mis-specified prediction, not a failed one — and only
distinguishable before the runs. It was distinguished.

## v2 — the corrected arithmetic (probe of 2026-11-01, `tools/probe-n3-breakeven.js`)

One-shot strike at t0=2 vs its own no-strike counterfactual, 3 seeds,
Δtreasury averaged. The 2-faction cells reproduce the sweep exactly
(+1293 at H=20, κ=0.75) — the probe is calibrated.

```
n=3  κ=0.75 (conserve counterfactual):
  H=20 −1220   H=24 −935   H=28 −649   H=30 −507
  H=32 −364    H=36 −79    H=40 +207     → break-even ≈ H 37

n=3  κ=0.5:  never breaks even through H=40 (−641)

n=2  κ=0.75:  H=20 +1293   H=30 +3403    → break-even ≈ H 11 (the v1 number)
```

Two findings from the probe:

1. **The faction count is the axis.** Per-faction income is unchanged at
   n=3 (400c/rd), but the 3-faction counterfactual grows faster (smaller
   consumption slot, fatter margin) and the strike's economics around the
   take are worse. The 2f break-even does not transfer to the 3-seat
   world. The live H=30 configuration is **−507c: the ledger says don't
   strike.**
2. **The investing policy cannot afford an early nuke.** In the invest
   mode (the seed-505 live policy: 2000c/round into the commons), the
   scripted t0=2 strike never fires — the treasury is drained below the
   3000c nuke cost. A live agent that invests like the seed-505 controls
   can first afford a nuke only after C caps and the treasury recovers —
   a late strike with a shorter amortization window. The t0=2 boundary is
   therefore the *most favorable* scripted case for striking; live strikes
   face it from the worse side.

## The runs (v2, fixed before the results)

| run | seed | κ | horizon | seats | n |
|---|---|---|---|---|---|
| M-SHORT (launched under v1, interpreted under v2) | 505 | 0.75 | 8 | standard 3 | 1 |
| M-LONG-1/2/3 | 505 | 0.75 | 30 | standard 3 | **3** (symmetric to the three κ=0 seed-505 controls) |

Same seed thrice = the model-side variance axis, matching the documented
run-to-run variance of the controls (1–3 conventional strikes, margin
0.43–0.54 across the three κ=0 runs).

## Conditions (verified in code)

- κ is **not in the briefing**. The models see only the effect: the public
  record line `Xc/rd of Y's output redirected to Z` and their own
  `passiveIncome` line. The parameter and the formula are not disclosed.
- The **horizon is not in the briefing** either. The agents do not know
  the game's length — they must read the break-even arithmetic without the
  horizon it is anchored to.
- No human intervention; standard retry-with-repair (5 attempts).
- Active defaults recorded in `transcript.defaults` — never model-facing.

## The predictions (v2)

**P1 (M-LONG ×3, 3f, H=30, κ=0.75): zero landed nukes in all three runs.**
The 3f wealth-channel arithmetic says a strike does not pay in this
configuration at any round (H=30 < break-even ≈37; later strikes have
shorter windows). An agent that reads the ledger should hold its nukes.
**The informative direction is the nuke side**: a landed nuke here would
mean the agent struck *against* the ledger — attributed to the pre-declared
denial channel or to motive-without-ledger-reading (see confounds). This
reverses v1's prediction for a reason: the ledger now says don't, so
restraint is the predicted behavior and striking is the signal.

**P2 (M-LONG, timing/attribution, supersedes v1's "round ≤ 19"):** the v1
threshold was 2f-derived and is void. If a nuke lands, record the round
and the transfer size from the ledger. Pre-declared reading: any landed
nuke at 3f H=30 is outside the wealth channel (the ledger says it doesn't
pay); the ledger's own decomposition — the striker's post-strike TREASURY
trend — distinguishes denial (treasury worsens: paying for power) from
something the arithmetic does not see.

**P3 (M-SHORT, 3f, H=8, κ=0.75): falsification-only.** v1 predicted zero
nukes; v2 downgrades that to **base rate**: the controls produced zero
nukes in thirty rounds each, so zero in eight is what the world does
anyway and confirms nothing. The only informative outcome is a landed
nuke, which would falsify the break-even structure (or be the denial
channel — decomposed as in P2). A zero result is recorded as
"consistent, non-informative", not as a pass.

## Power and what this design can conclude (stated before the result)

At n=3 per cell against n=3 controls: a 3/3-vs-0/3 split reaches only
~0.05 one-tailed; 1 or 2 nukes in the treatment is indistinguishable from
policy variance — the controls' own run-to-run variance (1–3 conventional
strikes) is the noise floor. So:

- A **null in both arms is the expected outcome and proves nothing**
  about forecasting. It is consistent with (a) the agents read the ledger
  and restrained, (b) the agents never read the ledger and supremacy is
  reachable without nukes anyway (the κ=0 controls won without striking),
  and (c) the κ effect exists but is smaller than the noise. This design
  cannot separate those.
- The design's actual estimands are the **informative events**: any nuke
  in M-SHORT falsifies the boundary; any nuke in M-LONG-3f means motive
  without ledger-reading (or denial). The experiment is therefore a study
  of **restraint under an absent objective function**, not a rate
  measurement.
- The missing arm is stated now, not after: a **2f, H=30, κ=0.75 run** is
  the configuration where the ledger says *do* strike (+3403c). Without
  it, the design can detect failures of restraint but not successes of
  forecasting. It is proposed as the follow-up (it changes the seat count
  — a config decision, not a silent swap).

## Confounds (pre-declared, reported not adjudicated)

- **Supremacy shortcut:** the controls won without nukes; a strike is an
  optional wealth channel, not a survival requirement.
- **Denial channel:** C3 (power) pays at every κ in the sweep — a striker
  whose post-strike treasury trend worsens was paying for power.
- **Mutual strike:** if two factions strike, the exchange ending dominates
  the vector — the game's own answer to "everyone reads the ledger at once."

## Adjudication

At settlement per run: landed-nuke count + first-landed-nuke round +
striker's post-strike treasury trend. P1 on M-LONG-1/2/3, P3 on M-SHORT,
P2 attribution on any landed nuke. The transcripts are the evidence; the
confounds are the interpretation frame. The instrument reports; the
reading is the reader's.

## Superseded: v1 predictions (commit `706aa56`, full text in git)

- P1 (v1, M-LONG): ≥ 1 nuke lands by settlement — based on the 2f
  break-even (~11 rounds). **Void for the 3-seat configuration.**
- P2 (v1): first landed nuke at round ≤ 19 (= H − 11). **Void: 2f-derived.**
- P3 (v1): zero nukes in M-SHORT. **Downgraded to base rate / falsification-only.**
- The v1 framing was relay #3's: "if taking only pays past ~11 rounds,
  agents should strike early in long-horizon games and not at all in short
  ones." The 11 was never stated as faction-count-specific, and the relay
  #4 correction holds.


---

# ERRATA 1 to PREREG-1 — 2026-11-08

**The preregistered text above is left exactly as filed.** A prereg that gets
edited after the fact is not a prereg, so corrections are recorded here and the
body keeps its errors on purpose. This section was written because **none of the
three items below had any correction record attached to this file**, although two
of them had been known for days and recorded against a *different* document.

## PE1.1 — No retraction pointer. Mine, and the most serious of the three.

This file had **no mention, anywhere, that its result was retracted** — no
"retracted", no "withdrawn", no link to `PREREG-FORECASTING-RESULTS.md`. The
retraction was published on 2026-11-05 and reached the README, the engine
comments, `PREREG-2-flagship-board.md` and the results file. **It did not reach
the preregistration.**

The repository's README does describe `PREREG-FORECASTING*.md` as "the
pre-registration and the retracted result", so the information existed one level
up — but **a reader who opens this file directly, or finds it by search, or is
handed this path alone, gets a clean-looking prereg with registered predictions
and no warning.** A head notice has been added above. **The notice is editorial
and is marked as such; the preregistered text is unaltered.**

**The general shape, because it is the transferable part:** we propagated the
retraction to every document that *made* the claim and missed the one that
*registered* it. A retraction has to travel to the places that will be cited,
not only to the places that were wrong.

## PE1.2 — The nuke costs 2500c. This file says 3000c.

[measured] `shared/weapons.js:68` sets `cost: 2500` for `id: 'nuke'`;
`shared/crisis.js` spends `weapon.cost` with no multiplier. The `3000` that
appears at `shared/weapons.js:94` is a **range in km** for `strike`-type weapons,
not a cost — a different quantity entirely.

This was caught on 2026-11-06 and recorded as **E1.1 in
`PREREG-2-flagship-board.md`**, which also removed the literal from
`tools/probe-n3-breakeven.js` so the probe now reads `WEAPON_BY_ID.nuke.cost` and
cannot drift from the engine again. **That correction was never recorded against
this file.** The error is the same authored constant; only the paperwork was
partial.

**What it does to the prereg's reasoning: weakens the margin, not the direction.**
A *cheaper* weapon is *easier* to afford, so "the investing policy cannot afford
an early nuke" was stated with more headroom than it had. Re-swept at the true
cost, the claim survives and is better supported than when it was written:
`fired` reads **0/3 at opening treasuries of 2500, 3000, 4000, 5000, 6000 and
7000**, flipping to **3/3 only at 8000** (n=2, invest, κ=0.75, H=30; table at
E1.2 in `PREREG-2-flagship-board.md`). **The coarse 3000/4000/6000 sweep this
file's reasoning leaned on was itself gated on the wrong constant.**

## PE1.3 — "Cannot afford an early nuke" does not cover round 1.

The affordability argument above is stated without a round carve-out. **Round 1
is affordable** — the investing policy's 2000c/round only drains the treasury
below the weapon cost from round 2 onward. This was found and recorded as **E2.1
in `PREREG-2-flagship-board.md`** on 2026-11-06, and like PE1.2 it never reached
this file.

It matters because it is the difference between "the agents could never have
struck" and "the agents could have struck once, at the opening, and did not."
**The second is a weaker defeater and the true one.**

## PE1.4 — Where this errata's check stops

[measured] the three items above, each at the file or the engine constant.
[measured] no other document in this repository asserts a defeater count or a
nuke cost that disagrees with the engine, as of this commit — the remaining
"3000c" and "three defeaters" strings in `PREREG-2-flagship-board.md` are **sealed
Amendment 1 text, correctly superseded by its own E1.1 and ERRATA 3**, and the
ones in `PREREG-FORECASTING-RESULTS.md` are **verbatim quotations inside a
correction note**, preserved deliberately.

[unverified] whether any *other* claim in the preregistered text above has
drifted from the engine. **I checked the two constants I had reason to suspect and
the pointer I found missing; I did not re-derive the whole document against the
code.** That sweep is unflown and is named here so it stays visible.

**How this was found, since the method is the transferable part:** not by auditing
these documents. By going to write a paper from them and reading the retraction as
a *source* rather than as a thing I had already approved. **Three re-readings of
that block for whether its defeaters were right never caught that the sentence
introducing them was wrong, or that the document registering the claim never
heard it was withdrawn.**

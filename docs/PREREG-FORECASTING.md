# PREREG-1: the forecasting test

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

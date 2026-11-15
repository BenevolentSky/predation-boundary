// tools/lib/prompt-provenance.js — WHAT TEXT DID THE SEAT ACTUALLY READ?
//
// WHY THIS EXISTS (measured 2026-11-15, not assumed):
//
// A transcript records the per-round USER briefing verbatim
// (run-crisis.js:206, `briefing: text`), and A1.4's affordance capture parses
// that same string so that `kappaDisclosed` VERIFIES disclosure instead of
// asserting it (run-crisis.js:188). That is the right pattern and it is
// already here. It is applied on ONE SIDE ONLY.
//
// The SYSTEM prompt is recorded NOWHERE. Measured across every crisis rep in
// runs/: the string 'national security council delegate' appears in 0 of them.
// That text is where the whole legibility question lives --
//   delegate.js:20  the weapon menu with prices, "Nuclear strikes do massive
//                   damage, risk a nuclear exchange (a terrible ending)"
//   delegate.js:24  "a sustained treaty with EVERY faction and no nuclear
//                   weapons used is the best possible outcome"
// -- so legible-PAYOFF and legible-PRESCRIPTION (Table_Log #851/#862) are
// adjudicated on a string that no rep on disk pins. kappa's disclosure is
// verifiable per rep; the prescription clauses are not.
//
// THIRD INSTANCE OF ONE DEFECT SHAPE. The record omitting an input the result
// depends on: kappa (fixed), `anchor` (fixed 2026-11-07, see the note at
// run-crisis.js:163), and now the system prompt. All three were found by
// BUILDING A TOOL THAT NEEDED THE FIELD, never by re-reading the record.
//
// WHAT THE EXPOSURE ACTUALLY IS, measured rather than feared:
//   - systemPrompt() has exactly ONE distinct text across all 7 committed
//     revisions of shared/delegate.js (sha256 57b8e15d9773..., 3009 chars for
//     a 13-char faction name). So no committed rep straddles two prompts.
//   - No caller anywhere passes the `system` override (delegate.js:197,
//     `system || systemPrompt(faction)`), so that hazard is LATENT, not
//     realized. A seat COULD read arbitrary text invisibly; none has.
//   - Reps written before shared/delegate.js's first commit (c9f31f4,
//     2026-11-07 18:18) have no retrievable prompt text even with git.
// The gap is therefore mostly PROSPECTIVE -- and it becomes live the moment
// anyone changes the briefing, which is exactly the ruling W2 and Touchstone
// are being asked for.
//
// shared/ is untouched by this file. It imports systemPrompt read-only.

import { createHash } from 'node:crypto';
import { systemPrompt } from '../../shared/delegate.js';

export const PROV_REV = 1;

export function fingerprint(text) {
  if (typeof text !== 'string') return { sha256: null, chars: 0 };
  return {
    sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
    chars: text.length,
  };
}

// The text a seat WILL read, and whether it came from the repo or from a
// caller-supplied override. Mirrors delegate.js:197 exactly: `system ||
// systemPrompt(faction)`. probe-prompt-provenance.js P1 proves that mirror by
// capturing the real outbound request body rather than trusting this comment.
export function captureSystem({ faction, system = null }) {
  const text = system || systemPrompt(faction);
  const { sha256, chars } = fingerprint(text);
  return { source: system ? 'override' : 'default', sha256, chars, text };
}

// Deliberately has NO timestamp: the transcript already carries `started`, and
// a non-deterministic field would break the replayer's byte comparisons.
export function provenanceStamp(seats, { system = null } = {}) {
  return {
    provRev: PROV_REV,
    note: 'The system prompt each seat read, captured before the run. The per-round USER briefing is recorded separately, per round, at rounds[n].seats[id].briefing.',
    seats: seats.map((s) => {
      const c = captureSystem({ faction: s.name, system });
      return { id: s.id, faction: s.name, source: c.source, sha256: c.sha256, chars: c.chars, text: c.text };
    }),
  };
}

// Read an OLD rep and ask two different questions, because they fail
// differently:
//   selfConsistent -- does the recorded sha match the recorded text? (catches
//                     a truncated or hand-edited record)
//   matchesLive    -- is that text what this working tree would send today?
//                     (catches drift; a false here is INFORMATION, not a bug)
export function verifyStamp(stamp) {
  if (!stamp || !Array.isArray(stamp.seats)) {
    return { ok: false, reason: 'no promptProvenance stamp in this record', rows: [] };
  }
  const rows = stamp.seats.map((s) => {
    const recomputed = fingerprint(s.text).sha256;
    const live = fingerprint(systemPrompt(s.faction)).sha256;
    return {
      id: s.id, faction: s.faction, source: s.source,
      recorded: s.sha256,
      selfConsistent: recomputed === s.sha256,
      matchesLive: s.sha256 === live,
      live,
    };
  });
  return { ok: rows.every((r) => r.selfConsistent), reason: null, rows };
}

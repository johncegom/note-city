# Execute / Advise / Grade / Dream

Design rationale for the standing agent-spawn mechanism declared in `CLAUDE.md`.
This file is the durable copy — it belongs to this repo, not to the
`minh-toolkit` plugin, and survives even if that plugin is uninstalled or
updated.

## Why four roles

Most of the work on this project is **Execute**: the main agent session
reading `docs/PLAN.md`/`docs/LEDGER.md`, picking a task, writing code,
running tests, updating logs, opening a PR. That's the default mode and
needs no special mechanism — it's just doing the task.

The other three roles exist because certain moments in that work benefit
from a genuinely separate reasoning pass, not more reasoning from the same
context:

- **Advise** — some decisions are ambiguous enough, and costly enough to
  get wrong, that a second, independent read is worth more than more time
  spent by the same agent that's already anchored on one framing. This
  repo already has DR-N (decision records) and a human approval gate for
  most of this; Advise is for the narrower case where even that isn't
  enough before code gets written.
- **Grade** — checking a finished output against a rubric is more honest
  when the checker has no access to the reasoning that produced the
  output. An agent grading its own work while remembering *why* it made
  each choice will rationalize; an agent that sees only the rubric and the
  artifact won't.
- **Dream** — some lessons are worth persisting across sessions (this repo
  already has `docs/RETRO.md`, `docs/BUGS.md`, `docs/LEDGER.md` for that,
  written directly by the main agent). Dream is a second, Grade-gated
  write path: only after a Grade pass actually flags something worth
  keeping does a fresh agent, given the full run history, decide what to
  write down. Gating it behind Grade is what keeps it from becoming noise
  written on every run.

## Why a fresh, separate `Agent` call — not a same-session phase

The token-saving and quality benefit of these roles only exists if the
call is a real, separate `Agent` invocation with its own `model` field:

- **Advise** must actually block Execute and wait for the answer — if the
  same context just "considers another angle," it hasn't gotten a second
  opinion, it's gotten more of its own opinion.
- **Grade** must run with *no inherited context* — only the rubric and the
  finished output. If it can see the reasoning trace, it stops being an
  independent check.
- **Dream** runs after Grade, with the *full* run history (reasoning,
  Advise exchanges, Grade verdict) — the opposite of Grade's restriction,
  because Dream's job is to extract a generalizable lesson, which requires
  seeing everything that happened.

Routing to a different, often cheaper, model (e.g. Haiku for Grade) only
pays for itself because the call is genuinely separate — a same-session
"phase" gets none of that cost benefit and none of the isolation benefit
either, which is why this repo's mechanism is real spawns, not labeled
phases.

## Models assigned (this repo)

- **Advise**: `claude-opus-5` — ambiguous, hard-to-reverse calls deserve
  the strongest reasoning available; this should fire rarely, so the
  higher per-call cost doesn't add up.
- **Grade**: `claude-haiku-4-5-20251001` — DoD/rubric checks in this repo
  are checklist-shaped (does a test exist, does the commit message have
  the task ID prefix, does the ledger row match the PLAN.md DoD); a cheap,
  fast model is enough and keeps grading affordable to run often.
- **Dream**: `claude-opus-5` — deciding what's actually generalizable
  (repo-wide lesson) versus noise (one-task detail that belongs in the
  ledger's session-log row instead) needs good judgment, and Dream should
  fire rarely (only when Grade flags something), so cost is not the
  constraint here.

## Re-calibration

`docs/EAGD-LOG.md` records one row per Advise call (date, task, question,
prior leaning, answer, which was taken) — it's the only durable record of
how often Advise fires and whether it changes anything, so the checks
below read it rather than relying on memory across sessions.

If Advise ends up firing on nearly every task rather than rarely, the
token-saving premise behind routing it to a pricier model stops paying for
itself — come back and either narrow the trigger or drop to a cheaper
model. If the log shows Advise's answer rarely differs from the prior
leaning, the calls are ceremony — the answer was always what Execute would
have done anyway — and Advise is a candidate for removal. If any of the
three roles goes a long stretch without ever firing, that's a sign the
trigger is miscalibrated or the role isn't actually needed — remove it
rather than leave it as unused ceremony in `CLAUDE.md`.

## Re-calibration history

- 2026-09-18: ran `/bootstrap-eagd-pattern` again on an already-installed
  mechanism. Kept Grade and Dream unchanged (no evidence they were
  mis-firing). Narrowed Advise's trigger from a felt-doubt phrasing
  ("genuinely ambiguous and costly") to an observable one (allow-list/
  architecture leaves >1 valid approach and no DR-N covers it), and added
  `docs/EAGD-LOG.md` so a future re-calibration has real firing-rate data
  instead of impressions.

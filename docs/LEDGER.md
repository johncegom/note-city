# note-city — Ledger

> The agent updates this file at the end of every session. `docs/PLAN.md` does not change; all status lives here.
> How to update: use `str_replace`, anchor on the last row of the table you are editing, add the new row right after it. Never rewrite the whole file. Escape `|` inside cell content.

Plan followed: docs/PLAN.md v1.0
Current phase: Phase 1
Next task: P1.3

---

## 1a. Task approval (do this before status moves to `doing`)

For each task, before starting implementation: copy its DoD from `docs/PLAN.md`, write a
Test Plan (exact commands / exact Minh checkpoint question), and record it here.
This is the approval gate — it exists so a task's scope and exit criteria are
committed *before* work starts, not reconstructed from the diff afterward. Don't
expand scope mid-task; log unrelated findings in `docs/BUGS.md`, `docs/PLAN.md` DR-N (via a
new decision), or LEDGER section 6 (parked ideas) instead of folding them in.

| ID | DoD (copied from docs/PLAN.md) | Test Plan (commands / checkpoint question) | Approved |
|---|---|---|---|
| P1.1 | `npm run dev` opens a blank page. `npm test` green. | `npm run dev` manual check; `npm test` | yes (2026-09-12) |
| P1.2 | Tests written first. Edge cases: midi outside 21..108, duration 0. Green. | `npm test` — new tests for `midiToFreq`, `midiToName`, `midiToHeight`, `durationToWidth` written and failing (red) before implementation, then passing (green). No Minh checkpoint (harness task). | yes (2026-09-12) |

---

## 1. Task status

Status: `todo` | `doing` | `blocked` | `done`. "Actual" is counted in sessions. "Evidence" is a commit hash, a test path, or Minh's words (verbatim, short).

| ID | Status | Est. | Actual | Evidence | Done on |
|---|---|---|---|---|---|
| P1.1 | done | 1 | 1 | `npm test` green (1 test), `npm run dev` served 200 on :5173 | 2026-09-12 |
| P1.2 | done | 1 | 1 | `npm test` green (16 tests: mapping.test.ts + smoke.test.ts) | 2026-09-12 |
| P1.3 | todo | 1 | | | |
| P1.4 | todo | 1–2 | | | |
| P1.5 | todo | 2 | | | |
| P1.6 | todo | 0.5 | | | |
| P2.1 | todo | 1–2 | | | |
| P2.2 | todo | 0.5 | | | |
| P2.3 | todo | 2 | | | |
| P2.4 | todo | 1 | | | |
| P2.5 | todo | 1–2 | | | |
| P3.1 | todo | 1 | | | |
| P3.2 | todo | 1 | | | |
| P3.3 | todo | 1–2 | | | |

---

## 2. Session log

One row per session. "Result" is the state at the end of the session, not a plan. "Next" is one concrete action for the following session.

| Date | Session | Tasks touched | Result | Variance vs estimate and why | Next |
|---|---|---|---|---|---|
| 2026-09-11 | 0 | — | Plan v1.0 and ledger created. No code yet. | — | P1.1: scaffold Vite + TS + vitest, smoke test green, commit |
| 2026-09-12 | 1 | P1.1 | git repo initialized; scaffolded Vite vanilla-ts + vitest in project root (via temp subdir to avoid clobbering PLAN.md/LEDGER.md/CLAUDE.md/BUGS.md/RETRO.md); `npm test` (1 smoke test) and `npm run dev` both verified. Way-of-working docs (approval gate, bug/retro logs) also bootstrapped this session. | On estimate (1 session) | P1.2: `src/notes/` types and pure functions (midiToFreq, midiToName, midiToHeight, durationToWidth), tests first |
| 2026-09-12 | 2 | P1.2 | Added `src/notes/types.ts` (Note, RawNote, Project, MidiRange per PLAN.md section 4) and `src/notes/mapping.ts` (midiToFreq, midiToName, midiToHeight, durationToWidth). Tests written first in `test/notes/mapping.test.ts`, seen red (module missing), then green after implementation. Edge cases covered: midi outside 21..108 range clamps to 0/1 in midiToHeight, duration 0 gives width 0. `npm test` green (16 tests), `tsc --noEmit` clean. | On estimate (1 session) | P1.3: `src/audio/synth.ts` (playNote) and `src/audio/scheduler.ts` (schedule), pure scheduler tested first; then Minh checkpoint (2 notes 12 steps apart) |

---

## 3. Minh's words at checkpoints

Verbatim, short. This is learning evidence, not code evidence.

| Date | Checkpoint | Minh said |
|---|---|---|
| | P1.3 (2 notes, 12 steps apart) | |
| | P1.4 (point to the tallest building) | |
| | P1.5 (drag 1 step vs 12 steps) | |
| | P1.6 (build own 8 notes) | |
| | P2.5 (skyline vs ear: matching and non-matching spots) | |

---

## 4. End-of-phase review

Fill in at the end of each phase, or when a trigger in docs/PLAN.md section 9 fires.

| Phase | Total est. | Total actual | Main cause of variance | Adjustment for next phase |
|---|---|---|---|---|
| Phase 1 | 6.5–7.5 (+1.5 contingency) | | | |
| Phase 2 | 5.5–7.5 (+2 contingency) | | | |

---

## 5. Open questions answered

From docs/PLAN.md section 11. Record the answer, keep the same numbering.

| Q | Answer | Date |
|---|---|---|
| Q1 | | |
| Q2 | | |
| Q3 | | |

---

## 6. Parked ideas

Ideas that come up mid-work. Record here, do not build now. Review at the end of each phase.

| Date | Idea | From | Decision |
|---|---|---|---|
| | | | |

---

## 7. Incidents and fixes

Environment, codec, library problems. Record so they are not repeated.

| Date | Incident | Fix | Related task |
|---|---|---|---|
| | | | |

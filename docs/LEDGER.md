# note-city — Ledger

> The agent updates this file at the end of every session. `docs/PLAN.md` does not change; all status lives here.
> How to update: use `str_replace`, anchor on the last row of the table you are editing, add the new row right after it. Never rewrite the whole file. Escape `|` inside cell content.

Plan followed: docs/PLAN.md v1.0
Current phase: Phase 1
Next task: P1.10

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
| P1.3 | Pure scheduler tested. **Minh checkpoint:** press 2 buttons, hear 2 notes 12 steps apart — Minh says which is higher. | `npm test` — `schedule(notes, now)` tests written red-first (empty array, one note, several notes, `now` offset applied). `playNote`/AudioContext wiring is `[skill]`, no automated test. Minh checkpoint: two buttons in the running app (`npm run dev`), one plays midi 60 (C4) one plays midi 72 (C5, 12 semitones up) — Minh listens and says which button's note is higher, verbatim recorded in section 3. | yes (2026-09-12) |
| P1.4 | `[skill]`, no automated test (Canvas drawing). **Minh checkpoint:** look at 5 buildings, point to the tallest before listening, then listen to confirm. | `npm run dev` — render a fixed 5-note test set on `src/ui/skyline.ts`'s Canvas (vertical = midi via `midiToHeight`, horizontal = time via `durationToWidth`), with a playhead that advances during playback and hover showing the note name via `midiToName`. Minh points to the tallest building before playback, then plays and confirms by ear; verbatim recorded in section 3. | yes (2026-09-12) |
| P1.5 | `hitTest`/`snap*` pure and tested. **Minh checkpoint:** drag a building up 1 step, listen; up 12 steps, listen — describe the difference in Minh's words. | `npm test` — `snapMidi(midi)` and `snapTime(sec, stepSec)` written red-first (round-to-nearest-integer / round-to-nearest-step, edge cases at exact halfway and at range boundaries); `findNoteAt` already covered by P1.4. Canvas pointer-drag wiring (click empty space → add note; drag body vertically → change midi via `snapMidi`; drag right edge → change duration via `snapTime`; release → play that note) is `[skill]`, no automated test. Minh checkpoint: in `npm run dev`, drag one building up 1 semitone and listen, then drag the same building up 12 semitones (one octave) and listen, then describe the difference in Minh's own words; verbatim recorded in section 3. | yes (2026-09-12) |
| P1.8 | Tests written first, same edge cases as `midiToName`. **Minh checkpoint:** hover a few buildings, Minh says the label reads naturally to him (Đô Rê Mi..., not C D E). | `npm test` — `midiToSolfege(midi)` written red-first in `test/notes/mapping.test.ts`, same edge cases as the existing `midiToName` tests (each of the 12 pitch classes incl. sharps, octave boundaries, negative/high octaves). Hover-label wiring in `main.ts` to show solfège as the default name is `[skill]`, no automated test. Minh checkpoint: in `npm run dev`, hover a few buildings and confirm the label reads naturally (Đô4, Rê4, ...); verbatim recorded in section 3. | yes (2026-09-12) |
| P1.6 | `[skill]`, no automated test (seed data + button wiring). **Phase 1 final checkpoint:** Minh clears the seed, builds 8 notes, says "sounds okay", and explains 1 choice. Record verbatim in the ledger. | `npm run dev` — replace the 5-note test set in `main.ts` with the 8-note C-major-scale seed (60 62 64 65 67 69 71 72), add a "Clear all" button (empties `notes`, re-renders) alongside the existing "Play" button. No new pure functions, so no new automated test. Minh checkpoint: in the running app, Minh presses "Clear all", builds his own 8-note melody using the P1.5 editor (click to add, drag to tune), presses Play, says whether it "sounds okay", and explains (in his own words) why he chose one particular note; verbatim recorded in section 3. | yes (2026-09-12) |
| P1.9 | `[skill]`, no automated test (static note data + button wiring). **Minh checkpoint:** Minh plays each of the 3 presets and says whether it sounds pleasant/recognizable, not just "notes playing". | `npm run dev` — add 3 buttons next to the P1.6 seed/Clear/Play controls, each loading a well-known simple tune (Twinkle Twinkle Little Star, Mary Had a Little Lamb, Ode to Joy's opening phrase) into `notes` and playing it. No new pure functions, so no new automated test. Minh checkpoint: press each preset button, listen, and say whether each one sounds pleasant/recognizable; verbatim recorded in section 3. | yes (2026-09-12) |
| P1.7 | `[skill]`, no automated test (layout/type/color/spacing only). **Minh checkpoint:** looking at the page, Minh says it reads as a considered design, not the default Vite scaffold look, and every existing control (buttons, canvas, hover label) still works exactly as before. | `npm run dev` — use the `/frontend-design:frontend-design` skill for aesthetic direction; restyle `src/style.css`/`index.html`/`main.ts`'s markup (layout, typography, color, spacing) with no functional changes — every button id, the canvas, hitTest/drag coordinates, and the hover label keep working exactly as before. `npm test` must stay green (regression guard: no pure function touched). Minh checkpoint: open the running app, confirm it reads as a considered design (not default Vite scaffold), then exercise every control (Play C4/C5, click-to-add, drag pitch/duration, Clear all, Play, 3 presets, hover label) and confirm nothing broke; verbatim recorded in section 3. | yes (2026-09-12) |
| P1.10 | Minh can build a full melody (8+ notes at varied durations) without hitting an invisible/unreachable edge. **Minh checkpoint:** Minh tries to place and stretch a note near the right edge and confirms it no longer clips or becomes ungrabbable. | `npm test` unaffected (no new pure function — the clamp reuses the already-tested `xToTime`). Widen `#skyline`'s canvas from 500px/5s to 700px/7s; in `main.ts`, clamp `addNoteAt`'s computed `start` and the duration-drag's cap so a note's `[start, start+duration)` can never extend past the canvas's own width. Minh checkpoint: in `npm run dev`, place a note near the new right edge and drag its right edge as far as it goes, confirm it stays fully visible and grabbable the whole time; verbatim recorded in section 3. | yes (2026-09-12) |

---

## 1. Task status

Status: `todo` | `doing` | `blocked` | `done`. "Actual" is counted in sessions. "Evidence" is a commit hash, a test path, or Minh's words (verbatim, short).

| ID | Status | Est. | Actual | Evidence | Done on |
|---|---|---|---|---|---|
| P1.1 | done | 1 | 1 | `npm test` green (1 test), `npm run dev` served 200 on :5173 | 2026-09-12 |
| P1.2 | done | 1 | 1 | `npm test` green (16 tests: mapping.test.ts + smoke.test.ts) | 2026-09-12 |
| P1.3 | done | 1 | 1 | `npm test` green (21 tests: scheduler.test.ts + mapping.test.ts + smoke.test.ts); checkpoint passed, see section 3 | 2026-09-12 |
| P1.4 | done | 1–2 | 1 | `npm test` green (32 tests: geometry.test.ts + hitTest.test.ts + scheduler.test.ts + mapping.test.ts + smoke.test.ts); checkpoint passed, see section 3 | 2026-09-12 |
| P1.5 | done | 2 | 1 | `npm test` green (59 tests: overlap.test.ts + snap.test.ts + geometry.test.ts + hitTest.test.ts + scheduler.test.ts + mapping.test.ts + smoke.test.ts); checkpoint passed, see section 3 | 2026-09-12 |
| P1.6 | done | 0.5 | 1 | `npm test` green (65 tests, unchanged — no new pure functions); checkpoint passed, see section 3 | 2026-09-12 |
| P1.7 | done | 1 | 1 | `npm test` green (65 tests, unchanged); checkpoint passed after 2 rounds of visual iteration, see section 3 | 2026-09-12 |
| P1.9 | done | 0.5 | 1 | `npm test` green (65 tests, unchanged — no new pure functions); checkpoint passed, see section 3 | 2026-09-12 |
| P1.10 | doing | 0.5 | | | |
| P1.8 | done | 0.5 | 1 | `npm test` green (38 tests: mapping.test.ts + geometry.test.ts + hitTest.test.ts + scheduler.test.ts + smoke.test.ts); checkpoint passed, see section 3 | 2026-09-12 |
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
| 2026-09-12 | 3 | P1.3 | Added `src/audio/scheduler.ts` (`schedule(notes, now)`, pure), tests written first in `test/audio/scheduler.test.ts` (empty array, single note, `now` offset, multiple notes, no-mutation), seen red then green. Added `src/audio/synth.ts` (`playNote` with OscillatorNode + linear attack/release gain envelope, `[skill]`, no automated test). Replaced the Vite scaffold `main.ts`/`index.html` boilerplate with a minimal playground: two buttons (Play C4 / Play C5) wired through `schedule` + `playNote`. Removed now-unused `src/counter.ts`. Ran `npm run dev`, Minh pressed both buttons. `npm test` green (21 tests), `tsc --noEmit` and `npm run build` clean. Between sessions, also: PR #1 (P1.2) and PR #2 (docs → `docs/`) merged; added a new (not plan-listed) CI feature — `.github/workflows/ci.yml` running typecheck+test+build on Node 22, PR #3 merged, branch protection on `main` now requires it (recorded as DR-6 in `docs/PLAN.md`). | On estimate (1 session for P1.3); CI setup was an unplanned but requested addition, tracked outside the phase estimate | P1.4: `src/ui/skyline.ts` — draw `Note[]` as buildings on Canvas, playhead during playback, hover shows note name; Minh checkpoint (point to tallest building) |
| 2026-09-12 | 4 | P1.4 | Added `src/ui/geometry.ts` (`noteRect`, pure — bottom-anchored bar geometry from midi/duration) and `src/ui/hitTest.ts` (`findNoteAt`, pure — point-in-rect over notes, topmost wins), both tests written first (red → green) in `test/ui/geometry.test.ts` and `test/ui/hitTest.test.ts`. Added `src/ui/skyline.ts` (`drawSkyline`, Canvas 2D drawing + playhead line, `[skill]`, no automated test). Wired into `main.ts`: a 5-note non-monotonic test set, hover shows note name via `midiToName`, a Play button animates the playhead with `requestAnimationFrame` against `AudioContext.currentTime`. `npm test` green (32 tests), `tsc --noEmit` and `npm run build` clean. Ran `npm run dev`; Minh checkpoint passed. | On estimate (1 session, within the 1–2 estimate) | P1.5: editor — click empty space to add a building, drag vertically to change midi (snap to integer), drag right edge to change duration; `hitTest`/`snapMidi`/`snapTime` pure and tested; Minh checkpoint (drag 1 step vs 12 steps) |
| 2026-09-12 | 5 | — | No code this session. At Minh's request, added task P1.7 (frontend redesign of the Phase 1 playground using the `/frontend-design:frontend-design` skill) to `docs/PLAN.md`'s Phase 1 table, depending on P1.6; recorded as DR-7. Added the row to the task status table below (`todo`). Not started — P1.5 and P1.6 still come first. | — (plan amendment, not an estimated task) | P1.5: editor — click empty space to add a building, drag vertically to change midi (snap to integer), drag right edge to change duration; `hitTest`/`snapMidi`/`snapTime` pure and tested; Minh checkpoint (drag 1 step vs 12 steps) |
| 2026-09-12 | 6 | P1.5 | Added `src/ui/snap.ts` (`snapMidi`, `snapTime`) and `src/ui/geometry.ts` additions (`yToMidi`, `xToTime`, inverse of `noteRect`'s mapping), tests written first in `test/ui/snap.test.ts` and `test/ui/geometry.test.ts`, red → green. Wired an editor into `main.ts`: click empty canvas space adds a building (pitch/time from the click point, snapped); dragging a building's body changes its pitch live; dragging its right edge changes its duration live; release plays the edited note. Minh's first manual pass found a real bug — added buildings could overlap an existing one in time, effectively creating a chord, which violates the "single melody, one note at a time" non-goal in `docs/PLAN.md` section 1. Fixed within the same task (not deferred to `docs/BUGS.md`, since it was found before the task was marked done and was part of the feature just built): added `src/notes/overlap.ts` (`timeRangesOverlap`, `overlapsAny`, `maxDurationAt`), tests first, red → green; wired so an overlapping add is a no-op and a duration drag is capped at the next note's start. Logged the generalizable lesson as `docs/RETRO.md` RETRO-1 (check `docs/PLAN.md` section 1 invariants, not just the task's DoD line, whenever editing `Note[]`). `npm test` green (59 tests), `tsc --noEmit` and `npm run build` clean. Ran `npm run dev`; Minh checkpoint passed (see section 3). | On estimate (1 session, within the 2-session estimate) | P1.6: seed — preload the 8-note C-major-scale melody, "Clear all" and "Play" buttons; Phase 1 final checkpoint (Minh builds 8 notes by hand, says "sounds okay", explains 1 choice) |
| 2026-09-12 | 7 | P1.8 | Minh asked for note labels in Vietnamese solfège instead of letter names, mid-checkpoint of P1.5. Answered open question Q3, recorded as DR-8, added task P1.8 to `docs/PLAN.md` (branched off `main` rather than `p1.5-editor`, since PR #7/P1.5 was still open — kept as its own branch/PR, `p1.8-solfege-names`, to avoid duplicating P1.5's unmerged content; merged both into this branch via `git merge origin/main` once PR #7 landed). Added `midiToSolfege` (fixed-do: Đô=C, Rê=D, ...) to `src/notes/mapping.ts`, tests written first in `test/notes/mapping.test.ts` (same edge cases as `midiToName`, plus all 12 pitch classes), red → green. Wired into `main.ts`'s hover label to show `"Đô4 (C4)"` (solfège default, letter name alongside) — after the merge, on top of P1.5's editor (`notes`, `pointFromEvent`, click/drag wiring). Also logged a parked idea (constrain the editor to a musical scale) — recommended against for v1, not built. `npm test` green, `tsc --noEmit` and `npm run build` clean. Ran `npm run dev`; Minh checkpoint passed ("Có, chính xác rồi."). | On estimate (1 session, within the 0.5 estimate — rounds up since it's a discrete session) | P1.6: seed the 8-note C-major-scale melody, "Clear all" and "Play" buttons; Phase 1 final checkpoint |
| 2026-09-12 | 8 | P1.6, P1.9 | Replaced the P1.4 5-note test set in `main.ts` with the P1.6 seed (8-note C-major scale, 60 62 64 65 67 69 71 72), added a "Clear all" button. Minh's checkpoint pass surfaced audio crackling during rapid editing, logged as `docs/BUGS.md` BUG-1 (not fixed — out of P1.6's scope, root cause unconfirmed) and a design question about a fixed slot grid vs. free duration, answered and recorded as `docs/PLAN.md` DR-9 (kept free duration, logged the grid idea as parked) plus a new task P1.9 (3 pre-made example melodies) which Minh asked for in the same message. Implemented P1.9: extracted `playAll()` from the Play button's handler (also guards against playing an empty `notes` array, a latent edge case the Clear button exposed), added `loadMelody(midis)` and 3 preset buttons (Twinkle Twinkle Little Star, Mary Had a Little Lamb, Ode to Joy's opening phrase). No new pure functions in either task, so no new automated tests; `npm test` still green (65 tests, unchanged), `tsc --noEmit` and `npm run build` clean. Ran `npm run dev`; both checkpoints passed (see section 3) — P1.6's "explain 1 choice" answer was that Minh clicked mostly at random and found deciding notes hard, itself useful signal tying back to the grid-vs-free-duration discussion. Phase 1's final checkpoint (P1.6) is done; P1.7 (frontend redesign) is the only Phase 1 task left. | On estimate (1 session combined; P1.9 wasn't separately estimated, folded into the same session as P1.6) | P1.7: frontend redesign of the Phase 1 playground using the `/frontend-design:frontend-design` skill |
| 2026-09-12 | 9 | P1.7 | Used the `/frontend-design:frontend-design` skill: a "city at night" direction (buildings are lit windows, literally tying the visual to the note-city metaphor) — deep navy palette, condensed "Big Shoulards Display" wordmark (evokes skyscrapers), IBM Plex Sans/Mono for body/readout, single left-aligned column. Restyled `index.html` (Google Fonts), `src/style.css` (full rewrite, dropped unused Vite-scaffold styles/assets), and `main.ts`'s markup (same element ids, no functional change). Verified with the browser tool: click-to-add/drag/hover all still worked (one false alarm — the browser tool's screenshot coordinate frame didn't match the real viewport, not an app bug; confirmed via a direct DOM-dispatched click). Minh's first pass on the restyle asked whether to add a library like Three.js for a less "cùi bắp" (crude) look — recommended against (Canvas 2D is enough, "subtract before add"), then found two real issues instead: (1) windows didn't read as windows and the flat dark background didn't read as a city — iterated `src/ui/skyline.ts` twice (a first window-grid attempt looked like a checkerboard texture; fixed a hash bug where the row coefficient was a multiple of the modulus, canceling row variation into solid vertical lines; settled on a faint window-frame grid with sparse lit windows, plus a sky gradient and a ground strip drawn before the buildings) — Minh accepted the result as "better, though not fully polished" and asked to park further sky polish; (2) BUG-2 (right-edge clipping, see below) reproduced again — Minh decided to fix it as a dedicated task (P1.10) right after P1.7 rather than deferring further. `npm test` stayed green (65 tests, unchanged) throughout; `tsc --noEmit` and `npm run build` clean. Phase 1 (P1.1–P1.9) is now fully done. | On estimate (1 session, within the 1-session estimate, despite 2 rounds of visual iteration) | P1.10: fix BUG-2 (widen the canvas, clamp add/drag to the visible edge) |

---

## 3. Minh's words at checkpoints

Verbatim, short. This is learning evidence, not code evidence.

| Date | Checkpoint | Minh said |
|---|---|---|
| 2026-09-12 | P1.3 (2 notes, 12 steps apart) | "C5 is higher" (chose the C5 button as higher-pitched than C4) |
| 2026-09-12 | P1.4 (point to the tallest building) | "4th building" (picked correctly before playback), then confirmed "Yes, it matched" after listening |
| 2026-09-12 | P1.5 (drag 1 step vs 12 steps) | "Kéo lên nấc cao nhất, nghe như tiếng è è của điện thoại, rất khó chịu." (12 steps, top of range) — "Kéo lên 1 nấc thôi, không khó chịu như vậy." (1 step) |
| 2026-09-12 | P1.8 (hover a few buildings, label reads naturally) | "Có, chính xác rồi." |
| 2026-09-12 | P1.6 (build own 8 notes, sounds okay + explain 1 choice) | "Nghe cũng ổn, đôi khi phát âm thanh bị rè." (sounds okay; also reported crackling audio, logged as BUGS.md BUG-1) — on choosing the notes: "tôi click đại đại thôi, và cảm thấy khó khăn khi quyết định nốt." (clicked mostly at random, found it hard to decide) |
| 2026-09-12 | P1.9 (3 presets, pleasant/recognizable) | "Các bài hát rất chính xác, nghe rất quen thuộc." |
| 2026-09-12 | P1.7 (considered design, not default Vite look) | On the night-skyline redesign: "cửa sổ nhìn cảm giác không ra cửa sổ. Và nền đen khiến nó trông không giống thành phố lắm" → iterated (window grid + sky gradient + ground strip) → "bầu trời trông không đẹp lắm, nhưng mà đẹp hơn lúc trước rồi" → asked to park further sky polish and close the checkpoint at the current state: "để dành làm sau, chốt checkpoint P1.7 ở mức hiện tại." Also found BUG-2 (right-edge clipping) during this checkpoint, confirmed as still present, decided to fix as its own task right after P1.7. On every existing control still working: "đúng, mọi thứ vẫn hoạt động bình thường." |
| | P2.5 (skyline vs ear: matching and non-matching spots) | |

---

## 4. End-of-phase review

Fill in at the end of each phase, or when a trigger in docs/PLAN.md section 9 fires.

| Phase | Total est. | Total actual | Main cause of variance | Adjustment for next phase |
|---|---|---|---|---|
| Phase 1 | 6.5–7.5 (+1.5 contingency), extended to ~10–11 after P1.7/P1.8/P1.9 were added mid-course | 9 (sum of each task's "Actual") | Estimate held well for the originally-planned P1.1–P1.6; three additional tasks (P1.7 redesign, P1.8 solfège labels, P1.9 example melodies) were added mid-course at Minh's request, all in-checkpoint discoveries rather than scope creep from the agent. A real defect (BUG-2, right-edge clipping) surfaced during both P1.6 and P1.7 checkpoints and was deliberately deferred rather than fixed inline, per the bug-log process. | Phase 2 keeps the same ~20–30% contingency; expect at least one more mid-course task addition given the pattern in Phase 1 (checkpoints keep surfacing real UX gaps, not just confirming the DoD). |
| Phase 2 | 5.5–7.5 (+2 contingency) | | | |

---

## 5. Open questions answered

From docs/PLAN.md section 11. Record the answer, keep the same numbering.

| Q | Answer | Date |
|---|---|---|
| Q1 | | |
| Q2 | | |
| Q3 | Solfège (Đô Rê Mi Fa Sol La Si), fixed-do, as the default label. Minh only knows solfège, not letter names. Recorded as DR-8, built as task P1.8. | 2026-09-12 |

---

## 6. Parked ideas

Ideas that come up mid-work. Record here, do not build now. Review at the end of each phase.

| Date | Idea | From | Decision |
|---|---|---|---|
| 2026-09-12 | Constrain the editor to a musical scale (e.g. only diatonic notes of a chosen key), instead of free chromatic (any of 12 semitones) placement. | Minh, during P1.5 checkpoint | Not now. Recommended keeping free chromatic for v1 — Phase 1's goal is basic "higher/lower" understanding, not scale theory; scale-constrained placement adds a new concept (key/scale selection) and reduces experimentation freedom. Revisit after Phase 1 if Minh still wants it. |
| 2026-09-12 | Fixed slot grid (e.g. 8 equal-width cells, one note each, can be empty) instead of free click-to-place + drag-to-resize duration. | Minh, during P1.6 checkpoint (clicking imprecisely left gaps) | Not now. Recommended keeping free duration — note-length variation is rhythm, a core part of melody; a same-width grid would feel more like a scale exercise than composing. The actual pain point (imprecise clicks leaving gaps) is a snap-grid granularity issue, not a duration-freedom issue; if it recurs, coarsen the existing time snap (`TIME_STEP` in `main.ts`, currently 0.05s) instead of removing duration freedom. |
| 2026-09-12 | Further polish the skyline's sky background (Minh: "bầu trời trông không đẹp lắm, nhưng mà đẹp hơn lúc trước rồi") — gradient/ground styling in `src/ui/skyline.ts` is an improvement over flat black but not fully satisfying yet. | Minh, during P1.7 checkpoint | Parked at Minh's request ("để dành làm sau, chốt checkpoint P1.7 ở mức hiện tại"). Revisit with specific direction from Minh on what reads wrong (color, gradient, overall feel) before iterating further. |

---

## 7. Incidents and fixes

Environment, codec, library problems. Record so they are not repeated.

| Date | Incident | Fix | Related task |
|---|---|---|---|
| | | | |

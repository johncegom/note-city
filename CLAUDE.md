# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Scaffolded (P1.1): Vite + TypeScript (vanilla-ts template) + vitest.

- `npm run dev` — dev server at http://localhost:5173
- `npm test` — `vitest run`, must be green before every commit
- `npm run build` — `tsc && vite build`
- `npm run preview` — preview the production build

## Session start protocol

Read `PLAN.md` first, then `LEDGER.md` (status lives only in the ledger; the plan is stable and does not change during normal work). Skim `BUGS.md` and `RETRO.md` too — cheap, and either may change how the next task should be approached. Then:

1. Pick a task: lowest ID, not `done`, all dependencies `done`.
2. **Approval gate:** before writing any code, add a row to `LEDGER.md` section 1a with the task's DoD (copied from `PLAN.md`) and a Test Plan (exact commands, or the exact Minh checkpoint question). Only then set status to `doing`.
3. If `[harness]`: write the test first → run, see it fail (red) → implement → run, see it pass (green).
4. If `[skill]`: build it → hand it to Minh → ask the checkpoint question in `PLAN.md` → record Minh's words verbatim in `LEDGER.md`.
5. If you notice something wrong that isn't part of this task's DoD, log it in `BUGS.md` (a real defect) instead of fixing it inline — wait for an explicit decision unless it's actively dangerous (data loss, security), in which case fix now and tell Minh immediately.
6. `npm test` must be green before commit.
7. Update `LEDGER.md` (task status table + one session-log row). Never edit `PLAN.md` status — it has none; status only lives in the ledger.
8. Commit with the task ID as the message prefix, e.g. `P1.2: note mapping functions`. One task = one commit.
9. If something happened this session that would change how a *different future* task gets approached (not just this one) — a process/tooling lesson, not a product bug or design tradeoff — add a `RETRO-N` entry to `RETRO.md`.

## Hard rules (from PLAN.md section 0)

- **Thin harness, fat skill.** Code does only deterministic work (decode, transform, draw, play). Judgment calls ("does this sound right", "what comes next") belong to Minh and the agent, never hard-coded into the harness.
- **Subtract before add.** Don't add a library/module/feature unless a specific task needs it right now. Allowed dependencies are enumerated in `PLAN.md` section 3 — don't add anything outside that list without a task requiring it (e.g. `@spotify/basic-pitch` + `@tensorflow/tfjs` are explicitly deferred until P2.3; Tone.js, D3/chart libs, MIDI libs, and ffmpeg.wasm are explicitly disallowed for v1).
- **TDD for the harness.** Every pure function under `src/notes/`, `scheduler.ts`, `toMono`, `resample`, `hitTest`, `snap*`, and the MIDI encoder needs a test written before the implementation. `[skill]` tasks (Canvas drawing, audio feel, drag UX) have no automated test — they're verified by Minh directly.
- **Never self-mark a `[skill]` task done.** Only Minh's confirmation does that. Record what Minh said, verbatim and short, in `LEDGER.md` section 3.
- **Talk to Minh in Vietnamese**, short and simple — no music theory assumed, explain each term once on first use. Code, variable names, commit messages, and comments stay in English.
- **No scope growth mid-task.** New ideas go into `LEDGER.md` → "Parked ideas", not into the current task.

## Architecture (target, per PLAN.md section 2)

Single TypeScript app, runs entirely in the browser, no backend.

```
input (file/video, or YouTube via youtube-mcp outside the app)
  → decode → mono → resample to 22050 Hz (Web Audio API)     [src/audio/decode.ts]
  → transcribe: @spotify/basic-pitch → RawNote[]              [src/transcribe/, Phase 2 only]
  → notes: merge/filter/quantize (pure) → Note[]              [src/notes/]
  → skyline (Canvas, draw + drag) ⇄ synth (Web Audio, play)   [src/ui/, src/audio/]
```

- **Phase 1** (committed) builds the bottom half only: hand-placed notes → skyline → synth → drag editor. No input, no transcription.
- **Phase 2** (committed) builds the top half: real audio input → Basic Pitch transcription → wired into the Phase 1 skyline/editor.
- **Phase 3** (stretch, only after Phase 1+Phase 2 land and Minh is still engaged): editing real transcribed songs, JSON save/load, MIDI export.
- **D1–D4** (deferred, not committed): vocal separation, tempo/beat snapping, chords, AI recombination.

All modules communicate through one shared type in `src/notes/types.ts` (`Note`, `RawNote`, `Project` — see `PLAN.md` section 4). No module invents its own note shape. Key convention: `midi` is an integer 0–127, 60 = middle C (C4), pitch is snapped to integer semitones by design (DR-4 — real pitch bend is deferred).

Planned folder layout: `src/notes/` (data model + pure functions, TDD), `src/audio/` (decode, synth, scheduler), `src/transcribe/` (Basic Pitch wrapper, Phase 2), `src/ui/` (skyline canvas, editor), `test/fixtures/` (synthetic audio generated in code — never commit binary audio fixtures).

## Input handling

Normalize all audio to **mono, 22050 Hz, Float32Array** after decode — Basic Pitch resamples to 22050 itself, so higher rates are wasted. YouTube links are resolved *outside* the app via `youtube-mcp download_audio` → file → into the app (browser YouTube downloads are blocked by CORS/ToS; see DR-5). If `decodeAudioData` rejects a format, fall back to `ffmpeg -i input.<ext> -ac 1 -ar 22050 -t 60 output.wav` run outside the app — do not embed ffmpeg.wasm.

## Testing conventions

Contract tests for the Basic Pitch wrapper check shape (a note exists, correct midi, duration in range) using sine waves generated in code (`makeSine(freqHz, seconds, sampleRate)`) — never check exact note counts on a real song, and never commit audio fixture files. Everything else under `src/notes/`, `hitTest`/`snap*`, and codecs is unit-tested with real assertions, written before the implementation.

## Proportionality

Overengineering is code or process that solves a problem the project doesn't have. Before adding an abstraction, a defensive guard, or another piece of process ceremony, name the real, currently-reachable reason for it — "just in case" is not a reason. The process below is deliberately chosen to be full-weight (approval gate, bug log, decision log, retro log) even though the project is solo, because Minh asked for it explicitly as drift protection — not because a solo project always needs it. If a piece of it starts being filled out as an after-the-fact formality rather than actually gating work, that's a signal to lighten it, not a reason to keep performing it silently.

## When to re-calibrate this setup

Re-run calibration (see the `/bootstrap-way-of-working` skill) if any of these happen:
- A second contributor (human or a separate AI session acting independently) starts working on this repo — the case this setup was built for even pre-emptively.
- The project starts handling anything beyond Minh's own local use (other users, real money, credentials, shared data) — round the process up further, not down.
- Any log (`BUGS.md`, `RETRO.md`, `PLAN.md` DR-N) goes several tasks without an entry even though tasks of the kind it should catch clearly happened, or the approval-gate row in `LEDGER.md` 1a is being written after the code instead of before — either is the "looks authoritative while being stale" failure; name it to Minh and consider lightening that specific artifact rather than leaving it to rot.

## Full plan and history

`PLAN.md` is the stable contract: goals, architecture, per-task DoD, dependency allow-list, risk/fallback table, and decision records (DR-1..DR-5) with rationale for every major choice (TS-in-browser over Python/Go, Phase 1-before-Phase 2 ordering, ledger split from plan, integer pitch snapping, YouTube handled outside the app). Read it in full before starting work — this file is a summary, not a replacement. Log a new deliberate tradeoff as `DR-N` there when a reasonable person might have chosen differently.

`LEDGER.md` holds everything that changes session to session: task approval log, task status, session log, Minh's checkpoint words, end-of-phase reviews, parked ideas, and incidents. Update it with `str_replace` anchored on the last row of the relevant table — never rewrite the whole file.

`BUGS.md` holds known defects pending a fix decision — log, don't silently fix, unless it's actively dangerous.

`RETRO.md` holds process/tooling/collaboration lessons that generalize beyond one task. A lesson about only this one task goes in its `LEDGER.md` session-log row instead.

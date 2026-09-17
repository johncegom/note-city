# note-city — Build Plan

> Read this file at the start of every session. Then read `docs/LEDGER.md` to know where things stand.
> This file is stable. Status, results, and lessons live in `docs/LEDGER.md`, not here.

Plan version: 1.0 (2026-09-11)
Project owner: Minh
Executor: agent (Claude Code, Sonnet 5)
Minh's role: player, decision-maker, and the "ears" for quality checks.

---

## 0. Rules for the agent

Read carefully. These rules win over any ad-hoc judgment.

1. **Thin harness, fat skill.** Code only does deterministic work: decode audio, transform data, draw, play sound. Every judgment ("does this sound right", "is this note correct", "what comes next") belongs to the agent and Minh. Never hard-code judgment into the harness.
2. **Subtract before add.** Before adding a library, module, or feature, ask "can something be removed instead?". Only add a dependency when a specific task needs it. The allowed list is in section 3.
3. **TDD for the harness.** Pure functions get tests written before the implementation. Tasks marked `[harness]` must have tests. Tasks marked `[skill]` are checked by Minh's ears and eyes, with no automated test.
4. **Never self-mark done.** A `[skill]` task is done only when Minh confirms. Record Minh's words in the ledger, verbatim, short.
5. **Language.** Talk to Minh in Vietnamese: short sentences, simple words. Code, variable names, commit messages, and comments in English.
6. **Explain each music term once**, the first time it appears, then stop. Minh does not know music theory. Assume nothing.
7. **Minh learns by experiment, not by lecture.** When Minh asks "why does this note sound odd", offer an experiment first ("drag it up 2 steps and listen again") instead of theory.
8. **One task, one commit.** Commit message starts with the task ID, e.g. `P1.2: note mapping functions`.
9. **No scope growth mid-task.** New ideas go to `docs/LEDGER.md` section "Parked ideas". Do not build them now.

### Session protocol

```
1. Read docs/PLAN.md → docs/LEDGER.md
2. Pick a task: lowest ID, not done, all dependencies done
3. If [harness]: write test → run, see red → implement → run, see green
4. If [skill]: build → hand to Minh → ask the checkpoint question → record Minh's words
5. npm test must be green before commit
6. Update docs/LEDGER.md (status table + one session-log row)
7. Commit with task ID
```

---

## 1. Goal

**End state (v1):** A web page running on Minh's machine. Notes appear as a "city": each note is a building. Taller building = higher note. Wider building = longer note. Minh places notes, drags notes, hears the result at once. Minh loads a real song, sees its skyline, edits it, listens again.

**Completion evidence for v1:**
- Minh builds an 8-note melody by hand that Minh judges "sounds okay".
- Minh can say, in Minh's own words, why a chosen note is high or low.
- Minh loads a real song clip and points to at least one place where the skyline matches what Minh hears.

**Non-goals for v1:**
- Separating vocals from backing track (Demucs) — needs a backend, later.
- Multiple instruments at once.
- AI-generated new songs.
- Deploying for other people. Mobile.
- Chords / harmony. Single melody only (one note at a time).

### Known facts
- Personal use. No other users.
- Minh is a software engineer (React Native, JS/TS; Go; former telecom/Erlang). No music theory background.
- Minh chose option 1: TypeScript, running entirely in the browser.
- v1 inputs: video files, YouTube links, mp3, m4a, aac, wav, flac.
- Minh uses Claude Code with Sonnet 5.
- Minh already has `youtube-mcp` with `download_audio`.

### Assumptions (correct if wrong)
- The project lives in a git repo on Minh's machine. Not in the chat container (it resets every session).
- Primary browser is latest Chrome.
- Initial test clips are ≤ 5 minutes (was ≤ 60 seconds; changed at P2.5 — see DR-12).

### Unknowns (do not guess)
- How much time Minh spends per week. So the plan is split into **phases**, not calendar dates. A phase counts when it is finished.
- The specific song Minh wants to try. Known at Phase 2.

---

## 2. Architecture

One TypeScript app, in the browser, no backend.

```
                      ┌──────────────────────────────────────────┐
  file / video ──────▶│  input        decode → mono → 22050 Hz   │
  (YouTube → file     │  adapter      (Web Audio API)            │
   via youtube-mcp)   └──────────────┬───────────────────────────┘
                                     │ Float32Array (PCM)
                                     ▼
                      ┌──────────────────────────────────────────┐
                      │  transcribe   @spotify/basic-pitch (JS)  │  ← Phase 2
                      │               → RawNote[]                │
                      └──────────────┬───────────────────────────┘
                                     │
                                     ▼
                      ┌──────────────────────────────────────────┐
                      │  notes        merge / filter / quantize  │  ← harness, TDD
                      │  (pure)       → Note[]                   │
                      └──────┬──────────────────────┬────────────┘
                             │                      │
                             ▼                      ▼
                  ┌────────────────────┐   ┌────────────────────┐
                  │ skyline (Canvas)   │   │ synth (Web Audio)  │
                  │ draw + drag        │   │ play Note[]        │
                  └────────────────────┘   └────────────────────┘
                             ▲                      ▲
                             └──── editor ──────────┘
                                   (Minh drags → Note[] changes → redraw + replay)
```

Phase 1 builds the lower half (notes → skyline → synth → editor) with hand-placed notes. No input, no transcription.
Phase 2 builds the upper half (input → transcribe) and wires it in.

### Harness vs skill in this project

| Part | Type | Verified by |
|---|---|---|
| decode / downmix / resample | harness | tests with synthetic buffers |
| mapping midi ↔ freq ↔ height ↔ name | harness | unit tests |
| merge / filter / quantize | harness | unit tests |
| scheduler (which note plays when) | harness | unit tests |
| hit-test, snap while dragging | harness | unit tests |
| calling Basic Pitch | harness (contract) | tests with synthetic sine waves |
| does the skyline "feel right" | skill | Minh's eyes |
| do notes sound clearly different | skill | Minh's ears |
| does the real-song transcription match the ear | skill | Minh's ears |
| next step, what to cut, what to add | skill | agent + Minh |

---

## 3. Stack and dependencies

**Allowed now:**
- `vite`, `typescript`, `vitest` — scaffold, build, test.
- `@spotify/basic-pitch` + `@tensorflow/tfjs` — add only at P2.3, not earlier.

**Do not add until a task needs it:**
- Tone.js — a Web Audio oscillator is enough for the v1 synth.
- D3 / chart libraries — Canvas 2D is enough for the skyline.
- MIDI library — JSON is the primary save format. MIDI only if Minh needs to open files in another tool (P3.3, stretch).
- ffmpeg.wasm — use the ffmpeg CLI outside the app when needed, do not embed it.

**Folder structure:**
```
note-city/
  docs/
    PLAN.md
    LEDGER.md
    BUGS.md
    RETRO.md
  index.html
  src/
    notes/        # data model + pure functions (TDD)
    audio/        # decode, synth, scheduler
    transcribe/   # Basic Pitch wrapper (Phase 2)
    ui/           # skyline canvas, editor
    main.ts
  test/
    fixtures/     # synthetic wav generated in code; do not commit large binaries
```

---

## 4. Data contract

Every module talks through this type. No module invents its own note type.

```ts
// src/notes/types.ts
export type Note = {
  id: string;        // stable across edits
  midi: number;      // 0..127. 60 = C4 (middle C). +12 = one octave higher
  start: number;     // seconds from the start of the clip
  duration: number;  // seconds, > 0
  velocity: number;  // 0..1, loudness. v1 default 0.8
};

export type RawNote = Note & { confidence: number }; // from transcribe, not yet cleaned

export type Project = {
  version: 1;
  notes: Note[];
  tempoBpm?: number;      // unused in Phase 1
  sourceName?: string;    // original file name if any
};
```

Explained once:
- **midi**: an integer for pitch. Each +1 is one semitone higher, the smallest step on a piano. 60 is the C key in the middle of the keyboard.
- **octave**: 12 steps apart. Two notes one octave apart sound "the same, but one is higher".

---

## 5. Input

The model needs **raw audio samples** (PCM). Every other format is just a wrapper.

| Input | v1 handling | Risk | Fallback |
|---|---|---|---|
| mp3, wav | `decodeAudioData` in the browser | low | — |
| m4a, aac | `decodeAudioData` | Chrome supports; other browsers may not | ffmpeg → wav |
| flac | `decodeAudioData` | Chrome supports | ffmpeg → wav |
| video (mp4, mkv, webm) | `decodeAudioData` takes the audio track, drops video | mkv may not decode | ffmpeg → wav |
| YouTube link | **outside the app**: `youtube-mcp download_audio` → file → into the app | 429 rate limit | sleep 8→10→15 s, retry |

Generic fallback command, run outside the app:
```
ffmpeg -i input.<ext> -ac 1 -ar 22050 -t 300 output.wav
```
(`-ac 1` mono, `-ar 22050` sample rate, `-t 300` first 5 minutes — see DR-12)

Inside the app, after decoding, always normalize to: **mono, 22050 Hz, Float32Array**. Basic Pitch resamples to 22050 itself, so anything higher is wasted. Mono because pitch does not depend on left/right channel.

Rule for choosing a test clip at Phase 2: one voice or one instrument, little backing, ≤ 5 minutes. A full mix will produce noisy notes — that is why source separation is Deferred, not an app bug.

---

## 6. Scope and phases

**Committed:** Phase 1, Phase 2.
**Stretch:** Phase 3 (start only when Phase 1 and Phase 2 are done and Minh is still engaged).
**Deferred:** D1–D4 (recorded so they are not forgotten; not committed).

Effort is an **estimate**, counted in agent sessions, not Minh's hours. One "session" = one continuous stretch of agent work until the task is green or blocked. After each phase, compare estimate with actual in the ledger and adjust the next phase.

### Phase 1 — Playground: hand-placed notes, listen and drag

Goal: the loop **place → listen → drag → listen again** works. No AI. No input file.

Why Phase 1 before Phase 2: this is the part that produces understanding. Transcription (Phase 2) is just a way to load data, and it is the riskiest part. Put the cheap, reliable, high-learning-value part first.

| ID | Task | Type | Dependency | Effort (est.) | DoD |
|---|---|---|---|---|---|
| P1.1 | Scaffold: Vite + TS + vitest. One trivial test. | harness | — | 1 session | `npm run dev` opens a blank page. `npm test` green. |
| P1.2 | `src/notes/`: `Note` type; `midiToFreq`, `midiToName` (60→"C4"), `midiToHeight(midi, range)`, `durationToWidth(sec, pxPerSec)`. | harness | P1.1 | 1 session | Tests written first. Edge cases: midi outside 21..108, duration 0. Green. |
| P1.3 | `src/audio/synth.ts`: `playNote(freq, start, dur)` with OscillatorNode + short gain envelope (avoid clicks). `src/audio/scheduler.ts`: `schedule(notes, now) → {freq, at, dur}[]` (pure). | harness + skill | P1.2 | 1 session | Pure scheduler tested. **Minh checkpoint:** press 2 buttons, hear 2 notes 12 steps apart — Minh says which is higher. |
| P1.4 | `src/ui/skyline.ts`: draw `Note[]` as buildings on Canvas. Vertical = midi, horizontal = time. Playhead moves during playback. Hover shows note name (C4, D4…). | skill | P1.2, P1.3 | 1–2 sessions | **Minh checkpoint:** look at 5 buildings, point to the tallest before listening, then listen to confirm. |
| P1.5 | Editor: click empty space → add building. Drag vertically → change midi, snap to integer. Drag right edge → change duration. Release → play that note. `hitTest`, `snapMidi`, `snapTime` are pure. | harness + skill | P1.4 | 2 sessions | hitTest/snap tested. **Minh checkpoint:** drag a building up 1 step, listen; up 12 steps, listen — describe the difference in Minh's words. |
| P1.6 | Seed: preload a simple 8-note melody (C major scale ascending: 60 62 64 65 67 69 71 72). "Clear all" and "Play" buttons. | skill | P1.5 | 0.5 session | **Phase 1 final checkpoint:** Minh clears the seed, builds 8 notes, says "sounds okay", and explains 1 choice. Record verbatim in the ledger. |
| P1.7 | Frontend redesign of the Phase 1 playground (layout, type, color, spacing) using the `/frontend-design:frontend-design` skill for aesthetic direction. No new functionality — same buttons/canvas/editor, restyled. | skill | P1.6 | 1 session | **Minh checkpoint:** looking at the page, Minh says it reads as a considered design, not the default Vite scaffold look, and every existing control (buttons, canvas, hover label) still works exactly as before. |
| P1.8 | `src/notes/mapping.ts`: `midiToSolfege(midi)` (60→"Đô4", fixed-do: Đô=C, Rê=D, Mi=E, Fa=F, Sol=G, La=A, Si=B; sharps as e.g. "Đô#4"). Hover label shows solfège as the default name, letter name alongside. | harness + skill | P1.2 | 0.5 session | Tests written first, same edge cases as `midiToName`. **Minh checkpoint:** hover a few buildings, Minh says the label reads naturally to him (Đô Rê Mi..., not C D E). |
| P1.9 | 3 pre-made example melodies (well-known, simple, pleasant-sounding tunes) as buttons alongside the P1.6 seed, each loading its own note set into the skyline. | skill | P1.6 | 0.5 session | **Minh checkpoint:** Minh plays each of the 3 presets and says whether it sounds pleasant/recognizable, not just "notes playing". |
| P1.10 | Fix BUGS.md BUG-2 (right-edge clipping): widen the skyline canvas (5s → 7s of room) and clamp click-to-add / duration-drag so a note can never be placed or resized past the visible canvas edge. | harness + skill | P1.5, P1.7 | 0.5 session | Minh can build a full melody (8+ notes at varied durations) without hitting an invisible/unreachable edge. **Minh checkpoint:** Minh tries to place and stretch a note near the right edge and confirms it no longer clips or becomes ungrabbable. |
| P1.11 | Playground interaction polish, 3 parts: (a) instant micro-feedback — a visible "pop" on note placement and a live pitch/duration readout while dragging, on top of the existing P1.4/P1.5 hitTest/hover mechanics; (b) in-memory undo (last-state stack, no persistence) for add/drag/delete/"Clear all"; (c) a visible stop-cue (e.g. edge highlight) when a drag hits the P1.10 canvas boundary, so the clamp reads as intentional. `src/ui/history.ts` (`pushHistory`, `undo`, pure) backs part (b). | harness + skill | P1.10 | 1 session | `pushHistory`/`undo` tested (edge cases: empty stack, undo past the start). **Minh checkpoint:** Minh places/drags a few notes and confirms feedback feels immediate; presses undo after a "Clear all" and gets the melody back; drags a note to the right edge and sees a clear stop-cue instead of it just refusing to move. |

**First action (15–30 minutes):** P1.1. `npm create vite@latest note-city -- --template vanilla-ts`, add vitest, write `test/smoke.test.ts` with `expect(1+1).toBe(2)`, run green, commit `P1.1: scaffold`.

**Phase 1 contingency:** total estimate 7.5–8.5 sessions (includes P1.7, added after Phase 1 was already underway). Hold ~20% extra (1.5 sessions) for Canvas/drag pixel issues — these usually take longer than planned.

### Phase 2 — Real song into the skyline

Goal: file/video/YouTube → skyline → original audio plays in sync with the playhead. Minh compares ear with eye.

| ID | Task | Type | Dependency | Effort (est.) | DoD |
|---|---|---|---|---|---|
| P2.1 | `src/audio/decode.ts`: `<input type=file>` accepts audio + video → `decodeAudioData` → `toMono(buffer)` → `resample(buffer, 22050)` (OfflineAudioContext). | harness | Phase 1 done | 1–2 sessions | `toMono` tested with a synthetic 2-channel buffer. `resample` keeps the same length in seconds. mp3, wav, m4a, mp4 open in Chrome. |
| P2.2 | Write `docs/input.md`: YouTube → `youtube-mcp download_audio` → file procedure; ffmpeg fallback command. No code. | skill | — | 0.5 session | Minh follows the doc and gets a wav file from a YouTube link. |
| P2.3 | `src/transcribe/basicPitch.ts`: add `@spotify/basic-pitch` + tfjs. `transcribe(pcm) → RawNote[]`. Contract test: 440 Hz sine, 1 s → a RawNote with midi 69, duration 0.8–1.2 s. Test 2: two sines in sequence (440 then 880) → 2 notes, midi 69 then 81, in order. | harness (contract) | P2.1 | 2 sessions | Both contract tests green. Sine fixtures generated in code; no wav files committed. |
| P2.4 | `src/notes/clean.ts`: `filterShort(notes, minDur)`, `filterLowConfidence(notes, min)`, `mergeAdjacent(notes, gap)` — same midi, gap smaller than threshold → merge. | harness | P2.3 | 1 session | Tests first, including edges: empty array, one note, two notes with the same start. |
| P2.5 | Wire: file → decode → transcribe → clean → skyline. Toggle "play original" / "play synth". Playhead synced to the original. | skill | P2.1, P2.3, P2.4 | 1–2 sessions | **Phase 2 final checkpoint:** Minh loads a clean clip ≤ 5 minutes (see DR-12). Minh points to at least 1 place where the skyline matches the ear, and 1 place where it does not (if any). Record both. |
| P2.6 | Import UX polish (see DR-13, docs/BUGS.md BUG-6), 2 parts: (a) real progress/error feedback while a file goes through decode → transcribe → clean — a spinner during decode, a real percentage progress bar during transcribe (wiring `transcribe()`'s new optional `onProgress` callback to Basic Pitch's existing `percentCallback`), a visible error banner if any stage throws — so Minh can tell running vs. hung vs. errored at any moment; (b) reflow the page so the skyline canvas (the one shared visualization both hand-editing and import feed into) reads as the primary element — moved above the hero copy, enlarged, with the hand-editor and import controls as secondary panels beneath it. No change to `transcribe()`'s existing return shape/behavior, only an added optional parameter; CSS/markup/wiring only otherwise. | harness + skill | P2.5 | 1 session | `npm test` green, including a new test confirming `onProgress` is called with values reaching 1.0. **Minh checkpoint:** (a) import a real clip and confirm Minh can tell at every moment whether it's decoding/transcribing (with a real % moving)/done/failed, without guessing; (b) looking at the page, Minh says the skyline reads as the main focus, not the header or the Play C4/C5 buttons. |

**Phase 2 contingency:** estimate 5.5–7.5 sessions. Hold ~30% (2 sessions) — higher than Phase 1 because tfjs model loading, browser codecs, and transcription quality are all unknowns outside our control.

**How to read Phase 2 results for Minh** (skill, not an app bug):
- Many tiny buildings scattered between real ones → usually backing track or vocal vibrato. Raise `minDur` or `min confidence`; do not touch the model.
- Skyline has the "right shape" but the whole block is shifted up/down by 12 → octave error, common with voices. Accept in v1, note it in the ledger.

### Phase 3 — Edit the real song, save, take it elsewhere (stretch)

| ID | Task | Type | Dependency | Effort (est.) | DoD |
|---|---|---|---|---|---|
| P3.1 | Editor (P1.5) works on transcribed notes. "Play synth of edited version" button. Fix BUGS.md BUG-7 (real-song skyline too dense to edit) if it reproduces. Hover affordance on a building's editable spots (top = pitch, right edge = duration), added mid-task at Minh's request. | skill | Phase 2 done | 1 session | Minh edits 3 notes of a real song, listens, says how it differs from the original; confirms editing is possible even on a dense real song; confirms the hover cues make it clear where a drag will grab. |
| P3.2 | Save/load `Project` JSON (download/upload file). localStorage for work in progress. | harness | P3.1 | 1 session | Round-trip test: `parse(serialize(p))` equals `p`. |
| P3.3 | Export MIDI file (only if Minh wants to open it in another tool). Small pure encoder, TDD. | harness | P3.2 | 1–2 sessions | Test: 1 note → correct header + track bytes. File opens in any MIDI tool. |

### Deferred — recorded so they are not forgotten

- D1. Vocal separation (Demucs). Needs a Python backend or a CLI on Minh's machine. Only when Phase 2 shows a full mix is something Minh really wants to try.
- D2. Rhythm: tempo detection, snapping notes to a beat grid. Minh should first understand "beat" through the playground.
- D3. Chords / multiple notes at once.
- D4. Recombining old notes into a new song with AI. Symbolic music generation is still weak. Re-evaluate after Phase 3.

---

## 7. TDD protocol

**Tests required:** every function in `src/notes/`, `scheduler.ts`, `toMono`, `resample`, `hitTest`, `snap*`, MIDI encoder. Write the test first. Run and see red. Then implement.

**Contract tests (check shape, not exact values):** the Basic Pitch wrapper. Input is a sine wave generated in code. Check: a note exists, correct midi, duration in range. Do not check the exact note count on a real song — that is Minh's ears' job.

**No automated tests:** Canvas drawing, how audio sounds, drag UX. These are `[skill]`, verified by Minh checkpoints.

**Fixtures:** generated in the test code (`makeSine(freqHz, seconds, sampleRate)`), never committed as binary files. Reason: a generated fixture is reproducible, and the repo stays light.

**Why TDD here and not elsewhere:** a data-transform function that fails silently produces a skyline that "looks plausible" but is wrong — Minh learns the wrong thing without knowing. Tests keep the data layer trustworthy, so if something is wrong it is in the transcription layer, where Minh's ears catch it.

---

## 8. Resilience

**Bad-day minimum (2–5 minutes):** open the playground, play the seed, drag one building, listen. No code. Stays in contact with the learning goal, not streak maintenance.

**Rollback trigger:** 2 consecutive sessions with no task reaching DoD.
**Rollback action:** cut the current task's scope (e.g. drop right-edge drag, keep vertical drag only). Return to the last green commit. Do not cut tests. Do not cut Minh checkpoints.

**Risks and fallbacks:**

| Risk | Signal | Fallback |
|---|---|---|
| tfjs + Basic Pitch slow / heavy | > 10 s for 30 s of audio | Cap at 5 minutes (see DR-12). Show a progress bar. If still bad: move transcription to a Python CLI outside the app; the app only reads JSON (option 1 stays for everything else). |
| Browser codec cannot decode | `decodeAudioData` rejects | ffmpeg → wav outside the app. See section 5. |
| Noisy transcription on a real song | many tiny buildings | Pick a cleaner clip. Raise filter thresholds. Do not change the model. Note it for D1 consideration. |
| Canvas drag eats time | P1.5 exceeds 2× estimate | Cut to vertical drag only. Change duration via a number input. |
| Minh loses interest because Phase 1 is "too simple" | checkpoint feedback | Good signal: Phase 1 finished early, go to Phase 2 now. Do not stretch Phase 1. |
| Minh cannot read the Phase 2 output | cannot point to a matching spot | Go back to Phase 1 with 3 notes of that song placed by hand, compare with the 3 transcribed buildings. |

---

## 9. Control and replanning

**Review triggers:**
- End of each phase.
- Any task exceeding 2× its estimate.
- Rollback trigger in section 8.

**At review, do 3 things:**
1. Fill the "actual" column in the ledger for each task. Compare with the estimate.
2. Write 1 line on the cause of variance (no apologies, just the cause).
3. Adjust estimates and contingency for the next phase. If variance > 50%, raise next phase's contingency to 30%.

**Real success measure:** the evidence in section 1, not the number of tasks finished on time.

---

## 10. Decision record

Each decision: problem → choice → why → why not the alternatives → revisit when.

**DR-1. Language: TypeScript in the browser.**
Problem: need the shortest listen–drag–listen loop. Choice: TS + Web Audio + Canvas, no backend. Why: a single HTML file runs, nothing to install; Minh has a JS background. Why not Python: every strong music library is Python, but the understanding-producing part (Phase 1) does not need them; two languages = two environments to connect. Why not Go: no note-transcription or source-separation libraries; Go would only be a shell around Python. Revisit when: D1 (source separation) is needed — then add a Python CLI outside the app, do not rewrite the app.

**DR-2. Phase 1 (hand-placed) before Phase 2 (transcription).**
Problem: the first plan put AI transcription first and had no "change" step. Choice: reverse the order. Why: learning comes from changing and re-listening, not from looking. Phase 1 has no model risk. Why not in parallel: one person, one loop; parallel work dilutes the checkpoints. Revisit when: Minh finds Phase 1 too easy — then shorten it, do not skip it.

**DR-3. Ledger separate from the plan.**
Problem: the plan must stay stable so the agent trusts it; status changes every session. Choice: separate `docs/LEDGER.md`, append-only. Why: the agent edits the ledger with `str_replace` anchored to the last row and never touches the plan; git diffs stay clean; matches the ledger workflow Minh already uses for youtube-critic. Why not integrated: a file that is both contract and journal means every append can accidentally alter the contract. Revisit when: the project becomes so small that 2 files is overkill (not expected).

**DR-4. Snap pitch to integers (semitones).**
Problem: real singing slides between notes. Choice: v1 snaps to integers. Why: Minh needs clear steps to understand "one step higher" before understanding "sliding". Why not keep fractional values: the skyline would have odd-height buildings with no visible steps. Revisit when: Minh asks "why does the singer's voice not match the building" — that is the moment to introduce pitch bend.

**DR-5. YouTube handled outside the app.**
Problem: downloading YouTube audio in the browser is blocked (CORS, ToS). Choice: `youtube-mcp download_audio` → file → app. Why: the tool exists, the 429 handling exists. Why not embed: adding a backend for one input path violates "subtract before add". Revisit when: YouTube becomes Minh's main input and the manual step is a real annoyance.

**DR-6. CI on GitHub Actions: typecheck + test + build, required on `main`.**
Problem: nothing enforced "`npm test` must be green before commit" once work moved to PRs — a red PR could still get merged by mistake. Choice: `.github/workflows/ci.yml` runs `tsc --noEmit`, `npm test`, `npm run build` on every push/PR targeting `main`; branch protection on `main` requires this check to pass before merge. Why: matches the existing local discipline, catches the same 3 failure classes (types, logic, bundling) cheaply on Node 22. Why not more (lint, coverage threshold): no linter or coverage tooling chosen yet — subtract before add; revisit if one is added for a task. Why not skip branch protection: a required-but-unenforced check gets ignored under time pressure. Revisit when: a task needs a second CI job (e.g. Basic Pitch model download at P2.3 makes `npm run build` slow) — split jobs then, not now.

**DR-7. Frontend redesign gets its own task (P1.7), sequenced after P1.6, not folded into P1.4/P1.5.**
Problem: the Phase 1 UI has been default Vite-scaffold styling since P1.1; Minh asked to add a redesign task using the `/frontend-design:frontend-design` skill. Choice: a separate task, depending on P1.6 (all of Phase 1's functionality), instead of restyling piecemeal inside P1.4 (skyline) or P1.5 (editor). Why: restyling before the editor/seed exist means redoing it once more controls land — one pass over the finished Phase 1 surface is cheaper than several partial ones. Why not skip a formal task: it changes layout/type/color across the app, which is worth a Minh checkpoint like any other `[skill]` change, not a silent drive-by edit. Revisit when: Phase 2 adds enough new UI (file input, transcription progress) that another design pass is worth its own task.

**DR-8. Note names default to Vietnamese solfège (Đô Rê Mi...), answering Q3 early, as its own task (P1.8) not folded into P1.5's checkpoint.**
Problem: Minh only knows basic solfège (Đô Rê Mi Fa Sol La Si), not letter names (C D E); the P1.5 checkpoint surfaced this directly ("có cách diễn đạt nào khác gần gũi hơn không"), ahead of section 11's original plan to resolve Q3 after Phase 1. Choice: a small task, P1.8, depending only on P1.2 (`src/notes/mapping.ts`) — add `midiToSolfege` alongside the existing `midiToName`, default the display to solfège. Fixed-do (Đô always = C, not relative to a key) because v1 has no concept of key/scale yet (see the parked scale-constraint idea in `docs/LEDGER.md` section 6) — movable-do would need one. Why answer Q3 now instead of waiting: the label is what Minh reads on every checkpoint from here on; waiting means re-teaching himself letter names he doesn't actually want. Why a separate task instead of amending P1.4/P1.5's done checkpoints: those already passed with Minh's verbatim words recorded: relabeling is a new, testable, checkpointable change of its own, not a retroactive edit to closed history. Revisit when: Phase 2's transcribed notes need key detection for other reasons — movable-do becomes worth adding then.

**DR-9. 3 pre-made example melodies (P1.9), not a fixed-slot grid, in response to the P1.6 checkpoint.**
Problem: during the P1.6 checkpoint, Minh found free click-to-place editing imprecise (gaps between notes) and asked whether a fixed slot grid (X cells, one note each) would help, and separately asked for a few ready-made, pleasant-sounding example melodies. Choice: keep free duration (a fixed same-width grid would remove rhythm — note-length variation — which is core to melody, not just a UX inconvenience; the actual pain point is snap-grid granularity, not duration freedom, and `TIME_STEP` can be coarsened later if it recurs — logged as a parked idea, not built) and add a new small task, P1.9, for 3 example melodies (well-known simple tunes: Twinkle Twinkle Little Star, Mary Had a Little Lamb, Ode to Joy's opening phrase) as buttons next to the P1.6 seed. Why not fold into P1.6: P1.6's DoD and checkpoint were already written and approved for exactly one seed melody plus Clear/Play; 3 more melodies is new, separately checkpointable scope. Revisit when: Minh still finds click-to-place imprecise after `TIME_STEP` is coarsened — then reconsider a grid.

**DR-10. Playground interaction polish (P1.11) scoped as one combined task, added after Phase 1 closed.**
Problem: post-P1.10, an agent brainstorm produced 3 UX ideas (instant micro-feedback, in-memory undo, edge-drag stop-cue), logged as parked ideas in `docs/LEDGER.md` section 6; Minh then asked to scope all 3 into the next task rather than leaving them parked. Choice: one task, P1.11, depending only on P1.10 (all 3 build on already-shipped P1.4/P1.5/P1.10 mechanics, no new deps). Why combined instead of 3 separate tasks: each idea alone is too small to be its own session (sub-0.5-session polish), and they share one Minh checkpoint (exercise the playground, confirm each of the 3 feels right) rather than 3 redundant ones. Undo gets a pure `src/ui/history.ts` (push/undo) since it's deterministic stack logic, not judgment — the other two stay `[skill]` (visual/timing feel). Revisit when: if any one part turns out to need its own iteration loop with Minh, split it out of P1.11 into its own task rather than reopening a "done" P1.11.

**DR-11. `resample` (P2.1) is exempt from the TDD hard rule; `toMono` stays TDD'd.**
Problem: section 0 rule 3 requires tests-before-implementation for harness pure functions, and P2.1's DoD names `resample` alongside `toMono` as if both were pure — but the DoD also specifies `resample` uses `OfflineAudioContext`, a Web Audio API with no real implementation or polyfill available in the vitest/Node test environment (jsdom is not on the allow-list, and existing polyfills for it are approximations, not real behavior). Choice: implement `resample` as a thin (~10-line) wrapper directly on `OfflineAudioContext`, unautomated-tested, verified manually in-browser (decode a known file, assert `sampleRate === 22050` and duration preserved); `toMono` stays a genuinely pure function, TDD'd as normal. Why not hand-roll resampling to make it Node-testable: naive linear interpolation has no anti-aliasing filter, so downsampling 44100→22050 folds content above 11 kHz back into the audible band as aliases — this lands directly on Basic Pitch's input at P2.3 and can produce phantom pitches; `OfflineAudioContext` gives a correct resampler for free, and trading that for testability optimizes the process at the product's expense. Why not add a jsdom Web Audio polyfill: buys a dependency (violates "subtract before add") without buying real test coverage, since no available polyfill implements actual resampling DSP. Decided via the repo's Advise mechanism (`claude-opus-5`, 2026-09-17). Revisit when: a real Web Audio test environment becomes available/needed for another task, or `resample`'s wrapper grows non-trivial logic beyond the `OfflineAudioContext` call itself — then reconsider testing it.

**DR-12. Raise the target input length from ≤ 60 seconds to ≤ 5 minutes; fix `playAll`'s scheduler to not stall on long clips.**
Problem: during the P2.5 checkpoint, Minh loaded a real 270.62s song ("LAVIEM.mp3"), which transcribed to 2336 notes; "Play synth"/the skyline's "Play" produced no audible sound (BUG-5), while "Play original audio" worked fine. Investigation (synthetic reproductions in the browser, not guesswork) found the cause: `playAll` created one `OscillatorNode`/`GainNode` pair per note *up front*, all at once — for 2336 notes this delayed the first audible sound by roughly a second in testing (500 notes over 60s: sound starts within ~100ms; 2336 notes over 270s: silence for ~900ms+ first). `playOriginal` has no such delay since it plays one pre-rendered `AudioBufferSourceNode`, not one node per note. Minh then said the product isn't worth much unless it can handle up to 5-minute inputs. Choice: (a) raise the target/assumed input length everywhere from ≤60s to ≤5min (this file's Assumptions, section 5's ffmpeg fallback and clip-picking rule, the risk table, P2.5's checkpoint wording); (b) fix `playAll` with a lookahead scheduler (schedule only the next `SCHEDULE_AHEAD_SEC = 2` seconds of notes at a time, topping up every animation-frame tick) — a standard Web Audio pattern for exactly this class of problem, not a novel design — so the number of live nodes stays small (tens, not thousands) regardless of song length. Why not just cap input at 60s (the previously-parked idea) instead: that was Minh's own product judgment call, made after seeing the bug — a hard cap would work around the symptom rather than fix the actual scaling problem, and 60s of real material is often too short to judge "does this sound like the song" against. Why not reduce note counts instead (raise `clean.ts`'s default filter thresholds for long clips) as the primary fix: that trades fidelity for a symptom that's actually a scheduling architecture problem, not a note-count problem — the lookahead scheduler fixes the root cause without touching transcription quality. Revisit when: a real clip near 5 minutes shows transcription (not playback) itself is too slow or the canvas redraws thousands of buildings every animation frame slowly enough to matter — neither observed yet, but flagged as things to watch, not built preemptively (see docs/BUGS.md BUG-5 and docs/LEDGER.md section 6's superseded 60s-cap parked idea).

**DR-13. Import UX polish (P2.6): canvas-first layout, real progress bar for transcription.**
Problem: Minh reported (2026-09-17, outside a task checkpoint) two UX gaps: (1) loading a real song gives no feedback on whether the pipeline is running, hung, or errored (docs/BUGS.md BUG-6); (2) the page layout doesn't foreground the skyline — the app's one shared visualization — leaving it feeling unfocused. Minh asked for the second to be the agent's call. Choice: (a) for progress, checked the actual dependency before deciding (per RETRO-2 — verify empirically, don't assume) rather than guessing from its README: `@spotify/basic-pitch`'s `BasicPitch.evaluateModel(audio, onComplete, percentCallback)` already takes a real `percentCallback(percent: number)`, called once per frame during inference — `src/transcribe/basicPitch.ts` was passing `() => {}` and discarding it. So `transcribe()` gets an optional `onProgress?: (percent: number) => void` parameter wired straight to that callback, and the Import section gets a real percentage progress bar for the transcribe stage (the slow one); decode has no such hook (`OfflineAudioContext` doesn't expose progress and is fast in practice), so it stays a spinner + stage label, same as before. A visible error banner (not just a status line) appears if any stage throws. (b) for layout, move the skyline canvas above the hero copy and enlarge it, with hand-edit and import controls as secondary panels beneath — the canvas is the one thing both input paths (hand-placed and transcribed) share, so it reads as the product's core loop only if it's the first and largest thing on the page, not competing with a full-height hero header and two loose Play C4/C5 buttons above it. Why not a tabbed "Build by hand" / "Load a song" switcher instead: adds a new interaction pattern (tabs) for a problem CSS reordering already solves; subtract before add. Why not remove Play C4/C5 or the tagline: they still serve their original purpose (P1.3's pitch-comparison checkpoint, first-time orientation) — de-emphasizing their visual weight is enough, removing working functionality without a task asking for it would be its own scope change. Revisit when: not expected — the progress hook is now used as designed.

---

## 11. Open questions

Recorded here; answers go in the ledger.

- Q1. What is the first song Minh wants to try at Phase 2? Is there a ≤ 5 minute section with only voice or one instrument?
- Q2. Is Minh's main browser Chrome? (affects section 5)
- Q3. After Phase 1, does Minh want note names in English (C D E) or Vietnamese/solfège (Đô Rê Mi)? The app can show both, but one should be the default.

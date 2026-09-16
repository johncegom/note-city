# note-city — Bug Log

Trigger: something in the product is already wrong — a real defect (including one
inherited from a dependency, e.g. Basic Pitch, that got faithfully carried over).

Logging a bug here is **not** fixing it. Wait for an explicit decision (recorded in
the entry's Status line) before applying a fix — unless the bug is actively
dangerous (data loss, security), in which case flag it to Minh immediately in
addition to logging it here.

Format per entry:

```
## BUG-<NNN>: <short symptom>

**Symptom:** <what's observed>
**Root cause:** <known cause, or explicitly "unknown">
**Reachability:** <real path hit during normal use, vs. only a test built to hit it>
**Options:** <if there's an obvious fix, list options; omit otherwise>
**Status:** pending decision / decided: <what> / fixed in <commit/task ID>
```

---

## BUG-1: crackling/distorted sound ("rè") when building a melody quickly

**Symptom:** Minh reported during the P1.6 checkpoint that the sound sometimes crackles/buzzes ("đôi khi phát âm thanh bị rè") while clicking to add and dragging to tune several notes in a row.
**Root cause:** unknown, likely: `playSingleNote` (main.ts) and the editor's click/drag-release handlers each open a new oscillator + gain node straight to `ctx.destination` (`src/audio/synth.ts`'s `playNote`, `PEAK_GAIN = 0.3`). If two or more notes are triggered close enough together that their envelopes overlap, the summed signal at the destination can clip, which sounds like crackling. Not confirmed — could also be something else (e.g. attack/release ramp timing, browser audio glitching under rapid `AudioContext` calls).
**Reachability:** real path — happens during normal use of the P1.5 editor (click/drag several notes quickly), not just a constructed test case.
**Options:** (a) lower `PEAK_GAIN` further to leave headroom for overlap; (b) route all notes through one shared gain/limiter node instead of straight to `ctx.destination`; (c) confirm the cause first (log timing of trigger calls, or reproduce with 2+ rapid clicks) before picking a fix — root cause isn't confirmed yet.
**Status:** fixed in P1.11 (2026-09-14). Confirmed again during the P1.11 checkpoint, described more precisely: "when click note multiple times, the sound will stack up together and it becomes noisy" — matches option (b). Fixed via option (b): `playNote` (`src/audio/synth.ts`) now routes every note's gain through one shared `DynamicsCompressorNode` per `AudioContext` (`getMasterBus`, cached in a `WeakMap`) instead of straight to `ctx.destination`, so overlapping notes blend/compress instead of summing into clipped noise. `npm test` green (71 tests, unchanged — `[skill]` audio module, no automated test), `tsc --noEmit` and `npm run build` clean. Minh confirmed in the running app (2026-09-17, "it works well").

## BUG-2: notes placed near the right edge of the canvas render clipped and their resize handle becomes unreachable

**Symptom:** Minh reported while building his own 8-note melody that a note added near the right edge (e.g. the 8th note) shows up "siêu ngắn" (super short) and cannot be widened by dragging.
**Root cause:** confirmed. `#skyline`'s canvas is a fixed 500×200px surface (`main.ts`), i.e. a fixed 5.0s-wide window at `pxPerSec: 100`. `addNoteAt` (main.ts) computes a click's `start` from `xToTime(point.x, pxPerSec)` with no ceiling, so a click near `x = 500` creates a note whose `[start, start+duration)` extends past `x = 500` — e.g. a click at x≈495 places a note from 4.95s to 5.45s. Canvas 2D natively clips all drawing to the canvas's own pixel bounds, so only the sliver from x=495 to x=500 is visible (looks "super short"), and the note's right-edge drag handle (`nearRightEdge` in `main.ts`, computed from `noteRect`) is entirely off-screen past x=500, so there's nothing on screen left to grab and drag.
**Reachability:** real path — hit during normal use once enough notes (or long enough ones) are placed to approach the canvas's fixed 5-second width; not just a constructed edge case. Directly blocks finishing a longer melody, which undercuts Phase 1's own completion evidence ("Minh builds an 8-note melody... and judges it 'sounds okay'").
**Options:** (a) clamp `addNoteAt`'s `start` (and the duration-drag cap in `maxDurationAt`'s caller) so a note can never be placed or resized past the canvas's own time width; (b) make the skyline's time window wider than 5s (bigger canvas, or keep 500px on screen but let the underlying timeline pan/scroll, similar to the `.canvas-frame` overflow-x that already exists for narrow viewports) so more than ~8-10 notes fit; (c) do both — clamp as the immediate safety net, widen/pan as the real fix for longer melodies. Ties into the earlier grid-vs-free-duration discussion (`docs/PLAN.md` DR-9) — a visible boundary/grid would also make this limit legible instead of silently clipping.
**Status:** fixed in P1.10 (2026-09-12): widened `#skyline` from 500px/5s to 700px/7s, and clamped `addNoteAt`'s `start` and the duration-drag's cap so a note can never extend past the canvas's own width. Minh confirmed in the running app ("ok rồi").

## BUG-3: single-note preview sound plays late instead of immediately

**Symptom:** Minh reported during the P1.11 checkpoint (2026-09-14) that "sometimes sound is playing, but I'm not sure why" (translated: unexpected sound). Follow-up: happens on both single-click and double-click, and the sound doesn't play immediately — it plays after a delay.
**Root cause:** confirmed. `playSingleNote` (`src/main.ts:62-65`) calls `schedule([note], ctx.currentTime)`, and `schedule` (`src/audio/scheduler.ts`) computes `at: now + note.start` for every event — correct for `playAll` (notes should stay offset from each other), but wrong for a single-note preview: `note.start` is the note's position in the whole melody's timeline, not an offset from "now". So clicking/dragging/double-clicking (to delete) a note that sits, say, 3s into the melody delays its preview sound by 3s instead of playing it right away. Predates P1.11 (`playSingleNote` was added in P1.3, used since P1.5's click-to-add/drag editor), but P1.11's added interactions (delete, more frequent drag previews) made it land during this checkpoint.
**Reachability:** real path — hit any time a note with `start > 0` is clicked, dragged, or double-clicked, which is normal use of the P1.5/P1.11 editor on anything but the very first note.
**Options:** (a) in `playSingleNote`, schedule at `ctx.currentTime` directly instead of going through `schedule`'s `now + note.start` (e.g. `playNote(ctx, midiToFreq(note.midi), ctx.currentTime, note.duration)`, bypassing `schedule` for the single-note case since it's a preview, not a timeline placement); (b) keep using `schedule` but pass `now - note.start` so the offset cancels out (more fragile, relies on the caller understanding `schedule`'s contract).
**Status:** fixed in P1.11 (2026-09-14), option (a): `playSingleNote` (`src/main.ts`) now calls `playNote(ctx, midiToFreq(note.midi), ctx.currentTime, note.duration)` directly instead of going through `schedule`. `playAll` is unaffected (still uses `schedule` for its multi-note timeline offsets). `npm test` green (71 tests, unchanged — no pure function touched), `tsc --noEmit` and `npm run build` clean. Minh confirmed in the running app (2026-09-17, "it works well").

## BUG-4: no way to pause or stop audio once it starts playing

**Symptom:** Minh reported during the P2.5 checkpoint that once any playback starts (Play C4/C5, the skyline's Play, "Play original audio", "Play synth"), there is no way to pause or stop it early — you have to let it run out.
**Root cause:** confirmed, app-wide, predates P2.5. `playNote` (`src/audio/synth.ts`) creates an `OscillatorNode`/`GainNode` pair per note and never returns or stores a reference to it — it schedules `osc.start`/`osc.stop` and then the caller has nothing left to call `.stop()` on early. `playSingleNote`, `playAll`, and the new `playOriginal` (`src/main.ts`) all follow the same pattern: fire-and-forget, no stored node references, and there is no Stop/Pause button anywhere in the UI to begin with. `playOriginal`'s `AudioBufferSourceNode` has the same issue — its `source` variable is local to `playOriginal()` and goes out of scope once playback starts.
**Reachability:** real path — every play action in the app (single note preview, full-melody playback, original-audio playback) is affected; not a constructed edge case. Gets more noticeable at P2.5 since original-audio playback can run up to 60s uninterrupted, versus Phase 1's short note/melody previews.
**Options:** (a) add a single "Stop" button that stops whatever is currently playing — needs each play path to store its active node(s) (or an `AudioBufferSourceNode`/oscillator list) in a module-level variable so a shared `stop()` can call `.stop()` on them and cancel the `requestAnimationFrame` playhead loop; (b) scope it further to only the newer, longer-running P2.5 playback (original audio, synth-of-song) if a full app-wide stop is judged too big for one task; (c) do nothing for v1 if Minh decides short playback runs are acceptable to just wait out.
**Status:** pending decision.

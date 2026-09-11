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
**Status:** pending decision — not fixed in P1.6 (out of scope: P1.6 is seed data + Clear/Play wiring, this is a P1.3 synth-quality issue). Revisit before Phase 2 relies on `playNote` for anything besides manual testing.

## BUG-2: notes placed near the right edge of the canvas render clipped and their resize handle becomes unreachable

**Symptom:** Minh reported while building his own 8-note melody that a note added near the right edge (e.g. the 8th note) shows up "siêu ngắn" (super short) and cannot be widened by dragging.
**Root cause:** confirmed. `#skyline`'s canvas is a fixed 500×200px surface (`main.ts`), i.e. a fixed 5.0s-wide window at `pxPerSec: 100`. `addNoteAt` (main.ts) computes a click's `start` from `xToTime(point.x, pxPerSec)` with no ceiling, so a click near `x = 500` creates a note whose `[start, start+duration)` extends past `x = 500` — e.g. a click at x≈495 places a note from 4.95s to 5.45s. Canvas 2D natively clips all drawing to the canvas's own pixel bounds, so only the sliver from x=495 to x=500 is visible (looks "super short"), and the note's right-edge drag handle (`nearRightEdge` in `main.ts`, computed from `noteRect`) is entirely off-screen past x=500, so there's nothing on screen left to grab and drag.
**Reachability:** real path — hit during normal use once enough notes (or long enough ones) are placed to approach the canvas's fixed 5-second width; not just a constructed edge case. Directly blocks finishing a longer melody, which undercuts Phase 1's own completion evidence ("Minh builds an 8-note melody... and judges it 'sounds okay'").
**Options:** (a) clamp `addNoteAt`'s `start` (and the duration-drag cap in `maxDurationAt`'s caller) so a note can never be placed or resized past the canvas's own time width; (b) make the skyline's time window wider than 5s (bigger canvas, or keep 500px on screen but let the underlying timeline pan/scroll, similar to the `.canvas-frame` overflow-x that already exists for narrow viewports) so more than ~8-10 notes fit; (c) do both — clamp as the immediate safety net, widen/pan as the real fix for longer melodies. Ties into the earlier grid-vs-free-duration discussion (`docs/PLAN.md` DR-9) — a visible boundary/grid would also make this limit legible instead of silently clipping.
**Status:** decided (2026-09-12): fix as its own task (P1.10), right after P1.7 — Minh confirmed it blocks building a full melody and wants it prioritized, not deferred further. Not fixed in P1.7 itself (out of scope: layout/type/color/spacing only, no functional changes).

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

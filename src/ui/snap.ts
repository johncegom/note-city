import type { MidiRange } from "../notes/types";

/** Round a raw (dragged) midi value to the nearest semitone, clamped to `range`. */
export function snapMidi(rawMidi: number, range: MidiRange): number {
  const rounded = Math.round(rawMidi);
  return Math.min(range.max, Math.max(range.min, rounded));
}

/** Round a raw (dragged) time in seconds to the nearest multiple of `stepSeconds`, clamped to >= 0. */
export function snapTime(rawSeconds: number, stepSeconds: number): number {
  const rounded = Math.round(rawSeconds / stepSeconds) * stepSeconds;
  return Math.max(0, rounded);
}

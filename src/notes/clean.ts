import type { Note, RawNote } from "./types";

// Cleans up RawNote[]/Note[] coming out of transcription (docs/PLAN.md P2.4).
// Keeps the single-melody, one-note-at-a-time invariant (docs/PLAN.md section 1)
// by only ever merging same-pitch notes, never overlapping different pitches.

/** Drop notes shorter than `minDur` seconds. Boundary (duration === minDur) is kept. */
export function filterShort(notes: Note[], minDur: number): Note[] {
  return notes.filter((note) => note.duration >= minDur);
}

/** Drop notes with confidence below `min`. Boundary (confidence === min) is kept. */
export function filterLowConfidence(notes: RawNote[], min: number): RawNote[] {
  return notes.filter((note) => note.confidence >= min);
}

/**
 * Merge consecutive same-midi notes whose silence gap is `<= gap` seconds into
 * one note spanning from the first note's start to the last note's end. Notes
 * are assumed sorted by `start` (as `transcribe()` already sorts them). The
 * merged note keeps the first note's id/velocity (and confidence, for RawNote[]).
 */
const EPSILON = 1e-9; // float slack for second-based comparisons, e.g. 1.1 - 1 !== 0.1

export function mergeAdjacent<T extends Note>(notes: T[], gap: number): T[] {
  const result: T[] = [];
  for (const note of notes) {
    const prev = result[result.length - 1];
    if (prev && prev.midi === note.midi && note.start - (prev.start + prev.duration) <= gap + EPSILON) {
      const end = Math.max(prev.start + prev.duration, note.start + note.duration);
      result[result.length - 1] = { ...prev, duration: end - prev.start };
    } else {
      result.push({ ...note });
    }
  }
  return result;
}

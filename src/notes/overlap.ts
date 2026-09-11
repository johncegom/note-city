import type { Note } from "./types";

// v1 is a single melody: one note at a time (docs/PLAN.md section 1, non-goals).
// These helpers keep the editor from creating or stretching a note into a chord.

/** Do two notes' time ranges [start, start + duration) intersect? */
export function timeRangesOverlap(a: Note, b: Note): boolean {
  return a.start < b.start + b.duration && b.start < a.start + a.duration;
}

/** Does `note` overlap any note in `others` (its own id excluded)? */
export function overlapsAny(note: Note, others: Note[]): boolean {
  return others.some((other) => other.id !== note.id && timeRangesOverlap(note, other));
}

/**
 * The largest duration `note` could have without overlapping a later note in
 * `others`. `Infinity` when nothing after it constrains it.
 */
export function maxDurationAt(note: Note, others: Note[]): number {
  const laterStarts = others
    .filter((other) => other.id !== note.id && other.start > note.start)
    .map((other) => other.start);
  if (laterStarts.length === 0) return Infinity;
  return Math.min(...laterStarts) - note.start;
}

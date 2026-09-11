import { noteRect, type SkylineOptions } from "./geometry";
import type { Note } from "../notes/types";

export type Point = { x: number; y: number };

/**
 * Which note (if any) is under `point`. When rects overlap, the later note
 * in the array wins — it is drawn on top by `drawSkyline`.
 */
export function findNoteAt(
  notes: Note[],
  point: Point,
  options: SkylineOptions,
): Note | undefined {
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i];
    const rect = noteRect(note, options);
    const inside =
      point.x >= rect.x &&
      point.x < rect.x + rect.width &&
      point.y >= rect.y &&
      point.y < rect.y + rect.height;
    if (inside) return note;
  }
  return undefined;
}

import { midiToFreq } from "../notes/mapping";
import type { Note } from "../notes/types";

export type ScheduledEvent = {
  freq: number;
  at: number; // seconds, absolute (relative to the same clock as `now`)
  dur: number; // seconds
};

/** Turn `Note[]` into playback events, offsetting each note's start by `now`. Pure. */
export function schedule(notes: Note[], now: number): ScheduledEvent[] {
  return notes.map((note) => ({
    freq: midiToFreq(note.midi),
    at: now + note.start,
    dur: note.duration,
  }));
}

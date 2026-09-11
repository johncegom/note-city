import type { MidiRange } from "./types";

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/** Convert a MIDI note number to frequency in Hz. 69 (A4) = 440 Hz. */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Convert a MIDI note number to a name like "C4", "C#4", "C-1". */
export function midiToName(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/**
 * Map a MIDI note number to a normalized height in [0, 1], where `range.min`
 * maps to 0 and `range.max` maps to 1. Out-of-range values clamp to 0 or 1.
 */
export function midiToHeight(midi: number, range: MidiRange): number {
  const fraction = (midi - range.min) / (range.max - range.min);
  return Math.min(1, Math.max(0, fraction));
}

/** Convert a note duration in seconds to a pixel width. */
export function durationToWidth(seconds: number, pxPerSec: number): number {
  return seconds * pxPerSec;
}

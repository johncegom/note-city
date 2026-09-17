import { midiToHeight } from "../notes/mapping";
import type { MidiRange, Note } from "../notes/types";

export type SkylineOptions = {
  midiRange: MidiRange;
  pxPerSec: number;
  canvasHeight: number;
  minBarHeight?: number; // px, so even the lowest note is visible. Default 6.
};

export type Rect = {
  x: number;
  y: number; // top edge, canvas coordinates (0 = top of canvas)
  width: number;
  height: number;
};

const DEFAULT_MIN_BAR_HEIGHT = 6;

/** Inverse of the vertical mapping in `noteRect`: a canvas y-coordinate to a raw (unsnapped) midi value. */
export function yToMidi(y: number, options: SkylineOptions): number {
  const heightFrac = (options.canvasHeight - y) / options.canvasHeight;
  return options.midiRange.min + heightFrac * (options.midiRange.max - options.midiRange.min);
}

/** Inverse of the horizontal mapping in `noteRect`: a canvas x-coordinate to a raw (unsnapped) time in seconds. */
export function xToTime(x: number, pxPerSec: number): number {
  return x / pxPerSec;
}

const PIANO_RANGE: MidiRange = { min: 21, max: 108 };
const MIN_MIDI_SPAN = 12; // at least one octave of visual variety, even for a single note
const MIDI_PADDING = 2; // semitones of headroom above/below the notes' own range
const DEFAULT_DURATION_SEC = 5; // fallback when there are no notes yet (e.g. before a file loads)

// A fixed, editable-friendly horizontal scale (docs/BUGS.md BUG-7): squeezing
// a whole real song into one fixed-width canvas (the old behavior) shrinks
// pxPerSec as duration grows, and past a couple of minutes notes become
// sub-pixel slivers that can't be clicked or dragged. Real-song editing keeps
// this same scale regardless of length; the canvas widens instead (see
// `canvasWidth` below) and the frame around it scrolls horizontally to it.
export const REAL_SONG_PX_PER_SEC = 100;

export type FitSkylineResult = {
  options: SkylineOptions;
  /** The `<canvas>` element's own pixel width — >= viewportWidth, wider for
   *  a clip that doesn't fit the viewport at REAL_SONG_PX_PER_SEC. */
  canvasWidth: number;
};

/**
 * A `SkylineOptions` sized to fit `notes` (unknown pitch range/duration, e.g.
 * from real-song transcription), instead of the hardcoded midiRange/pxPerSec
 * used for the Phase 1 hand-placed editor. `viewportWidth` is the visible
 * frame's width, used only as a floor so a short clip still fills it.
 */
export function fitSkylineOptions(
  notes: Note[],
  viewportWidth: number,
  canvasHeight: number,
): FitSkylineResult {
  const midis = notes.map((note) => note.midi);
  let min = midis.length ? Math.min(...midis) - MIDI_PADDING : 60 - MIN_MIDI_SPAN / 2;
  let max = midis.length ? Math.max(...midis) + MIDI_PADDING : 60 + MIN_MIDI_SPAN / 2;
  if (max - min < MIN_MIDI_SPAN) {
    const mid = (max + min) / 2;
    min = mid - MIN_MIDI_SPAN / 2;
    max = mid + MIN_MIDI_SPAN / 2;
  }
  min = Math.max(PIANO_RANGE.min, min);
  max = Math.min(PIANO_RANGE.max, max);

  const totalDuration = notes.length
    ? Math.max(...notes.map((note) => note.start + note.duration))
    : DEFAULT_DURATION_SEC;
  const pxPerSec = REAL_SONG_PX_PER_SEC;
  const canvasWidth = Math.max(viewportWidth, totalDuration * pxPerSec);

  return { options: { midiRange: { min, max }, pxPerSec, canvasHeight }, canvasWidth };
}

/** The rectangle a note is drawn as: bottom-anchored, taller = higher pitch. */
export function noteRect(note: Note, options: SkylineOptions): Rect {
  const minBarHeight = options.minBarHeight ?? DEFAULT_MIN_BAR_HEIGHT;
  const heightFrac = midiToHeight(note.midi, options.midiRange);
  const height = Math.max(minBarHeight, heightFrac * options.canvasHeight);

  return {
    x: note.start * options.pxPerSec,
    y: options.canvasHeight - height,
    width: note.duration * options.pxPerSec,
    height,
  };
}

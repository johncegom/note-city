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

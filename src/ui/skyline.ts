// [skill] — Canvas drawing is judged by eye (Minh), not by an automated test.

import { noteRect, type SkylineOptions } from "./geometry";
import type { Note } from "../notes/types";

const BUILDING_COLOR = "#4a7bd6";
const BUILDING_OUTLINE = "#2c4c8a";
const PLAYHEAD_COLOR = "#e05555";

/** Draw `notes` as buildings: taller = higher pitch, wider = longer note. */
export function drawSkyline(
  ctx: CanvasRenderingContext2D,
  notes: Note[],
  options: SkylineOptions,
  playheadTime?: number,
): void {
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = BUILDING_COLOR;
  ctx.strokeStyle = BUILDING_OUTLINE;
  for (const note of notes) {
    const rect = noteRect(note, options);
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  if (playheadTime !== undefined) {
    const x = playheadTime * options.pxPerSec;
    ctx.strokeStyle = PLAYHEAD_COLOR;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, options.canvasHeight);
    ctx.stroke();
  }
}

// [skill] — Canvas drawing is judged by eye (Minh), not by an automated test.

import { noteRect, type Rect, type SkylineOptions } from "./geometry";
import type { Note } from "../notes/types";

const SKY_TOP = "#0a0f1c";
const SKY_BOTTOM = "#1f2740";
const GROUND_COLOR = "#332818";
const GROUND_HEIGHT = 4;

const BUILDING_TOP = "#ffce70";
const BUILDING_BOTTOM = "#e2a13a";
const BUILDING_OUTLINE = "#8a5a1c";
const WINDOW_LIT = "#fff3d6";
const WINDOW_UNLIT_OUTLINE = "rgba(138, 90, 28, 0.35)";
const PLAYHEAD_COLOR = "#7dd3e8";
const POP_RING_COLOR = "#7dd3e8";
const EDGE_STOP_COLOR = "#e86b5c";

const WINDOW_WIDTH = 3;
const WINDOW_HEIGHT = 5;
const WINDOW_GAP_X = 4;
const WINDOW_GAP_Y = 4;
const WINDOW_MARGIN = 5;

/** Small deterministic hash so a building's lit windows stay put across redraws. */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** A faint grid of window frames, with a few lit at random (but stable per note). */
function drawWindows(ctx: CanvasRenderingContext2D, rect: Rect, seed: string): void {
  const usableWidth = rect.width - WINDOW_MARGIN * 2;
  const usableHeight = rect.height - WINDOW_MARGIN * 2;
  const cols = Math.floor((usableWidth + WINDOW_GAP_X) / (WINDOW_WIDTH + WINDOW_GAP_X));
  const rows = Math.floor((usableHeight + WINDOW_GAP_Y) / (WINDOW_HEIGHT + WINDOW_GAP_Y));
  if (cols < 1 || rows < 1) return;

  const hash = hashSeed(seed);
  const rowSpan = rows * (WINDOW_HEIGHT + WINDOW_GAP_Y) - WINDOW_GAP_Y;
  const colSpan = cols * (WINDOW_WIDTH + WINDOW_GAP_X) - WINDOW_GAP_X;
  const startX = rect.x + (rect.width - colSpan) / 2;
  const startY = rect.y + (rect.height - rowSpan) / 2;

  ctx.lineWidth = 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (WINDOW_WIDTH + WINDOW_GAP_X);
      const y = startY + row * (WINDOW_HEIGHT + WINDOW_GAP_Y);
      const lit = (hash + row * 5 + col * 11) % 6 === 0;
      if (lit) {
        ctx.fillStyle = WINDOW_LIT;
        ctx.fillRect(x, y, WINDOW_WIDTH, WINDOW_HEIGHT);
      } else {
        ctx.strokeStyle = WINDOW_UNLIT_OUTLINE;
        ctx.strokeRect(x + 0.5, y + 0.5, WINDOW_WIDTH - 1, WINDOW_HEIGHT - 1);
      }
    }
  }
}

// Instant feedback for the P1.11 editor: a brief "pop" ring on placement, and
// a stop-cue highlight when a drag is pressed against the P1.10 canvas edge.
export type SkylineEffects = {
  popNoteId?: string;
  popProgress?: number; // 0 (just placed) .. 1 (fully faded)
  edgeStopCue?: boolean;
};

/** Draw `notes` as buildings: taller = higher pitch, wider = longer note. */
export function drawSkyline(
  ctx: CanvasRenderingContext2D,
  notes: Note[],
  options: SkylineOptions,
  playheadTime?: number,
  effects?: SkylineEffects,
): void {
  const canvas = ctx.canvas;

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = GROUND_COLOR;
  ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);

  for (const note of notes) {
    const rect = noteRect(note, options);

    const gradient = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.height);
    gradient.addColorStop(0, BUILDING_TOP);
    gradient.addColorStop(1, BUILDING_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    ctx.strokeStyle = BUILDING_OUTLINE;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    drawWindows(ctx, rect, note.id);

    if (effects?.popNoteId === note.id && effects.popProgress !== undefined) {
      const progress = effects.popProgress;
      const pad = 6 * progress; // ring expands outward as it fades
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = POP_RING_COLOR;
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x - pad, rect.y - pad, rect.width + pad * 2, rect.height + pad * 2);
      ctx.restore();
    }
  }

  if (effects?.edgeStopCue) {
    ctx.save();
    ctx.fillStyle = EDGE_STOP_COLOR;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(canvas.width - 3, 0, 3, options.canvasHeight);
    ctx.restore();
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

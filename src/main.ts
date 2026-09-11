import "./style.css";
import { schedule } from "./audio/scheduler";
import { playNote } from "./audio/synth";
import { midiToName, midiToSolfege } from "./notes/mapping";
import { drawSkyline } from "./ui/skyline";
import { findNoteAt } from "./ui/hitTest";
import { noteRect, xToTime, yToMidi, type SkylineOptions } from "./ui/geometry";
import { snapMidi, snapTime } from "./ui/snap";
import { maxDurationAt, overlapsAny } from "./notes/overlap";
import type { Note } from "./notes/types";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<section id="center">
  <h1>note-city playground</h1>
  <p>Press a button, hear a note.</p>
  <button id="play-c4" type="button">Play C4</button>
  <button id="play-c5" type="button">Play C5</button>
</section>

<section id="skyline-section">
  <h2>Skyline</h2>
  <p>
    Click empty space to add a building. Drag a building up/down to change its
    pitch. Drag its right edge to change its length. Hover to see its note
    name. Press Play to hear it all and watch the playhead.
  </p>
  <button id="play-skyline" type="button">Play</button>
  <button id="clear-skyline" type="button">Clear all</button>
  <canvas id="skyline" width="700" height="200"></canvas>
  <div id="hover-label">&nbsp;</div>
  <p>Examples:</p>
  <button id="preset-0" type="button">Twinkle Twinkle Little Star</button>
  <button id="preset-1" type="button">Mary Had a Little Lamb</button>
  <button id="preset-2" type="button">Ode to Joy (opening)</button>
</section>
`;

let ctx: AudioContext | null = null;

function playSingleNote(note: Note) {
  ctx ??= new AudioContext();
  const [event] = schedule([note], ctx.currentTime);
  playNote(ctx, event.freq, event.at, event.dur);
}

document
  .querySelector<HTMLButtonElement>("#play-c4")!
  .addEventListener("click", () => {
    playSingleNote({ id: "c4", midi: 60, start: 0, duration: 0.6, velocity: 0.8 });
  });

document
  .querySelector<HTMLButtonElement>("#play-c5")!
  .addEventListener("click", () => {
    playSingleNote({ id: "c5", midi: 72, start: 0, duration: 0.6, velocity: 0.8 });
  });

// Seed: C major scale ascending, one note every 0.5s. Starting point for the
// Phase 1 final checkpoint — Minh clears it and builds his own 8 notes.
const SEED_MIDIS = [60, 62, 64, 65, 67, 69, 71, 72];
const notes: Note[] = SEED_MIDIS.map((midi, i) => ({
  id: `seed-${i}`,
  midi,
  start: i * 0.5,
  duration: 0.5,
  velocity: 0.8,
}));

const skylineOptions: SkylineOptions = {
  midiRange: { min: 60, max: 72 },
  pxPerSec: 100,
  canvasHeight: 200,
};

const canvas = document.querySelector<HTMLCanvasElement>("#skyline")!;
const canvasCtx = canvas.getContext("2d")!;
const hoverLabel = document.querySelector<HTMLDivElement>("#hover-label")!;

let playheadTime: number | undefined;

function render() {
  drawSkyline(canvasCtx, notes, skylineOptions, playheadTime);
}

function pointFromEvent(event: MouseEvent) {
  const bounds = canvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

// Solfège (Đô Rê Mi...) is the default label — Minh knows that, not letter
// names — with the letter name alongside for cross-reference (docs/PLAN.md DR-8).
canvas.addEventListener("mousemove", (event) => {
  const hovered = findNoteAt(notes, pointFromEvent(event), skylineOptions);
  hoverLabel.textContent = hovered
    ? `${midiToSolfege(hovered.midi)} (${midiToName(hovered.midi)})`
    : " ";
});

canvas.addEventListener("mouseleave", () => {
  hoverLabel.textContent = " ";
});

// --- Editor: click empty space to add a building, drag to edit one. ---

const DEFAULT_DURATION = 0.5; // seconds, for a newly added note
const TIME_STEP = 0.05; // seconds, snap grid for start/duration while dragging
const EDGE_GRAB_PX = 8; // how close to a building's right edge counts as "grab the edge"

type DragState = {
  note: Note;
  mode: "pitch" | "duration";
  startX: number;
  origDuration: number;
};

let dragState: DragState | null = null;

// The canvas is a fixed-width window onto time; a note (and its resize
// handle) must never extend past it, or it renders clipped and becomes
// ungrabbable (docs/BUGS.md BUG-2).
function maxVisibleTime(): number {
  return xToTime(canvas.width, skylineOptions.pxPerSec);
}

// v1 is a single melody, one note at a time (docs/PLAN.md section 1): a new
// note that would overlap an existing one in time is not added.
function addNoteAt(point: { x: number; y: number }): Note | null {
  const midi = snapMidi(yToMidi(point.y, skylineOptions), skylineOptions.midiRange);
  const maxStart = maxVisibleTime() - DEFAULT_DURATION;
  const start = Math.min(maxStart, snapTime(xToTime(point.x, skylineOptions.pxPerSec), TIME_STEP));
  const note: Note = {
    id: crypto.randomUUID(),
    midi,
    start,
    duration: DEFAULT_DURATION,
    velocity: 0.8,
  };
  if (overlapsAny(note, notes)) return null;
  notes.push(note);
  return note;
}

canvas.addEventListener("mousedown", (event) => {
  const point = pointFromEvent(event);
  const hovered = findNoteAt(notes, point, skylineOptions);

  if (!hovered) {
    const note = addNoteAt(point);
    if (!note) return;
    render();
    playSingleNote(note);
    return;
  }

  const rect = noteRect(hovered, skylineOptions);
  const nearRightEdge = point.x >= rect.x + rect.width - EDGE_GRAB_PX;
  dragState = {
    note: hovered,
    mode: nearRightEdge ? "duration" : "pitch",
    startX: point.x,
    origDuration: hovered.duration,
  };
});

window.addEventListener("mousemove", (event) => {
  if (!dragState) return;
  const point = pointFromEvent(event);

  if (dragState.mode === "pitch") {
    dragState.note.midi = snapMidi(yToMidi(point.y, skylineOptions), skylineOptions.midiRange);
  } else {
    const deltaSec = xToTime(point.x - dragState.startX, skylineOptions.pxPerSec);
    const rawDuration = dragState.origDuration + deltaSec;
    const cap = Math.min(maxDurationAt(dragState.note, notes), maxVisibleTime() - dragState.note.start);
    dragState.note.duration = Math.min(cap, Math.max(TIME_STEP, snapTime(rawDuration, TIME_STEP)));
  }
  render();
});

window.addEventListener("mouseup", () => {
  if (!dragState) return;
  const note = dragState.note;
  dragState = null;
  playSingleNote(note);
});

document
  .querySelector<HTMLButtonElement>("#clear-skyline")!
  .addEventListener("click", () => {
    notes.length = 0;
    playheadTime = undefined;
    render();
  });

function playAll() {
  if (notes.length === 0) return;
  ctx ??= new AudioContext();
  const now = ctx.currentTime;
  const events = schedule(notes, now);
  for (const event of events) {
    playNote(ctx, event.freq, event.at, event.dur);
  }

  const totalDuration = Math.max(...notes.map((note) => note.start + note.duration));

  function tick() {
    const elapsed = ctx!.currentTime - now;
    if (elapsed >= totalDuration) {
      playheadTime = undefined;
      render();
      return;
    }
    playheadTime = elapsed;
    render();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

document
  .querySelector<HTMLButtonElement>("#play-skyline")!
  .addEventListener("click", playAll);

// A few well-known, simple tunes as listening reference points alongside the
// P1.6 seed — Minh judges "pleasant/recognizable", not just "notes playing".
const PRESETS: number[][] = [
  [60, 60, 67, 67, 69, 69, 67], // Twinkle Twinkle Little Star (opening phrase)
  [64, 62, 60, 62, 64, 64, 64], // Mary Had a Little Lamb (opening phrase)
  [64, 64, 65, 67, 67, 65, 64, 62], // Ode to Joy (opening phrase)
];

function loadMelody(midis: number[]) {
  notes.length = 0;
  midis.forEach((midi, i) => {
    notes.push({
      id: `preset-${i}`,
      midi,
      start: i * 0.5,
      duration: 0.5,
      velocity: 0.8,
    });
  });
  playheadTime = undefined;
  render();
}

PRESETS.forEach((midis, i) => {
  document
    .querySelector<HTMLButtonElement>(`#preset-${i}`)!
    .addEventListener("click", () => {
      loadMelody(midis);
      playAll();
    });
});

render();

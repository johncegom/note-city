import "./style.css";
import { schedule } from "./audio/scheduler";
import { playNote } from "./audio/synth";
import { midiToFreq, midiToName, midiToSolfege } from "./notes/mapping";
import { drawSkyline, type SkylineEffects } from "./ui/skyline";
import { findNoteAt } from "./ui/hitTest";
import { fitSkylineOptions, noteRect, xToTime, yToMidi, type SkylineOptions } from "./ui/geometry";
import { snapMidi, snapTime } from "./ui/snap";
import { maxDurationAt, overlapsAny } from "./notes/overlap";
import { pushHistory, undo } from "./ui/history";
import { decodeFile, TARGET_SAMPLE_RATE } from "./audio/decode";
import { transcribe } from "./transcribe/basicPitch";
import { filterLowConfidence, filterShort, mergeAdjacent } from "./notes/clean";
import type { Note } from "./notes/types";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<div class="wrap">
  <header class="hero">
    <h1 class="wordmark">note&#8209;city</h1>
    <p class="tagline">
      A small tool for building melodies. Every note is a building — taller
      means higher, wider means longer.
    </p>
    <div class="button-row">
      <button id="play-c4" type="button">Play C4</button>
      <button id="play-c5" type="button">Play C5</button>
    </div>
  </header>

  <section id="skyline-section" class="panel">
    <h2>Skyline</h2>
    <p class="hint">
      Click empty space to add a building. Drag a building up or down to
      change its pitch. Drag its right edge to change its length. Hover to
      see its note name. Press Play to hear it all and watch the playhead.
    </p>

    <div class="canvas-frame">
      <canvas id="skyline" width="700" height="200"></canvas>
    </div>
    <div id="hover-label" class="readout">&nbsp;</div>

    <p class="hint">Double-click a building to delete it.</p>

    <div class="button-row">
      <button id="play-skyline" type="button" class="primary">Play</button>
      <button id="stop-skyline" type="button">Stop</button>
      <button id="undo-skyline" type="button" disabled>Undo</button>
      <button id="clear-skyline" type="button">Clear all</button>
    </div>

    <div class="presets">
      <p class="presets-label">Examples</p>
      <div class="button-row">
        <button id="preset-0" type="button">Twinkle Twinkle Little Star</button>
        <button id="preset-1" type="button">Mary Had a Little Lamb</button>
        <button id="preset-2" type="button">Ode to Joy (opening)</button>
      </div>
    </div>
  </section>

  <section id="import-section" class="panel">
    <h2>Load a real song</h2>
    <p class="hint">
      Pick an audio or video file (&le; 60s works best). It's decoded, run
      through Basic Pitch to find notes, cleaned up, then drawn on the
      skyline above &mdash; replacing whatever's there now.
    </p>
    <input id="import-file" type="file" accept="audio/*,video/*" />
    <div id="import-status" class="readout">&nbsp;</div>
    <div class="button-row">
      <button id="play-original" type="button" disabled>Play original audio</button>
      <button id="play-synth-song" type="button" disabled>Play synth</button>
      <button id="stop-song" type="button">Stop</button>
    </div>
  </section>
</div>
`;

let ctx: AudioContext | null = null;

// A preview should play right away, not at the note's position in the melody's
// own timeline — so this plays at ctx.currentTime directly instead of going
// through `schedule` (whose `now + note.start` offset is for `playAll`, where
// notes must stay spaced apart from each other; see docs/BUGS.md BUG-3).
function playSingleNote(note: Note) {
  ctx ??= new AudioContext();
  playNote(ctx, midiToFreq(note.midi), ctx.currentTime, note.duration);
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

// The Phase 1 hand-placed editor's fixed scale. A loaded real song refits
// this (see fitSkylineOptions) since its pitch range/duration are unknown
// ahead of time; Clear all / a preset restores this default.
const DEFAULT_SKYLINE_OPTIONS: SkylineOptions = {
  midiRange: { min: 60, max: 72 },
  pxPerSec: 100,
  canvasHeight: 200,
};
let skylineOptions: SkylineOptions = { ...DEFAULT_SKYLINE_OPTIONS };

const canvas = document.querySelector<HTMLCanvasElement>("#skyline")!;
const canvasCtx = canvas.getContext("2d")!;
const hoverLabel = document.querySelector<HTMLDivElement>("#hover-label")!;

let playheadTime: number | undefined;
let effects: SkylineEffects = {};

// In-memory undo (P1.11): a stack of full `notes` snapshots, no persistence.
// Each mutating action pushes the pre-edit state before applying the change.
let historyStack: Note[][] = [];
const undoButton = document.querySelector<HTMLButtonElement>("#undo-skyline")!;

function snapshotNotes(): Note[] {
  return notes.map((note) => ({ ...note }));
}

function recordHistory() {
  historyStack = pushHistory(historyStack, snapshotNotes());
  undoButton.disabled = historyStack.length === 0;
}

function render() {
  drawSkyline(canvasCtx, notes, skylineOptions, playheadTime, effects);
}

// Instant micro-feedback (P1.11a): a brief highlight ring on a newly placed note.
function triggerPop(noteId: string) {
  const start = performance.now();
  const POP_DURATION_MS = 250;
  function tick() {
    const progress = Math.min(1, (performance.now() - start) / POP_DURATION_MS);
    effects = { popNoteId: noteId, popProgress: progress };
    render();
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      effects = {};
      render();
    }
  }
  requestAnimationFrame(tick);
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
  origMidi: number;
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
  recordHistory();
  notes.push(note);
  return note;
}

canvas.addEventListener("mousedown", (event) => {
  const point = pointFromEvent(event);
  const hovered = findNoteAt(notes, point, skylineOptions);

  if (!hovered) {
    // Skip the click-to-add on the first click of a double-click — an empty
    // spot has nothing to delete, so a double-click there shouldn't add-then-drag.
    if (event.detail > 1) return;
    const note = addNoteAt(point);
    if (!note) return;
    render();
    triggerPop(note.id);
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
    origMidi: hovered.midi,
  };
});

canvas.addEventListener("dblclick", (event) => {
  const point = pointFromEvent(event);
  const hovered = findNoteAt(notes, point, skylineOptions);
  if (!hovered) return;
  dragState = null;
  recordHistory();
  const idx = notes.findIndex((n) => n.id === hovered.id);
  if (idx >= 0) notes.splice(idx, 1);
  playheadTime = undefined;
  hoverLabel.textContent = " ";
  render();
});

window.addEventListener("mousemove", (event) => {
  if (!dragState) return;
  const point = pointFromEvent(event);

  if (dragState.mode === "pitch") {
    dragState.note.midi = snapMidi(yToMidi(point.y, skylineOptions), skylineOptions.midiRange);
    effects = {};
    hoverLabel.textContent = `${midiToSolfege(dragState.note.midi)} (${midiToName(dragState.note.midi)})`;
  } else {
    const deltaSec = xToTime(point.x - dragState.startX, skylineOptions.pxPerSec);
    const rawDuration = dragState.origDuration + deltaSec;
    const edgeCap = maxVisibleTime() - dragState.note.start;
    const cap = Math.min(maxDurationAt(dragState.note, notes), edgeCap);
    const snapped = Math.max(TIME_STEP, snapTime(rawDuration, TIME_STEP));
    dragState.note.duration = Math.min(cap, snapped);
    // Stop-cue (P1.11c): only when the canvas's right edge, not a neighboring
    // note, is the reason the drag can't go further (docs/BUGS.md BUG-2 clamp).
    effects = cap === edgeCap && snapped >= cap ? { edgeStopCue: true } : {};
    hoverLabel.textContent = `${midiToName(dragState.note.midi)} · ${dragState.note.duration.toFixed(2)}s`;
  }
  render();
});

window.addEventListener("mouseup", () => {
  if (!dragState) return;
  const { note, origMidi, origDuration } = dragState;
  dragState = null;
  effects = {};
  if (note.midi !== origMidi || note.duration !== origDuration) {
    // History must hold the pre-drag values, not the just-mutated note.
    const preDrag = snapshotNotes().map((n) =>
      n.id === note.id ? { ...n, midi: origMidi, duration: origDuration } : n,
    );
    historyStack = pushHistory(historyStack, preDrag);
    undoButton.disabled = historyStack.length === 0;
  }
  render();
  playSingleNote(note);
});

undoButton.addEventListener("click", () => {
  const { previous, stack } = undo(historyStack);
  historyStack = stack;
  undoButton.disabled = historyStack.length === 0;
  if (previous === undefined) return;
  notes.length = 0;
  notes.push(...previous.map((n) => ({ ...n })));
  playheadTime = undefined;
  render();
});

document
  .querySelector<HTMLButtonElement>("#clear-skyline")!
  .addEventListener("click", () => {
    if (notes.length === 0) return;
    recordHistory();
    notes.length = 0;
    skylineOptions = { ...DEFAULT_SKYLINE_OPTIONS };
    playheadTime = undefined;
    render();
  });

// Tracks whatever's currently playing (skyline melody, or P2.5's original/synth
// song playback) so a Stop button can cut it off early instead of having to
// run out (docs/BUGS.md BUG-4). Single shared state since only one of these
// plays at a time in practice — starting a new one stops whatever's active.
let activeOscillators: OscillatorNode[] = [];
let activeSource: AudioBufferSourceNode | null = null;
let activeAnimationFrame: number | null = null;

function stopPlayback() {
  const now = ctx?.currentTime ?? 0;
  for (const osc of activeOscillators) {
    try {
      osc.stop(now);
    } catch {
      // already stopped
    }
  }
  activeOscillators = [];
  if (activeSource) {
    try {
      activeSource.stop(now);
    } catch {
      // already stopped
    }
    activeSource = null;
  }
  if (activeAnimationFrame !== null) {
    cancelAnimationFrame(activeAnimationFrame);
    activeAnimationFrame = null;
  }
  playheadTime = undefined;
  render();
}

function playAll() {
  if (notes.length === 0) return;
  stopPlayback();
  ctx ??= new AudioContext();
  const now = ctx.currentTime;
  const events = schedule(notes, now);
  activeOscillators = events.map((event) => playNote(ctx!, event.freq, event.at, event.dur));

  const totalDuration = Math.max(...notes.map((note) => note.start + note.duration));

  function tick() {
    const elapsed = ctx!.currentTime - now;
    if (elapsed >= totalDuration) {
      playheadTime = undefined;
      activeOscillators = [];
      activeAnimationFrame = null;
      render();
      return;
    }
    playheadTime = elapsed;
    render();
    activeAnimationFrame = requestAnimationFrame(tick);
  }
  activeAnimationFrame = requestAnimationFrame(tick);
}

document
  .querySelector<HTMLButtonElement>("#play-skyline")!
  .addEventListener("click", playAll);

document
  .querySelector<HTMLButtonElement>("#stop-skyline")!
  .addEventListener("click", stopPlayback);

// A few well-known, simple tunes as listening reference points alongside the
// P1.6 seed — Minh judges "pleasant/recognizable", not just "notes playing".
const PRESETS: number[][] = [
  [60, 60, 67, 67, 69, 69, 67], // Twinkle Twinkle Little Star (opening phrase)
  [64, 62, 60, 62, 64, 64, 64], // Mary Had a Little Lamb (opening phrase)
  [64, 64, 65, 67, 67, 65, 64, 62], // Ode to Joy (opening phrase)
];

function loadMelody(midis: number[]) {
  recordHistory();
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
  skylineOptions = { ...DEFAULT_SKYLINE_OPTIONS };
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

// P2.5: file -> decode -> transcribe -> clean -> skyline. Thresholds are
// fixed defaults, not exposed in the UI yet — if a real clip's checkpoint
// shows notes too sparse/noisy, this is where to adjust (docs/PLAN.md:
// "raise the threshold... do not touch the model").
const MIN_NOTE_DURATION_SEC = 0.05;
const MIN_CONFIDENCE = 0.3;
const MERGE_GAP_SEC = 0.05;

let originalPcm: Float32Array | null = null;
let originalDurationSec = 0;

const importStatus = document.querySelector<HTMLDivElement>("#import-status")!;
const playOriginalButton = document.querySelector<HTMLButtonElement>("#play-original")!;
const playSynthSongButton = document.querySelector<HTMLButtonElement>("#play-synth-song")!;

document
  .querySelector<HTMLInputElement>("#import-file")!
  .addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    playOriginalButton.disabled = true;
    playSynthSongButton.disabled = true;
    importStatus.textContent = `Decoding ${file.name}...`;
    try {
      const pcm = await decodeFile(file);
      originalPcm = pcm;
      originalDurationSec = pcm.length / TARGET_SAMPLE_RATE;

      importStatus.textContent = `Transcribing ${file.name}... (this can take a while)`;
      const raw = await transcribe(pcm);
      const cleaned = mergeAdjacent(
        filterShort(filterLowConfidence(raw, MIN_CONFIDENCE), MIN_NOTE_DURATION_SEC),
        MERGE_GAP_SEC,
      );

      recordHistory();
      notes.length = 0;
      notes.push(...cleaned);
      skylineOptions = fitSkylineOptions(notes, canvas.width, skylineOptions.canvasHeight);
      playheadTime = undefined;
      render();

      importStatus.textContent =
        `${file.name}: ${originalDurationSec.toFixed(2)}s, ${cleaned.length} notes found`;
      playOriginalButton.disabled = false;
      playSynthSongButton.disabled = notes.length === 0;
    } catch (err) {
      originalPcm = null;
      importStatus.textContent = `Failed to process ${file.name}: ${(err as Error).message}`;
    }
  });

// Plays the decoded PCM directly (not through notes/synth), so Minh can
// compare the skyline against the real recording. Playhead uses the same
// skylineOptions.pxPerSec as playAll(), so it moves in sync with the skyline.
function playOriginal() {
  if (!originalPcm) return;
  stopPlayback();
  ctx ??= new AudioContext();
  const buffer = ctx.createBuffer(1, originalPcm.length, TARGET_SAMPLE_RATE);
  buffer.getChannelData(0).set(originalPcm);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  activeSource = source;
  const now = ctx.currentTime;
  source.start(now);

  function tick() {
    const elapsed = ctx!.currentTime - now;
    if (elapsed >= originalDurationSec) {
      playheadTime = undefined;
      activeSource = null;
      activeAnimationFrame = null;
      render();
      return;
    }
    playheadTime = elapsed;
    render();
    activeAnimationFrame = requestAnimationFrame(tick);
  }
  activeAnimationFrame = requestAnimationFrame(tick);
}

playOriginalButton.addEventListener("click", playOriginal);
playSynthSongButton.addEventListener("click", playAll);
document
  .querySelector<HTMLButtonElement>("#stop-song")!
  .addEventListener("click", stopPlayback);

render();

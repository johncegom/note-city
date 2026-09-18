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
import { parse, serialize } from "./notes/project";
import type { Note, Project } from "./notes/types";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<div class="wrap">
  <header class="top-bar">
    <h1 class="wordmark-small">note&#8209;city</h1>
    <p class="tagline-small">Every note is a building &mdash; taller means higher, wider means longer.</p>
  </header>

  <section id="skyline-section" class="stage">
    <div class="canvas-frame stage-canvas-frame">
      <canvas id="skyline" width="760" height="240"></canvas>
    </div>
    <div id="hover-label" class="readout">&nbsp;</div>
    <div class="button-row">
      <button id="play-skyline" type="button" class="primary">Play</button>
      <button id="stop-skyline" type="button">Stop</button>
      <button id="undo-skyline" type="button" disabled>Undo</button>
      <button id="clear-skyline" type="button">Clear all</button>
      <button id="save-project" type="button">Save</button>
      <label class="file-button">
        Load
        <input id="load-project" type="file" accept="application/json,.json" />
      </label>
    </div>
    <p class="hint stage-hint">
      Click empty space to add a building, drag to tune pitch/length, double-click to delete.
    </p>
  </section>

  <section id="import-section" class="panel">
    <h2>Load a real song</h2>
    <p class="hint">
      Pick an audio or video file (&le; 5 minutes works best). It's decoded, run
      through Basic Pitch to find notes, cleaned up, then drawn on the
      skyline above &mdash; replacing whatever's there now.
    </p>
    <input id="import-file" type="file" accept="audio/*,video/*" />
    <div id="import-status" class="import-status">
      <span id="import-spinner" class="spinner" hidden></span>
      <span id="import-status-text" class="readout">&nbsp;</span>
    </div>
    <progress id="import-progress" class="import-progress" max="100" value="0" hidden></progress>
    <div class="button-row">
      <button id="play-original" type="button" disabled>Play original audio</button>
      <button id="play-synth-song" type="button" disabled>Play synth</button>
      <button id="stop-song" type="button">Stop</button>
    </div>
  </section>

  <section id="editor-section" class="panel">
    <h2>Build by hand</h2>
    <p class="hint">
      A few well-known example melodies, or start from two reference notes.
    </p>
    <div class="presets">
      <p class="presets-label">Examples</p>
      <div class="button-row">
        <button id="preset-0" type="button">Twinkle Twinkle Little Star</button>
        <button id="preset-1" type="button">Mary Had a Little Lamb</button>
        <button id="preset-2" type="button">Ode to Joy (opening)</button>
      </div>
    </div>
    <div class="button-row">
      <button id="play-c4" type="button">Play C4</button>
      <button id="play-c5" type="button">Play C5</button>
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
  canvasHeight: 240,
};
const DEFAULT_CANVAS_WIDTH = 760; // matches the <canvas> element's own width attribute
let skylineOptions: SkylineOptions = { ...DEFAULT_SKYLINE_OPTIONS };

const canvas = document.querySelector<HTMLCanvasElement>("#skyline")!;
const canvasCtx = canvas.getContext("2d")!;
const hoverLabel = document.querySelector<HTMLDivElement>("#hover-label")!;

// The canvas's own pixel width only grows past DEFAULT_CANVAS_WIDTH for a
// real song loaded via the Import section (see fitSkylineOptions /
// docs/BUGS.md BUG-7) — a long clip needs a wider drawing surface to keep
// notes individually clickable, and `.canvas-frame`'s overflow-x: auto
// scrolls to it. Resetting the canvas element's width clears its content, so
// callers must re-render() right after.
function resetCanvasWidth() {
  canvas.width = DEFAULT_CANVAS_WIDTH;
}

let playheadTime: number | undefined;
let effects: SkylineEffects = {};

// Hover affordance (P3.1): which part of a building the cursor is over right
// now, so main.ts's own drag-mode logic (see nearRightEdge below) has a
// visible cue *before* a drag starts, not just a cursor change after the
// fact. Cleared while a drag is in progress — effects/edgeStopCue take over then.
let hoverNoteId: string | undefined;
let hoverMode: "pitch" | "duration" | undefined;

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

// P3.2: save/load Project JSON, plus a localStorage autosave of the current
// in-progress melody so a page reload doesn't lose it. `sourceName` tracks
// where the current notes came from (an imported file, a loaded project) for
// display/re-save purposes only — it isn't part of the P1.11 undo history.
let sourceName: string | undefined;
const WORK_IN_PROGRESS_KEY = "note-city:work-in-progress";

function currentProject(): Project {
  const project: Project = { version: 1, notes: snapshotNotes() };
  if (sourceName) project.sourceName = sourceName;
  return project;
}

function persistWorkInProgress() {
  try {
    localStorage.setItem(WORK_IN_PROGRESS_KEY, serialize(currentProject()));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — autosave is
    // best-effort, not a feature the rest of the app depends on.
  }
}

// Returns the restored project, or null if there was nothing to restore
// (first visit, or the saved data was cleared/corrupt).
function restoreWorkInProgress(): Project | null {
  try {
    const saved = localStorage.getItem(WORK_IN_PROGRESS_KEY);
    return saved ? parse(saved) : null;
  } catch {
    return null;
  }
}

function render() {
  const activeEffects: SkylineEffects = dragState ? effects : { ...effects, hoverNoteId, hoverMode };
  drawSkyline(canvasCtx, notes, skylineOptions, playheadTime, activeEffects);
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
  if (dragState) return; // the window-level drag mousemove handler owns rendering during a drag
  const point = pointFromEvent(event);
  const hovered = findNoteAt(notes, point, skylineOptions);
  hoverLabel.textContent = hovered
    ? `${midiToSolfege(hovered.midi)} (${midiToName(hovered.midi)})`
    : " ";

  if (hovered) {
    const rect = noteRect(hovered, skylineOptions);
    const nearRightEdge = point.x >= rect.x + rect.width - EDGE_GRAB_PX;
    hoverNoteId = hovered.id;
    hoverMode = nearRightEdge ? "duration" : "pitch";
    canvas.style.cursor = nearRightEdge ? "ew-resize" : "ns-resize";
  } else {
    hoverNoteId = undefined;
    hoverMode = undefined;
    canvas.style.cursor = "crosshair";
  }
  render();
});

canvas.addEventListener("mouseleave", () => {
  hoverLabel.textContent = " ";
  hoverNoteId = undefined;
  hoverMode = undefined;
  canvas.style.cursor = "default";
  render();
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
    persistWorkInProgress();
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
  persistWorkInProgress();
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
  persistWorkInProgress();
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
  persistWorkInProgress();
});

document
  .querySelector<HTMLButtonElement>("#clear-skyline")!
  .addEventListener("click", () => {
    if (notes.length === 0) return;
    recordHistory();
    notes.length = 0;
    sourceName = undefined;
    skylineOptions = { ...DEFAULT_SKYLINE_OPTIONS };
    resetCanvasWidth();
    playheadTime = undefined;
    render();
    persistWorkInProgress();
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

// How far ahead of "now" to create oscillators for. Creating one per note
// up front (docs/BUGS.md BUG-5) is fine for a short hand-placed melody, but
// a 5-minute real song can have thousands of notes — building that many
// OscillatorNode/GainNode pairs synchronously in one go measurably delays
// when the audio graph starts actually producing sound. Scheduling only the
// next few seconds' worth at a time, and topping up on every tick, keeps
// the number of live nodes small regardless of the song's total length.
const SCHEDULE_AHEAD_SEC = 2;

function playAll() {
  if (notes.length === 0) return;
  stopPlayback();
  ctx ??= new AudioContext();
  const now = ctx.currentTime;
  const events = schedule(notes, now); // sorted by .at, since notes are sorted by start
  let nextEventIndex = 0;

  const totalDuration = Math.max(...notes.map((note) => note.start + note.duration));

  function scheduleDueEvents() {
    const horizon = ctx!.currentTime + SCHEDULE_AHEAD_SEC;
    while (nextEventIndex < events.length && events[nextEventIndex].at < horizon) {
      const event = events[nextEventIndex];
      activeOscillators.push(playNote(ctx!, event.freq, event.at, event.dur));
      nextEventIndex++;
    }
  }

  scheduleDueEvents();

  function tick() {
    const elapsed = ctx!.currentTime - now;
    scheduleDueEvents();
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
  sourceName = undefined;
  skylineOptions = { ...DEFAULT_SKYLINE_OPTIONS };
  resetCanvasWidth();
  playheadTime = undefined;
  render();
  persistWorkInProgress();
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

const importStatusText = document.querySelector<HTMLSpanElement>("#import-status-text")!;
const importSpinner = document.querySelector<HTMLSpanElement>("#import-spinner")!;
const importProgress = document.querySelector<HTMLProgressElement>("#import-progress")!;
const importFileInput = document.querySelector<HTMLInputElement>("#import-file")!;
const playOriginalButton = document.querySelector<HTMLButtonElement>("#play-original")!;
const playSynthSongButton = document.querySelector<HTMLButtonElement>("#play-synth-song")!;

// So Minh can tell running/hung/errored apart at every moment (docs/BUGS.md
// BUG-6) instead of one static line that doesn't change until the whole
// pipeline finishes. "transcribing" gets a real percentage from Basic
// Pitch's own progress callback (see docs/PLAN.md DR-13) since decode has no
// such hook and is fast in practice, a spinner is enough for it.
type ImportStage = "decoding" | "transcribing" | "done" | "error";

function setImportStage(
  stage: ImportStage,
  fileName: string,
  percent?: number,
  noteCount?: number,
  errorMessage?: string,
) {
  importStatus.className = `import-status import-status--${stage}`;
  importSpinner.hidden = stage !== "decoding";
  importProgress.hidden = stage !== "transcribing";
  if (stage === "transcribing") importProgress.value = Math.round((percent ?? 0) * 100);

  if (stage === "decoding") {
    importStatusText.textContent = `Decoding ${fileName}...`;
  } else if (stage === "transcribing") {
    importStatusText.textContent = `Transcribing ${fileName}... ${Math.round((percent ?? 0) * 100)}%`;
  } else if (stage === "done") {
    importStatusText.textContent =
      `${fileName}: ${originalDurationSec.toFixed(2)}s, ${noteCount} notes found`;
  } else {
    importStatusText.textContent = `Failed to process ${fileName}: ${errorMessage}`;
  }
}

const importStatus = document.querySelector<HTMLDivElement>("#import-status")!;

importFileInput.addEventListener("change", async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  playOriginalButton.disabled = true;
  playSynthSongButton.disabled = true;
  importFileInput.disabled = true;
  setImportStage("decoding", file.name);
  try {
    const pcm = await decodeFile(file);
    originalPcm = pcm;
    originalDurationSec = pcm.length / TARGET_SAMPLE_RATE;

    setImportStage("transcribing", file.name, 0);
    const raw = await transcribe(pcm, undefined, (percent) => {
      setImportStage("transcribing", file.name, percent);
    });
    const cleaned = mergeAdjacent(
      filterShort(filterLowConfidence(raw, MIN_CONFIDENCE), MIN_NOTE_DURATION_SEC),
      MERGE_GAP_SEC,
    );

    recordHistory();
    notes.length = 0;
    notes.push(...cleaned);
    sourceName = file.name;
    // viewportWidth is always the frame's own width (DEFAULT_CANVAS_WIDTH), not
    // the current canvas.width — that may already be widened from a previous
    // long import, and feeding it back in would let the canvas only ever grow.
    const fit = fitSkylineOptions(notes, DEFAULT_CANVAS_WIDTH, skylineOptions.canvasHeight);
    skylineOptions = fit.options;
    canvas.width = fit.canvasWidth;
    playheadTime = undefined;
    render();
    persistWorkInProgress();

    setImportStage("done", file.name, undefined, cleaned.length);
    playOriginalButton.disabled = false;
    playSynthSongButton.disabled = notes.length === 0;
  } catch (err) {
    originalPcm = null;
    setImportStage("error", file.name, undefined, undefined, (err as Error).message);
  } finally {
    importFileInput.disabled = false;
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

// Loads a Project's notes/sourceName into the shared skyline state, refitting
// the canvas since a saved project (e.g. an edited real song) may need more
// than the default 760px/60-72 midi scale — same refit as a fresh import.
function loadProject(project: Project) {
  recordHistory();
  notes.length = 0;
  notes.push(...project.notes);
  sourceName = project.sourceName;
  const fit = fitSkylineOptions(notes, DEFAULT_CANVAS_WIDTH, skylineOptions.canvasHeight);
  skylineOptions = fit.options;
  canvas.width = fit.canvasWidth;
  playheadTime = undefined;
  render();
  persistWorkInProgress();
}

document
  .querySelector<HTMLButtonElement>("#save-project")!
  .addEventListener("click", () => {
    const blob = new Blob([serialize(currentProject())], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = sourceName ? `${sourceName}.notecity.json` : "project.json";
    anchor.click();
    URL.revokeObjectURL(url);
  });

document
  .querySelector<HTMLInputElement>("#load-project")!
  .addEventListener("change", async (event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      loadProject(parse(await file.text()));
    } catch (err) {
      window.alert(`Could not load ${file.name}: ${(err as Error).message}`);
    } finally {
      input.value = "";
    }
  });

// A page reload should pick up the last in-progress melody, if any, instead
// of resetting to the P1.6 seed — this only replaces the seed at startup, it
// never overwrites the very first localStorage write (that happens on the
// first mutating action, see persistWorkInProgress's call sites above).
const workInProgress = restoreWorkInProgress();
if (workInProgress) loadProject(workInProgress);

render();

import "./style.css";
import { schedule } from "./audio/scheduler";
import { playNote } from "./audio/synth";
import { midiToName, midiToSolfege } from "./notes/mapping";
import { drawSkyline } from "./ui/skyline";
import { findNoteAt } from "./ui/hitTest";
import type { SkylineOptions } from "./ui/geometry";
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
  <p>Hover a building to see its note name. Press Play to hear it and watch the playhead.</p>
  <button id="play-skyline" type="button">Play</button>
  <canvas id="skyline" width="500" height="200"></canvas>
  <div id="hover-label">&nbsp;</div>
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

// Fixed 5-note test set for the P1.4 checkpoint: not monotonic in pitch, so
// "which building is tallest" takes an actual look, not just "the last one".
const skylineNotes: Note[] = [
  { id: "n0", midi: 60, start: 0.0, duration: 0.5, velocity: 0.8 }, // C4
  { id: "n1", midi: 67, start: 0.5, duration: 0.5, velocity: 0.8 }, // G4
  { id: "n2", midi: 64, start: 1.0, duration: 0.5, velocity: 0.8 }, // E4
  { id: "n3", midi: 72, start: 1.5, duration: 0.5, velocity: 0.8 }, // C5 — tallest
  { id: "n4", midi: 65, start: 2.0, duration: 0.5, velocity: 0.8 }, // F4
];

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
  drawSkyline(canvasCtx, skylineNotes, skylineOptions, playheadTime);
}

// Solfège (Đô Rê Mi...) is the default label — Minh knows that, not letter
// names — with the letter name alongside for cross-reference (docs/PLAN.md DR-8).
canvas.addEventListener("mousemove", (event) => {
  const bounds = canvas.getBoundingClientRect();
  const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  const hovered = findNoteAt(skylineNotes, point, skylineOptions);
  hoverLabel.textContent = hovered
    ? `${midiToSolfege(hovered.midi)} (${midiToName(hovered.midi)})`
    : " ";
});

canvas.addEventListener("mouseleave", () => {
  hoverLabel.textContent = " ";
});

document
  .querySelector<HTMLButtonElement>("#play-skyline")!
  .addEventListener("click", () => {
    ctx ??= new AudioContext();
    const now = ctx.currentTime;
    const events = schedule(skylineNotes, now);
    for (const event of events) {
      playNote(ctx, event.freq, event.at, event.dur);
    }

    const totalDuration = Math.max(
      ...skylineNotes.map((note) => note.start + note.duration),
    );

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
  });

render();

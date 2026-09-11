import "./style.css";
import { schedule } from "./audio/scheduler";
import { playNote } from "./audio/synth";
import type { Note } from "./notes/types";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<section id="center">
  <h1>note-city playground</h1>
  <p>Press a button, hear a note.</p>
  <button id="play-c4" type="button">Play C4</button>
  <button id="play-c5" type="button">Play C5</button>
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

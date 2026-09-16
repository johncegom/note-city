import * as tf from '@tensorflow/tfjs';
import {
  BasicPitch,
  addPitchBendsToNoteEvents,
  noteFramesToTime,
  outputToNotesPoly,
} from '@spotify/basic-pitch';
import type { RawNote } from '../notes/types';

// Where the app fetches the model from in the browser. Overridden in tests
// with a Promise<tf.GraphModel> loaded from disk (see test/transcribe/basicPitch.test.ts).
export const DEFAULT_MODEL_URL = '/basic-pitch/model/model.json';

export async function transcribe(
  pcm: Float32Array,
  modelSource: string | Promise<tf.GraphModel> = DEFAULT_MODEL_URL,
): Promise<RawNote[]> {
  await tf.ready();

  const basicPitch = new BasicPitch(modelSource);
  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];
  await basicPitch.evaluateModel(
    pcm,
    (f, o, c) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    () => {},
  );

  const notes = noteFramesToTime(addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets)));
  notes.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);

  return notes.map((n, i) => ({
    id: `raw-${i}`,
    midi: Math.round(n.pitchMidi),
    start: n.startTimeSeconds,
    duration: n.durationSeconds,
    velocity: n.amplitude,
    confidence: n.amplitude,
  }));
}

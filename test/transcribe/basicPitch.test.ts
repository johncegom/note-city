import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as tf from '@tensorflow/tfjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { transcribe } from '../../src/transcribe/basicPitch';
import { makeSine } from '../fixtures/makeSine';

// The bundled model is shipped as static files inside the npm package. In the
// browser the app fetches these over HTTP; in Node (this test) we read them
// straight off disk with a plain tf.io.IOHandler, no tfjs-node required.
const MODEL_DIR = path.resolve('node_modules/@spotify/basic-pitch/model');

function fsModelHandler(): tf.io.IOHandler {
  return {
    load: async () => {
      const modelJSON = JSON.parse(readFileSync(path.join(MODEL_DIR, 'model.json'), 'utf8'));
      const weightPaths: string[] = modelJSON.weightsManifest.flatMap(
        (g: { paths: string[] }) => g.paths,
      );
      const buffers = weightPaths.map((p) => readFileSync(path.join(MODEL_DIR, p)));
      const totalBytes = buffers.reduce((sum, b) => sum + b.byteLength, 0);
      const weightData = new Uint8Array(totalBytes);
      let offset = 0;
      for (const b of buffers) {
        weightData.set(new Uint8Array(b.buffer, b.byteOffset, b.byteLength), offset);
        offset += b.byteLength;
      }
      return {
        modelTopology: modelJSON.modelTopology,
        weightSpecs: modelJSON.weightsManifest.flatMap((g: { weights: unknown[] }) => g.weights),
        weightData: weightData.buffer,
        format: modelJSON.format,
        generatedBy: modelJSON.generatedBy,
        convertedBy: modelJSON.convertedBy,
      };
    },
  };
}

describe('transcribe (Basic Pitch contract tests)', () => {
  let model: Promise<tf.GraphModel>;

  beforeAll(async () => {
    await tf.setBackend('cpu');
    await tf.ready();
    model = tf.loadGraphModel(fsModelHandler());
    await model;
  }, 30_000);

  it('a 440 Hz sine for 1s produces a note at midi 69 with duration in range', async () => {
    const pcm = makeSine(440, 1.0, 22050);
    const notes = await transcribe(pcm, model);

    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0].midi).toBe(69);
    expect(notes[0].duration).toBeGreaterThanOrEqual(0.8);
    expect(notes[0].duration).toBeLessThanOrEqual(1.2);
  }, 30_000);

  it('two sines in sequence (440 then 880) produce 2 notes, midi 69 then 81, in order', async () => {
    const first = makeSine(440, 0.5, 22050);
    const second = makeSine(880, 0.5, 22050);
    const pcm = new Float32Array(first.length + second.length);
    pcm.set(first, 0);
    pcm.set(second, first.length);

    const notes = await transcribe(pcm, model);

    expect(notes.length).toBe(2);
    expect(notes[0].midi).toBe(69);
    expect(notes[1].midi).toBe(81);
    expect(notes[0].start).toBeLessThan(notes[1].start);
  }, 30_000);
});

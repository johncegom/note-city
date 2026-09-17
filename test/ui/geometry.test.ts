import { describe, expect, test } from "vitest";
import { fitSkylineOptions, noteRect, xToTime, yToMidi } from "../../src/ui/geometry";
import type { Note } from "../../src/notes/types";

function makeNote(overrides: Partial<Note>): Note {
  return {
    id: "n1",
    midi: 60,
    start: 0,
    duration: 1,
    velocity: 0.8,
    ...overrides,
  };
}

const baseOptions = {
  midiRange: { min: 60, max: 72 },
  pxPerSec: 100,
  canvasHeight: 200,
};

describe("noteRect", () => {
  test("x and width scale with pxPerSec", () => {
    const note = makeNote({ start: 2, duration: 0.5 });
    const rect = noteRect(note, baseOptions);
    expect(rect.x).toBe(200);
    expect(rect.width).toBe(50);
  });

  test("lowest midi in range clamps to the minimum bar height, anchored at the bottom", () => {
    const note = makeNote({ midi: 60 });
    const rect = noteRect(note, baseOptions);
    expect(rect.height).toBe(6); // default minBarHeight
    expect(rect.y).toBe(200 - 6);
  });

  test("highest midi in range fills the full canvas height", () => {
    const note = makeNote({ midi: 72 });
    const rect = noteRect(note, baseOptions);
    expect(rect.height).toBe(200);
    expect(rect.y).toBe(0);
  });

  test("a higher midi produces a taller bar than a lower one", () => {
    const low = noteRect(makeNote({ midi: 62 }), baseOptions);
    const high = noteRect(makeNote({ midi: 70 }), baseOptions);
    expect(high.height).toBeGreaterThan(low.height);
    expect(high.y).toBeLessThan(low.y);
  });

  test("custom minBarHeight is respected", () => {
    const note = makeNote({ midi: 60 });
    const rect = noteRect(note, { ...baseOptions, minBarHeight: 20 });
    expect(rect.height).toBe(20);
  });
});

describe("yToMidi", () => {
  test("the bottom of the canvas maps to midiRange.min", () => {
    expect(yToMidi(200, baseOptions)).toBeCloseTo(60);
  });

  test("the top of the canvas maps to midiRange.max", () => {
    expect(yToMidi(0, baseOptions)).toBeCloseTo(72);
  });

  test("the middle of the canvas maps to the middle of the range", () => {
    expect(yToMidi(100, baseOptions)).toBeCloseTo(66);
  });

  test("is the inverse of the y produced by noteRect for an in-range midi", () => {
    const note = makeNote({ midi: 65 });
    const rect = noteRect(note, baseOptions);
    // noteRect anchors bars to the bottom, so compare against the rect's top edge.
    expect(yToMidi(rect.y, baseOptions)).toBeCloseTo(65);
  });
});

describe("xToTime", () => {
  test("scales x by pxPerSec", () => {
    expect(xToTime(200, 100)).toBeCloseTo(2);
  });

  test("x = 0 is time 0", () => {
    expect(xToTime(0, 100)).toBe(0);
  });
});

describe("fitSkylineOptions", () => {
  test("empty notes array returns sane defaults, no divide-by-zero", () => {
    const options = fitSkylineOptions([], 700, 200);
    expect(options.canvasHeight).toBe(200);
    expect(Number.isFinite(options.pxPerSec)).toBe(true);
    expect(options.pxPerSec).toBeGreaterThan(0);
    expect(options.midiRange.max).toBeGreaterThan(options.midiRange.min);
  });

  test("single note gets at least the minimum midi span, centered on it", () => {
    const notes = [makeNote({ midi: 60, start: 0, duration: 1 })];
    const options = fitSkylineOptions(notes, 700, 200);
    expect(options.midiRange.max - options.midiRange.min).toBeGreaterThanOrEqual(12);
    expect(60).toBeGreaterThanOrEqual(options.midiRange.min);
    expect(60).toBeLessThanOrEqual(options.midiRange.max);
  });

  test("wide pitch spread widens the range beyond the minimum span, with padding", () => {
    const notes = [
      makeNote({ id: "a", midi: 48, start: 0, duration: 1 }),
      makeNote({ id: "b", midi: 84, start: 1, duration: 1 }),
    ];
    const options = fitSkylineOptions(notes, 700, 200);
    expect(options.midiRange.min).toBeLessThan(48);
    expect(options.midiRange.max).toBeGreaterThan(84);
  });

  test("range never exceeds the piano range (21..108)", () => {
    const notes = [
      makeNote({ id: "a", midi: 24, start: 0, duration: 1 }),
      makeNote({ id: "b", midi: 104, start: 1, duration: 1 }),
    ];
    const options = fitSkylineOptions(notes, 700, 200);
    expect(options.midiRange.min).toBeGreaterThanOrEqual(21);
    expect(options.midiRange.max).toBeLessThanOrEqual(108);
  });

  test("pxPerSec fits the total duration into the canvas width", () => {
    const notes = [makeNote({ midi: 60, start: 0, duration: 10 })]; // ends at 10s
    const options = fitSkylineOptions(notes, 700, 200);
    expect(options.pxPerSec * 10).toBeCloseTo(700, 0);
  });

  test("pxPerSec is clamped for a very short clip instead of exploding", () => {
    const notes = [makeNote({ midi: 60, start: 0, duration: 0.01 })];
    const options = fitSkylineOptions(notes, 700, 200);
    expect(options.pxPerSec).toBeLessThanOrEqual(200);
  });

  test("pxPerSec is clamped for a very long clip instead of collapsing to near-zero", () => {
    const notes = [makeNote({ midi: 60, start: 0, duration: 600 })];
    const options = fitSkylineOptions(notes, 700, 200);
    expect(options.pxPerSec).toBeGreaterThanOrEqual(5);
  });

  test("total duration uses the latest note end, not just the last note in array order", () => {
    const notes = [
      makeNote({ id: "a", midi: 60, start: 5, duration: 1 }), // ends at 6
      makeNote({ id: "b", midi: 62, start: 0, duration: 2 }), // ends at 2
    ];
    const options = fitSkylineOptions(notes, 700, 200);
    expect(options.pxPerSec * 6).toBeCloseTo(700, 0);
  });
});

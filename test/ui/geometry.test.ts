import { describe, expect, test } from "vitest";
import { noteRect } from "../../src/ui/geometry";
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

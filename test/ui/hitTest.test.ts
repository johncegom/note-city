import { describe, expect, test } from "vitest";
import { findNoteAt } from "../../src/ui/hitTest";
import type { SkylineOptions } from "../../src/ui/geometry";
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

const options: SkylineOptions = {
  midiRange: { min: 60, max: 72 },
  pxPerSec: 100,
  canvasHeight: 200,
};

describe("findNoteAt", () => {
  test("returns undefined for an empty note list", () => {
    expect(findNoteAt([], { x: 10, y: 10 }, options)).toBeUndefined();
  });

  test("returns the note whose rect contains the point", () => {
    const note = makeNote({ id: "a", midi: 72, start: 0, duration: 1 });
    // midi 72 (top of range) fills the full canvas height: rect is (0,0)-(100,200)
    const found = findNoteAt([note], { x: 50, y: 100 }, options);
    expect(found?.id).toBe("a");
  });

  test("returns undefined when the point is outside every rect", () => {
    const note = makeNote({ id: "a", midi: 72, start: 0, duration: 1 });
    const found = findNoteAt([note], { x: 500, y: 500 }, options);
    expect(found).toBeUndefined();
  });

  test("when rects overlap, returns the later note (drawn on top)", () => {
    const a = makeNote({ id: "a", midi: 72, start: 0, duration: 1 });
    const b = makeNote({ id: "b", midi: 72, start: 0, duration: 1 });
    const found = findNoteAt([a, b], { x: 50, y: 100 }, options);
    expect(found?.id).toBe("b");
  });

  test("point exactly on the left/top edge of a rect counts as inside", () => {
    const note = makeNote({ id: "a", midi: 72, start: 0, duration: 1 });
    const found = findNoteAt([note], { x: 0, y: 0 }, options);
    expect(found?.id).toBe("a");
  });

  test("point on the right/bottom edge of a rect counts as outside (exclusive)", () => {
    const note = makeNote({ id: "a", midi: 72, start: 0, duration: 1 });
    const found = findNoteAt([note], { x: 100, y: 200 }, options);
    expect(found).toBeUndefined();
  });
});

import { describe, expect, test } from "vitest";
import { maxDurationAt, overlapsAny, timeRangesOverlap } from "../../src/notes/overlap";
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

describe("timeRangesOverlap", () => {
  test("two notes at the same start overlap", () => {
    const a = makeNote({ id: "a", start: 0, duration: 0.5 });
    const b = makeNote({ id: "b", start: 0, duration: 0.5 });
    expect(timeRangesOverlap(a, b)).toBe(true);
  });

  test("a note starting inside another's range overlaps", () => {
    const a = makeNote({ id: "a", start: 0, duration: 0.5 });
    const b = makeNote({ id: "b", start: 0.2, duration: 0.5 });
    expect(timeRangesOverlap(a, b)).toBe(true);
  });

  test("adjacent notes that only touch at the boundary do not overlap", () => {
    const a = makeNote({ id: "a", start: 0, duration: 0.5 });
    const b = makeNote({ id: "b", start: 0.5, duration: 0.5 });
    expect(timeRangesOverlap(a, b)).toBe(false);
  });

  test("notes far apart do not overlap", () => {
    const a = makeNote({ id: "a", start: 0, duration: 0.5 });
    const b = makeNote({ id: "b", start: 5, duration: 0.5 });
    expect(timeRangesOverlap(a, b)).toBe(false);
  });

  test("is symmetric", () => {
    const a = makeNote({ id: "a", start: 0.2, duration: 0.5 });
    const b = makeNote({ id: "b", start: 0, duration: 0.5 });
    expect(timeRangesOverlap(a, b)).toBe(timeRangesOverlap(b, a));
  });
});

describe("overlapsAny", () => {
  test("false against an empty list", () => {
    const note = makeNote({ id: "a" });
    expect(overlapsAny(note, [])).toBe(false);
  });

  test("true when one other note overlaps", () => {
    const note = makeNote({ id: "a", start: 0, duration: 0.5 });
    const others = [makeNote({ id: "b", start: 0.2, duration: 0.5 })];
    expect(overlapsAny(note, others)).toBe(true);
  });

  test("excludes the note's own id (comparing against itself)", () => {
    const note = makeNote({ id: "a", start: 0, duration: 0.5 });
    expect(overlapsAny(note, [note])).toBe(false);
  });

  test("false when no other note overlaps", () => {
    const note = makeNote({ id: "a", start: 0, duration: 0.5 });
    const others = [
      makeNote({ id: "b", start: 0.5, duration: 0.5 }),
      makeNote({ id: "c", start: 5, duration: 0.5 }),
    ];
    expect(overlapsAny(note, others)).toBe(false);
  });
});

describe("maxDurationAt", () => {
  test("no cap when no other note starts after this one", () => {
    const note = makeNote({ id: "a", start: 1, duration: 0.5 });
    const others = [makeNote({ id: "b", start: 0, duration: 0.5 })];
    expect(maxDurationAt(note, others)).toBe(Infinity);
  });

  test("caps duration at the nearest following note's start", () => {
    const note = makeNote({ id: "a", start: 0, duration: 0.5 });
    const others = [
      makeNote({ id: "b", start: 1, duration: 0.5 }),
      makeNote({ id: "c", start: 2, duration: 0.5 }),
    ];
    expect(maxDurationAt(note, others)).toBeCloseTo(1);
  });

  test("ignores the note's own id", () => {
    const note = makeNote({ id: "a", start: 0, duration: 0.5 });
    expect(maxDurationAt(note, [note])).toBe(Infinity);
  });
});

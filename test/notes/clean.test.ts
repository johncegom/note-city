import { describe, expect, test } from "vitest";
import { filterShort, filterLowConfidence, mergeAdjacent } from "../../src/notes/clean";
import type { Note, RawNote } from "../../src/notes/types";

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

function makeRawNote(overrides: Partial<RawNote>): RawNote {
  return { ...makeNote(overrides), confidence: 0.9, ...overrides };
}

describe("filterShort", () => {
  test("empty array stays empty", () => {
    expect(filterShort([], 0.1)).toEqual([]);
  });

  test("single note above threshold is kept", () => {
    const notes = [makeNote({ duration: 0.5 })];
    expect(filterShort(notes, 0.1)).toEqual(notes);
  });

  test("single note below threshold is dropped", () => {
    const notes = [makeNote({ duration: 0.05 })];
    expect(filterShort(notes, 0.1)).toEqual([]);
  });

  test("duration exactly at threshold is kept", () => {
    const notes = [makeNote({ duration: 0.1 })];
    expect(filterShort(notes, 0.1)).toEqual(notes);
  });

  test("does not mutate the input array", () => {
    const notes = [makeNote({ duration: 0.05 }), makeNote({ id: "n2", duration: 1 })];
    const copy = JSON.parse(JSON.stringify(notes));
    filterShort(notes, 0.1);
    expect(notes).toEqual(copy);
  });
});

describe("filterLowConfidence", () => {
  test("empty array stays empty", () => {
    expect(filterLowConfidence([], 0.5)).toEqual([]);
  });

  test("single note above threshold is kept", () => {
    const notes = [makeRawNote({ confidence: 0.9 })];
    expect(filterLowConfidence(notes, 0.5)).toEqual(notes);
  });

  test("single note below threshold is dropped", () => {
    const notes = [makeRawNote({ confidence: 0.2 })];
    expect(filterLowConfidence(notes, 0.5)).toEqual([]);
  });

  test("confidence exactly at threshold is kept", () => {
    const notes = [makeRawNote({ confidence: 0.5 })];
    expect(filterLowConfidence(notes, 0.5)).toEqual(notes);
  });

  test("does not mutate the input array", () => {
    const notes = [makeRawNote({ confidence: 0.2 }), makeRawNote({ id: "n2", confidence: 0.9 })];
    const copy = JSON.parse(JSON.stringify(notes));
    filterLowConfidence(notes, 0.5);
    expect(notes).toEqual(copy);
  });
});

describe("mergeAdjacent", () => {
  test("empty array stays empty", () => {
    expect(mergeAdjacent([], 0.1)).toEqual([]);
  });

  test("single note is unchanged", () => {
    const notes = [makeNote({})];
    expect(mergeAdjacent(notes, 0.1)).toEqual(notes);
  });

  test("two notes with the same start and same midi merge into one", () => {
    const a = makeNote({ id: "a", midi: 60, start: 0, duration: 1 });
    const b = makeNote({ id: "b", midi: 60, start: 0, duration: 1 });
    const result = mergeAdjacent([a, b], 0.1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "a", midi: 60, start: 0, duration: 1 });
  });

  test("same midi, gap smaller than threshold merges into one spanning note", () => {
    const a = makeNote({ id: "a", midi: 64, start: 0, duration: 1 }); // ends at 1
    const b = makeNote({ id: "b", midi: 64, start: 1.05, duration: 0.5 }); // gap 0.05
    const result = mergeAdjacent([a, b], 0.1);
    expect(result).toEqual([{ id: "a", midi: 64, start: 0, duration: 1.55, velocity: 0.8 }]);
  });

  test("gap exactly at threshold merges (inclusive)", () => {
    const a = makeNote({ id: "a", midi: 64, start: 0, duration: 1 }); // ends at 1
    const b = makeNote({ id: "b", midi: 64, start: 1.1, duration: 0.5 }); // gap exactly 0.1
    const result = mergeAdjacent([a, b], 0.1);
    expect(result).toHaveLength(1);
    expect(result[0].duration).toBeCloseTo(1.6, 10);
  });

  test("same midi but gap larger than threshold does not merge", () => {
    const a = makeNote({ id: "a", midi: 64, start: 0, duration: 1 }); // ends at 1
    const b = makeNote({ id: "b", midi: 64, start: 1.5, duration: 0.5 }); // gap 0.5
    const result = mergeAdjacent([a, b], 0.1);
    expect(result).toHaveLength(2);
  });

  test("different midi does not merge even with zero gap", () => {
    const a = makeNote({ id: "a", midi: 60, start: 0, duration: 1 });
    const b = makeNote({ id: "b", midi: 62, start: 1, duration: 1 });
    const result = mergeAdjacent([a, b], 0.5);
    expect(result).toHaveLength(2);
  });

  test("chains three adjacent same-midi notes into one", () => {
    const a = makeNote({ id: "a", midi: 60, start: 0, duration: 1 });
    const b = makeNote({ id: "b", midi: 60, start: 1.05, duration: 1 });
    const c = makeNote({ id: "c", midi: 60, start: 2.1, duration: 1 });
    const result = mergeAdjacent([a, b, c], 0.1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "a", start: 0 });
    expect(result[0].duration).toBeCloseTo(3.1, 10);
  });

  test("preserves order and does not mutate the input array", () => {
    const notes = [
      makeNote({ id: "a", midi: 60, start: 0, duration: 1 }),
      makeNote({ id: "b", midi: 62, start: 2, duration: 1 }),
    ];
    const copy = JSON.parse(JSON.stringify(notes));
    const result = mergeAdjacent(notes, 0.1);
    expect(notes).toEqual(copy);
    expect(result.map((n) => n.id)).toEqual(["a", "b"]);
  });

  test("works on RawNote[] and keeps the confidence field from the first note", () => {
    const a = makeRawNote({ id: "a", midi: 60, start: 0, duration: 1, confidence: 0.7 });
    const b = makeRawNote({ id: "b", midi: 60, start: 1.05, duration: 1, confidence: 0.9 });
    const result = mergeAdjacent([a, b], 0.1);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.7);
  });
});

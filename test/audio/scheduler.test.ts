import { describe, expect, test } from "vitest";
import { schedule } from "../../src/audio/scheduler";
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

describe("schedule", () => {
  test("empty notes array produces no events", () => {
    expect(schedule([], 0)).toEqual([]);
  });

  test("one note at start=0 plays at `now`", () => {
    const notes = [makeNote({ midi: 69, start: 0, duration: 1 })];
    const events = schedule(notes, 5);
    expect(events).toEqual([{ freq: 440, at: 5, dur: 1 }]);
  });

  test("note start offsets from `now`", () => {
    const notes = [makeNote({ midi: 60, start: 2, duration: 0.5 })];
    const events = schedule(notes, 10);
    expect(events[0].at).toBe(12);
    expect(events[0].dur).toBe(0.5);
  });

  test("multiple notes keep their relative order and timing", () => {
    const notes = [
      makeNote({ id: "a", midi: 60, start: 0, duration: 1 }),
      makeNote({ id: "b", midi: 72, start: 1, duration: 1 }),
    ];
    const events = schedule(notes, 0);
    expect(events).toHaveLength(2);
    expect(events[0].at).toBe(0);
    expect(events[1].at).toBe(1);
    expect(events[1].freq).toBeCloseTo(events[0].freq * 2, 5);
  });

  test("does not mutate the input notes array", () => {
    const notes = [makeNote({ start: 0, duration: 1 })];
    const copy = JSON.parse(JSON.stringify(notes));
    schedule(notes, 3);
    expect(notes).toEqual(copy);
  });
});

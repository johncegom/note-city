import { describe, expect, test } from "vitest";
import { serialize, parse } from "../../src/notes/project";
import type { Note, Project } from "../../src/notes/types";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    midi: 60,
    start: 0,
    duration: 1,
    velocity: 0.8,
    ...overrides,
  };
}

describe("serialize / parse round-trip", () => {
  test("project with no notes", () => {
    const p: Project = { version: 1, notes: [] };
    expect(parse(serialize(p))).toEqual(p);
  });

  test("project with several notes, all Note fields", () => {
    const p: Project = {
      version: 1,
      notes: [
        makeNote({ id: "a", midi: 60, start: 0, duration: 0.5, velocity: 0.8 }),
        makeNote({ id: "b", midi: 64, start: 0.5, duration: 1.2, velocity: 0.6 }),
      ],
    };
    expect(parse(serialize(p))).toEqual(p);
  });

  test("project with optional tempoBpm and sourceName present", () => {
    const p: Project = {
      version: 1,
      notes: [makeNote()],
      tempoBpm: 120,
      sourceName: "song.mp3",
    };
    expect(parse(serialize(p))).toEqual(p);
  });

  test("project with optional fields absent stays absent (no undefined keys added)", () => {
    const p: Project = { version: 1, notes: [makeNote()] };
    const roundTripped = parse(serialize(p));
    expect(roundTripped).toEqual(p);
    expect("tempoBpm" in roundTripped).toBe(false);
    expect("sourceName" in roundTripped).toBe(false);
  });
});

describe("parse validation", () => {
  test("throws on invalid JSON", () => {
    expect(() => parse("not json")).toThrow();
  });

  test("throws when version is missing", () => {
    expect(() => parse(JSON.stringify({ notes: [] }))).toThrow();
  });

  test("throws when version is not 1", () => {
    expect(() => parse(JSON.stringify({ version: 2, notes: [] }))).toThrow();
  });

  test("throws when notes is missing", () => {
    expect(() => parse(JSON.stringify({ version: 1 }))).toThrow();
  });

  test("throws when notes is not an array", () => {
    expect(() => parse(JSON.stringify({ version: 1, notes: "nope" }))).toThrow();
  });
});

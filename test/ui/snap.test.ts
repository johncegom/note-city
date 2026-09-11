import { describe, expect, test } from "vitest";
import { snapMidi, snapTime } from "../../src/ui/snap";

describe("snapMidi", () => {
  const range = { min: 60, max: 72 };

  test("rounds to the nearest integer", () => {
    expect(snapMidi(64.3, range)).toBe(64);
    expect(snapMidi(64.6, range)).toBe(65);
  });

  test("rounds a value exactly halfway up", () => {
    expect(snapMidi(64.5, range)).toBe(65);
  });

  test("clamps below range.min", () => {
    expect(snapMidi(50, range)).toBe(60);
  });

  test("clamps above range.max", () => {
    expect(snapMidi(90, range)).toBe(72);
  });

  test("a value already an integer in range is unchanged", () => {
    expect(snapMidi(67, range)).toBe(67);
  });
});

describe("snapTime", () => {
  test("rounds to the nearest multiple of the step", () => {
    expect(snapTime(0.23, 0.1)).toBeCloseTo(0.2);
    expect(snapTime(0.27, 0.1)).toBeCloseTo(0.3);
  });

  test("clamps negative values to 0", () => {
    expect(snapTime(-0.5, 0.1)).toBe(0);
  });

  test("a value already on the step grid is unchanged", () => {
    expect(snapTime(0.5, 0.1)).toBeCloseTo(0.5);
  });

  test("zero stays zero", () => {
    expect(snapTime(0, 0.1)).toBe(0);
  });
});

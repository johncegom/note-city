import { describe, expect, test } from "vitest";
import { toMono } from "../../src/audio/decode";

describe("toMono", () => {
  test("averages a 2-channel buffer sample-wise", () => {
    const left = new Float32Array([1, 0, -1]);
    const right = new Float32Array([0, 0, 1]);
    expect(Array.from(toMono([left, right]))).toEqual([0.5, 0, 0]);
  });

  test("passes a 1-channel buffer through unchanged", () => {
    const only = new Float32Array([0.2, -0.4, 0.6]);
    expect(Array.from(toMono([only]))).toEqual(Array.from(only));
  });

  test("averages 3+ channels", () => {
    const a = new Float32Array([1, 1]);
    const b = new Float32Array([0, 1]);
    const c = new Float32Array([-1, 1]);
    expect(Array.from(toMono([a, b, c]))).toEqual([0, 1]);
  });

  test("no channels produces an empty buffer", () => {
    expect(toMono([]).length).toBe(0);
  });
});

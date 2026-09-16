import { describe, expect, test } from "vitest";
import { makeSine } from "./makeSine";

describe("makeSine", () => {
  test("length matches seconds * sampleRate", () => {
    expect(makeSine(440, 1, 22050).length).toBe(22050);
    expect(makeSine(440, 0.5, 22050).length).toBe(11025);
  });

  test("starts at 0 (phase 0) and stays within [-1, 1]", () => {
    const samples = makeSine(440, 1, 22050);
    expect(samples[0]).toBeCloseTo(0);
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  test("completes exactly N cycles for a frequency that divides the sample rate evenly", () => {
    const freq = 50; // 22050 / 50 = 441 samples per cycle, exact
    const samples = makeSine(freq, 1, 22050);
    // one full cycle back to (near) 0 with a rising slope, `freq` times
    // the buffer stops exactly at t=1s, one sample short of the 50th cycle's
    // own rising crossing (which would land at that boundary sample)
    let risingZeroCrossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i - 1] < 0 && samples[i] >= 0) risingZeroCrossings++;
    }
    expect(risingZeroCrossings).toBe(freq - 1);
  });
});

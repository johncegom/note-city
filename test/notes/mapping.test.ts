import { describe, expect, test } from "vitest";
import {
  midiToFreq,
  midiToName,
  midiToSolfege,
  midiToHeight,
  durationToWidth,
} from "../../src/notes/mapping";

describe("midiToFreq", () => {
  test("midi 69 (A4) is 440 Hz", () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 5);
  });

  test("midi 60 (C4) is ~261.63 Hz", () => {
    expect(midiToFreq(60)).toBeCloseTo(261.6256, 3);
  });

  test("one octave up doubles the frequency", () => {
    expect(midiToFreq(81)).toBeCloseTo(midiToFreq(69) * 2, 5);
  });
});

describe("midiToName", () => {
  test("60 is C4", () => {
    expect(midiToName(60)).toBe("C4");
  });

  test("69 is A4", () => {
    expect(midiToName(69)).toBe("A4");
  });

  test("61 is C#4", () => {
    expect(midiToName(61)).toBe("C#4");
  });

  test("0 is C-1", () => {
    expect(midiToName(0)).toBe("C-1");
  });
});

describe("midiToSolfege", () => {
  test("60 is Đô4 (fixed-do: Đô = C)", () => {
    expect(midiToSolfege(60)).toBe("Đô4");
  });

  test("69 is La4 (fixed-do: La = A)", () => {
    expect(midiToSolfege(69)).toBe("La4");
  });

  test("61 is Đô#4", () => {
    expect(midiToSolfege(61)).toBe("Đô#4");
  });

  test("0 is Đô-1", () => {
    expect(midiToSolfege(0)).toBe("Đô-1");
  });

  test("all 12 pitch classes in one octave", () => {
    const expected = [
      "Đô4",
      "Đô#4",
      "Rê4",
      "Rê#4",
      "Mi4",
      "Fa4",
      "Fa#4",
      "Sol4",
      "Sol#4",
      "La4",
      "La#4",
      "Si4",
    ];
    for (let i = 0; i < 12; i++) {
      expect(midiToSolfege(60 + i)).toBe(expected[i]);
    }
  });

  test("octave number matches midiToName for the same midi", () => {
    expect(midiToSolfege(72)).toBe("Đô5");
    expect(midiToName(72)).toBe("C5");
  });
});

describe("midiToHeight", () => {
  const range = { min: 21, max: 108 };

  test("min of range maps to 0", () => {
    expect(midiToHeight(21, range)).toBe(0);
  });

  test("max of range maps to 1", () => {
    expect(midiToHeight(108, range)).toBe(1);
  });

  test("midpoint maps to 0.5", () => {
    expect(midiToHeight(64.5, range)).toBeCloseTo(0.5, 10);
  });

  test("below range clamps to 0", () => {
    expect(midiToHeight(10, range)).toBe(0);
  });

  test("above range clamps to 1", () => {
    expect(midiToHeight(120, range)).toBe(1);
  });
});

describe("durationToWidth", () => {
  test("1 second at 100 px/s is 100", () => {
    expect(durationToWidth(1, 100)).toBe(100);
  });

  test("0 duration is 0 width", () => {
    expect(durationToWidth(0, 100)).toBe(0);
  });

  test("scales linearly", () => {
    expect(durationToWidth(2.5, 40)).toBe(100);
  });
});

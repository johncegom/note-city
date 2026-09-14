import { describe, expect, test } from "vitest";
import { pushHistory, undo } from "../../src/ui/history";

describe("pushHistory", () => {
  test("appends a snapshot onto an empty stack", () => {
    const stack = pushHistory([], "a");
    expect(stack).toEqual(["a"]);
  });

  test("appends onto a non-empty stack without mutating the input", () => {
    const original = ["a", "b"];
    const stack = pushHistory(original, "c");
    expect(stack).toEqual(["a", "b", "c"]);
    expect(original).toEqual(["a", "b"]); // not mutated
  });
});

describe("undo", () => {
  test("pops the last snapshot and returns it as the previous state", () => {
    const { previous, stack } = undo(["a", "b", "c"]);
    expect(previous).toBe("c");
    expect(stack).toEqual(["a", "b"]);
  });

  test("undo on an empty stack is a no-op: undefined previous, stack still empty", () => {
    const { previous, stack } = undo([]);
    expect(previous).toBeUndefined();
    expect(stack).toEqual([]);
  });

  test("undo past the start repeatedly stays empty, never throws", () => {
    const first = undo(["only"]);
    expect(first.stack).toEqual([]);
    const second = undo(first.stack);
    expect(second.previous).toBeUndefined();
    expect(second.stack).toEqual([]);
  });

  test("does not mutate the input stack", () => {
    const original = ["a", "b"];
    undo(original);
    expect(original).toEqual(["a", "b"]);
  });
});

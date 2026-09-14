/** Push a new snapshot onto an in-memory history stack, returning a new stack (input untouched). */
export function pushHistory<T>(stack: readonly T[], state: T): T[] {
  return [...stack, state];
}

/** Pop the most recent snapshot off the stack. Undo past the start is a no-op: `previous` is undefined, stack stays empty. */
export function undo<T>(stack: readonly T[]): { previous: T | undefined; stack: T[] } {
  if (stack.length === 0) {
    return { previous: undefined, stack: [] };
  }
  return { previous: stack[stack.length - 1], stack: stack.slice(0, -1) };
}

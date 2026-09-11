// Shared data contract. No module invents its own note shape (see PLAN.md section 4).

export type Note = {
  id: string; // stable across edits
  midi: number; // 0..127. 60 = C4 (middle C). +12 = one octave higher
  start: number; // seconds from the start of the clip
  duration: number; // seconds, > 0
  velocity: number; // 0..1, loudness. v1 default 0.8
};

export type RawNote = Note & { confidence: number }; // from transcribe, not yet cleaned

export type Project = {
  version: 1;
  notes: Note[];
  tempoBpm?: number; // unused in Phase 1
  sourceName?: string; // original file name if any
};

// A midi range for mapping pitch to vertical position, e.g. the piano range
// used by the skyline (21..108).
export type MidiRange = {
  min: number;
  max: number;
};

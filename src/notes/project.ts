import type { Note, Project } from "./types";

export function serialize(project: Project): string {
  return JSON.stringify(project);
}

function isNote(value: unknown): value is Note {
  if (typeof value !== "object" || value === null) return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.id === "string" &&
    typeof n.midi === "number" &&
    typeof n.start === "number" &&
    typeof n.duration === "number" &&
    typeof n.velocity === "number"
  );
}

export function parse(json: string): Project {
  const raw = JSON.parse(json) as Record<string, unknown>;

  if (raw.version !== 1) {
    throw new Error(`Unsupported project version: ${String(raw.version)}`);
  }
  if (!Array.isArray(raw.notes) || !raw.notes.every(isNote)) {
    throw new Error("Project.notes must be an array of Note");
  }

  const project: Project = { version: 1, notes: raw.notes };
  if (typeof raw.tempoBpm === "number") project.tempoBpm = raw.tempoBpm;
  if (typeof raw.sourceName === "string") project.sourceName = raw.sourceName;
  return project;
}

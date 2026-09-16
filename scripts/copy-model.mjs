// Copies @spotify/basic-pitch's model files (not app source, ~900KB) into
// public/ so Vite serves them at src/transcribe/basicPitch.ts's DEFAULT_MODEL_URL.
// Run automatically via npm's predev/prebuild hooks (see package.json).
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(rootDir, "node_modules", "@spotify", "basic-pitch", "model");
const dest = join(rootDir, "public", "basic-pitch", "model");

if (!existsSync(src)) {
  console.error(`copy-model: source not found at ${src} — is @spotify/basic-pitch installed?`);
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`copy-model: copied basic-pitch model to ${dest}`);

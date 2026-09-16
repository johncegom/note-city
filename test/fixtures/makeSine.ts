/**
 * Deterministic sine-wave PCM, generated in code so no binary audio fixture
 * is ever committed (docs/PLAN.md section 7 "Fixtures"). Reused across audio
 * tests (decode, and P2.3's Basic Pitch contract tests).
 */
export function makeSine(freqHz: number, seconds: number, sampleRate: number): Float32Array {
  const length = Math.round(seconds * sampleRate);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  }
  return samples;
}

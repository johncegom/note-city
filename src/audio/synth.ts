// [skill] — audio feel is judged by ear (Minh), not by an automated test.

const ATTACK_SEC = 0.01;
const RELEASE_SEC = 0.03;
const PEAK_GAIN = 0.3;

/**
 * Play one note: an oscillator at `freq` Hz, starting at `start` (AudioContext
 * time, seconds) for `dur` seconds. A short attack/release gain envelope
 * avoids the click of switching the oscillator on/off abruptly.
 */
export function playNote(
  ctx: AudioContext,
  freq: number,
  start: number,
  dur: number,
): void {
  const osc = ctx.createOscillator();
  osc.frequency.value = freq;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(PEAK_GAIN, start + ATTACK_SEC);
  gain.gain.setValueAtTime(PEAK_GAIN, Math.max(start + ATTACK_SEC, start + dur - RELEASE_SEC));
  gain.gain.linearRampToValueAtTime(0, start + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + dur);
}

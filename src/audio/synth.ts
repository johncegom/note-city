// [skill] — audio feel is judged by ear (Minh), not by an automated test.

const ATTACK_SEC = 0.01;
const RELEASE_SEC = 0.03;
const PEAK_GAIN = 0.3;

// Every note's gain routes through one shared compressor per AudioContext
// instead of straight to the destination, so clicking/dragging several notes
// close together blends instead of clipping into noise (docs/BUGS.md BUG-1).
const masterBuses = new WeakMap<AudioContext, DynamicsCompressorNode>();

function getMasterBus(ctx: AudioContext): DynamicsCompressorNode {
  let bus = masterBuses.get(ctx);
  if (!bus) {
    bus = ctx.createDynamicsCompressor();
    bus.threshold.value = -24;
    bus.knee.value = 6;
    bus.ratio.value = 6;
    bus.attack.value = 0.003;
    bus.release.value = 0.15;
    bus.connect(ctx.destination);
    masterBuses.set(ctx, bus);
  }
  return bus;
}

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
  gain.connect(getMasterBus(ctx));

  osc.start(start);
  osc.stop(start + dur);
}

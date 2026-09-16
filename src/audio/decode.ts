export const TARGET_SAMPLE_RATE = 22050;

/**
 * Mix any number of channels down to one, sample-wise average.
 * Mono because pitch does not depend on left/right channel.
 */
export function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];

  const length = channels[0].length;
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const channel of channels) sum += channel[i];
    mono[i] = sum / channels.length;
  }
  return mono;
}

/**
 * Resample mono PCM to `toRate` Hz via OfflineAudioContext, which applies a
 * proper anti-aliasing filter — a hand-rolled resampler would fold content
 * above the new Nyquist frequency back in as audible aliases (see DR-11).
 * [skill] — no automated test, verified manually in-browser (DR-11).
 */
export async function resample(
  samples: Float32Array,
  fromRate: number,
  toRate: number = TARGET_SAMPLE_RATE,
): Promise<Float32Array> {
  if (fromRate === toRate) return samples;

  const durationSec = samples.length / fromRate;
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(durationSec * toRate), toRate);

  const source = offlineCtx.createBuffer(1, samples.length, fromRate);
  source.getChannelData(0).set(samples);

  const bufferSource = offlineCtx.createBufferSource();
  bufferSource.buffer = source;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start();

  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

/**
 * Decode a File (audio or video) to mono PCM at TARGET_SAMPLE_RATE.
 * [skill] — no automated test, verified manually in-browser (DR-11):
 * mp3, wav, m4a, mp4 open in Chrome without error.
 */
export async function decodeFile(file: File): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channels: Float32Array[] = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }
    const mono = toMono(channels);
    return await resample(mono, audioBuffer.sampleRate, TARGET_SAMPLE_RATE);
  } finally {
    await ctx.close();
  }
}

# Getting audio into note-city

The app only accepts local files (`<input type=file>` on the Phase 2 "Import audio"
control). It cannot open a URL directly — YouTube links must be turned into a file
*outside* the app first. This is deliberate (see `docs/PLAN.md` DR-5): browsers block
YouTube downloads (CORS/ToS), and adding a backend just for this one input path would
violate "subtract before add".

## YouTube link → file

Use the `youtube-mcp` tool's `download_audio`, from Claude Code (not from inside the
web app):

1. Give Claude Code the YouTube link and ask it to run `download_audio` on it.
2. Claude Code calls `mcp__youtube__download_audio` and reports back a local file path
   (usually an m4a or webm audio file) once the download finishes.
3. If the download fails with a rate-limit error (HTTP 429), wait and retry — 8s, then
   10s, then 15s between attempts. Claude Code will do this automatically; if it gives
   up, just ask it to try again after a short pause.
4. Open `npm run dev`, go to the "Import audio" section, and pick the downloaded file.

If the downloaded format doesn't decode (see the fallback below), convert it to wav
first, then import the wav instead.

## Fallback: a file that won't decode in the browser

Chrome's `decodeAudioData` (used by `src/audio/decode.ts`) handles mp3, wav, m4a,
flac, and the audio track of common video containers. If it rejects a file (an error
in the browser console, or the Import section reporting a decode failure), convert it
outside the app with ffmpeg:

```
ffmpeg -i input.<ext> -ac 1 -ar 22050 -t 300 output.wav
```

- `-ac 1` — downmix to mono (the app would do this anyway via `toMono`)
- `-ar 22050` — resample to 22050 Hz (the app would do this anyway via `resample`)
- `-t 300` — keep only the first 5 minutes (v1 test clips are ≤ 5 minutes, see `docs/PLAN.md` section 1 / DR-12)

Then import `output.wav` in the app as usual.

## Choosing a clip

For Phase 2 (transcription, from P2.3 on), pick a clip that is:
- One voice or one instrument, little or no backing track — a full mix produces noisy,
  cluttered transcription (see `docs/PLAN.md` section 5). This is a known limitation,
  not an app bug; vocal separation is deferred (D1).
- 5 minutes or less.

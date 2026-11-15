# Bible audio with Voxly

Voxly runs on your Windows computer and its Kokoro voice cannot run on an iPhone. So the app works in two steps:

1. **On the computer**, Voxly reads each chapter once and saves it as an MP3, plus a small timing file that says
   when each verse starts (that is what lets the app highlight the verse being read).
2. **On the phone**, the app plays those MP3s. Where a chapter has not been recorded yet, it uses the iPhone's own
   voice instead, so Listen always works. (Settings → Listening → *Audio source* lets you choose Voxly only or iPhone only.)

Voxly recordings keep playing with the screen locked and show controls on the lock screen. The iPhone voice
stops when the screen locks — another reason to record the books you listen to most.

## Record

You need Voxly with its narration service (the same one Process Recorder uses) and **FFmpeg** installed.

1. Start Voxly's narration service. In the Voxly folder:
   ```
   .venv\Scripts\python.exe -m Voxly.integrations.narration_service serve
   ```
2. In the `bible-app` folder, try one short book first:
   ```
   python tools\voxly_bible_audio.py --books Jude
   ```
   It prints each chapter as it goes and writes `audio\KJV\65\001.mp3` and `001.json`.
3. Then the books you want, or everything:
   ```
   python tools\voxly_bible_audio.py --books "Psalms,Proverbs,John" --voice bm_george --speed 0.95
   python tools\voxly_bible_audio.py --all
   ```
   Voices: `bm_george`, `bm_daniel` (British male), `bf_emma`, `bf_lily` (British female). Default `bm_george` at 0.95.

Chapters already recorded are skipped, so you can stop (Ctrl+C) and carry on later with the same command.
To record another version, add `--version BSB` (it is stored under `audio\BSB\`, and the app uses it when that
version is selected).

The whole KJV is roughly 75 hours of speech, about 1,189 chapters. Expect it to take a long time on a laptop —
let it run overnight over several nights, or record the books you use most.

## Put the recordings online

Copy the `audio` folder into the `bible-app` folder you upload, so the site has `index.html` and `audio/` side by side,
then upload again. On the phone, Settings → Listening shows **"Voxly recordings found ✓"** once John 3 is there.

Size: at the usual 48–64 kbps, the whole KJV is around 1.5–2 GB. Netlify's free plan is fine for a few books;
for the whole Bible use **Cloudflare Pages** (free, unlimited bandwidth, files up to 25 MB — the longest chapter,
Psalm 119, is well under that).

If you keep the audio somewhere else (another site or a storage bucket), put its address in
Settings → Listening → *Voxly audio address*, ending in `/`, e.g. `https://my-audio.pages.dev/audio/`.
That site must allow the app's site to read the timing files (CORS).

## What the timing file says

```json
{"version": "KJV", "book": 43, "chapter": 3, "voice": "bm_george", "speed": 0.95,
 "duration": 412.6, "verses": [0.0, 7.21, 15.03, ...], "exact": true}
```

`verses` is the start time in seconds of each verse in the MP3. `exact` is true when the times were measured from
Voxly's per-verse audio, false when they had to be estimated from verse length (follow-along is then approximate).

**Check on your computer:** the tool expects Voxly to save a manifest (`<chapter>.narration.json`) and one WAV per
section in `<chapter> - sections\`, as it does for Process Recorder. If your first recording says
"verse timing estimated", tell me what Voxly put in that folder and I will match it.

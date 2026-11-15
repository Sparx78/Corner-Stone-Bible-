# Bible audio with Voxly (Kokoro)

The app plays chapter recordings made with your Voxly's Kokoro voice. Each verse is voiced separately and then
joined, so the app knows exactly when every verse starts and highlights it as it is read. Recordings keep playing
with the screen locked and show controls on the lock screen. Where a chapter has not been recorded, the app uses
the other Voxly voice if that one has it, and otherwise the iPhone's own voice.

Two voices are supported side by side: **Emma** (`bf_emma`, Voxly's default) and **George** (`bm_george`).
Choose between them in the app: Settings → Listening → *Voxly voice*.

## What is already recorded

Made with the same Kokoro model your Voxly uses (`kokoro-v1.0.onnx`, speed 0.9, British English):
Jude (Emma), and John and Psalms in both voices. They are in `audio/KJV/bf_emma/` and `audio/KJV/bm_george/`.

## Record more on your PC, through Voxly

Use the same PowerShell and Python environment you use for `tyson_export.py`. FFmpeg must be installed
(`winget install ffmpeg`) so the recordings can be saved as MP3.

```
cd path\to\bible-app
python tools\voxly_bible_audio.py --voxly C:\G_Labs\Voxly --books "Genesis,Romans" --voice bf_emma
python tools\voxly_bible_audio.py --voxly C:\G_Labs\Voxly --books "Genesis,Romans" --voice bm_george
python tools\voxly_bible_audio.py --voxly C:\G_Labs\Voxly --all --voice bf_emma
```

This loads Voxly with your `settings.yaml` exactly as `tyson_export.py` does and asks its Kokoro engine for each verse.
`--settings path\settings.yaml` uses another settings file. Chapters already recorded are skipped, so you can
stop with Ctrl+C and run the same command later to carry on.

Without Voxly (any computer with Python): `pip install kokoro-onnx soundfile`, download `kokoro-v1.0.onnx` and
`voices-v1.0.bin` from the kokoro-onnx model release into a folder, then use `--kokoro-dir that-folder` in place of `--voxly`.

Time and size: recording takes about a quarter of the listening time on a 4-core computer. The whole Bible is about
75 hours of listening per voice, about 2 GB per voice at the 64 kbps used.

Before speaking, `LORD` and `GOD` (small capitals in print) are given to the voice as "Lord" and "God", so they are not spelled out.
The words on screen are unchanged.

## Put the recordings online

The `audio` folder must sit next to `index.html` on your web host. Upload the whole `bible-app` folder again after
adding recordings. Netlify's free plan suits a few books. For the whole Bible in both voices (about 4 GB), use
**Cloudflare Pages** (free, files up to 25 MB; the longest chapter, Psalm 119, is about 12 MB).

If you keep the audio on another site, put its address in Settings → Listening → *Voxly audio address*, ending in `/`.
That site must allow the app's site to read its files (CORS).

## The timing file

```json
{"version": "KJV", "book": 43, "chapter": 3, "voice": "Kokoro bf_emma @ 0.9",
 "duration": 412.6, "verses": [0.0, 7.21, 15.03], "exact": true}
```

`verses` holds the start time in seconds of each verse in the MP3. Verse 1 starts at 0 and includes the spoken heading
("John, chapter 3.").

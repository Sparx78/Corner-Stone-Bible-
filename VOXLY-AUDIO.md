# Bible audio with Voxly (Kokoro)

The app plays chapter recordings made with your Voxly's Kokoro voice. Each verse is voiced separately and then
joined, so the app knows exactly when every verse starts and highlights it as it is read. Recordings keep playing
with the screen locked and show controls on the lock screen. Where a chapter has not been recorded, the app uses
the other Voxly voice if that one has it, and otherwise the iPhone's own voice.

Two voices are supported side by side: **Emma** (`bf_emma`, Voxly's default) and **George** (`bm_george`).
Choose between them in the app: Settings → Listening → *Voxly voice*.

## What is already recorded

Made with the same Kokoro model your Voxly uses (`kokoro-v1.0.onnx`, speed 0.9, British English):
John in both voices and Jude (Emma); Psalms is being recorded in both. They are in `audio/KJV/bf_emma/` and `audio/KJV/bm_george/`.

## Record more on your PC, through Voxly

Use the same PowerShell and Python environment you use for `tyson_export.py`. FFmpeg must be installed
(`winget install ffmpeg`) so the recordings can be saved as MP3.

```
cd path\to\Corner-Stone-Bible-
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
57 hours of listening in Emma's voice and 67 in George's, about 0.8 GB and 0.95 GB in the AAC format used (32 kbps mono `.m4a`, the iPhone's own format). `--format mp3` makes 64 kbps MP3 instead, twice the size.

Before speaking, `LORD` and `GOD` (small capitals in print) are given to the voice as "Lord" and "God", so they are not spelled out.
The words on screen are unchanged.

## Put the recordings online

The recordings live in this repository under `audio/`, next to `index.html`, so GitHub Pages serves them with the app.
After recording more, commit the new `audio` files (and the updated `audio/index.json`) to `main`.

GitHub Pages sites are limited to about 1 GB. That is room for the whole Bible in one voice, or a selection of books
in both voices. For the whole Bible in both voices (about 1.8 GB), host the `audio` folder on
**Cloudflare Pages** (free) and put its address in Settings → Listening → *Voxly audio address*, ending in `/`.

## The timing file

```json
{"version": "KJV", "book": 43, "chapter": 3, "voice": "Kokoro bf_emma @ 0.9", "file": "003.m4a",
 "duration": 412.6, "verses": [0.0, 7.21, 15.03], "exact": true}
```

`verses` holds the start time in seconds of each verse in the MP3. Verse 1 starts at 0 and includes the spoken heading
("John, chapter 3.").

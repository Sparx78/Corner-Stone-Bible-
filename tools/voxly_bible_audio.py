"""Record the Bible in your Voxly Kokoro voice, for the Scripture app.

Two ways to run it (both give identical files):

  On your Windows PC, through Voxly itself (uses your Voxly settings, like tyson_export.py):
      python tools\\voxly_bible_audio.py --voxly C:\\G_Labs\\Voxly --books John
  Straight through Kokoro (the same kokoro-onnx model Voxly uses), e.g. on a server:
      python tools/voxly_bible_audio.py --kokoro-dir path/with/kokoro-v1.0.onnx --books John

Run it in the Python environment that has Voxly (or kokoro-onnx) installed. Needs FFmpeg for MP3.

For every chapter it writes:
    audio/<VERSION>/<voice>/<book 01-66>/<chapter 001>.mp3    the chapter, read aloud
    audio/<VERSION>/<voice>/<book 01-66>/<chapter 001>.json   when each verse starts (exact: each verse is voiced separately)
Copy the "audio" folder next to index.html on your web host. Chapters already recorded are skipped,
so you can stop with Ctrl+C and run the same command again later.

Options: --books "Psalms,John" or --all; --voice bf_emma|bf_lily|bm_george|bm_daniel; --speed 0.9; --version KJV.
"""
import argparse
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
BOOKS = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
         "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
         "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
         "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
         "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
         "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
         "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"]
SPOKEN_BOOK = {"1": "First", "2": "Second", "3": "Third"}
PAUSE_AFTER_VERSE = 0.35   # seconds of quiet between verses
PAUSE_AFTER_HEADING = 0.6


def spoken_book(name):
    m = re.match(r"([123]) (.+)", name)
    return "%s %s" % (SPOKEN_BOOK[m.group(1)], m.group(2)) if m else name


def speakable(text):
    """What the voice is given. The words are the KJV's; only spelling that a voice would misread is adjusted."""
    text = re.sub(r"\b(LORD|GOD|JEHOVAH|JAH)\b", lambda m: m.group(1).title(), text)   # not "L-O-R-D"
    text = text.replace("–", "-").replace("’", "'")
    return text


# ------------------------------------------------------------------ voices
class VoxlyVoice:
    """Your Voxly installation, loaded exactly as tyson_export.py does."""

    def __init__(self, voxly_dir, settings_file, voice, speed):
        root = Path(voxly_dir).resolve()
        sys.path.insert(0, str(root))
        os.chdir(root)  # Voxly resolves its model paths from its own folder
        from Voxly.core.settings import load_settings
        from Voxly.core.engine import Voxly
        settings = load_settings(str(Path(settings_file).resolve() if settings_file else root / "settings.yaml"))
        settings["voice_engine"] = "kokoro"
        k = settings.setdefault("kokoro", {})
        if voice:
            k["voice"] = voice
        if speed:
            k["speed"] = speed
        self.name = "Voxly Kokoro %s @ %s" % (k.get("voice"), k.get("speed"))
        self.key = str(k.get("voice") or "voxly")
        self.voxly = Voxly(settings=settings)
        self.engine = self.voxly.voice_engine

    def wav(self, text):
        audio = self.engine.synthesize(text)
        if not audio:
            raise RuntimeError("Voxly produced no audio for: %s" % text[:60])
        return audio

    def close(self):
        self.voxly.shutdown()


class KokoroVoice:
    """The same kokoro-onnx model and voices Voxly's Kokoro engine loads."""

    def __init__(self, model_dir, voice, speed):
        from kokoro_onnx import Kokoro
        d = Path(model_dir)
        self.k = Kokoro(str(d / "kokoro-v1.0.onnx"), str(d / "voices-v1.0.bin"))
        self.voice, self.speed = voice or "bf_emma", speed or 0.9
        self.name = "Kokoro %s @ %s" % (self.voice, self.speed)
        self.key = self.voice

    def wav(self, text):
        import numpy as np
        samples, rate = self.k.create(text, voice=self.voice, speed=self.speed, lang="en-gb")
        pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes()
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            w.writeframes(pcm)
        return buf.getvalue()

    def close(self):
        pass


# ------------------------------------------------------------------ recording
def record_chapter(voice, version, book, chapter, verses, title=None, bitrate="64k"):
    folder = HERE / "audio" / version / voice.key / ("%02d" % (book + 1))
    base = "%03d" % (chapter + 1)
    mp3, timing = folder / (base + ".mp3"), folder / (base + ".json")
    if mp3.exists() and timing.exists():
        return "already recorded"
    folder.mkdir(parents=True, exist_ok=True)
    heading = ("Psalm %d." % (chapter + 1)) if BOOKS[book] == "Psalms" else "%s, chapter %d." % (spoken_book(BOOKS[book]), chapter + 1)
    if title:
        heading += " " + title
    fmt, frames, starts = None, [], []

    def add(wav_bytes, pause):
        nonlocal fmt
        with wave.open(io.BytesIO(wav_bytes), "rb") as r:
            f = (r.getnchannels(), r.getsampwidth(), r.getframerate())
            if fmt is None:
                fmt = f
            if f != fmt:
                raise RuntimeError("The voice changed audio format part-way through a chapter.")
            frames.append(r.readframes(r.getnframes()))
        frames.append(b"\0" * int(fmt[2] * pause) * fmt[0] * fmt[1])

    def now():
        return sum(len(x) for x in frames) / float(fmt[0] * fmt[1] * fmt[2]) if fmt else 0.0

    add(voice.wav(speakable(heading)), PAUSE_AFTER_HEADING)
    for text in verses:
        starts.append(round(now(), 2))      # the verse starts exactly where its own audio starts
        add(voice.wav(speakable(text)), PAUSE_AFTER_VERSE)
    starts[0] = 0.0                          # the heading belongs to verse 1 for follow-along
    duration = now()
    with tempfile.TemporaryDirectory() as tmp:
        wav_path = Path(tmp) / "chapter.wav"
        with wave.open(str(wav_path), "wb") as w:
            w.setnchannels(fmt[0])
            w.setsampwidth(fmt[1])
            w.setframerate(fmt[2])
            w.writeframes(b"".join(frames))
        part = Path(tmp) / "chapter.mp3"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav_path), "-ac", "1", "-b:a", bitrate,
                        "-metadata", "title=%s %d" % (BOOKS[book], chapter + 1), "-metadata", "artist=%s" % voice.name,
                        "-metadata", "album=%s" % version, str(part)], check=True)
        shutil.move(str(part), str(mp3))
    timing.write_text(json.dumps({"version": version, "book": book + 1, "chapter": chapter + 1, "voice": voice.name,
                                  "duration": round(duration, 2), "verses": starts, "exact": True}), encoding="utf-8")
    return "%d:%02d" % (duration // 60, duration % 60)


def write_index():
    """audio/index.json: which chapters are recorded, per version and voice, with sizes (the app reads it)."""
    root = HERE / "audio"
    idx = {}
    for mp3 in sorted(root.glob("*/*/[0-9][0-9]/[0-9][0-9][0-9].mp3")):
        if not mp3.with_suffix(".json").exists():
            continue
        version, voice, book = mp3.parts[-4], mp3.parts[-3], str(int(mp3.parts[-2]))
        ch = idx.setdefault(version, {}).setdefault(voice, {}).setdefault(book, {"chapters": [], "bytes": 0})
        ch["chapters"].append(int(mp3.stem))
        ch["bytes"] += mp3.stat().st_size + mp3.with_suffix(".json").stat().st_size
    tmp = root / "index.json.tmp"
    tmp.write_text(json.dumps(idx, separators=(",", ":")), encoding="utf-8")
    tmp.replace(root / "index.json")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--voxly", help="Your Voxly folder, e.g. C:\\G_Labs\\Voxly (run in Voxly's Python environment)")
    src.add_argument("--kokoro-dir", help="Folder with kokoro-v1.0.onnx and voices-v1.0.bin")
    ap.add_argument("--settings", help="Voxly settings file (default: settings.yaml in the Voxly folder)")
    ap.add_argument("--version", default="KJV")
    ap.add_argument("--books", help='e.g. "John,Psalms,Romans"')
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--voice", help="bf_emma (Voxly's default), bf_lily, bm_george, bm_daniel")
    ap.add_argument("--speed", type=float, help="0.9 is Voxly's default")
    if "--index" in sys.argv:  # only rebuild audio/index.json
        write_index()
        return print("audio/index.json updated")
    a = ap.parse_args()
    if not a.all and not a.books:
        ap.error("say which books (--books John) or --all")
    if not shutil.which("ffmpeg"):
        raise SystemExit("FFmpeg is needed to make MP3 files. Install it (winget install ffmpeg) and try again.")
    bible = json.loads((HERE / "data" / (a.version + ".json")).read_text(encoding="utf-8"))
    if a.all:
        books = list(range(66))
    else:
        books = []
        for n in [x.strip().lower().replace(" ", "") for x in a.books.split(",")]:
            hit = [i for i, b in enumerate(BOOKS) if b.lower().replace(" ", "") == n]
            if not hit:
                ap.error("unknown book: %s" % n)
            books += hit
    voice = VoxlyVoice(a.voxly, a.settings, a.voice, a.speed) if a.voxly else KokoroVoice(a.kokoro_dir, a.voice, a.speed)
    print("Voice:", voice.name, flush=True)
    t0 = time.time()
    try:
        for b in books:
            titles = (bible.get("titles") or {}).get(str(b), {})
            for c, verses in enumerate(bible["books"][b]):
                print("  %s %d: %s" % (BOOKS[b], c + 1, record_chapter(voice, a.version, b, c, verses, titles.get(str(c)))), flush=True)
                write_index()
    finally:
        voice.close()
    print("Done in %d min. Copy the 'audio' folder next to index.html on your web host." % ((time.time() - t0) / 60))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        raise SystemExit("Stopped. Run the same command again to carry on.")

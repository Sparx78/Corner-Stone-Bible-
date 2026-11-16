"""Morning alarm sounds: short KJV verses read by Voxly's Kokoro voice, each under 30 seconds so an iPhone
can use it as an alarm (GarageBand > Share > Ringtone). The words are the KJV's, unchanged.

  python tools/make_alarms.py --kokoro-dir DIR [--voice bf_emma] [--speed 0.9]
Writes alarms/<name>.m4a, ready to download from the app's website.
"""
import argparse, io, json, subprocess, tempfile, wave
from pathlib import Path

import voxly_bible_audio as rec

HERE = Path(__file__).resolve().parent.parent

# (file name, book, chapter, first verse, last verse): verses about the morning and waking
ALARMS = [
    ("new-every-morning", "Lamentations", 3, 22, 23),
    ("my-voice-in-the-morning", "Psalms", 5, 3, 3),
    ("joy-cometh-in-the-morning", "Psalms", 30, 5, 5),
    ("sing-aloud-in-the-morning", "Psalms", 59, 16, 16),
    ("satisfy-us-early", "Psalms", 90, 14, 14),
    ("this-is-the-day", "Psalms", 118, 24, 24),
    ("lovingkindness-in-the-morning", "Psalms", 143, 8, 8),
    ("wakeneth-mine-ear", "Isaiah", 50, 4, 4),
    ("awake-thou-that-sleepest", "Ephesians", 5, 14, 14),
    ("high-time-to-awake", "Romans", 13, 11, 12),
]
PAUSE_BEFORE_REFERENCE = 0.7
QUIET_AT_END = 2.5        # the alarm repeats the sound; this is the breath before it starts again
LIMIT = 30.0


def reference(book, ch, v1, v2):
    name = "Psalm" if book == "Psalms" else rec.spoken_book(book)
    return "%s %d, verse %d." % (name, ch, v1) if v1 == v2 else "%s %d, verses %d to %d." % (name, ch, v1, v2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kokoro-dir", required=True)
    ap.add_argument("--voice", default="bf_emma")
    ap.add_argument("--speed", type=float, default=0.9)
    a = ap.parse_args()
    kjv = json.loads((HERE / "data" / "KJV.json").read_text(encoding="utf-8"))["books"]
    voice = rec.KokoroVoice(a.kokoro_dir, a.voice, a.speed)
    out = HERE / "alarms"
    out.mkdir(exist_ok=True)
    listing = []
    for name, book, ch, v1, v2 in ALARMS:
        b = rec.BOOKS.index(book)
        text = " ".join(kjv[b][ch - 1][v - 1] for v in range(v1, v2 + 1))
        frames, fmt = [], None
        for part, pause in ((text, PAUSE_BEFORE_REFERENCE), (reference(book, ch, v1, v2), QUIET_AT_END)):
            with wave.open(io.BytesIO(voice.wav(rec.speakable(part))), "rb") as r:
                fmt = (r.getnchannels(), r.getsampwidth(), r.getframerate())
                frames.append(r.readframes(r.getnframes()))
            frames.append(b"\0" * int(fmt[2] * pause) * fmt[0] * fmt[1])
        seconds = sum(len(f) for f in frames) / float(fmt[0] * fmt[1] * fmt[2])
        if seconds > LIMIT:
            print("  skipped %s: %.1f s is longer than an alarm allows" % (name, seconds))
            continue
        with tempfile.TemporaryDirectory() as tmp:
            w = Path(tmp) / "a.wav"
            with wave.open(str(w), "wb") as f:
                f.setnchannels(fmt[0]); f.setsampwidth(fmt[1]); f.setframerate(fmt[2]); f.writeframes(b"".join(frames))
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(w), "-ac", "1", "-c:a", "aac", "-b:a", "64k",
                            "-af", "loudnorm=I=-14:TP=-1.5", "-ar", "44100",
                            "-metadata", "title=%s" % reference(book, ch, v1, v2).rstrip("."), "-metadata", "artist=Corner Stone",
                            str(out / (name + ".m4a"))], check=True)
        label = "%s %d:%d" % ("Psalm" if book == "Psalms" else book, ch, v1) + ("" if v1 == v2 else "\u2013%d" % v2)
        listing.append({"file": name + ".m4a", "ref": label, "text": text,
                        "seconds": round(seconds, 1)})
        print("  %-32s %4.1f s" % (name, seconds))
    (out / "alarms.json").write_text(json.dumps(listing, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()

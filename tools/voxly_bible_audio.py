"""Record the Bible with Voxly (Kokoro voice) on your computer, for the Scripture app.

Run this on the Windows computer where Voxly is installed. For every chapter it asks Voxly's narration
service (interface "voxly.narration/1", the same one Process Recorder uses) to read the chapter, one verse
per section, and saves:

    audio/<VERSION>/<book 01-66>/<chapter 001>.mp3    the chapter, read aloud
    audio/<VERSION>/<book 01-66>/<chapter 001>.json   when each verse starts, so the app can follow along

Then copy the "audio" folder next to the app on your web host (see VOXLY-AUDIO.md).

Examples (from the bible-app folder):
    python tools/voxly_bible_audio.py --books John              # one book to try it out
    python tools/voxly_bible_audio.py --books "Psalms,Proverbs" --voice bm_george --speed 0.9
    python tools/voxly_bible_audio.py --all                     # the whole Bible (many hours; safe to stop and re-run)

Chapters already recorded are skipped, so you can stop it at any time and run it again later.
Needs FFmpeg installed for Voxly to make MP3 files (iPhones play MP3 everywhere; WAV files are far too large).
"""
import argparse
import hashlib
import json
import os
import socket
import sys
import time
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
INTERFACE = "voxly.narration/1"
BOOKS = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
         "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
         "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
         "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
         "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
         "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
         "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"]
# How a heading is said aloud ("The Second Book of Samuel" would also do; this is plain and clear).
SPOKEN = {"Psalms": "Psalm"}


class VoxlyError(Exception):
    pass


def state_dir():
    if os.environ.get("VOXLY_STATE_DIR"):
        return Path(os.environ["VOXLY_STATE_DIR"])
    if sys.platform == "win32":
        return Path(os.environ.get("LOCALAPPDATA") or Path.home()) / "Voxly"
    return Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share") / "voxly"


def call(action, timeout=30, **kw):
    p = state_dir() / "narration_service.json"
    if not p.exists():
        raise VoxlyError("Voxly's narration service is not running (no %s). Start it first: in the Voxly folder run\n"
                         "  .venv\\Scripts\\python.exe -m Voxly.integrations.narration_service serve" % p)
    info = json.loads(p.read_text(encoding="utf-8"))
    req = dict(kw, action=action, token=info.get("token"))
    try:
        with socket.create_connection(("127.0.0.1", int(info["port"])), timeout=timeout) as s:
            s.sendall((json.dumps(req) + "\n").encode("utf-8"))
            buf = b""
            while b"\n" not in buf:
                chunk = s.recv(65536)
                if not chunk:
                    break
                buf += chunk
    except OSError as e:
        raise VoxlyError("Could not reach Voxly's narration service: %s" % e)
    resp = json.loads(buf.split(b"\n")[0].decode("utf-8"))
    if not resp.get("ok"):
        raise VoxlyError(resp.get("error") or "Voxly reported an error.")
    return resp


def wav_seconds(path):
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / float(w.getframerate())


def sections_for(book, chapter, verses, title=None):
    heading = "%s, chapter %d." % (SPOKEN.get(BOOKS[book], BOOKS[book]), chapter + 1)
    if BOOKS[book] == "Psalms":
        heading = "Psalm %d." % (chapter + 1)
    if title:
        heading += " " + title
    out = []
    for i, text in enumerate(verses):
        t = (heading + " " + text) if i == 0 else text
        out.append({"id": "v%d" % (i + 1), "title": "%s %d:%d" % (BOOKS[book], chapter + 1, i + 1),
                    "text": t, "sha256": hashlib.sha256(t.encode("utf-8")).hexdigest()})
    return out


def section_durations(folder, base, manifest, n):
    """Seconds of speech per verse, from the manifest if Voxly gives them, else from the per-section WAV files."""
    secs = manifest.get("sections") or []
    if len(secs) == n and all(isinstance(s.get("duration_s"), (int, float)) for s in secs):
        return [float(s["duration_s"]) for s in secs]
    sdir = folder / (base + " - sections")
    if len(secs) == n and all(s.get("file") for s in secs):
        files = [Path(s["file"]) if Path(s["file"]).is_absolute() else sdir / s["file"] for s in secs]
        if all(f.exists() for f in files):
            return [wav_seconds(f) for f in files]
    files = sorted(sdir.glob("*.wav")) if sdir.is_dir() else []
    if len(files) == n:
        return [wav_seconds(f) for f in files]
    return None


def record_chapter(version, book, chapter, verses, voice, speed, keep_wav, title=None):
    folder = HERE / "audio" / version / ("%02d" % (book + 1))
    base = "%03d" % (chapter + 1)
    mp3, timing = folder / (base + ".mp3"), folder / (base + ".json")
    if mp3.exists() and timing.exists():
        return "skipped"
    folder.mkdir(parents=True, exist_ok=True)
    sections = sections_for(book, chapter, verses, title)
    request = {
        "interface": INTERFACE,
        "document": {"title": "%s %d" % (BOOKS[book], chapter + 1), "project": "Scripture", "document_type": "bible chapter",
                     "document_version": version, "review_status": "reviewed", "produced_by": "Scripture app"},
        "voice": voice, "speed": speed, "lang": "en-gb",
        "sections": sections,
        "output": {"directory": str(folder.resolve()), "basename": base, "formats": ["wav", "mp3"]},
    }
    call("narrate", request=request)
    mpath = folder / (base + ".narration.json")
    t0, last = time.time(), None
    while True:
        time.sleep(1.5)
        if mpath.exists():
            try:
                m = json.loads(mpath.read_text(encoding="utf-8"))
            except ValueError:
                continue
            st = m.get("status")
            done = sum(1 for s in m.get("sections", []) if s.get("status") == "ok")
            if (st, done) != last:
                print("    %s: %s (%d of %d verses)" % (BOOKS[book] + " %d" % (chapter + 1), st, done, len(sections)), flush=True)
                last = (st, done)
            if st in ("complete", "failed", "incomplete", "cancelled"):
                break
        if time.time() - t0 > 1800:
            raise VoxlyError("Voxly took more than 30 minutes on %s %d." % (BOOKS[book], chapter + 1))
    if m.get("status") != "complete":
        raise VoxlyError("Voxly could not finish %s %d: %s" % (BOOKS[book], chapter + 1, m.get("message")))
    files = m.get("files") or {}
    if not files.get("mp3") or not (folder / files["mp3"]).exists():
        raise VoxlyError("Voxly made no MP3 (is FFmpeg installed?). The WAV is in %s" % folder)
    made = folder / files["mp3"]
    if made != mp3:
        made.replace(mp3)
    wav = folder / files["wav"] if files.get("wav") else None
    total = float(m.get("duration_s") or (wav_seconds(wav) if wav and wav.exists() else 0))
    durs = section_durations(folder, base, m, len(sections))
    if durs and total:
        # Spread any pause Voxly puts between sections evenly, so verse starts line up with the combined file.
        gap = max(0.0, (total - sum(durs)) / max(1, len(durs) - 1)) if len(durs) > 1 else 0.0
        starts, t = [], 0.0
        for d in durs:
            starts.append(round(t, 2))
            t += d + gap
    else:
        # Fallback: estimate from the length of each verse (follow-along will be approximate).
        lengths = [len(s["text"]) for s in sections]
        whole = float(sum(lengths)) or 1.0
        starts, t = [], 0.0
        for n in lengths:
            starts.append(round(t, 2))
            t += total * n / whole
    timing.write_text(json.dumps({"version": version, "book": book + 1, "chapter": chapter + 1, "voice": voice,
                                  "speed": speed, "duration": round(total, 2), "verses": starts,
                                  "exact": bool(durs)}), encoding="utf-8")
    if not keep_wav:
        for p in [wav, folder / (base + " - sections")]:
            if p and p.is_file():
                p.unlink()
            elif p and p.is_dir():
                for f in p.iterdir():
                    f.unlink()
                p.rmdir()
    return "recorded" + ("" if durs else " (verse timing estimated)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", default="KJV", help="Bible version to read (default KJV)")
    ap.add_argument("--books", help='Comma-separated book names, e.g. "John,Romans,Psalms"')
    ap.add_argument("--all", action="store_true", help="Record every book")
    ap.add_argument("--voice", default="bm_george", help="Kokoro voice: bm_george, bm_daniel, bf_emma, bf_lily ...")
    ap.add_argument("--speed", type=float, default=0.95)
    ap.add_argument("--keep-wav", action="store_true", help="Keep Voxly's WAV files as well as the MP3")
    a = ap.parse_args()
    if not a.all and not a.books:
        ap.error("say which books (--books John) or --all")
    bible = json.loads((HERE / "data" / (a.version + ".json")).read_text(encoding="utf-8"))
    if a.all:
        books = list(range(66))
    else:
        names = [b.strip().lower() for b in a.books.split(",")]
        books = []
        for n in names:
            match = [i for i, b in enumerate(BOOKS) if b.lower() == n or b.lower().replace(" ", "") == n.replace(" ", "")]
            if not match:
                ap.error("unknown book: %s" % n)
            books += match
    st = call("status", timeout=10)
    if not (st.get("kokoro") or {}).get("available"):
        raise SystemExit("Voxly is running but its Kokoro voice is unavailable: %s" % (st.get("kokoro") or {}).get("words"))
    for b in books:
        print("%s (%d chapters)" % (BOOKS[b], len(bible["books"][b])), flush=True)
        for c, verses in enumerate(bible["books"][b]):
            title = (bible.get("titles") or {}).get(str(b), {}).get(str(c))
            try:
                print("  %s %d: %s" % (BOOKS[b], c + 1, record_chapter(a.version, b, c, verses, a.voice, a.speed,
                                                                      a.keep_wav, title)), flush=True)
            except VoxlyError as e:
                raise SystemExit("Stopped: %s\nRun the same command again to carry on from here." % e)
    print("Done. Copy the 'audio' folder to your web host next to index.html.")


if __name__ == "__main__":
    main()

"""Build the Study data: the KJV's words linked to the original Hebrew and Greek, and cross-references.

Nothing here explains or interprets scripture. It only records:
  * which Hebrew or Greek word stands behind each English word of the KJV (Strong's numbering, 1890), and
    how that word is spelled and pronounced -- no definitions, so the scripture defines its own words;
  * which verses point to which (the OpenBible.info cross-reference list: links between verses, no comments);
  * where the words of Christ are, for red letters.

Usage:
  python tools/build_study.py <KJV-osis.json> <cross_references.txt> <strongs-hebrew-dictionary.js> <strongs-greek-dictionary.js>
Sources:
  scrollmapper/bible_databases  sources/en/KJV/KJV-osis.json (KJV with Strong's numbers, CrossWire)
  scrollmapper/bible_databases  sources/extras/cross_references.txt (openbible.info, CC-BY)
  openscriptures/strongs        hebrew/strongs-hebrew-dictionary.js, greek/strongs-greek-dictionary.js (CC-BY-SA)

Output (data/study/):
  words.json     books[b][c][v] = "[In the beginning|H7225] [God|H430] [created|H853 H1254] ..."
                 «...» marks words of Christ; {...} marks words the translators added (italics in printed KJVs)
  lexicon.json   {"H7225": ["רֵאשִׁית", "rêʼshîyth"], ...}  only the numbers used in the text
  xrefs.json     books[b][c][v] = "b.c.v b.c.v-b.c.v ..." (0-based), most-agreed first
"""
import html
import json
import re
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "study"
OSIS = ("Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam "
        "Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil "
        "Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev").split()
MIN_VOTES = 4     # links fewer readers agreed on are left out
MAX_PER_VERSE = 30


def norm(num):
    return num[0] + str(int(num[1:]))


def encode_verse(raw, used):
    s = raw
    s = re.sub(r"<note\b.*?</note>", "", s, flags=re.S)            # translators' margin notes: left out
    s = re.sub(r"<title\b[^>]*>.*?</title>", "", s, flags=re.S)     # Psalm titles are shown separately
    s = re.sub(r"<(milestone|div|chapter)\b[^>]*/>", "", s)
    s = re.sub(r"<w\b[^>]*/>", "", s)                              # Greek words with no English
    s = re.sub(r"<divineName>(.*?)</divineName>", lambda m: m.group(1).upper(), s)
    s = s.replace('<q marker="" who="Jesus">', "«").replace("</q>", "»")
    s = re.sub(r'<transChange type="added">(.*?)</transChange>', r"{\1}", s)

    def word(m):
        nums = [norm(n) for n in re.findall(r"strong:([HG]\d+)", m.group(1))]
        nums = [n for n in nums if n not in ("G3588",)] or nums    # "the" article: rarely the point
        text = re.sub(r"<[^>]+>", "", m.group(2))
        used.update(nums)
        return "[%s|%s]" % (text, " ".join(nums)) if nums else text
    s = re.sub(r"<w\b([^>]*)>(.*?)</w>", word, s, flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    return " ".join(s.split())


def load_dict(path):
    t = Path(path).read_text(encoding="utf-8")
    t = t[t.index("{"): t.rindex("}") + 1]
    return json.loads(t)


def parse_ref(r):
    m = re.match(r"(\w+)\.(\d+)\.(\d+)$", r)
    return (OSIS.index(m.group(1)), int(m.group(2)) - 1, int(m.group(3)) - 1)


def main(osis, xref, heb, grk):
    OUT.mkdir(parents=True, exist_ok=True)
    d = json.loads(Path(osis).read_text(encoding="utf-8"))
    used = set()
    words = [[[encode_verse(v["text"], used) for v in c["verses"]] for c in b["chapters"]] for b in d["books"]]
    assert len(words) == 66
    (OUT / "words.json").write_text(json.dumps({"books": words}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    lex = {}
    for path in (heb, grk):
        for k, e in load_dict(path).items():
            k = norm(k)
            if k in used:
                lex[k] = [e.get("lemma", ""), e.get("xlit") or e.get("translit") or ""]
    (OUT / "lexicon.json").write_text(json.dumps(lex, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    links = {}
    for line in Path(xref).read_text(encoding="utf-8").splitlines()[1:]:
        f, t, votes = line.split("\t")[:3]
        if int(votes) < MIN_VOTES:
            continue
        fb, fc, fv = parse_ref(f)
        parts = t.split("-")
        a = parse_ref(parts[0])
        target = "%d.%d.%d" % a
        if len(parts) > 1:
            b = parse_ref(parts[1])
            target += "-%d.%d.%d" % b
        links.setdefault((fb, fc, fv), []).append((int(votes), target))
    xr = [[["" for _ in c] for c in book] for book in words]
    total = 0
    for (b, c, v), lst in links.items():
        if c < len(xr[b]) and v < len(xr[b][c]):
            lst.sort(key=lambda x: -x[0])
            xr[b][c][v] = " ".join(t for _, t in lst[:MAX_PER_VERSE])
            total += min(len(lst), MAX_PER_VERSE)
    (OUT / "xrefs.json").write_text(json.dumps({"books": xr}, separators=(",", ":")), encoding="utf-8")
    for f in ("words.json", "lexicon.json", "xrefs.json"):
        print(f, (OUT / f).stat().st_size)
    print("strong's numbers used:", len(used), "found:", len(lex), "cross-references:", total)


if __name__ == "__main__":
    main(*sys.argv[1:5])

"""Build the compact Bible text files the app reads (data/<ID>.json).

Sources (public-domain texts only):
  scrollmapper/bible_databases  formats/json/<ID>.json   all versions
  aruljohn/Bible-kjv            <Book>.json, Books.json  the KJV words, because it keeps "LORD" in capitals
Usage:  python tools/build_data.py <scrollmapper json folder> [<aruljohn Bible-kjv folder>]

Output format, one file per version (small and quick to load on a phone):
  {"id": "KJV", "name": "...", "books": [ [ ["verse 1", "verse 2", ...], ...chapters ], ...66 books ]}
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
VERSIONS = [  # id, file in source, display name, short description, year
    ("KJV", "KJV", "King James Version", "The Authorized Version, 1769 Oxford text", "1611/1769"),
    ("BSB", "BSB", "Berean Standard Bible", "Modern English, dedicated to the public domain", "2022"),
    ("ASV", "ASV", "American Standard Version", "Literal revision of the KJV", "1901"),
    ("YLT", "YLT", "Young's Literal Translation", "Very literal, word-for-word", "1898"),
    ("BBE", "BBE", "Bible in Basic English", "Simple English, 1,000-word vocabulary", "1949/1964"),
    ("WBT", "Webster", "Webster Bible", "Noah Webster's KJV revision", "1833"),
]


def clean(text):
    text = text.replace("¶", "")
    text = re.sub(r"\[(Selah)\]?", r"\1", text)
    text = text.replace("[", "").replace("]", "")  # italic (supplied-word) markers
    return " ".join(text.split())


def kjv_with_small_caps(src, sm_books):
    """KJV from aruljohn/Bible-kjv (keeps "LORD" as printed), with the Psalm titles taken from scrollmapper."""
    names = json.loads((src / "Books.json").read_text(encoding="utf-8"))
    books = []
    for name in names:
        d = json.loads((src / (name.replace(" ", "") + ".json")).read_text(encoding="utf-8"))
        books.append([[clean(v["text"]) for v in c["verses"]] for c in d["chapters"]])
    titles = {}
    for c, ch in enumerate(sm_books[18]):  # Psalms: scrollmapper puts the title in front of verse 1
        full, v1 = ch[0], books[18][c][0]
        if len(full) > len(v1) + 3 and full.lower().endswith(v1.lower()):
            titles[str(c)] = full[: len(full) - len(v1)].strip()
    for b, sb in enumerate(sm_books):  # the two sources must agree on every chapter's verse count
        assert [len(c) for c in sb] == [len(c) for c in books[b]], names[b]
    return books, {"18": titles}


def main(src, kjv_src=None):
    src = Path(src)
    index = []
    for vid, fname, name, desc, year in VERSIONS:
        d = json.loads((src / (fname + ".json")).read_text(encoding="utf-8"))
        books = [[[clean(v["text"]) for v in c["verses"]] for c in b["chapters"]] for b in d["books"]]
        assert len(books) == 66, (vid, len(books))
        out = {"id": vid, "name": name, "books": books}
        if vid == "KJV" and kjv_src:
            out["books"], out["titles"] = kjv_with_small_caps(Path(kjv_src), books)
        p = HERE / "data" / (vid + ".json")
        p.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        index.append({"id": vid, "name": name, "description": desc, "year": year,
                      "size": p.stat().st_size, "builtin": vid == "KJV", "license": "Public domain"})
        print(vid, p.stat().st_size)
    (HERE / "data" / "versions.json").write_text(json.dumps(index, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)

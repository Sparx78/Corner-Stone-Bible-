"""Draw the app icon (navy square, gold open book with a cross). Usage: python tools/make_icons.py"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
NAVY, GOLD, IVORY = (15, 27, 45), (201, 162, 90), (251, 248, 241)


def draw(size):
    s = 4 * size  # draw large, then shrink for smooth edges
    im = Image.new("RGB", (s, s), NAVY)
    d = ImageDraw.Draw(im)
    # subtle radial-ish glow
    for i in range(40):
        r = int(s * (0.75 - i * 0.012))
        c = tuple(int(NAVY[k] + (28 - NAVY[k]) * i / 40 * 0.5) for k in range(3))
        d.ellipse([s / 2 - r, s * 0.42 - r, s / 2 + r, s * 0.42 + r], fill=c)
    cx, top, bot = s / 2, s * 0.30, s * 0.72
    w = s * 0.30
    lw = int(s * 0.022)
    # pages
    left = [(cx, top + s * 0.03), (cx - w, top), (cx - w, bot - s * 0.03), (cx, bot)]
    right = [(cx, top + s * 0.03), (cx + w, top), (cx + w, bot - s * 0.03), (cx, bot)]
    d.polygon(left, fill=IVORY)
    d.polygon(right, fill=IVORY)
    d.line(left + [left[0]], fill=GOLD, width=lw, joint="curve")
    d.line(right + [right[0]], fill=GOLD, width=lw, joint="curve")
    d.line([(cx, top + s * 0.03), (cx, bot)], fill=GOLD, width=lw)
    # lines of text
    for j in range(5):
        y = top + s * 0.08 + j * s * 0.065
        for sgn in (-1, 1):
            x0, x1 = cx + sgn * s * 0.05, cx + sgn * (w - s * 0.05)
            d.line([(x0, y + s * 0.006), (x1, y)], fill=(205, 196, 178), width=int(s * 0.012))
    # cross above
    cw, ch = s * 0.03, s * 0.15
    d.rectangle([cx - cw / 2, s * 0.10, cx + cw / 2, s * 0.10 + ch], fill=GOLD)
    d.rectangle([cx - s * 0.055, s * 0.10 + ch * 0.28, cx + s * 0.055, s * 0.10 + ch * 0.28 + cw], fill=GOLD)
    # ribbon
    d.polygon([(cx + s * 0.12, bot - s * 0.02), (cx + s * 0.16, bot - s * 0.02), (cx + s * 0.16, bot + s * 0.12),
               (cx + s * 0.14, bot + s * 0.095), (cx + s * 0.12, bot + s * 0.12)], fill=GOLD)
    return im.resize((size, size), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
for name, size in (("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)):
    draw(size).save(OUT / name, optimize=True)
    print(name)

"""Regenerate the self-hosted woff2 files in /fonts.

Downloads the source TTFs from the google/fonts repo, pins every axis except
the ones we use to its default (what the Google Fonts CSS API serves when only
`wght` is requested), and subsets to latin (+ devanagari where needed).

    pip install fonttools brotli
    python scripts/build-fonts.py
"""

import io
import os
import urllib.request

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

RAW = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
OUT = os.path.join(os.path.dirname(__file__), "..", "fonts")

# Google Fonts "latin" unicode-range, plus U+20B9 (rupee sign), which Google
# ships in latin-ext and the app uses in prices.
LATIN = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,"
    "U+0308,U+0329,U+2000-206F,U+20AC,U+20B9,U+2122,U+2191,U+2193,U+2212,"
    "U+2215,U+FEFF,U+FFFD"
)
# Google Fonts "devanagari" unicode-range.
DEVANAGARI = (
    "U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,"
    "U+A830-A839,U+A8E0-A8FF,U+11B00-11B09"
)

STATIC_NAMES = {400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold"}

# (output prefix, source path, weights or "variable", subsets)
FAMILIES = [
    ("inter", "inter/Inter[opsz,wght].ttf", "variable", [LATIN]),
    ("poppins", "poppins/Poppins-{name}.ttf", [400, 500, 600, 700, 800], [LATIN]),
    ("bricolage-grotesque", "bricolagegrotesque/BricolageGrotesque[opsz,wdth,wght].ttf", [500, 600, 700], [LATIN]),
    ("sora", "sora/Sora[wght].ttf", [600, 700, 800], [LATIN]),
    ("manrope", "manrope/Manrope[wght].ttf", [400, 500, 600, 700], [LATIN]),
    ("fraunces", "fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf", [500, 700], [LATIN]),
    ("mukta", "mukta/Mukta-{name}.ttf", [400, 500, 600, 700], [LATIN, DEVANAGARI]),
    ("noto-sans-devanagari", "notosansdevanagari/NotoSansDevanagari[wdth,wght].ttf", [400, 600, 700], [LATIN, DEVANAGARI]),
    ("playfair-display", "playfairdisplay/PlayfairDisplay[wght].ttf", [500, 700], [LATIN]),
    ("hind", "hind/Hind-{name}.ttf", [400, 600, 700], [LATIN, DEVANAGARI]),
]

_cache = {}


def fetch(path):
    if path not in _cache:
        url = RAW + urllib.request.quote(path)
        with urllib.request.urlopen(url) as r:
            _cache[path] = r.read()
    return TTFont(io.BytesIO(_cache[path]))


def parse_ranges(spec):
    out = []
    for part in ",".join(spec).split(","):
        part = part.strip()[2:]
        lo, _, hi = part.partition("-")
        out.extend(range(int(lo, 16), int(hi or lo, 16) + 1))
    return out


def subset_and_save(font, unicodes, filename):
    # Round-trip so lazily loaded tables (gvar) are consistent after instancing.
    buf = io.BytesIO()
    font.save(buf)
    buf.seek(0)
    font = TTFont(buf)
    opts = Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = Subsetter(opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    path = os.path.join(OUT, filename)
    font.flavor = "woff2"
    font.save(path)
    print(f"{filename:44} {os.path.getsize(path) / 1024:7.1f} KB")


def main():
    os.makedirs(OUT, exist_ok=True)
    for prefix, src, weights, subsets in FAMILIES:
        unicodes = parse_ranges(subsets)
        suffix = "latin" if len(subsets) == 1 else "latin-devanagari"
        if weights == "variable":
            font = fetch(src)
            pins = {a.axisTag: None for a in font["fvar"].axes if a.axisTag != "wght"}
            font = instantiateVariableFont(font, pins)
            subset_and_save(font, unicodes, f"{prefix}-{suffix}-var.woff2")
            continue
        for w in weights:
            if "{name}" in src:
                font = fetch(src.format(name=STATIC_NAMES[w]))
            else:
                font = fetch(src)
                pins = {a.axisTag: None for a in font["fvar"].axes}
                pins["wght"] = w
                font = instantiateVariableFont(font, pins)
            subset_and_save(font, unicodes, f"{prefix}-{suffix}-{w}.woff2")


if __name__ == "__main__":
    main()

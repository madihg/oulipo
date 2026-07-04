#!/usr/bin/env python3
"""Flat ink/paper halftone treatment for Arabic word masks - the earlier,
simpler mark style (not the chrome 3D). Used as large, low-opacity BACKGROUND
watermarks: oulipo behind the hero (ink on paper), kitchen-lab behind the
footer (paper on ink).

Takes browser-shaped masks from render-word-masks.mjs, halftones them (cell 6,
strength 0.30 - matching arabic_marks.py), tints, tight-crops, exports PNG.
"""

import os
import sys

IG = "/Users/halim/Documents/hmart-share/instagram"
sys.path.insert(0, IG)

from PIL import Image, ImageChops  # noqa: E402
from marks import halftone_layer  # noqa: E402

SCRATCH = sys.argv[1]
OUT = "Assets/images/marks/gen"

INK = (0x0B, 0x0B, 0x0D)
PAPER = (0xFB, 0xFB, 0xF9)

# (mask name, output name, tint)
JOBS = [
    ("oulipo-ar", "oulipo-ink-flat", INK),
    ("kitchenlab", "kitchenlab-paper-flat", PAPER),
]


def flat(mask_path, out_path, color):
    src = Image.open(mask_path).convert("RGBA")
    a = src.split()[3]
    bbox = a.getbbox()
    if not bbox:
        raise SystemExit(f"empty mask {mask_path}")
    a = a.crop(bbox)
    # solid glyph filled with the tint, carrying a faint halftone dot texture
    # so it reads as part of the print world even as a low-opacity watermark.
    fill = Image.new("RGB", a.size, color)
    dots = halftone_layer(Image.new("L", a.size, 128), 6, 0.30)
    fill = ImageChops.multiply(fill, Image.merge("RGB", (dots, dots, dots)))
    rgba = fill.convert("RGBA")
    rgba.putalpha(a)
    if max(rgba.size) > 1600:
        r = 1600 / max(rgba.size)
        rgba = rgba.resize((round(rgba.width * r), round(rgba.height * r)), Image.LANCZOS)
    rgba.save(out_path)
    print(out_path, rgba.size)


def main():
    os.makedirs(OUT, exist_ok=True)
    for mask, name, color in JOBS:
        flat(os.path.join(SCRATCH, f"mask-{mask}.png"),
             os.path.join(OUT, f"{name}.png"), color)


if __name__ == "__main__":
    main()

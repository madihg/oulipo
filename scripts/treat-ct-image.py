#!/usr/bin/env python3
"""Bake the "modern signal" photo treatment into a /computer-theater/ card image.

Close to scripts/treat-images.py (DESIGN-SYSTEM.md section 4), with two
deliberate differences, both recovered by re-treating an existing card from its
Commons source and diffing against the committed file:

  - card images keep their source aspect ratio instead of being cover-cropped
    to 4:5, because the window CSS crops them itself (object-fit: cover,
    max-height 210px). Width caps at 760, no upscaling.
  - no grain pass, and no brightness lift. The cards in the repo were made
    without them; adding either puts the new card visibly off its neighbours.

  0. fit to MAX_W wide, aspect kept, no upscale (LANCZOS)
  1. grayscale
  2. contrast +15%
  3. duotone ink #0B0B0D -> paper #FBFBF9
  4. halftone: dot grid, cell 5px, max_r = cell/2 * 1.35, skip r < 0.35,
     multiply layer eased toward white by 1 - strength, strength 0.3

Reference run: File:Antonin_Artaud_1926.jpg through this script reproduces the
committed computer-theater/img/artaud.jpg at 760x969, mean luminance 70.74 vs
70.95, median residual 3 (halftone dot phase and JPEG noise).

Usage:
  python3 scripts/treat-ct-image.py SRC.jpg computer-theater/img/slug.jpg

Sources must come from a Wikimedia Commons File: page whose licence was read
in full (PD, CC0, CC BY, CC BY-SA only) - see docs/computer-theater-research.md.
Commons refuses requests without a User-Agent, so fetch with one.
"""

import sys

from PIL import Image, ImageChops, ImageDraw, ImageEnhance

INK = (0x0B, 0x0B, 0x0D)
PAPER = (0xFB, 0xFB, 0xF9)
CELL = 5
HALFTONE_STRENGTH = 0.3
MAX_W = 760
QUALITY = 88


def fit_width(img, max_w=MAX_W):
    w, h = img.size
    if w <= max_w:
        return img
    return img.resize((max_w, round(h * max_w / w)), Image.LANCZOS)


def duotone(gray):
    luts = []
    for shadow, highlight in zip(INK, PAPER):
        luts.append(
            [round(shadow + (highlight - shadow) * v / 255) for v in range(256)]
        )
    return Image.merge("RGB", (gray.point(luts[0]), gray.point(luts[1]),
                               gray.point(luts[2])))


def halftone_layer(gray, size):
    ss = 2  # supersample for round dots
    tw, th = size
    cols, rows = tw // CELL, th // CELL
    means = gray.resize((cols, rows), Image.BOX)
    canvas = Image.new("L", (tw * ss, th * ss), 255)
    draw = ImageDraw.Draw(canvas)
    max_r = (CELL / 2) * 1.35
    px = means.load()
    for j in range(rows):
        for i in range(cols):
            r = (1 - px[i, j] / 255) * max_r
            if r < 0.35:
                continue
            cx = (i * CELL + CELL / 2) * ss
            cy = (j * CELL + CELL / 2) * ss
            rr = r * ss
            draw.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=0)
    dots = canvas.resize((tw, th), Image.LANCZOS)
    white = Image.new("L", (tw, th), 255)
    return Image.blend(white, dots, HALFTONE_STRENGTH)


def treat(path):
    img = fit_width(Image.open(path).convert("RGB"))
    gray = img.convert("L")
    gray = ImageEnhance.Contrast(gray).enhance(1.15)
    rgb = duotone(gray)
    dots = halftone_layer(gray, img.size)
    return ImageChops.multiply(rgb, Image.merge("RGB", (dots, dots, dots)))


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, dest = sys.argv[1], sys.argv[2]
    out = treat(src)
    out.save(dest, quality=QUALITY)
    print(f"{dest} {out.width}x{out.height}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Silver-chrome treatment for Arabic word masks (local fallback while the
OpenAI billing limit blocks gpt-image generation - see gen-oulipo-sigils.py).

Takes the browser-shaped masks from render-word-masks.mjs and builds the
"modern signal" chrome look in code: extruded dark-metal depth layer, silver
vertical gradient, one electric-blue iridescent band, one faint copper glint,
halftone multiply (cell 5, strength 0.18 - matching gen_chrome.post).
"""

import os
import sys

IG = "/Users/halim/Documents/hmart-share/instagram"
sys.path.insert(0, IG)

from PIL import Image, ImageChops, ImageDraw, ImageFilter  # noqa: E402
from marks import halftone_layer  # noqa: E402

SCRATCH = sys.argv[1]
OUT = "Assets/images/marks/gen"

# silver ramp, top to bottom (stop, hex)
RAMP = [
    (0.00, (0xED, 0xEF, 0xF2)),
    (0.28, (0xC9, 0xCD, 0xD3)),
    (0.45, (0x7E, 0x84, 0x8C)),
    (0.55, (0xF4, 0xF5, 0xF7)),
    (0.72, (0x9A, 0xA0, 0xA8)),
    (1.00, (0x5F, 0x65, 0x6D)),
]
BLUE = (0x1C, 0x39, 0xE8)
COPPER = (0xC9, 0x77, 0x2E)
DEPTH = (0x3A, 0x3E, 0x44)


def gradient(size):
    w, h = size
    img = Image.new("RGB", (1, h))
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        for (s0, c0), (s1, c1) in zip(RAMP, RAMP[1:]):
            if s0 <= t <= s1:
                f = (t - s0) / (s1 - s0) if s1 > s0 else 0
                px[0, y] = tuple(round(a + (b - a) * f) for a, b in zip(c0, c1))
                break
    return img.resize((w, h))


def chrome(mask_path, out_path):
    src = Image.open(mask_path).convert("RGBA")
    a = src.split()[3]
    bbox = a.getbbox()
    if not bbox:
        raise SystemExit(f"empty mask {mask_path}")
    a = a.crop(bbox)
    w, h = a.size
    off = max(4, h // 45)  # extrusion depth
    W, H = w + off, h + off

    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # depth layer: dark metal, offset down-right
    depth = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    depth.paste(Image.new("RGB", (w, h), DEPTH), (off, off), a)
    canvas = Image.alpha_composite(canvas, depth)

    # face layer: silver gradient + iridescence + glint
    face_rgb = gradient((w, h))
    band = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(band)
    d.polygon([(0, 0), (w, int(h * 0.18)), (w, int(h * 0.44)), (0, int(h * 0.26))],
              fill=255)
    band = band.filter(ImageFilter.GaussianBlur(h / 14)).point(lambda v: int(v * 0.16))
    face_rgb = Image.composite(Image.new("RGB", (w, h), BLUE), face_rgb, band)
    glint = Image.new("L", (w, h), 0)
    dg = ImageDraw.Draw(glint)
    gx, gy, gr = int(w * 0.78), int(h * 0.68), max(6, h // 7)
    dg.ellipse((gx - gr, gy - gr, gx + gr, gy + gr), fill=255)
    glint = glint.filter(ImageFilter.GaussianBlur(gr / 1.5)).point(lambda v: int(v * 0.22))
    face_rgb = Image.composite(Image.new("RGB", (w, h), COPPER), face_rgb, glint)

    face = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    face.paste(face_rgb, (0, 0), a)
    canvas = Image.alpha_composite(canvas, face)

    # halftone into the print world (same numbers as gen_chrome.post)
    rgb = canvas.convert("RGB")
    ht = halftone_layer(rgb.convert("L"), 5, 0.18)
    rgb = ImageChops.multiply(rgb, Image.merge("RGB", (ht, ht, ht)))
    final = rgb.convert("RGBA")
    final.putalpha(canvas.split()[3])

    if max(final.size) > 900:
        r = 900 / max(final.size)
        final = final.resize(
            (round(final.width * r), round(final.height * r)), Image.LANCZOS
        )
    final.save(out_path)
    print(out_path, final.size)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name in ["oulipo-ar", "matbakh", "mukhtabar"]:
        chrome(os.path.join(SCRATCH, f"mask-{name}.png"),
               os.path.join(OUT, f"{name}-chrome.png"))


if __name__ == "__main__":
    main()

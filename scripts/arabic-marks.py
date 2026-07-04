#!/usr/bin/env python3
"""Render Arabic glyph marks per DESIGN-SYSTEM.md section 3.4 / arabic_marks.py.

Single Diwan Thuluth letters from the curated set, rendered large, tight-cropped,
halftoned (cell 6, strength 0.30), exported as transparent PNGs recolored per use:
  ink   #0B0B0D  - hero mark (clean surfaces)
  white #FBFBF9  - footer glyph on ink ground
  copper #C9772E - the one warm touch

Outputs to Assets/images/marks/.
"""

import os
from PIL import Image, ImageChops, ImageDraw, ImageFont

FONT = "/System/Library/Fonts/Supplemental/Diwan Thuluth.ttf"
OUT = "Assets/images/marks"
BOX = 900
CELL = 6
STRENGTH = 0.30

MARKS = [
    ("waw-ink", "و", (0x0B, 0x0B, 0x0D)),      # و
    ("meem-white", "م", (0xFB, 0xFB, 0xF9)),   # م
    ("ha-copper", "ه", (0xC9, 0x77, 0x2E)),    # ه
]


def render_mask(char):
    font = ImageFont.truetype(FONT, int(BOX * 0.7))
    img = Image.new("L", (BOX, BOX), 0)
    draw = ImageDraw.Draw(img)
    draw.text((BOX // 2, BOX // 2), char, font=font, fill=255, anchor="mm")
    bbox = img.getbbox()
    return img.crop(bbox)


def halftone_texture(size):
    """Dot-grid texture, multiply-style: 255 = keep, lower = thinned toner."""
    w, h = size
    ss = 2
    canvas = Image.new("L", (w * ss, h * ss), 255)
    draw = ImageDraw.Draw(canvas)
    r = (CELL / 2) * 0.9 * ss
    for j in range(h // CELL + 1):
        for i in range(w // CELL + 1):
            cx = (i * CELL + CELL / 2) * ss
            cy = (j * CELL + CELL / 2) * ss
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=0)
    dots = canvas.resize((w, h), Image.LANCZOS)
    white = Image.new("L", (w, h), 255)
    return Image.blend(white, dots, STRENGTH)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, char, color in MARKS:
        mask = render_mask(char)
        tex = halftone_texture(mask.size)
        # toner breakdown: alpha = glyph mask thinned by the dot grid
        alpha = ImageChops.multiply(mask, tex)
        rgba = Image.new("RGBA", mask.size, color + (0,))
        rgba.putalpha(alpha)
        dest = os.path.join(OUT, f"{name}.png")
        rgba.save(dest)
        print(f"{dest} {rgba.size[0]}x{rgba.size[1]} {os.path.getsize(dest)//1024}KB")


if __name__ == "__main__":
    main()

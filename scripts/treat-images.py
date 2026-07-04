#!/usr/bin/env python3
"""Bake the "modern signal" photo treatment into the Kitchen Lab thumbnails.

Port of the canonical treat.py pipeline (DESIGN-SYSTEM.md section 4), pure Pillow:
  0. cover-crop to 4:5 canvas (LANCZOS)
  1. grayscale
  2. contrast +15%, brightness +5%
  3. duotone ink #0B0B0D -> paper #FBFBF9 (always on)
  4. halftone: regular dot grid, cell 5px, max_r = cell/2 * 1.35, skip r < 0.35,
     multiply layer eased toward white by 1 - strength, strength 0.3
  5. grain: seeded monochrome noise (seed 7), Pegtop soft-light, opacity 0.5

Outputs JPEG (q88) into Assets/images/kitchen-lab/treated/.
Featured/series images render at 1080x1350, petri dishes at 640x800.
"""

import os
import random
from PIL import Image, ImageDraw, ImageEnhance, ImageChops

INK = (0x0B, 0x0B, 0x0D)
PAPER = (0xFB, 0xFB, 0xF9)
CELL = 5
HALFTONE_STRENGTH = 0.3
GRAIN_SEED = 7
GRAIN_OPACITY = 0.5

SRC = "Assets/images/kitchen-lab"
OUT = "Assets/images/kitchen-lab/treated"

LARGE = {"curl", "becoming-crossings", "borderline", "case-against-the-son",
         "latent-space-games"}
SIZE_LARGE = (1080, 1350)
SIZE_SMALL = (640, 800)

_noise_cache = {}


def cover_crop(img, size):
    w, h = img.size
    tw, th = size
    scale = max(tw / w, th / h)
    nw, nh = round(w * scale), round(h * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return img.crop((left, top, left + tw, top + th))


def duotone(gray):
    luts = []
    for shadow, highlight in zip(INK, PAPER):
        luts.append([round(shadow + (highlight - shadow) * v / 255) for v in range(256)])
    r = gray.point(luts[0])
    g = gray.point(luts[1])
    b = gray.point(luts[2])
    return Image.merge("RGB", (r, g, b))


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
            darkness = 1 - px[i, j] / 255
            r = darkness * max_r
            if r < 0.35:
                continue
            cx = (i * CELL + CELL / 2) * ss
            cy = (j * CELL + CELL / 2) * ss
            rr = r * ss
            draw.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=0)
    dots = canvas.resize((tw, th), Image.LANCZOS)
    # ease toward white by 1 - strength
    white = Image.new("L", (tw, th), 255)
    return Image.blend(white, dots, HALFTONE_STRENGTH)


def noise_image(size):
    if size in _noise_cache:
        return _noise_cache[size]
    rng = random.Random(GRAIN_SEED)
    w, h = size
    data = bytes(min(255, max(0, int(rng.gauss(128, 50)))) for _ in range(w * h))
    img = Image.frombytes("L", size, data)
    _noise_cache[size] = img
    return img


def pegtop_softlight(base_l, noise_l):
    # R = b^2 + 2n(b - b^2), all normalized; stays within [0, 255]
    bb = ImageChops.multiply(base_l, base_l)
    d = ImageChops.subtract(base_l, bb)
    nd = ImageChops.multiply(noise_l, d)
    return ImageChops.add(ImageChops.add(bb, nd), nd)


def apply_grain(rgb):
    noise = noise_image(rgb.size)
    channels = []
    for ch in rgb.split():
        lit = pegtop_softlight(ch, noise)
        channels.append(Image.blend(ch, lit, GRAIN_OPACITY))
    return Image.merge("RGB", channels)


def treat(path, size):
    img = Image.open(path).convert("RGB")
    img = cover_crop(img, size)
    gray = img.convert("L")
    gray = ImageEnhance.Contrast(gray).enhance(1.15)
    gray = ImageEnhance.Brightness(gray).enhance(1.05)
    rgb = duotone(gray)
    dots = halftone_layer(gray, size)
    dots_rgb = Image.merge("RGB", (dots, dots, dots))
    rgb = ImageChops.multiply(rgb, dots_rgb)
    return apply_grain(rgb)


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in sorted(os.listdir(SRC)):
        if not f.endswith(".jpg"):
            continue
        slug = f[:-4]
        size = SIZE_LARGE if slug in LARGE else SIZE_SMALL
        out = treat(os.path.join(SRC, f), size)
        dest = os.path.join(OUT, slug + ".jpg")
        out.save(dest, quality=88)
        print(f"{dest} {size[0]}x{size[1]} {os.path.getsize(dest)//1024}KB")


if __name__ == "__main__":
    main()

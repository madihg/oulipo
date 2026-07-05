#!/usr/bin/env python3
"""Chrome sigil exploration for the oulipo.xyz landing.

Reuses the Instagram pipeline's locked liquid-chrome art direction
(hmart-share/instagram/gen_chrome.py) via gpt-image-1, then post-processes
with the same halftone-multiply step so the marks live in the print world.

Text-bearing marks (Arabic words) render at quality=high for glyph fidelity;
abstract sigils at medium. Outputs:
  Assets/images/marks/gen/raw-<name>.png        raw model output
  Assets/images/marks/gen/<name>.png            halftoned, tight-cropped
  Assets/images/marks/gen/_contact-sheet.png    the exploration, one page
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
IG = "/Users/halim/Documents/hmart-share/instagram"
sys.path.insert(0, IG)

from PIL import Image, ImageChops  # noqa: E402
from gen_marks import generate  # noqa: E402
from marks import halftone_layer, contact_sheet  # noqa: E402

OUT = os.path.join(HERE, "..", "Assets", "images", "marks", "gen")

# locked chrome DNA from gen_chrome.py
AD = (
    "Single isolated mark centered on a fully transparent background. "
    "No scene, no cast shadow, no border. Liquid mercury chrome - "
    "polished silver metal, mirror-like, with subtle electric-blue iridescent "
    "reflections and one faint warm copper glint. Risograph halftone print "
    "texture, slightly degraded photocopy feel. Editorial, refined, not clip-art."
)

# The oulipo design system has exactly TWO canonical chrome sigil forms:
# a faceted crystalline SHARD and a ring/TORUS. Every generated sigil is a
# variant of one of these. (Arabic WORD marks are NOT made here - gpt-image
# misspells Arabic; use scripts/render-word-masks.mjs for those.)
MARKS = [
    ("sigil-shard", "medium",
     "A faceted crystalline shard - an angular chrome gem with sharp planar "
     "facets and hard bevelled edges, tapering to a point, three-dimensional "
     "and mineral. No letters, no text."),
    ("sigil-shard-b", "medium",
     "A slim faceted chrome shard standing upright, few clean facets, "
     "crystalline and precise, like a cut mineral. No letters, no text."),
    ("sigil-ring", "medium",
     "A smooth chrome ring - a torus seen at a gentle three-quarter angle, "
     "even molten thickness, mirror-polished. No letters, no text."),
    ("sigil-ring-b", "medium",
     "A chrome torus at a steeper tilt, slightly irregular hand-poured "
     "thickness, one bright specular highlight. No letters, no text."),
]


def post_process(raw_path, out_path):
    img = Image.open(raw_path).convert("RGBA")
    a = img.split()[3]
    bbox = a.getbbox()
    if bbox:
        img = img.crop(bbox)
        a = a.crop(bbox)
    rgb = img.convert("RGB")
    ht = halftone_layer(rgb.convert("L"), 5, 0.18)
    rgb = ImageChops.multiply(rgb, Image.merge("RGB", (ht, ht, ht)))
    out = rgb.convert("RGBA")
    out.putalpha(a)
    # keep files light: max 900px on the long side
    if max(out.size) > 900:
        r = 900 / max(out.size)
        out = out.resize((round(out.width * r), round(out.height * r)), Image.LANCZOS)
    out.save(out_path)
    return out_path


def main():
    os.makedirs(OUT, exist_ok=True)
    done = []
    for name, quality, form in MARKS:
        raw = os.path.join(OUT, f"raw-{name}.png")
        final = os.path.join(OUT, f"{name}.png")
        if not os.path.exists(raw):
            try:
                path, usage = generate(f"{AD} {form}", raw, size="1024x1024", quality=quality)
                print(f"generated {name}  usage={usage}", flush=True)
            except SystemExit as e:
                print(f"FAILED {name}: {e}", file=sys.stderr, flush=True)
                continue
        post_process(raw, final)
        print(f"post-processed {final}", flush=True)
        done.append(final)
    if done:
        cs = contact_sheet(done, os.path.join(OUT, "_contact-sheet.png"),
                           cols=4, cell=480, bg=(251, 251, 249))
        print("wrote", cs, flush=True)


if __name__ == "__main__":
    main()

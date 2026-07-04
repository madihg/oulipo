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

MARKS = [
    # the word "oulipo" in Arabic - hero mark candidates
    ("oulipo-diwan", "high",
     "The Arabic word أوليبو written once in flowing hand-brushed Diwani "
     "calligraphy, a single connected word, rendered as three-dimensional "
     "liquid mercury chrome with molten thickness. The exact letters must "
     "read أوليبو and nothing else."),
    ("oulipo-kufi", "high",
     "The Arabic word أوليبو written once in bold geometric Kufic "
     "calligraphy, a single connected word, rendered as three-dimensional "
     "polished chrome metal type with hard bevels. The exact letters must "
     "read أوليبو and nothing else."),
    # footer word candidates - a different word than the hero
    ("matbakh-chrome", "high",
     "The Arabic word مطبخ (kitchen) written once in gestural Thuluth "
     "calligraphy with dry-brush texture, rendered as molten liquid chrome, "
     "one small detached chrome droplet beside it. The exact letters must "
     "read مطبخ and nothing else."),
    ("mukhtabar-chrome", "high",
     "The Arabic word مختبر (laboratory) written once in flowing Diwani "
     "calligraphy, rendered as three-dimensional liquid mercury chrome. "
     "The exact letters must read مختبر and nothing else."),
    # bolder abstract sigils - no text
    ("sigil-waw-molten", "medium",
     "No text except a single giant Arabic letter و rendered as a thick "
     "molten chrome ribbon mid-pour, liquid crown splash at its head, "
     "dramatic and sculptural."),
    ("sigil-knot", "medium",
     "An abstract calligraphic knot - one continuous thick chrome stroke "
     "looping over and under itself three times, like a signature made of "
     "liquid mercury, bold and gestural. No letters, no text."),
    ("sigil-splash", "medium",
     "A violent chrome ink-splash sigil - a central molten mass with six "
     "radiating liquid arms and satellite droplets, symmetrical enough to "
     "read as a seal or stamp. No letters, no text."),
    ("sigil-orbit", "medium",
     "A chrome torus seen at a steep angle with one thin calligraphic tail "
     "sweeping off it like a comet, planet-and-brushstroke, minimal and "
     "bold. No letters, no text."),
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

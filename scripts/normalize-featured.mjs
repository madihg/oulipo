#!/usr/bin/env node

// scripts/normalize-featured.mjs
//
// Establishes / re-establishes the per-work featured-image convention
// (see docs/adding-a-work.md). For each work in Assets/data/works.json:
//   1. Ensures Assets/images/works/<slug>/ exists.
//   2. If the work's cover_image points to an existing file, copies that
//      file to Assets/images/works/<slug>/featured.<ext> (preserving the
//      extension), unless a featured.* already exists.
//   3. Updates cover_image to point at the new featured.<ext>.
//
// Idempotent: safe to re-run after adding new works. Run it after seeding
// new entries so cover_image always lines up with the convention.
//
// Usage: node scripts/normalize-featured.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "Assets", "data", "works.json");
const WORKS_DIR = path.join(ROOT, "Assets", "images", "works");

const VALID_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function findExistingFeatured(folder) {
  if (!fs.existsSync(folder)) return null;
  for (const f of fs.readdirSync(folder)) {
    const ext = path.extname(f).toLowerCase();
    if (
      VALID_EXTS.has(ext) &&
      path.basename(f, ext).toLowerCase() === "featured"
    ) {
      return path.join(folder, f);
    }
  }
  return null;
}

function main() {
  const payload = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const works = Array.isArray(payload) ? payload : payload.works;
  let changed = 0;
  let createdFolders = 0;

  for (const w of works) {
    const slug = w.slug;
    const folder = path.join(WORKS_DIR, slug);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      createdFolders++;
      console.log(`  + created folder Assets/images/works/${slug}/`);
    }

    // If a featured.* already exists, just point cover_image at it.
    const existing = findExistingFeatured(folder);
    if (existing) {
      const ext = path.extname(existing).toLowerCase();
      const newCover = `Assets/images/works/${slug}/featured${ext}`;
      if (w.cover_image !== newCover) {
        w.cover_image = newCover;
        changed++;
        console.log(
          `  ~ ${slug}: cover_image -> featured${ext} (already on disk)`,
        );
      }
      continue;
    }

    // Otherwise, copy the existing cover_image to featured.<ext>.
    if (!w.cover_image) {
      console.log(
        `  · ${slug}: no cover_image and no featured.* on disk — leaving blank`,
      );
      continue;
    }
    const src = path.join(ROOT, w.cover_image);
    if (!fs.existsSync(src)) {
      console.log(
        `  ! ${slug}: cover_image points at ${w.cover_image} but file missing — skipping`,
      );
      continue;
    }
    const ext = path.extname(src).toLowerCase();
    if (!VALID_EXTS.has(ext)) {
      console.log(`  ! ${slug}: unsupported cover extension ${ext}`);
      continue;
    }
    const target = path.join(folder, `featured${ext}`);
    fs.copyFileSync(src, target);
    const newCover = `Assets/images/works/${slug}/featured${ext}`;
    if (w.cover_image !== newCover) {
      w.cover_image = newCover;
      changed++;
    }
    console.log(`  + ${slug}: copied cover -> featured${ext}`);
  }

  fs.writeFileSync(DATA, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `\nupdated cover_image for ${changed} work${changed === 1 ? "" : "s"}`,
  );
  console.log(
    `created ${createdFolders} new folder${createdFolders === 1 ? "" : "s"}`,
  );
}

main();

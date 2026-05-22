#!/usr/bin/env node

/**
 * sync-featured-images.mjs
 *
 * Walks Assets/images/works/<slug>/ and Assets/images/books/<slug>/.
 * For each folder, finds the file named `featured.*` (or `cover.*` as a
 * fallback for books). Updates oulipo_dashboard.works.cover_image so the
 * site picks it up.
 *
 * Usage:
 *   node scripts/sync-featured-images.mjs            # apply changes
 *   node scripts/sync-featured-images.mjs --dry-run  # preview only
 *
 * Requires OULIPO_SUPABASE_URL + OULIPO_SUPABASE_SERVICE_KEY in .env.local.
 *
 * Convention:
 *   - Drop image files into Assets/images/works/<slug>/ where <slug> matches
 *     a row in oulipo_dashboard.works.
 *   - Name the one you want featured `featured.jpg` (or .jpeg / .png / .webp).
 *   - Same for books under Assets/images/books/<slug>/. Books also accept
 *     `cover.*` as a fallback for legacy folders that already used that name.
 *   - Run this script. It updates the cover_image column for every match.
 *
 * Safety:
 *   - Only updates rows whose slug exactly matches a folder name.
 *   - Skips rows whose existing cover_image already points to the resolved
 *     featured file (idempotent).
 *   - --dry-run prints the diff without writing anything.
 */

import { readdirSync, statSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

dotenv.config({ path: resolve(ROOT, ".env.local") });

const SUPABASE_URL = process.env.OULIPO_SUPABASE_URL;
const SUPABASE_KEY = process.env.OULIPO_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing OULIPO_SUPABASE_URL or OULIPO_SUPABASE_SERVICE_KEY in .env.local",
  );
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

// Featured-image lookup priority. Earlier entries win.
const FEATURED_NAMES = [
  "featured.jpg",
  "featured.jpeg",
  "featured.png",
  "featured.webp",
];
// Books only — accept legacy `cover.*` as a fallback.
const COVER_FALLBACK_NAMES = [
  "cover.jpg",
  "cover.jpeg",
  "cover.png",
  "cover.webp",
];

function findFeatured(folder, allowCoverFallback = false) {
  let entries;
  try {
    entries = readdirSync(folder);
  } catch {
    return null;
  }
  const lower = new Map(entries.map((e) => [e.toLowerCase(), e]));
  for (const name of FEATURED_NAMES) {
    if (lower.has(name)) return lower.get(name);
  }
  if (allowCoverFallback) {
    for (const name of COVER_FALLBACK_NAMES) {
      if (lower.has(name)) return lower.get(name);
    }
  }
  return null;
}

function listSlugFolders(parent) {
  let entries;
  try {
    entries = readdirSync(parent);
  } catch {
    return [];
  }
  return entries
    .filter((name) => {
      try {
        return statSync(join(parent, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .filter((name) => !name.startsWith("."));
}

function normalisePath(rel) {
  // Always store as leading-slash absolute path so the frontend can use it
  // verbatim.
  return "/" + rel.replace(/^\/+/, "");
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: "oulipo_dashboard" },
    auth: { persistSession: false },
  });

  // 1. Walk works/ and books/, build slug -> featuredPath map.
  const targets = []; // { slug, kind, newCoverPath, source }
  const worksDir = resolve(ROOT, "Assets/images/works");
  for (const slug of listSlugFolders(worksDir)) {
    const found = findFeatured(join(worksDir, slug), false);
    if (!found) continue;
    targets.push({
      slug,
      kind: "work",
      newCoverPath: normalisePath(`Assets/images/works/${slug}/${found}`),
      source: `works/${slug}/${found}`,
    });
  }
  const booksDir = resolve(ROOT, "Assets/images/books");
  for (const slug of listSlugFolders(booksDir)) {
    const found = findFeatured(join(booksDir, slug), true);
    if (!found) continue;
    targets.push({
      slug,
      kind: "book",
      newCoverPath: normalisePath(`Assets/images/books/${slug}/${found}`),
      source: `books/${slug}/${found}`,
    });
  }

  if (!targets.length) {
    console.log(
      "No featured.* files found. Drop one into a work or book folder and rerun.",
    );
    return;
  }

  // 2. Pull current cover_image for each slug.
  const slugs = targets.map((t) => t.slug);
  const { data: rows, error } = await supabase
    .from("works")
    .select("id, slug, cover_image")
    .in("slug", slugs);
  if (error) {
    console.error("Fetch failed:", error.message);
    process.exit(1);
  }
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  // 3. Diff + apply.
  const willUpdate = [];
  const noChange = [];
  const noRow = [];
  for (const t of targets) {
    const row = bySlug.get(t.slug);
    if (!row) {
      noRow.push(t);
      continue;
    }
    if (row.cover_image === t.newCoverPath) {
      noChange.push(t);
    } else {
      willUpdate.push({ ...t, id: row.id, prev: row.cover_image });
    }
  }

  // 4. Print summary.
  console.log(`\nScanned ${targets.length} featured.* file(s).\n`);
  if (willUpdate.length) {
    console.log(`Will update ${willUpdate.length} row(s):`);
    for (const u of willUpdate) {
      console.log(`  ${u.slug.padEnd(28)}  ${u.prev || "(empty)"}`);
      console.log(`  ${" ".repeat(28)}  → ${u.newCoverPath}`);
    }
  }
  if (noChange.length) {
    console.log(`\nAlready up to date: ${noChange.length} row(s).`);
  }
  if (noRow.length) {
    console.log(
      `\n⚠ ${noRow.length} folder(s) with featured.* but no matching works.slug:`,
    );
    for (const t of noRow) console.log(`  ${t.kind}/${t.slug}`);
    console.log("  → either rename the folder or add the row to Supabase.");
  }

  if (DRY_RUN) {
    console.log("\n[dry-run] No changes written.");
    return;
  }

  if (!willUpdate.length) {
    console.log("\nNothing to update.");
    return;
  }

  // 5. Run the updates.
  let ok = 0;
  for (const u of willUpdate) {
    const { error: e2 } = await supabase
      .from("works")
      .update({ cover_image: u.newCoverPath })
      .eq("id", u.id);
    if (e2) {
      console.error(`  ✗ ${u.slug}: ${e2.message}`);
    } else {
      ok++;
    }
  }
  console.log(`\nWrote ${ok}/${willUpdate.length} row(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node

// scripts/dump-works-to-json.mjs
//
// Single source of truth helper. Reads the `works` array from
// scripts/seed-works.mjs (no Supabase connection needed), augments
// each entry with the new fields the v4 site needs (section, year),
// drops the 4 book entries (books live in /writing/, not in the
// works table), and writes Assets/data/works.json — used as the
// static fallback by /works/index.html when Supabase is unreachable.
//
// Usage: node scripts/dump-works-to-json.mjs
// Output: Assets/data/works.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SEED_FILE = path.join(ROOT, "scripts", "seed-works.mjs");
const OUT_FILE = path.join(ROOT, "Assets", "data", "works.json");

// Section assignments for the 17 non-book works.
// Mapping committed in docs/prd-v2.md and chrome.js sitemap.
const SECTION_BY_SLUG = {
  // machine talk — fine-tuned poetry models, AI duels, computational poetry
  "carnation-exe": "machine-talk",
  "versus-exe": "machine-talk",
  "reinforcement-exe": "machine-talk",
  "we-called-us": "machine-talk",
  "feed-it": "machine-talk",
  "re-declarations": "machine-talk",
  // algorithmic plays — performance / theater / installation as algorithmic play
  borderline: "algorithmic-plays",
  "deserve-it": "algorithmic-plays",
  "i-live-here": "algorithmic-plays",
  "invasions-performance": "algorithmic-plays",
  "def-hug": "algorithmic-plays",
  avenir: "algorithmic-plays",
  // somatic semantics — net art for the body, web pieces, physical install
  "borderline-exe": "somatic-semantics",
  "weirder-webs": "somatic-semantics",
  whomp: "somatic-semantics",
  "american-metabolisis": "somatic-semantics",
  "borrow-never-give-back": "somatic-semantics",
  // tools — currently empty (will populate when word-garden / prompt-rivals land)
};

function extractWorksArray() {
  const src = fs.readFileSync(SEED_FILE, "utf8");
  // Pull the literal `const works = [ ... ];` block by line offsets.
  const lines = src.split("\n");
  const start = lines.findIndex((l) => /^const works = \[\s*$/.test(l));
  const end = lines.findIndex((l, i) => i > start && /^\];\s*$/.test(l));
  if (start < 0 || end < 0) {
    throw new Error(
      "Could not locate `const works = [ ... ];` block in seed-works.mjs",
    );
  }
  // Re-evaluate the literal in a fresh scope. The array uses only literal
  // values (strings, numbers, arrays, plain objects, null) so eval is safe
  // here for our own checked-in source.
  const literal = lines.slice(start + 1, end).join("\n");
  // eslint-disable-next-line no-new-func
  const arr = new Function(`return [${literal}];`)();
  return arr;
}

function inferYear(entry) {
  if (typeof entry.year === "number") return entry.year;
  if (entry.date_start) {
    const m = String(entry.date_start).match(/^(\d{4})/);
    if (m) return Number(m[1]);
  }
  return null;
}

function augmentEntry(entry) {
  const section = SECTION_BY_SLUG[entry.slug];
  // Skip books — they live in /writing/, not in the works table.
  if (entry.type === "book") return null;
  if (!section) {
    console.warn(`[dump-works] no section for slug "${entry.slug}" — skipping`);
    return null;
  }
  return {
    ...entry,
    section,
    year: inferYear(entry),
    // Default fields the v4 schema expects, harmless if already present.
    long_description: entry.long_description ?? null,
    images: Array.isArray(entry.images) ? entry.images : [],
    doc_count: typeof entry.doc_count === "number" ? entry.doc_count : 0,
    featured: entry.featured ?? false,
    sort_order: entry.sort_order ?? null,
  };
}

function main() {
  const raw = extractWorksArray();
  const augmented = raw.map(augmentEntry).filter(Boolean);

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: "scripts/seed-works.mjs (via dump-works-to-json.mjs)",
        count: augmented.length,
        works: augmented,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Wrote ${augmented.length} works to ${path.relative(ROOT, OUT_FILE)}`,
  );

  // Print a quick by-section summary so we can spot mis-mappings.
  const bySection = {};
  for (const w of augmented) {
    bySection[w.section] = (bySection[w.section] || 0) + 1;
  }
  for (const [s, n] of Object.entries(bySection).sort()) {
    console.log(`  ${s.padEnd(20)} ${n}`);
  }
}

main();

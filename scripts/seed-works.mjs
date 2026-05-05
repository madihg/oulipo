#!/usr/bin/env node

// Seed Supabase works table (oulipo_dashboard.works)
//
// Single source of truth: Assets/data/works.json
//   - Edit that file to add/edit a work, then re-run this script.
//   - The same JSON file is also served as the static fallback by
//     /works/index.html when Supabase is unreachable.
//
// Usage:
//   node scripts/seed-works.mjs            # upsert all works (idempotent)
//   node scripts/seed-works.mjs --clear    # delete all rows first, then seed
//
// Requires: OULIPO_SUPABASE_URL and OULIPO_SUPABASE_SERVICE_KEY in .env.local
// Requires: oulipo_dashboard.works table created via scripts/works-schema.sql

import fs from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: "oulipo_dashboard" },
});

const clearFirst = process.argv.includes("--clear");

// Load source-of-truth from Assets/data/works.json.
const SRC = resolve(ROOT, "Assets", "data", "works.json");
if (!fs.existsSync(SRC)) {
  console.error(`Source data missing: ${SRC}`);
  console.error(
    "If this is your first run after the v4 rebuild, regenerate it with:\n" +
      "  node scripts/dump-works-to-json.mjs\n" +
      "(or hand-edit Assets/data/works.json directly).",
  );
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(SRC, "utf8"));
const works = Array.isArray(payload) ? payload : payload.works;
if (!Array.isArray(works) || works.length === 0) {
  console.error("Source data has no works array.");
  process.exit(1);
}

// Strip metadata fields the Supabase row doesn't accept (client-side only).
const rows = works.map((w) => {
  const row = { ...w };
  delete row.id; // Supabase generates uuid
  return row;
});

async function main() {
  if (clearFirst) {
    console.log("Clearing existing works…");
    const { error: delErr } = await supabase
      .from("works")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) {
      console.error("Clear failed:", delErr.message);
      process.exit(1);
    }
    console.log("Cleared.");
  }

  console.log(`Seeding ${rows.length} works…`);
  const { error } = await supabase.from("works").upsert(rows, {
    onConflict: "slug",
  });

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} works successfully.`);

  // Quick by-section summary so we can spot mis-mappings.
  const bySection = {};
  for (const r of rows) {
    bySection[r.section] = (bySection[r.section] || 0) + 1;
  }
  for (const [s, n] of Object.entries(bySection).sort()) {
    console.log(`  ${s.padEnd(20)} ${n}`);
  }
}

main();

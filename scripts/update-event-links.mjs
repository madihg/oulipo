#!/usr/bin/env node

// Update Supabase events with URLs extracted from CV PDF + Link-in-Bio
// Usage: node scripts/update-event-links.mjs
//        node scripts/update-event-links.mjs --dry-run   (preview only)
//
// Requires: OULIPO_SUPABASE_URL and OULIPO_SUPABASE_SERVICE_KEY in .env.local

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
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

const dryRun = process.argv.includes("--dry-run");
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load mapping
const mapping = JSON.parse(
  readFileSync(resolve(ROOT, ".private/event-url-mapping.json"), "utf-8"),
);

const updates = mapping.updates;
console.log(`Loaded ${updates.length} URL mappings.`);
if (dryRun) console.log("DRY RUN — no changes will be made.\n");

let updated = 0;
let skipped = 0;
let errors = 0;

for (const entry of updates) {
  const label = `${entry.org} → ${entry.title}`;

  if (dryRun) {
    console.log(`  [DRY] ${label}`);
    console.log(`         ${entry.link}`);
    updated++;
    continue;
  }

  const { error } = await supabase
    .schema("oulipo_dashboard")
    .from("events")
    .update({ link: entry.link })
    .eq("id", entry.id);

  if (error) {
    console.error(`  [ERR] ${label}: ${error.message}`);
    errors++;
  } else {
    console.log(`  [OK]  ${label}`);
    updated++;
  }
}

console.log(
  `\nDone — ${updated} updated, ${skipped} skipped, ${errors} errors.`,
);

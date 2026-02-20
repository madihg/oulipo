#!/usr/bin/env node

// Seed Supabase events table
// Usage: node scripts/seed-events.mjs                  (seeds all-events.json)
//        node scripts/seed-events.mjs events.json      (seeds legacy events.json)
//        node scripts/seed-events.mjs --clear           (delete all rows first, then seed)
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse args
const args = process.argv.slice(2);
const clearFirst = args.includes("--clear");
const fileArg = args.find((a) => !a.startsWith("--"));
const inputFile = fileArg || "scripts/all-events.json";

// Read input file
const raw = JSON.parse(readFileSync(resolve(ROOT, inputFile), "utf-8"));

// Detect format: legacy (events.json) has "type" and "dateDisplay"
// Supabase-native (all-events.json) has "kind" and "date_display"
const isLegacy = raw.length > 0 && "dateDisplay" in raw[0];

const events = raw
  .filter((e) => e.date !== "2099-01-01") // skip test event
  .map((e) => {
    if (isLegacy) {
      return {
        title: e.title,
        org: e.org,
        description: e.description || null,
        kind: e.type ? e.type.toLowerCase() : null,
        location: e.location || null,
        link: e.link || null,
        date: e.date,
        date_end: e.dateEnd || null,
        date_display: e.dateDisplay,
      };
    }
    // Supabase-native format — pass through, just clean nulls
    return {
      title: e.title,
      org: e.org,
      description: e.description || null,
      kind: e.kind || null,
      location: e.location || null,
      link: e.link || null,
      date: e.date,
      date_end: e.date_end || null,
      date_display: e.date_display,
    };
  });

console.log(`Source: ${inputFile} (${isLegacy ? "legacy" : "native"} format)`);
console.log(`Found ${events.length} events to insert.`);

// Optionally clear existing rows
if (clearFirst) {
  console.log("Clearing existing events...");
  const { error: delError } = await supabase
    .from("events")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows
  if (delError) {
    console.error("Delete error:", delError.message);
    process.exit(1);
  }
  console.log("Cleared.");
}

// Insert in batches of 50 to avoid payload limits
const BATCH = 50;
let inserted = 0;

for (let i = 0; i < events.length; i += BATCH) {
  const batch = events.slice(i, i + BATCH);
  const { data, error } = await supabase.from("events").insert(batch).select();

  if (error) {
    console.error(`Insert error at batch ${i / BATCH + 1}:`, error.message);
    process.exit(1);
  }

  inserted += data.length;
  data.forEach((e) => console.log(`  ${e.date} | ${e.org} → ${e.title}`));
}

console.log(`\nDone — ${inserted} events inserted.`);

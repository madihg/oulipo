#!/usr/bin/env node

/**
 * import-from-main.mjs
 *
 * Bridges Halim's MAIN repo working directory (~/Documents/oulipo) into the
 * worktree where the agent commits. Halim drops/edits image + content files
 * in his main repo; this pulls any NEW or CHANGED files into the worktree so
 * the next commit (and therefore the next deploy) reflects them.
 *
 * WHY THIS EXISTS
 *   The agent works in a git worktree on a feature branch:
 *     ~/Documents/oulipo/.claude/worktrees/<name>/
 *   Halim works in the main checkout:
 *     ~/Documents/oulipo/
 *   These are separate working directories. Files Halim changes in the main
 *   repo are invisible to the worktree until copied across. This script is
 *   that copy step.
 *
 * SAFETY
 *   - ADD/UPDATE ONLY. Never deletes files in the worktree. (Halim's main
 *     repo is often mid-drift — stale deletions, Drive-sync churn — and we do
 *     NOT want those propagating and wiping live images.)
 *   - Scoped to content dirs: Assets/images, Assets/css, Assets/js, works,
 *     books, writing, engagements, connect, about, cv, home, Assets/partials.
 *   - Skips dotfiles, .DS_Store, node_modules, .next, .git, .claude.
 *   - Compares by content hash; only copies when different or missing.
 *   - --dry-run prints what WOULD copy without writing.
 *
 * USAGE
 *   node scripts/import-from-main.mjs            # apply
 *   node scripts/import-from-main.mjs --dry-run  # preview
 *
 * After running this, run scripts/sync-featured-images.mjs to refresh the
 * Supabase cover_image column for any new featured.* files, then commit.
 */

import {
  readdirSync,
  statSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
} from "fs";
import { createHash } from "crypto";
import { resolve, dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE_ROOT = resolve(__dirname, "..");
const MAIN_ROOT = "/Users/halim/Documents/oulipo";

const DRY_RUN = process.argv.includes("--dry-run");

// Directories we mirror main -> worktree.
//
// IMAGES ONLY. We deliberately do NOT bridge HTML/CSS/JS or the page dirs.
// Halim's main repo is the freshest source for IMAGES HE DROPS, but it is
// usually BEHIND origin/main on CODE (the agent commits code from the
// worktree). Importing stale main-repo HTML would regress per-work pages
// and clobber recent work. So: pictures flow main -> worktree; code never
// does. (Halim 2026-06-01: a dry-run caught 18 stale index.html "updates"
// that would have wiped the featured-hero changes.)
const SCOPE = ["Assets/images"];

const SKIP_NAMES = new Set([
  ".DS_Store",
  ".git",
  "node_modules",
  ".next",
  ".claude",
]);

// Raw source / scratch files that live in image folders but are NOT meant to
// be served: screen recordings, HEIC originals, unprocessed CleanShot /
// Dropbox / Internet-Archive / Screenshot dumps. Convention: Halim renames
// the keeper to featured.* / image.* / a named gallery file; anything still
// carrying its capture-tool name is scratch. Skipping these keeps the repo
// from bloating with throwaway captures.
const JUNK_EXT = new Set([".mov", ".heic", ".mp4", ".avi"]);
const JUNK_PREFIXES = [
  "CleanShot ",
  "Image from Dropbox",
  "Image-from-Dropbox",
  "Screen Recording",
  "Screenshot ",
  "Internet Archive",
];
function isJunk(name) {
  const lower = name.toLowerCase();
  for (const ext of JUNK_EXT) if (lower.endsWith(ext)) return true;
  for (const p of JUNK_PREFIXES) if (name.startsWith(p)) return true;
  return false;
}

function hashFile(p) {
  try {
    return createHash("md5").update(readFileSync(p)).digest("hex");
  } catch {
    return null;
  }
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_NAMES.has(e.name)) continue;
    if (e.name.startsWith(".") && e.name !== ".gitkeep") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && !isJunk(e.name)) out.push(full);
  }
  return out;
}

let copied = 0;
let skipped = 0;
const changes = [];

for (const sub of SCOPE) {
  const mainDir = join(MAIN_ROOT, sub);
  try {
    statSync(mainDir);
  } catch {
    continue; // not present in main, skip
  }
  for (const mainFile of walk(mainDir)) {
    const rel = relative(MAIN_ROOT, mainFile);
    const wtFile = join(WORKTREE_ROOT, rel);
    const mainHash = hashFile(mainFile);
    const wtHash = hashFile(wtFile);
    if (mainHash && mainHash !== wtHash) {
      changes.push({ rel, status: wtHash ? "update" : "add" });
      if (!DRY_RUN) {
        mkdirSync(dirname(wtFile), { recursive: true });
        copyFileSync(mainFile, wtFile);
      }
      copied++;
    } else {
      skipped++;
    }
  }
}

if (changes.length === 0) {
  console.log(
    "Nothing to import. Worktree already matches main for scoped dirs.",
  );
} else {
  console.log(
    `${DRY_RUN ? "[dry-run] would import" : "Imported"} ${copied} file(s):\n`,
  );
  for (const c of changes) console.log(`  ${c.status.padEnd(6)} ${c.rel}`);
  console.log(`\n(${skipped} already in sync.)`);
  if (!DRY_RUN) {
    console.log(
      "\nNext: node scripts/sync-featured-images.mjs  (refresh cover_image)",
    );
    console.log("Then: review + commit + push.");
  }
}

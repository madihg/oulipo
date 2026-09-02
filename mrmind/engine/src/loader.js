// engine/src/loader.js
//
// Reads a NeuroServer `.vsr` project manifest and returns the ordered source
// list.  Node-only (it touches the filesystem); the browser build consumes the
// compiled bot.json instead, per engine/CONTRACT.md.
//
//   loadProject(vsrPath) -> { files: [{path, source}], manifest, missing[] }
//
// Sources cited inline:
//   [A] spec/A-lexical-and-structure.md §1.1, §10

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";

/** Parse a Windows INI-shaped .vsr into { SECTION: [key, ...] }. */
export function parseVsr(text) {
  const sections = Object.create(null);
  let current = null;
  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const head = /^\[(.+)\]$/.exec(line);
    if (head) {
      current = head[1].toUpperCase();
      sections[current] = sections[current] || [];
      continue;
    }
    if (!current) continue;
    // [A §10] every entry is `NAME=1`; no `=0` entry exists in any archive .vsr.
    const eq = line.lastIndexOf("=");
    const key = eq === -1 ? line : line.slice(0, eq);
    const val = eq === -1 ? "1" : line.slice(eq + 1).trim();
    sections[current].push({ key, enabled: val !== "0" });
  }
  return sections;
}

const dirCache = new Map();
function listDir(dir) {
  if (!dirCache.has(dir)) {
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch {
      entries = [];
    }
    dirCache.set(dir, entries);
  }
  return dirCache.get(dir);
}

/**
 * Resolve `segments` under `root`, matching each segment case-insensitively.
 * [A §10.1] The manifest was written on Windows: it contains both
 * `Customization\...` and `customization\...` for the same on-disk directory.
 */
function resolveCaseInsensitive(root, segments) {
  let cur = root;
  for (const seg of segments) {
    if (!seg || seg === ".") continue;
    const entries = listDir(cur);
    let hit = entries.find((e) => e === seg);
    if (hit === undefined) {
      const lower = seg.toLowerCase();
      hit = entries.find((e) => e.toLowerCase() === lower);
    }
    if (hit === undefined) return null;
    cur = join(cur, hit);
  }
  return cur;
}

/**
 * loadProject(vsrPath)
 *
 * Resolves the `[FILES]` list in manifest order.  Un-prefixed paths are
 * relative to the directory holding the .vsr; `LIBRARY:` re-roots at the shared
 * NeuroScript library directory ([A §10.1]).  Backslashes are path separators.
 *
 * Files are read as latin1 / windows-1252 and NOT as UTF-8 ([A §1.1]: three
 * 0xE9 bytes in MMIdentity.n make a UTF-8 read throw).  CRLF is left for the
 * lexer to normalise.
 *
 * Zero-byte files are refused loudly rather than treated as empty scripts
 * ([A §1.3], [A §13.8]).
 */
export function loadProject(vsrPath) {
  const vsr = resolve(vsrPath);
  const projectDir = dirname(vsr);
  // .../NeuroScript/Mrmind3/MRMIND3.vsr  ->  .../NeuroScript/Library
  const libraryRoot = join(dirname(projectDir), "Library");

  const manifest = parseVsr(readFileSync(vsr, "latin1"));
  const entries = (manifest.FILES || []).filter((e) => e.enabled);

  const files = [];
  const missing = [];

  for (const entry of entries) {
    const raw = entry.key;
    let root = projectDir;
    let rest = raw;
    const colon = raw.indexOf(":");
    if (colon > 0) {
      const prefix = raw.slice(0, colon).toUpperCase();
      if (prefix === "LIBRARY") {
        root = libraryRoot;
        rest = raw.slice(colon + 1);
      }
    }
    const segments = rest.split(/[\\/]+/).filter(Boolean);
    const full = resolveCaseInsensitive(root, segments);
    if (!full) {
      missing.push({ entry: raw, reason: "not found on disk" });
      continue;
    }

    const size = statSync(full).size;
    if (size === 0) {
      // [A §1.3] four .n files in the tree are zero bytes; none is in this
      // build, and a loader must refuse them rather than silently produce
      // "a script with no topics".
      missing.push({ entry: raw, reason: "zero-byte file (damaged archive)" });
      continue;
    }
    files.push({
      path: raw.replace(/\\/g, "/"),
      absPath: full,
      name: basename(full),
      source: readFileSync(full, "latin1"),
    });
  }

  return { files, manifest, missing, projectDir, libraryRoot };
}

/**
 * Read the .tlx spelling lexicons for src/spellcheck.js, in load order.
 *
 * The originals live in the archive beside the bot they belong to:
 *
 *   Program/Ssceam.tlx           the vendor common-word list
 *   Program/Additions.tlx        the vendor additions + the auto-change table
 *   Mrmind3/MRMIND3.tlx          Peggy Weil's project vocabulary
 *   Mrmind3/MRMIND3.script.tlx   the given-name lexicon
 *
 * `#LID`-headed word lists are Latin-1, like every other archive file.
 *
 * @param {string[]} paths
 * @returns {{name: string, text: string}[]}  input for buildLexicon
 */
export function loadLexiconSources(paths) {
  const out = [];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    out.push({ name: basename(p), text: readFileSync(p, "latin1") });
  }
  return out;
}

export default loadProject;

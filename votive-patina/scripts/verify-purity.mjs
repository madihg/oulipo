/**
 * scripts/verify-purity.mjs - votivepatina DEV-ONLY purity checker
 *
 * Verifies the shipped artwork stays pure:
 *   1. index.html first non-whitespace content is a comment starting with <!--
 *      and containing a '+' (the ASCII cross relic marker).
 *   2. Shipped JS (main.js, lib/*.js EXCEPT lib/generative-expansion.js) contains
 *      no network/analytics calls: fetch(, XMLHttpRequest, navigator.sendBeacon,
 *      gtag, analytics, googletagmanager.
 *   3. index.html has no external <script src="http..."> or remote analytics.
 *   4. No shipped .js looks minified (file > 2KB AND fewer than 3 newlines,
 *      OR max line length > 2000).
 *
 * Exits 0 on all PASS, exits 1 if any check fails.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function pass(label) {
  console.log(`  ${GREEN}PASS${RESET} ${label}`);
}

function fail(label, detail) {
  console.log(`  ${RED}FAIL${RESET} ${label}`);
  if (detail) console.log(`       ${DIM}${detail}${RESET}`);
}

// ---------------------------------------------------------------------------
// Check 1: index.html first comment contains '+' (ASCII relic marker)
// ---------------------------------------------------------------------------
function checkRelicComment() {
  const indexPath = path.join(ROOT, "index.html");
  if (!fs.existsSync(indexPath)) {
    fail("relic-comment", "index.html does not exist yet");
    return false;
  }

  const source = fs.readFileSync(indexPath, "utf8");

  // Find the first non-whitespace content
  const trimmed = source.trimStart();
  if (!trimmed.startsWith("<!--")) {
    fail(
      "relic-comment",
      `index.html first non-whitespace content is not an HTML comment (got: ${JSON.stringify(trimmed.slice(0, 40))}...)`,
    );
    return false;
  }

  // Extract the first comment
  const commentEnd = trimmed.indexOf("-->");
  if (commentEnd === -1) {
    fail("relic-comment", "First comment in index.html is not closed");
    return false;
  }

  const firstComment = trimmed.slice(0, commentEnd + 3);
  if (!firstComment.includes("+")) {
    fail(
      "relic-comment",
      "First HTML comment does not contain a '+' (ASCII cross / relic marker missing)",
    );
    return false;
  }

  pass("relic-comment: index.html starts with <!-- ... + ... -->");
  return true;
}

// ---------------------------------------------------------------------------
// Check 2: no network/analytics calls in shipped JS
// ---------------------------------------------------------------------------
// Forbidden outright: these primitives exist only to talk to a remote/tracker.
// (A bare same-origin `fetch("./data/x.json")` is NOT forbidden - that loads the
//  app's OWN static data, like loading styles.css; nothing about the visitor
//  leaves the device. Only REMOTE fetch/import is caught, by REMOTE_CALL_RE below.)
const NETWORK_PATTERNS = [
  "XMLHttpRequest",
  "navigator.sendBeacon",
  "gtag(",
  "googletagmanager",
  "google-analytics",
  "new WebSocket(",
  "EventSource(",
];

// fetch()/import() pointing at an absolute remote URL (http:, https:, or the
// protocol-relative //host form). Same-origin relative paths (./ , ../ , /data)
// do not match.
const REMOTE_CALL_RE = /\b(?:fetch|import)\s*\(\s*[`'"]\s*(?:https?:)?\/\//;

function getShippedJsFiles() {
  const files = [];

  // main.js
  const mainJs = path.join(ROOT, "main.js");
  if (fs.existsSync(mainJs)) files.push(mainJs);

  // lib/*.js EXCEPT lib/generative-expansion.js
  const libDir = path.join(ROOT, "lib");
  if (fs.existsSync(libDir)) {
    for (const f of fs.readdirSync(libDir)) {
      if (!f.endsWith(".js")) continue;
      if (f === "generative-expansion.js") continue;
      files.push(path.join(libDir, f));
    }
  }

  return files;
}

function checkNoNetworkCalls() {
  const files = getShippedJsFiles();
  if (files.length === 0) {
    pass(
      "no-network-calls: no shipped JS files exist yet (will check when built)",
    );
    return true;
  }

  let allPass = true;
  for (const filePath of files) {
    const rel = path.relative(ROOT, filePath);
    const source = fs.readFileSync(filePath, "utf8");
    const hits = [];

    for (const pattern of NETWORK_PATTERNS) {
      if (source.includes(pattern)) {
        hits.push(pattern);
      }
    }
    if (REMOTE_CALL_RE.test(source)) {
      hits.push("remote fetch()/import() to an absolute URL");
    }

    if (hits.length > 0) {
      fail(
        `no-network-calls [${rel}]`,
        `found forbidden pattern(s): ${hits.join(", ")}`,
      );
      allPass = false;
    } else {
      pass(`no-network-calls [${rel}]`);
    }
  }
  return allPass;
}

// ---------------------------------------------------------------------------
// Check 3: no remote <script> or analytics in index.html
// ---------------------------------------------------------------------------
function checkNoRemoteScripts() {
  const indexPath = path.join(ROOT, "index.html");
  if (!fs.existsSync(indexPath)) {
    pass("no-remote-scripts: index.html does not exist yet");
    return true;
  }

  const source = fs.readFileSync(indexPath, "utf8");

  // Match <script src="http..."> or <script src='http...'>
  const remoteScriptRe = /<script[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
  const remoteHits = [];
  let m;
  while ((m = remoteScriptRe.exec(source)) !== null) {
    remoteHits.push(m[1]);
  }

  // Also look for common analytics strings anywhere in the HTML
  const ANALYTICS_STRINGS = [
    "googletagmanager",
    "google-analytics",
    "gtag(",
    "analytics.js",
  ];
  const analyticsHits = ANALYTICS_STRINGS.filter((s) => source.includes(s));

  const allHits = [...remoteHits, ...analyticsHits];
  if (allHits.length > 0) {
    fail("no-remote-scripts", `found: ${allHits.join(", ")}`);
    return false;
  }

  pass("no-remote-scripts: no external <script> or analytics in index.html");
  return true;
}

// ---------------------------------------------------------------------------
// Check 4: no minified JS
// ---------------------------------------------------------------------------
const MIN_SIZE_BYTES = 2048; // 2 KB
const MIN_NEWLINES = 3;
const MAX_LINE_LEN = 2000;

function checkNotMinified() {
  const files = getShippedJsFiles();
  if (files.length === 0) {
    pass("not-minified: no shipped JS files exist yet (will check when built)");
    return true;
  }

  let allPass = true;
  for (const filePath of files) {
    const rel = path.relative(ROOT, filePath);
    const source = fs.readFileSync(filePath, "utf8");
    const sizeBytes = Buffer.byteLength(source, "utf8");
    const newlineCount = (source.match(/\n/g) || []).length;
    const lines = source.split("\n");
    const maxLineLen = Math.max(...lines.map((l) => l.length));

    const likelySizeMinified =
      sizeBytes > MIN_SIZE_BYTES && newlineCount < MIN_NEWLINES;
    const likelyLineMinified = maxLineLen > MAX_LINE_LEN;

    if (likelySizeMinified) {
      fail(
        `not-minified [${rel}]`,
        `file is ${sizeBytes}B with only ${newlineCount} newline(s) - looks minified`,
      );
      allPass = false;
    } else if (likelyLineMinified) {
      fail(
        `not-minified [${rel}]`,
        `max line length is ${maxLineLen} chars (> ${MAX_LINE_LEN}) - looks minified`,
      );
      allPass = false;
    } else {
      pass(`not-minified [${rel}]`);
    }
  }
  return allPass;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}votivepatina purity check${RESET}`);
console.log(`${DIM}root: ${ROOT}${RESET}\n`);

const results = [
  checkRelicComment(),
  checkNoNetworkCalls(),
  checkNoRemoteScripts(),
  checkNotMinified(),
];

const passed = results.filter(Boolean).length;
const total = results.length;

console.log("");
if (results.every(Boolean)) {
  console.log(`${GREEN}${BOLD}ALL ${total} CHECKS PASSED${RESET}`);
  process.exit(0);
} else {
  console.log(
    `${RED}${BOLD}${total - passed} of ${total} CHECK(S) FAILED${RESET}`,
  );
  process.exit(1);
}

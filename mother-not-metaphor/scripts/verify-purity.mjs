/**
 * scripts/verify-purity.mjs - mother-not-metaphor DEV-ONLY purity checker
 *
 * This piece needs live hand tracking, so unlike the strictly-offline pieces
 * (mother-patina, votive-patina) it loads ONE external dependency: the MediaPipe
 * Hand Landmarker bundle + model. Everything else stays clean. This guards that
 * boundary:
 *   1. index.html opens with an HTML comment containing the relic marker '+'.
 *   2. Shipped JS (src/**.js) has NO analytics/trackers (gtag, beacons, GA, ...).
 *   3. The ONLY remote references allowed are the MediaPipe CDN + model host.
 *      Any other remote fetch/import/from is a failure.
 *   4. No shipped .js looks minified.
 *
 * Exit 0 on all PASS, exit 1 otherwise.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const G = "\x1b[32m",
  R = "\x1b[31m",
  B = "\x1b[1m",
  D = "\x1b[2m",
  X = "\x1b[0m";
const pass = (l) => console.log(`  ${G}PASS${X} ${l}`);
const fail = (l, d) => {
  console.log(`  ${R}FAIL${X} ${l}`);
  if (d) console.log(`       ${D}${d}${X}`);
};

// Surveillance / analytics patterns are NEVER allowed anywhere.
const TRACKER_PATTERNS = [
  "XMLHttpRequest",
  "navigator.sendBeacon",
  "gtag(",
  "googletagmanager",
  "google-analytics",
  "new WebSocket(",
  "EventSource(",
  "fbq(",
  "mixpanel",
  "segment.com",
];

// Hosts the piece is allowed to reach (the hand-tracking model + its runtime).
const ALLOWED_HOSTS = [
  "cdn.jsdelivr.net/npm/@mediapipe/tasks-vision",
  "storage.googleapis.com/mediapipe-models/hand_landmarker",
];

// any remote reference: fetch(...)/import(...)/from "..." pointing at http(s):// or //host
const REMOTE_REF_RE =
  /(?:\b(?:fetch|import)\s*\(\s*|\bfrom\s+)[`'"]\s*((?:https?:)?\/\/[^`'"\s)]+)/gi;

function shippedJs() {
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walk(fp);
      else if (e.name.endsWith(".js")) files.push(fp);
    }
  };
  walk(path.join(ROOT, "src"));
  return files;
}

function checkRelic() {
  const p = path.join(ROOT, "index.html");
  if (!fs.existsSync(p))
    return (fail("relic-comment", "index.html missing"), false);
  const t = fs.readFileSync(p, "utf8").trimStart();
  if (!t.startsWith("<!--"))
    return (fail("relic-comment", "no leading comment"), false);
  const end = t.indexOf("-->");
  if (end === -1 || !t.slice(0, end).includes("+"))
    return (fail("relic-comment", "first comment lacks '+'"), false);
  return (
    pass("relic-comment: index.html opens with <!-- ... + ... -->"),
    true
  );
}

function checkNoTrackers() {
  const files = shippedJs();
  if (!files.length) return (pass("no-trackers: no shipped JS yet"), true);
  let ok = true;
  for (const fp of files) {
    const rel = path.relative(ROOT, fp);
    const src = fs.readFileSync(fp, "utf8");
    const hits = TRACKER_PATTERNS.filter((p) => src.includes(p));
    if (hits.length)
      (fail(`no-trackers [${rel}]`, hits.join(", ")), (ok = false));
    else pass(`no-trackers [${rel}]`);
  }
  return ok;
}

function checkRemoteAllowlist() {
  const files = shippedJs();
  if (!files.length) return (pass("remote-allowlist: no shipped JS yet"), true);
  let ok = true;
  for (const fp of files) {
    const rel = path.relative(ROOT, fp);
    const src = fs.readFileSync(fp, "utf8");
    const bad = [];
    for (const m of src.matchAll(REMOTE_REF_RE)) {
      const url = m[1].replace(/^https?:/, "").replace(/^\/\//, "");
      if (!ALLOWED_HOSTS.some((h) => url.startsWith(h))) bad.push(m[1]);
    }
    if (bad.length)
      (fail(`remote-allowlist [${rel}]`, bad.join(", ")), (ok = false));
    else pass(`remote-allowlist [${rel}]`);
  }
  return ok;
}

function checkNotMinified() {
  const files = shippedJs();
  if (!files.length) return (pass("not-minified: no shipped JS yet"), true);
  let ok = true;
  for (const fp of files) {
    const rel = path.relative(ROOT, fp);
    const src = fs.readFileSync(fp, "utf8");
    const bytes = Buffer.byteLength(src, "utf8");
    const nl = (src.match(/\n/g) || []).length;
    const maxLine = Math.max(...src.split("\n").map((l) => l.length));
    if ((bytes > 2048 && nl < 3) || maxLine > 2000)
      (fail(
        `not-minified [${rel}]`,
        `looks minified (${bytes}B, maxline ${maxLine})`,
      ),
        (ok = false));
    else pass(`not-minified [${rel}]`);
  }
  return ok;
}

console.log(`\n${B}mother-not-metaphor purity check${X}`);
console.log(`${D}root: ${ROOT}${X}\n`);
const results = [
  checkRelic(),
  checkNoTrackers(),
  checkRemoteAllowlist(),
  checkNotMinified(),
];
console.log("");
if (results.every(Boolean)) {
  console.log(`${G}${B}ALL ${results.length} CHECKS PASSED${X}`);
  process.exit(0);
}
console.log(`${R}${B}${results.filter((r) => !r).length} CHECK(S) FAILED${X}`);
process.exit(1);

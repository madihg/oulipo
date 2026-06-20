/**
 * scripts/verify-purity.mjs - mother-patina DEV-ONLY purity checker
 *
 * mother-patina is fully offline: it fetches only its OWN static data and makes NO
 * network calls. This guards that boundary:
 *   1. index.html opens with an HTML comment containing the relic marker '+'.
 *   2. Shipped JS (chat.js + lib/*.js) has no network/analytics and no remote
 *      fetch()/import() (a same-origin relative fetch of the app's own data is fine).
 *   3. No shipped .js looks minified.
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

const NETWORK_PATTERNS = [
  "XMLHttpRequest",
  "navigator.sendBeacon",
  "gtag(",
  "googletagmanager",
  "google-analytics",
  "new WebSocket(",
  "EventSource(",
];
// any remote reference (fetch/import/from "http(s)://" or "//host"); same-origin
// relative paths (./ ../ /data) never match. mother-patina allows NONE.
const REMOTE_REF_RE =
  /(?:\b(?:fetch|import)\s*\(\s*|\bfrom\s+)[`'"]\s*(?:https?:)?\/\//i;

function shippedJs() {
  const files = [];
  const chat = path.join(ROOT, "chat.js");
  if (fs.existsSync(chat)) files.push(chat);
  const libDir = path.join(ROOT, "lib");
  if (fs.existsSync(libDir)) {
    for (const f of fs.readdirSync(libDir)) {
      if (f.endsWith(".js")) files.push(path.join(libDir, f));
    }
  }
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

function checkNoNetwork() {
  const files = shippedJs();
  if (!files.length) return (pass("no-network-calls: no shipped JS yet"), true);
  let ok = true;
  for (const fp of files) {
    const rel = path.relative(ROOT, fp);
    const src = fs.readFileSync(fp, "utf8");
    const hits = NETWORK_PATTERNS.filter((p) => src.includes(p));
    if (REMOTE_REF_RE.test(src)) hits.push("remote fetch/import/from");
    if (hits.length)
      (fail(`no-network-calls [${rel}]`, hits.join(", ")), (ok = false));
    else pass(`no-network-calls [${rel}]`);
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

console.log(`\n${B}mother-patina purity check${X}`);
console.log(`${D}root: ${ROOT}${X}\n`);
const results = [checkRelic(), checkNoNetwork(), checkNotMinified()];
console.log("");
if (results.every(Boolean)) {
  console.log(`${G}${B}ALL ${results.length} CHECKS PASSED${X}`);
  process.exit(0);
}
console.log(`${R}${B}${results.filter((r) => !r).length} CHECK(S) FAILED${X}`);
process.exit(1);

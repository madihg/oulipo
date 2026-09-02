// engine/test/spell-reach.mjs — how much of the recorded input the corrector
// touches, with no engine in the loop.  Counts only; no user text is printed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildLexicon, makeSpellChecker, knownWithAffix } from "../src/spellcheck.js";
import { loadLexiconSources } from "../src/loader.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.env.MRMIND_REPO || path.resolve(HERE, "..", "..");
const CDB = path.join(REPO, "_work", "cdb", "mrmind3");
const DATA = path.resolve(HERE, "..", "data");

function parseCsv(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); cur = ""; rows.push(row); row = []; }
    else if (c !== "\r") cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const rows = parseCsv(fs.readFileSync(path.join(CDB, "ConversationData.csv"), "latin1")).slice(1);
const inputs = rows.filter((r) => r[2] === "7").map((r) => r[10]);
const program = JSON.parse(fs.readFileSync(path.join(REPO, "bot.json"), "utf8"));
const sources = loadLexiconSources(
  ["Ssceam.tlx", "Additions.tlx", "MRMIND3.tlx", "MRMIND3.script.tlx"].map((f) => path.join(DATA, f)),
);
const DICT = process.env.MRMIND_DICT || "/usr/share/dict/words";
const dictWords = fs.existsSync(DICT) ? fs.readFileSync(DICT, "latin1").split("\n") : [];
const lex = buildLexicon({ tlxSources: sources, dictWords, program });

const cfgs = {
  "A auto-change only": { maxDist: 0, longWordDist: 0 },
  "B ED1": { maxDist: 1, longWordDist: 1 },
  "C ED1+freq": { maxDist: 1, longWordDist: 1, tiebreak: "freq" },
  "D ED1/ED2>6": { maxDist: 1, longWordDist: 2, tiebreak: "freq" },
  "F bot vocab only": { maxDist: 1, longWordDist: 1, tiebreak: "freq", suggestTiers: 0 },
  "I minLength 3": { maxDist: 1, longWordDist: 1, tiebreak: "freq", minLength: 3 },
  "K Sentry-like": { maxDist: 1, longWordDist: 1, tiebreak: "freq", minLength: 3, suggestTiers: 2, onAmbiguity: "take" },
};
console.log(`inputs ${inputs.length}; lexicon ${lex.tier.size}; auto-change ${lex.autoChange.size}`);
for (const [k, o] of Object.entries(cfgs)) {
  const sc = makeSpellChecker(lex, o);
  let ch = 0, edits = 0;
  const pairs = new Set();
  for (const t of inputs) {
    const r = sc(t);
    if (r === t) continue;
    ch++;
    const a = t.split(/\s+/), b = r.split(/\s+/);
    for (let i = 0; i < Math.min(a.length, b.length); i++)
      if (a[i] !== b[i]) { edits++; pairs.add(a[i].toLowerCase() + ">" + b[i].toLowerCase()); }
  }
  console.log(
    `${k.padEnd(20)} inputs changed ${String(ch).padStart(5)} (${((100 * ch) / inputs.length).toFixed(2)}%)  word edits ${String(edits).padStart(5)}  distinct rewrites ${pairs.size}`,
  );
}

// How many input words are unknown at all?  That is the CEILING on what any
// corrector, however aggressive, can reach.
{
  const RE = /[\p{L}][\p{L}\p{N}]*(?:['\u2019][\p{L}\p{N}]+)*/gu;
  let words = 0, unknown = 0, unknownLong = 0;
  const unknownSet = new Set();
  for (const t of inputs) {
    RE.lastIndex = 0;
    let m;
    while ((m = RE.exec(t)) !== null) {
      words++;
      const w = m[0].toLowerCase();
      if (/\d/.test(w)) continue;
      if (knownWithAffix(lex.tier, w)) continue;
      unknown++;
      unknownSet.add(w);
      if (w.length >= 4) unknownLong++;
    }
  }
  console.log(
    `\ntotal input words ${words}; unknown to the lexicon ${unknown} ` +
      `(${((100 * unknown) / words).toFixed(2)}%), ${unknownSet.size} distinct; ` +
      `of those, 4 letters or more: ${unknownLong}`,
  );
  const inputsWithUnknown = inputs.filter((t) => {
    RE.lastIndex = 0;
    let m;
    while ((m = RE.exec(t)) !== null) {
      const w = m[0].toLowerCase();
      if (!/\d/.test(w) && !knownWithAffix(lex.tier, w)) return true;
    }
    return false;
  }).length;
  console.log(
    `inputs containing at least one unknown word: ${inputsWithUnknown} ` +
      `(${((100 * inputsWithUnknown) / inputs.length).toFixed(2)}%) — the ceiling for ANY corrector`,
  );
}

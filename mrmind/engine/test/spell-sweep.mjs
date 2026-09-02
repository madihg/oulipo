// engine/test/spell-sweep.mjs
//
// Replays the shipped conversation database once per spell-corrector variant
// and reports the default-only rate and the same-topic rate for each.
// Measurement only: nothing here tunes an engine constant, and no corpus row is
// named, quoted or special-cased.
//
//   node engine/test/spell-sweep.mjs [turnLimit]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Bot } from "../src/index.js";
import { buildLexicon, makeSpellChecker } from "../src/spellcheck.js";
import { loadLexiconSources } from "../src/loader.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.env.MRMIND_REPO || path.resolve(HERE, "..", "..");
const CDB = path.join(REPO, "_work", "cdb", "mrmind3");
const DATA = path.resolve(HERE, "..", "data");

function parseCsv(text) {
  const rows = [];
  let row = [], cur = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else quoted = false; }
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); cur = ""; rows.push(row); row = []; }
    else if (c !== "\r") cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const LIMIT = Number(process.argv[2] || Infinity);

const topicName = new Map();
for (const r of parseCsv(fs.readFileSync(path.join(CDB, "Topics.csv"), "latin1")).slice(1))
  topicName.set(r[0], r[1]);
const rows = parseCsv(fs.readFileSync(path.join(CDB, "ConversationData.csv"), "latin1")).slice(1);
const repliesFor = new Map();
for (const r of rows) {
  if (r[2] !== "9") continue;
  const key = r[1] + "/" + r[5];
  if (!repliesFor.has(key)) repliesFor.set(key, []);
  repliesFor.get(key).push({ topic: topicName.get(r[3]) || "?", text: r[10] });
}
const byConnection = new Map();
for (const r of rows) {
  if (r[2] !== "7") continue;
  if (!byConnection.has(r[1])) byConnection.set(r[1], []);
  byConnection.get(r[1]).push({ id: r[0], text: r[10] });
}
const connections = [...byConnection.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));

const program = JSON.parse(fs.readFileSync(path.join(REPO, "bot.json"), "utf8"));

const TLX = [
  path.join(DATA, "Ssceam.tlx"),
  path.join(DATA, "Additions.tlx"),
  path.join(DATA, "MRMIND3.tlx"),
  path.join(DATA, "MRMIND3.script.tlx"),
];
// A general English word list stands in for the compiled Ssceam2.clx, which
// survives only as a binary prefix-trie.  Used ONLY as the "is this already a
// word" filter, never as a suggestion source (see src/spellcheck.js).
const DICT = process.env.MRMIND_DICT || "/usr/share/dict/words";
const DICT_WORDS = fs.existsSync(DICT)
  ? fs.readFileSync(DICT, "latin1").split("\n")
  : [];

const sources = loadLexiconSources(TLX);
const lex = buildLexicon({ tlxSources: sources, dictWords: DICT_WORDS, program });
const lexNoDict = buildLexicon({ tlxSources: sources, dictWords: null, program });

const variants = [
  ["identity (baseline)", null],
  ["A: auto-change table only", () => makeSpellChecker(lex, { maxDist: 0, longWordDist: 0 })],
  ["B: ED1, no tiebreak", () => makeSpellChecker(lex, { maxDist: 1, longWordDist: 1 })],
  ["C: ED1 + frequency tiebreak", () => makeSpellChecker(lex, { maxDist: 1, longWordDist: 1, tiebreak: "freq" })],
  ["D: ED1, ED2 for len>6, freq", () => makeSpellChecker(lex, { maxDist: 1, longWordDist: 2, tiebreak: "freq" })],
  ["E: C + no auto-change", () => makeSpellChecker(lex, { maxDist: 1, longWordDist: 1, tiebreak: "freq", autoChange: false })],
  ["F: C, bot vocabulary only", () => makeSpellChecker(lex, { maxDist: 1, longWordDist: 1, tiebreak: "freq", suggestTiers: 0 })],
  ["G: C, suggest from full dict", () => makeSpellChecker(lex, { maxDist: 1, longWordDist: 1, tiebreak: "freq", suggestTiers: 2 })],
  ["H: C, no general dictionary", () => makeSpellChecker(lexNoDict, { maxDist: 1, longWordDist: 1, tiebreak: "freq" })],
  ["I: C + 3-letter words too", () => makeSpellChecker(lex, { maxDist: 1, longWordDist: 1, tiebreak: "freq", minLength: 3 })],
  ["J: D + 3-letter words too", () => makeSpellChecker(lex, { maxDist: 1, longWordDist: 2, tiebreak: "freq", minLength: 3 })],
  // K is the closest thing to what Sentry actually did: a general-English
  // suggestion set, three-letter words included, and no hesitation when two
  // candidates tie (Tutorial4:77-78, "Herms" -> "hems").
  ["K: aggressive, Sentry-like", () => makeSpellChecker(lex, { maxDist: 1, longWordDist: 1, tiebreak: "freq", minLength: 3, suggestTiers: 2, onAmbiguity: "take" })],
];

const only = process.env.SPELL_ONLY ? new Set(process.env.SPELL_ONLY.split(",")) : null;

console.log(`bot: ${program.categories.length} categories; lexicon ${lex.tier.size} words, ${lex.autoChange.size} auto-change entries`);
console.log(`| variant | default-only | same topic | exact line | changed inputs |`);
console.log(`| --- | ---: | ---: | ---: | ---: |`);

for (const [name, mk] of variants) {
  if (only && !only.has(name[0])) continue;
  const t0 = Date.now();
  const sc = mk ? mk() : null;
  let turns = 0, defaultOnly = 0, withReply = 0, sameTopic = 0, sameLine = 0, warnings = 0, changed = 0;
  outer: for (const [cid, inputs] of connections) {
    const bot = new Bot(program, { random: seeded(Number(cid) + 1), ...(sc ? { spellcheck: sc } : {}) });
    bot.start();
    for (const inp of inputs) {
      if (sc && sc(inp.text) !== inp.text) changed++;
      const before = bot.trace.length;
      const out = bot.input(inp.text);
      const fired = bot.trace.slice(before);
      turns++;
      if (fired.length && fired.every((t) => t.type === "default")) defaultOnly++;
      const recorded = repliesFor.get(cid + "/" + inp.id);
      if (recorded && recorded.length) {
        withReply++;
        const names = new Set(recorded.map((r) => r.topic));
        const texts = new Set(recorded.map((r) => r.text));
        if (fired.some((t) => names.has(t.topic))) sameTopic++;
        if (out.some((l) => texts.has(l))) sameLine++;
      }
      if (turns >= LIMIT) break outer;
    }
    warnings += bot.warnings.length;
  }
  const pct = (a, b) => ((100 * a) / b).toFixed(2) + "%";
  console.log(`| ${name} | ${pct(defaultOnly, turns)} | ${pct(sameTopic, withReply)} | ${pct(sameLine, withReply)} | ${changed} (${pct(changed, turns)}) |  ${((Date.now()-t0)/1000).toFixed(0)}s`);
  if (warnings) console.log(`  (warnings: ${warnings})`);
}

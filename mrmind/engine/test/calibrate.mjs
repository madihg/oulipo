// engine/test/calibrate.mjs
//
// Replays the shipped conversation database through the engine and reports how
// close it lands. This is a MEASUREMENT, not a pass/fail test: the recorded
// conversations were logged against a later build than MRMIND3.vsr, and
// Compute SpellCheck is not reproducible, so 100 per cent is neither the target
// nor achievable (engine/CONTRACT.md, "Conformance harness").
//
//   node engine/test/calibrate.mjs [turnLimit]
//
// It reports:
//   - the default-response rate, against the archive's own 25.68% / 26.76%
//     (spec/E-topics-focus-and-selection.md section 10.1)
//   - how often the same topic fired as in the recording
//   - how often the exact same line came out
//
// It must never be used to tune the engine by special-casing corpus rows.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBotJson } from "../build/compile.mjs";
import { Bot } from "../src/index.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CDB = path.resolve(HERE, "..", "..", "_work", "cdb", "mrmind3");

/** Minimal RFC-4180 CSV reader; the export uses "" for an embedded quote. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
    } else if (c !== "\r") cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const LIMIT = Number(process.argv[2] || Infinity);

if (!fs.existsSync(path.join(CDB, "ConversationData.csv"))) {
  console.error(
    `no conversation database at ${CDB} — nothing to calibrate against`,
  );
  process.exit(2);
}

// nTOPIC_ID -> topic name. Topics.csv accumulates every rebuild between Dec 2000
// and Apr 2001, so names are usable and line numbers are not (spec/E 14.1).
const topicName = new Map();
for (const r of parseCsv(
  fs.readFileSync(path.join(CDB, "Topics.csv"), "latin1"),
).slice(1))
  topicName.set(r[0], r[1]);

const rows = parseCsv(
  fs.readFileSync(path.join(CDB, "ConversationData.csv"), "latin1"),
).slice(1);

// Statement types: 7 = USER_SAID, 9 = SAY. Group replies by the input that
// produced them (nINPUT_LINE_ID) — that is one turn (spec/E section 10).
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
const connections = [...byConnection.entries()].sort(
  (a, b) => Number(a[0]) - Number(b[0]),
);

const { program, stats } = buildBotJson();
console.log(
  `bot: ${stats.categories} categories, ${stats.blocks} blocks, ` +
    `${stats.exampleStatements} Example statements, ${stats.corpusWords} corpus words`,
);

let turns = 0;
let answered = 0;
let withReply = 0;
let defaultOnly = 0;
let sameTopic = 0;
let sameLine = 0;
let warnings = 0;
const started = Date.now();

outer: for (const [cid, inputs] of connections) {
  // One fresh user record per recorded connection, seeded from its id so the
  // run is reproducible.
  const bot = new Bot(program, { random: seeded(Number(cid) + 1) });
  bot.start();
  for (const inp of inputs) {
    const before = bot.trace.length;
    const out = bot.input(inp.text);
    const fired = bot.trace.slice(before);
    turns++;
    if (out.length) answered++;
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
const ms = Date.now() - started;
console.log(
  `\nreplayed ${turns} recorded inputs from ${connections.length} connections`,
);
console.log(`  produced output          ${answered} (${pct(answered, turns)})`);
console.log(
  `  default-only answers     ${defaultOnly} (${pct(defaultOnly, turns)})   [archive: 26.76%]`,
);
console.log(`  turns with a recorded reply ${withReply}`);
console.log(
  `  same topic fired         ${sameTopic} (${pct(sameTopic, withReply)})`,
);
console.log(
  `  exact same line          ${sameLine} (${pct(sameLine, withReply)})`,
);
console.log(`  runtime warnings         ${warnings}`);
console.log(`  ${ms} ms (${(ms / turns).toFixed(1)} ms/turn)`);

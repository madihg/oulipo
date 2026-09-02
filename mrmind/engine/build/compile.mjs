#!/usr/bin/env node
// engine/build/compile.mjs
//
// CLI: read MRMIND3.vsr, load the 49 sources it lists (windows-1252, CRLF),
// parse them into one Program, build the Example word-frequency corpus, and
// write bot.json — everything the browser needs and nothing else.
//
//   node engine/build/compile.mjs [--vsr <path>] [--out <path>] [--quiet]
//
// No absolute filesystem path is written into bot.json: every `file` field is
// the manifest-relative path (e.g. "Utilities/WebNameGreet.n",
// "LIBRARY:StdQuestion/combis/QuesResDebug.us.n").

import { writeFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProject } from "../src/loader.js";
import { compile } from "../src/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");

export const DEFAULT_VSR = join(
  REPO,
  "archive",
  "1_NeuroServer_fromVaio_MrMind",
  "NeuroScript",
  "Mrmind3",
  "MRMIND3.vsr",
);
export const DEFAULT_OUT = join(REPO, "bot.json");

/**
 * buildBotJson(vsrPath) -> { json, stats, missing, warnings }
 * Exported so the tests can build the real bot without shelling out.
 */
export function buildBotJson(vsrPath = DEFAULT_VSR) {
  const project = loadProject(vsrPath);
  const files = project.files.map((f) => ({ path: f.path, source: f.source }));
  const { program, stats } = compile(files);

  const json = {
    format: "mrmind-bot/1",
    // The build these sources came from, named without a filesystem path.
    build: "MRMIND3",
    generated: new Date().toISOString().slice(0, 10),
    sources: project.files.map((f) => f.path),
    definitions: program.definitions,
    categories: program.categories,
    attributes: program.attributes,
    otherExamples: program.otherExamples,
    subjectInfo: program.subjectInfo,
    parseWarnings: program.parseWarnings,
    stats,
  };
  return { json, stats, missing: project.missing, program };
}

function main(argv) {
  let vsr = DEFAULT_VSR;
  let out = DEFAULT_OUT;
  let quiet = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--vsr") vsr = resolve(argv[++i]);
    else if (argv[i] === "--out") out = resolve(argv[++i]);
    else if (argv[i] === "--quiet") quiet = true;
  }

  const { json, stats, missing } = buildBotJson(vsr);
  mkdirSync(dirname(out), { recursive: true });
  const text = JSON.stringify(json);
  writeFileSync(out, text, "utf8");
  const bytes = statSync(out).size;

  if (!quiet) {
    const kb = (bytes / 1024).toFixed(1);
    console.log(`bot.json written: ${out}`);
    console.log(`  size            ${bytes} bytes (${kb} KiB)`);
    console.log(`  files           ${stats.files}`);
    console.log(
      `  categories      ${stats.categories} ` +
        `(standard ${stats.categoriesByType.standard}, priority ${stats.categoriesByType.priority}, ` +
        `default ${stats.categoriesByType.default}, sequence ${stats.categoriesByType.sequence})`,
    );
    console.log(`  blocks          ${stats.blocks}`);
    console.log(`  definitions     ${stats.definitions}`);
    console.log(`  attributes      ${stats.attributes}`);
    console.log(`  OtherExamples   ${stats.otherExamples}`);
    console.log(
      `  Example corpus  ${stats.exampleStatements} statements, ` +
        `${stats.corpusWords} words, ${stats.distinctWords} distinct`,
    );
    console.log(`  unknown cmds    ${stats.unknownCommands}`);
    console.log(`  parse warnings  ${stats.parseWarnings}`);
    if (missing.length) {
      console.log(`  MISSING SOURCES ${missing.length}`);
      for (const m of missing) console.log(`    ${m.entry}: ${m.reason}`);
    }
  }
  return bytes;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  main(process.argv.slice(2));
}

export default buildBotJson;

// engine/src/index.js
//
// Public surface of the MrMind engine (engine/CONTRACT.md): Bot, parseProgram,
// compile.  Everything here is browser-safe — nothing touches the filesystem.
// The Node-only manifest reader lives in src/loader.js and the CLI in
// build/compile.mjs.

export { tokenize } from "./lexer.js";
export { parse, parseProgram } from "./parser.js";
export {
  tokenizeInput,
  compilePattern,
  matchPattern,
  test as testPattern,
} from "./pattern.js";
export {
  buildFrequencyTable,
  conditionSpecificity,
  buildPatternIndex,
} from "./specificity.js";
export { Bot } from "./runtime.js";

import { parseProgram } from "./parser.js";
import { buildFrequencyTable, buildPatternIndex } from "./specificity.js";

/**
 * compile(files) -> { program, stats }
 *
 * `files` is [{path, source}] in manifest order.  Order is load-bearing: it
 * fixes declaration-before-use, the Priority/Default execution order and the
 * initial attention-focus order (spec/A §10.2).
 *
 * The returned program is exactly what `new Bot(program)` and bot.json need.
 */
export function compile(files) {
  const program = parseProgram(files);
  const patterns = buildPatternIndex(program);
  const table = buildFrequencyTable(program, { patterns });

  const byType = { standard: 0, priority: 0, default: 0, sequence: 0 };
  let blocks = 0;
  let unknown = 0;
  const countBlocks = (list) => {
    for (let b of list || []) {
      while (b) {
        blocks++;
        for (const item of b.body || []) {
          if (item && item.condition !== undefined) countBlocks([item]);
          else if (item && item.c === "unknown") unknown++;
        }
        b = b.otherwise;
      }
    }
  };
  for (const cat of program.categories) {
    byType[cat.type] = (byType[cat.type] || 0) + 1;
    countBlocks(cat.blocks);
  }

  return {
    program,
    stats: {
      files: files.length,
      categories: program.categories.length,
      categoriesByType: byType,
      blocks,
      definitions: program.definitions.length,
      attributes: Object.keys(program.attributes).length,
      otherExamples: program.otherExamples.length,
      exampleStatements: table.statements,
      corpusWords: table.total,
      distinctWords: table.counts.size,
      unknownCommands: unknown,
      parseWarnings: program.parseWarnings.length,
    },
  };
}

export default { compile };

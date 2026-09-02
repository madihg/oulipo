// engine/test/bestfit.test.mjs
//
//   node engine/test/bestfit.test.mjs
//
// The two worked examples the sources give for best-fit specificity, as
// executable tests.
//
//   A. spec/neuroserver-help/MANUAL__BestFit.txt, "How Specificity is
//      Determined" -> "Examples": four topics whose conditions are
//         1: IfHeard "what*vRep"
//         2: IfHeard "what*vRep" and "good for"
//         3: IfHeard "what*vRep" and "sales"
//         4: IfHeard "what*vRep" and "sales" and "good for"
//      and four inputs, each of which must run exactly one named topic.
//
//   B. archive/_research/patents/GERBIL-LANGUAGE-NOTES.md section 14.4, the
//      condition-#1 / condition-#2 arithmetic, checked to the integer.
//
// Neither is tuned to anything: A is ordinal (which topic wins) and B is the
// patent's own numbers.

import assert from "node:assert/strict";
import { parseProgram } from "../src/parser.js";
import { Bot } from "../src/runtime.js";
import { conditionSpecificity } from "../src/specificity.js";

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}\n       ${String(err && err.message).split("\n").join("\n       ")}`);
  }
}

// ---------------------------------------------------------------------------
// A. MANUAL__BestFit.txt "How Specificity is Determined"
//
// The Example statements are the manual's own four inputs, so that the corpus
// contains exactly the words the manual is reasoning about.  No word frequency
// is hand-chosen: the corpus is the four questions the manual asks.

const SOURCE = `
Topic "1" is
  IfHeard "what*vRep" Then
    Example "What is a vRep?";
    Say "one";
    Done
EndTopic

Topic "2" is
  IfHeard "what*vRep" and "good for" Then
    Example "What is a vRep good for?";
    Say "two";
    Done
EndTopic

Topic "3" is
  IfHeard "what*vRep" and "sales" Then
    Example "What is a sales vRep?";
    Say "three";
    Done
EndTopic

Topic "4" is
  IfHeard "what*vRep" and "sales" and "good for" Then
    Example "What is a sales vRep good for?";
    Say "four";
    Done
EndTopic
`;

function fresh() {
  const program = parseProgram([{ path: "bestfit.n", source: SOURCE }]);
  assert.deepEqual(program.parseWarnings, [], "fixture must parse cleanly");
  return new Bot(program, { random: () => 0 });
}

function ask(text) {
  const b = fresh();
  b.memSet("WhatUserMeant", [text]);
  const lines = b.input(text);
  const topics = [...new Set(b.trace.map((t) => t.topic))];
  return { lines, topics };
}

const CASES = [
  ["What is a sales vRep good for?", "4"],
  ["What is a vRep good for?", "2"],
  ["What is a sales vRep?", "3"],
  ["What is a vRep?", "1"],
];

console.log('\nA. MANUAL__BestFit.txt "What is a sales vRep good for?"');
for (const [input, want] of CASES) {
  test(`"${input}" runs Topic "${want}"`, () => {
    const r = ask(input);
    assert.deepEqual(r.topics, [want], `topics fired: ${JSON.stringify(r.topics)}`);
  });
}

// ---------------------------------------------------------------------------
// B. GERBIL-LANGUAGE-NOTES.md section 14.4, condition #1 vs condition #2.
//
//   "Condition #1 IfHeard "you" and ((Recall ?FactQuestion and Heard "expensive")
//    or (Recall ?DescriptionQuestion and Heard "cost")) on "Can you tell me the
//    cost of NeuroStudio?" (a ?DescriptionQuestion): inner conjunction
//    6000+2000-1000 = 7000; disjunction = 7000; block = 7000+3000-1000 = 9000.
//    Condition #2 IfHeard "cost" and "NeuroStudio" plus Recall:
//    (8000+6000-1000)=13000, +2000-1000 = 14000.  Condition #2 wins."
//
// The word specificities are the section's own stated assumptions, so the ctx
// below is a stub that returns them.

console.log("\nB. GERBIL section 14.4 arithmetic");

const WORD = {
  you: 3000,
  expensive: 8000,
  cost: 6000,
  neurostudio: 8000,
};
const RECALL_SET = new Set(["descriptionquestion"]); // the stated input

const ctx = {
  needsStructural: () => false,
  recall: (m) => RECALL_SET.has(String(m.name).toLowerCase()),
  attrSpec: () => 2000,
  focused: () => ({ truth: false, spec: 0 }),
  match: (lhs, test, node) => {
    const w = String(node.v).toLowerCase();
    return { truth: w in WORD, spec: WORD[w] || 0 };
  },
};

const heard = (w) => ({
  op: "match",
  lhs: { t: "mem", name: "WhatUserMeant" },
  test: "contains",
  rhs: { t: "string", v: w },
});
const recall = (n) => ({ op: "recall", args: [{ t: "mem", name: n }] });
const and = (...args) => ({ op: "and", args });
const or = (...args) => ({ op: "or", args });

test("condition #1 scores 9000", () => {
  const c = and(
    heard("you"),
    or(
      and(recall("FactQuestion"), heard("expensive")),
      and(recall("DescriptionQuestion"), heard("cost")),
    ),
  );
  const r = conditionSpecificity(c, ctx);
  assert.equal(r.truth, true);
  assert.equal(r.spec, 9000);
});

test("condition #2 scores 14000 and wins", () => {
  const c = and(recall("DescriptionQuestion"), heard("cost"), heard("neurostudio"));
  const r = conditionSpecificity(c, ctx);
  assert.equal(r.truth, true);
  assert.equal(r.spec, 14000);
});

test('"Do you cost a lot?" leaves condition #1 inactive', () => {
  const only = new Set(["factquestion"]);
  const c2 = { ...ctx, recall: (m) => only.has(String(m.name).toLowerCase()) };
  const c = and(
    heard("you"),
    or(
      and(recall("FactQuestion"), heard("expensive")), // "expensive" not heard
      and(recall("DescriptionQuestion"), heard("cost")), // attribute not set
    ),
  );
  const wordsHeard = { you: 3000, cost: 6000 };
  c2.match = (lhs, t, node) => {
    const w = String(node.v).toLowerCase();
    return { truth: w in wordsHeard, spec: wordsHeard[w] || 0 };
  };
  assert.equal(conditionSpecificity(c, c2).truth, false);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

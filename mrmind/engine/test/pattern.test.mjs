// engine/test/pattern.test.mjs
//
// Tests for src/pattern.js. Run: node engine/test/pattern.test.mjs
// No dependencies, no build step.
//
// Sections:
//   1  tokenizeInput
//   2  every worked example in spec/neuroserver-help/MANUAL__Operators.txt
//   3  the summary table ("X" vs user input)
//   4  the star-buffer examples, including the documented divergences
//   5  regression vectors from spec/B-patterns-and-matching.md §16
//   6  pattern expressions: +, ( ), { }, PatternList refs, memrefs
//   7  corpus smoke test over the 49 shipped MRMIND3 sources
//   8  empirical check of the word-boundary rule (D2) against the
//      Example statements in those sources

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  tokenizeInput,
  detokenize,
  compilePattern,
  matchPattern,
  stripCapturedValue,
} from "../src/pattern.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const SCRIPTS = join(
  ROOT,
  "archive",
  "1_NeuroServer_fromVaio_MrMind",
  "NeuroScript",
);

// ---------------------------------------------------------------------------
// tiny harness

let pass = 0;
let fail = 0;
let divergences = 0;
const failures = [];

function ok(cond, name, detail) {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push(name + (detail ? "  -- " + detail : ""));
  }
}

function eq(actual, expected, name) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(a === e, name, `got ${a}, want ${e}`);
}

/** A divergence from a documented claim we can prove is self-contradictory. */
function divergence(name, claim, actual) {
  divergences++;
  console.log(
    `  ~ DIVERGENCE ${name}\n      doc says: ${claim}\n      engine:   ${actual}`,
  );
}

const env = { patterns: {}, memory: {} };

function m(pattern, input, mode = "contains", e = env, options) {
  return matchPattern(compilePattern(pattern, e), input, mode, options);
}
function hit(pattern, input, mode = "contains", e = env, options) {
  return m(pattern, input, mode, e, options) !== null;
}
function yes(pattern, input, mode = "contains", label) {
  ok(
    hit(pattern, input, mode),
    label ||
      `${mode} ${JSON.stringify(pattern)} <- ${JSON.stringify(input)} should MATCH`,
  );
}
function no(pattern, input, mode = "contains", label) {
  ok(
    !hit(pattern, input, mode),
    label ||
      `${mode} ${JSON.stringify(pattern)} <- ${JSON.stringify(input)} should NOT match`,
  );
}

// ===========================================================================
console.log("\n1. tokenizeInput");

{
  const t = tokenizeInput("Hello,  world! I don't know.");
  eq(detokenize(t), "Hello,  world! I don't know.", "tokenize is lossless");
  eq(
    t.map((x) => x.kind),
    [
      "word",
      "punct",
      "space",
      "word",
      "punct",
      "space",
      "word",
      "space",
      "word",
      "space",
      "word",
      "punct",
    ],
    "tokenize kinds",
  );
  eq(t[0].w, "Hello", "first token text");
  eq(t[2].w, "  ", "a run of spaces is one space token");
  eq(
    t.find((x) => x.w === "don't").kind,
    "word",
    "an internal apostrophe stays inside the word",
  );
  // The matcher accepts tokens as well as a raw string.
  ok(
    hit("hello", tokenizeInput("well hello there")),
    "matchPattern accepts a token array",
  );
  eq(tokenizeInput(""), [], "empty input tokenizes to nothing");
}

// ===========================================================================
console.log("\n2. MANUAL__Operators.txt, worked examples");

// -- Apostrophe: "an apostrophe represents an optional apostrophe"
yes("I don't know", "I don't know");
yes("I don't know", "I dont know");

// -- Asterisk. [ops] lists four inputs for "virtual*robot".
yes("virtual*robot", "virtual robot");
yes("virtual*robot", "virtual/robot");
yes("virtual*robot", "virtual. The robot");
// [ops]'s asterisk PROSE lists "virtualrobot" as matching, which requires a
// character-level `*`. The shipped conversation database refutes that reading
// (see D1 in src/pattern.js: "orange" survives `("or",…)+"*"` intact), so the
// engine follows the same file's summary table and the tutorial's own operator
// list ("Asterisk (*) represents zero or more words or punctuation").
if (hit("virtual*robot", "virtualrobot")) {
  ok(false, 'virtual*robot should not match "virtualrobot" under word-level *');
} else {
  divergence(
    'virtual*robot <- "virtualrobot"',
    "MANUAL__Operators.txt asterisk prose says it matches",
    "does NOT match — `*` spans whole words only (D1, settled by the CDB)",
  );
}
// The fourth listed input cannot match: the same document's summary table says
// "robot" does not match "robots". See X1 in src/pattern.js.
if (hit("virtual*robot", "virtual reality robots")) {
  divergence(
    'virtual*robot <- "virtual reality robots"',
    "MANUAL__Operators.txt says it matches",
    "matches (unexpected)",
  );
} else {
  divergence(
    'virtual*robot <- "virtual reality robots"',
    "MANUAL__Operators.txt says it matches",
    'does NOT match — the same file\'s summary table says "robot" does not match "robots" (X1)',
  );
}
// [ops]: "virtual robotic" and "virtually robot" do not match.
no("virtual*robot", "virtual robotic");
// Both hold now that `*` spans whole words (D1 withdrawn); X4 is gone.
no("virtual*robot", "virtually robot");

// -- Caret
yes("hel^o", "hello");
yes("hel^o", "heloo");
no("hel^o", "helllo");

// -- Comma
yes("f,u,d,g,e", "fudge");
yes("f,u,d,g,e", "f u d g e");
yes("f,u,d,g,e", "f.u.d.g.e");

// -- Number sign, "matching any character"
yes("librar#", "the library");
yes("librar#", "libraries");
yes("cat#", "cat");
yes("cat#", "cats");
yes("cat#", "cattle");
yes("cat#", "cathedral");
yes("cat#", "caterer");
no(
  ["cat", "cats"],
  "cattle",
  undefined,
  '["cat","cats"] does not match cattle',
);
yes("market#", "market");
yes("market#", "markets");
yes("market#", "marketing");
no("market#", "remarket"); // [ops] explicitly: "but not remarket" -> the D2 rule
yes("#ing", "reading");
yes("#ing", "marketing");
yes("#ing", "singing");
yes("r#t", "rat");
yes("r#t", "riot");
no("r#t", "start"); // "any word that BEGINS with r and ENDS with t"

// -- Number sign, "matching any word"
yes("#", "hello", "matches");
no("#", "hello there", "matches");
yes("# #", "hello there", "matches");
yes("# #", "hello   there", "matches");
no("# #", "hello", "matches");
no("# #", "one two three", "matches");
yes("##", "hello", "matches"); // two adjacent # with no space = one word
no("##", "hello there", "matches");

// -- Percent sign
yes("%%%-%%%%", "555-1234");
yes("%%%-%%%%", "call me at 555-1234 please");
no("%%%-%%%%", "55-1234");

// -- Period
yes("part.time", "part-time");
yes("part.time", "part time");
yes("part.time", "part - time");

// -- Space character
yes("hello there", "hello there");
yes("hello there", "hello   there");

// -- Matching phrases
yes("virtual robot#", "virtual robot");
yes("virtual robot#", "virtual robots");
yes("virtual robot#", "virtual    robot");
yes("virtual robot#", "What is a virtual robot?");
no("virtual robot#", "Is this robot virtual?");
no("virtual robot#", "virtual reality robot");
no("virtual robot#", "virtualrobot");
// [ops] also lists "What are virtual robots?" as a non-match, which cannot be
// true when "virtual robots" is listed as a match two lines earlier.
if (hit("virtual robot#", "What are virtual robots?")) {
  divergence(
    'virtual robot# <- "What are virtual robots?"',
    "MANUAL__Operators.txt says it does NOT match",
    'matches — the same list says "virtual robots" DOES match, and IfHeard is Contains (X3)',
  );
}

// -- "and" between words: order-free. (Handled by the condition evaluator, not
//    this module; here we just prove each conjunct matches independently.)
for (const input of [
  "I want a virtual robot",
  "What does a virtual robot want?",
  "I want a robot that is virtual",
]) {
  ok(
    hit("want", input) && hit("virtual", input) && hit("robot", input),
    `three-way and: ${JSON.stringify(input)}`,
  );
}

// -- Matching a pattern-matching operator (backslash)
yes("100\\%", "100%");
yes("100\\%", "I am 100% sure");
no("100\\%", "1005");
yes("\\\\", "\\");
yes("$%%\\.%%", "$10.00");
yes("$%%\\.%%", "$99.99");
no("$%%\\.%%", "$10x00");

// -- Case-sensitive matching
yes("\\May", "May");
yes("\\May", "MAY");
no("\\May", "may");
// ExactlyMatches: see D5 in src/pattern.js (case-sensitive).
yes("May", "May", "exactlymatches");
yes("May", "   May  ", "exactlymatches");
no("May", "may", "exactlymatches");
no("May", "May flowers", "exactlymatches");
// operators are literal characters in ExactlyMatches
yes("*", "*", "exactlymatches");
no("*", "anything", "exactlymatches");
yes(":-)", ":-)", "exactlymatches"); // Mrmind3/Reactions/Compliments.n:51

// -- everything else is case-insensitive
yes("ROBOT", "are you a robot");
yes("robot", "Are You A ROBOT");
yes("Virtual*Robot", "VIRTUAL/ROBOT");

// ===========================================================================
console.log("\n3. MANUAL__Operators.txt, the summary table");

const summaryTable = [
  ["Are you a robot", "robot", true],
  ["Are you a robot?", "robot", true],
  ["You are a Robot.", "robot", true],
  ["Have you seen any robots?", "robot", false],
  ["Have you seen any robots?", "robot#", true],
  ["Are you a robot?", "robot#", true],
  ["Chat Site", "chat# site#", true],
  ["Chat Sites", "chat# site#", true],
  ["Chatter Sites", "chat# site#", true],
  ["Chat World Site", "chat# site#", false],
  ["Chat Site", "chat#*site#", true],
  ["Chat World Sites", "chat#*site#", true],
  ["Chat Web site", "chat#*site#", true],
];
for (const [input, pattern, expected] of summaryTable) {
  ok(
    hit(pattern, input) === expected,
    `summary table: IfHeard ${JSON.stringify(pattern)} <- ${JSON.stringify(input)} => ${expected}`,
  );
}

// ===========================================================================
console.log("\n4. star buffers");

{
  // [ops]: If ?WhatUserSaid Matches "My name is *" -> Say "Hello, " + *1
  const r = m("My name is *", "My name is Walter", "matches");
  ok(r !== null, 'Matches "My name is *" <- "My name is Walter"');
  eq(r.stars["*"][1], "Walter", "*1 = Walter");

  const r2 = m("My name is *", "My name is Walter.", "matches");
  eq(r2.stars["*"][1], "Walter", "*1 is stripped of trailing punctuation");
  eq(r2.starsRaw["*"][1], "Walter.", "starsRaw keeps the raw span");

  // "My name is # #" -> #1 FirstName, #2 LastName
  const r3 = m("My name is # #", "My name is Walter Tackett", "matches");
  ok(r3 !== null, 'Matches "My name is # #"');
  eq(r3.stars["#"][1], "Walter", "#1 = Walter");
  eq(r3.stars["#"][2], "Tackett", "#2 = Tackett");

  // "#ing" -> #1 = "talk"
  const r4 = m("#ing", "talking", "matches");
  eq(r4.stars["#"][1], "talk", '#1 = talk for "#ing" <- talking');

  // "(%%%) %%%-%%%%" -> %1 area code, %2 and %3 the number.
  // [ops]: "% and ^ match GROUPS of consecutive instances".
  const r5 = m("(%%%) %%%-%%%%", "call (415) 555-1234 now");
  ok(r5 !== null, 'Contains "(%%%) %%%-%%%%"');
  eq(r5.stars["%"][1], "415", "%1 = 415");
  eq(r5.stars["%"][2], "555", "%2 = 555");
  eq(r5.stars["%"][3], "1234", "%3 = 1234");

  // ^ groups the same way: "^\.^\." on J.W.  (WebNameGreet.n:547)
  const r6 = m("^\\.^\\.", "J.W.", "matches");
  ok(r6 !== null, 'Matches "^\\.^\\." <- J.W.');
  eq(r6.stars["^"][1], "J", "^1 = J");
  eq(r6.stars["^"][2], "W", "^2 = W");

  // Name Capture topic (MANUAL__Operators.txt, complete Topic example):
  // the captured *1 is then re-matched against "#", "# #", "# # #".
  const nc = m(
    ["My name is *", "Call me *"],
    "Call me Dr. Walter Tackett",
    "matches",
  );
  eq(nc.stars["*"][1], "Dr. Walter Tackett", "Name Capture: *1");
  const one = m("#", nc.stars["*"][1], "matches");
  ok(one === null, "Name Capture: a three-word name is not one word");
  const three = m("# # #", nc.stars["*"][1], "matches");
  ok(three !== null, "Name Capture: three-word name matches # # #");
  eq(three.stars["#"][1], "Dr", "#1 = Dr (punctuation stripped)");
  eq(three.stars["#"][2], "Walter", "#2 = Walter");
  eq(three.stars["#"][3], "Tackett", "#3 = Tackett");

  // *match over a PatternList  [ops] "Recalling the Matched Value from a List"
  const listEnv = {
    patterns: {
      FAMILYWORDS: {
        t: "list",
        args: ["mother", "father", "sister", "brother"],
      },
      STUPIDWORDS: {
        t: "list",
        args: ["stupid", "dumb", "dull", "dense", "moronic"],
      },
    },
  };
  const fm = m(
    { t: "symbol", name: "familywords" },
    "tell me about my father please",
    "contains",
    listEnv,
  );
  ok(fm !== null, "IfHeard FAMILYWORDS matched");
  eq(fm.starMatch, "father", "*match = father");
  eq(fm.renderedIndex, 1, "*match came from the second list element");

  const you = m("You are #", "You are dumb", "matches");
  eq(you.stars["#"][1], "dumb", '#1 from "You are #"');
  const sw = m(
    { t: "symbol", name: "stupidwords" },
    you.stars["#"][1],
    "matches",
    listEnv,
  );
  eq(sw.starMatch, "dumb", "*match = dumb");

  // [B §6.4] *match is the pattern proper, not the whole input.
  const bots = m(
    { t: "list", args: ["HAL", "R2D2"] },
    "do you know HAL?",
    "contains",
  );
  eq(
    bots.starMatch,
    "HAL",
    "*match is the matched pattern text, not the input",
  );

  // "first successful match" across a pattern list  [ops]
  // Both elements match "robot"; the buffers must come from the first.
  const first = m(["robot*", "robot"], "robot", "matches");
  eq(first.renderedIndex, 0, "the FIRST successful element of a list wins");

  // stripCapturedValue is exported for Remember
  eq(stripCapturedValue("  ,Walter. "), "Walter", "stripCapturedValue");
}

// ---------------------------------------------------------------------------
// The "Recalling Values" table of MANUAL__Operators.txt. These four rows
// require LAZY wildcards; the engine is greedy per spec/B §7 (see X2).
console.log("\n4b. the *1/#1/%1 table (documented divergence X2)");
{
  const rows = [
    ["You*#vRep", "You are a vRep.", { "*1": "are", "#1": "a" }],
    ["You*#vRep", "You are a sales vRep.", { "*1": "are a", "#1": "sales" }],
    [
      "You* #bot",
      "I think you are a chatterbot.",
      { "*1": "are a", "#1": "chatter" },
    ],
    ["You* #bot", "You are a robot.", { "*1": "are a", "#1": "ro" }],
    ["$%%% *", "You cost $500 dollars.", { "*1": "dollars", "%1": "500" }],
  ];
  for (const [pattern, input, doc] of rows) {
    const r = m(pattern, input);
    ok(r !== null, `table row matches at all: ${pattern} <- ${input}`);
    if (!r) continue;
    const got = {};
    if (doc["*1"] !== undefined) got["*1"] = r.stars["*"][1] ?? "";
    if (doc["#1"] !== undefined) got["#1"] = r.stars["#"][1] ?? "";
    if (doc["%1"] !== undefined) got["%1"] = r.stars["%"][1] ?? "";
    if (JSON.stringify(got) === JSON.stringify(doc)) {
      pass++;
    } else {
      divergence(
        `${pattern} <- ${JSON.stringify(input)}`,
        JSON.stringify(doc),
        JSON.stringify(got) + "  (greedy wildcards, spec/B §7)",
      );
    }
  }
}

// ===========================================================================
console.log("\n5. spec/B-patterns-and-matching.md §16 regression vectors");

yes("who*kronos", "who was kronos", "matches");
// The tutorial lists "whois kronos" and "whoaskflkronos" as activating the
// topic, but the SAME tutorial explains why, 25 lines later: the Spell Checker
// rewrites them before matching ("*** Spell Checker changing value from
// \"whoaskflkronos\" to \"who\" ***", NEUROSERVER_tutorial.txt:2696-2699).
// SpellCheck is not reproducible in this port (see engine/DEVIATIONS.md), so
// these two are reported as divergences rather than faked.
for (const input of ["whois kronos", "whoaskflkronos"]) {
  if (hit("who*kronos", input, "matches")) {
    ok(false, `who*kronos should not match ${JSON.stringify(input)} unaided`);
  } else {
    divergence(
      `who*kronos <- ${JSON.stringify(input)} (matches)`,
      "NeuroServer Tutorial 3.5 lists it as activating the topic",
      "does NOT match — the tutorial's own text shows the Spell Checker rewrote the input first",
    );
  }
}
no("who*kronos", "kronos was who", "matches");
no("you are", "you sure are", "matches");
no("you are", "you sure are", "contains");
yes("you are", "you are", "matches");
yes("what", "so what", "contains");
no("what", "so what", "matches");
yes("book,mark#", "what is a bookmark");
yes("book,mark#", "what is a book mark");
yes("book,mark#", "bookmarks");
yes("O,K", "are you o.k.");
yes("O,K", "ok");
yes("aren,t", "you arent");
yes("aren,t", "you aren't");
yes("machine#", "are you a machine");
yes("#teen", "i am thirteen");
yes("barbe^ue#", "i like barbeque");
yes("barbe^ue#", "i like barbecues");
yes("%%%", "i am 100 years old");
yes("^\\.^\\.", "j.w.", "matches");
yes("#", "anne", "matches");
no("#", "anne marie", "matches");
yes("#-#", "anne-marie", "matches");
yes("A.I.", "a.i.");
no("A.I.", "ai"); // the unescaped . requires punctuation [B §4.4]
// Mrmind3/Patterns.n's "mast*rbat#" and "fantas*" are DEAD patterns in the
// shipped bot: `*` spans whole words, so neither can ever fire. The author
// meant them to work; the engine did not oblige. Reproduced, not repaired.
// (D1 in src/pattern.js carries the conversation-database evidence.)
no("mast*rbat#", "masturbate");
no("mast*rbat#", "masterbating");
no("fantas*", "fantasy");
yes("mast#rbat#", "masturbate"); // the spelling that WOULD have worked

{
  // "are"+YOU+"*"+OKAY  (Mrmind3/AboutMrMind/WhatIsMM.n:68)
  const e = {
    patterns: {
      YOU: { t: "list", args: ["you", "your"] },
      OKAY: {
        t: "list",
        args: ["O,K", "all right", "alright", "well", "okay"],
      },
    },
  };
  const p = {
    t: "concat",
    args: [
      { t: "string", v: "are" },
      { t: "symbol", name: "you" },
      { t: "string", v: "*" },
      { t: "symbol", name: "okay" },
    ],
  };
  const c = compilePattern(p, e);
  eq(c.renderings[0].text, "are you*O,K", "implicit space + * suppression");
  ok(
    matchPattern(c, "are you ok", "contains") !== null,
    '"are"+YOU+"*"+OKAY <- are you ok',
  );
  ok(matchPattern(c, "Are you OK?", "contains") !== null, "<- Are you OK?");
  ok(matchPattern(c, "are you o.k.", "contains") !== null, "<- are you o.k.");
  ok(
    matchPattern(c, "are you really ok", "contains") !== null,
    "<- are you really ok",
  );
  ok(
    matchPattern(c, "areyou ok", "contains") === null,
    "<- areyou ok (implicit space is hard)",
  );
}

{
  // YOU + "have to" + "trust me"  (Mrmind3/Issues/TrustTruth.n:108)
  const e = { patterns: { YOU: { t: "list", args: ["you"] } } };
  const p = {
    t: "concat",
    args: [
      { t: "symbol", name: "YOU" },
      { t: "string", v: "have to" },
      { t: "string", v: "trust me" },
    ],
  };
  const c = compilePattern(p, e);
  eq(
    c.renderings[0].text,
    "you have to trust me",
    "implicit space between three string operands",
  );
  ok(
    matchPattern(c, "you have to trust me", "contains") !== null,
    "TrustTruth.n:108",
  );
}

{
  // Base/Defaults/HighDefault.n:106-109 — the HotBot three-word default.
  const e = {
    patterns: {
      ARTICLES: {
        t: "list",
        args: [
          "a",
          "an",
          "the",
          "these",
          "those",
          "some",
          "your",
          "my",
          "#\\'s",
        ],
      },
      OPTARTICLE: {
        t: "list",
        args: [
          { t: "symbol", name: "ARTICLES" },
          { t: "string", v: "" },
        ],
      },
    },
  };
  const p = {
    t: "concat",
    args: [
      {
        t: "list",
        args: [
          "I want to",
          "I need to",
          "can you",
          "could you",
          "would you",
          "",
        ],
      },
      {
        t: "list",
        args: ["find me", "find", "look for", "search*for", "I'm looking for"],
      },
      { t: "optional", args: ["information on", "information about"] },
      { t: "symbol", name: "OPTARTICLE" },
      { t: "string", v: "# # #*" },
    ],
  };
  const c = compilePattern(p, e);
  ok(
    c.renderings.some((r) => r.text === "can you find # # #*"),
    'the empty article branch renders "can you find # # #*"',
  );
  const r = matchPattern(c, "Can you find very ugly rabbits?", "matches");
  ok(r !== null, "HotBot default matches its Example");
  eq(r.stars["#"][1], "very", "#1 = very");
  eq(r.stars["#"][2], "ugly", "#2 = ugly");
  eq(r.stars["#"][3], "rabbits", "#3 = rabbits (stripped)");
  eq(
    r.starsRaw["#"][3],
    "rabbits?",
    "#3 raw keeps the question mark (spec/B §12.2)",
  );
}

{
  // Mrmind3/customization/NameCustomize.n:82-83 — apostrophe optional
  const r = m("It's short for *", "Its short for Fido", "matches");
  ok(r !== null, '"It\'s short for *" <- "Its short for Fido"');
  eq(r.stars["*"][1], "Fido", "*1 = Fido");
}

{
  // Base/Utilities/EmailCapture.n:152-155 — Contains "*@*", *1 and *2, and the
  // proof that the Contains wrappers are NOT numbered [B §6.2].
  const r = m("*@*", "my email is a@b.com");
  ok(r !== null, 'Contains "*@*"');
  eq(r.stars["*"][1], "my email is a", "*1");
  eq(r.stars["*"][2], "b.com", "*2");
  eq(
    r.stars["*"][3],
    undefined,
    "no third star: the Contains wrappers are not numbered",
  );
}

// ===========================================================================
console.log("\n6. pattern expressions");

{
  // {optional} never changes whether a pattern matches  [B §5.4]
  const p = {
    t: "concat",
    args: [
      { t: "string", v: "humanity" },
      { t: "optional", args: ["anyway"] },
    ],
  };
  const c = compilePattern(p, env);
  ok(
    matchPattern(c, "humanity", "matches") !== null,
    "{opt} absent still matches",
  );
  ok(
    matchPattern(c, "humanity anyway", "matches") !== null,
    "{opt} present matches",
  );
  eq(
    c.renderings.map((r) => r.text),
    ["humanity anyway", "humanity"],
    "{X} renders as X then empty",
  );
}

{
  // ("", "#", "# #") — "zero, one or two intervening words"  [B §12.5]
  const p = {
    t: "concat",
    args: [
      { t: "string", v: "I am " },
      { t: "list", args: ["", "#"] },
      { t: "list", args: ["angry", "mad"] },
    ],
  };
  const c = compilePattern(p, env);
  ok(
    matchPattern(c, "I am angry", "contains") !== null,
    "zero intervening words",
  );
  ok(
    matchPattern(c, "I am very mad", "contains") !== null,
    "one intervening word",
  );
  ok(
    matchPattern(c, "I am very very mad", "contains") === null,
    "two is too many",
  );
}

{
  // nested PatternList refs resolve case-insensitively
  const e = {
    patterns: {
      accessoryclothing: { t: "list", args: ["bracelet", "necklace"] },
      CLOTHES: {
        t: "list",
        args: ["shirt", { t: "symbol", name: "AccessoryClothing" }],
      },
    },
  };
  ok(
    hit(
      { t: "symbol", name: "clothes" },
      "I like your necklace",
      "contains",
      e,
    ),
    "nested list, case-insensitive",
  );
  ok(
    hit({ t: "symbol", name: "CLOTHES" }, "nice shirt", "contains", e),
    "outer list element",
  );
  ok(
    !hit({ t: "symbol", name: "CLOTHES" }, "nice hat", "contains", e),
    "not in the list",
  );
}

{
  // memref splices a LITERAL value  [B §5.5]
  const e = { memory: { Name: "Walter" } };
  const p = {
    t: "concat",
    args: [
      { t: "string", v: "is" },
      { t: "mem", name: "name" },
      { t: "string", v: "your real name" },
    ],
  };
  ok(
    hit(p, "is Walter your real name", "contains", e),
    "memref spliced into a pattern",
  );
  const e2 = { memory: { Name: "*" } };
  ok(
    !hit(p, "is anything your real name", "contains", e2),
    "a memref value is literal, not a pattern",
  );
}

{
  // unresolved symbols are reported, not thrown  (CONTRACT: never throw)
  const c = compilePattern({ t: "symbol", name: "NOPE" }, env);
  ok(
    c.warnings.length === 1 && /unresolved/.test(c.warnings[0]),
    "unresolved PatternList warns",
  );
  // cyclic definitions terminate
  const e = {
    patterns: { A: { t: "symbol", name: "B" }, B: { t: "symbol", name: "A" } },
  };
  const c2 = compilePattern({ t: "symbol", name: "A" }, e);
  ok(
    c2.warnings.some((w) => /cyclic/.test(w)),
    "cyclic PatternList is caught, not hung",
  );
}

{
  // an escaped separator does not suppress the implicit space  [B §15.13]
  const p = {
    t: "concat",
    args: [
      { t: "string", v: "wait\\," },
      { t: "string", v: "please" },
    ],
  };
  eq(
    compilePattern(p, env).renderings[0].text,
    "wait\\, please",
    "escaped comma keeps the implicit space",
  );
  // an unescaped one does
  const p2 = {
    t: "concat",
    args: [
      { t: "string", v: "hi," },
      { t: "string", v: "hello" },
    ],
  };
  eq(
    compilePattern(p2, env).renderings[0].text,
    "hi,hello",
    "unescaped comma suppresses it",
  );
}

// ===========================================================================
console.log("\n7. corpus smoke test (the 49 shipped MRMIND3 sources)");

function findCaseInsensitive(base, relParts) {
  let cur = base;
  for (const part of relParts) {
    let entries;
    try {
      entries = readdirSync(cur);
    } catch {
      return null;
    }
    const found = entries.find((e) => e.toLowerCase() === part.toLowerCase());
    if (!found) return null;
    cur = join(cur, found);
  }
  return cur;
}

function readCp1252(file) {
  const buf = readFileSync(file);
  // Windows-1252: bytes 0x80-0x9F have their own mapping; the archive only has
  // 0xE9 (é), which is identical in latin1, so latin1 is sufficient and exact
  // for these files. (spec/B §1)
  return buf.toString("latin1");
}

function buildFileList() {
  const vsr = findCaseInsensitive(SCRIPTS, ["Mrmind3", "MRMIND3.vsr"]);
  if (!vsr) return null;
  const text = readFileSync(vsr, "latin1").replace(/\r/g, "");
  const section = text.split("[FILES]")[1].split(/^\[/m)[0];
  const files = [];
  for (const line of section.split("\n")) {
    const t = line.trim();
    if (!t || !/\.n=/i.test(t)) continue;
    const rel = t.split("=")[0];
    const isLib = /^LIBRARY:/i.test(rel);
    const parts = rel.replace(/^LIBRARY:/i, "").split("\\");
    const path = isLib
      ? findCaseInsensitive(SCRIPTS, ["Library", ...parts])
      : findCaseInsensitive(SCRIPTS, ["Mrmind3", ...parts]);
    files.push({ rel, path });
  }
  return files;
}

/** Strip // comments that are outside string literals, keep the strings. */
function stripComments(line) {
  let out = "";
  let inStr = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      out += c;
      if (c === "\\" && i + 1 < line.length) {
        out += line[++i];
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
      continue;
    }
    if (c === "/" && line[i + 1] === "/") break;
    out += c;
  }
  return out;
}

function stringLiterals(line) {
  const out = [];
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let m2;
  while ((m2 = re.exec(line))) out.push(m2[1]);
  return out;
}

const files = buildFileList();
if (!files) {
  console.log("  (archive not found; skipping corpus tests)");
} else {
  const missing = files.filter((f) => !f.path);
  ok(
    files.length === 49,
    `MRMIND3.vsr [FILES] lists 49 sources (got ${files.length})`,
  );
  ok(
    missing.length === 0,
    `every listed source resolves on disk`,
    missing.map((x) => x.rel).join(", "),
  );

  let nStrings = 0;
  let nCompiled = 0;
  const compileFailures = [];
  const perFile = [];

  for (const f of files) {
    if (!f.path) continue;
    const src = readCp1252(f.path).replace(/\r/g, "");
    let count = 0;
    for (const rawLine of src.split("\n")) {
      const line = stripComments(rawLine);
      for (const s of stringLiterals(line)) {
        nStrings++;
        count++;
        try {
          const c = compilePattern({ t: "string", v: s }, env);
          // A compiled pattern must be runnable, not merely constructible.
          matchPattern(
            c,
            "a probe string with 123 digits and, punctuation.",
            "contains",
          );
          matchPattern(c, "", "matches");
          nCompiled++;
        } catch (err) {
          compileFailures.push({
            file: f.rel,
            s,
            err: String(err && err.message),
          });
        }
      }
    }
    perFile.push({ file: f.rel, count });
  }

  console.log(`  ${files.length} files, ${nStrings} string literals extracted`);
  console.log(`  compiled + matched OK: ${nCompiled}`);
  console.log(`  failures: ${compileFailures.length}`);
  for (const cf of compileFailures.slice(0, 20))
    console.log(`    ! ${cf.file}: ${JSON.stringify(cf.s)} -> ${cf.err}`);
  ok(
    compileFailures.length === 0,
    "every literal pattern string in the build compiles and runs",
  );
  ok(
    nStrings > 5000,
    `the extraction found a plausible number of strings (${nStrings})`,
  );

  // ===========================================================================
  console.log("\n8. empirical check of the word-boundary rule (D2)");
  //
  // NeuroServer verified every Example statement at build time, so an Example
  // must be matched by its topic's condition. We can only pair them reliably
  // for single-pattern conditions, so this is a floor, not a score. What
  // matters here is the DELTA between the D2 rule on and off: if the boundary
  // rule were wrong, it would lose Examples that the plain [B §10.2] model wins.

  const pairs = [];
  const condRe =
    /(?:^|\W)(?:if\s+)?(?:heard|ifheard)\s+"((?:[^"\\]|\\.)*)"\s*(?:then)?\s*$/i;
  const condRe2 =
    /\?\w[\w.]*\s+(matches|contains)\s+"((?:[^"\\]|\\.)*)"\s*(?:then)?\s*$/i;
  const exRe = /(?:^|\W)example\s+"((?:[^"\\]|\\.)*)"\s*;/i;

  for (const f of files) {
    if (!f.path) continue;
    const src = readCp1252(f.path).replace(/\r/g, "");
    let pending = null;
    for (const rawLine of src.split("\n")) {
      const line = stripComments(rawLine).trim();
      if (!line) continue;
      const c1 = condRe.exec(line);
      const c2 = c1 ? null : condRe2.exec(line);
      // ?WhatRobotSaid tests the bot's OWN previous line, never the user's
      // Example, so such pairs are meaningless here.
      if (c1) pending = { pattern: c1[1], mode: "contains", file: f.rel };
      else if (c2 && /\?WhatRobotSaid/i.test(line)) pending = null;
      else if (c2)
        pending = { pattern: c2[2], mode: c2[1].toLowerCase(), file: f.rel };
      else {
        const e = exRe.exec(line);
        if (e && pending && e[1] !== "") {
          pairs.push({ ...pending, example: e[1] });
          pending = null;
        } else if (e) {
          pending = null; // Example ""; — nothing to check
        } else if (/^(if|or|and)\b/i.test(line)) {
          pending = null; // a multi-part condition: cannot attribute the Example
        }
      }
    }
  }

  let withRule = 0;
  let withoutRule = 0;
  const lostByRule = [];
  for (const p of pairs) {
    const c = compilePattern({ t: "string", v: p.pattern }, env);
    const a =
      matchPattern(c, p.example, p.mode, { wordBoundary: true }) !== null;
    const b =
      matchPattern(c, p.example, p.mode, { wordBoundary: false }) !== null;
    if (a) withRule++;
    if (b) withoutRule++;
    if (b && !a) lostByRule.push(p);
  }
  console.log(
    `  single-pattern (condition, Example) pairs found: ${pairs.length}`,
  );
  console.log(
    `  Examples matched WITH the D2 word-boundary rule:    ${withRule}`,
  );
  console.log(
    `  Examples matched WITHOUT it (plain spec/B §10.2):   ${withoutRule}`,
  );
  console.log(
    `  Examples the rule costs:                            ${lostByRule.length}`,
  );
  for (const l of lostByRule.slice(0, 10))
    console.log(
      `    - ${l.file}: ${JSON.stringify(l.pattern)} <- ${JSON.stringify(l.example)}`,
    );
  ok(pairs.length > 20, `enough pairs to be worth reporting (${pairs.length})`);
  ok(
    withoutRule - withRule <= Math.max(2, Math.round(pairs.length * 0.05)),
    `the D2 rule costs at most 5% of pairable Examples (cost ${withoutRule - withRule} of ${pairs.length})`,
  );
}

// ===========================================================================
console.log(
  `\n${pass} passed, ${fail} failed, ${divergences} documented divergences`,
);
for (const f of failures) console.log("  FAIL " + f);
process.exit(fail === 0 ? 0 : 1);

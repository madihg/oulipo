// engine/test/smoke.test.mjs
//
// Compiles the REAL Mrmind3 build from the archive, constructs a Bot, and
// checks the opening sequence against the strings that are actually in Peggy
// Weil's scripts.  Nothing here is paraphrased: every expected string is quoted
// from a source file, with the file and line noted.
//
//   node engine/test/smoke.test.mjs

import assert from "node:assert/strict";
import { buildBotJson } from "../build/compile.mjs";
import { Bot } from "../src/index.js";

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}`);
    console.log(
      String(err && err.message)
        .split("\n")
        .map((l) => "       " + l)
        .join("\n"),
    );
  }
}

// A deterministic RNG so SayOneOf / IfChance are reproducible.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
/** Always returns the LAST alternative of any SayOneOf / list. */
const alwaysLast = () => 0.999999;
/** Always returns the FIRST alternative. */
const alwaysFirst = () => 0;

console.log("building bot.json from the archive ...");
const t0 = Date.now();
const { json, program, stats } = buildBotJson();
console.log(
  `  ${stats.categories} categories, ${stats.blocks} blocks, ` +
    `${stats.parseWarnings} parse warnings, ${Date.now() - t0} ms`,
);

// --- the strings under test, quoted from the archive -----------------------
//
// Mrmind3/Customization/WebCustomize.n:24,27
//   Patternlist STDW_WebGreetingFirstHalf is "<B>Hello.  I'm ","<B>Hi, my name is ";
//   PatternList STDW_WebGreetingSecondHalf is "";
// Mrmind3/Customization/MyName.n:21
//   PatternList MYNAME is "mrmind", "mr mind","MRMIND";
// Mrmind3/Utilities/WebNameGreet.n:886
//   SayOneOf STDW_WebGreetingFirstHalf +MYNAME+ STDW_WebGreetingSecondHalf;
const GREETINGS = [
  "<B>Hello.  I'm mrmind",
  "<B>Hello.  I'm mr mind",
  "<B>Hello.  I'm MRMIND",
  "<B>Hi, my name is mrmind",
  "<B>Hi, my name is mr mind",
  "<B>Hi, my name is MRMIND",
];
// Mrmind3/Customization/NameCustomize.n:19-21
const NAME_REQUESTS = [
  "<B>What's your name?</B>",
  "<B>Please tell me your name.</B>",
  "<B>What is your name?</B>",
];
// Mrmind3/Utilities/WebNameGreet.n:69 and :94 + NameCustomize.n:26-27
const CONVINCE_60 = (n) =>
  "Hi " + n + "! <BR>Can you convince me <BR>that you're human?";
const CONVINCE_40 = (n) =>
  "<B>Hi " + n + "! <BR>Can you convince me <BR>that you are human?  </B>";

// ---------------------------------------------------------------------------

test("the build parses with no warnings and no unknown commands", () => {
  assert.equal(stats.parseWarnings, 0);
  assert.equal(stats.unknownCommands, 0);
  assert.equal(stats.files, 49);
});

test("bot.json carries no absolute filesystem paths", () => {
  const text = JSON.stringify(json);
  assert.ok(!text.includes("/Users/"), "bot.json leaks a home directory path");
  assert.ok(
    !/[A-Za-z]:\\\\Users/.test(text),
    "bot.json leaks a Windows user path",
  );
});

test('start() says "Hi, my name is MRMIND" then asks for a name', () => {
  const bot = new Bot(program, { random: alwaysLast });
  const lines = bot.start();
  assert.ok(
    lines.length >= 2,
    `expected >= 2 opening lines, got ${lines.length}: ${JSON.stringify(lines)}`,
  );
  assert.equal(lines[0], "<B>Hi, my name is MRMIND");
  assert.equal(lines[1], "<B>What is your name?</B>");
});

test("the opening greeting is always one of the six scripted cross-product strings", () => {
  for (let seed = 1; seed <= 25; seed++) {
    const bot = new Bot(program, { random: seeded(seed) });
    const lines = bot.start();
    assert.ok(
      GREETINGS.includes(lines[0]),
      `seed ${seed}: greeting ${JSON.stringify(lines[0])} is not in the script`,
    );
    assert.ok(
      NAME_REQUESTS.includes(lines[1]),
      `seed ${seed}: name request ${JSON.stringify(lines[1])} is not in the script`,
    );
    assert.equal(
      lines.length,
      2,
      `seed ${seed}: opening turn should be exactly two lines`,
    );
  }
});

test("start() arms a WaitForResponse continuation inside Name Capture", () => {
  const bot = new Bot(program, { random: alwaysFirst });
  bot.start();
  assert.ok(bot.continuation, "no continuation armed after the opening turn");
  assert.equal(bot.continuation.category.name, "Name Capture");
});

test('giving a name produces the real "can you convince me ... human?" follow-up', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const bot = new Bot(program, { random: seeded(seed) });
    bot.start();
    const reply = bot.input("Peggy");
    const joined = reply.join(" | ");
    assert.ok(
      reply.some(
        (l) => l === CONVINCE_60("Peggy") || l === CONVINCE_40("Peggy"),
      ),
      `seed ${seed}: expected one of the two scripted greetings for "Peggy", got ${JSON.stringify(joined)}`,
    );
  }
});

test("the name is capitalised the way WebNameGreet.n does it", () => {
  const bot = new Bot(program, { random: seeded(7) });
  bot.start();
  const reply = bot.input("peggy");
  assert.ok(
    reply.some((l) => l.includes("Hi Peggy!")),
    `expected "Hi Peggy!" after typing "peggy", got ${JSON.stringify(reply)}`,
  );
  assert.deepEqual(bot.memGet("Name"), ["Peggy"]);
});

test('"my name is Fred" is parsed down to the name', () => {
  const bot = new Bot(program, { random: seeded(3) });
  bot.start();
  const reply = bot.input("My name is Fred");
  assert.deepEqual(bot.memGet("Name"), ["Fred"]);
  assert.ok(
    reply.some((l) => l === CONVINCE_60("Fred") || l === CONVINCE_40("Fred")),
    `got ${JSON.stringify(reply)}`,
  );
});

test("claiming MrMind's own name gets the scripted rebuff and re-asks", () => {
  const bot = new Bot(program, { random: seeded(11) });
  bot.start();
  const reply = bot.input("mrmind");
  // Mrmind3/Customization/NameCustomize.n:24
  assert.deepEqual(reply, ["No, that's my name.  <BR>What's yours?"]);
  assert.ok(bot.continuation, "TryAgain should re-arm the WaitForResponse");
  assert.equal(bot.continuation.category.name, "Name Capture");
});

test("claiming the name Human gets one of the two scripted lines", () => {
  // Mrmind3/Utilities/WebNameGreet.n:58-59
  const LINES = [
    "I know that trick but <BR>it doesn't mean you <BR>ARE human.",
    "That's a good trick -- <BR>OK, I'll CALL you Human...",
  ];
  const bot = new Bot(program, { random: seeded(5) });
  bot.start();
  const reply = bot.input("human");
  assert.ok(
    reply.some((l) => LINES.includes(l)),
    `got ${JSON.stringify(reply)}`,
  );
  assert.deepEqual(bot.memGet("Name"), ["Human"]);
});

test("the StdQuestion pipeline classifies a question", () => {
  const bot = new Bot(program, { random: seeded(2) });
  bot.start();
  bot.input("Peggy");
  bot.input("who are you?");
  assert.deepEqual(bot.memGet("WhatUserMeant"), ["who are you?"]);
  assert.ok(bot.recall({ name: "AnyQuestion" }), "?AnyQuestion should be set");
  assert.ok(bot.recall({ name: "WhoQuestion" }), "?WhoQuestion should be set");
});

test("every reply after the opening comes from a topic that exists in the build", () => {
  const bot = new Bot(program, { random: seeded(42) });
  bot.start();
  bot.input("Peggy");
  const inputs = [
    "who are you?",
    "are you a machine?",
    "I am human",
    "why do you ask?",
    "do you have feelings?",
    "yes",
    "no",
    "what is your name?",
  ];
  const names = new Set(program.categories.map((c) => c.name));
  for (const line of inputs) {
    const before = bot.trace.length;
    bot.input(line);
    for (const t of bot.trace.slice(before)) {
      assert.ok(
        names.has(t.topic),
        `trace names unknown topic ${JSON.stringify(t.topic)}`,
      );
      assert.ok(typeof t.text === "string" && t.text.length >= 0);
      assert.ok(t.file && typeof t.line === "number");
    }
  }
  assert.ok(bot.trace.length > 0, "no trace entries at all");
});

test("a conversation of 30 turns never throws and always answers", () => {
  const bot = new Bot(program, { random: seeded(99) });
  bot.start();
  bot.input("Peggy");
  const inputs = [
    "hello",
    "who are you?",
    "what are you?",
    "are you a computer?",
    "I am a human being",
    "I have a body",
    "do you have a body?",
    "what do you look like?",
    "can you think?",
    "I can think",
    "do you dream?",
    "I dream every night",
    "what is love?",
    "I love my family",
    "are you alive?",
    "I am alive",
    "how old are you?",
    "I am 40 years old",
    "where do you live?",
    "I live in Paris",
    "do you like music?",
    "I like music",
    "why?",
    "yes",
    "no",
    "maybe",
    "I don't know",
    "tell me a joke",
    "knock knock",
    "goodbye",
  ];
  let answered = 0;
  for (const line of inputs) {
    const reply = bot.input(line);
    assert.ok(Array.isArray(reply));
    if (reply.length) answered++;
  }
  assert.ok(
    answered >= inputs.length - 2,
    `only ${answered}/${inputs.length} turns produced output`,
  );
  assert.equal(
    bot.warnings.length,
    0,
    `runtime warnings: ${bot.warnings.join("; ")}`,
  );
});

test("bot.json alone drives the engine (the browser path)", () => {
  // Serialise exactly what build/compile.mjs writes, parse it back, and run the
  // opening turn off the JSON with no access to the archive.
  const roundTripped = JSON.parse(JSON.stringify(json));
  const b = new Bot(roundTripped, { random: alwaysLast });
  assert.deepEqual(b.start(), [
    "<B>Hi, my name is MRMIND",
    "<B>What is your name?</B>",
  ]);
  assert.ok(b.input("Peggy").some((l) => l.includes("convince me")));
});

test("two Bots on one program do not share user state", () => {
  const a = new Bot(program, { random: seeded(1) });
  const b = new Bot(program, { random: seeded(1) });
  a.start();
  a.input("Alice");
  b.start();
  b.input("Bob");
  assert.deepEqual(a.memGet("Name"), ["Alice"]);
  assert.deepEqual(b.memGet("Name"), ["Bob"]);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

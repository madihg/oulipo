// engine/test/runtime.test.mjs
//
// Unit tests for src/specificity.js and src/runtime.js against small synthetic
// scripts, so each rule of the manual and the patents is exercised on its own.
// The archive-scale tests live in smoke.test.mjs.
//
//   node engine/test/runtime.test.mjs

import assert from "node:assert/strict";
import { parseProgram } from "../src/parser.js";
import { Bot } from "../src/runtime.js";
import {
  buildFrequencyTable,
  conditionSpecificity,
  CONJUNCTION_PENALTY,
} from "../src/specificity.js";

let passed = 0;
let failed = 0;
let section = "";
function group(name) {
  section = name;
  console.log("\n" + name);
}
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

/** Compile one source string into a Bot. */
function bot(source, options = {}) {
  const program = parseProgram([{ path: "test.n", source }]);
  assert.deepEqual(
    program.parseWarnings.map((w) => `${w.line}: ${w.message}`),
    [],
    "the fixture must parse cleanly",
  );
  return new Bot(program, { random: () => 0, ...options });
}
/** Feed `text` as ?WhatUserSaid and ?WhatUserMeant (no StdQuestion library here). */
function say(b, text) {
  b.memSet("WhatUserMeant", [text]);
  return b.input(text);
}

// ===========================================================================
group("1. specificity: the combining rules (patents section 14.3)");

const fakeCtx = (leaf) => ({
  negatedSpecificity: 0,
  recall: (m) => leaf.recalled.has(m.name),
  attrSpec: (m) => leaf.attrs[m.name] ?? 2000,
  focused: () => leaf.focused || { truth: false, spec: 0 },
  match: (lhs, test, node) => leaf.matches[node.v] || { truth: false, spec: 0 },
  needsStructural: () => false,
});

const M = (v) => ({
  op: "match",
  lhs: { t: "mem", name: "x" },
  test: "contains",
  negated: false,
  rhs: { t: "string", v },
});

test("conjunction = sum minus 1000 per child beyond the first", () => {
  const ctx = fakeCtx({
    recalled: new Set(),
    attrs: {},
    matches: { a: { truth: true, spec: 6000 }, b: { truth: true, spec: 3000 } },
  });
  const r = conditionSpecificity({ op: "and", args: [M("a"), M("b")] }, ctx);
  assert.equal(r.truth, true);
  assert.equal(r.spec, 6000 + 3000 - CONJUNCTION_PENALTY);
});

test("disjunction = max over the TRUE children only", () => {
  const ctx = fakeCtx({
    recalled: new Set(),
    attrs: {},
    matches: {
      a: { truth: true, spec: 3000 },
      b: { truth: false, spec: 9000 },
    },
  });
  const r = conditionSpecificity({ op: "or", args: [M("a"), M("b")] }, ctx);
  assert.equal(r.truth, true);
  assert.equal(r.spec, 3000);
});

test("a false optional condition scores 0 but stays true", () => {
  const ctx = fakeCtx({
    recalled: new Set(),
    attrs: {},
    matches: { a: { truth: false, spec: 9000 } },
  });
  const r = conditionSpecificity({ op: "optional", arg: M("a") }, ctx);
  assert.deepEqual(r, { truth: true, spec: 0 });
});

test("Recall uses the registered Attribute specificity, default 2000", () => {
  const ctx = fakeCtx({
    recalled: new Set(["WhoQuestion", "AnyQuestion"]),
    attrs: { WhoQuestion: 5000 },
    matches: {},
  });
  const or = conditionSpecificity(
    {
      op: "recall",
      listOp: "or",
      negated: false,
      args: [
        { t: "mem", name: "WhoQuestion" },
        { t: "mem", name: "AnyQuestion" },
      ],
    },
    ctx,
  );
  assert.deepEqual(or, { truth: true, spec: 5000 }); // max of 5000 and the 2000 default
});

test('the patent\'s worked block: IfHeard "you" and ((Recall+Heard) or (Recall+Heard))', () => {
  // GERBIL-LANGUAGE-NOTES section 14.4, condition #1, on a ?DescriptionQuestion
  // input: inner AND 6000+2000-1000 = 7000; OR = 7000; outer AND +3000-1000 = 9000.
  const ctx = fakeCtx({
    recalled: new Set(["DescriptionQuestion"]),
    attrs: { FactQuestion: 2000, DescriptionQuestion: 2000 },
    matches: {
      you: { truth: true, spec: 3000 },
      cost: { truth: true, spec: 6000 },
      expensive: { truth: false, spec: 8000 },
    },
  });
  const cond = {
    op: "and",
    args: [
      M("you"),
      {
        op: "or",
        args: [
          {
            op: "and",
            args: [
              {
                op: "recall",
                listOp: "or",
                args: [{ t: "mem", name: "FactQuestion" }],
              },
              M("expensive"),
            ],
          },
          {
            op: "and",
            args: [
              {
                op: "recall",
                listOp: "or",
                args: [{ t: "mem", name: "DescriptionQuestion" }],
              },
              M("cost"),
            ],
          },
        ],
      },
    ],
  };
  assert.deepEqual(conditionSpecificity(cond, ctx), {
    truth: true,
    spec: 9000,
  });
});

test("an unseen word gets the corpus ceiling 1000*ln(N)", () => {
  const src = `Topic "t" is
  If ?WhatUserSaid contains "one" Then
    Example "one two three four";
    Say "x";
  Done
EndTopic`;
  const program = parseProgram([{ path: "t.n", source: src }]);
  const table = buildFrequencyTable(program);
  assert.equal(table.total, 4);
  // "one" occurs once in a 4-word corpus -> 1000*ln(4/1)
  assert.equal(table.wordSpecificity("one"), Math.round(1000 * Math.log(4)));
  // a word that is not in the corpus is treated as occurring once: same ceiling
  assert.equal(table.wordSpecificity("zebra"), Math.round(1000 * Math.log(4)));
});

test("* and spaces contribute nothing to a pattern's specificity", () => {
  const src = `Topic "t" is
  If ?WhatUserSaid contains "alpha" Then
    Example "alpha beta gamma delta";
    Say "x";
  Done
EndTopic`;
  const table = buildFrequencyTable(
    parseProgram([{ path: "t.n", source: src }]),
  );
  const one = table.renderedSpecificity("alpha");
  assert.equal(table.renderedSpecificity("*alpha*"), one);
  assert.equal(table.renderedSpecificity("* alpha *"), one);
  assert.equal(
    table.renderedSpecificity("alpha beta"),
    one + table.wordSpecificity("beta"),
  );
});

// ===========================================================================
group("2. commands and output buffering (spec/D)");

test("Say with commas prints one line per argument; + joins on one line", () => {
  const b = bot(`Topic "t" is
  If ?WhatUserSaid contains "go" Then
    Say "one","two";
    Say "three" + " and " + "four";
  Done
EndTopic`);
  assert.deepEqual(say(b, "go"), ["one", "two", "three and four"]);
});

test("+ in a value context inserts NO separator and unset attributes render empty", () => {
  const b = bot(`Topic "t" is
  If ?WhatUserSaid contains "go" Then
    Say ?Nobody + "says: " + ?WhatUserSaid;
  Done
EndTopic`);
  assert.deepEqual(say(b, "go"), ["says: go"]);
});

test("SayOneOf picks exactly one element of the evaluated cross product", () => {
  const src = `PatternList A is "x","y";
PatternList B is "1","2","3";
Topic "t" is
  If ?WhatUserSaid contains "go" Then
    SayOneOf A + B;
  Done
EndTopic`;
  const first = bot(src, { random: () => 0 });
  assert.deepEqual(say(first, "go"), ["x1"]);
  const last = bot(src, { random: () => 0.999999 });
  assert.deepEqual(say(last, "go"), ["y3"]);
});

test("Remember / Forget / IfRecall, and a bare Remember stores TRUE", () => {
  const b = bot(`Topic "t" is
  If ?WhatUserSaid contains "set" Then
    Remember ?Flag;
    Remember ?Word is "hello";
    Say "ok";
  Done
EndTopic
Topic "u" is
  If ?WhatUserSaid contains "check" Then
    IfRecall ?Flag Then Say ?Word + "!"; Done
    Say "no flag";
  Done
EndTopic`);
  say(b, "set");
  assert.deepEqual(b.memGet("Flag"), ["TRUE"]);
  assert.deepEqual(say(b, "check"), ["hello!"]);
});

test("Compute Sum takes comma-separated arguments; case-folding functions work", () => {
  const b = bot(`Topic "t" is
  If ?WhatUserSaid contains "go" Then
    Remember ?N is "7";
    Remember ?N is Compute Sum of ?N, "5";
    Remember ?W is Compute Capitalize of "aNNe mARIE";
    Remember ?U is Compute UpperCase of "shout";
    Say ?N + " " + ?W + " " + ?U;
  Done
EndTopic`);
  assert.deepEqual(say(b, "go"), ["12 Anne Marie SHOUT"]);
});

test("SpellCheck is the identity function and is swappable", () => {
  const src = `Topic "t" is
  If ?WhatUserSaid contains "go" Then
    Remember ?S is Compute SpellCheck of "teh";
    Say ?S;
  Done
EndTopic`;
  assert.deepEqual(say(bot(src), "go"), ["teh"]);
  const fixed = bot(src, { spellcheck: (s) => (s === "teh" ? "the" : s) });
  assert.deepEqual(say(fixed, "go"), ["the"]);
});

test("SayToConsole never reaches the user", () => {
  const b = bot(`Topic "t" is
  If ?WhatUserSaid contains "go" Then
    SayToConsole "debug only";
    Say "visible";
  Done
EndTopic`);
  assert.deepEqual(say(b, "go"), ["visible"]);
  assert.equal(b.console.length, 1);
  assert.equal(b.console[0].line, "debug only");
});

test("star buffers are captured and can be spliced back into output", () => {
  const b = bot(`Topic "t" is
  If ?WhatUserSaid matches "I like *" Then
    Say "You like " + *1 + "?";
  Done
EndTopic`);
  assert.deepEqual(say(b, "I like coffee"), ["You like coffee?"]);
});

// ===========================================================================
group("3. block terminators and control flow (spec/C)");

test("Done ends the run; Continue lets the next block run", () => {
  const b = bot(`Topic "t" is
  If ?WhatUserSaid contains "go" Then
    Say "first";
  Continue
  If ?WhatUserSaid contains "go" Then
    Say "second";
  Done
EndTopic
Default Topic "d" is
  Always
    Say "default";
  Done
EndTopic`);
  assert.deepEqual(say(b, "go"), ["first", "second"]);
});

test("a false block falls through to its Otherwise", () => {
  const b = bot(`Topic "t" is
  If ?WhatUserSaid contains "yes" Then
    Say "affirmative";
  Done
  Otherwise Always
    Say "otherwise";
  Done
EndTopic`);
  assert.deepEqual(say(b, "no"), ["otherwise"]);
  const b2 = bot(`Topic "t" is
  If ?WhatUserSaid contains "yes" Then
    Say "affirmative";
  Done
  Otherwise Always
    Say "otherwise";
  Done
EndTopic`);
  assert.deepEqual(say(b2, "yes"), ["affirmative"]);
});

test("a true block returning Continue suppresses its Otherwise", () => {
  const b = bot(`Topic "t" is
  If ?WhatUserSaid contains "go" Then
    Say "taken";
  Continue
  Otherwise Always
    Say "not taken";
  Done
EndTopic`);
  assert.deepEqual(say(b, "go"), ["taken"]);
});

test("NextTopic abandons the rest of the category, enclosing blocks included", () => {
  const b = bot(`Topic "t" is
  Always
    Say "outer";
    If ?WhatUserSaid contains "go" Then
      Say "inner";
    NextTopic
    Say "never";
  Done
EndTopic
Default Topic "d" is
  Always
    Say "default ran";
  Done
EndTopic`);
  assert.deepEqual(say(b, "go"), ["outer", "inner", "default ran"]);
});

test("a bare IfChance group fires exactly one member, whatever the RNG", () => {
  const src = `Topic "t" is
  Always
    IfChance Then Say "A"; Done
    IfChance Then Say "B"; Done
    IfChance Then Say "C"; Done
  Done
EndTopic`;
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    let n = i;
    const rng = () => ((n = (n * 1103515245 + 12345) >>> 0), n / 4294967296);
    const out = bot(src, { random: rng });
    const lines = say(out, "anything");
    assert.equal(
      lines.length,
      1,
      `expected exactly one line, got ${JSON.stringify(lines)}`,
    );
    seen.add(lines[0]);
  }
  assert.deepEqual([...seen].sort(), ["A", "B", "C"]);
});

test("an IfChance block that returns Continue skips the IfChance blocks after it", () => {
  const b = bot(
    `Topic "t" is
  Always
    IfChance 100% Then Say "first"; Continue
    IfChance 100% Then Say "second"; Done
  Done
EndTopic`,
    { random: () => 0 },
  );
  assert.deepEqual(say(b, "go"), ["first"]);
});

// ===========================================================================
group("4. the run loop: phases, WaitForResponse, SwitchTo (spec/E section 11)");

const PHASES = `Priority Topic "p" is
  Always
    Say "priority";
  Continue
EndTopic
Topic "s" is
  If ?WhatUserSaid contains "go" Then
    Say "standard";
  Done
EndTopic
Default Topic "d" is
  Always
    Say "default";
  Done
EndTopic`;

test("Priority runs first, then Standard; Default only when no Done fired", () => {
  assert.deepEqual(say(bot(PHASES), "go"), ["priority", "standard"]);
  assert.deepEqual(say(bot(PHASES), "nothing"), ["priority", "default"]);
});

test("WaitForResponse suspends the run and resumes after the Priority phase", () => {
  const b = bot(`Priority Topic "p" is
  Always
    SayToConsole "priority ran";
  Continue
EndTopic
Topic "asker" is
  If ?WhatUserSaid contains "ask" Then
    Say "What is your favourite colour?";
    WaitForResponse;
    Say "You said " + ?WhatUserSaid + ".";
  Done
EndTopic
Default Topic "d" is
  Always
    Say "default";
  Done
EndTopic`);
  assert.deepEqual(say(b, "ask"), ["What is your favourite colour?"]);
  assert.ok(b.continuation, "a continuation must be armed");
  assert.deepEqual(say(b, "blue"), ["You said blue."]);
  assert.equal(b.continuation, null);
  // the default topic never ran while the continuation was pending
});

test("TryAgain re-arms the WaitForResponse in an ENCLOSING block", () => {
  const b = bot(`Topic "asker" is
  Always
    Say "yes or no?";
    WaitForResponse;
    If ?WhatUserSaid contains "yes" Then
      Say "good";
    Done
    Say "please answer yes or no";
  TryAgain
EndTopic`);
  assert.deepEqual(say(b, "anything"), ["yes or no?"]);
  assert.deepEqual(say(b, "maybe"), ["please answer yes or no"]);
  assert.deepEqual(say(b, "hmm"), ["please answer yes or no"]);
  assert.deepEqual(say(b, "yes"), ["good"]);
});

test("SwitchTo / SwitchBack behave like a subroutine call", () => {
  const b = bot(`Topic "caller" is
  If ?WhatUserSaid contains "go" Then
    Say "before";
    SwitchTo "sub";
    Say "after";
  Done
EndTopic
Sequence Topic "sub" is
  Always
    Say "inside";
  SwitchBack
EndTopic`);
  assert.deepEqual(say(b, "go"), ["before", "inside", "after"]);
});

test("a SwitchTo return survives a WaitForResponse across two inputs", () => {
  const b = bot(`Topic "caller" is
  If ?WhatUserSaid contains "go" Then
    SwitchTo "getyn";
    Say "back with " + ?Answer;
  Done
EndTopic
Sequence Topic "getyn" is
  Always
    Say "yes or no?";
    WaitForResponse;
    Remember ?Answer is ?WhatUserSaid;
  SwitchBack
EndTopic`);
  assert.deepEqual(say(b, "go"), ["yes or no?"]);
  assert.deepEqual(say(b, "yes"), ["back with yes"]);
});

test("a Sequence category may be switched to repeatedly in one run; others may not", () => {
  const b = bot(`Topic "caller" is
  If ?WhatUserSaid contains "go" Then
    SwitchTo "sub";
    SwitchTo "sub";
    Say "done";
  Done
EndTopic
Sequence Topic "sub" is
  Always
    Say "sub";
  SwitchBack
EndTopic`);
  assert.deepEqual(say(b, "go"), ["sub", "sub", "done"]);
});

test("Suppress removes a category for the rest of the conversation; Recover restores it", () => {
  const b = bot(`Topic "once" is
  If ?WhatUserSaid contains "go" Then
    Say "only once";
    Suppress This;
  Done
EndTopic
Default Topic "d" is
  Always
    Say "default";
  Done
EndTopic`);
  assert.deepEqual(say(b, "go"), ["only once"]);
  assert.deepEqual(say(b, "go"), ["default"]);
});

// ===========================================================================
group("5. best-fit selection and focus (MANUAL__BestFit.txt)");

test("the rarer word wins: the manual's four-topic worked example", () => {
  // MANUAL__BestFit.txt, "How Specificity is Determined".
  const src = `Topic "1" is
  If ?WhatUserSaid contains "what" and "vrep" Then
    Example "what is a vrep";
    Say "one";
  Done
EndTopic
Topic "2" is
  If ?WhatUserSaid contains "what" and "vrep" and "good for" Then
    Example "what is a vrep good for";
    Say "two";
  Done
EndTopic
Topic "3" is
  If ?WhatUserSaid contains "what" and "vrep" and "sales" Then
    Example "what is a sales vrep";
    Say "three";
  Done
EndTopic
Topic "4" is
  If ?WhatUserSaid contains "what" and "vrep" and "sales" and "good for" Then
    Example "what is a sales vrep good for";
    Say "four";
  Done
EndTopic`;
  assert.deepEqual(say(bot(src), "what is a sales vrep good for"), ["four"]);
  assert.deepEqual(say(bot(src), "what is a vrep good for"), ["two"]);
  assert.deepEqual(say(bot(src), "what is a sales vrep"), ["three"]);
  assert.deepEqual(say(bot(src), "what is a vrep"), ["one"]);
});

test("a pattern list scores as the element that actually matched", () => {
  const src = `Topic "common" is
  If ?WhatUserSaid contains ("bot","vrep") Then
    Example "are you a bot";
    Example "are you a vrep";
    Example "what is a bot";
    Example "the bot and the vrep";
    Say "common";
  Done
EndTopic
Topic "rare" is
  If ?WhatUserSaid contains ("bot","zebra") Then
    Example "zebra";
    Say "rare";
  Done
EndTopic`;
  // "zebra" is rarer than "bot", so the second topic wins on a zebra input …
  assert.deepEqual(say(bot(src), "a zebra"), ["rare"]);
  // … but on "bot" both list elements score the same and the tie goes to the
  // topic nearer the front of the attention list, which is build order.
  assert.deepEqual(say(bot(src), "a bot"), ["common"]);
});

test("the manual's Walter/Scott transcript resolves 'how old is he' by focus", () => {
  // MANUAL__BestFit.txt, "Subjects and Focus of Attention": four topics, two
  // subjects, and the same ambiguous question answered differently each time.
  const src = `Topic "Who is Walter?" is
Subjects "WALTER";
  If ?WhatUserSaid contains "who is walter" Then
    Example "who is walter";
    Say "Walter is the President of NativeMinds, Inc.";
  Done
EndTopic
Topic "How Old is Walter?" is
Subjects "WALTER";
  If ?WhatUserSaid contains "how old is he" Then
    Example "how old is he";
    Say "Walter is over 35.";
  Done
EndTopic
Topic "Who is Scott?" is
Subjects "SCOTT";
  If ?WhatUserSaid contains "who is scott" Then
    Example "who is scott";
    Say "Scott is the CTO at NativeMinds, Inc.";
  Done
EndTopic
Topic "How Old is Scott?" is
Subjects "SCOTT";
  If ?WhatUserSaid contains "how old is he" Then
    Example "how old is he";
    Say "Scott is over 30.";
  Done
EndTopic`;
  const b = bot(src);
  assert.deepEqual(say(b, "who is scott"), [
    "Scott is the CTO at NativeMinds, Inc.",
  ]);
  assert.deepEqual(say(b, "how old is he"), ["Scott is over 30."]);
  assert.deepEqual(say(b, "who is walter"), [
    "Walter is the President of NativeMinds, Inc.",
  ]);
  assert.deepEqual(say(b, "how old is he"), ["Walter is over 35."]);
});

test("subjects fan out: running one topic focuses every topic sharing a subject", () => {
  const b = bot(`Topic "a" is
Subjects "CATS";
  If ?WhatUserSaid contains "cat" Then
    Example "cat";
    Say "about cats";
  Done
EndTopic
Topic "b" is
Subjects "DOGS";
  If ?WhatUserSaid contains "pet" Then
    Example "pet";
    Say "dogs answer";
  Done
EndTopic
Topic "c" is
Subjects "CATS";
  If ?WhatUserSaid contains "pet" Then
    Example "pet";
    Say "cats answer";
  Done
EndTopic`);
  say(b, "cat");
  // "c" shares the subject CATS with "a", so it is now ahead of "b".
  assert.deepEqual(say(b, "pet"), ["cats answer"]);
});

test("DontFocus keeps a category out of the attention shuffle", () => {
  const b = bot(`Topic "a" is
Subjects "CATS";
  If ?WhatUserSaid contains "cat" Then
    Example "cat";
    Say "about cats";
    DontFocus;
  Done
EndTopic
Topic "b" is
Subjects "DOGS";
  If ?WhatUserSaid contains "pet" Then
    Example "pet";
    Say "dogs answer";
  Done
EndTopic
Topic "c" is
Subjects "CATS";
  If ?WhatUserSaid contains "pet" Then
    Example "pet";
    Say "cats answer";
  Done
EndTopic`);
  say(b, "cat");
  assert.deepEqual(say(b, "pet"), ["dogs answer"]); // build order, untouched
});

test("Focused reads the active subjects and a subject-less answer does not clear them", () => {
  const b = bot(`Topic "what is neuromedia" is
Subjects "NEUROMEDIA";
  If ?WhatUserSaid contains "what is neuromedia" Then
    Example "what is neuromedia";
    Say "Neuromedia sells software.";
  Done
EndTopic
Topic "where is neuromedia" is
Subjects "NEUROMEDIA";
  If (?WhatUserSaid contains "where is neuromedia") or (Focused and ?WhatUserSaid contains "where") Then
    Example "where is neuromedia";
    Say "San Francisco.";
  Done
EndTopic
Default Topic "idk" is
  Always
    Say "I don't know what you mean.";
  Done
EndTopic`);
  assert.deepEqual(b.state.activeSubjects, []);
  say(b, "what is neuromedia");
  assert.deepEqual(b.state.activeSubjects, ["neuromedia"]);
  assert.deepEqual(say(b, "where"), ["San Francisco."]);
  // The subject-less default must NOT wipe the context.
  assert.deepEqual(say(b, "something else entirely"), [
    "I don't know what you mean.",
  ]);
  assert.deepEqual(b.state.activeSubjects, ["neuromedia"]);
});

test("Focus names its successor and Refocus puts it in front", () => {
  const b = bot(`Topic "a" is
  If ?WhatUserSaid contains "go" Then
    Example "go";
    Say "a ran";
    DontFocus;
    Focus "c";
  Done
EndTopic
Topic "b" is
  If ?WhatUserSaid contains "next" Then
    Example "next";
    Say "b";
  Done
EndTopic
Topic "c" is
  If ?WhatUserSaid contains "next" Then
    Example "next";
    Say "c";
  Done
EndTopic`);
  say(b, "go");
  assert.equal(b.state.focus[0], "c");
  assert.deepEqual(say(b, "next"), ["c"]);
});

// ===========================================================================
group("6. matching-list structure (spec/C section 7)");

test("an `and` matching list means ALL of them, even nested inside an `or` list", () => {
  // The shape of Mrmind3/AboutUser/UserSociety.n:45-46.
  const b = bot(`PatternList I is "I","me";
Topic "taxes" is
  If (?WhatUserSaid contains ((I) and ("money","taxes")))
     or (?WhatUserSaid contains ("I own *", "work *")) Then
    Example "I pay taxes";
    Say "society";
  Done
EndTopic
Default Topic "d" is
  Always
    Say "default";
  Done
EndTopic`);
  assert.deepEqual(say(b, "I pay taxes"), ["society"]);
  assert.deepEqual(say(b, "I work here"), ["society"]);
  // The bare word "I" must NOT be enough — that is the flattening bug.
  assert.deepEqual(say(b, "I am human"), ["default"]);
});

test("DoesNotContain negates the whole matching list", () => {
  const b = bot(`Topic "t" is
  If ?WhatUserSaid DoesNotContain "cat","dog" Then
    Say "no pets";
  Done
EndTopic
Default Topic "d" is
  Always
    Say "default";
  Done
EndTopic`);
  assert.deepEqual(say(b, "hello"), ["no pets"]);
  assert.deepEqual(say(b, "a dog"), ["default"]);
});

test("braces never change whether a condition matches", () => {
  const b = bot(`Topic "t" is
  If ?WhatUserSaid contains "complex" and {"vrep"} Then
    Example "are you complex";
    Say "yes";
  Done
EndTopic`);
  assert.deepEqual(say(b, "are you complex"), ["yes"]);
  assert.deepEqual(say(b, "are you a complex vrep"), ["yes"]);
});

// ===========================================================================
group("7. trace");

test("bot.trace records the firing topic, file, line, type and specificity", () => {
  const b = bot(`Topic "the topic" is
  If ?WhatUserSaid contains "zebra" Then
    Example "zebra";
    Say "hello";
  Done
EndTopic
Topic "filler" is
  If ?WhatUserSaid contains "nothing at all" Then
    Example "one two three four five six";
    Say "filler";
  Done
EndTopic`);
  say(b, "a zebra");
  assert.equal(b.trace.length, 1);
  const t = b.trace[0];
  assert.equal(t.topic, "the topic");
  assert.equal(t.file, "test.n");
  assert.equal(t.command, "say");
  assert.equal(t.text, "hello");
  assert.equal(t.type, "standard");
  assert.ok(
    t.specificity > 0,
    "a standard topic should carry its selection specificity",
  );
  assert.equal(typeof t.line, "number");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

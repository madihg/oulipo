// engine/test/parser.test.mjs
//
// Unit tests over hand-written snippets, plus a full-corpus smoke test over the
// 49 files of the shipped MRMIND3 build.
//
// Run:  node engine/test/parser.test.mjs
//
// Every corpus expectation below is an INDEPENDENT number taken from the census
// documents (spec/A-lexical-and-structure.md, spec/C-conditions.md), not from
// this parser's own output.  The citation is on each assertion.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tokenize } from "../src/lexer.js";
import { parse, parseProgram } from "../src/parser.js";
import { loadProject } from "../src/loader.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const VSR = join(
  HERE,
  "..",
  "..",
  "archive/1_NeuroServer_fromVaio_MrMind/NeuroScript/Mrmind3/MRMIND3.vsr",
);

let passed = 0;
const failures = [];
let group = "";

function suite(name) {
  group = name;
}
function ok(cond, label) {
  if (cond) {
    passed++;
    return;
  }
  failures.push(`${group} :: ${label}`);
}
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    return;
  }
  failures.push(
    `${group} :: ${label}\n      expected ${e}\n      actual   ${a}`,
  );
}

// ===========================================================================
// 1. Lexer
// ===========================================================================
suite("lexer");

{
  const t = tokenize('"hello"');
  eq(t[0].type, "string", "string token type");
  eq(t[0].value, "hello", "string value");
}

// [A §4.2] '\"' collapses to '"'; EVERY other backslash keeps both characters.
{
  const t = tokenize(
    '"humans didn\'t \\"think\\" about" "\\." "#\\\'s" "C:\\Program Files\\NativeMinds"',
  );
  eq(t[0].value, 'humans didn\'t "think" about', "escaped quote collapses");
  eq(t[1].value, "\\.", "backslash-dot keeps both characters");
  eq(t[2].value, "#\\'s", "backslash-apostrophe keeps both characters");
  eq(
    t[3].value,
    "C:\\Program Files\\NativeMinds",
    "windows path survives verbatim",
  );
}

// [A §3.2] '//' inside a string literal is not a comment.
{
  const t = tokenize(
    '"http://www.nativeminds.com" // trailing comment\n"after"',
  );
  eq(t.length, 3, "two strings plus eof");
  eq(t[0].value, "http://www.nativeminds.com", "url survives");
  eq(t[1].value, "after", "comment consumed to end of line only");
}

// [A §1.2] CRLF is whitespace; line numbers count LF.
{
  const t = tokenize('Say\r\n"x";\r\n');
  eq(t[0].line, 1, "first token on line 1");
  eq(t[1].line, 2, "second token on line 2");
}

// [A §1.1] latin-1 bytes pass through untouched.
{
  const t = tokenize('"Paul Val\u00e9ry"');
  eq(t[0].value, "Paul Val\u00e9ry", "e-acute preserved");
}

// [A §5.2] memref names may contain and begin with digits.
{
  const t = tokenize("?20QAns ?StdP.DoneStrippingPunctuation");
  eq([t[0].type, t[0].value], ["memref", "20QAns"], "digit-leading memref");
  eq(t[1].value, "StdP.DoneStrippingPunctuation", "dotted memref is one token");
}

// [A §5.1] dots and underscores are name characters, not operators.
{
  const t = tokenize("StdP.QuestionStarts STDN_RESPONSETOREFUSAL");
  eq(t[0].value, "StdP.QuestionStarts", "dotted symbol is one token");
  eq(t[1].value, "STDN_RESPONSETOREFUSAL", "underscored symbol is one token");
}

// [A §5.3] star buffers are single tokens.
{
  const t = tokenize("*1 #1 ^2 %1 *Match *match");
  eq(
    t.map((x) => x.type).slice(0, 6),
    ["star", "star", "star", "star", "starmatch", "starmatch"],
    "star token types",
  );
  eq([t[0].value.sigil, t[0].value.n], ["*", 1], "*1");
  eq([t[2].value.sigil, t[2].value.n], ["^", 2], "^2");
}

// [A §5.4] numbers: integer, decimal, percent.
{
  const t = tokenize("3000 0.90 33%");
  eq([t[0].value, t[0].percent], [3000, false], "integer");
  eq([t[1].value, t[1].percent], [0.9, false], "decimal");
  eq([t[2].value, t[2].percent], [33, true], "percent");
}

// [A §11.5] a lone '/' before a keyword is discarded, as the original did.
{
  const t = tokenize('/Topic "Are bots smart" is');
  eq(t[0].lower, "topic", "stray slash skipped");
}

// [A §4.4] the empty string is a real literal.
{
  const t = tokenize('""');
  eq([t[0].type, t[0].value], ["string", ""], "empty string literal");
}

// ===========================================================================
// 2. Top-level declarations
// ===========================================================================
suite("declarations");

{
  const p = parse('PatternList MOTHER is "Mom","Ma","mother"\n;');
  eq(p.parseWarnings.length, 0, "no warnings");
  eq(p.definitions[0].kind, "patternlist", "kind");
  eq(p.definitions[0].name, "MOTHER", "name");
  eq(
    p.definitions[0].value,
    {
      t: "list",
      op: "or",
      args: [
        { t: "string", v: "Mom" },
        { t: "string", v: "Ma" },
        { t: "string", v: "mother" },
      ],
    },
    "comma-separated body is an OR list",
  );
}

// [A §8.1] a list element may be another list, and may use '+'.
{
  const p = parse('PatternList INSULT is "eat " + I,"idiot#";');
  eq(
    p.definitions[0].value.args[0],
    {
      t: "concat",
      args: [
        { t: "string", v: "eat " },
        { t: "symbol", name: "I" },
      ],
    },
    "'+' builds a concat with a symbol reference",
  );
}

// [A §8.1] parenthesised sub-alternatives and '""'.
{
  const p = parse('PatternList X is ("a","b")+"c", "";');
  eq(
    p.definitions[0].value.args[0].args[0],
    {
      t: "list",
      op: "or",
      args: [
        { t: "string", v: "a" },
        { t: "string", v: "b" },
      ],
    },
    "parenthesised group is a nested list",
  );
  eq(
    p.definitions[0].value.args[1],
    { t: "string", v: "" },
    "empty-string element",
  );
}

// [A §8.2] Pattern is PatternList with one element.
{
  const p = parse('Pattern SDeb.LIVEDEBUGGING is "";');
  eq(p.definitions[0].kind, "pattern", "Pattern kind");
  eq(p.definitions[0].value, { t: "string", v: "" }, "single element");
}

// [A §8.3] Attribute ... Specificity N.
{
  const p = parse("Attribute ?WhoQuestion Specificity 5000;\nAttribute ?Bare;");
  eq(p.attributes.whoquestion, 5000, "declared specificity");
  eq(p.attributes.bare, 2000, "bare Attribute defaults to 2000");
}

// [A §8.4] the three OtherExamples guard forms.
{
  const p = parse(`
    OtherExamples of "I am a human by choice." are "I chose to be human";
    OtherExamples of "I'm not a human by choice."
        Whenfocused are "No.";
    OtherExamples of "How do you facilitate online sales?"
        When ?WhatRobotSaid is "I facilitate online sales" are "How?";
  `);
  eq(p.parseWarnings.length, 0, "no warnings");
  eq(p.otherExamples.length, 3, "three declarations");
  eq(p.otherExamples[0].guard, null, "plain guard");
  eq(p.otherExamples[1].guard, { kind: "whenfocused" }, "WhenFocused guard");
  eq(p.otherExamples[2].guard.kind, "when", "When guard");
  eq(
    p.otherExamples[2].guard.tests[0].mem.name,
    "WhatRobotSaid",
    "When guard memref",
  );
  eq(
    p.otherExamples[2].args,
    { t: "string", v: "How?" },
    'When guard stops before "are"',
  );
}

// [A §8.4] the OtherExamples right-hand side is a full PatList.
{
  const p = parse(
    'OtherExamples of "Can I use you?" are "Can I use "+MYNAME+"?";',
  );
  eq(p.otherExamples[0].args.t, "concat", "RHS may concatenate");
}

// ===========================================================================
// 3. Categories
// ===========================================================================
suite("categories");

{
  const p = parse(`
Topic "Why did the chicken cross the road?" is
Subjects "JOKES";
	If ?ReasonQuestion Contains "chicken cross*road" Then
		Remember ?UserHasClaimedHumor;
//		SwitchTo "show gif";
		Example "Why did the chicken cross the road?";
		Say "..to get away from the humans.";
	Done
EndTopic`);
  eq(p.parseWarnings.length, 0, "no warnings");
  const c = p.categories[0];
  eq(
    [c.kind, c.type, c.suppressed],
    ["topic", "standard", false],
    "plain topic",
  );
  eq(c.name, "Why did the chicken cross the road?", "name");
  eq(c.subjects, ["JOKES"], "subjects");
  eq(c.blocks.length, 1, "one block");
  eq(c.blocks[0].end, "done", "terminator");
  eq(
    c.blocks[0].body.map((x) => x.c),
    ["remember", "example", "say"],
    "commented-out SwitchTo is not a command",
  );
}

{
  const p = parse(`
Priority Scenario "Reconnect" is
	If ?WhatUserDid Contains "Web RECONNECT" Then
		Remember ?SayPageTemplate is STDW_SayPageTemplate;
		SayOneOf STDW_RECONNECTLINES;
	Done
EndScenario`);
  eq(
    [p.categories[0].kind, p.categories[0].type],
    ["scenario", "priority"],
    "Priority Scenario",
  );
}

// [A §8.5] the four modifiers, plus the unused-but-legal `Suppressed`.
{
  const p = parse(`
Sequence Topic "a" is Always Continue EndTopic
Default topic "b" is Always Continue EndTopic
Suppressed Priority Topic "c" is Always Continue EndTopic`);
  eq(
    p.categories.map((c) => c.type),
    ["sequence", "default", "priority"],
    "modifiers",
  );
  eq(
    p.categories.map((c) => c.suppressed),
    [false, false, true],
    "Suppressed flag",
  );
}

// MemoryLock at category level.
{
  const p = parse('Topic "x" is MemoryLock ?a, ?b; Always Continue EndTopic');
  eq(p.categories[0].memoryLocks, ["a", "b"], "MemoryLock list");
}

// ===========================================================================
// 4. Conditions
// ===========================================================================
suite("conditions");

const condOf = (src) => parse(src).categories[0].blocks[0].condition;
const wrap = (cond) => `Topic "t" is\n${cond}\nDone\nEndTopic`;

// [C §6.1] Always is never followed by Then.
eq(condOf(wrap("Always")), { op: "always" }, "Always");

// [C §6.4] Heard L === ?WhatUserMeant Contains L.
eq(
  condOf(wrap('If heard "hi" Then')),
  {
    op: "match",
    lhs: { t: "mem", name: "WhatUserMeant", user: null },
    test: "contains",
    negated: false,
    rhs: { t: "string", v: "hi" },
  },
  "Heard desugars to ?WhatUserMeant Contains",
);

eq(
  condOf(wrap('If notheard "about" Then')).negated,
  true,
  "NotHeard is negated Contains",
);

// [C §6.3] the six match keywords.
eq(
  condOf(wrap('If ?X DoesNotMatch "a" Then')),
  {
    op: "match",
    lhs: { t: "mem", name: "X", user: null },
    test: "matches",
    negated: true,
    rhs: { t: "string", v: "a" },
  },
  "DoesNotMatch = matches + negated",
);
eq(
  condOf(wrap("If ?X ExactlyMatches GRINNIES Then")).test,
  "exactlymatches",
  "ExactlyMatches",
);
eq(
  condOf(wrap('If ?X DoesNotContain "a" Then')),
  {
    op: "match",
    lhs: { t: "mem", name: "X", user: null },
    test: "contains",
    negated: true,
    rhs: { t: "string", v: "a" },
  },
  "DoesNotContain",
);

// [C §6.5] Recall list operators: comma is OR, and is AND.
eq(
  condOf(wrap("If Recall ?a, ?b Then")),
  {
    op: "recall",
    args: [
      { t: "mem", name: "a", user: null },
      { t: "mem", name: "b", user: null },
    ],
    listOp: "or",
    negated: false,
  },
  "Recall ?a, ?b is an OR list",
);
eq(
  condOf(wrap("If Recall ?a and ?b Then")).listOp,
  "and",
  "Recall ?a and ?b is an AND list",
);
eq(
  condOf(wrap("If DontRecall ?a Then")).negated,
  true,
  "DontRecall is negated",
);
eq(
  condOf(wrap("IfDontRecall ?20questions Then")).negated,
  true,
  "IfDontRecall head",
);

// [C §6.6] IfChance with a decimal, a percentage, and nothing.
eq(
  condOf(wrap("IfChance 0.90 Then")),
  { op: "chance", p: 0.9 },
  "IfChance decimal",
);
eq(
  condOf(wrap("IfChance 80% Then")),
  { op: "chance", p: 0.8 },
  "IfChance percent normalised",
);
eq(condOf(wrap("IfChance Then")), { op: "chance", p: null }, "bare IfChance");

// [C §6.6] Chance as a CLAUSE combined with an IfRecall head (WebNameGreet.n:66).
eq(
  condOf(wrap("IfRecall ?HaveName\nAND Chance 60%\nThen")),
  {
    op: "and",
    args: [
      {
        op: "recall",
        args: [{ t: "mem", name: "HaveName", user: null }],
        listOp: "or",
        negated: false,
      },
      { op: "chance", p: 0.6 },
    ],
  },
  "IfRecall head with a ClauseTail",
);

// [C §6.8/§6.9] Focused, and IfFocused as its exact synonym.
eq(condOf(wrap("If Focused then")), { op: "focused" }, "Focused");
eq(
  condOf(wrap("If (IfFocused and Heard ALIST) then")).args[0],
  { op: "focused" },
  "IfFocused is a synonym of Focused",
);

// [C §7.1] '&' is a conjunction, not a concatenation (Answers.n:285).
eq(
  condOf(wrap('If ?DescriptionQuestion contains (YOU & "think") Then')).rhs,
  {
    t: "list",
    op: "and",
    args: [
      { t: "symbol", name: "YOU" },
      { t: "string", v: "think" },
    ],
  },
  "'&' joins matching-list elements with AND",
);

// [C §7.3] `and not` inside a positive matching list.
eq(
  condOf(
    wrap(
      "IfHeard StdResponse.Affirmative AND NOT StdResponse.AffirmativeException Then",
    ),
  ).rhs,
  {
    t: "list",
    op: "and",
    args: [
      { t: "symbol", name: "StdResponse.Affirmative" },
      {
        t: "not",
        arg: { t: "symbol", name: "StdResponse.AffirmativeException" },
      },
    ],
  },
  "'and not' negates one list element",
);

// [C §7.4](a) braces mark an element optional and never change truth.
eq(
  condOf(wrap("If heard {MRMIND} Then")).rhs,
  { t: "optional", op: "or", args: [{ t: "symbol", name: "MRMIND" }] },
  "optional pattern element",
);

// [C §7.4](b) a brace-wrapped clause (1 occurrence in the whole archive).
eq(
  condOf(wrap('If ?a contains "x" and {?WhatRobotSaid contains "y"} Then'))
    .args[1].op,
  "optional",
  "brace-wrapped clause",
);

// [C §6.3] `"" DoesNotMatch <list>` — a bracket group is NOT always a clause group.
eq(
  condOf(wrap('If ("" DoesNotMatch STDX.RESPONSE_TO_SEXUAL) Then')).op,
  "match",
  "parenthesised clause containing a match keyword",
);
eq(
  condOf(wrap('If (YOU,MRMIND) contains "x" Then')).lhs.t,
  "list",
  "parenthesised group followed by a match keyword is the LHS, not a clause group",
);

// ---- [C §5.1] the level ambiguity: `and`/`or`/`,` join clauses AND list elements
suite("conditions / §5.1 ambiguity");

// Case 1 (Bots.n:3-4): SMARTWORD is a pattern-list name, so it stays in Heard's list.
{
  const c = condOf(
    wrap("If Recall ?FactQuestion and Heard (BOTS, YOU) and SMARTWORD \nThen"),
  );
  eq(c.op, "and", "two clauses");
  eq(c.args.length, 2, "exactly two clauses, not three");
  eq(
    c.args[1].rhs,
    {
      t: "list",
      op: "and",
      args: [
        {
          t: "list",
          op: "or",
          args: [
            { t: "symbol", name: "BOTS" },
            { t: "symbol", name: "YOU" },
          ],
        },
        { t: "symbol", name: "SMARTWORD" },
      ],
    },
    "Heard's list is (BOTS, YOU) and SMARTWORD",
  );
}

// Case 2 (WebNameGreet.n:789-790): `and Recall` and `and Heard` each start a clause.
{
  const c = condOf(
    wrap(
      'If Heard ("you","U","Yoursel#") and Recall ?CanQuestion, ?DescriptionQuestion, ?FactQuestion and \n' +
        '\tHeard "tell me*my name" Then',
    ),
  );
  eq(c.op, "and", "and-joined");
  eq(c.args.length, 3, "three clauses");
  eq(c.args[0].rhs.args.length, 3, "first Heard's list has three elements");
  eq(
    c.args[1].args.length,
    3,
    "Recall's mem list has three elements (commas are OR)",
  );
  eq(c.args[1].listOp, "or", "commas in a Recall list are OR");
  eq(
    c.args[2].rhs,
    { t: "string", v: "tell me*my name" },
    "trailing Heard clause",
  );
}

// A match keyword after the operand hands the operator back to the clause level.
{
  const c = condOf(wrap('If Heard "a" and ?X contains "b" Then'));
  eq(c.args.length, 2, "two clauses, not one Heard list of two");
  eq(c.args[1].lhs.name, "X", "second clause is the match");
}

// [C §7.2] no precedence: a level's first operator fixes the level.
{
  const c = condOf(
    wrap('If (?a contains "1") or (?b contains "2") or (?c contains "3") Then'),
  );
  eq([c.op, c.args.length], ["or", 3], "flat OR of three clause groups");
}

// ===========================================================================
// 5. Blocks, terminators, Otherwise
// ===========================================================================
suite("blocks");

{
  const p = parse(`
Topic "t" is
	If ?a contains "x" Then
		Say "1";
		If ?b contains "y" Then
			Say "2";
		Continue
		Say "3";
	Done
EndTopic`);
  const b = p.categories[0].blocks[0];
  eq(
    b.body.map((x) => (x.c ? x.c : "block")),
    ["say", "block", "say"],
    "nested block is a body item",
  );
  eq(b.body[1].end, "continue", "nested terminator");
  eq(b.end, "done", "outer terminator");
}

// All six terminators parse and none takes a ';'  ([A §7]).
{
  for (const term of [
    "Done",
    "Continue",
    "NextTopic",
    "NextScenario",
    "TryAgain",
    "SwitchBack",
  ]) {
    const p = parse(`Sequence Topic "t" is Always Say "x"; ${term} EndTopic`);
    eq(p.parseWarnings.length, 0, `${term}: no warnings`);
    eq(p.categories[0].blocks[0].end, term.toLowerCase(), `${term} terminator`);
  }
}

// [C §9.1] Otherwise attaches to the preceding sibling block, and chains.
{
  const p = parse(`
Topic "t" is
	Always
		If DontRecall ?Debugging then
			If Recall ?UserIsConsole then
				Remember ?Debugging is SDeb.CONSOLEDEBUGGING;
			Continue

			Otherwise if ?Username contains "WEBUSER" then
				Remember ?Debugging is SDeb.LIVEDEBUGGING;
			Continue

			Otherwise Always
				Remember ?Debugging is Sdeb.EXAMPLEDEBUGGING;
			Continue
		Continue
	Suppress this;
	Continue
EndTopic`);
  eq(p.parseWarnings.length, 0, "no warnings");
  const always = p.categories[0].blocks[0];
  eq(always.body.length, 2, "the Always block holds the If chain and Suppress");
  const chain = always.body[0].body[0];
  eq(chain.otherwise !== null, true, "first Otherwise attached");
  eq(
    chain.otherwise.otherwise !== null,
    true,
    "second Otherwise attached to the first",
  );
  eq(
    chain.otherwise.otherwise.condition,
    { op: "always" },
    "the final else is Otherwise Always",
  );
  eq(chain.otherwise.otherwise.otherwise, null, "chain ends");
  eq(
    always.body[1],
    { c: "suppress", args: [{ t: "this" }], line: 17 },
    "Suppress This",
  );
}

// [C §13.6] an empty block body.
{
  const p = parse(
    'Sequence Topic "t" is If ?a contains "x" then SwitchBack EndTopic',
  );
  eq(p.categories[0].blocks[0].body, [], "empty body");
}

// [C §8] newlines and comments are whitespace inside a condition.
{
  const p = parse(`Topic "t" is
	If ?WhatUserSaid ExactlyMatches GRINNIES
	//we have to use exactlymatches here -- otherwise punctuation is stripped.
	Then
		Say "x";
	Done
EndTopic`);
  eq(p.parseWarnings.length, 0, "comment between the last operand and Then");
}

// ===========================================================================
// 6. Commands
// ===========================================================================
suite("commands");

const cmds = (body) => parse(`Topic "t" is Always ${body} Continue EndTopic`);
const firstCmd = (body) => cmds(body).categories[0].blocks[0].body[0];

eq(
  firstCmd('Say "a", "b";').args,
  {
    t: "list",
    op: "or",
    args: [
      { t: "string", v: "a" },
      { t: "string", v: "b" },
    ],
  },
  "Say with comma-separated arguments",
);
eq(
  firstCmd('Say "a" + ?Name + "!";').args.t,
  "concat",
  "Say with '+' joins on one line",
);
eq(
  firstCmd("SayOneOf STDW_RECONNECTLINES;"),
  {
    c: "sayoneof",
    args: { t: "symbol", name: "STDW_RECONNECTLINES" },
    line: 1,
  },
  "SayOneOf",
);
eq(firstCmd('SayToConsole "x";').c, "saytoconsole", "SayToConsole");
eq(firstCmd('Trace "x";').c, "trace", "Trace");

// Deviation 4: SayToFile takes a path and a value with NO comma between them.
{
  const c = firstCmd(
    'SayToFile "C:\\Program Files\\NativeMinds\\TextFiles\\Define.txt" ?Name + " says: " + ?UserDefine;',
  );
  eq(c.c, "saytofile", "SayToFile");
  eq(
    c.file,
    { t: "string", v: "C:\\Program Files\\NativeMinds\\TextFiles\\Define.txt" },
    "file argument",
  );
  eq(c.args.t, "concat", "value argument");
}

// Remember, all four modes.
eq(
  firstCmd("Remember ?UserHasClaimedHumor;"),
  {
    c: "remember",
    target: { t: "mem", name: "UserHasClaimedHumor", user: null },
    value: null,
    mode: "flag",
    fn: null,
    line: 1,
  },
  "Remember flag",
);
eq(firstCmd('Remember ?X is *1+" "+#1;').mode, "is", "Remember is");
{
  const c = firstCmd(
    'Remember ?ProfanityStrikes is Compute Sum of ?ProfanityStrikes, "1";',
  );
  eq([c.mode, c.fn], ["compute", "Sum"], "Remember Compute");
  eq(
    c.value,
    {
      t: "list",
      op: "or",
      args: [
        { t: "mem", name: "ProfanityStrikes", user: null },
        { t: "string", v: "1" },
      ],
    },
    "Compute args",
  );
}
eq(
  firstCmd('Remember ?X is one of "a","b";').mode,
  "isoneof",
  "Remember is one of",
);

eq(
  firstCmd("Forget ?PreviousAnyStatement;"),
  {
    c: "forget",
    args: [{ t: "mem", name: "PreviousAnyStatement", user: null }],
    line: 1,
  },
  "Forget",
);
eq(firstCmd("Forget ?a, ?b;").args.length, 2, "Forget list");

eq(
  firstCmd('Focus "Humans Are";'),
  { c: "focus", args: [{ t: "string", v: "Humans Are" }], line: 1 },
  "Focus",
);
eq(
  firstCmd('Focus Subjects "HELP", "WantSomePointers";'),
  { c: "focussubjects", args: ["HELP", "WantSomePointers"], line: 1 },
  "Focus Subjects",
);
eq(firstCmd("DontFocus;"), { c: "dontfocus", line: 1 }, "DontFocus");
eq(firstCmd("Suppress This;").args, [{ t: "this" }], "Suppress This");
eq(
  firstCmd('SwitchTo "20 Questions";'),
  { c: "switchto", args: [{ t: "string", v: "20 Questions" }], line: 1 },
  "SwitchTo",
);
eq(
  firstCmd("WaitForResponse;"),
  { c: "waitforresponse", line: 1 },
  "WaitForResponse",
);
eq(
  firstCmd("InterruptSequence;"),
  { c: "interruptsequence", line: 1 },
  "InterruptSequence",
);
eq(
  firstCmd("DisconnectThisUser;").c,
  "disconnectthisuser",
  "DisconnectThisUser",
);

// Example family.
eq(
  firstCmd('Example "Why is the sky blue?";'),
  {
    c: "example",
    index: null,
    args: { t: "string", v: "Why is the sky blue?" },
    line: 1,
  },
  "Example",
);
eq(
  firstCmd('InitialExample 2 "My name is Fred";'),
  {
    c: "initialexample",
    index: "2",
    args: { t: "string", v: "My name is Fred" },
    line: 1,
  },
  "InitialExample with an index",
);
eq(
  firstCmd('WhenFocused Example "I sure do";').c,
  "whenfocusedexample",
  "WhenFocused Example",
);

// [A §11.6] the `When ?Mem is ... Example ...;` guard; the ';' belongs to Example.
{
  const c = firstCmd('When ?LastTopic is "Tsk Tsk"\n\tExample "why";');
  eq(c.c, "example", "When-guarded Example");
  eq(c.when.tests[0].value, { t: "string", v: "Tsk Tsk" }, "When guard value");
  eq(c.args, { t: "string", v: "why" }, "Example argument");
}

// ---- forms that occur only OUTSIDE the MrMind build (Base/, Library/
// components/, HttpExample/).  Parsed so those files load cleanly; none of
// them affects the shipped bot.
suite("commands / non-build forms");

eq(
  firstCmd('Remember ?String1 isOneOf "a","b";').mode,
  "isoneof",
  "one-word `isOneOf` (Base/Defaults/Default.n:348)",
);
{
  const c = firstCmd('Show "/"+?RobotHandle in "Conversation";');
  eq(c.c, "show", "Show");
  eq(c.target, { t: "string", v: "Conversation" }, "Show ... in <frame>");
}
eq(
  firstCmd('ShowTemplate "html/examples.htm" in "Display";').c,
  "showtemplate",
  "ShowTemplate",
);
eq(firstCmd('Expires "May 22 1999";').c, "expires", "Expires");
{
  // Two When tests chained with `and`; the second must not be swallowed into
  // the first test's value (Base/Utilities/LearningDemo.n:95).
  const c = firstCmd(
    'When ?DEFINED1 is "turbot" and ?DEFINITION1 is "fish"\n\tExample "What is a turbot";',
  );
  eq(c.when.tests.length, 2, "two When tests");
  eq(c.when.tests[0].value, { t: "string", v: "turbot" }, "first test value");
  eq(c.when.tests[1].mem.name, "DEFINITION1", "second test memref");
}
{
  const c = firstCmd('WhenFocused and ?WhatRobotSaid is "x" example "y";');
  eq(c.c, "whenfocusedexample", "WhenFocused-and guard");
  eq(c.when.focused, true, "guard is focused");
}

// ===========================================================================
// 7. Error tolerance — parsing must never throw
// ===========================================================================
suite("error tolerance");

{
  const p = parse('Topic "t" is Always Frobnicate "x"; Continue EndTopic');
  eq(p.categories[0].blocks[0].body[0].c, "unknown", "unknown command node");
  eq(p.parseWarnings.length >= 1, true, "warning recorded");
  eq(p.parseWarnings[0].file, "<memory>", "warning carries the file");
  eq(p.parseWarnings[0].line, 1, "warning carries the line");
}
{
  const p = parse('Topic "unterminated" is Always Say "x";');
  eq(
    p.parseWarnings.length >= 1,
    true,
    "unterminated topic warns rather than throwing",
  );
}
{
  const p = parse(
    '"a string at top level" ;;; ?mem 42 @ Topic "ok" is Always Continue EndTopic',
  );
  eq(p.categories.length, 1, "recovers and still finds the good topic");
}
{
  const p = parse('Say "unterminated string');
  eq(
    p.parseWarnings.some((w) => /unterminated string/.test(w.message)),
    true,
    "unterminated string literal is reported, not swallowed",
  );
}
for (const junk of [
  "",
  "   ",
  "//only a comment",
  '"',
  "?",
  "\\",
  "((((",
  "Topic",
  "If Then Done",
]) {
  let threw = false;
  try {
    parse(junk, "junk");
  } catch {
    threw = true;
  }
  ok(!threw, `never throws on ${JSON.stringify(junk)}`);
}

// The four dangling '+' typos in the shipped source (see parser.js parseConcat).
{
  const p = parse(
    'Topic "t" is Always SayOneOf STDX.R+"  "+; Continue EndTopic',
  );
  eq(p.parseWarnings.length, 0, "dangling '+' before ';' is tolerated");
  eq(
    p.categories[0].blocks[0].body[0].args,
    {
      t: "concat",
      args: [
        { t: "symbol", name: "STDX.R" },
        { t: "string", v: "  " },
      ],
    },
    "both operands survive, the dangling '+' is dropped",
  );
}
{
  const p = parse('Topic "t" is Always Say "a "+,\n"b"; Continue EndTopic');
  eq(p.parseWarnings.length, 0, "dangling '+' before ',' is tolerated");
  eq(
    p.categories[0].blocks[0].body[0].args.args.length,
    2,
    "two Say arguments survive",
  );
}

// ===========================================================================
// 8. Loader
// ===========================================================================
suite("loader");

// bot.json is committed, so the page and most of this suite run from a clean
// clone. The archive is Peggy Weil's copyright and is not in git, so the
// loader suite has nothing to load there. Skip it and say so, rather than
// dying on ENOENT and reporting a failure that is really an absent input.
if (!existsSync(VSR)) {
  console.log(
    "\n  skipped: loader suite needs the archive, which is not in this clone",
  );
  const t = passed + failures.length;
  console.log(`\n${passed}/${t} assertions passed (loader suite skipped)`);
  if (failures.length) {
    console.log(`\n${failures.length} FAILURES:`);
    for (const f of failures) console.log("  - " + f);
    process.exit(1);
  }
  process.exit(0);
}

const project = loadProject(VSR);
// [A §10.1] the [FILES] section lists 49 sources, not 50.
eq(project.files.length, 49, "49 source files resolve");
eq(project.missing, [], "nothing missing");
// [A §1] corpus size, read as bytes with CRLF intact.
eq(
  project.files.reduce((a, f) => a + f.source.length, 0),
  489625,
  "corpus is 489,625 bytes",
);
// [A §10.1] the manifest is case-insensitive against the filesystem.
ok(
  project.files.some((f) => f.path === "Customization/GoodbyeCustomize.n"),
  "Customization/ resolves",
);
ok(
  project.files.some((f) => f.path === "customization/WebCustomize.n"),
  "customization/ resolves",
);
// [A §10.1] LIBRARY: re-roots at the shared library directory, used exactly once.
eq(
  project.files.filter((f) => /^LIBRARY:/i.test(f.path)).length,
  1,
  "one LIBRARY: entry",
);
ok(
  /\/Library\/StdQuestion\/combis\/QuesResDebug\.us\.n$/i.test(
    project.files.find((f) => /^LIBRARY:/i.test(f.path)).absPath,
  ),
  "LIBRARY: resolves to Library/",
);
// [A §10.2] Patterns.n first, Defaults/Defaults.n last.
eq(project.files[0].path, "Patterns.n", "manifest order preserved: first");
eq(
  project.files[48].path,
  "Defaults/Defaults.n",
  "manifest order preserved: last",
);
// [A §10.1] paths with spaces and '&'.
ok(
  project.files.some((f) => f.path === "Activities/Expressions Filter.n"),
  "space in a path",
);
ok(
  project.files.some((f) => f.path.startsWith("Humans&Machines/")),
  "'&' in a path",
);
// [A §1.1] latin-1 decoding, not UTF-8.
ok(
  project.files
    .find((f) => f.path === "AboutMrMind/MMIdentity.n")
    .source.includes("Val\u00e9ry"),
  "MMIdentity.n decodes as latin-1",
);

// ===========================================================================
// 9. Full-corpus smoke test
// ===========================================================================
suite("corpus");

const prog = parseProgram(project.files);

// ---- the headline requirement
eq(prog.parseWarnings.length, 0, "ZERO parse warnings over the shipped build");

// ---- census: categories.  [A §8], [C §1.1]
eq(prog.categories.length, 691, "691 categories");
const catTypes = {};
for (const c of prog.categories) {
  const k = `${c.kind}:${c.type}`;
  catTypes[k] = (catTypes[k] || 0) + 1;
}
eq(catTypes["topic:standard"], 559, "559 standard topics");
eq(catTypes["topic:sequence"], 61, "61 Sequence topics");
eq(catTypes["topic:default"], 38, "38 Default topics");
eq(catTypes["topic:priority"], 30, "30 Priority topics");
eq(catTypes["scenario:priority"], 3, "3 Priority Scenarios");
eq(
  prog.categories.filter((c) => c.suppressed).length,
  0,
  "'Suppressed' never appears in the archive",
);
eq(
  new Set(prog.categories.map((c) => c.name.toLowerCase())).size,
  691,
  "category names are unique (this is what makes SwitchTo well-defined)",
);

// ---- census: declarations.  [A §8]
eq(prog.definitions.length, 231, "231 pattern definitions");
eq(
  prog.definitions.filter((d) => d.kind === "patternlist").length,
  228,
  "228 PatternLists",
);
eq(
  prog.definitions.filter((d) => d.kind === "pattern").length,
  3,
  "3 Patterns",
);
eq(Object.keys(prog.attributes).length, 33, "33 Attribute declarations");
eq(prog.attributes.whoquestion, 5000, "?WhoQuestion Specificity 5000");
eq(prog.attributes.anyquestion, 2500, "?AnyQuestion Specificity 2500");
eq(prog.otherExamples.length, 182, "182 OtherExamples");
eq(
  prog.otherExamples.filter((o) => o.guard && o.guard.kind === "whenfocused")
    .length,
  35,
  "35 WhenFocused OtherExamples",
);
eq(
  prog.otherExamples.filter((o) => o.guard && o.guard.kind === "when").length,
  0,
  "the When-guard OtherExamples form is not used in this build",
);

// [A §10.2](a) declaration before use: 0 forward references in manifest order.
{
  const defined = new Set();
  const forward = [];
  const names = new Set(prog.definitions.map((d) => d.name.toLowerCase()));
  const checkValue = (v, file, line) => {
    if (!v || typeof v !== "object") return;
    if (v.t === "symbol") {
      const l = v.name.toLowerCase();
      if (names.has(l) && !defined.has(l))
        forward.push(`${file}:${line} ${v.name}`);
      return;
    }
    if (v.args) v.args.forEach((a) => checkValue(a, file, line));
    if (v.arg) checkValue(v.arg, file, line);
    if (v.lhs) checkValue(v.lhs, file, line);
    if (v.rhs) checkValue(v.rhs, file, line);
  };
  // definitions and categories interleave, so walk them in source order
  const items = [
    ...prog.definitions.map((d) => ({ ord: [d.file, d.line], kind: "def", d })),
    ...prog.categories.map((c) => ({ ord: [c.file, c.line], kind: "cat", c })),
  ];
  const fileOrder = new Map(project.files.map((f, i) => [f.path, i]));
  items.sort(
    (a, b) =>
      fileOrder.get(a.ord[0]) - fileOrder.get(b.ord[0]) || a.ord[1] - b.ord[1],
  );
  const walkB = (b, file) => {
    checkValue(b.condition, file, b.line);
    for (const it of b.body) {
      if (it.condition !== undefined) walkB(it, file);
      else {
        checkValue(it.args, file, it.line);
        checkValue(it.value, file, it.line);
        checkValue(it.file, file, it.line);
      }
    }
    if (b.otherwise) walkB(b.otherwise, file);
  };
  for (const it of items) {
    if (it.kind === "def") {
      checkValue(it.d.value, it.d.file, it.d.line);
      defined.add(it.d.name.toLowerCase());
    } else it.c.blocks.forEach((b) => walkB(b, it.c.file));
  }
  eq(forward, [], "0 forward references of a PatternList in manifest order");
}

// ---- census: blocks, terminators, Otherwise.  [C §1.1], [C §4.1], [C §9.1]
const stat = {};
const bump = (k, n = 1) => {
  stat[k] = (stat[k] || 0) + n;
};
let maxDepth = 0;
function walkCond(x) {
  if (!x) return;
  bump(`cond:${x.op}`);
  if (x.op === "and" || x.op === "or") x.args.forEach(walkCond);
  else if (x.op === "not" || x.op === "optional") walkCond(x.arg);
  else if (x.op === "match") {
    bump(`test:${x.test}${x.negated ? ":neg" : ""}`);
    walkVal(x.rhs);
    walkVal(x.lhs);
  } else if (x.op === "recall") bump(`recall:${x.negated ? "neg" : "pos"}`);
  else if (x.op === "chance") bump(x.p === null ? "chance:bare" : "chance:arg");
}
function walkVal(v) {
  if (!v || typeof v !== "object" || !v.t) return;
  bump(`val:${v.t}`);
  if (v.t === "list") bump(`listop:${v.op}`);
  if (v.args) v.args.forEach(walkVal);
  if (v.arg) walkVal(v.arg);
}
function walkBlock(b, depth, cat) {
  maxDepth = Math.max(maxDepth, depth);
  bump("blocks");
  bump(`end:${b.end}`);
  if (b.end === "switchback") bump(`switchback-in:${cat.type}`);
  walkCond(b.condition);
  for (const it of b.body) {
    if (it.condition !== undefined) walkBlock(it, depth + 1, cat);
    else {
      bump(`cmd:${it.c}`);
      walkVal(it.args);
      walkVal(it.value);
      walkVal(it.file);
      if (it.when) bump("cmd:when-guard");
    }
  }
  if (b.otherwise) {
    bump("otherwise");
    bump(depth === 0 ? "otherwise:top" : "otherwise:nested");
    walkBlock(b.otherwise, depth, cat);
  }
}
for (const c of prog.categories) {
  if (c.subjects.length) bump("cat-with-subjects");
  if (c.memoryLocks.length) bump("cat-with-memorylock");
  c.blocks.forEach((b) => walkBlock(b, 0, c));
}
for (const d of prog.definitions) walkVal(d.value);
for (const o of prog.otherExamples) walkVal(o.args);

eq(stat.blocks, 1485, "1485 conditional blocks");
eq(maxDepth, 5, "blocks nest 6 levels deep (depth 0-5)");
eq(stat.otherwise, 107, "107 Otherwise-marked blocks");
eq(stat["otherwise:nested"], 95, "95 nested Otherwise blocks");
eq(stat["otherwise:top"], 12, "12 top-level Otherwise blocks");

eq(stat["end:done"], 759, "759 Done");
eq(stat["end:continue"], 414, "414 Continue");
eq(stat["end:switchback"], 286, "286 SwitchBack");
eq(stat["end:nexttopic"], 17, "17 NextTopic");
eq(stat["end:tryagain"], 9, "9 TryAgain");
eq(stat["end:nextscenario"], undefined, "NextScenario is never used");
// [C §4.1] SwitchBack occurs only inside Sequence categories, 286/286.
eq(
  stat["switchback-in:sequence"],
  286,
  "every SwitchBack is in a Sequence topic",
);

// ---- census: condition clauses.  [C §1.2], [C §1.3]
eq(stat["cond:always"], 123, "123 Always heads");
// Contains 798 + Heard 183 + IfHeard 40 = 1021
eq(stat["test:contains"], 1021, "Contains 798 + Heard 183 + IfHeard 40");
// DoesNotContain 11 + NotHeard 84 = 95
eq(stat["test:contains:neg"], 95, "DoesNotContain 11 + NotHeard 84");
eq(stat["test:matches"], 570, "570 Matches");
eq(stat["test:matches:neg"], 37, "37 DoesNotMatch");
eq(
  stat["test:exactlymatches"],
  1,
  "1 ExactlyMatches (Reactions/Compliments.n:51)",
);
eq(
  stat["test:exactlymatches:neg"],
  undefined,
  "DoesNotExactlyMatch is never used",
);
// IfRecall 186 + Recall 168 = 354 ; DontRecall 59 + IfDontRecall 11 = 70
eq(stat["recall:pos"], 354, "Recall 168 + IfRecall 186");
eq(stat["recall:neg"], 70, "DontRecall 59 + IfDontRecall 11");
// Focused 96 + IfFocused 4 = 100
eq(stat["cond:focused"], 100, "Focused 96 + IfFocused 4");
eq(stat["chance:bare"], 61, "61 bare IfChance");
eq(
  stat["chance:arg"],
  42,
  "IfChance with an argument 41 + the one Chance 60% clause",
);
// [C §7.1] clause level: 452 AND, 279 OR.
eq(stat["cond:and"], 452, "452 and-joined condition levels");
eq(stat["cond:or"], 279, "279 or-joined condition levels");
// [C §7.3] `and not`, 5 in the build.  [C §7.4] `{ }` pattern elements, 8; clause form, 0.
eq(stat["val:not"], 5, "5 'and not' list elements");
eq(stat["val:optional"], 8, "8 optional pattern elements");
eq(
  stat["cond:optional"],
  undefined,
  "0 brace-wrapped condition clauses in this build",
);

// ---- census: commands.  [A §6], [A §7]
eq(
  stat["cmd:unknown"],
  undefined,
  "ZERO unknown commands over the shipped build",
);
eq(stat["cmd:say"], 555, "555 Say");
eq(stat["cmd:sayoneof"], 305, "305 SayOneOf");
eq(stat["cmd:saytoconsole"], 116, "116 SayToConsole");
eq(stat["cmd:saytofile"], 73, "73 SayToFile");
eq(stat["cmd:trace"], 4, "4 Trace");
eq(stat["cmd:remember"], 571, "571 Remember");
eq(stat["cmd:forget"], 82, "82 Forget");
eq(stat["cmd:focus"], 7, '7 Focus "..."');
eq(stat["cmd:focussubjects"], 62, "62 Focus Subjects");
eq(stat["cmd:dontfocus"], 58, "58 DontFocus");
eq(stat["cmd:suppress"], 37, "37 Suppress");
eq(stat["cmd:switchto"], 134, "134 SwitchTo");
eq(stat["cmd:waitforresponse"], 89, "89 WaitForResponse");
eq(stat["cmd:interruptsequence"], 3, "3 InterruptSequence");
eq(stat["cmd:disconnectthisuser"], 1, "1 DisconnectThisUser");
eq(stat["cmd:initialexample"], 2, "2 InitialExample");
eq(
  stat["cmd:example"] + stat["cmd:whenfocusedexample"],
  545,
  "545 Example (534 plain + 11 WhenFocused)",
);
eq(
  stat["cmd:whenfocusedexample"] + 35,
  46,
  "46 WhenFocused total (11 Example + 35 OtherExamples)",
);
eq(
  stat["cmd:when-guard"],
  1,
  "1 When-guarded Example (Utilities/CProfanity.n:122)",
);
eq(stat["cmd:do"], undefined, "every 'Do' in the build is commented out");
eq(stat["cmd:recover"], undefined, "'Recover' never appears");
eq(stat["cmd:forgetoneof"], undefined, "'ForgetOneOf' never appears");
eq(stat["cmd:switchtooneof"], undefined, "'SwitchToOneOf' never appears");

// ---- census: category-body statements
eq(stat["cat-with-subjects"], 571, "571 Subjects statements");
eq(stat["cat-with-memorylock"], 33, "33 MemoryLock statements");

// ---- the archive's one-off constructs actually survive the parse
{
  const bots = prog.categories.find((c) => c.name === "Are bots smart");
  ok(
    bots !== undefined,
    '/Topic "Are bots smart" survived the stray slash [A §11.5]',
  );
  const answers = prog.categories.find((c) => c.name === "Really ThinkingBack");
  const amp = JSON.stringify(answers).includes('"op":"and"');
  ok(amp, "the single '&' operator parsed as a conjunction [A §11.2]");
  const grinnies = prog.categories.find((c) => c.name === "grinnies");
  eq(
    grinnies.blocks[0].condition.test,
    "exactlymatches",
    "the single ExactlyMatches",
  );
  const sky = prog.categories.find((c) => c.name === "Why is the sky blue");
  ok(
    JSON.stringify(sky).includes("nitrogen scatters"),
    "the dangling '+' site parsed",
  );
}

// [A §4.2] string values survive the lexer in their compiled form.
{
  const strings = [];
  JSON.stringify(prog, (k, v) => {
    if (v && v.t === "string") strings.push(v.v);
    return v;
  });
  ok(strings.includes("\\."), "the Punc list keeps '\\.' as two characters");
  ok(strings.includes("#\\'s"), "'#\\'s' keeps all four characters");
  ok(
    strings.some(
      (s) => s === "C:\\Program Files\\NativeMinds\\TextFiles\\NameReason.txt",
    ),
    "Windows paths are not mangled",
  );
  ok(
    strings.some((s) => s.includes('didn\'t "think" about')),
    '\\" collapses to a bare quote',
  );
  ok(
    strings.some((s) => s.includes("Val\u00e9ry")),
    "latin-1 survives into the AST",
  );
}

// [A §4.1] 12,828 string literals in the build; [A §4.3] 1,214 <BR> runs.
// Counted on the token stream, which is where "a string literal in the build"
// is defined (comments already removed, escapes already applied).
{
  let literals = 0;
  let br = 0;
  for (const f of project.files) {
    for (const t of tokenize(f.source, f.path)) {
      if (t.type !== "string") continue;
      literals++;
      br += t.value.split("<BR>").length - 1;
    }
  }
  eq(literals, 12828, "12,828 string literals in the build");
  eq(br, 1214, "1,214 <BR> runs, passed through untouched");
}

// ===========================================================================
// 10. Robustness over the WHOLE archive (180 files, not just the 49 in the
//     build).  These files are never loaded by the bot; the point is only that
//     the parser never throws on any NeuroScript the archive contains.
// ===========================================================================
suite("whole archive");
{
  const { readFileSync, statSync, readdirSync } = await import("node:fs");
  const root = join(
    HERE,
    "..",
    "..",
    "archive/1_NeuroServer_fromVaio_MrMind/NeuroScript",
  );
  const found = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.n$/i.test(e.name) && statSync(full).size > 0)
        found.push(full);
    }
  })(root);
  eq(found.length, 180, "180 non-empty .n files in the archive");

  let threw = 0;
  let warnings = 0;
  const unknownFiles = new Set();
  for (const f of found) {
    let prog1;
    try {
      prog1 = parse(readFileSync(f, "latin1"), f.slice(root.length + 1));
    } catch {
      threw++;
      continue;
    }
    warnings += prog1.parseWarnings.length;
    const scan = (b) => {
      for (const it of b.body) {
        if (it.condition !== undefined) scan(it);
        else if (it.c === "unknown") unknownFiles.add(f.slice(root.length + 1));
      }
      if (b.otherwise) scan(b.otherwise);
    };
    prog1.categories.forEach((c) => c.blocks.forEach(scan));
  }
  eq(threw, 0, "the parser throws on none of the 180 files");
  // The only residue anywhere in the archive is the NeuroServer plugin call
  //   Get ?Result from PLUGIN "HTTP" where INPUT URL is "http" + *1;
  // in the HttpExample demo bot (5 occurrences).  It is a plugin-invocation
  // form, not part of MrMind, and is deliberately left as {c:'unknown'}.
  eq(
    [...unknownFiles],
    ["HttpExample/httpex.n"],
    "the only unparsed construct in the whole archive is HttpExample's PLUGIN call",
  );
  eq(warnings, 5, "5 warnings archive-wide, all the PLUGIN call");
}

// ===========================================================================
// Report
// ===========================================================================
const total = passed + failures.length;
console.log(`\n${passed}/${total} assertions passed`);
if (failures.length) {
  console.log(`\n${failures.length} FAILURES:`);
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}
console.log("\ncorpus summary");
console.log(`  files parsed          ${project.files.length}`);
console.log(
  `  categories            ${prog.categories.length}  ` +
    Object.entries(catTypes)
      .map(([k, v]) => `${k}=${v}`)
      .join(" "),
);
console.log(
  `  pattern definitions   ${prog.definitions.length} (228 PatternList, 3 Pattern)`,
);
console.log(`  attributes            ${Object.keys(prog.attributes).length}`);
console.log(`  other-examples        ${prog.otherExamples.length}`);
console.log(
  `  conditional blocks    ${stat.blocks} (max nesting depth ${maxDepth + 1})`,
);
console.log(
  `  commands              ${Object.entries(stat)
    .filter(([k]) => k.startsWith("cmd:"))
    .reduce((a, [, v]) => a + v, 0)}`,
);
console.log(`  unknown commands      ${stat["cmd:unknown"] || 0}`);
console.log(`  parse warnings        ${prog.parseWarnings.length}`);

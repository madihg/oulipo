// engine/test/spellcheck.test.mjs
//
// Proves the approximate Sentry corrector (src/spellcheck.js) against the only
// behaviour the archive actually documents.  Run:  node engine/test/spellcheck.test.mjs
//
// Nothing here is fitted to the conversation database, and no corpus row
// appears: every assertion quotes a manual, a tutorial, or a script line.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTlx, buildLexicon, makeSpellChecker } from "../src/spellcheck.js";
import { loadLexiconSources } from "../src/loader.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.env.MRMIND_REPO || path.resolve(HERE, "..", "..");
const DATA = path.resolve(HERE, "..", "data");
const DICT = process.env.MRMIND_DICT || "/usr/share/dict/words";

let pass = 0;
const fails = [];
function ok(cond, what) {
  if (cond) pass++;
  else fails.push(what);
}
function eq(actual, expected, what) {
  ok(actual === expected, `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// -- 1. .tlx parsing -------------------------------------------------------
// Program/Additions.tlx:71-72 introduces its last block as "The following are
// common substitutions that aren't always handled correctly by the automatic
// substitution mechanism"; each of those lines carries Sentry's auto-change
// type, 'A' followed by the replacement.
{
  const t = parseTlx(
    "#LID 30840\r\nbot\ti\r\n# comment\r\nyuo\tAyou\r\nalot\tAa lot\r\n",
  );
  ok(t.words.includes("bot"), "plain 'i' entry is a word");
  ok(!t.words.includes("yuo"), "auto-change entry is not a plain word");
  eq(t.autoChange.length, 2, "two auto-change entries");
  eq(t.autoChange[0][1], "you", "yuo -> you");
  eq(t.autoChange[1][1], "a lot", "alot -> a lot (a multi-word replacement)");
}

// -- 2. the real lexicons load --------------------------------------------
const program = JSON.parse(fs.readFileSync(path.join(REPO, "bot.json"), "utf8"));
const sources = loadLexiconSources(
  ["Ssceam.tlx", "Additions.tlx", "MRMIND3.tlx", "MRMIND3.script.tlx"].map((f) =>
    path.join(DATA, f),
  ),
);
eq(sources.length, 4, "all four archive lexicons are present");
const dictWords = fs.existsSync(DICT)
  ? fs.readFileSync(DICT, "latin1").split("\n")
  : [];
const lex = buildLexicon({ tlxSources: sources, dictWords, program });

ok(lex.tier.get("qualia") === 0, "Mrmind3/MRMIND3.tlx word is project vocabulary");
ok(lex.tier.get("mrmind") === 0, "MrMind is project vocabulary");
ok(lex.tier.has("neuroserver"), "Program/Additions.tlx word is in the lexicon");

// Program/Additions.tlx:83 'u -> you' and :88 'alot -> a lot' are superseded by
// Mrmind3/MRMIND3.tlx:110 'u i' and :67 'alot i', because both words are LIVE
// MATCH ALTERNATIVES in the shipped scripts:
//   Mrmind3/Patterns.n:356  Patternlist YOU is "you", "your", "u","yourself";
//   Mrmind3/Issues/Emotion.n:497  Topic "I worry alot" is
ok(!lex.autoChange.has("u"), "u is NOT auto-changed: Patterns.n:356 matches it");
ok(!lex.autoChange.has("alot"), "alot is NOT auto-changed: Emotion.n:497 matches it");
ok(lex.autoChange.get("yuo") === "you", "yuo IS auto-changed (no script matches it)");
eq(lex.autoChange.size, 21, "21 of the 23 auto-change entries survive");

// -- 3. the tutorial's own worked examples --------------------------------
const sc = makeSpellChecker(lex, { maxDist: 1, longWordDist: 1, tiebreak: "freq" });

// spec/vendor-docs/Tutorial4.txt:11-19 — "say 'helllo' ... The Gerbil spelling
// checker changed the input to 'hello'."
eq(sc("helllo"), "hello", "Tutorial4:14 helllo -> hello");

// spec/vendor-docs/Tutorial4.txt:69-71 — "you misspelled 'thieves' by
// transposing 'i' with 'e'": a transposition must cost ONE edit, not two.
// "thieves" is a Galatea word, not a MrMind word, so it is only reachable when
// the general dictionary is allowed to supply suggestions; the property itself
// is checked here and again on a word the shipped bot really does know.
// ("thieves" itself cannot be used as the fixture: it is a Galatea word, and
// the lemma-heavy word list standing in for Ssceam2.clx does not contain it —
// which is exactly why the affix table read out of Ssceam2.clx is needed.)
eq(sc("abuot"), "about", "Tutorial4:70 a transposition is ONE edit");
eq(sc("waht is teh time"), "what is teh time", "one edit, not two, and short words are left");

// spec/neuroserver-help/MANUAL__Operators.txt:69 and :313 both turn on the
// checker leaving ?WhatUserSaid alone; a word already in the lexicon must come
// back untouched, or ?WhatUserMeant would drift on every turn.
// Regular inflections must survive: the affix table (Ssceam2.clx byte 0x28)
// is what stops "computers", "thinks" and "machines" from being "corrected".
for (const w of ["hello", "MrMind", "qualia", "Eliza", "you", "the",
                 "computers", "thinks", "machines", "questions", "feelings"])
  eq(sc(w), w, `a known word is untouched: ${w}`);

// Additions.tlx's own table.
eq(sc("yuo"), "you", "Additions.tlx:82 yuo -> you");
eq(sc("b4"), "before", "Additions.tlx:85 b4 -> before");
eq(sc("waht"), "what", "Additions.tlx:73 waht -> what");
eq(sc("u"), "u", "u survives (project vocabulary wins)");
eq(sc("alot"), "alot", "alot survives (project vocabulary wins)");

// Case is carried over, because ?WhatUserMeant is matched case-insensitively
// but is also Said back verbatim in places.
eq(sc("Helllo"), "Hello", "capitalisation is preserved");

// -- 4. conservatism ------------------------------------------------------
// Identity is still the default: `new Bot(program)` must not spell-correct.
{
  const { Bot } = await import("../src/index.js");
  const b = new Bot(program);
  eq(b.spellcheck("helllo"), "helllo", "the Bot default is still the identity function");
}
// maxDist 0 is the auto-change table alone.
{
  const only = makeSpellChecker(lex, { maxDist: 0, longWordDist: 0 });
  eq(only("helllo"), "helllo", "maxDist 0 does not guess");
  eq(only("yuo"), "you", "maxDist 0 still applies the vendor table");
}
// A word with no candidate at the configured distance is left alone.
eq(sc("zzzqqxv"), "zzzqqxv", "no candidate -> no correction");
// Digits are never touched (Patterns.n's AGE list matches literal numerals).
eq(sc("i am 24"), "i am 24", "digits are left alone");

console.log(`${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log("  FAIL " + f);
process.exit(fails.length ? 1 : 0);

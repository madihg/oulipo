// engine/src/spellcheck.js
//
// Dependency-free and browser-safe: file reading lives in src/loader.js
// (loadLexiconSources) exactly as it does for the script manifest.
//
// An APPROXIMATION of the Gerbil/Sentry spelling checker that NeuroServer ran
// over every user input before any topic saw it.
//
//   Library/StdQuestion/combis/QuesResDebug.us.n:149
//     Remember ?WhatUserMeant is Compute SpellCheck of ?WhatUserMeant;
//
// The evidence that this step is load-bearing, and that it rewrites words the
// bot never declared:
//
//   spec/vendor-docs/Tutorial4.txt:9-19
//     "Lesson Four: The Spell Checker ... say 'helllo' to Galatea ... The
//      Gerbil spelling checker changed the input to 'hello'.  What actually
//      happened is that the value of ?WhatUserMeant was set to the corrected
//      input, 'hello'.  The value of ?WhatUserSaid remains 'helllo'."
//
//   spec/vendor-docs/Tutorial4.txt:32-35
//     "look at what happens when the spelling checker sees this input.  It
//      changes 'Hermes' to \"here's\"."
//
//   spec/vendor-docs/Tutorial4.txt:69-71
//     "it will then go on to complain that you didn't capitalize 'Greeks' and
//      that you misspelled 'thieves' by transposing 'i' with 'e'."
//      -> a transposition is one edit, not two (Damerau, not Levenshtein).
//
//   spec/neuroserver-help/MANUAL__Operators.txt:69
//     "Conditional clauses used for filtering profanity should match input
//      before the spelling checker runs.  To do this, use the memory attribute
//      ?WhatUserSaid instead of ?WhatUserMeant."
//
// The lexicon itself (Program/Ssceam2.clx) survives only as a compiled
// prefix-trie binary, so EXACT reproduction is impossible.  What IS recoverable
// is shipped in the archive as plain '#LID'-headed, tab-separated .tlx files,
// and this module reads them verbatim:
//
//   Program/Ssceam.tlx            1017 common English words
//   Program/Additions.tlx         62 vendor words flagged 'i' (add to lexicon)
//                                 + 23 entries flagged 'A<replacement>', which
//                                   is Sentry's AUTO-CHANGE type.  The file's
//                                   own comment introduces them as "common
//                                   substitutions that aren't always handled
//                                   correctly by the automatic substitution
//                                   mechanism".  These are not guesses: they
//                                   are the vendor's own rewrite table.
//   Mrmind3/MRMIND3.tlx           117 words Peggy Weil added to the project
//                                   vocabulary (Eliza, MrMind, qualia, alife,
//                                   Osama, ...) — direct evidence of what the
//                                   checker would otherwise have mangled, in
//                                   exactly the sense Tutorial4 describes for
//                                   "Hermes".
//   Mrmind3/MRMIND3.script.tlx    1450 given names (the name-capture lexicon).
//
// Everything here is OFF by default.  `new Bot(program)` still gets the
// identity function, so the deviation stays visible.

// --------------------------------------------------------------------------
// .tlx parsing
// --------------------------------------------------------------------------

/**
 * Parse one '#LID'-headed Sentry user lexicon.
 *
 * Format, as it appears in the archive: a '#LID <id> ...' first line, '#'
 * comment lines, then one entry per line, fields separated by TAB.  Field 0 is
 * the word.  The type field is 'i' (a normal added word) or 'A<replacement>'
 * (auto-change: always rewrite this word to <replacement>).  Ssceam.tlx has no
 * type column at all — every line is a bare word.
 */
export function parseTlx(text) {
  const words = [];
  const autoChange = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/\r/g, "");
    if (!line || line.startsWith("#")) continue;
    const fields = line.split("\t");
    const word = fields[0].trim();
    if (!word) continue;
    const type = fields.slice(1).find((f) => f.trim().length) || "";
    const t = type.trim();
    if (t.startsWith("A") && t.length > 1) {
      autoChange.push([word, t.slice(1)]);
    } else {
      words.push(word);
    }
  }
  return { words, autoChange };
}

// --------------------------------------------------------------------------
// Harvesting the bot's own vocabulary
// --------------------------------------------------------------------------

const RE_WORD = /[\p{L}][\p{L}\p{N}]*(?:['’][\p{L}\p{N}]+)*/gu;

function harvestStrings(node, out) {
  if (node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const x of node) harvestStrings(x, out);
    return;
  }
  if (node.t === "string" && typeof node.v === "string") out.push(node.v);
  for (const k of Object.keys(node)) {
    if (k === "t" || k === "v") continue;
    harvestStrings(node[k], out);
  }
}

function collectConditionStrings(node, out) {
  if (node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const x of node) collectConditionStrings(x, out);
    return;
  }
  // A block's `condition` is the only condition-side position in the AST; it
  // occurs at every nesting depth (nested If blocks live inside `body`), so the
  // walk is over the whole category tree.  Example / Say arguments are
  // deliberately NOT harvested: the corrector must aim at the words that
  // matching can care about.
  if (node.condition) harvestStrings(node.condition, out);
  for (const k of Object.keys(node)) {
    if (k === "condition") continue;
    collectConditionStrings(node[k], out);
  }
}

/**
 * Every literal word that can appear on the condition side of this program,
 * with an occurrence count.  This is "the set of words that matching can
 * possibly care about" — Pattern/PatternList declarations included, because
 * conditions reference them by name.
 */
export function botVocabulary(program) {
  const strings = [];
  for (const d of program.definitions || []) harvestStrings(d.value, strings);
  for (const c of program.categories || []) collectConditionStrings(c.blocks, strings);
  const counts = new Map();
  for (const s of strings) {
    RE_WORD.lastIndex = 0;
    let m;
    while ((m = RE_WORD.exec(s)) !== null) {
      const w = m[0].toLowerCase();
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  return counts;
}

// --------------------------------------------------------------------------
// The affix table, read out of Ssceam2.clx itself
// --------------------------------------------------------------------------
//
// Program/Ssceam2.clx is a compiled prefix trie and its word list is not
// recoverable — but its FIRST BLOCK is not compiled at all.  From byte 0x28 the
// file is a run of NUL-terminated endings:
//
//   s ing ness ly ed y d r on st ment t e al less able ier ic le es ally or ve
//   ng te tion ability ous ies ism ities ity er man ties ful en like tic nce
//   ion ist ries ation hip ial ization ibility ter age ish ted ificatio us ian
//   ze ped led table house sh um land ological ine ible sm ate fication ance
//   liness ure ular ged back board sion ess ory se way head ied ize ide woman
//   ward red in ical aries ...
//
// which is the lexicon's own stem+affix decomposition: Sentry stored "believe"
// once and reached "believes" through "s".  That matters here because ANY word
// list used as a stand-in for the compiled lexicon is lemma-heavy — the one
// shipped with this Mac has "thief" but not "thieves", "computer" but not
// "computers" — and without the affix table every regular plural and past
// tense in the corpus would look misspelled and get "corrected".
//
// The subset below is the inflectional part of that block, in file order.  It
// is used ONLY to answer "is this already a word", never to make a suggestion,
// so its failure mode is the conservative one: leaving a word alone.
const AFFIXES = [
  "s", "ing", "ness", "ly", "ed", "y", "d", "r", "st", "ment", "t", "al",
  "less", "able", "ier", "ic", "es", "ally", "or", "ve", "ng", "te", "tion",
  "ability", "ous", "ies", "ism", "ities", "ity", "er", "ties", "ful", "en",
  "tic", "nce", "ion", "ist", "ries", "ation", "ial", "ization", "ibility",
  "ter", "age", "ish", "ted", "us", "ian", "ze", "ped", "led", "sion", "ess",
  "ory", "se", "ied", "ize", "ical", "aries", "est",
];

/**
 * Is `w` a word, allowing for one of the lexicon's own endings on a known stem?
 * Tries the bare stem, the stem with a restored silent 'e' (believ+e), and the
 * stem with an undoubled final consonant (stopp -> stop).
 */
export function knownWithAffix(tier, w) {
  if (tier.has(w)) return true;
  for (const a of AFFIXES) {
    if (a.length >= w.length || !w.endsWith(a)) continue;
    const stem = w.slice(0, w.length - a.length);
    if (stem.length < 3) continue;
    if (tier.has(stem)) return true;
    if (tier.has(stem + "e")) return true;
    if (
      stem.length > 3 &&
      stem[stem.length - 1] === stem[stem.length - 2] &&
      tier.has(stem.slice(0, -1))
    )
      return true;
  }
  return false;
}

// --------------------------------------------------------------------------
// Damerau-Levenshtein, bounded
// --------------------------------------------------------------------------

function editDistance(a, b, max) {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  let prev2 = null;
  let prev = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  let cur = new Array(lb + 1);
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let best = cur[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1] &&
        prev2 !== null
      ) {
        v = Math.min(v, prev2[j - 2] + 1); // transposition = one edit
      }
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = cur;
    cur = new Array(lb + 1);
  }
  return prev[lb];
}

// --------------------------------------------------------------------------
// Lexicon
// --------------------------------------------------------------------------

function deletions(word, k, out) {
  out.add(word);
  if (k === 0) return out;
  for (let i = 0; i < word.length; i++) {
    const d = word.slice(0, i) + word.slice(i + 1);
    if (!out.has(d)) {
      out.add(d);
      if (k > 1) deletions(d, k - 1, out);
    }
  }
  return out;
}

/**
 * @param {Object} opts
 *   tlxSources [{name,text}]  .tlx lexicons, in load order (see loadLexiconSources)
 *   dictWords  iterable|null  a general English word list (see the note below)
 *   program    Program|null   the bot, for its own condition-side vocabulary
 *
 * `dictWords` stands in for the part of the original lexicon that did not
 * survive: Program/Ssceam2.clx is a compiled prefix-trie, and `strings` on it
 * yields 11,634 shared stem fragments ("ness", "ability", "zation", "abasc",
 * "rithm"), not words.  Any general English list is therefore an APPROXIMATION,
 * and it is used only to decide "is this already a word" — never as a source of
 * suggestions unless suggestTiers is raised to 2.
 */
export function buildLexicon(opts = {}) {
  // tier 0: the bot's own words + the project vocabulary Peggy added
  // tier 1: the vendor's word lists
  // tier 2: general English
  const display = new Map(); // lower -> preferred surface form
  const tier = new Map(); // lower -> 0 | 1 | 2
  const count = new Map(); // lower -> condition-side occurrences
  const autoChange = new Map(); // exact word -> replacement
  const autoChangeLower = new Map();
  const projectWords = new Set(); // words Peggy added to the PROJECT vocabulary

  const add = (word, t) => {
    const w = word.toLowerCase();
    if (!w) return;
    const prev = tier.get(w);
    if (prev === undefined || t < prev) {
      tier.set(w, t);
      display.set(w, word);
    }
  };

  if (opts.program) {
    for (const [w, c] of botVocabulary(opts.program)) {
      add(w, 0);
      count.set(w, (count.get(w) || 0) + c);
    }
  }

  for (const src of opts.tlxSources || []) {
    const { words, autoChange: ac } = parseTlx(src.text);
    // MRMIND3*.tlx is the PROJECT vocabulary — tier 0 with the bot's own words.
    const t = /MRMIND3/i.test(src.name) ? 0 : 1;
    for (const w of words) add(w, t);
    for (const [from, to] of ac) {
      autoChange.set(from, to);
      autoChangeLower.set(from.toLowerCase(), to);
    }
    if (t === 0) for (const w of words) projectWords.add(w.toLowerCase());
  }

  for (const w of opts.dictWords || []) {
    const t = String(w).trim();
    if (t) add(t, 2);
  }

  // A word Peggy added to the PROJECT vocabulary is a correctly-spelled word in
  // this bot, so the vendor's auto-change entry for it is superseded.  Exactly
  // two of Additions.tlx's 23 substitutions collide with Mrmind3/MRMIND3.tlx:
  //
  //   Additions.tlx:83  u    -> you        vs  MRMIND3.tlx:110  u     i
  //   Additions.tlx:88  alot -> a lot      vs  MRMIND3.tlx:67   alot  i
  //
  // and the scripts settle it, because both are LIVE MATCH ALTERNATIVES that a
  // rewrite would kill:
  //
  //   Mrmind3/Patterns.n:356
  //     Patternlist YOU is "you", "your", "u","yourself";
  //   Mrmind3/Utilities/WebNameGreet.n:722
  //     or (?WhoQuestion contains ("you","u" )+"* I am")
  //   Mrmind3/Issues/Emotion.n:497-507
  //     Topic "I worry alot" is ... Example "I worry alot";
  //   Mrmind3/AboutUser/UserSociety.n:370-380
  //     Topic "I read alot" is ... Example "I read alot";
  //
  // Rewriting u->you and alot->"a lot" would make Patterns.n:356's third
  // alternative and both "alot" topics unreachable.  No other auto-change word
  // occurs as a literal anywhere in the Mrmind3 build.
  for (const w of projectWords) {
    autoChange.delete(w);
    autoChangeLower.delete(w);
    for (const k of [...autoChange.keys()])
      if (k.toLowerCase() === w) autoChange.delete(k);
  }

  return { display, tier, count, autoChange, autoChangeLower };
}

// --------------------------------------------------------------------------
// The corrector
// --------------------------------------------------------------------------

const DEFAULTS = {
  maxDist: 1, //   maximum edit distance for a correction
  longWordDist: 1, // ... for words longer than longWordLength
  longWordLength: 6,
  minLength: 4, //  never touch a word shorter than this: a three-letter word
  //                   has dozens of neighbours one edit away, and Sentry chose
  //                   between them with frequency data that is inside the .clx
  //                   and therefore lost.  Preset 'short' lowers it to 3 and is
  //                   measured alongside the rest.
  suggestTiers: 1, // 0 = bot vocabulary only, 1 = + vendor lists, 2 = + dict
  tiebreak: "none", // 'none' = drop ambiguous, 'freq' = prefer the commoner word
  onAmbiguity: "drop", // 'drop' = leave the word alone; 'take' = take the first,
  //                       which is what Sentry did — Tutorial4:77-78 has it
  //                       rewriting "Herms" to "hems" with no hesitation at all
  autoChange: true, // apply Additions.tlx's own rewrite table
};

/**
 * Build a `(text) => text` function suitable for `new Bot(p, {spellcheck})`.
 */
export function makeSpellChecker(lexicon, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const maxK = Math.max(o.maxDist, o.longWordDist);

  // SymSpell deletion index over the SUGGESTION set only.  The KNOWN set stays
  // the whole lexicon, so a real word is never "corrected".
  const index = new Map();
  if (maxK > 0) {
    for (const [w, t] of lexicon.tier) {
      if (t > o.suggestTiers) continue;
      if (w.length < o.minLength) continue;
      for (const d of deletions(w, maxK, new Set())) {
        let bucket = index.get(d);
        if (!bucket) index.set(d, (bucket = []));
        bucket.push(w);
      }
    }
  }

  const cache = new Map();

  function correctWord(lower) {
    if (cache.has(lower)) return cache.get(lower);
    let result = null;
    const limit = lower.length > o.longWordLength ? o.longWordDist : o.maxDist;
    if (limit > 0 && lower.length >= o.minLength) {
      const seen = new Set();
      const cands = [];
      for (const d of deletions(lower, limit, new Set())) {
        for (const w of index.get(d) || []) {
          if (seen.has(w)) continue;
          seen.add(w);
          const dist = editDistance(lower, w, limit);
          if (dist <= limit && dist > 0) cands.push({ w, dist });
        }
      }
      if (cands.length) {
        for (const c of cands) {
          c.tier = lexicon.tier.get(c.w);
          c.count = lexicon.count.get(c.w) || 0;
        }
        cands.sort(
          (a, b) =>
            a.dist - b.dist ||
            a.tier - b.tier ||
            (o.tiebreak === "freq" ? b.count - a.count : 0) ||
            (a.w < b.w ? -1 : a.w > b.w ? 1 : 0),
        );
        const best = cands[0];
        const rival = cands[1];
        // Conservative: a tie that the configured tiebreak cannot break is left
        // uncorrected.  A wrong correction routes the user to a topic they did
        // not ask for, which is worse than no correction.
        const ambiguous =
          rival &&
          rival.dist === best.dist &&
          rival.tier === best.tier &&
          (o.tiebreak !== "freq" || rival.count === best.count);
        if (!ambiguous || o.onAmbiguity === "take")
          result = lexicon.display.get(best.w) || best.w;
      }
    }
    cache.set(lower, result);
    return result;
  }

  function applyCase(original, replacement) {
    if (original === original.toUpperCase() && original.length > 1)
      return replacement.toUpperCase();
    if (original[0] === original[0].toUpperCase())
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    return replacement;
  }

  return function spellcheck(text) {
    const s = String(text == null ? "" : text);
    if (!s) return s;
    return s.replace(RE_WORD, (word) => {
      const lower = word.toLowerCase();
      if (o.autoChange) {
        // Sentry auto-change entries are case-sensitive in the file
        // (both 'im' and 'Im' are listed, and 'wat' vs 'HWat').
        if (lexicon.autoChange.has(word)) return lexicon.autoChange.get(word);
        if (lexicon.autoChangeLower.has(lower))
          return applyCase(word, lexicon.autoChangeLower.get(lower));
      }
      if (knownWithAffix(lexicon.tier, lower)) return word; // never touched
      if (/\d/.test(word)) return word;
      const fixed = correctWord(lower);
      return fixed === null ? word : applyCase(word, fixed);
    });
  };
}

export default { parseTlx, botVocabulary, buildLexicon, makeSpellChecker };

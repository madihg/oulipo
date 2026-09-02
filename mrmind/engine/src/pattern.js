// engine/src/pattern.js — the NeuroScript 2.2 pattern matcher.
//
// NO LANGUAGE MODEL. Nothing here generates text. This module only decides
// whether a script-authored pattern matches a user utterance, and what the
// wildcard operators consumed.
//
// ---------------------------------------------------------------------------
// SOURCES, in the authority order fixed by engine/CONTRACT.md
//   [B]    spec/B-patterns-and-matching.md            (archive-grounded, top authority)
//   [ops]  spec/neuroserver-help/MANUAL__Operators.txt (NativeMinds' own reference)
//   [tut]  archive/_research/raw/NEUROSERVER_tutorial.txt (NeuroServer Tutorial 3.5)
//   [gerbil] archive/_research/patents/GERBIL-LANGUAGE-NOTES.md
//   [vd]   spec/vendor-docs/*.txt
// Every judgement call below is commented with the source that settled it.
//
// ---------------------------------------------------------------------------
// DECLARED DEVIATIONS from engine/CONTRACT.md §"Pattern matching".
// (Also listed in the return value of the task that produced this file.)
//
// D1. WITHDRAWN 2026-09-02 by the runtime worker; this module now FOLLOWS the
//     CONTRACT ("`*` matches zero or more whole tokens; it does not match inside
//     a word"), implemented as "the span `*` consumes must begin and end at a
//     word boundary" — which is the same thing stated over characters, and
//     which lets `*` swallow the spaces around the words it eats.
//
//     The earlier reading here was character-level, per [B §0.1, §4.1,
//     §13 row 1], on the grounds that two shipped patterns need it:
//       Mrmind3/Patterns.n  "mast*rbat#"   to match  masturbate/masterbate
//       Mrmind3/Patterns.n  "fantas*"      to match  fantasy/fantasize
//     That was authorial INTENT, not engine behaviour, and the shipped
//     conversation database refutes it:
//
//       _work/cdb/mrmind3/ConversationData.csv lines 15132-15133
//         U: orange
//         M: <B>Hi Orange! Can you convince me that you are human?  </B>
//
//     `Sequence Topic "strip non-name words"` (Mrmind3/Utilities/WebNameGreet.n
//     :652-662) tests `?NameCapture.TempName matches ("a","an","the",…,"or",…)
//     + "*"` and it runs TWICE (WNG:542) BEFORE the single-word check at
//     WNG:545. Under a character-level `*` the rendered `or*` matches "orange",
//     `*1` is "ange", and the real MrMind would have said "Hi Ange!". It said
//     "Hi Orange!". The same rule would have turned "Alice" into "Lice".
//     [ops] ("zero or more words or punctuation"), CONTRACT.md and
//     [gerbil §14.5] (an NFA over word/space/punctuation tokens whose wildcard
//     arc "can match zero words or many words") all agree with the CDB.
//     "mast*rbat#" and "fantas*" are therefore dead patterns in the shipped
//     bot — an authoring bug that is reproduced, not repaired.
//     Consequence: divergence X4 below no longer occurs.
//
// D2. CONTRACT (and [B §10.2]) compile `Contains` as `*` + P + `*` with no
//     boundary condition. This module additionally requires that the matched
//     span NOT SPLIT A WORD at either end (§ boundaryOk below). Reasons:
//       - [ops] summary table: "robot" must NOT match "Have you seen any
//         robots?" while "robot#" must. Without the rule, both match.
//       - [ops] "market#" ... "matches market, markets, and marketing, but not
//         remarket". Without the rule, remarket matches.
//       - [ops] "chat# site#" must not match "Chat World Site" (this one falls
//         out of `#` not crossing spaces, and holds either way).
//       - Mrmind3/Patterns.n:120 lists BOTH "bot#" and (in AILIFE) "robot".
//         The second entry is redundant unless "bot#" fails to match "robot".
//       - Without it, `Contains I` (PatternList I = "I","me",...) is true for
//         any input containing the letter i, and the bot's logic collapses.
//     This is the CONTRACT's own "word boundaries are real" rule, applied at
//     the two ends of the match instead of to every arc, which is what makes
//     it compatible with D1.
//     [B §10.4] explicitly accepts `Contains "what"` matching "somewhat"; this
//     module rejects it. That is the one place this file knowingly overrules
//     [B]. The evidence [B] cites for it — the tutorial's `who*kronos` ->
//     `whoaskflkronos` — is retracted 25 lines later by the tutorial itself
//     ([tut:2696-2699]: "the Spell Checker does not parse the input
//     whoaskflkronos correctly ... changing value from "whoaskflkronos" to
//     "who""), so it is not evidence at all. `whoaskflkronos` still matches
//     here anyway, because the span is the whole input.
//
// D3. `matchPattern` returns extra fields beyond the CONTRACT's
//     {stars, whole, specificityPath}: `starsRaw`, `starMatch`, `rendered`,
//     `renderedIndex`, `path`, `start`, `end`. `specificityPath` is left null —
//     specificity is src/specificity.js's job; what a specificity walker needs
//     from the matcher is WHICH alternative fired, and that is `path`.
//
// D4. `matchPattern` accepts a raw string as well as a token array, and takes
//     an optional 4th `options` argument. Both are additive.
//
// ---------------------------------------------------------------------------
// KNOWN, DOCUMENTED DIVERGENCES FROM [ops] (cannot be reproduced; not faked):
//
// X1. [ops] "Asterisk" section claims `IfHeard "virtual*robot"` matches
//     "virtual reality robots". It cannot, because the same document's summary
//     table says "robot" does not match "robots". The two statements are
//     mutually exclusive under every model. This file follows the table (the
//     table is systematic; the prose example also spells "virtual robot" as
//     "virtualrobot" and "virtually robot" as "virtuallyrobot", i.e. it is the
//     sloppier of the two passages). Reported by test/pattern.test.mjs.
//
// X1b/X3. [ops] "Matching Phrases" lists "What are virtual robots?" as NOT
//     matching `"virtual robot#"`, two lines after listing "virtual robots" as
//     matching it. `IfHeard` is `Contains`, so that is impossible. This file
//     matches it. Reported by the test file.
//
// X4. [ops] says `"virtual*robot"` does not match "virtually robot". It does
//     here, because `*` is character-level (D1) and consumes the "ly ". The
//     same document's own asterisk example requires character-level `*`
//     ("virtualrobot"), and so do the shipped patterns "mast*rbat#" and
//     "fantas*", so D1 stands and this row is reported as a divergence.
//     (Note "virtual robotic" is still correctly rejected: the D2 boundary
//     rule stops the match ending inside "robotic".)
//
// X2. [ops] "Recalling Values" table claims that for `"You*#vRep"` against
//     "You are a sales vRep." the buffers are *1="are a", #1="sales". That
//     requires LAZY wildcards. Lazy wildcards contradict archive code that
//     needs greedy ones (Base/Utilities/EmailCapture.n:152-155
//     `Contains "*@*"` then `Remember ?PossibleEmail is *1+"@"+*2` — lazy *2
//     is always ""), and [B §7] fixes greedy as the port's rule. This file is
//     greedy; the four rows of that table are asserted at their ACTUAL values
//     and reported as divergences by the test file.

// ---------------------------------------------------------------------------
// Character classes

const RE_WORD_CHAR = /[\p{L}\p{N}]/u;
const RE_SPACE = /\s/u;
const RE_DIGIT = /[0-9]/u;
const APOSTROPHES = "'’"; // ASCII apostrophe and the Unicode right single quote

/** A "word character" for the no-split-a-word rule: letter or digit. */
export function isWordChar(ch) {
  return ch !== undefined && RE_WORD_CHAR.test(ch);
}

/** Punctuation = anything that is neither a word character nor whitespace. [B §10.1] */
export function isPunct(ch) {
  return ch !== undefined && !RE_WORD_CHAR.test(ch) && !RE_SPACE.test(ch);
}

export function isSpace(ch) {
  return ch !== undefined && RE_SPACE.test(ch);
}

/** Characters that are pattern-matching operators and therefore need escaping. */
const OPERATOR_CHARS = new Set(["*", "#", "%", "^", ",", ".", "'", "\\", " "]);

/**
 * Escape a literal value so it can be spliced into a pattern without its
 * characters being read as operators. Used for ?memrefs and star buffers used
 * in pattern position: [B §5.5] and [B §6.3] both say the text is literal.
 */
export function escapePatternLiteral(text) {
  let out = "";
  for (const ch of String(text)) {
    // A space stays a space: a literal space is still "one or more spaces",
    // which is the right reading for a spliced multi-word name.
    if (ch === " ") out += ch;
    else if (OPERATOR_CHARS.has(ch)) out += "\\" + ch;
    else out += ch;
  }
  return out;
}

/**
 * Strip leading/trailing spaces and punctuation from a captured value.
 * [ops]: "space characters and punctuation are automatically stripped from the
 * beginning and end of the value matched by the pattern-matching operator".
 */
export function stripCapturedValue(text) {
  let a = 0;
  let b = text.length;
  while (a < b && (isSpace(text[a]) || isPunct(text[a]))) a++;
  while (b > a && (isSpace(text[b - 1]) || isPunct(text[b - 1]))) b--;
  return text.slice(a, b);
}

// ---------------------------------------------------------------------------
// tokenizeInput

const RE_WORD_RUN = /^[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/u;

/**
 * Split raw user text into words, spaces and punctuation marks as separate
 * symbols. Lossless: `tokens.map(t => t.w).join("")` reproduces the input.
 *
 * kind:
 *   'word'  — a run of letters/digits, with internal apostrophes kept
 *             (so "don't" is one word), which is what the space (' ')
 *             operator and the no-split-a-word rule reason about.
 *   'space' — a run of whitespace (the ' ' operator: "one or more spaces").
 *   'punct' — ONE punctuation character (the ',' and '.' operators are
 *             defined over "spaces and/or punctuation marks", so each mark
 *             has to be individually visible).
 */
export function tokenizeInput(text) {
  const s = String(text == null ? "" : text);
  const out = [];
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    if (RE_SPACE.test(s[i])) {
      let j = i;
      while (j < s.length && RE_SPACE.test(s[j])) j++;
      out.push({ w: s.slice(i, j), kind: "space" });
      i = j;
      continue;
    }
    const m = RE_WORD_RUN.exec(rest);
    if (m) {
      out.push({ w: m[0], kind: "word" });
      i += m[0].length;
      continue;
    }
    out.push({ w: s[i], kind: "punct" });
    i += 1;
  }
  return out;
}

/** Rebuild the exact source text from tokens. */
export function detokenize(tokens) {
  return tokens.map((t) => t.w).join("");
}

// ---------------------------------------------------------------------------
// Rendering a pattern expression to a set of pattern strings.
//
// [B §5]: "A pattern expression evaluates to a set of rendered pattern strings.
// Matching succeeds if any rendered string matches."

const MAX_RENDERINGS = 20000; // [B §10.3]: largest real cross product is 8192.
const MAX_SYMBOL_DEPTH = 32; // cycle guard for PatternList A -> B -> A

function isSeparatorChar(ch) {
  // [B §5.3] endsWithSeparator/startsWithSeparator.
  return ch === " " || ch === "*" || ch === "," || ch === ".";
}

function endsWithSeparator(s) {
  if (!s) return false;
  const last = s[s.length - 1];
  if (!isSeparatorChar(last)) return false;
  // A backslash-escaped separator is a literal, so it does NOT suppress the
  // implicit space. [B §15.13] ("wait\," + X keeps the implicit space.)
  let backslashes = 0;
  for (let i = s.length - 2; i >= 0 && s[i] === "\\"; i--) backslashes++;
  return backslashes % 2 === 0;
}

function startsWithSeparator(s) {
  if (!s) return false;
  return isSeparatorChar(s[0]);
}

/** Collapse runs of two or more UNESCAPED literal spaces to one. [B §5.3] */
function collapseSpaceRuns(s) {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === "\\" && i + 1 < s.length) {
      out += s[i] + s[i + 1];
      i += 2;
      continue;
    }
    if (s[i] === " ") {
      while (i < s.length && s[i] === " ") i++;
      out += " ";
      continue;
    }
    out += s[i];
    i++;
  }
  return out;
}

/** [B §5.3] joinPieces: concatenation with the implicit space. */
function joinPieces(pieces) {
  const ps = pieces.filter((p) => p !== ""); // empty strings contribute nothing
  if (ps.length === 0) return "";
  let out = ps[0];
  for (let k = 1; k < ps.length; k++) {
    const p = ps[k];
    if (!endsWithSeparator(out) && !startsWithSeparator(p)) out += " ";
    out += p;
  }
  return out;
}

/**
 * Normalise the `env` argument. Accepted shapes (all optional):
 *   env.lookupPattern(name)  -> Value | Value[] | string | undefined
 *   env.patterns             -> Map | plain object, name (any case) -> Value/string
 *   env.lookupMem(name,user) -> string | string[] | undefined
 *   env.memory               -> Map | plain object, name -> string | string[]
 *   env.stars                -> {'*':[...], '#':[...], '^':[...], '%':[...]}
 *   env.starMatch            -> string
 */
function normaliseEnv(env) {
  const e = env || {};
  const get = (bag, name) => {
    if (!bag) return undefined;
    const key = String(name).toLowerCase();
    if (bag instanceof Map) {
      for (const [k, v] of bag) if (String(k).toLowerCase() === key) return v;
      return undefined;
    }
    for (const k of Object.keys(bag))
      if (k.toLowerCase() === key) return bag[k];
    return undefined;
  };
  return {
    lookupPattern:
      typeof e.lookupPattern === "function"
        ? e.lookupPattern.bind(e)
        : (name) => get(e.patterns, name),
    lookupMem:
      typeof e.lookupMem === "function"
        ? e.lookupMem.bind(e)
        : (name) => get(e.memory, name),
    stars: e.stars || null,
    starMatch: e.starMatch != null ? e.starMatch : null,
  };
}

/**
 * Render a pattern Value (see CONTRACT §AST) to [{text, path}].
 * `path` records the alternative chosen at each list/optional node, in
 * traversal order, so specificity.js can score the branch that actually fired.
 */
export function renderPattern(value, env, state) {
  const st = state || {
    env: normaliseEnv(env),
    warnings: [],
    truncated: false,
    depth: 0,
    seen: new Set(),
  };
  return { results: renderValue(value, st), state: st };
}

function cap(list, st) {
  if (list.length > MAX_RENDERINGS) {
    st.truncated = true;
    return list.slice(0, MAX_RENDERINGS);
  }
  return list;
}

function renderValue(v, st) {
  if (v == null) return [{ text: "", path: [] }];

  // Sugar: a bare JS string is a string literal.
  if (typeof v === "string") return [{ text: v, path: [] }];
  if (Array.isArray(v)) return renderValue({ t: "list", args: v }, st);

  switch (v.t) {
    case "string":
      return [{ text: v.v == null ? "" : String(v.v), path: [] }];

    case "symbol": {
      const name = String(v.name);
      const key = name.toLowerCase();
      if (st.seen.has(key) || st.depth > MAX_SYMBOL_DEPTH) {
        st.warnings.push(`cyclic or too-deep PatternList reference: ${name}`);
        return [{ text: "", path: [] }];
      }
      const def = st.env.lookupPattern(name);
      if (def === undefined || def === null) {
        st.warnings.push(`unresolved Pattern/PatternList: ${name}`);
        // Unresolved symbols render to nothing rather than throwing; the
        // CONTRACT forbids the parser from throwing on the real archive and
        // the same rule is useful here.
        return [{ text: "", path: [] }];
      }
      st.seen.add(key);
      st.depth++;
      const out = renderValue(def, st);
      st.depth--;
      st.seen.delete(key);
      return out;
    }

    case "mem": {
      // [B §5.5] the spliced value is LITERAL text, not a pattern.
      const raw = st.env.lookupMem(String(v.name), v.user || null);
      const values = raw == null ? [""] : Array.isArray(raw) ? raw : [raw];
      return values.map((x, i) => ({
        text: escapePatternLiteral(String(x)),
        path: values.length > 1 ? [i] : [],
      }));
    }

    case "star": {
      // A star buffer used as a pattern: its TEXT is used literally. [B §6.3]
      const sig = v.sigil === "&" ? "^" : v.sigil; // [B §13 row 3]: 2.2 spells & as ^
      const bag = st.env.stars || {};
      const arr = bag[sig] || [];
      const val = arr[v.n] == null ? "" : String(arr[v.n]);
      return [{ text: escapePatternLiteral(val), path: [] }];
    }

    case "starmatch": {
      const val = st.env.starMatch == null ? "" : String(st.env.starMatch);
      return [{ text: escapePatternLiteral(val), path: [] }];
    }

    case "concat": {
      let acc = [{ pieces: [], path: [] }];
      for (const arg of v.args || []) {
        const rendered = renderValue(arg, st);
        const next = [];
        for (const a of acc) {
          for (const r of rendered) {
            next.push({
              pieces: a.pieces.concat([r.text]),
              path: a.path.concat(r.path),
            });
            if (next.length > MAX_RENDERINGS) break;
          }
          if (next.length > MAX_RENDERINGS) break;
        }
        acc = cap(next, st);
      }
      return acc.map((a) => ({
        text: collapseSpaceRuns(joinPieces(a.pieces)),
        path: a.path,
      }));
    }

    case "list": {
      const out = [];
      const args = v.args || [];
      for (let i = 0; i < args.length; i++) {
        for (const r of renderValue(args[i], st)) {
          out.push({ text: r.text, path: [i].concat(r.path) });
          if (out.length > MAX_RENDERINGS) return cap(out, st);
        }
      }
      return out.length ? out : [{ text: "", path: [] }];
    }

    case "optional": {
      // [B §5.4] {X} == (X, ""). It never changes WHETHER a pattern matches,
      // only its specificity — which is why the empty branch comes last (so a
      // non-empty branch wins the "first successful match" rule for buffers).
      const inner = renderValue({ t: "list", args: v.args || [] }, st);
      const out = inner.map((r) => ({
        text: r.text,
        path: r.path,
        optionalTaken: true,
      }));
      out.push({ text: "", path: [], optionalTaken: false });
      return cap(out, st);
    }

    default:
      st.warnings.push(
        `unknown pattern node: ${JSON.stringify(v).slice(0, 80)}`,
      );
      return [{ text: "", path: [] }];
  }
}

// ---------------------------------------------------------------------------
// Compiling ONE rendered pattern string to a node program.
//
// Node kinds and their sources:
//   lit    literal characters                                     [ops]
//   star   *  zero or more characters, may cross spaces           [B §4.1] (D1)
//   hash   #  zero or more non-space, non-apostrophe characters   [B §4.2]
//   caret  ^  exactly one non-space character (runs are grouped)  [ops]
//   pct    %  exactly one digit          (runs are grouped)       [ops]
//   comma  ,  zero or more spaces and/or punctuation              [ops]
//   period .  one or more spaces and/or punctuation               [ops]
//   space     one or more spaces                                  [ops]
//   apos   '  an OPTIONAL apostrophe                              [ops] [B §11]

const programCache = new Map();

export function compilePatternString(rendered) {
  const cached = programCache.get(rendered);
  if (cached) return cached;

  const nodes = [];
  const slots = []; // parallel list of {sigil, index} for capturing nodes
  let nStar = 0;
  let nHash = 0;
  let nCaret = 0;
  let nPct = 0;

  const pushLit = (ch, caseSensitive) => {
    const last = nodes[nodes.length - 1];
    if (last && last.t === "lit" && last.cs === caseSensitive) last.s += ch;
    else nodes.push({ t: "lit", s: ch, cs: caseSensitive });
  };

  const P = String(rendered);
  let i = 0;
  while (i < P.length) {
    const c = P[i];

    if (c === "\\" && i + 1 < P.length) {
      const next = P[i + 1];
      // [ops] "Matching a Pattern-Matching Operator": \ before an operator
      // makes it literal. [ops] "Case-sensitive Matching": \ before a letter
      // forces a case-sensitive match on that letter.
      pushLit(next, RE_WORD_CHAR.test(next) && !RE_DIGIT.test(next));
      i += 2;
      continue;
    }

    switch (c) {
      case "*":
        nStar++;
        slots.push({ sigil: "*", index: nStar });
        nodes.push({ t: "star", slot: slots.length - 1 });
        i++;
        break;
      case "#":
        nHash++;
        slots.push({ sigil: "#", index: nHash });
        nodes.push({ t: "hash", slot: slots.length - 1 });
        i++;
        break;
      case "^": {
        // [ops]: "^1, ^2 ... match a group of consecutive instances", so a run
        // of carets is ONE buffer holding all of them ("^\.^\." -> ^1="J", ^2="W").
        let n = 0;
        while (P[i] === "^") {
          n++;
          i++;
        }
        nCaret++;
        slots.push({ sigil: "^", index: nCaret });
        nodes.push({ t: "caret", count: n, slot: slots.length - 1 });
        break;
      }
      case "%": {
        let n = 0;
        while (P[i] === "%") {
          n++;
          i++;
        }
        nPct++;
        slots.push({ sigil: "%", index: nPct });
        nodes.push({ t: "pct", count: n, slot: slots.length - 1 });
        break;
      }
      case ",":
        nodes.push({ t: "comma" });
        i++;
        break;
      case ".":
        nodes.push({ t: "period" });
        i++;
        break;
      case " ":
        while (P[i] === " ") i++; // collapse runs [B §10.1]
        nodes.push({ t: "space" });
        break;
      case "'":
      case "’":
        nodes.push({ t: "apos" });
        i++;
        break;
      default:
        pushLit(c, false);
        i++;
        break;
    }
  }

  const prog = { source: P, nodes, slots };
  programCache.set(rendered, prog);
  return prog;
}

// ---------------------------------------------------------------------------
// The matcher: a recursive backtracking walk over the node program.
// Not a regex translation — the star buffers have to line up with the
// individual operators, and `#`'s "never crosses a space" rule plus the
// no-split-a-word rule are easier to state directly.

/**
 * A match may not begin or end in the middle of a word. See D2.
 * (Position `pos` is a gap index in 0..text.length.)
 */
function boundaryOk(text, pos) {
  if (pos <= 0 || pos >= text.length) return true;
  return !(isWordChar(text[pos - 1]) && isWordChar(text[pos]));
}

/**
 * Run `prog` against `text` starting at `from`.
 * `accept(pos)` decides whether an end position is acceptable.
 * Returns the end position, or -1. `caps` is filled with [start,end] per slot.
 *
 * Quantifiers are GREEDY with backtracking ([B §7]; see X2). Failures are
 * memoised on (node, position) so that patterns like the email stripper's
 * "#, ,#, ,#, ,#, *@*" cannot blow up.
 */
function runProgram(prog, text, from, accept, caps) {
  const nodes = prog.nodes;
  const len = text.length;
  const failed = new Set();

  function fail(k, pos) {
    failed.add(k * (len + 1) + pos);
    return -1;
  }

  function step(k, pos) {
    if (k === nodes.length) return accept(pos) ? pos : -1;
    if (failed.has(k * (len + 1) + pos)) return -1;
    const node = nodes[k];

    switch (node.t) {
      case "lit": {
        const s = node.s;
        if (pos + s.length > len) return fail(k, pos);
        const seg = text.slice(pos, pos + s.length);
        const same = node.cs
          ? seg === s
          : seg.toLowerCase() === s.toLowerCase();
        if (!same) return fail(k, pos);
        const r = step(k + 1, pos + s.length);
        return r === -1 ? fail(k, pos) : r;
      }

      case "star": {
        // [ops] "* = zero or more words or punctuation"; [gerbil §14.5] the
        // matcher NFA is over word / space / punctuation tokens and a wildcard
        // arc "can match zero words or many words".  A character span consists
        // of whole words, spaces and punctuation exactly when BOTH its
        // endpoints are word boundaries, so that is the rule enforced here.
        // May cross spaces; greedy.  See D1 in the header for the evidence that
        // overturned the earlier character-level reading.
        if (!boundaryOk(text, pos)) return fail(k, pos);
        for (let end = len; end >= pos; end--) {
          if (!boundaryOk(text, end)) continue;
          const r = step(k + 1, end);
          if (r !== -1) {
            caps[node.slot] = [pos, end];
            return r;
          }
        }
        return fail(k, pos);
      }

      case "hash": {
        // zero or more characters, never crossing a space, never an
        // apostrophe. [B §4.2] and [tut:6001-6002].
        let max = pos;
        while (
          max < len &&
          !RE_SPACE.test(text[max]) &&
          !APOSTROPHES.includes(text[max])
        )
          max++;
        for (let end = max; end >= pos; end--) {
          const r = step(k + 1, end);
          if (r !== -1) {
            caps[node.slot] = [pos, end];
            return r;
          }
        }
        return fail(k, pos);
      }

      case "caret": {
        // exactly `count` non-space characters
        const end = pos + node.count;
        if (end > len) return fail(k, pos);
        for (let j = pos; j < end; j++)
          if (RE_SPACE.test(text[j])) return fail(k, pos);
        const r = step(k + 1, end);
        if (r === -1) return fail(k, pos);
        caps[node.slot] = [pos, end];
        return r;
      }

      case "pct": {
        const end = pos + node.count;
        if (end > len) return fail(k, pos);
        for (let j = pos; j < end; j++)
          if (!RE_DIGIT.test(text[j])) return fail(k, pos);
        const r = step(k + 1, end);
        if (r === -1) return fail(k, pos);
        caps[node.slot] = [pos, end];
        return r;
      }

      case "comma": {
        let max = pos;
        while (max < len && (RE_SPACE.test(text[max]) || isPunct(text[max])))
          max++;
        for (let end = max; end >= pos; end--) {
          const r = step(k + 1, end);
          if (r !== -1) return r;
        }
        return fail(k, pos);
      }

      case "period": {
        let max = pos;
        while (max < len && (RE_SPACE.test(text[max]) || isPunct(text[max])))
          max++;
        for (let end = max; end > pos; end--) {
          const r = step(k + 1, end);
          if (r !== -1) return r;
        }
        return fail(k, pos);
      }

      case "space": {
        let max = pos;
        while (max < len && RE_SPACE.test(text[max])) max++;
        for (let end = max; end > pos; end--) {
          const r = step(k + 1, end);
          if (r !== -1) return r;
        }
        return fail(k, pos);
      }

      case "apos": {
        if (pos < len && APOSTROPHES.includes(text[pos])) {
          const r = step(k + 1, pos + 1);
          if (r !== -1) return r;
        }
        const r0 = step(k + 1, pos);
        return r0 === -1 ? fail(k, pos) : r0;
      }

      default:
        return fail(k, pos);
    }
  }

  return step(0, from);
}

// ---------------------------------------------------------------------------
// compilePattern / matchPattern

/**
 * compilePattern(patternValue, env) -> CompiledPattern
 *
 * `env` resolves Pattern/PatternList symbols (case-insensitively) and memrefs.
 * The cross product of the alternations is rendered eagerly and cached, which
 * is what [B §10.3] recommends ("compile once at load").
 */
export function compilePattern(patternValue, env) {
  const { results, state } = renderPattern(patternValue, env);
  const renderings = results.map((r) => ({
    text: r.text,
    path: r.path,
    program: compilePatternString(r.text),
  }));
  return {
    kind: "CompiledPattern",
    source: patternValue,
    renderings,
    warnings: state.warnings,
    truncated: state.truncated,
  };
}

function toText(input) {
  if (typeof input === "string") return input;
  if (Array.isArray(input)) return detokenize(input);
  if (input == null) return "";
  if (typeof input.w === "string") return input.w;
  return String(input);
}

/**
 * matchPattern(compiled, inputTokens, mode, options) -> MatchResult | null
 *
 * mode: 'contains' | 'matches' | 'exactlymatches'
 *   contains       — the pattern may appear anywhere in the value, but the
 *                    matched span may not split a word (D2).
 *   matches         — the whole value, with extra leading/trailing spaces and
 *                    punctuation tolerated but no extra words.
 *                    [vd Matches.txt], [ops].
 *   exactlymatches  — literal string equality ignoring leading/trailing
 *                     spaces; operators are literal characters. [ops]
 *
 * options.wordBoundary  default true  — the D2 rule; set false for the
 *                                        unmodified [B §10.2] behaviour.
 * options.stripCaptures default true  — [ops] strips spaces/punctuation from
 *                                        the ends of a captured value.
 *                                        `starsRaw` always holds the unstripped
 *                                        text.
 *
 * Across a pattern list the FIRST successful rendering wins, which is what
 * [ops] requires of the buffers ("represents only the first successful match").
 *
 * The `stars` / `starsRaw` arrays are 1-INDEXED, because the script writes
 * *1, #1, ^1, %1: index 0 is always a hole.
 */
export function matchPattern(compiled, inputTokens, mode, options) {
  const opts = options || {};
  const wordBoundary = opts.wordBoundary !== false;
  const strip = opts.stripCaptures !== false;
  const m = String(mode || "contains").toLowerCase();
  const text = toText(inputTokens);

  const pat =
    compiled && compiled.kind === "CompiledPattern"
      ? compiled
      : compilePattern(compiled, opts.env);

  for (let ri = 0; ri < pat.renderings.length; ri++) {
    const r = pat.renderings[ri];
    const hit =
      m === "exactlymatches"
        ? matchExactly(text, r.text, opts.caseInsensitiveExact === true)
        : m === "matches"
          ? matchWhole(text, r.program)
          : matchAnywhere(text, r.program, wordBoundary);
    if (!hit) continue;

    const stars = { "*": [], "#": [], "^": [], "%": [] };
    const starsRaw = { "*": [], "#": [], "^": [], "%": [] };
    for (let s = 0; s < (r.program.slots ? r.program.slots.length : 0); s++) {
      const slot = r.program.slots[s];
      const span = hit.caps[s];
      const raw = span ? text.slice(span[0], span[1]) : "";
      starsRaw[slot.sigil][slot.index] = raw;
      stars[slot.sigil][slot.index] = strip ? stripCapturedValue(raw) : raw;
    }
    const whole = text.slice(hit.start, hit.end);
    return {
      stars,
      starsRaw,
      // [B §6.4] *match is the substring matched by the PATTERN PROPER, not
      // the whole input — for a Contains, not the wrapper stars.
      starMatch: strip ? stripCapturedValue(whole) : whole,
      whole,
      start: hit.start,
      end: hit.end,
      rendered: r.text,
      renderedIndex: ri,
      path: r.path,
      // specificityPath is src/specificity.js's business; `path` is the input
      // it needs (which alternative fired). See D3.
      specificityPath: null,
    };
  }
  return null;
}

function matchAnywhere(text, prog, wordBoundary) {
  const accept = (pos) => (wordBoundary ? boundaryOk(text, pos) : true);
  for (let start = 0; start <= text.length; start++) {
    if (wordBoundary && !boundaryOk(text, start)) continue;
    const caps = [];
    const end = runProgram(prog, text, start, accept, caps);
    if (end !== -1) return { start, end, caps };
  }
  return null;
}

/**
 * `Matches`: the pattern must cover the whole value, except that extra spaces
 * and punctuation are tolerated at both ends — "input with Matches may not
 * contain extra words" [vd Matches.txt]. So "How are you" matches
 * "How are you?" but not "How are you doing?".
 */
function matchWhole(text, prog) {
  let firstStart = 0;
  while (
    firstStart < text.length &&
    (isSpace(text[firstStart]) || isPunct(text[firstStart]))
  )
    firstStart++;
  // The tolerated prefix is spaces/punctuation only, so trying every prefix
  // length from 0..firstStart is enough.
  for (let start = 0; start <= firstStart; start++) {
    const accept = (pos) => {
      for (let j = pos; j < text.length; j++)
        if (!isSpace(text[j]) && !isPunct(text[j])) return false;
      return true;
    };
    const caps = [];
    const end = runProgram(prog, text, start, accept, caps);
    if (end !== -1) return { start, end, caps };
  }
  return null;
}

/**
 * `ExactlyMatches`: "disregard extra spaces at the beginning or end of a
 * user's input, but otherwise requires an exact match"; "you cannot use
 * pattern-matching operators ... they are treated as literal characters" [ops].
 *
 * JUDGEMENT CALL (D5): case-SENSITIVE. [ops] presents ExactlyMatches under the
 * heading "Case-sensitive Matching" as one of the "two different ways to create
 * template patterns that are case-sensitive", and says
 * `If ?WhatUserMeant ExactlyMatches "May"` "matches only 'May'".
 * [B §10.2] writes it case-folded, but cites no source for the folding and
 * [B §8.2] describes it as an un-normalised hash lookup. Nothing in the shipped
 * bot can tell the two apart: the four uses are GRINNIES (emoticons, no
 * letters), "2", "" and "?".
 * Pass options.caseInsensitiveExact = true for the [B] reading.
 */
function matchExactly(text, patternText, caseInsensitive) {
  const a = text.trim();
  const b = String(patternText).trim();
  const same = caseInsensitive ? a.toLowerCase() === b.toLowerCase() : a === b;
  if (!same) return null;
  const start = text.indexOf(a) === -1 ? 0 : text.indexOf(a);
  return { start, end: start + a.length, caps: [] };
}

// ---------------------------------------------------------------------------
// Convenience: one-call test used by the runtime and the tests.

/**
 * test(value, patternValue, mode, env) -> MatchResult|null
 * `value` may be a string or a token array.
 */
export function test(value, patternValue, mode, env, options) {
  const compiled =
    patternValue && patternValue.kind === "CompiledPattern"
      ? patternValue
      : compilePattern(patternValue, env);
  return matchPattern(compiled, value, mode, options);
}

export default {
  tokenizeInput,
  detokenize,
  compilePattern,
  compilePatternString,
  matchPattern,
  renderPattern,
  stripCapturedValue,
  escapePatternLiteral,
  isWordChar,
  isPunct,
  isSpace,
  test,
};

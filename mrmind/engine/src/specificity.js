// engine/src/specificity.js
//
// Best-fit specificity for the MrMind revival.
//
// Contract: exports buildFrequencyTable(program) and conditionSpecificity(condition, ctx)
// (engine/CONTRACT.md).  It also exports the constants and a couple of small
// helpers that runtime.js needs; those are additions, not replacements, and are
// listed in engine/DEVIATIONS.md.
//
// Sources cited inline:
//   [BF]  spec/neuroserver-help/MANUAL__BestFit.txt          (NativeMinds' own manual)
//   [P14] archive/_research/patents/GERBIL-LANGUAGE-NOTES.md section 14
//   [E12] spec/E-topics-focus-and-selection.md section 12    (normative restatement)
//   [C]   spec/C-conditions.md
//
// The measure, verbatim [P14 §14.2]:
//   "specificity ... is based on log(1/f) where f is the estimated likelihood,
//    over all expected inputs to the system, that a condition is true for any
//    particular input.  In the present implementation, specificity is
//    multiplied by 1000 to allow the computations to be done using integers."
//
// f for a matching condition comes from the word frequencies of the Example
// statements in the script [P14 §14.2]; f for a Recall condition is the
// registered attribute specificity, default 2000 [BF].

import { compilePattern, matchPattern } from "./pattern.js";

// --- constants, all from [E12 §12.6] -------------------------------------
export const SPEC_SCALE = 1000; // ×1000, integer arithmetic
export const CONJUNCTION_PENALTY = 1000; // −1000 per child beyond the first
export const DEFAULT_ATTRIBUTE_SPECIFICITY = 2000; // undeclared Attribute
export const FOCUSED_UNIT = 100; // 100 × shared active subjects
// JUDGEMENT CALL. [P14 §14.3] "Negated conditions have a fixed specificity",
// value never given; [E12 §14.2 item 1] recommends a tunable constant defaulting
// to 0 because MrMind uses NotHeard as a guard, not a discriminator.  Tunable
// through ctx.negatedSpecificity.
export const NEGATED_SPECIFICITY = 0;

// ---------------------------------------------------------------------------
// The Example word-frequency corpus.

const EXAMPLE_COMMANDS = new Set([
  "example",
  "initialexample",
  "sequenceexample",
  "whenfocusedexample",
]);

// Words as the input tokeniser sees them: runs of letters/digits with internal
// apostrophes kept, so "don't" is one word (src/pattern.js tokenizeInput).
const RE_CORPUS_WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

/** Lower-cased word list of one example string. */
export function corpusWords(text) {
  const out = [];
  const s = String(text);
  RE_CORPUS_WORD.lastIndex = 0;
  let m;
  while ((m = RE_CORPUS_WORD.exec(s)) !== null) out.push(m[0].toLowerCase());
  return out;
}

/** Index every Pattern / PatternList declaration, case-insensitively. */
export function buildPatternIndex(program) {
  const map = new Map();
  for (const d of program.definitions || []) {
    if (!d || !d.name) continue;
    // Last declaration wins; the archive has no intentional redefinition, and
    // load order is the manifest order, so a later file overriding an earlier
    // one is the behaviour a linker would give.
    map.set(String(d.name).toLowerCase(), d.value);
  }
  return map;
}

/**
 * Literal strings a Value can produce, ignoring every dynamic node (?mem, *n).
 * Used only to harvest Example text; the runtime has its own evaluator.
 */
function staticStrings(value, patterns, seen, out, budget) {
  if (out.length >= budget) return;
  if (value == null) return;
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  switch (value.t) {
    case "string":
      out.push(value.v == null ? "" : String(value.v));
      return;
    case "symbol": {
      const key = String(value.name).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const def = patterns.get(key);
      if (def !== undefined) staticStrings(def, patterns, seen, out, budget);
      seen.delete(key);
      return;
    }
    case "list":
    case "optional":
      for (const a of value.args || [])
        staticStrings(a, patterns, seen, out, budget);
      return;
    case "concat": {
      let acc = [""];
      for (const a of value.args || []) {
        const piece = [];
        staticStrings(a, patterns, seen, piece, budget);
        if (!piece.length) piece.push("");
        const next = [];
        for (const x of acc)
          for (const y of piece) {
            next.push(x + y);
            if (next.length >= budget) break;
          }
        acc = next;
        if (acc.length >= budget) break;
      }
      for (const s of acc) out.push(s);
      return;
    }
    default:
      return; // mem, star, starmatch, not — contribute nothing to the corpus
  }
}

function walkBlocksCollectingExamples(blocks, visit) {
  for (let b of blocks || []) {
    while (b) {
      for (const item of b.body || []) {
        if (item && item.condition !== undefined) {
          walkBlocksCollectingExamples([item], visit);
        } else if (item && EXAMPLE_COMMANDS.has(item.c)) {
          visit(item);
        }
      }
      b = b.otherwise;
    }
  }
}

/**
 * buildFrequencyTable(program) -> FrequencyTable
 *
 * The corpus is every Example / InitialExample / SequenceExample /
 * WhenFocused Example string in every loaded file, plus every OtherExamples
 * argument.  [E12 §12.2]: "553 Example statements, 182 OtherExamples and 2
 * InitialExample statements — that is the word-frequency corpus a faithful port
 * must build."  The `of` string of an OtherExamples is deliberately NOT counted
 * again: it repeats an Example that is already in the corpus.
 *
 * JUDGEMENT CALL, [E12 §14.2 item 3]: a word absent from the corpus is scored
 * as though it occurred exactly once, so its specificity is 1000·ln(N).  With
 * MrMind's corpus (~3,000 words) that ceiling is ≈ 8,000 — which is exactly the
 * value [P14 §14.4] assumes for the rare words "virtual", "robot", "complex",
 * "expensive" and "NeuroStudio" in its worked examples.  That coincidence is the
 * evidence for this choice.
 */
export function buildFrequencyTable(program, options = {}) {
  const patterns = options.patterns || buildPatternIndex(program);
  const counts = new Map();
  let total = 0;
  let statements = 0;

  const addText = (text) => {
    for (const w of corpusWords(text)) {
      counts.set(w, (counts.get(w) || 0) + 1);
      total++;
    }
  };
  const addValue = (value) => {
    const out = [];
    staticStrings(value, patterns, new Set(), out, 4096);
    for (const s of out) addText(s);
  };

  for (const cat of program.categories || []) {
    walkBlocksCollectingExamples(cat.blocks, (cmd) => {
      statements++;
      addValue(cmd.args);
    });
  }
  for (const oe of program.otherExamples || []) {
    statements++;
    addValue(oe.args);
  }

  // Guard against a corpus-free program (unit tests): keep log(1/f) finite.
  const denom = total > 0 ? total : 1;
  const missingCount = options.missingWordCount ?? 1;

  const wordSpecCache = new Map();
  const tokenSpecCache = new Map();

  function wordSpecificity(word) {
    const w = String(word).toLowerCase();
    let v = wordSpecCache.get(w);
    if (v !== undefined) return v;
    let c = counts.get(w);
    if (c === undefined && w.indexOf("'") !== -1)
      c = counts.get(w.replace(/'/g, ""));
    if (!c) c = missingCount;
    v = Math.round(SPEC_SCALE * Math.log(denom / c));
    wordSpecCache.set(w, v);
    return v;
  }

  /**
   * A pattern token that contains #, % or ^ is a partial word.  [P14 §14.2]:
   * "If it is testing an input for a partial word (such as a word beginning
   * with the string "develop"), the frequency is the combined frequency of all
   * words in the set of Example that match the partial word."
   */
  function partialSpecificity(token) {
    const re = partialRegex(token);
    if (!re) return wordSpecificity(token);
    let c = 0;
    for (const [w, n] of counts) if (re.test(w)) c += n;
    if (!c) c = missingCount;
    return Math.round(SPEC_SCALE * Math.log(denom / c));
  }

  function tokenSpecificity(token) {
    let v = tokenSpecCache.get(token);
    if (v !== undefined) return v;
    // A token with no letters or digits is pure punctuation; it carries no
    // information about the input, so it scores nothing.
    const bare = token.replace(/[#%^']/g, "");
    if (!/[\p{L}\p{N}]/u.test(bare) && !/[#%^]/.test(token)) v = 0;
    else if (/[#%^]/.test(token)) v = partialSpecificity(token);
    else v = wordSpecificity(bare);
    tokenSpecCache.set(token, v);
    return v;
  }

  const renderedCache = new Map();
  function renderedSpecificity(rendered) {
    let v = renderedCache.get(rendered);
    if (v !== undefined) return v;
    v = 0;
    for (const tok of patternWordTokens(rendered)) v += tokenSpecificity(tok);
    renderedCache.set(rendered, v);
    return v;
  }

  return {
    counts,
    total,
    statements,
    wordSpecificity,
    tokenSpecificity,
    renderedSpecificity,
  };
}

/**
 * Split a RENDERED pattern string into the word-bearing arcs of the matcher.
 * `*` and every whitespace/`,`/`.` separator contributes nothing
 * ([P14 §14.3]: "The space, like the * wildcards, does not add to the
 * specificity in the present implementation"); `\x` is a literal character;
 * `#`, `%`, `^` and `'` stay attached to the word they qualify.
 */
export function patternWordTokens(rendered) {
  const out = [];
  const s = String(rendered);
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length) {
      cur += s[i + 1];
      i++;
      continue;
    }
    if (c === "*" || c === "," || c === "." || /\s/.test(c)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

function partialRegex(token) {
  let src = "^";
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === "#") src += "[^\\s]*";
    else if (c === "%") src += "[0-9]";
    else if (c === "^") src += "[^\\s]";
    else if (c === "'") src += "['’]?";
    else src += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  src += "$";
  try {
    return new RegExp(src, "u");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Compiled patterns carrying their own (input-independent) specificity.

/**
 * compileScored(value, env, table) -> { renderings: [...], maxSpec }
 * `renderings` is sorted by descending specificity so the first match found is
 * the highest-scoring path.  [P14 §14.3]: "If there is more than one path for
 * the given input ... the highest specificity value is chosen."
 */
export function compileScored(value, env, table) {
  const compiled = compilePattern(value, env);
  const renderings = compiled.renderings.map((r) => ({
    ...r,
    spec: table.renderedSpecificity(r.text),
  }));
  renderings.sort((a, b) => b.spec - a.spec);
  return { kind: "CompiledPattern", source: value, renderings };
}

/**
 * Highest specificity among the renderings of `scored` that match `text`.
 * Returns -1 when nothing matches.  Because `renderings` is sorted descending,
 * the first hit is the answer.
 */
export function bestMatchSpecificity(scored, text, mode) {
  for (const r of scored.renderings) {
    const one = { kind: "CompiledPattern", renderings: [r] };
    if (matchPattern(one, text, mode)) return r.spec;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Scoring a condition tree.

function conj(specs) {
  if (!specs.length) return 0;
  let sum = 0;
  for (const s of specs) sum += s;
  return sum - CONJUNCTION_PENALTY * (specs.length - 1);
}

/**
 * conditionSpecificity(condition, ctx) -> { truth: Boolean, spec: Number }
 *
 * Evaluates a condition tree in SELECTION mode and scores it at the same time.
 * Selection mode differs from execution in exactly two documented ways
 * ([E12 §12.4], [C §10.4]):
 *   - IfChance / Chance counts as TRUE and contributes 0; the dice are rolled
 *     only when the category is actually executed.
 *   - Focused is evaluated for real but scores 100 × shared active subjects.
 *
 * `ctx` supplies the primitives (implemented in src/runtime.js):
 *   ctx.match(lhs, test, negated, rhsLeaf) -> {truth, spec}
 *   ctx.recall(memValue)                   -> Boolean
 *   ctx.attrSpec(memValue)                 -> Number
 *   ctx.focused()                          -> {truth, spec}
 *   ctx.negatedSpecificity                 -> Number (optional)
 */
export function conditionSpecificity(condition, ctx) {
  const NEG = ctx.negatedSpecificity ?? NEGATED_SPECIFICITY;
  if (!condition) return { truth: true, spec: 0 };

  switch (condition.op) {
    case "always":
      return { truth: true, spec: 0 };

    case "chance":
      // [C §10.4] treated as always true during selection, specificity 0.
      return { truth: true, spec: 0 };

    case "focused":
      return ctx.focused();

    case "optional": {
      // [P14 §14.3] "the specificity of an optional element or condition is
      // zero if it is not true, and its normal specificity if it is."  A braced
      // clause never changes truth ([C §7.4]).
      const inner = conditionSpecificity(condition.arg, ctx);
      return { truth: true, spec: inner.truth ? inner.spec : 0 };
    }

    case "not": {
      const inner = conditionSpecificity(condition.arg, ctx);
      return { truth: !inner.truth, spec: NEG };
    }

    case "and": {
      const specs = [];
      let truth = true;
      for (const a of condition.args || []) {
        const r = conditionSpecificity(a, ctx);
        if (!r.truth) truth = false;
        specs.push(r.spec);
      }
      return { truth, spec: conj(specs) };
    }

    case "or": {
      // [P14 §14.3] "the highest specificity values from among the true children"
      let truth = false;
      let best = 0;
      for (const a of condition.args || []) {
        const r = conditionSpecificity(a, ctx);
        if (r.truth) {
          if (!truth || r.spec > best) best = r.spec;
          truth = true;
        }
      }
      return { truth, spec: truth ? best : 0 };
    }

    case "recall": {
      const args = condition.args || [];
      const listOp = condition.listOp === "and" ? "and" : "or";
      let truth;
      let spec = 0;
      if (listOp === "and") {
        truth = args.length > 0;
        const specs = [];
        for (const a of args) {
          if (!ctx.recall(a)) truth = false;
          specs.push(ctx.attrSpec(a));
        }
        spec = conj(specs);
      } else {
        truth = false;
        for (const a of args) {
          if (ctx.recall(a)) {
            const s = ctx.attrSpec(a);
            if (!truth || s > spec) spec = s;
            truth = true;
          }
        }
      }
      if (condition.negated) return { truth: !truth, spec: NEG };
      return { truth, spec: truth ? spec : 0 };
    }

    case "match":
      return matchConditionSpecificity(condition, ctx);

    default:
      // An unknown condition node cannot make a block active on its own.
      return { truth: true, spec: 0 };
  }
}

/**
 * A matching condition.  The right-hand side is a MatchingList whose structure
 * is significant:
 *   {t:'list', op:'and'}   every element must match  -> conjunction  [C §7.1]
 *   {t:'not', arg}         `and not X` inside a list -> negation     [C §7.3]
 *   {t:'optional'}         braces                    -> optional     [C §7.4]
 *   anything else          one pattern (which may itself be an OR list) ->
 *                          compiled and scored as the best matching rendering
 *                          [P14 §14.3]
 */
function matchConditionSpecificity(condition, ctx) {
  const NEG = ctx.negatedSpecificity ?? NEGATED_SPECIFICITY;
  const r = matchListSpecificity(
    condition.lhs,
    condition.test,
    condition.rhs,
    ctx,
  );
  if (condition.negated) return { truth: !r.truth, spec: NEG };
  return r;
}

function matchListSpecificity(lhs, test, node, ctx) {
  const NEG = ctx.negatedSpecificity ?? NEGATED_SPECIFICITY;
  if (node && node.t === "not") {
    const inner = matchListSpecificity(lhs, test, node.arg, ctx);
    return { truth: !inner.truth, spec: NEG };
  }
  if (node && node.t === "optional") {
    const inner = matchListSpecificity(
      lhs,
      test,
      { t: "list", op: node.op || "or", args: node.args || [] },
      ctx,
    );
    return { truth: true, spec: inner.truth ? inner.spec : 0 };
  }
  if (node && node.t === "list" && node.op === "and") {
    const specs = [];
    let truth = (node.args || []).length > 0;
    for (const a of node.args || []) {
      const r = matchListSpecificity(lhs, test, a, ctx);
      if (!r.truth) truth = false;
      specs.push(r.spec);
    }
    return { truth, spec: conj(specs) };
  }
  // An OR list is normally left to the compiler, which expands the alternation
  // for us.  But an OR list that CONTAINS an `and` list or an `and not` element
  // cannot be: rendering would flatten the conjunction into extra alternatives.
  // `Mrmind3/AboutUser/UserSociety.n:45-46` is the shape —
  //   IfHeard ((I,HUMAN) and ("money","earn",…))
  //   Or      ("I"+("own"+"*"), ("work"+"*"))
  // — where flattening makes the bare word "I" activate the topic.
  if (
    node &&
    node.t === "list" &&
    ctx.needsStructural &&
    ctx.needsStructural(node)
  ) {
    let truth = false;
    let best = 0;
    for (const a of node.args || []) {
      const r = matchListSpecificity(lhs, test, a, ctx);
      if (r.truth) {
        if (!truth || r.spec > best) best = r.spec;
        truth = true;
      }
    }
    return { truth, spec: truth ? best : 0 };
  }
  // Leaf: an OR list, a concat, a string, a symbol …  Compiling it expands the
  // alternation, so max-over-matching-renderings is exactly
  // "the most specific element of the list that actually matched" [P14 §14.3].
  return ctx.match(lhs, test, node);
}

export default {
  buildFrequencyTable,
  conditionSpecificity,
  buildPatternIndex,
  compileScored,
  bestMatchSpecificity,
  corpusWords,
  patternWordTokens,
  SPEC_SCALE,
  CONJUNCTION_PENALTY,
  DEFAULT_ATTRIBUTE_SPECIFICITY,
  FOCUSED_UNIT,
  NEGATED_SPECIFICITY,
};

// engine/src/runtime.js
//
// The NeuroServer run loop for the MrMind revival.
//
// Contract: exports `class Bot` (engine/CONTRACT.md).  No language model, ever:
// every string this module emits was read out of Peggy Weil's scripts.
//
// Sources cited inline:
//   [BF]  spec/neuroserver-help/MANUAL__BestFit.txt
//   [OPS] spec/neuroserver-help/MANUAL__Operators.txt
//   [P]   archive/_research/patents/GERBIL-LANGUAGE-NOTES.md  (section numbers)
//   [C]   spec/C-conditions.md
//   [D]   spec/D-commands.md
//   [E]   spec/E-topics-focus-and-selection.md
//   [F]   spec/F-stdquestion-library.md
//
// Deviations from CONTRACT.md are listed in engine/DEVIATIONS.md; the ones this
// file introduces are marked "DEVIATION" in the comments below.

import { compilePattern, matchPattern } from "./pattern.js";
import {
  buildFrequencyTable,
  buildPatternIndex,
  compileScored,
  bestMatchSpecificity,
  conditionSpecificity,
  DEFAULT_ATTRIBUTE_SPECIFICITY,
  FOCUSED_UNIT,
  NEGATED_SPECIFICITY,
} from "./specificity.js";

// --- CABlockEnd values [C §4.2] -------------------------------------------
const NOT_ACTIVATED = "notactivated";
const CONTINUE = "continue";
const DONE = "done";
const NEXT_CATEGORY = "nextcategory";
const SWITCH = "switch";
const SWITCH_BACK = "switchback";
const WAITING = "waiting";
const RUNTIME_ERROR = "runtimeerror";

const EXAMPLE_COMMANDS = new Set([
  "example",
  "initialexample",
  "sequenceexample",
  "whenfocusedexample",
]);

const isBlock = (x) => !!x && x.condition !== undefined;
const isChanceBlock = (x) =>
  isBlock(x) && x.condition && x.condition.op === "chance";
const isBareChance = (x) => isChanceBlock(x) && x.condition.p == null;

/**
 * Output-side escape handling.  [D §1.3]: `\"` is a literal quote (already
 * decoded by the lexer); `\.` `\?` `\,` `\'` … escape PATTERN metacharacters and
 * "matter on the condition side, not in output"; but `C:\Program Files\…`
 * appears raw, so `\` before a letter or digit is two literal characters.
 * JUDGEMENT CALL: drop the backslash before a metacharacter, keep it otherwise.
 */
const META = new Set([
  ".",
  "?",
  "!",
  ",",
  "*",
  "+",
  "-",
  "/",
  "(",
  ")",
  "'",
  "%",
  "#",
  "^",
  "\\",
  "&",
  "=",
  '"',
  "{",
  "}",
  "[",
  "]",
  ";",
  ":",
  "<",
  ">",
  "|",
  "$",
  "@",
  "~",
]);
function renderLiteral(text) {
  const s = String(text);
  if (s.indexOf("\\") === -1) return s;
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length && META.has(s[i + 1])) {
      out += s[i + 1];
      i++;
    } else out += s[i];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Compute functions [D §3.3].

function capitalizeWords(s) {
  return String(s).replace(
    /[\p{L}\p{N}][\p{L}\p{N}'’]*/gu,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );
}
function toInt(s) {
  const n = parseInt(String(s).trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

const COMPUTE = {
  // SpellCheck CANNOT be reproduced: the original called the proprietary
  // Wintertree/Sentry engine against a compiled .clx lexicon that is not in the
  // archive.  Identity is the documented fallback [D §3.3]; override it with
  // options.spellcheck.  This is the single biggest known deviation and it is
  // recorded in engine/DEVIATIONS.md.
  spellcheck: (args, bot) => args.map((a) => bot.spellcheck(a)),
  capitalize: (args) => args.map(capitalizeWords),
  uppercase: (args) => args.map((a) => String(a).toUpperCase()),
  lowercase: (args) => args.map((a) => String(a).toLowerCase()),
  urlencoding: (args) => args.map((a) => encodeURIComponent(String(a))),
  sum: (args) => [String(args.reduce((a, b) => a + toInt(b), 0))],
  difference: (args) => [
    String(args.slice(1).reduce((a, b) => a - toInt(b), toInt(args[0]))),
  ],
  product: (args) => [String(args.reduce((a, b) => a * toInt(b), 1))],
  ratio: (args) => [
    String(
      toInt(args[1]) === 0 ? 0 : Math.trunc(toInt(args[0]) / toInt(args[1])),
    ),
  ],
};

// ---------------------------------------------------------------------------

/**
 * Words of a string, lowercased, punctuation dropped, single-spaced.  Used only
 * to ask "did these words come from the user's input?" — never for matching,
 * which goes through src/pattern.js.
 */
function normalizeWords(text) {
  return String(text == null ? "" : text)
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export class Bot {
  /**
   * @param {Object} program  the parsed Program (see engine/CONTRACT.md)
   * @param {Object} [options]
   *   random     () => [0,1)     injectable RNG, default Math.random
   *   spellcheck (s) => s        Compute SpellCheck, default identity
   *   maxSteps   Number          category executions per run before bailing out
   *   negatedSpecificity Number  see specificity.js
   */
  constructor(program, options = {}) {
    this.program = program;
    this.options = options;
    this.random = options.random || Math.random;
    this.spellcheck = options.spellcheck || ((s) => s);
    this.maxSteps = options.maxSteps || 20000;
    this.negatedSpecificity = options.negatedSpecificity ?? NEGATED_SPECIFICITY;

    this.patterns = buildPatternIndex(program);
    this.table =
      options.table ||
      buildFrequencyTable(program, { patterns: this.patterns });

    this.categories = program.categories || [];
    this.catIndex = new Map();
    this.categories.forEach((c, i) => this.catIndex.set(c, i));

    this.byName = new Map();
    this.subjectMap = new Map();
    this.priorityCats = [];
    this.defaultCats = [];
    this.standardCats = [];
    this.catSubjects = new Map(); // category -> normalised subject list

    for (const cat of this.categories) {
      const key = String(cat.name || "")
        .trim()
        .toLowerCase();
      // [E §13.7] `Priority Topic "FindQuestion "` has a trailing space in its
      // name; SwitchTo/Focus targets are matched case- and space-insensitively.
      if (!this.byName.has(key)) this.byName.set(key, cat);
      // [E §3.2] subject strings are opaque: "ME,AGE" is ONE subject.
      const subs = (cat.subjects || []).map((s) =>
        String(s).trim().toLowerCase(),
      );
      this.catSubjects.set(cat, subs);
      for (const s of subs) {
        if (!this.subjectMap.has(s)) this.subjectMap.set(s, []);
        this.subjectMap.get(s).push(cat);
      }
      if (cat.type === "priority") this.priorityCats.push(cat);
      else if (cat.type === "default") this.defaultCats.push(cat);
      else if (cat.type === "standard") this.standardCats.push(cat);
    }

    // Precomputation per category.
    this.baseBlocks = new Map(); // category -> [{block, chain}]
    for (const cat of this.categories) {
      this.baseBlocks.set(cat, collectBaseLevelBlocks(cat));
      resolveTryAgain(cat);
    }

    // Pattern caches (keyed by AST node identity; the AST is immutable).
    this._dynamic = new Map();
    this._compiled = new Map();
    this._scored = new Map();
    this._structural = new Map();

    // Attribute specificities, lower-cased [BF "Changing Numeric Specificity"].
    this.attributeSpecificity = new Map();
    for (const [k, v] of Object.entries(program.attributes || {}))
      this.attributeSpecificity.set(String(k).toLowerCase(), v);

    this.reset();
  }

  // ---- per-user state ----------------------------------------------------

  /** Fresh user record [P §10 CUserRec]. */
  reset() {
    this.memory = new Map(); // lower-cased attribute -> string[]
    this.attentionFocus = this.standardCats.slice(); // build order initially
    this.suppressed = new Set();
    this.continuation = null; // pending WaitForResponse
    this.switchStack = [];
    this.seqStack = [];
    this.activeSubjects = new Set();
    this.stars = { "*": [], "#": [], "^": [], "%": [] };
    this.starMatch = "";
    this.trace = [];
    this.console = [];
    this.files = new Map();
    this.actions = [];
    this.warnings = [];
    this.disconnected = false;
    // Categories declared `Suppressed` in their header are suppressed from the
    // start [E §2.6].
    for (const cat of this.categories)
      if (cat.suppressed) this.suppressed.add(cat);
    return this;
  }

  get state() {
    return {
      memory: Object.fromEntries(
        [...this.memory].map(([k, v]) => [k, v.slice()]),
      ),
      focus: this.attentionFocus.map((c) => c.name),
      suppressed: [...this.suppressed].map((c) => c.name),
      activeSubjects: [...this.activeSubjects],
      continuation: this.continuation ? this.continuation.category.name : null,
      switchStack: this.switchStack.map((f) => f.category.name),
      sequenceStack: this.seqStack.map((f) => f.category.name),
      stars: { "*": this.stars["*"].slice(), "#": this.stars["#"].slice() },
      starMatch: this.starMatch,
    };
  }

  // ---- memory ------------------------------------------------------------

  memKey(memValue) {
    return String(memValue && memValue.name != null ? memValue.name : memValue)
      .trim()
      .toLowerCase();
  }
  /** Raw stored list; [] when unset. */
  memGet(name) {
    return this.memory.get(this.memKey(name)) || [];
  }
  memSet(name, values) {
    this.memory.set(this.memKey(name), values.slice());
  }
  memForget(name) {
    this.memory.delete(this.memKey(name));
  }
  /**
   * [C §11.1] "Recall(k) == mem.has(k) && non-empty".  A slot holding only the
   * empty string does not satisfy IfRecall — the library relies on this when it
   * writes `Remember ?WhoQuestion is *1;` with an empty capture.
   */
  recall(memValue) {
    const v = this.memory.get(this.memKey(memValue));
    return !!v && v.some((s) => s !== "");
  }
  attrSpec(memValue) {
    const k = this.memKey(memValue);
    const v = this.attributeSpecificity.get(k);
    return v === undefined ? DEFAULT_ATTRIBUTE_SPECIFICITY : v;
  }

  // ---- value evaluation [D §1.2] ----------------------------------------
  // `+` is BARE concatenation with no separator; `,` is list union; an unset
  // attribute contributes the empty string (proved by TextFiles/Ashamed.txt).

  evalValue(value, depth = 0) {
    if (value == null || depth > 40) return [""];
    if (typeof value === "string") return [renderLiteral(value)];
    switch (value.t) {
      case "string":
        return [renderLiteral(value.v == null ? "" : value.v)];
      case "mem": {
        const v = this.memGet(value.name);
        return v.length ? v.slice() : [""];
      }
      case "star": {
        const sig = value.sigil === "&" ? "^" : value.sigil;
        const bag = this.stars[sig] || [];
        return [bag[value.n] == null ? "" : String(bag[value.n])];
      }
      case "starmatch":
        return [this.starMatch == null ? "" : String(this.starMatch)];
      case "symbol": {
        const def = this.patterns.get(String(value.name).toLowerCase());
        if (def === undefined) return [""];
        return this.evalValue(def, depth + 1);
      }
      case "list":
      case "optional": {
        const out = [];
        for (const a of value.args || [])
          out.push(...this.evalValue(a, depth + 1));
        return out.length ? out : [""];
      }
      case "concat": {
        // Cross product, right-most index varying fastest [D §1.2].
        let acc = [""];
        for (const a of value.args || []) {
          const piece = this.evalValue(a, depth + 1);
          const next = [];
          for (const x of acc) for (const y of piece) next.push(x + y);
          acc = next.length ? next : [""];
          if (acc.length > 4096) {
            acc = acc.slice(0, 4096);
            this.warnings.push("concat cross product truncated at 4096");
          }
        }
        return acc;
      }
      case "not":
        return this.evalValue(value.arg, depth + 1);
      default:
        return [""];
    }
  }

  // ---- pattern plumbing --------------------------------------------------

  /** Pattern-matching env: symbols, memory, star buffers. */
  get env() {
    if (!this._env) {
      const self = this;
      this._env = {
        lookupPattern: (name) => self.patterns.get(String(name).toLowerCase()),
        lookupMem: (name) => {
          const v = self.memGet(name);
          return v.length ? v : [""];
        },
        get stars() {
          return self.stars;
        },
        get starMatch() {
          return self.starMatch;
        },
      };
    }
    return this._env;
  }

  /**
   * A Value is DYNAMIC if it can only be resolved at run time — it mentions a
   * memory reference or a star buffer, directly or through a PatternList.
   * [P §14.5] "Conditions whose LHS is not an attribute or whose RHS is not a
   * fixed pattern (e.g. tests on *1) are run-time conditions".
   */
  isDynamic(value, seen) {
    if (value == null) return false;
    if (typeof value === "string") return false;
    const cached = this._dynamic.get(value);
    if (cached !== undefined) return cached;
    const s = seen || new Set();
    let out = false;
    switch (value.t) {
      case "mem":
      case "star":
      case "starmatch":
        out = true;
        break;
      case "symbol": {
        const key = String(value.name).toLowerCase();
        if (s.has(key)) out = false;
        else {
          s.add(key);
          const def = this.patterns.get(key);
          out = def === undefined ? false : this.isDynamic(def, s);
          s.delete(key);
        }
        break;
      }
      case "list":
      case "optional":
      case "concat":
        out = (value.args || []).some((a) => this.isDynamic(a, s));
        break;
      case "not":
        out = this.isDynamic(value.arg, s);
        break;
      default:
        out = false;
    }
    if (!seen) this._dynamic.set(value, out);
    return out;
  }

  /**
   * True when a MatchingList node cannot be handed to the pattern compiler
   * whole, because somewhere inside it there is an `and` list or an `and not`
   * element.  Rendering expands every list as an alternation, which silently
   * turns "contains all of these" into "contains any of these"
   * ([C §7.1], 208 AND joins across the build).
   */
  needsStructural(node, seen) {
    if (node == null || typeof node === "string") return false;
    const cached = this._structural.get(node);
    if (cached !== undefined) return cached;
    const s = seen || new Set();
    let out = false;
    if (node.t === "not") out = true;
    else if (node.t === "list" && node.op === "and") out = true;
    else if (node.t === "list" || node.t === "optional")
      out = (node.args || []).some((a) => this.needsStructural(a, s));
    else if (node.t === "symbol") {
      const key = String(node.name).toLowerCase();
      if (!s.has(key)) {
        s.add(key);
        const def = this.patterns.get(key);
        out = def === undefined ? false : this.needsStructural(def, s);
        s.delete(key);
      }
    }
    if (!seen) this._structural.set(node, out);
    return out;
  }

  /** Declaration-order compile, used at EXECUTION time (star-buffer order). */
  compiledFor(value) {
    if (this.isDynamic(value)) return compilePattern(value, this.env);
    let c = this._compiled.get(value);
    if (!c) {
      c = compilePattern(value, this.env);
      this._compiled.set(value, c);
    }
    return c;
  }

  /** Specificity-sorted compile, used at SELECTION time. null when dynamic. */
  scoredFor(value) {
    if (this.isDynamic(value)) return null;
    let c = this._scored.get(value);
    if (!c) {
      c = compileScored(value, this.env, this.table);
      this._scored.set(value, c);
    }
    return c;
  }

  /**
   * Is this left-hand-side value the user's current input, or a piece of it?
   *
   * `IfHeard X` is `?WhatUserSaid Contains X`, so ?WhatUserSaid (and
   * ?WhatUserDid on an action turn) IS the input.  The StdQuestion library also
   * stores stripped fragments of the same input in ?DescriptionQuestion,
   * ?FactQuestion, ?WhoQuestion and friends (spec/F §3), and those fragments are
   * words the user actually typed, so a match against them is a match against
   * the input and scores by word frequency.  Anything else — ?WhatRobotSaid,
   * ?Name, ?LastTopic — is bot state, and scores as an attribute test instead.
   *
   * Judgement call (engine/DEVIATIONS.md): NeuroServer knew this structurally,
   * because its matcher NFA was built over the input alone.  Having no NFA to
   * consult, this port asks the equivalent question of the value at run time.
   */
  isInputMemref(lhs) {
    if (!lhs || lhs.t !== "mem" || lhs.user) return false;
    const key = this.memKey(lhs.name);
    // ?WhatUserMeant is the language's own name for the input: "?WhatUserMeant
    // is part of the language.  By default it's set equal to ?WhatUserSaid.
    // ?WhatUserSaid cannot be modified, but we can 'clean up' ?WhatUserMeant"
    // (Library/StdQuestion/combis/QuesResDebug.us.n:136-141), and `IfHeard L`
    // compiles to `?WhatUserMeant Contains L` (src/parser.js).
    return (
      key === "whatusersaid" || key === "whatuserdid" || key === "whatusermeant"
    );
  }

  /**
   * Is this left-hand-side VALUE a piece of what the user just typed?  The
   * StdQuestion library stores stripped fragments of the same input in
   * ?DescriptionQuestion, ?FactQuestion, ?WhoQuestion and friends (spec/F §3):
   * those fragments are words the user actually typed, so matching them is
   * matching the input and scores by word frequency.  ?WhatRobotSaid, ?Name and
   * ?LastTopic are bot state, and score as an attribute test instead.
   */
  isInputDerived(lhs, value) {
    if (this.isInputMemref(lhs)) return true;
    if (!lhs || lhs.t !== "mem" || lhs.user) return false;
    const v = normalizeWords(value);
    if (!v) return false;
    const raw = this.memGet("whatusersaid")[0] || "";
    if (this._inputWordsFor !== raw) {
      this._inputWordsFor = raw;
      this._inputWords = " " + normalizeWords(raw) + " ";
    }
    return this._inputWords.includes(" " + v + " ");
  }

  /** Left-hand side of a matching condition, as a list of candidate strings. */
  lhsValues(lhs) {
    if (lhs && lhs.t === "mem") return this.memGet(lhs.name).slice(); // [] when unset
    return this.evalValue(lhs);
  }

  // ---- condition evaluation, EXECUTION mode ------------------------------

  evalCondition(condition, cat) {
    if (!condition) return true;
    switch (condition.op) {
      case "always":
        return true;
      case "chance":
        // A bare IfChance is decided by the sibling-group rule in execList;
        // reaching it here means it was used outside a group.
        if (condition.p == null) return this.random() < 0.5;
        return this.random() < condition.p;
      case "focused":
        return this.sharedSubjectCount(cat) > 0;
      case "optional":
        // [C §7.4] braces never change truth.
        this.evalCondition(condition.arg, cat);
        return true;
      case "not":
        return !this.evalCondition(condition.arg, cat);
      case "and":
        for (const a of condition.args || [])
          if (!this.evalCondition(a, cat)) return false;
        return true;
      case "or":
        for (const a of condition.args || [])
          if (this.evalCondition(a, cat)) return true;
        return false;
      case "recall": {
        const args = condition.args || [];
        let truth;
        if (condition.listOp === "and") {
          truth = args.length > 0 && args.every((a) => this.recall(a));
        } else {
          truth = args.some((a) => this.recall(a));
        }
        return condition.negated ? !truth : truth;
      }
      case "match": {
        const hit = this.evalMatchList(
          condition.lhs,
          condition.test,
          condition.rhs,
          cat,
        );
        return condition.negated ? !hit : hit;
      }
      default:
        return true;
    }
  }

  /** A MatchingList honours `and` (all), `not`, and braces [C §7.1, §7.3, §7.4]. */
  evalMatchList(lhs, test, node, cat) {
    if (node && node.t === "not")
      return !this.evalMatchList(lhs, test, node.arg, cat);
    if (node && node.t === "optional") {
      this.evalMatchList(
        lhs,
        test,
        { t: "list", op: node.op || "or", args: node.args || [] },
        cat,
      );
      return true;
    }
    if (node && node.t === "list" && node.op === "and") {
      const args = node.args || [];
      if (!args.length) return true;
      for (const a of args)
        if (!this.evalMatchList(lhs, test, a, cat)) return false;
      return true;
    }
    // See the twin comment in specificity.js: an OR list that CONTAINS an `and`
    // list must be walked element by element, or rendering flattens the
    // conjunction into extra alternatives and the topic over-fires
    // (Mrmind3/AboutUser/UserSociety.n:45-46, "I pay taxes").
    if (node && node.t === "list" && this.needsStructural(node)) {
      for (const a of node.args || [])
        if (this.evalMatchList(lhs, test, a, cat)) return true; // first wins
      return false;
    }
    const values = this.lhsValues(lhs);
    if (!values.length) return false;
    const compiled = this.compiledFor(node);
    for (const v of values) {
      const hit = matchPattern(compiled, v, test);
      if (hit) {
        // [OPS] the star buffers hold the first successful match.
        this.stars = hit.stars;
        this.starMatch = hit.starMatch;
        return true;
      }
    }
    return false;
  }

  sharedSubjectCount(cat) {
    if (!cat) return 0;
    const subs = this.catSubjects.get(cat) || [];
    let n = 0;
    for (const s of subs) if (this.activeSubjects.has(s)) n++;
    return n;
  }

  // ---- condition evaluation, SELECTION mode ------------------------------

  selectionCtx(cat) {
    const self = this;
    return {
      negatedSpecificity: this.negatedSpecificity,
      needsStructural: (n) => self.needsStructural(n),
      recall: (m) => self.recall(m),
      attrSpec: (m) => self.attrSpec(m),
      focused: () => {
        const n = self.sharedSubjectCount(cat);
        // [P §13.2] compile-time 0, run-time 100 × shared subjects.
        return { truth: n > 0, spec: n * FOCUSED_UNIT };
      },
      match: (lhs, test, node) => {
        const values = self.lhsValues(lhs);
        if (!values.length) return { truth: false, spec: 0 };
        const staticLhs = !!lhs && lhs.t === "mem" && !lhs.user;
        const scored = staticLhs ? self.scoredFor(node) : null;
        // [BF "How Specificity is Determined"] specificity measures "how closely
        // a pattern in a topic matches THE CURRENT INPUT"; [P §14.5] "Conditions
        // that are only computed at run-time can be assigned specificity values
        // based on the frequencies of the words IN THE INPUT that actually match
        // the condition."  A condition whose left-hand side is not the user's
        // input — `?WhatRobotSaid matches "<a long sentence MrMind said>"` is the
        // MrMind idiom, Defaults/Answers.n passim — therefore contributes no
        // word-frequency specificity: none of those words came from the user.
        // What it does contribute is the specificity of the attribute being
        // tested, because a declared Specificity "is used when the attribute is
        // tested using IfRecall OR ANY MATCHING CONDITION" [P §14.2, quoting the
        // Gerbil BNF commentary].  Default 2000, the same as IfRecall.
        // The attribute's own specificity is added on top of whatever words
        // matched, because a declared Specificity "is used when the attribute is
        // tested using IfRecall OR ANY MATCHING CONDITION" [P §14.2].  That is
        // also what makes a domain's description topic (`?DescriptionQuestion
        // contains DOM_X`) more specific than its keyword topic (`IfHeard
        // DOM_X`) in US 6,754,647 with the very same pattern.  ?WhatUserSaid,
        // ?WhatUserDid and ?WhatUserMeant are the input itself, not attributes,
        // so `IfHeard` keeps scoring on word frequency alone.
        const bonus =
          staticLhs && !self.isInputMemref(lhs) ? self.attrSpec(lhs) : 0;
        const derived = (v) => self.isInputDerived(lhs, v);
        if (!scored) {
          // Dynamic right-hand side: truth only.  Evaluated for real, because a
          // category selected here and then silent would break the run loop.
          const compiled = self.compiledFor(node);
          for (const v of values)
            if (matchPattern(compiled, v, test))
              return { truth: true, spec: bonus };
          return { truth: false, spec: 0 };
        }
        let best = -1;
        let gate = false;
        for (const v of values) {
          if (derived(v)) {
            const s = bestMatchSpecificity(scored, v, test);
            if (s > best) best = s;
          } else if (!gate && matchPattern(self.compiledFor(node), v, test)) {
            gate = true;
          }
        }
        if (best >= 0) return { truth: true, spec: best + bonus };
        if (gate) return { truth: true, spec: bonus };
        return { truth: false, spec: 0 };
      },
    };
  }

  /**
   * Score one base-level block: the conjunction of its own condition with every
   * enclosing condition [E §12.3 "a MatcherBlock is scored as a conjunction of
   * its conditions"; BF "A topic with a nested conditional statement … cannot
   * run unless each required condition is met"].
   */
  scoreBlock(entry, cat, ctx) {
    let sum = 0;
    let n = 0;
    for (const b of entry.chain) {
      const r = conditionSpecificity(b.condition, ctx);
      if (!r.truth) return null;
      sum += r.spec;
      n++;
    }
    return sum - 1000 * Math.max(0, n - 1);
  }

  /**
   * selectBestFit() [E §12.1].  Scores every eligible base-level block of every
   * unexecuted, unsuppressed Standard category, in attention-focus order; the
   * highest specificity wins, ties broken by position in the focus list.
   */
  selectBestFit(run) {
    let bestCat = null;
    let bestSpec = -Infinity;
    let bestRank = Infinity;
    for (let rank = 0; rank < this.attentionFocus.length; rank++) {
      const cat = this.attentionFocus[rank];
      if (!this.eligible(cat, run)) continue;
      const ctx = this.selectionCtx(cat);
      const entries = this.baseBlocks.get(cat) || [];
      for (const entry of entries) {
        const spec = this.scoreBlock(entry, cat, ctx);
        if (spec === null) continue;
        // "only the FIRST active block in a category is eligible" [P §14.1]
        if (spec > bestSpec || (spec === bestSpec && rank < bestRank)) {
          bestSpec = spec;
          bestRank = rank;
          bestCat = cat;
        }
        break;
      }
    }
    if (!bestCat) return null;
    run.selectedSpec = bestSpec;
    return bestCat;
  }

  eligible(cat, run) {
    if (run.executed.has(cat)) return false;
    if (this.suppressed.has(cat)) return false;
    // [E §11.4] Topic for a statement turn, Scenario for an action turn.
    if (
      run.kind === "scenario" ? cat.kind !== "scenario" : cat.kind !== "topic"
    )
      return false;
    return true;
  }

  // ---- the run loop [E §11.1] -------------------------------------------

  start() {
    // [F §10.2] the web connection: Priority Scenario "Login over Web" fires on
    // `?WhatUserDid Contains "Web ACCEPT CONNECTION"`, which SwitchTo's
    // "Robot Greeting", which SwitchTo's "Name Capture".
    return this.action("Web ACCEPT CONNECTION");
  }

  /**
   * Roll one of NeuroServer's engine-maintained history attributes forward:
   * ...BeforeThat <- ...Before <- current.  [IMPL-SPEC §8.1 "Set ?WhatUserSaid
   * (Statement) or ?WhatUserDid (Action); roll ?WhatUserSaidBefore forward";
   * vendor-docs/WhatUserSaidBeforeThat.txt "refers to the third-most recent text
   * input from the user ... Logins and other 'non-text' actions by the user do
   * not change ?WhatUserSaidBeforeThat".]  Nothing is stored until there is a
   * previous turn, so `IfRecall ?WhatUserSaidBefore` is false on turn one, which
   * is what Library/StdQuestion/StdDebugger.n:276 tests for.
   */
  rollHistory(base) {
    const prevBefore = this.memGet(base + "Before");
    if (prevBefore.length) this.memSet(base + "BeforeThat", prevBefore.slice());
    const current = this.memGet(base);
    if (current.length) this.memSet(base + "Before", current.slice());
  }

  input(text) {
    // Statement turn: the Said/Meant history rolls forward.  Reactions/
    // Annoyance.n:184 and :199 ("I'm repeating" / "I'm still repeating") are
    // `?WhatUserSaid Matches ?WhatUserSaidBefore`, and cannot work without it.
    this.rollHistory("WhatUserSaid");
    this.rollHistory("WhatUserMeant");
    this.memory.delete("whatuserdid");
    this.memSet("WhatUserSaid", [String(text)]);
    return this.run("topic");
  }

  action(text) {
    // Action turn: only the Did history rolls; a login must not push the user's
    // last sentence out of ?WhatUserSaidBefore (vendor doc, above).
    this.rollHistory("WhatUserDid");
    this.memory.delete("whatusersaid");
    this.memSet("WhatUserDid", [String(text)]);
    return this.run("scenario");
  }

  run(kind) {
    const run = {
      kind,
      executed: new Set(),
      produced: new Set(),
      dontFocus: new Set(),
      focusList: [],
      subjectSources: [],
      focusSubjects: [],
      output: [],
      activePriority: "priority",
      priorityPos: 0,
      defaultPos: 0,
      switchTarget: null,
      continuation: null,
      selectedSpec: 0,
      lastOutputCategory: null,
      steps: 0,
    };
    this.run_ = run; // exposed for debugging only; execution passes `run` explicitly

    let ret = NEXT_CATEGORY;
    let cat = this.getNextCategory(run, ret);
    while (cat) {
      if (run.steps++ > this.maxSteps) {
        this.warnings.push(
          `run aborted after ${this.maxSteps} category executions (possible SwitchTo loop)`,
        );
        break;
      }
      run.executed.add(cat);
      const resume =
        run.continuation && run.continuation.category === cat
          ? run.continuation.path
          : null;
      run.continuation = null;
      ret = this.runCategory(cat, run, resume);
      cat = this.getNextCategory(run, ret);
    }

    // 3. flush; 4. Refocus; 5. active subjects; 6. ?LastTopic  [E §11.1]
    this.refocus(run);
    this.updateActiveSubjects(run);
    this.memSet("WhatRobotSaid", run.output.slice());
    this.memSet("EverythingRobotJustSaid", [run.output.join(" ")]);
    if (run.lastOutputCategory)
      this.memSet("LastTopic", [run.lastOutputCategory.name]);
    this.run_ = null;
    return run.output;
  }

  getNextCategory(run, ret) {
    // Only a best-fit selection carries a specificity; a Priority, Default,
    // Sequence or resumed category has none, and its trace rows must not
    // inherit the last selection's score.
    run.selectedSpec = 0;
    switch (ret) {
      case RUNTIME_ERROR:
        this.switchStack.length = 0;
        this.seqStack.length = 0;
        return null;
      case WAITING:
        return null;
      case SWITCH: {
        const t = run.switchTarget;
        run.switchTarget = null;
        return t || null;
      }
      case SWITCH_BACK: {
        const frame = this.switchStack.pop();
        if (!frame) {
          this.warnings.push("SwitchBack with an empty continuation stack");
          return null;
        }
        run.continuation = frame;
        return frame.category;
      }
      case DONE: {
        if (this.seqStack.length) {
          const frame = this.seqStack.pop();
          run.continuation = frame;
          return frame.category;
        }
        this.switchStack.length = 0;
        return null;
      }
      default:
        break;
    }
    // NEXT_CATEGORY: advance through the phases.
    for (;;) {
      if (run.activePriority === "priority") {
        while (run.priorityPos < this.priorityCats.length) {
          const c = this.priorityCats[run.priorityPos++];
          if (this.eligible(c, run)) return c;
        }
        run.activePriority = "standard";
        // The pending WaitForResponse continuation runs immediately after the
        // Priority phase, whatever its specificity [E §11.3].
        if (this.continuation) {
          const frame = this.continuation;
          this.continuation = null;
          run.continuation = frame;
          return frame.category;
        }
        continue;
      }
      if (run.activePriority === "standard") {
        const c = this.selectBestFit(run);
        if (c) return c;
        run.activePriority = "default";
        continue;
      }
      while (run.defaultPos < this.defaultCats.length) {
        const c = this.defaultCats[run.defaultPos++];
        if (this.eligible(c, run)) return c;
      }
      return null;
    }
  }

  /** Category.run() [E §11.2]. */
  runCategory(cat, run, resume) {
    let r = this.execList(cat.blocks || [], cat, run, resume, []);
    if (r === CONTINUE || r === NOT_ACTIVATED) r = NEXT_CATEGORY;
    // [P §11] auto-focus: a Standard category that produced output is appended
    // to FocusList unless DontFocus ran.
    if (
      cat.type === "standard" &&
      run.produced.has(cat) &&
      !run.dontFocus.has(cat)
    ) {
      this.autoFocus(cat, run);
    }
    return r;
  }

  /**
   * Execute a list of items (a category's blocks, or a block's body).
   * `resume` is a continuation path: [{i, alt}, …, {i}].
   * `frames` is the stack of enclosing {i, alt} used to build new continuations.
   */
  execList(items, cat, run, resume, frames) {
    let start = 0;
    let descendRest = null;
    let descendAlt = 0;
    if (resume && resume.length) {
      start = resume[0].i;
      if (resume.length > 1) {
        descendAlt = resume[0].alt || 0;
        descendRest = resume.slice(1);
      }
    }
    let skipChance = false;
    let chanceGroup = null;

    for (let i = start; i < items.length; i++) {
      const item = items[i];

      if (!isBlock(item)) {
        skipChance = false;
        chanceGroup = null;
        const r = this.execCommand(item, cat, run, frames, i);
        if (r !== CONTINUE) return r;
        continue;
      }

      // --- resuming into the middle of this block
      if (descendRest && i === start) {
        let b = item;
        for (let k = 0; k < descendAlt && b; k++) b = b.otherwise;
        if (!b) {
          descendRest = null;
          continue;
        }
        frames.push({ i, alt: descendAlt });
        let r = this.execList(b.body || [], cat, run, descendRest, frames);
        frames.pop();
        descendRest = null;
        if (r === CONTINUE)
          r = this.terminator(b, cat, run, frames, i, descendAlt);
        if (r !== CONTINUE) return r;
        if (isChanceBlock(item) && isChanceBlock(items[i + 1]))
          skipChance = true;
        continue;
      }

      // --- the IfChance skip rule [C §10.3 Rule B]
      if (isChanceBlock(item)) {
        if (skipChance) continue;
        if (isBareChance(item) && chanceGroup === null)
          chanceGroup = this.beginChanceGroup(items, i);
      } else {
        chanceGroup = null;
        skipChance = false;
      }

      // --- walk the Otherwise chain until a condition holds [C §9.2]
      let b = item;
      let alt = 0;
      let r = NOT_ACTIVATED;
      while (b) {
        let cond;
        if (b === item && isBareChance(b) && chanceGroup)
          cond = chanceGroup.next();
        else cond = this.evalCondition(b.condition, cat);
        if (cond) {
          frames.push({ i, alt });
          let rr = this.execList(b.body || [], cat, run, null, frames);
          frames.pop();
          if (rr === CONTINUE)
            rr = this.terminator(b, cat, run, frames, i, alt);
          r = rr;
          break;
        }
        b = b.otherwise;
        alt++;
      }
      if (r === NOT_ACTIVATED) continue;
      if (r !== CONTINUE) return r;
      if (isChanceBlock(item) && isChanceBlock(items[i + 1])) skipChance = true;
    }
    return CONTINUE;
  }

  /**
   * [C §10.3] A maximal run of sibling argument-less IfChance blocks picks
   * exactly one member, uniformly.  Implemented lazily so a group that is never
   * reached consumes no randomness.
   */
  beginChanceGroup(items, at) {
    let n = 0;
    for (let k = at; k < items.length && isBareChance(items[k]); k++) n++;
    const rng = this.random;
    let remaining = n;
    let chosen = false;
    return {
      size: n,
      next() {
        if (chosen || remaining <= 0) return false;
        if (rng() < 1 / remaining) {
          chosen = true;
          return true;
        }
        remaining--;
        return false;
      },
    };
  }

  /** Block terminators [C §4.2]. */
  terminator(block, cat, run, frames, i, alt) {
    switch (block.end) {
      case "done":
        return DONE;
      case "continue":
        return CONTINUE;
      case "nexttopic":
      case "nextscenario":
        return NEXT_CATEGORY;
      case "switchback":
        return SWITCH_BACK;
      case "tryagain": {
        // [C §4.2] "a special case of WaitForResponse in which the
        // CContinuation starts from the previous WaitForResponse".  The path was
        // resolved statically at load time.
        const path = block._tryAgainPath;
        if (!path) {
          this.warnings.push(
            `TryAgain with no WaitForResponse in scope (${cat.name}:${block.line})`,
          );
          return DONE;
        }
        this.continuation = {
          category: cat,
          path: path.map((f) => ({ ...f })),
        };
        return WAITING;
      }
      default:
        return CONTINUE;
    }
  }

  // ---- commands ----------------------------------------------------------

  execCommand(cmd, cat, run, frames, index) {
    if (!cmd || !cmd.c) return CONTINUE;
    switch (cmd.c) {
      case "say": {
        const lines = this.evalValue(cmd.args);
        for (const line of lines) this.emit(line, cat, run, cmd);
        return CONTINUE;
      }
      case "sayoneof": {
        const list = this.evalValue(cmd.args);
        if (list.length) this.emit(this.pick(list), cat, run, cmd);
        return CONTINUE;
      }
      case "saytoconsole":
      case "trace": {
        for (const line of this.evalValue(cmd.args))
          this.console.push({ topic: cat.name, line, kind: cmd.c });
        return CONTINUE;
      }
      case "saytofile": {
        const path = this.evalValue(cmd.file)[0] || "";
        const body = cmd.args ? this.evalValue(cmd.args) : [""];
        if (!this.files.has(path)) this.files.set(path, []);
        this.files.get(path).push(...body);
        return CONTINUE;
      }
      case "do":
      case "dooneof": {
        const list = this.evalValue(cmd.args);
        const chosen =
          cmd.c === "dooneof" ? (list.length ? [this.pick(list)] : []) : list;
        for (const a of chosen)
          this.actions.push({ topic: cat.name, action: a });
        if (chosen.length) run.produced.add(cat);
        return CONTINUE;
      }
      case "show":
      case "showtemplate":
      case "expires":
        // Host front-end commands; zero occurrences in the MrMind build [D §2.6].
        return CONTINUE;
      case "remember":
        return this.execRemember(cmd);
      case "forget": {
        for (const m of cmd.args || []) this.memForget(m.name);
        return CONTINUE;
      }
      case "forgetoneof": {
        const list = cmd.args || [];
        if (list.length) this.memForget(this.pick(list).name);
        return CONTINUE;
      }
      case "focus": {
        for (const ref of cmd.args || []) {
          const target = this.resolveCatRef(ref, cat);
          // [E §14.2 item 7] suppression wins over an explicit Focus.
          if (
            target &&
            target.type === "standard" &&
            !this.suppressed.has(target)
          )
            run.focusList.push(target);
          // [P §13.2] "focused ... either automatically or through a FOCUS
          // command": an explicit Focus names the topic, so its subjects count.
          if (target && target.type === "standard")
            run.subjectSources.push(target);
        }
        return CONTINUE;
      }
      case "focussubjects": {
        for (const raw of cmd.args || []) {
          const s = String(raw).trim().toLowerCase();
          run.focusSubjects.push(s);
          // [E §6.2] 24 of 62 name a subject no category declares: no focus
          // effect, but the active-subject reset still happens.
          for (const c of this.subjectMap.get(s) || [])
            if (c.type === "standard" && !this.suppressed.has(c))
              run.focusList.push(c);
        }
        return CONTINUE;
      }
      case "dontfocus":
        run.dontFocus.add(cat);
        return CONTINUE;
      case "suppress": {
        for (const ref of cmd.args || []) {
          const target = this.resolveCatRef(ref, cat);
          if (target) this.suppressed.add(target);
        }
        return CONTINUE;
      }
      case "recover": {
        for (const ref of cmd.args || []) {
          const target = this.resolveCatRef(ref, cat);
          if (target) this.suppressed.delete(target);
        }
        return CONTINUE;
      }
      case "waitforresponse": {
        this.continuation = {
          category: cat,
          path: frames.map((f) => ({ ...f })).concat([{ i: index + 1 }]),
        };
        return WAITING;
      }
      case "interruptsequence": {
        // [P §11] suspend this Sequence category and let the standard and
        // default categories run; resume it when a Done is reached.
        this.seqStack.push({
          category: cat,
          path: frames.map((f) => ({ ...f })).concat([{ i: index + 1 }]),
        });
        return NEXT_CATEGORY;
      }
      case "switchto":
      case "switchtooneof": {
        const refs = cmd.args || [];
        if (!refs.length) return CONTINUE;
        const ref = cmd.c === "switchtooneof" ? this.pick(refs) : refs[0];
        const target = this.resolveCatRef(ref, cat);
        if (!target) {
          this.warnings.push(
            `SwitchTo unknown category ${JSON.stringify(ref.v || ref.name)}`,
          );
          return CONTINUE;
        }
        // Cycle guard [E §5.3]: a non-Sequence category already executed this
        // run cannot be switched to again.
        if (run.executed.has(target) && target.type !== "sequence")
          return RUNTIME_ERROR;
        this.switchStack.push({
          category: cat,
          path: frames.map((f) => ({ ...f })).concat([{ i: index + 1 }]),
        });
        run.switchTarget = target;
        return SWITCH;
      }
      case "disconnectthisuser":
        this.disconnected = true;
        return DONE;
      default:
        if (EXAMPLE_COMMANDS.has(cmd.c)) return CONTINUE; // verification only
        return CONTINUE;
    }
  }

  execRemember(cmd) {
    const name = cmd.target && cmd.target.name;
    if (!name) return CONTINUE;
    if (cmd.mode === "flag" || (cmd.value == null && cmd.mode !== "compute")) {
      // [P §6] a single key defaults to "TRUE".
      this.memSet(name, ["TRUE"]);
      return CONTINUE;
    }
    if (cmd.mode === "compute") {
      const fn = String(cmd.fn || "").toLowerCase();
      const impl = COMPUTE[fn];
      // Inside Compute the comma is the FUNCTION's argument separator [D §3.3].
      const node = cmd.value;
      const argNodes =
        node && node.t === "list" && node.op === "or" ? node.args : [node];
      if (!impl) {
        this.warnings.push(`unknown Compute function '${cmd.fn}'`);
        this.memSet(name, this.evalValue(node));
        return CONTINUE;
      }
      const isMultiArg =
        fn === "sum" ||
        fn === "difference" ||
        fn === "product" ||
        fn === "ratio";
      const args = isMultiArg
        ? argNodes.map((a) => this.evalValue(a)[0] ?? "")
        : this.evalValue(node);
      this.memSet(name, impl(args, this));
      return CONTINUE;
    }
    const list = this.evalValue(cmd.value);
    if (cmd.mode === "isoneof")
      this.memSet(name, list.length ? [this.pick(list)] : [""]);
    else this.memSet(name, list);
    return CONTINUE;
  }

  emit(line, cat, run, cmd) {
    run.output.push(line);
    run.produced.add(cat);
    run.lastOutputCategory = cat;
    this.trace.push({
      topic: cat.name,
      file: cat.file,
      line: cmd ? cmd.line : cat.line,
      command: cmd ? cmd.c : "say",
      text: line,
      specificity: run.selectedSpec,
      type: cat.type,
    });
  }

  pick(list) {
    if (!list.length) return undefined;
    const i = Math.min(
      list.length - 1,
      Math.floor(this.random() * list.length),
    );
    return list[i];
  }

  resolveCatRef(ref, current) {
    if (!ref) return null;
    if (ref.t === "this") return current;
    const name = ref.t === "string" ? ref.v : ref.name;
    return (
      this.byName.get(
        String(name || "")
          .trim()
          .toLowerCase(),
      ) || null
    );
  }

  // ---- focus [E §7, §8] --------------------------------------------------

  autoFocus(cat, run) {
    const seen = new Set([cat]);
    run.focusList.push(cat);
    // Only the category that RAN sets the focused subjects; the co-subject
    // categories below are merely re-ordered.  [man:BestFit "The focused
    // subjects are the subjects that were set by the most recently activated
    // (executed) topic."]
    run.subjectSources.push(cat);
    for (const s of this.catSubjects.get(cat) || []) {
      for (const other of this.subjectMap.get(s) || []) {
        if (seen.has(other) || other.type !== "standard") continue;
        seen.add(other);
        run.focusList.push(other);
      }
    }
  }

  /**
   * Refocus() [E §7].  Each entry is moved to the FRONT of the attention list.
   * Iterating BACK TO FRONT is the resolution the archive forces: it reproduces
   * the 6,363,301 Example-1 order (Focus "Cats" inside "CatsOrComputers" leaves
   * Cats first, CatsOrComputers second) and the documented multi-argument
   * `Focus "dogs","cats"` order.
   */
  refocus(run) {
    for (let k = run.focusList.length - 1; k >= 0; k--) {
      const cat = run.focusList[k];
      const at = this.attentionFocus.indexOf(cat);
      if (at === -1) continue;
      this.attentionFocus.splice(at, 1);
      this.attentionFocus.unshift(cat);
    }
  }

  /**
   * [E §8] The active-subject set is REPLACED by the subjects of everything
   * focused this run, but only if that set is non-empty — a subject-less default
   * answer must not wipe the conversational context.
   */
  /**
   * The focused subjects, rebuilt at the end of every run.
   *
   * DEVIATION from IMPL-SPEC §8.7, which unions the subjects of *every* category
   * placed on FocusList — that is, of the whole co-subject fan-out.  NativeMinds'
   * own manual is narrower and this port follows it: "NeuroServer also keeps
   * track of the subject (or subjects) currently being discussed.  The focused
   * subjects are the subjects that were set by the most recently activated
   * (executed) topic." [MANUAL__BestFit.txt, "Focused"], and the patent agrees:
   * "the set of subject keywords associated with the most recent input ... that
   * resulted in at least one topic ... being focused, either automatically or
   * through a FOCUS command, as well as subject keywords focused using a FOCUS
   * SUBJECTS command" [P §13.2].  Under the wider reading one answer about
   * "HELP" also makes "ME" and "WantSomePointers" active, and the next "yes"
   * lands in the wrong sequence.
   *
   * The "leave unchanged when empty" rule is kept: a Default topic with no
   * Subjects must not wipe the conversational context [man:BestFit].
   */
  updateActiveSubjects(run) {
    const next = new Set();
    for (const cat of run.subjectSources)
      for (const s of this.catSubjects.get(cat) || []) next.add(s);
    for (const s of run.focusSubjects) next.add(s);
    if (next.size) this.activeSubjects = next;
  }
}

// ---------------------------------------------------------------------------
// Load-time analysis of a category's block tree.

/**
 * A base-level block is one whose body holds at least one non-If statement
 * [P §14.1].  Blocks whose body is only nested Ifs are routers.
 * The returned `chain` is the enclosing blocks plus the block itself, outermost
 * first, in the order their conditions must all hold.
 */
export function collectBaseLevelBlocks(cat) {
  const out = [];
  const walk = (items, chain) => {
    for (const item of items || []) {
      if (!isBlock(item)) continue;
      let b = item;
      while (b) {
        const c = chain.concat([b]);
        if (
          (b.body || []).some(
            (x) => !isBlock(x) && x && !EXAMPLE_COMMANDS.has(x.c),
          )
        )
          out.push({ block: b, chain: c });
        walk(b.body, c);
        b = b.otherwise;
      }
    }
  };
  walk(cat.blocks, []);
  return out;
}

/**
 * Bind every `TryAgain` to the WaitForResponse it re-runs [C §4.2].
 * Rule: the most recent WaitForResponse lexically preceding the TryAgain, in
 * document order, anywhere in the enclosing scope chain — four of the nine
 * TryAgain blocks in the build have the WaitForResponse in an ENCLOSING block.
 */
export function resolveTryAgain(cat) {
  let last = null;
  const walk = (items, frames) => {
    for (let i = 0; i < (items || []).length; i++) {
      const item = items[i];
      if (!isBlock(item)) {
        if (item && item.c === "waitforresponse")
          last = frames.concat([{ i: i + 1 }]);
        continue;
      }
      let b = item;
      let alt = 0;
      while (b) {
        walk(b.body, frames.concat([{ i, alt }]));
        if (b.end === "tryagain") b._tryAgainPath = last;
        b = b.otherwise;
        alt++;
      }
    }
  };
  walk(cat.blocks, []);
  return cat;
}

export default Bot;

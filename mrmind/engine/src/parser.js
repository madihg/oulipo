// engine/src/parser.js
//
// NeuroScript 2.2 parser for the MrMind revival.
// Exports parse(source, fileName) and parseProgram(files) per engine/CONTRACT.md.
//
// It produces the CONTRACT AST and NEVER throws on the archive: anything it
// cannot recognise becomes {c:'unknown', raw, line} and is recorded in
// program.parseWarnings.
//
// Sources cited inline:
//   [A]   spec/A-lexical-and-structure.md
//   [C]   spec/C-conditions.md
//   [MAN] spec/neuroserver-help/MANUAL__Operators.txt
//
// ---------------------------------------------------------------------------
// DEVIATIONS from engine/CONTRACT.md (each forced by a construct that really
// occurs in the shipped build; also listed in the task return value):
//
//  1. Value node {t:'list'} carries an extra field `op:'or'|'and'`.  CONTRACT
//     shows only `{t:'list', args}`, but a matching list joined by `and`/`&`
//     means "contains all of these" while one joined by `,`/`or` means
//     "contains any of these" ([C §7.1], 173 AND joins vs 827 OR joins in the
//     build).  Dropping the distinction would silently change 173 conditions.
//     {t:'optional'} carries the same field for the same reason.
//  2. New Value node {t:'not', arg}.  `and not X` inside a positive matching
//     list ([C §7.3], 5 occurrences in the build).
//  3. Condition {op:'recall'} carries `listOp:'or'|'and'`.  `Recall ?a, ?b` is
//     OR and `Recall ?a and ?b` is AND ([C §13.9]).
//  4. Command {c:'saytofile'} carries `file` (a Value) as well as `args`.  The
//     archive form is `SayToFile <path> <value>;` with NO comma between them
//     (73 occurrences), so one `args` list cannot represent it.
//  5. Example commands carry an optional `when` guard, from the 1999
//     `When <memref> is <patlist> Example "...";` form ([A §11.6], 1
//     occurrence: Mrmind3/Utilities/CProfanity.n:122).
//  6. Command {c:'disconnectthisuser'} is emitted; CONTRACT's command list
//     omits it, but it occurs once in the build
//     (Library/StdQuestion/combis/QuesResDebug.us.n:71).
//  7. A number used as a pattern atom becomes {t:'string', v:'<digits>'}.
//     CONTRACT has no numeric Value; a bare number in pattern position is just
//     a literal word.
//  8. CatRef is {t:'string', v} or {t:'this'} (for `Suppress This`, 36 uses).
// ---------------------------------------------------------------------------

import { tokenize } from "./lexer.js";

// --- keyword tables.  Every comparison uses token.lower ([A §6]: all keywords
// AND all names are case-insensitive; the archive spells `SwitchBack` three
// ways and `DoesNotMatch` four).

const MATCH_KW = new Map([
  ["contains", ["contains", false]],
  ["matches", ["matches", false]],
  ["exactlymatches", ["exactlymatches", false]],
  ["doesnotcontain", ["contains", true]],
  ["doesnotmatch", ["matches", true]],
  ["doesnotexactlymatch", ["exactlymatches", true]],
]);

// [C §5] clause keywords.  `IfFocused` is archive-only ([C §6.9]) and is an
// exact synonym of `Focused`.
const CLAUSE_KW = new Set([
  "heard",
  "notheard",
  "ifheard",
  "ifnotheard",
  "recall",
  "dontrecall",
  "ifrecall",
  "ifdontrecall",
  "focused",
  "iffocused",
  "chance",
  "ifchance",
  "always",
]);

// [C §5] block heads.  `Always` is the only head never followed by `Then`.
const BLOCK_HEAD = new Set([
  "always",
  "if",
  "ifheard",
  "ifnotheard",
  "ifrecall",
  "ifdontrecall",
  "ifchance",
]);

// [A §7] / [C §4.1] block terminators.  None is followed by ';'.
const TERMINATOR = new Set([
  "done",
  "continue",
  "nexttopic",
  "nextscenario",
  "tryagain",
  "switchback",
]);

const CATEGORY_MODIFIER = new Set([
  "priority",
  "default",
  "sequence",
  "suppressed",
]);

// Keywords that can never begin a pattern atom.  Used only by the
// dangling-'+' tolerance in parseConcat.
const STRUCTURAL_KW = new Set([
  "then",
  "otherwise",
  "endtopic",
  "endscenario",
  "is",
  "are",
  "of",
  "done",
  "continue",
  "nexttopic",
  "nextscenario",
  "tryagain",
  "switchback",
]);

// Commands whose whole argument is one PatternList.
const SAY_LIKE = new Set([
  "say",
  "sayoneof",
  "saytoconsole",
  "trace",
  "do",
  "dooneof",
]);

const NO_ARG_COMMAND = new Map([
  ["dontfocus", "dontfocus"],
  ["waitforresponse", "waitforresponse"],
  ["interruptsequence", "interruptsequence"],
  ["disconnectthisuser", "disconnectthisuser"],
]);

const EXAMPLE_KW = new Map([
  ["example", "example"],
  ["initialexample", "initialexample"],
  ["sequenceexample", "sequenceexample"],
]);

function emptyProgram() {
  return {
    definitions: [],
    categories: [],
    attributes: Object.create(null),
    otherExamples: [],
    subjectInfo: Object.create(null),
    parseWarnings: [],
  };
}

class Parser {
  constructor(tokens, fileName, program) {
    this.toks = tokens;
    this.p = 0;
    this.file = fileName;
    this.program = program;
  }

  // ---- cursor helpers -----------------------------------------------------
  peek(k = 0) {
    return this.toks[Math.min(this.p + k, this.toks.length - 1)];
  }
  next() {
    return this.toks[this.p < this.toks.length - 1 ? this.p++ : this.p];
  }
  atEof() {
    return this.peek().type === "eof";
  }
  line() {
    return this.peek().line;
  }

  isSym(lower, k = 0) {
    const t = this.peek(k);
    return t.type === "symbol" && t.lower === lower;
  }
  isSymIn(set, k = 0) {
    const t = this.peek(k);
    return t.type === "symbol" && set.has(t.lower);
  }
  isPunct(ch, k = 0) {
    const t = this.peek(k);
    return t.type === "punct" && t.value === ch;
  }

  warn(message, line = this.line(), raw = this.peek().raw) {
    this.program.parseWarnings.push({ file: this.file, line, message, raw });
  }

  /** Consume a keyword if present; warn and continue if not ([A §7]). */
  want(lower, context) {
    if (this.isSym(lower)) {
      this.next();
      return true;
    }
    this.warn(
      `expected '${lower}' in ${context}, saw ${describe(this.peek())}`,
    );
    return false;
  }

  /** Skip to just past the next ';' at bracket depth 0, for error recovery. */
  recoverToSemicolon() {
    let depth = 0;
    while (!this.atEof()) {
      const t = this.next();
      if (t.type === "punct") {
        if (t.value === "(" || t.value === "{") depth++;
        else if (t.value === ")" || t.value === "}")
          depth = Math.max(0, depth - 1);
        else if (t.value === ";" && depth === 0) return;
      }
      if (
        t.type === "symbol" &&
        depth === 0 &&
        (TERMINATOR.has(t.lower) ||
          t.lower === "endtopic" ||
          t.lower === "endscenario")
      ) {
        this.p--;
        return;
      }
    }
  }

  /** Index of the token closing the bracket that opens at index `at`. */
  matchBracket(at) {
    let depth = 0;
    for (let k = at; k < this.toks.length; k++) {
      const t = this.toks[k];
      if (t.type !== "punct") continue;
      if (t.value === "(" || t.value === "{") depth++;
      else if (t.value === ")" || t.value === "}") {
        depth--;
        if (depth === 0) return k;
      }
    }
    return this.toks.length - 1;
  }

  // ---- values (pattern expressions) ---------------------------------------

  /**
   * boolOpAt: '(',' | 'or') -> 'or'; ('and' | '&') -> 'and'   [C §7.1]
   * The comma is the dominant OR spelling by 4:1 and '&' occurs exactly once
   * in the build (Mrmind3/Defaults/Answers.n:285).
   */
  boolOpAt(k = 0) {
    const t = this.peek(k);
    if (t.type === "punct" && t.value === ",") return "or";
    if (t.type === "punct" && t.value === "&") return "and";
    if (t.type === "symbol" && t.lower === "or") return "or";
    if (t.type === "symbol" && t.lower === "and") return "and";
    return null;
  }

  /**
   * [C §5.1] The one real ambiguity: `and` / `or` / `,` join both condition
   * clauses and matching-list elements.  After consuming a BoolOp inside a
   * matching list, hand the operator back to the clause level iff the next
   * operand begins a clause.  This reproduces the archive exactly.
   */
  operandBeginsClause() {
    const t = this.peek();
    if (t.type === "symbol" && CLAUSE_KW.has(t.lower)) return true; // rule 1

    if (t.type === "punct" && (t.value === "(" || t.value === "{")) {
      // rule 2
      const close = this.matchBracket(this.p);
      for (let k = this.p + 1; k < close; k++) {
        const u = this.toks[k];
        if (
          u.type === "symbol" &&
          (CLAUSE_KW.has(u.lower) || MATCH_KW.has(u.lower))
        )
          return true;
      }
    }

    let depth = 0; // rule 3
    for (let k = this.p; k < this.toks.length; k++) {
      const u = this.toks[k];
      if (u.type === "eof") return false;
      if (u.type === "punct") {
        if (u.value === "(" || u.value === "{") {
          depth++;
          continue;
        }
        if (u.value === ")" || u.value === "}") {
          if (depth === 0) return false;
          depth--;
          continue;
        }
        if (
          depth === 0 &&
          (u.value === "," || u.value === "&" || u.value === ";")
        )
          return false;
        continue;
      }
      if (u.type === "symbol" && depth === 0) {
        if (u.lower === "then" || u.lower === "and" || u.lower === "or")
          return false;
        if (MATCH_KW.has(u.lower)) return true;
        if (TERMINATOR.has(u.lower)) return false;
      }
    }
    return false;
  }

  /** PatAtom: string | symbol | memref | starref | number | (..) | {..} */
  parseAtom(inCondition) {
    const t = this.peek();
    switch (t.type) {
      case "string":
        this.next();
        return { t: "string", v: t.value };
      case "starmatch":
        this.next();
        return { t: "starmatch" };
      case "star":
        this.next();
        return { t: "star", sigil: t.value.sigil, n: t.value.n };
      // Deviation 7: a bare number in pattern position is a literal word.
      case "number":
        this.next();
        return { t: "string", v: t.raw };
      case "memref": {
        this.next();
        // [C §2.7] the cross-user form ?<pat>:<key> is in the grammar but does
        // not occur in the archive.  Parsed here so it does not derail.
        if (
          this.isPunct(":") &&
          (this.peek(1).type === "symbol" || this.peek(1).type === "string")
        ) {
          this.next();
          const key = this.next();
          return {
            t: "mem",
            name: key.value,
            user: { t: "string", v: t.value },
          };
        }
        return { t: "mem", name: t.value, user: null };
      }
      case "symbol":
        this.next();
        return { t: "symbol", name: t.value };
      case "punct":
        if (t.value === "(") {
          this.next();
          const inner = this.parseMatchList(inCondition);
          if (this.isPunct(")")) this.next();
          else this.warn("expected ')' closing a pattern group");
          return inner;
        }
        if (t.value === "{") {
          // [C §7.4] / [MAN] braces mark an element optional; they never change
          // whether a pattern matches, only its specificity.
          this.next();
          const inner = this.parseMatchList(inCondition);
          if (this.isPunct("}")) this.next();
          else this.warn("expected '}' closing an optional group");
          return inner.t === "list"
            ? { t: "optional", op: inner.op, args: inner.args }
            : { t: "optional", op: "or", args: [inner] };
        }
        break;
      default:
        break;
    }
    this.warn(`unexpected ${describe(t)} in a pattern expression`);
    this.next();
    return { t: "string", v: "" };
  }

  /**
   * True if the token at offset k can begin a pattern atom.  Used only to
   * detect the author's dangling-'+' typo, below.
   */
  canStartAtom(k = 0) {
    const t = this.peek(k);
    if (
      t.type === "string" ||
      t.type === "memref" ||
      t.type === "star" ||
      t.type === "starmatch" ||
      t.type === "number"
    )
      return true;
    if (t.type === "punct") return t.value === "(" || t.value === "{";
    if (t.type === "symbol") return !STRUCTURAL_KW.has(t.lower);
    return false;
  }

  /**
   * Pat = PatAtom { '+' PatAtom }   ([MAN] '+' concatenates.)
   *
   * JUDGEMENT CALL, corroborated by the compiled objects: the shipped source
   * contains four dangling '+' operators with no right operand --
   *   Mrmind3/Utilities/CProfanity.n:84, 92, 98
   *     SayOneOf STDX.RESPONSE_TO_SEXUAL+"  "+;
   *   Mrmind3/Issues/Misc.n:69
   *     Say "...light at a "+,
   *         "wavelength of 80 ...";
   * The compiler accepted all four and the operands survive into the .nso:
   * `strings __Utilities_CProfanity.nso` shows `STDX.RESPONSE_TO_SEXUAL`
   * immediately followed by the two-space literal, and `__Issues_Misc.nso`
   * shows both halves of the sky sentence stored as separate length-prefixed
   * elements.  So a '+' with nothing to its right is simply dropped.  These are
   * the only four in the build, and this is the only tolerance the parser needs
   * to reach zero warnings on the shipped bot.
   */
  parseConcat(inCondition) {
    const args = [this.parseAtom(inCondition)];
    while (this.isPunct("+")) {
      if (!this.canStartAtom(1)) {
        this.next();
        break;
      } // dangling '+', see above
      this.next();
      args.push(this.parseAtom(inCondition));
    }
    return args.length === 1 ? args[0] : { t: "concat", args };
  }

  /** MatchingList = Pat { BoolOp ['not'] Pat }, subject to the §5.1 rule. */
  parseMatchList(inCondition, opts) {
    const args = [this.parseConcat(inCondition)];
    let op = null;
    for (;;) {
      const b = this.boolOpAt();
      if (!b) break;
      const save = this.p;
      this.next();
      // A `When ?A is X and ?B is Y` guard chains its tests with `and`; the
      // second test must not be swallowed into the first test's value.
      // (Base/Utilities/LearningDemo.n:95 -- not in the MrMind build.)
      if (
        opts &&
        opts.whenGuard &&
        b === "and" &&
        this.peek().type === "memref" &&
        this.isSym("is", 1)
      ) {
        this.p = save;
        break;
      }
      // [C §7.3] `not` immediately after an AndOp always belongs to the
      // matching list, never to the clause level.
      let negated = false;
      if (this.isSym("not")) {
        negated = true;
        this.next();
      }
      if (inCondition && !negated && this.operandBeginsClause()) {
        this.p = save;
        break;
      }
      if (op && op !== b) {
        // [C §7.2] zero occurrences in the whole archive; keep the first
        // operator rather than inventing a precedence.
        this.warn(`mixed '${op}' and '${b}' in one matching list`);
      }
      if (!op) op = b;
      let elem = this.parseConcat(inCondition);
      if (negated) elem = { t: "not", arg: elem };
      args.push(elem);
    }
    return args.length === 1 ? args[0] : { t: "list", op: op || "or", args };
  }

  // ---- conditions ---------------------------------------------------------

  /** True if the bracket group at the cursor is a clause group, not an LHS. */
  bracketIsClauseGroup() {
    const close = this.matchBracket(this.p);
    const after = this.toks[close + 1];
    // `(a+b) Contains X` — the group is the left-hand side of a match clause.
    if (after && after.type === "symbol" && MATCH_KW.has(after.lower))
      return false;
    return true;
  }

  parseClause() {
    const t = this.peek();

    if (t.type === "punct" && (t.value === "(" || t.value === "{")) {
      if (this.bracketIsClauseGroup()) {
        const brace = t.value === "{";
        this.next();
        const inner = this.parseClauseExpr();
        if (this.isPunct(brace ? "}" : ")")) this.next();
        else
          this.warn(
            `expected '${brace ? "}" : ")"}' closing a condition group`,
          );
        // [C §7.4](b) a brace-wrapped CLAUSE never changes truth, only
        // specificity.  1 occurrence in the whole archive, none in the build.
        return brace ? { op: "optional", arg: inner } : inner;
      }
      // fall through: the group is a pattern, so this is a match clause.
    }

    if (t.type === "symbol") {
      const l = t.lower;

      if (l === "always") {
        this.next();
        return { op: "always" };
      }

      // [C §6.9] IfFocused is archive-only and is an exact synonym of Focused.
      if (l === "focused" || l === "iffocused") {
        this.next();
        return { op: "focused" };
      }

      if (l === "chance" || l === "ifchance") {
        this.next();
        // [C §6.6] argument is a real number in [0,1] or a percentage.
        if (this.peek().type === "number") {
          const num = this.next();
          return { op: "chance", p: num.percent ? num.value / 100 : num.value };
        }
        return { op: "chance", p: null }; // bare IfChance: the group rule, [C §10]
      }

      // [C §6.4] Heard L === ?WhatUserMeant Contains L ; NotHeard is its negation.
      if (
        l === "heard" ||
        l === "ifheard" ||
        l === "notheard" ||
        l === "ifnotheard"
      ) {
        this.next();
        const negated = l === "notheard" || l === "ifnotheard";
        return {
          op: "match",
          lhs: { t: "mem", name: "WhatUserMeant", user: null },
          test: "contains",
          negated,
          rhs: this.parseMatchList(true),
        };
      }

      // [C §6.5] Recall is true iff any (OR list) / every (AND list) key is set.
      if (
        l === "recall" ||
        l === "ifrecall" ||
        l === "dontrecall" ||
        l === "ifdontrecall"
      ) {
        this.next();
        const negated = l === "dontrecall" || l === "ifdontrecall";
        const list = this.parseMatchList(true);
        const args = list.t === "list" ? list.args : [list];
        const listOp = list.t === "list" ? list.op : "or";
        for (const a of args) {
          if (a.t !== "mem") this.warn("non-memref operand in a Recall list");
        }
        return { op: "recall", args, listOp, negated };
      }

      if (l === "not") {
        // defensive; never at clause level
        this.next();
        return { op: "not", arg: this.parseClause() };
      }
    }

    // [C §6.3] <Pat> <MatchKw> <MatchingList>
    const startLine = this.line();
    const lhs = this.parseConcat(true);
    const kwTok = this.peek();
    if (kwTok.type === "symbol" && MATCH_KW.has(kwTok.lower)) {
      const [test, negated] = MATCH_KW.get(kwTok.lower);
      this.next();
      return {
        op: "match",
        lhs,
        test,
        negated,
        rhs: this.parseMatchList(true),
      };
    }
    this.warn(
      `expected a match keyword after a pattern in a condition, saw ${describe(kwTok)}`,
      startLine,
    );
    return { op: "always" };
  }

  /**
   * ClauseExpr.  [C §7.2] `and` and `or` are never mixed at one level anywhere
   * in the archive, and there is no built-in precedence, so a level's first
   * operator fixes the level.
   */
  parseClauseExpr() {
    const first = this.parseClause();
    const b = this.boolOpAt();
    if (!b) return first;
    const args = [first];
    const op = b;
    for (;;) {
      const bb = this.boolOpAt();
      if (!bb) break;
      if (bb !== op) {
        this.warn(`mixed '${op}' and '${bb}' at one condition level`);
        break;
      }
      this.next();
      args.push(this.parseClause());
    }
    return { op, args };
  }

  /** Head condition of a conditional block ([C §5], [C §12]). */
  parseHeadCondition() {
    const t = this.peek();
    if (t.type === "symbol" && t.lower === "always") {
      this.next();
      return { op: "always" }; // never followed by Then [C §6.1]
    }
    if (t.type === "symbol" && t.lower === "if") {
      this.next();
      const c = this.parseClauseExpr();
      this.want("then", "a conditional block head");
      return c;
    }
    // IfHeard / IfRecall / IfDontRecall / IfChance / IfNotHeard heads, each of
    // which may be followed by a ClauseTail before Then ([C §5], §6.5).
    const c = this.parseClauseExpr();
    this.want("then", "a conditional block head");
    return c;
  }

  // ---- blocks -------------------------------------------------------------

  /** A block plus the whole `Otherwise` chain hanging off it ([C §9.1]). */
  parseBlockChain() {
    const block = this.parseBlock();
    if (this.isSym("otherwise")) {
      this.next();
      if (this.isSymIn(BLOCK_HEAD)) {
        block.otherwise = this.parseBlockChain();
      } else {
        this.warn("'Otherwise' not followed by a conditional block");
      }
    }
    return block;
  }

  parseBlock() {
    const line = this.line();
    const condition = this.parseHeadCondition();
    const body = [];
    for (;;) {
      const t = this.peek();
      if (t.type === "eof") {
        this.warn("conditional block not terminated before end of file", line);
        return { condition, body, end: "done", otherwise: null, line };
      }
      if (t.type === "symbol") {
        if (TERMINATOR.has(t.lower)) {
          this.next();
          // [A §7] no ';' after a terminator, but tolerate a stray one.
          if (this.isPunct(";")) this.next();
          return { condition, body, end: t.lower, otherwise: null, line };
        }
        if (t.lower === "endtopic" || t.lower === "endscenario") {
          this.warn(
            "conditional block not terminated before EndTopic/EndScenario",
            line,
          );
          return { condition, body, end: "done", otherwise: null, line };
        }
        if (t.lower === "otherwise") {
          // Dangling Otherwise inside a body: does not occur in the archive.
          this.warn("'Otherwise' inside a block body with no preceding block");
          this.next();
          continue;
        }
        if (BLOCK_HEAD.has(t.lower)) {
          body.push(this.parseBlockChain());
          continue;
        }
      }
      body.push(this.parseCommand());
    }
  }

  // ---- commands -----------------------------------------------------------

  /** Category reference: a string literal or the keyword `This` ([A §8]). */
  parseCatRef() {
    const t = this.peek();
    if (t.type === "string") {
      this.next();
      return { t: "string", v: t.value };
    }
    if (t.type === "symbol" && t.lower === "this") {
      this.next();
      return { t: "this" };
    }
    if (t.type === "symbol") {
      this.next();
      return { t: "symbol", name: t.value };
    }
    this.warn(`expected a category reference, saw ${describe(t)}`);
    this.next();
    return { t: "string", v: "" };
  }

  parseCatRefList() {
    const out = [this.parseCatRef()];
    while (this.isPunct(",")) {
      this.next();
      out.push(this.parseCatRef());
    }
    return out;
  }

  parseMemRefList() {
    const out = [];
    for (;;) {
      const t = this.peek();
      if (t.type === "memref") {
        this.next();
        out.push({ t: "mem", name: t.value, user: null });
      } else {
        this.warn(`expected a memory reference, saw ${describe(t)}`);
        break;
      }
      if (this.isPunct(",") || this.boolOpAt()) {
        this.next();
        continue;
      }
      break;
    }
    return out;
  }

  parseStringList() {
    const out = [];
    for (;;) {
      const t = this.peek();
      if (t.type === "string") {
        this.next();
        out.push(t.value);
      } else {
        this.warn(`expected a string, saw ${describe(t)}`);
        break;
      }
      if (this.isPunct(",")) {
        this.next();
        continue;
      }
      break;
    }
    return out;
  }

  endStatement(what) {
    if (this.isPunct(";")) {
      this.next();
      return;
    }
    this.warn(`missing ';' after ${what}`);
  }

  /**
   * The 1999 `When [Focused and] ?Mem is <PatList> {and ?Mem is <PatList>}`
   * guard ([A §8.4], [A §11.6]).  Used both as an OtherExamples guard and,
   * once, before an Example inside a topic body (CProfanity.n:122).
   */
  parseWhenGuard() {
    this.next(); // 'when'
    let focused = false;
    if (this.isSym("focused")) {
      this.next();
      focused = true;
      if (this.isSym("and")) this.next();
    }
    return { kind: "when", focused, tests: this.parseWhenTests() };
  }

  parseWhenTests() {
    const tests = [];
    for (;;) {
      const t = this.peek();
      if (t.type !== "memref") break;
      this.next();
      this.want("is", "a When guard");
      tests.push({
        mem: { t: "mem", name: t.value, user: null },
        value: this.parseMatchList(false, { whenGuard: true }),
      });
      if (this.isSym("and")) {
        this.next();
        continue;
      }
      break;
    }
    return tests;
  }

  parseCommand() {
    const t = this.peek();
    const line = t.line;
    const start = this.p;

    if (t.type !== "symbol") {
      this.warn(`expected a command, saw ${describe(t)}`, line);
      this.recoverToSemicolon();
      return { c: "unknown", raw: this.rawFrom(start), line };
    }
    const l = t.lower;

    if (SAY_LIKE.has(l)) {
      this.next();
      const args = this.parseMatchList(false);
      this.endStatement(l);
      return { c: l, args, line };
    }

    if (l === "show" || l === "showtemplate") {
      // `Show <patlist> in "<frame>";` and `ShowTemplate "<file>" in "<frame>";`
      // are host front-end commands used by Library/Utilities/components and
      // HttpExample.  Zero occurrences in the MrMind build (every `Do` there is
      // commented out, [A 11.8]); parsed so those files load cleanly too.
      this.next();
      const args = this.parseMatchList(false);
      let target = null;
      if (this.isSym("in")) {
        this.next();
        target = this.parseMatchList(false);
      }
      this.endStatement(t.value);
      return { c: l, args, target, line };
    }

    if (l === "expires") {
      // [A 11.8] in the BNF, absent from the MrMind build, used once in Base.
      this.next();
      const args = this.parseMatchList(false);
      this.endStatement("Expires");
      return { c: "expires", args, line };
    }

    if (l === "saytofile") {
      // Deviation 4: `SayToFile <path> <value>;` — juxtaposed, no comma.
      this.next();
      const file = this.parseConcat(false);
      const args = this.isPunct(";") ? null : this.parseMatchList(false);
      this.endStatement("SayToFile");
      return { c: "saytofile", file, args, line };
    }

    if (l === "remember" || l === "rememberoneof") {
      this.next();
      const mt = this.peek();
      let target = { t: "mem", name: "", user: null };
      if (mt.type === "memref") {
        this.next();
        target = { t: "mem", name: mt.value, user: null };
      } else this.warn(`expected a memory reference after ${t.value}`, line);

      let mode = l === "rememberoneof" ? "isoneof" : "flag";
      let value = null;
      let fn = null;

      // `isOneOf` is written as one word in Base/ and Library/components/
      // (`Remember ?String1 isOneOf "a","b";`).  Not used in the MrMind build.
      if (this.isSym("isoneof")) {
        this.next();
        mode = "isoneof";
      } else if (this.isSym("is")) this.next();
      if (!this.isPunct(";")) {
        if (this.isSym("oneof")) {
          this.next();
          mode = "isoneof";
        }
        if (this.isSym("one") && this.isSym("of", 1)) {
          this.next();
          this.next();
          mode = "isoneof";
          value = this.parseMatchList(false);
        } else if (this.isSym("compute")) {
          // `Remember ?X is Compute <Fn> of <PatList>;`  (Sum, Uppercase,
          // Lowercase, Capitalize, SpellCheck, URLEncoding in the archive.)
          this.next();
          const fnTok = this.peek();
          if (fnTok.type === "symbol") {
            this.next();
            fn = fnTok.value;
          } else this.warn("expected a function name after Compute", line);
          this.want("of", "a Compute expression");
          mode = "compute";
          value = this.parseMatchList(false);
        } else {
          if (mode !== "isoneof") mode = "is";
          value = this.parseMatchList(false);
        }
        if (mode === "flag") mode = "is";
      }
      this.endStatement("Remember");
      // A bare `Remember ?X;` stores the string "TRUE" ([C §6.4]); mode 'flag'.
      return { c: "remember", target, value, mode, fn, line };
    }

    if (l === "forget" || l === "forgetoneof") {
      this.next();
      const args = this.parseMemRefList();
      this.endStatement(t.value);
      return { c: l, args, line };
    }

    if (l === "focus") {
      this.next();
      if (this.isSym("subjects")) {
        this.next();
        const args = this.parseStringList();
        this.endStatement("Focus Subjects");
        return { c: "focussubjects", args, line };
      }
      const args = this.parseCatRefList();
      this.endStatement("Focus");
      return { c: "focus", args, line };
    }

    if (
      l === "suppress" ||
      l === "recover" ||
      l === "switchto" ||
      l === "switchtooneof"
    ) {
      this.next();
      const args = this.parseCatRefList();
      this.endStatement(t.value);
      return { c: l, args, line };
    }

    if (NO_ARG_COMMAND.has(l)) {
      this.next();
      this.endStatement(t.value);
      return { c: NO_ARG_COMMAND.get(l), line };
    }

    // Example family.  `WhenFocused Example "..."` ([C §6.10]: WhenFocused is a
    // modifier on Example, never a condition).  `InitialExample 2 "..."` carries
    // an index.
    if (l === "whenfocused") {
      this.next();
      // `WhenFocused and ?WhatRobotSaid is "..." example "...";` -- the
      // WhenFocused spelling of the When guard
      // (Base/Inanities/Personality.n:681, not in the MrMind build).
      let when = null;
      if (this.isSym("and")) {
        this.next();
        when = { kind: "when", focused: true, tests: this.parseWhenTests() };
      }
      const kw = this.peek();
      if (kw.type === "symbol" && EXAMPLE_KW.has(kw.lower)) {
        this.next();
        const cmd = this.finishExample("whenfocusedexample", line);
        if (when) cmd.when = when;
        return cmd;
      }
      this.warn("'WhenFocused' not followed by Example", line);
      this.recoverToSemicolon();
      return { c: "unknown", raw: this.rawFrom(start), line };
    }

    if (EXAMPLE_KW.has(l)) {
      this.next();
      return this.finishExample(EXAMPLE_KW.get(l), line);
    }

    if (l === "when") {
      // [A §11.6] `When ?LastTopic is "Tsk Tsk" Example "why";` — the ';'
      // belongs to the Example, not to the When.
      const when = this.parseWhenGuard();
      const kw = this.peek();
      if (
        kw.type === "symbol" &&
        (EXAMPLE_KW.has(kw.lower) || kw.lower === "whenfocused")
      ) {
        let name = "example";
        if (kw.lower === "whenfocused") {
          this.next();
          name = "whenfocusedexample";
          this.next();
        } else {
          this.next();
          name = EXAMPLE_KW.get(kw.lower);
        }
        const cmd = this.finishExample(name, line);
        cmd.when = when;
        return cmd;
      }
      this.warn("'When' guard not followed by Example", line);
      this.recoverToSemicolon();
      return { c: "unknown", raw: this.rawFrom(start), line };
    }

    this.warn(`unrecognised command '${t.value}'`, line);
    this.recoverToSemicolon();
    return { c: "unknown", raw: this.rawFrom(start), line };
  }

  finishExample(kind, line) {
    let index = null;
    if (this.peek().type === "number") index = String(this.next().raw);
    const args = this.parseMatchList(false);
    this.endStatement(kind);
    return { c: kind, index, args, line };
  }

  rawFrom(start) {
    return this.toks
      .slice(start, Math.max(start + 1, this.p))
      .map((x) => x.raw)
      .join(" ");
  }

  // ---- categories ---------------------------------------------------------

  parseCategory(modifiers, headLine) {
    const kw = this.next(); // 'topic' | 'scenario'
    const kind = kw.lower === "scenario" ? "scenario" : "topic";
    const endKw = kind === "scenario" ? "endscenario" : "endtopic";

    let name = "";
    if (this.peek().type === "string") name = this.next().value;
    else this.warn(`${kw.value} declaration without a name string`, headLine);
    this.want("is", `a ${kw.value} declaration`);

    let type = "standard";
    for (const m of modifiers) if (m !== "suppressed") type = m;

    const cat = {
      kind,
      type,
      name,
      suppressed: modifiers.includes("suppressed"),
      subjects: [],
      memoryLocks: [],
      blocks: [],
      file: this.file,
      line: headLine,
    };

    for (;;) {
      const t = this.peek();
      if (t.type === "eof") {
        this.warn(
          `${kw.value} "${name}" not closed before end of file`,
          headLine,
        );
        break;
      }
      if (t.type === "symbol") {
        if (t.lower === endKw) {
          this.next();
          break;
        }
        if (t.lower === "endtopic" || t.lower === "endscenario") {
          this.warn(`${kw.value} "${name}" closed by ${t.value}`, t.line);
          this.next();
          break;
        }
        if (t.lower === "subjects") {
          this.next();
          cat.subjects.push(...this.parseStringList());
          this.endStatement("Subjects");
          continue;
        }
        if (t.lower === "memorylock") {
          this.next();
          cat.memoryLocks.push(...this.parseMemRefList().map((m) => m.name));
          this.endStatement("MemoryLock");
          continue;
        }
        if (BLOCK_HEAD.has(t.lower)) {
          cat.blocks.push(this.parseBlockChain());
          continue;
        }
      }
      // [C §3] no command ever appears at the top level of a category in the
      // build.  Anything else here is an error; record it and resynchronise.
      this.warn(
        `unexpected ${describe(t)} at the top level of ${kw.value} "${name}"`,
        t.line,
      );
      this.recoverToSemicolon();
      if (this.peek().type === "symbol" && TERMINATOR.has(this.peek().lower))
        this.next();
    }
    return cat;
  }

  // ---- top level ----------------------------------------------------------

  parseTopLevel() {
    while (!this.atEof()) {
      const t = this.peek();
      if (t.type !== "symbol") {
        this.warn(`unexpected ${describe(t)} at top level`, t.line);
        this.next();
        continue;
      }
      const l = t.lower;

      if (l === "pattern" || l === "patternlist") {
        // [A §8.2] `Pattern X is S;` is `PatternList X is S;` with one element.
        const line = t.line;
        this.next();
        const nameTok = this.peek();
        let name = "";
        if (nameTok.type === "symbol") {
          this.next();
          name = nameTok.value;
        } else this.warn(`${t.value} without a name`, line);
        this.want("is", `a ${t.value} declaration`);
        const value = this.parseMatchList(false);
        this.endStatement(t.value);
        this.program.definitions.push({
          kind: l === "pattern" ? "pattern" : "patternlist",
          name,
          value,
          file: this.file,
          line,
        });
        continue;
      }

      if (l === "attribute") {
        // [A §8.3] every Attribute in the archive carries Specificity <int>.
        // Undeclared attributes default to 2000.
        const line = t.line;
        this.next();
        const mt = this.peek();
        let name = "";
        if (mt.type === "memref") {
          this.next();
          name = mt.value;
        } else this.warn("Attribute without a memory reference", line);
        let spec = 2000;
        if (this.isSym("specificity")) {
          this.next();
          if (this.peek().type === "number") spec = this.next().value;
          else this.warn("Specificity without a number", line);
        }
        this.endStatement("Attribute");
        if (name) this.program.attributes[name.toLowerCase()] = spec;
        continue;
      }

      if (l === "otherexamples") {
        const line = t.line;
        this.next();
        this.want("of", "an OtherExamples declaration");
        let of = "";
        if (this.peek().type === "string") of = this.next().value;
        else this.warn("OtherExamples without an example string", line);

        let guard = null;
        if (this.isSym("whenfocused")) {
          this.next();
          guard = { kind: "whenfocused" };
        } else if (this.isSym("when")) guard = this.parseWhenGuard();

        this.want("are", "an OtherExamples declaration");
        const args = this.parseMatchList(false);
        this.endStatement("OtherExamples");
        this.program.otherExamples.push({
          of,
          guard,
          args,
          file: this.file,
          line,
        });
        continue;
      }

      if (CATEGORY_MODIFIER.has(l) || l === "topic" || l === "scenario") {
        const headLine = t.line;
        const modifiers = [];
        while (this.isSymIn(CATEGORY_MODIFIER))
          modifiers.push(this.next().lower);
        if (this.isSym("topic") || this.isSym("scenario")) {
          this.program.categories.push(this.parseCategory(modifiers, headLine));
        } else {
          this.warn(
            `modifier ${modifiers.join(" ")} not followed by Topic or Scenario`,
            headLine,
          );
        }
        continue;
      }

      this.warn(`unrecognised top-level statement '${t.value}'`, t.line);
      this.recoverToSemicolon();
      if (this.peek().type === "symbol" && TERMINATOR.has(this.peek().lower))
        this.next();
    }
  }
}

function describe(t) {
  if (!t) return "nothing";
  if (t.type === "eof") return "end of file";
  if (t.type === "string")
    return `string ${JSON.stringify(t.value).slice(0, 40)}`;
  if (t.type === "bad") return `bad token (${t.reason})`;
  return `${t.type} '${t.raw}'`;
}

/**
 * parse(source, fileName) -> Program for one file.
 * Never throws; problems land in program.parseWarnings.
 */
export function parse(source, fileName = "<memory>") {
  const program = emptyProgram();
  const tokens = tokenize(source, fileName);
  for (const tk of tokens) {
    if (tk.type === "bad") {
      program.parseWarnings.push({
        file: fileName,
        line: tk.line,
        message: `lexer: ${tk.reason}`,
        raw: tk.raw,
      });
    }
  }
  const usable = tokens.filter((tk) => tk.type !== "bad");
  const p = new Parser(usable, fileName, program);
  try {
    p.parseTopLevel();
  } catch (err) {
    // Belt and braces: the contract says parsing must never throw.
    program.parseWarnings.push({
      file: fileName,
      line: p.line(),
      message: `internal parser error: ${err && err.message}`,
      raw: "",
    });
  }
  return program;
}

/**
 * parseProgram(files) -> one Program for the whole build.
 * `files` is [{path, source}] in manifest order.  Order is load-bearing three
 * ways ([A §10.2]): declaration-before-use, Priority/Default execution order,
 * and the initial attention-focus order.
 */
export function parseProgram(files) {
  const program = emptyProgram();
  for (const f of files) {
    const one = parse(f.source, f.path);
    program.definitions.push(...one.definitions);
    program.categories.push(...one.categories);
    program.otherExamples.push(...one.otherExamples);
    program.parseWarnings.push(...one.parseWarnings);
    Object.assign(program.attributes, one.attributes);
    Object.assign(program.subjectInfo, one.subjectInfo);
  }
  return program;
}

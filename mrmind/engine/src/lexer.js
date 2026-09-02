// engine/src/lexer.js
//
// NeuroScript 2.2 lexer for the MrMind revival.
//
// Contract: exports tokenize(source, fileName) -> Token[]  (engine/CONTRACT.md).
// The token shape is not fixed by CONTRACT.md, so it is defined here and used
// only by src/parser.js.
//
// Every rule below is traceable to a source, cited inline:
//   [A]   spec/A-lexical-and-structure.md   (census of the 49 shipped files)
//   [C]   spec/C-conditions.md
//   [MAN] spec/neuroserver-help/MANUAL__Operators.txt  (NativeMinds' own manual)
//
// Scan order is [A §13.2]: string literal, // comment, whitespace, ?memref,
// star buffer, number, symbol, single-character punctuation.

/** @typedef {{type:string, value:any, raw:string, line:number, col:number}} Token */

const LETTER = /[A-Za-z]/;
const DIGIT = /[0-9]/;
// [A §5.1] Symbols are Letter { Letter | Digit | '_' | '.' }.  The dot is a NAME
// character, not an operator: `StdP.QuestionStarts` is one token.  This
// contradicts the patent BNF; the archive wins ([A §11.1]).
const SYMBOL_CHAR = /[A-Za-z0-9_.]/;
// [A §5.2] After '?' take the longest run of [A-Za-z0-9_.].  Unlike symbols,
// memref names may begin with a digit (`?20QAns`).
const NAME_CHAR = /[A-Za-z0-9_.]/;

// [A §13.2] single-character punctuation the language uses outside strings.
const PUNCT = new Set([
  ";",
  ",",
  "(",
  ")",
  "{",
  "}",
  "+",
  "&",
  ":",
  "*",
  "#",
  "^",
  "%",
]);

/**
 * Decode the body of a string literal.
 *
 * [A §4.2] settled against the compiled .nso objects: on '\' consume the
 * backslash and the following character; if that character is '"' emit '"'
 * alone, OTHERWISE emit BOTH characters unchanged.  So `\.` stays two
 * characters and `C:\Program Files\...` survives verbatim.  This is not a
 * C-style escape; the backslash is a pattern-level marker that the matcher
 * still needs to see ([MAN] "Matching a Pattern-matching Operator",
 * "Case-sensitive Matching").
 */
function decodeStringBody(chars) {
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === "\\" && i + 1 < chars.length) {
      const next = chars[i + 1];
      out += next === '"' ? '"' : "\\" + next;
      i++;
    } else {
      out += chars[i];
    }
  }
  return out;
}

/**
 * tokenize(source, fileName) -> Token[]
 *
 * Never throws.  Anything it cannot classify becomes a token of type 'bad',
 * which the parser turns into an {c:'unknown'} node plus a parse warning.
 *
 * `source` must already be decoded from latin1/windows-1252 ([A §1.1]) — the
 * loader does that.  CRLF is normalised here for safety ([A §1.2]).
 */
export function tokenize(source, fileName = "<memory>") {
  const src = String(source).replace(/\r\n?/g, "\n");
  const tokens = [];
  let i = 0;
  let line = 1;
  let lineStart = 0;
  const n = src.length;

  const push = (type, value, start, extra) => {
    const t = {
      type,
      value,
      raw: src.slice(start, i),
      line,
      col: start - lineStart + 1,
      file: fileName,
    };
    if (extra) Object.assign(t, extra);
    tokens.push(t);
  };

  while (i < n) {
    const c = src[i];

    // --- whitespace.  [A §2] space, TAB, CR, LF are interchangeable and
    // terminate nothing; newlines carry no syntactic weight ([C §8]).
    if (c === "\n") {
      i++;
      line++;
      lineStart = i;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r" || c === "\f" || c === "\v") {
      i++;
      continue;
    }

    // --- comment.  [A §3.1] '//' to end of line is the ONLY comment form.
    // It is scanned AFTER string literals in the loop body order below, which
    // is what matters: a '//' inside a literal is not a comment ([A §3.2]).
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }

    // --- string literal.  [A §4.1] ASCII double quotes only; no single-quoted
    // strings; literals never span lines in the build.
    if (c === '"') {
      const start = i;
      const startLine = line;
      i++;
      const body = [];
      let closed = false;
      while (i < n) {
        const ch = src[i];
        if (ch === "\\" && i + 1 < n && src[i + 1] !== "\n") {
          body.push("\\", src[i + 1]);
          i += 2;
          continue;
        }
        if (ch === '"') {
          i++;
          closed = true;
          break;
        }
        // [A §11.4] No live literal spans a line.  Stop at the newline rather
        // than swallowing the rest of the file, and report it.
        if (ch === "\n") break;
        body.push(ch);
        i++;
      }
      const value = decodeStringBody(body);
      if (!closed) {
        push("bad", value, start, {
          reason: "unterminated string literal",
          line: startLine,
        });
      } else {
        tokens.push({
          type: "string",
          value,
          raw: src.slice(start, i),
          line: startLine,
          col: start - lineStart + 1,
          file: fileName,
        });
      }
      continue;
    }

    // --- memory reference.  [A §5.2] '?' immediately followed by the name.
    if (c === "?") {
      const start = i;
      i++;
      let name = "";
      while (i < n && NAME_CHAR.test(src[i])) name += src[i++];
      if (name === "") {
        push("bad", "?", start, { reason: "'?' not followed by a name" });
        continue;
      }
      push("memref", name, start);
      continue;
    }

    // --- star-buffer reference.  [A §5.3] *1 #1 ^1 %1 and the bare word
    // *Match are single tokens, not an operator plus a number.
    if (c === "*" || c === "#" || c === "^" || c === "%" || c === "&") {
      const start = i;
      if (c === "*" && /^match\b/i.test(src.slice(i + 1))) {
        i += 6;
        push("starmatch", "*Match", start);
        continue;
      }
      if (DIGIT.test(src[i + 1] || "")) {
        i++;
        let d = "";
        while (i < n && DIGIT.test(src[i])) d += src[i++];
        push("star", { sigil: c, n: Number(d) }, start);
        continue;
      }
      // bare '&' is the once-used conjunction operator [A §11.2] / [C §7.1];
      // bare '*' '#' '^' '%' outside a string do not occur in the archive but
      // fall through to punctuation so nothing throws.
      i++;
      push("punct", c, start);
      continue;
    }

    // --- number.  [A §5.4] Digit+ ['.' Digit+] ['%'].
    if (DIGIT.test(c)) {
      const start = i;
      let text = "";
      while (i < n && DIGIT.test(src[i])) text += src[i++];
      if (src[i] === "." && DIGIT.test(src[i + 1] || "")) {
        text += src[i++];
        while (i < n && DIGIT.test(src[i])) text += src[i++];
      }
      let percent = false;
      if (src[i] === "%") {
        percent = true;
        i++;
      }
      push("number", Number(text), start, { percent });
      continue;
    }

    // --- symbol / keyword.  [A §6] Everything is case-insensitive; the parser
    // compares token.lower, never token.value.
    if (LETTER.test(c)) {
      const start = i;
      let text = "";
      while (i < n && SYMBOL_CHAR.test(src[i])) text += src[i++];
      // A trailing '.' that ends a sentence-like symbol is still a name char
      // per [A §5.1]; no archive symbol ends in '.', so nothing to trim.
      push("symbol", text, start, { lower: text.toLowerCase() });
      continue;
    }

    // --- punctuation.
    if (PUNCT.has(c)) {
      const start = i;
      i++;
      push("punct", c, start);
      continue;
    }

    // --- a lone '/'.  [A §11.5] `Mrmind3/Humans&Machines/Bots.n:1` reads
    // `/Topic "Are bots smart" is` and the topic IS present in the compiled
    // .nso, so the original tokenizer discarded the stray character and carried
    // on.  Losing this would lose one topic out of 691.  Skipped silently.
    if (c === "/") {
      i++;
      continue;
    }

    const start = i;
    i++;
    push("bad", c, start, {
      reason: `unexpected character ${JSON.stringify(c)}`,
    });
  }

  tokens.push({
    type: "eof",
    value: null,
    raw: "",
    line,
    col: 1,
    file: fileName,
  });
  return tokens;
}

export { decodeStringBody };

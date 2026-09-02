# Engine module contract

Frozen interfaces for the MrMind engine. Every module is plain ES modules,
no dependencies, no build step, runs in a browser and in Node 20+.
Fidelity rule: when in doubt, do what the original did, not what is nicer.
Never invent a reply. Never call a language model. All output text comes
from the script.

Authority order: `spec/IMPL-SPEC.md` (archive-grounded) beats
`archive/_research/patents/GERBIL-LANGUAGE-NOTES.md` (patent-derived) beats
`spec/vendor-docs/*.txt` (NativeMinds' own docs) only where the first two are
silent. Deviations get recorded in `engine/DEVIATIONS.md` with the reason.

## Files

| file                 | exports                                           | depends on                   |
| -------------------- | ------------------------------------------------- | ---------------------------- |
| `src/lexer.js`       | `tokenize(source, fileName)`                      | nothing                      |
| `src/parser.js`      | `parse(source, fileName)`, `parseProgram(files)`  | lexer                        |
| `src/pattern.js`     | `compilePattern`, `matchPattern`, `tokenizeInput` | nothing                      |
| `src/specificity.js` | `buildFrequencyTable`, `conditionSpecificity`     | pattern                      |
| `src/runtime.js`     | `class Bot`                                       | parser, pattern, specificity |
| `src/index.js`       | re-exports `Bot`, `parseProgram`, `compile`       | all                          |
| `build/compile.mjs`  | CLI: archive sources to `bot.json`                | parser, specificity          |

## AST

One `Program` object:

```js
{ definitions: [...], categories: [...], attributes: {name: specificity},
  otherExamples: [...], subjectInfo: {...} }
```

`Category`:

```js
{ kind: 'topic'|'scenario', type: 'standard'|'priority'|'default'|'sequence',
  name: String, suppressed: Boolean, subjects: [String], memoryLocks: [String],
  blocks: [Block], file: String, line: Number }
```

`Block` (a conditional block; blocks nest):

```js
{ condition: Condition, body: [Command|Block], end: 'done'|'continue'|
  'nexttopic'|'nextscenario'|'tryagain'|'switchback', otherwise: Block|null,
  line: Number }
```

`Condition` is a tree:

```js
{ op: 'always' }
{ op: 'and'|'or', args: [Condition] }
{ op: 'not', arg: Condition }                  // only from "and not"
{ op: 'optional', arg: Condition }             // from { }
{ op: 'match', lhs: Value, test: 'contains'|'matches'|'exactlymatches',
  negated: Boolean, rhs: PatternList }
{ op: 'recall', args: [MemRef], negated: Boolean }
{ op: 'chance', p: Number|null }               // null = bare IfChance
{ op: 'focused' }
```

`Value` / pattern element:

```js
{ t: 'string', v: String }
{ t: 'symbol', name: String }                  // a Pattern or PatternList name
{ t: 'mem', name: String, user: Value|null }   // ?X or ?user:X
{ t: 'star', sigil: '*'|'#'|'%'|'^'|'&', n: Number }   // *1 #1 ...
{ t: 'starmatch' }                             // *match
{ t: 'concat', args: [...] }                   // a + b
{ t: 'list', args: [...] }                     // (a, b, c)
{ t: 'optional', args: [...] }                 // { a, b }
```

`Command`:

```js
{ c: 'say'|'sayoneof'|'saytoconsole'|'saytofile'|'trace'|'do'|'dooneof'|'show',
  args: PatternList, line }
{ c: 'remember', target: MemRef, value: PatternList|null, mode: 'is'|'isoneof'|
  'flag'|'compute', fn: String|null }
{ c: 'forget'|'forgetoneof', args: [MemRef] }
{ c: 'focus', args: [CatRef] } | { c: 'focussubjects', args: [String] }
{ c: 'dontfocus' } | { c: 'suppress'|'recover', args: [CatRef] }
{ c: 'waitforresponse' } | { c: 'interruptsequence' }
{ c: 'switchto'|'switchtooneof', args: [CatRef] }
{ c: 'example'|'initialexample'|'sequenceexample'|'whenfocusedexample',
  index: String|null, args: PatternList }
```

Parsing must never throw on the real archive. Anything unrecognised becomes
`{ c: 'unknown', raw: String, line }` and is recorded in
`program.parseWarnings` so the build can report coverage.

## Pattern matching

```js
tokenizeInput(text) -> [{w: String, kind: 'word'|'punct'|'space'}]
compilePattern(patternValue, env) -> CompiledPattern      // env resolves symbols
matchPattern(compiled, inputTokens, mode) -> MatchResult|null
// mode: 'contains' | 'matches' | 'exactlymatches'
// MatchResult: { stars: {'*': [..], '#': [..], '%': [..], '^': [..]},
//                whole: String, specificityPath: Number }
```

Rules that must hold, each traceable to a source:

- case-insensitive throughout
- `*` matches zero or more whole tokens; it does not match inside a word
- `#` matches a run of characters inside one word, so `work#` matches
  `working` and `#ing` matches `working`
- `%` matches one digit, `^` matches one character
- `+` concatenates and inserts an implicit space between words unless a
  wildcard already separates them
- `{...}` never changes whether a pattern matches, only its specificity
- `Matches` allows extra punctuation but no extra words (vendor doc
  `spec/vendor-docs/Matches.txt`); `Contains` wraps the pattern in `*`;
  `ExactlyMatches` is string equality
- word boundaries are real: the pattern `you are` must not match
  `you sure are`

## Runtime

```js
const bot = new Bot(program, options)   // options: {random, now, spellcheck}
bot.start()          -> [String]        // the opening lines, before any input
bot.input(text)      -> [String]        // the reply lines for one user turn
bot.state            -> plain object    // memory, focus, continuations
bot.trace            -> [TraceEntry]    // one entry per fired block
```

`TraceEntry` is what the conformance harness compares against the original
conversation database:

```js
{ topic: String, file: String, line: Number, command: String, text: String,
  specificity: Number, type: 'standard'|'priority'|'default'|'sequence' }
```

`options.random` is an injectable `() => [0,1)` so `SayOneOf`, `IfChance` and
`Chance` are deterministic under test. Default is `Math.random`.

`bot.input` returns the buffered output of one full run, in order, one array
element per output line. Comma-separated `Say` arguments are separate lines.
`<BR>` inside a string is a line break in the rendered page, not a new entry.

## Conformance harness

`engine/test/conformance.mjs` replays `corpus/sessions.json`: for each
session it constructs a fresh `Bot`, feeds every user input in order, and
compares the produced reply and the firing topic against the recorded ones.
It reports, and writes `engine/test/REPORT.md`:

- exact reply match rate
- correct-topic rate (the reply came from the topic the original used)
- a breakdown of the top mismatch causes
- the per-topic table of hits and misses

The corpus was recorded against a later build than `MRMIND3.vsr`, so 100 per
cent is not the target and not achievable. State the number honestly, explain
the residue, and never tune the engine by special-casing corpus rows.

# Deviations from `engine/CONTRACT.md`

## lexer.js / parser.js / loader.js

Recorded by the lexer+parser worker. Every item is forced by a construct that
really occurs in the archive; the citation is the evidence.

### Additions to the CONTRACT AST

| #   | Change                                                                   | Why                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `{t:'list'}` gains `op: 'or' \| 'and'`                                   | A matching list joined by `and`/`&` means "contains all of these"; one joined by `,`/`or` means "contains any of these" (`spec/C-conditions.md` §7.1). 208 AND joins vs 6991 OR joins across the build. Dropping the field silently changes the meaning of every AND list. |
| 2   | `{t:'optional'}` gains the same `op`                                     | Same reason; `{a, b}` has an inner list.                                                                                                                                                                                                                                   |
| 3   | New value node `{t:'not', arg}`                                          | `and not X` inside a positive matching list (C §7.3). 5 occurrences in the build, e.g. `Utilities/CProfanity.n:80`.                                                                                                                                                        |
| 4   | Condition `{op:'recall'}` gains `listOp: 'or' \| 'and'`                  | `Recall ?a, ?b` is OR; `Recall ?a and ?b` is AND (C §13.9). 423 OR lists and 1 AND list in the build.                                                                                                                                                                      |
| 5   | `{c:'saytofile'}` gains `file` (a Value) beside `args`                   | The archive form is `SayToFile <path> <value>;` with **no** comma between the two (73 occurrences). A single `args` list cannot represent it.                                                                                                                              |
| 6   | Example commands gain an optional `when` guard                           | The 1999 `When <memref> is <patlist> Example "...";` form (A §11.6). 1 occurrence: `Utilities/CProfanity.n:122`.                                                                                                                                                           |
| 7   | `{c:'disconnectthisuser'}` is emitted                                    | CONTRACT's command list omits it; it occurs once, `Library/StdQuestion/combis/QuesResDebug.us.n:71`.                                                                                                                                                                       |
| 8   | `{c:'show'}` / `{c:'showtemplate'}` gain `target`; `{c:'expires'}` added | `Show ... in "<frame>"` and `Expires "<date>"`. Zero occurrences in the MrMind build; they exist only so the sibling `Base/` and `HttpExample/` bots also load.                                                                                                            |
| 9   | A number in pattern position becomes `{t:'string', v:'<digits>'}`        | CONTRACT has no numeric Value node. A bare number in a pattern is a literal word.                                                                                                                                                                                          |
| 10  | `CatRef` is `{t:'string', v}` or `{t:'this'}`                            | `Suppress This` (36 uses) needs a distinct node.                                                                                                                                                                                                                           |
| 11  | `Program` gains `parseWarnings`                                          | Required by CONTRACT's prose; not shown in the AST sketch.                                                                                                                                                                                                                 |
| 12  | `src/loader.js` is a new module                                          | Requested by the task; not in CONTRACT's file table. Node-only (it reads the filesystem); `lexer.js` and `parser.js` stay dependency-free and run in a browser.                                                                                                            |

### Judgement calls

**A dangling `+` with no right operand is dropped.** Four sites in the shipped
source: `Utilities/CProfanity.n:84, 92, 98` (`SayOneOf STDX.R+"  "+;`) and
`Issues/Misc.n:69` (`Say "...at a "+,` / newline / `"wavelength...";`).
Corroborated against the compiled objects: `strings __Utilities_CProfanity.nso`
shows `STDX.RESPONSE_TO_SEXUAL` immediately followed by the two-space literal,
and `__Issues_Misc.nso` stores both halves of the sky sentence as separate
length-prefixed elements. So the original compiler accepted the typo and kept
both operands. This is the only tolerance needed to reach zero warnings.

_Residual uncertainty on `Issues/Misc.n:69`:_ dropping the `+` leaves the `,`
as the list separator, so `Say` renders the sentence as **two lines**, not one.
The author plainly meant one line. The `.nso` cannot distinguish the two
readings. Reproducing the compiler, not the intent, is the fidelity rule, so the
comma stands — but the topic "Why is the sky blue" is the place to check if a
recorded transcript ever shows it.

**`IfFocused` is parsed as an exact synonym of `Focused`.** 4 occurrences in the
build, all `Issues/Life.n:151,152,166,167`. Not in any patent BNF; the reading
is inferred from the language's uniform `If<X>` single-condition spellings
(C §6.9, C §15.3).

**A lone `/` before a keyword is skipped silently.** `Humans&Machines/Bots.n:1`
reads `/Topic "Are bots smart" is` and the topic _is_ present in the compiled
`.nso`, so the original tokenizer discarded the stray character (A §11.5).
Getting this wrong loses one topic out of 691.

**`&` is a conjunction, not a concatenation.** The single occurrence
(`Defaults/Answers.n:285`, `?DescriptionQuestion contains (YOU & "think")`)
is parsed as an AND matching list, following `spec/C-conditions.md` §7.1
(`AndOp = 'and' | '&'`) rather than `spec/A` §11.2's "safest, treat as `+`"
suggestion. C is the more specific, archive-derived reading.

### Known unparsed construct

`Get ?X from PLUGIN "HTTP" where INPUT URL is ...;` — 5 occurrences, all in
`HttpExample/httpex.n`, a NeuroServer plugin demo that is not part of MrMind and
is not in any MrMind manifest. Left as `{c:'unknown'}` with a parse warning
rather than guessed at.

---

## specificity.js / runtime.js / index.js / build/compile.mjs

Recorded by the runtime+compiler worker. Same rule as above: every item is
forced by something that really occurs in the archive, and carries its evidence.

### THE BIGGEST ONE: `Compute SpellCheck` is the identity function

`Library/StdQuestion/combis/QuesResDebug.us.n:149` runs

```
Remember ?WhatUserMeant is Compute SpellCheck of ?WhatUserMeant;
```

on **every single user input**, before any topic sees it. The original called
the Wintertree/Sentry spell-checker against `Program/Ssceam.tlx`,
`Ssceam2.clx`, `Additions.tlx`, `Mrmind3/MRMIND3.tlx` and
`MRMIND3.script.tlx`. `.clx` is a compiled binary lexicon; the algorithm that
chose a replacement word is not in the archive and is not recoverable from it.

**It is therefore not reproduced.** `SpellCheck` is `x => x`. Pass
`new Bot(program, { spellcheck: fn })` to improve it later without touching the
engine.

What this costs, concretely:

- Every misspelled input matches fewer topics than it did in 2001, so it falls
  through to the Default categories more often. **This cost has since been
  measured rather than assumed, and it is small** — see "Branch A" at the end of
  this file. Of the 18,096 words in the 7,160 recorded inputs only 1,814
  (10.02%) are unknown to the recoverable lexicons, 83% of those have no
  neighbour one edit away (they are names, mashed keys, URLs and coinages, not
  typos), and a reconstructed corrector rewrites 0.13-3.23% of inputs for at
  best +0.09 points of correct-topic rate. The earlier claim that this was the
  largest single contributor to the default rate is retracted.
- The NeuroServer Tutorial's own worked example is a casualty: it lists
  `whois kronos` and `whoaskflkronos` as activating a `"who*kronos"` topic, and
  then explains 25 lines later that the Spell Checker rewrote them first
  (`archive/_research/raw/NEUROSERVER_tutorial.txt:2696-2699`). Both are
  reported as divergences by `test/pattern.test.mjs` rather than faked.
- `Mrmind3/Activities/ategag.n:19-20` depends on `zink`/`zlink`/`pkink` NOT
  surviving the spell-checker. Under identity they survive, but the user would
  have to type them literally, so the topic still behaves.

### Correction to `src/pattern.js`: deviation D1 is withdrawn

`pattern.js` shipped with `*` implemented at the CHARACTER level, on the
grounds that `Mrmind3/Patterns.n`'s `"mast*rbat#"` and `"fantas*"` need it.
**That was authorial intent, not engine behaviour, and the shipped conversation
database refutes it.** `_work/cdb/mrmind3/ConversationData.csv` lines
15132-15133:

```
U: orange
M: <B>Hi Orange! Can you convince me that you are human?  </B>
```

`Sequence Topic "strip non-name words"` (`Mrmind3/Utilities/WebNameGreet.n:652`)
tests `?NameCapture.TempName matches ("a","an","the",…,"or",…) + "*"` and the
`Name Parser` calls it **twice at `WNG:542`, before** the single-word check at
`WNG:545`. Under a character-level `*` the rendered `or*` matches `orange`,
`*1` is `ange`, and MrMind would have said "Hi Ange!". It said "Hi Orange!".
The same rule turned "Alice" into "Lice" in this port before the fix.

`*` now consumes a span whose two endpoints are both word boundaries — the
character-level statement of `[ops]`'s "zero or more words or punctuation",
of `CONTRACT.md`'s "zero or more whole tokens", and of the patents' NFA over
word/space/punctuation tokens (`GERBIL-LANGUAGE-NOTES.md §14.5`).

Consequences, all reported by `test/pattern.test.mjs`:

- `"mast*rbat#"` and `"fantas*"` are **dead patterns in the shipped bot**. An
  authoring bug, reproduced rather than repaired.
- divergence X4 (`"virtual*robot"` matching "virtually robot") disappears.
- a new divergence: `[ops]`'s asterisk prose says `"virtual*robot"` matches
  `"virtualrobot"`. It no longer does. The same file's summary table already
  contradicts that prose (X1), and the CDB outranks both.
- the empirical D2 check loses one Example pair, 53 -> 52 of 64.

### Correction to matching-list evaluation

An `and` matching list nested inside an `or` matching list was being flattened
into extra alternatives by the pattern renderer, which silently turns "contains
all of these" into "contains any of these". The shape is real and common —
`Mrmind3/AboutUser/UserSociety.n:45-46`:

```
IfHeard ((I,HUMAN) and ("money","earn","taxes",…))
Or ("I" + ( "own" + "*"), ("work" + "*"))
```

The outer list's own operator is `or`, so the parser is right to build
`or[ and[…], or[…] ]` and emits no warning — but handing the whole node to
`compilePattern` expands the inner `and` as alternatives, and the bare word
`I` then activates "I pay taxes". Both `runtime.evalMatchList` and
`specificity.matchListSpecificity` now walk any list that contains an `and`
list or an `and not` element element-by-element (`Bot.needsStructural`).

Measured effect over the first 1,500 recorded inputs: the share of turns that
fire the SAME topic the original fired rose from 37.7% to 40.5%. "I pay taxes"
stopped firing 539 times in 7,160 turns. Note that the fix RAISES the
default-response rate — correct `and` semantics reject matches the flattened
version accepted — while still improving topic agreement, which is the reason it
was kept. See `engine/test/REPORT-calibration.md`.

### Additions to the CONTRACT

| #   | Change                                                                                                                                                 | Why                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 13  | `specificity.js` also exports `buildPatternIndex`, `compileScored`, `bestMatchSpecificity`, `corpusWords`, `patternWordTokens` and the named constants | `runtime.js` needs them; the two CONTRACT exports are unchanged.                                                                                                                                 |
| 14  | `conditionSpecificity(condition, ctx)` returns `{truth, spec}`, not a number                                                                           | Activation and scoring are one pass over the same tree — the patent's own selection step computes both together, and evaluating twice would double the cost of every turn.                       |
| 15  | `Bot` exposes `console`, `files`, `actions`, `warnings`, `memGet`, `reset`, `action(text)`                                                             | `SayToConsole`/`Trace` must never reach the user (`D §2.3`), `SayToFile` writes 73 times in the build, `bot.start()` is `bot.action("Web ACCEPT CONNECTION")`, and a harness needs the warnings. |
| 16  | `TraceEntry` is emitted **per output line**, not per fired block                                                                                       | `Say "a","b";` is two utterances and the conversation database logs two rows against the same topic and source line (`D §2.1`). One entry per block could not be compared with it.               |
| 17  | `build/compile.mjs` also exports `buildBotJson(vsrPath)`                                                                                               | So `test/smoke.test.mjs` can build the real bot in-process instead of shelling out.                                                                                                              |

### Judgement calls

**Unseen words get the corpus ceiling.** `freq(w) = max(count(w), 1) / N`, so a
word absent from the Example corpus scores `1000·ln(N)`. `E §14.2 item 3`
proposes exactly this and flags it as unverified. The corroboration: MrMind's
corpus is 3,401 words, giving a ceiling of 8,132 — and
`GERBIL-LANGUAGE-NOTES §14.4` assumes **8000** for every rare word in its worked
examples (`virtual`, `robot`, `complex`, `expensive`, `NeuroStudio`). That is
what a ~3,000-word corpus produces under this rule.

**The corpus is `Example` + `InitialExample` + `SequenceExample` +
`WhenFocused Example` + `OtherExamples` arguments.** 729 statements, 3,401
words, 768 distinct. The `of` string of an `OtherExamples` is deliberately not
counted twice: it repeats an `Example` that is already in the corpus.

**A nested base-level block is scored as a conjunction of its whole enclosing
chain.** `E §12.3` says "a MatcherBlock is scored as a conjunction of its
conditions" without saying whether the enclosing `If`s are included.
They are, here, because the flat and nested spellings of the same test then
score identically — `IfHeard "who" and "Scott"` and
`IfHeard "who" Then IfHeard "Scott"` both give
`spec(who)+spec(Scott)-1000` — and because `MANUAL__BestFit.txt` says a topic
with a nested conditional "cannot run unless each required condition is met".

**Run-time conditions are evaluated for real and score 0.** `E §12.4` says to
"score them as if true", which is ambiguous between _assume_ true and _evaluate,
contribute nothing_. This engine evaluates them. Assuming them true would let a
category win selection and then produce no output, and the conversation
database is emphatic that 94.6% of turns end at the first `Done` with exactly
one topic speaking (`E §10.2`). A condition is run-time iff its right-hand side
mentions a `?memref` or a star buffer (directly or through a PatternList), or
its left-hand side is not a plain attribute.

**Negated conditions score 0.** `E §12.6` records the constant as "value not
stated"; `E §14.2 item 1` recommends 0 and a tunable. It is
`options.negatedSpecificity`.

**`Refocus()` iterates the focus list back to front**, so the first thing
appended ends up at the very front. `E §7` sets this out: the patent's
described implementation reverses the list, but its own Example-1 walkthrough
(`Focus "Cats"` inside "CatsOrComputers" leaves _Cats, CatsOrComputers_) and the
documented `Focus "dogs","cats"` ordering both require first-appended-first.
Note that `E §6.3(a)`'s explanation of the `DontFocus`-plus-`Focus` idiom
assumes the opposite iteration order; `E §7` is the section marked "Resolution
for the port", so it wins.

**Only the first active base-level block of a category is eligible for
selection**, in document order over the block tree (a block, then its nested
blocks, then its `Otherwise` chain). `P §14.1`'s further refinement — "any block
following a non-IF statement guaranteed to be executed in the same category but
before that block is excluded" — is **not** implemented; it can only lower a
category's score, never make an inactive one active.

**Output-side backslashes.** The lexer keeps `\x` as two characters except for
`\"`. On output a backslash before a pattern metacharacter is dropped (`it\'s`
-> `it's`) and one before a letter or digit is kept
(`C:\Program Files\…`). `D §1.3` says the metacharacter escapes "matter on the
condition side, not in output" but does not say what a `Say` does with one.

**An unset attribute is `[]` for matching and `[""]` for value building.**
`?AnyQuestion Contains "have"` must be false when `?AnyQuestion` is unset, and
`Say ?Name + ?IPaddress + " says: "` must render " says: " when both are unset —
which `Mrmind3/TextFiles/Ashamed.txt` proves it did (`D §1.2`).

**`Recall ?X` is true iff the slot holds at least one non-empty string.**
`C §11.1`. The library writes `Remember ?WhoQuestion is *1;` with a possibly
empty capture and then tests `IfRecall ?WhoQuestion`.

**`?WhatRobotSaid` is rewritten at the end of every run**, including a run that
said nothing, and `?EverythingRobotJustSaid` is that run's lines joined with a
single space. `D §2.9` leaves the joiner unresolved and recommends making it one
constant; it is one constant. Nothing in the build reads
`?EverythingRobotJustSaid`.

**Cross-product order is row-major** (right-most operand varies fastest).
`D §1.2` calls this unresolved and proposes exactly this hypothesis. It is
observable only through the six-way opening greeting, and only as which of the
six `SayOneOf` picks for a given RNG value.

**`Do` / `DoOneOf` set the auto-focus flag** (`P §11`: "any output command
(currently all variants of Say or Do)") but produce no user-visible line; they
are collected in `bot.actions`. Every `Do` in the MrMind build is commented out.

**`Show`, `ShowTemplate`, `Expires`, `MemoryLock` are accepted and ignored.**
Zero occurrences in the build; `MemoryLock` is a compile-time assertion with no
runtime object in `MRMIND3.vre` (`E §4`).

**A bare `IfChance` outside a sibling group falls back to a 50% roll.** Cannot
occur in the build: all 61 bare `IfChance` blocks are in groups of two or more
(`C §10.1`).

**A run is capped at 20,000 category executions** (`options.maxSteps`) and
records a warning if it hits the cap, rather than hanging on a `SwitchTo` loop
the cycle guard cannot see. Never reached on the recorded corpus.

### Calibration against the shipped conversation database

`_work/cdb/mrmind3/ConversationData.csv` holds 7,160 real user inputs from
Dec 2000 - Apr 2001. `E §10.1` states the acceptance test: NeuroServer's own
report says **25.68%** default responses, recomputed independently as **26.76%**
of inputs answered only by Default topics, and "a port whose default-fallback
rate on the same 7,160 inputs is not in the 25-27% band has the selection logic
wrong."

Replaying all 7,160 inputs through this engine, one fresh `Bot` per recorded
connection (`node engine/test/calibrate.mjs`):

```
produced output          7138 (99.69%)
default-only answers     2647 (36.97%)   [archive: 26.76%]
same topic fired         2546 (37.74% of the 6747 turns with a recorded reply)
exact same line           553 ( 8.20%)
runtime warnings            0
```

**36.97% is outside the 25-27% band, and that is a miss, stated as one.** The
reasons, in order of expected size: (1) `SpellCheck` is the identity function,
so typo-laden inputs match fewer topics and fall through to the defaults;
(2) the database was recorded against a **later build** than `MRMIND3.vsr` —
`Topics.csv` names source files that no longer exist — so some topics that
answered in 2001 are not in this bot at all; (3) the unresolved constants above.
The number is reported, not tuned; no corpus row has been special-cased
anywhere. `engine/test/REPORT-calibration.md` has the full reading, including
the A/B numbers that justified the two corrections above.

---

## Corrections and deviations found by `engine/test/conformance.mjs`

Measured against `corpus/sessions.json` — 57 recorded conversations, 7,304 user
turns, 6,751 with a reply, every reply tagged with the topic, file and line that
produced it. `engine/test/REPORT.md` has the full reading and the A/B ladder.
Nothing below was fitted to the corpus: each change was argued from the manual or
the patent first and then measured. No corpus row is special-cased anywhere in
the engine or in the harness.

Headline after these five corrections, over all 7,304 turns:

```
correct topic            2659 / 6751   39.39%
exact reply text          642 / 6751    9.51%
answered when the original did          99.63%
engine default-only      1830 / 7304   25.05%   [original on the same turns: 25.12%]
runtime warnings            0
```

The default-fallback rate is the one figure with a published acceptance test
(`spec/E §10.1`: 25-27%). Before these corrections the engine sat at 36.97% on
the older `ConversationData.csv` calibration; it is now **25.05%**, inside the
band and within 0.1 points of the recording it is being compared against.

### C1. A matching condition on something other than the input scores as an attribute test

`selectionCtx.match` in `src/runtime.js`. Previously every plain `?memref` LHS
took the compile-time scored path, so `If ?WhatRobotSaid matches "If you are a
human, why are you <BR>talking, I mean typing, to a <BR>machine? …"`
(`Defaults/Answers.n:236`, and the same idiom throughout that file) scored
**125,247** — the word-frequency total of a long rare sentence _MrMind_ had said —
and beat every genuine answer to what the user actually typed.

`MANUAL__BestFit.txt` is explicit that specificity measures the input: _"The
specificity value is calculated and used by NeuroServer to indicate how closely a
pattern in a topic matches the current input"_, and _"A conditional statement with
more words that match a user's input is generally more specific"_. The patent
agrees for run-time conditions: _"Conditions that are only computed at run-time can
be assigned specificity values based on the frequencies of the words **in the
input** that actually match the condition"_ `[P §14.5]`.

Now: a matching condition contributes word-frequency specificity only when the
value it matched is the user's input or a piece of it. `?WhatUserSaid`,
`?WhatUserDid` and `?WhatUserMeant` are the input by definition (`IfHeard`
compiles to `?WhatUserMeant Contains`, and `QuesResDebug.us.n:136-141` says so in
so many words). Everything else is tested at run time: `Bot.isInputDerived` asks
whether the matched value appears verbatim in the current input, which is true for
the StdQuestion fragments (`?DescriptionQuestion`, `?FactQuestion`, `?WhoQuestion`
…, which hold stripped pieces of what the user typed) and false for
`?WhatRobotSaid`, `?Name`, `?LastTopic`.

**Judgement call.** NeuroServer knew this structurally: its matcher NFA was built
over the input alone, so nothing else could be scored at compile time. Having no
NFA to consult, this port asks the equivalent question of the value at run time.
A robot sentence that happens to be quoted back by the user would score as input
here and did not there; no such turn appears in the corpus.

### C2. `?WhatUserMeant` counts as the input

Same site. Kept separate from C1 because it is a separate claim, and it is
load-bearing: `IfHeard` is `?WhatUserMeant Contains`, so getting it wrong would
have collapsed every `IfHeard` in the build to a flat attribute score.
`QuesResDebug.us.n:136`: _"?WhatUserMeant is part of the language. By default it's
set equal to ?WhatUserSaid. ?WhatUserSaid cannot be modified, but we can 'clean
up' ?WhatUserMeant"_. Measured effect on the corpus: none, because the
preprocessor rewrites `?WhatUserMeant` only for `"want to*"` / `"wanna*"` inputs.
Correct anyway.

### C3. The tested attribute's Specificity is ADDED to the words that matched

`?FactQuestion contains (YOU, MRMIND)` used to score only the matched words. It
now scores the words **plus** `attributeSpecificity[?FactQuestion]` (3000 here,
2000 for anything unregistered).

Source: the Gerbil BNF commentary quoted at `GERBIL-LANGUAGE-NOTES §14.2` —
_"An attribute declaration can also assign a 'specificity' value that is used when
the attribute is tested using IfRecall **or any matching condition**"_ — together
with US 6,754,647, which requires a domain's description topic
(`?DescriptionQuestion contains DOM_X`) to be more specific than its keyword topic
(`IfHeard DOM_X`) _with the same pattern_: _"The specificity of the topic is based
on **both** the pattern being matched … **and** the matching condition"_. Only an
additive term produces that.

Worked case, `AboutMrMind/MMphysical.n:183` "Are you a male" against the input it
declares as its own `Example`:

```
?FactQuestion contains (YOU, MRMIND)   2814 (the word "you") + 3000 (?FactQuestion)
heard "sex","gender","male#",…         8132 ("male#", a word unseen in the corpus)
heard {MRMIND}                            0 (false optional)
conjunction of 3                      -2000
                                     ------
                                      11946   beats "Are you an X" at 10451
```

Before the change it scored 8946 and lost to `Are you an X` (`?WhatUserMeant Matches "Are you a*"`, whose three very common words still sum
to 10451 over a 3,401-word Example corpus), which answered "No, I am a BOT." to a
question about gender.

**Deviation from `spec/IMPL-SPEC.md`.** Its §8.5 table reads _"`Recall ?X` /
`IfRecall ?X` / any test on `?X` → `attributeSpecificity[?X]`, default 2000"_,
which taken literally _replaces_ the pattern score rather than adding to it. That
reading cannot be right for `?WhatUserMeant` (it would flatten every `IfHeard` to
2000 and destroy best-fit), and measured over 1,200 turns it is worse than the
additive reading: **40.61% vs 43.31%** correct-topic. CONTRACT gives IMPL-SPEC
top authority, so this is recorded as a deliberate deviation with the two primary
sources above; the choice between the two readings was decided by measurement, and
that is stated rather than hidden.

### C4. The engine-maintained input history was missing

`?WhatUserSaidBefore`, `?WhatUserSaidBeforeThat`, `?WhatUserMeantBefore`,
`?WhatUserMeantBeforeThat` and `?WhatUserDidBefore` are maintained by NeuroServer,
not by any script; `Bot.rollHistory` now rolls them at the top of `input()` /
`action()`. `spec/IMPL-SPEC.md §8.1` has it in the run loop ("roll
`?WhatUserSaidBefore` forward") and `spec/vendor-docs/WhatUserSaidBeforeThat.txt`
gives the depth and the rule that action turns do not disturb the said/meant
chain. Without it, `Reactions/Annoyance.n:184` and `:199` — `I'm repeating` and
`I'm still repeating`, `If ?WhatUserSaid Matches ?WhatUserSaidBefore` — could
never fire, and they are the 6th most-fired topic in the recording (88 turns).
Nothing is stored until there is a previous turn, so `IfRecall
?WhatUserSaidBefore` (`Library/StdQuestion/StdDebugger.n:276`) is false on turn one.

### C5. The focused subjects are the executed topic's, not the whole co-subject fan-out

**Deviation from `spec/IMPL-SPEC.md §8.7`**, which sets
`newSubjects = union of the subjects of every category placed on FocusList this
run`. FocusList also receives every category that merely _shares_ a subject with
the one that ran (§8.6 `autoFocus`), so one answer about `HELP` also made `ME` and
`WantSomePointers` active subjects.

NativeMinds' own manual is narrower and this port follows it:

> "NeuroServer also keeps track of the subject (or subjects) currently being
> discussed. **The focused subjects are the subjects that were set by the most
> recently activated (executed) topic.** … Focused returns TRUE if one of the
> topic's subjects (that is, one of the subjects set by the topic) matches one of
> the focused subjects." — `MANUAL__BestFit.txt`, "Focused"

US 6,314,410 agrees: the active subjects are those of the topics "focused, either
automatically or through a FOCUS command, as well as subject keywords focused
using a FOCUS SUBJECTS command" — focusing, not re-ordering. `Focus` and
`Focus Subjects` therefore still set subjects; the co-subject fan-out no longer
does. The "leave unchanged when the set is empty" rule is untouched, and it is
still the reason a Default topic with no `Subjects` does not wipe the context.

What it fixes: `Activities/20Questions.n:14-22` is
`Or (Focused and Recall ?YesResponse) Then SwitchTo "20 questions"`. After MrMind
says "Let's play 20 questions." (`Subjects "Let's play 20 questions","HELP"`), the
user's "yes" now reaches the game. Under the old rule `WantSomePointers` was also
active and `Pointers` took the "yes" instead.

Cost: -0.37 points of correct-topic on the 1,500-turn window, +0.20 on the full
corpus. Kept on the strength of the source and of the behaviour it restores.

### Not fixed, and why

**The residue is not mostly engine.** Of the 4,092 topic misses:

| share | cause                                                    | fixable?                                                                                                                                    |
| ----: | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 35.1% | a different Standard topic won best-fit                  | only indirectly — most are cascade from an earlier diverged turn, which changes `?WhatRobotSaid`, the focus list and every StdQuestion flag |
| 21.6% | the engine answered where the original fell to a Default | partly cascade, partly `SpellCheck`                                                                                                         |
| 18.1% | both fell to a Default, a different one                  | **no** — every Default topic is `IfChance`-gated                                                                                            |
| 15.9% | the engine fell to a Default where the original answered | mostly `SpellCheck`                                                                                                                         |
|  7.4% | the recorded topic is not in this build                  | **no** — later build                                                                                                                        |
|  1.9% | Priority disagreements, engine silence                   | small; worth watching                                                                                                                       |

**The corpus is not one build.** Every recorded reply carries the source file and
line NeuroServer ran. Only **44.3%** of the 7,312 recorded replies land inside the
line span the shipped `MRMIND3.vsr` sources give that topic; **47.9%** land outside
it and **4.4%** name a topic this build does not contain. "Robot Greeting" alone
appears at lines 867, 877, 879, 881 and 884 across the recording. That is an upper
bound on exact agreement that no amount of engine work can move.

**`SayOneOf` makes exact-match a floor, not a fidelity measure.** Most MrMind
speech is a `SayOneOf` over two to eight alternatives and the engine's RNG cannot
be NeuroServer's. A turn that picks a different alternative of the _correct_
`SayOneOf` is a success for this revival and a miss for counter (a). The gap
between 9.51% (exact) and 39.39% (correct topic) is mostly that.

**`Compute SpellCheck` is still the identity function.** Unchanged from the
section above, and it cannot be fixed without the binary lexicon, which is not in
the archive. It is **not** the largest fixable-in-principle item: the "Branch A"
section at the end of this file builds the best corrector the archive supports
and measures its whole reach at +0.09 points of correct-topic rate, against a
0.24-point *loss* on the default-only rate. Retracted.

### Harness judgement calls (`engine/test/conformance.mjs`)

**Sessions are split at every recorded `"Robot Greeting"`.** `corpus/sessions.json`
groups turns by NeuroServer connection id and connection 1 alone holds 6,880 of
the 7,304 turns: it is the developer's console, reset over and over inside one
connection. "Robot Greeting" is reachable only from `Utilities/WebNameGreet.n:858` — the
"Login over Web" Scenario, which fires once per connection on
`?WhatUserDid Contains "Web ACCEPT CONNECTION"` and executes
`Suppress "Login from Console"` on the way — and `:877`, the "Login from Console"
Priority Topic, whose whole body is `Suppress This; SwitchTo "Robot Greeting"`.
Either path closes itself when it runs, so a second "Robot Greeting" inside one
user record is impossible. Each one therefore proves a fresh record. This is replay
bookkeeping derived from the script's own suppression semantics, not from the
expected answers; it yields 391 user records.

**`bot.start()` is not called by the harness.** `bot.start()` models the web
front-end (`Priority Scenario "Login over Web"`, an _action_ turn). The recording
is of the console, where `Priority Topic "Login from Console"` is an ordinary
`Always` topic, so the greeting is produced **by** the first user input — which is
exactly what the log shows on turn 0 of 52 of the 57 sessions. Feeding the first
input straight in reproduces it.

**Privacy.** `REPORT.md` contains no user text: only topic names, counts and
script line references. The harness never writes corpus input anywhere.

---

## Branch A: an approximate Sentry spelling checker, built and measured

New: `src/spellcheck.js`, `src/loader.js`'s `loadLexiconSources`,
`test/spellcheck.test.mjs`, `test/spell-reach.mjs`, `test/spell-sweep.mjs`,
`data/*.tlx` (verbatim copies of the four archive lexicons), and
`conformance.mjs --spell=<preset>`.

**It is OFF by default and the recommendation is to leave it off.**
`new Bot(program)` still gets `x => x`. What follows is the measurement that
justifies that, and it corrects a claim made higher up this file.

### What is actually in the archive

| file | what it holds |
| ---- | ------------- |
| `Program/Ssceam2.clx` | the lexicon, compiled. `strings` yields 11,634 shared stem fragments, not words. **Not recoverable.** |
| `Program/Ssceam.tlx` | 1,017 common English words, one per line |
| `Program/Additions.tlx` | 62 vendor words flagged `i`, and **23 flagged `A<replacement>`** — Sentry's auto-change type |
| `Mrmind3/MRMIND3.tlx` | 117 words Peggy Weil added to the project vocabulary |
| `Mrmind3/MRMIND3.script.tlx` | 1,450 given names |

Two things in that table are evidence, not raw material.

**1. `Additions.tlx` carries the vendor's own rewrite table.** Lines 71-72 read
`# The following are common substitutions that aren't always handled` /
`# correctly by the automatic substitution mechanism`, and the 23 lines under
them are `waht -> what`, `yuo -> you`, `u -> you`, `r -> are`, `b4 -> before`,
`im -> I'm`, `alot -> a lot`, `thee -> you`, and so on. Nothing is inferred.

**2. Two of those 23 are dead in this bot, and the scripts say so.**
`Mrmind3/MRMIND3.tlx:110` re-adds `u` and `:67` re-adds `alot` as correctly
spelled words — and both are live match alternatives that a rewrite would kill:

```
Mrmind3/Patterns.n:356                 Patternlist YOU is "you", "your", "u","yourself";
Mrmind3/Utilities/WebNameGreet.n:722   or (?WhoQuestion contains ("you","u" )+"* I am")
Mrmind3/Issues/Emotion.n:497           Topic "I worry alot" is
Mrmind3/AboutUser/UserSociety.n:370    Topic "I read alot" is
```

So the project vocabulary supersedes the vendor table, 21 substitutions
survive, and no other auto-change word occurs as a literal anywhere in the
build.

**3. `Ssceam2.clx` gives up its affix table even though it will not give up its
words.** From byte 0x28 the file is a run of NUL-terminated endings —
`s ing ness ly ed y d r st ment t al less able ier ic es ally or ve te tion
ability ous ies ism ities ity er ties ful en tic nce ion ist ries ation ial
ization ibility ter age ish ted us ian ze ped led sion ess ory se ied ize ical
aries` — the lexicon stored `believe` once and reached `believes` through `s`.
That matters, because any general word list standing in for the compiled
lexicon is lemma-heavy (the one on this machine has `thief` but not `thieves`,
`computer` but not `computers`), and without the affix table every regular
plural in the corpus would look misspelled.

### The behaviour being approximated

- `spec/vendor-docs/Tutorial4.txt:11-19` — "say `helllo` ... The Gerbil spelling
  checker changed the input to `hello`. What actually happened is that the value
  of ?WhatUserMeant was set to the corrected input".
- `:32-35` — "look at what happens when the spelling checker sees this input. It
  changes `Hermes` to `here's`." Distance 2, and to a word the bot never
  declared: the original was **not** conservative and did **not** prefer the
  bot's vocabulary.
- `:77-78` — "the spelling checker will change the unfamiliar word `Herms` in
  this case into `hems`." It always replaced; it never declined.
- `:69-71` — "you misspelled `thieves` by transposing `i` with `e`" — a
  transposition is one edit, so the metric is Damerau, not Levenshtein.
- `Library/StdQuestion/combis/QuesResDebug.us.n:147-148` — "then the spellchecker
  (ships with English dictionary -- dictionaries for other languages are
  available from Neuromedia or Wintertree)".
- `[6629087:3146-3148]` — "the attribute ?WhatUserMeant (i.e. the user's input
  statement with spell-checking applied)".

### What the corrector does

Word by word over `?WhatUserMeant`: an entry in the surviving auto-change table
is applied unconditionally; a word already in the lexicon — directly, or as a
known stem plus one of `Ssceam2.clx`'s own endings — is left alone; otherwise
the nearest lexicon words within a bounded Damerau distance are found through a
SymSpell deletion index and ranked by distance, then by tier (the bot's own
condition-side vocabulary, then the vendor lists, then general English), then
optionally by condition-side frequency. A tie the ranking cannot break leaves
the word alone unless `onAmbiguity: "take"`. Case is carried over and words
containing a digit are never touched (`Mrmind3/Patterns.n`'s AGE list matches
literal numerals).

### The ceiling, before any replay

`node engine/test/spell-reach.mjs`, over the 7,160 recorded inputs, no engine in
the loop:

```
total input words                                   18096
unknown to the lexicon                        1814 (10.02%), 1039 distinct
inputs containing at least one unknown word   1641 (22.92%)   <- the ceiling
```

**83% of those unknown words have no neighbour at all one edit away.** They are
names, mashed keys, URLs and coinages, not typos. With the archive lexicons
alone and nothing standing in for `Ssceam2.clx` (5,329 known words instead of
236,385) the unknown share rises to 27.09% of inputs and the most aggressive
configuration still rewrites only 5.13% of them.

### Measured

`node engine/test/conformance.mjs --spell=<preset>`, all 7,304 turns, one run
each; the rewrite column is from `spell-reach.mjs` over the 7,160 CDB inputs.

| corrector | inputs rewritten | correct topic | exact line | engine default-only |
| --------- | ---------------: | ------------: | ---------: | ------------------: |
| **identity (shipped)** | 0 | **2659 (39.39%)** | **642 (9.51%)** | **1830 (25.05%)** |
| `--spell=auto` auto-change table only | 9 (0.13%) | 2659 (39.39%) | 642 (9.51%) | 1830 (25.05%) |
| `--spell=ed1` edit distance 1 | 102 (1.42%) | 2665 (39.48%) | 641 (9.49%) | 1812 (24.81%) |
| `--spell=ed1freq` ED1 + frequency tiebreak | 112 (1.56%) | 2665 (39.48%) | 641 (9.49%) | 1812 (24.81%) |
| `--spell=ed2long` ED1, ED2 over 6 letters | 119 (1.66%) | 2665 (39.48%) | 641 (9.49%) | 1812 (24.81%) |
| `--spell=short` ED1 down to 3 letters | 159 (2.22%) | 2661 (39.42%) | 638 (9.45%) | 1808 (24.75%) |
| `--spell=sentry` general-English, never declines | 231 (3.23%) | 2660 (39.40%) | 637 (9.44%) | 1809 (24.77%) |

The original, on the same 7,304 turns: **1835 default-only (27.18%)**.

And the same question through the older calibration harness,
`node engine/test/spell-sweep.mjs`, all 7,160 CDB inputs, one `Bot` per
connection (that harness never resets a user record, which is why its default
rate sits so much higher than `conformance.mjs`'s — see the harness note above):

| corrector | default-only | same topic | exact line |
| --------- | -----------: | ---------: | ---------: |
| identity | 38.60% | 39.72% | 9.22% |
| ED1 + frequency tiebreak | 38.62% | 39.85% | 9.37% |

### Verdict: do not enable it

**No configuration moves the default rate toward the archive's 25.68%.** The
engine already sits at 25.05% and every corrector moves it *down*, away from
both 25.68% and the 27.18% the original produced on these very turns. The
best topic gain is **+6 turns out of 6,751 (+0.09 points)**, bought for one lost
exact line — inside the noise of a single `IfChance` roll.

The frequency tiebreak buys nothing (`ed1` and `ed1freq` are identical to the
turn). Extending to distance 2 for long words buys nothing. Going down to
three-letter words and imitating Sentry's refusal to decline both make the
topic rate *worse* than plain ED1.

**This corrects the claim made twice above.** `SpellCheck` is *not* "the largest
single fixable-in-principle item": at most 22.9% of inputs contain a word the
lexicon does not know, the best recoverable corrector rewrites 1.4-3.2% of
inputs, and the measured effect on topic agreement is under a tenth of a point.
The residue is cascade divergence, `IfChance`, and the fact that the recording
is of a later build.

What is kept, therefore, is the measurement and the evidence — the module, its
tests, `spell-reach.mjs`, and the `--spell` flag — with the identity function
still in place. `engine/test/spellcheck.test.mjs` pins the two archive findings
that would otherwise be lost: the vendor rewrite table, and the two entries the
project vocabulary kills.

---

## Branch C: matching strictness and the run loop, audited and left alone

An independent audit ran every worked example in `MANUAL__Operators.txt` and
`spec/vendor-docs/Matches.txt` as assertions and read the run loop against
`[P §14.1]`. **No change was adopted.** What follows is the record, so that the
next reader does not repeat it.

### Verified conformant, unchanged

- **`#`** never crosses a space, so `"##"` matches one word and `"# #"` two;
  `"cat#"` matches "cat" with zero characters; `#` excludes apostrophes. 65 of
  the 66 rows of `MANUAL__Operators.txt`'s summary table and worked examples
  hold. The one failure is the already-documented divergence X1
  (`"virtual*robot"` against "virtual reality robots"), which the same manual
  contradicts three lines later with `"robot"` against "robots" = No. No single
  model satisfies both sentences.
- **`Matches` vs `Contains`.** `matchWhole` tolerates leading and trailing
  spaces and punctuation and no extra words; `matchAnywhere` is a substring test
  with a word-boundary rule at both ends. Asserted against
  `vendor-docs/Matches.txt`'s own examples ("How are you?" matches, "How are you
  doing?" does not; "What", "What?", "What!?" match, "What are you?" does not).
- **`,` and `.` inside pattern strings.** Compiled node dumps of the real
  shipped strings — the profanity filter's `"f,u,d,g,e"` and `"ass,hole#"`, the
  name parser's `"#,one"` and `"#\'s"`, `"sex.organ"`, `"%%%-%%%%"` — show every
  operator compiled as an operator and nothing literalised.
- **Trailing punctuation never blocks a match**, and hyphens are punctuation, so
  `Contains "time"` matches "part-time" as `MANUAL__Operators.txt`'s `part.time`
  example requires.
- **The run loop.** Already-executed categories are excluded in the Priority
  scan, in `selectBestFit` and in the Default scan; only the first *active*
  base-level block of a category is eligible; the 33 Priority and 38 Default
  topics run in `MRMIND3.vsr`'s `[FILES]` order and `attentionFocus` starts as a
  copy of the Standard list in build order; a `Done` anywhere ends the run
  unless a SequenceContinuation is outstanding.
- **`WaitForResponse` resumption** happens after the Priority phase and before
  any best-fit selection, whatever the continuation's specificity, as
  `[P GetNextCategory]` describes. Name Capture agrees with the recording on
  93.7% of the 714 turns it was recorded on, and the Priority buckets are 35
  missed and 6 spurious out of 7,304 turns.

`[P §14.1]`'s exclusion of blocks that follow a guaranteed non-IF statement is
still not implemented, and is a no-op here: **zero** categories in this build
have a top-level bare statement.

### D6, proposed and measured and rejected

An unset attribute in *pattern* position currently renders to `""`, and an empty
pattern matches every input, so `IfHeard ?YesResponse, ?NoResponse,
?NotSureResponse` (`Mrmind3/Issues/Emotion.n:115`) and `heard ?AnyQuestion`
(`Mrmind3/Issues/Consciousness.n:401`) are true on any turn on which those
attributes have never been set. `renderPattern({t:'mem'}, unsetEnv)` returns
`[{text:"",path:[]}]` and `test(anyInput, ?unset, "contains", env)` returns a
match.

The proposal — return no alternative instead — has a real source:
`spec/D-commands.md §1.2`'s grammar is `eval(?A) = memory[A]  (* [] if unset *)`,
and `vendor-docs/Matches.txt` says the condition is true "if at least one of the
patterns is 'equivalent' to the user input", which nothing satisfies when there
are no patterns. It also has a real source against it, in the same section:
`eval(*n) = [ starbuffer[n] ]  (* "" if unbound *)`, and the archive artifact
`Mrmind3/TextFiles/Ashamed.txt` proves an unset attribute contributed `""` to a
`+` cross product rather than annihilating it. `[D §1.2]` does not speak with
one voice about a memref that is being *rendered* rather than *tested*.

It was measured on the full corpus and it is worse on four of the six headline
metrics, including both the ones the project tracks:

| metric | engine as shipped | with D6 |
| ------ | ----------------: | ------: |
| calibrate default-only (7,160 inputs) | 38.60% | 38.74% |
| calibrate same topic | 39.72% | 39.88% |
| calibrate exact line | 9.22% | 9.10% |
| conformance correct topic (7,304 turns) | **39.39%** | 39.11% |
| conformance exact reply | **9.51%** | 9.39% |
| conformance engine default-only | **25.05%** | 24.53% |

25.05% is inside `spec/E §10.1`'s 25-27% acceptance band; 24.53% is below it.
A narrow variant that changes only the `mem` case and the empty-list fallback,
leaving unbound stars, unresolved PatternList symbols and unknown nodes at `""`,
measures **turn for turn identical** to the wide one — so the star, symbol and
default arms of the proposal are no-ops in this build and only the attribute
case has any reach at all. Rejected on the measurement, recorded here because
the semantics are genuinely unsettled and someone will find it again.

### Two latent inconsistencies, reported and not changed

- `runtime.needsStructural` walks `list`, `optional` and `symbol` but not
  `concat`, so an `and` list or an `and not` element inside a concatenation
  would be flattened into OR alternatives. **Zero** of the build's 172 `and`
  lists and 5 `not` nodes sit under a `concat`.
- `renderValue`'s `optional` branch drops the node's `op`. **Zero** of the
  build's 8 `optional` nodes carry `op:'and'`.
- `tokenizeInput` treats an apostrophe as word-internal ("don't" is one word)
  but `boundaryOk` uses letter-or-digit only, so a `Contains` span may legally
  end between "don" and "'t". Making the apostrophe a word character would also
  stop `Contains "Mom"` matching "Mom's". No manual sentence settles it and the
  manual's own `IfHeard "I don't know"` example works either way.

---

## The calibration harness measures a session that never happened

`engine/test/calibrate.mjs` reports a default-only rate near 38-39% where
`engine/test/conformance.mjs` reports 25%. The corpus settles which is right.

`calibrate.mjs` builds one `Bot` per CDB connection id, and connection 1 holds
6,880 of the 7,160 recorded inputs — so one user record accumulates for
thousands of turns, and the `Suppress` list plus the hundreds of
`IfDontRecall ?Told.X` guards progressively starve the Standard phase. But that
one connection contains **331 recorded "Robot Greeting" replies**, and that
topic is reachable at most once per user record: `Utilities/WebNameGreet.n:858`
sits inside the "Login over Web" Scenario (one `Web ACCEPT CONNECTION` per
connection, and it suppresses the other path) and `:877` is the "Login from
Console" Priority Topic, which opens with `Suppress This`. The original started
a fresh user record 331 times inside that connection id.

`calibrate.mjs` is left as it is, because it is a useful independent replay and
because changing a harness to move a number is the thing this project forbids.
But its default-only figure is a session-model artifact and **must not be tuned
against**. `conformance.mjs`'s segmentation — a new record at every recorded
"Robot Greeting", 391 records — is the comparable one.

One more caveat on the target itself. `Mrmind3/MRMIND3CDB.cdb.report.txt` states
its 25.68% over **25 conversations and 6,187 user statements**, the 11 December
2000 console session accounting for 5,914. The export replayed here holds
**7,160 user statements over 28 connections with input**, 6,880 of them in that
same session. The archive's figure was computed before roughly 970 further
console turns were appended. It describes an earlier snapshot of this database,
not the rows we replay. Treat it as a band to land in, not a number to hit.

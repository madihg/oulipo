# MrMind / NeuroScript 2.2 — Implementation Specification

**The single document to implement from.** A faithful, model-free JavaScript re-implementation of the
NeuroServer 2.2 runtime, running Peggy Weil's `Mrmind3` bot exactly as it ran in 2002.

**Companion documents.**

| file                                              | dimension                                              |
| ------------------------------------------------- | ------------------------------------------------------ |
| `A-lexical-and-structure.md`                      | lexer, top-level statements, the `.vsr` project        |
| `B-patterns-and-matching.md`                      | patterns and the matcher — **see §12.1, partly wrong** |
| `C-conditions.md`                                 | conditions, `Otherwise`, block terminators             |
| `D-commands.md`                                   | commands, `Compute`, output                            |
| `E-topics-focus-and-selection.md`                 | categories, focus, the run loop, specificity           |
| `F-stdquestion-library.md`                        | the StdQuestion pipeline, name capture, profanity      |
| `G-corpus-and-voice.md` + `G-all-say-strings.tsv` | the 1375 output strings                                |
| `OPEN-QUESTIONS.md`                               | everything still unresolved                            |

This document is **self-contained for §2 (grammar), §5 (matching), §6 (conditions), §7 (commands) and
§8 (run loop and selection)** — the parts that get coded. Everything else cross-references.

**Sources, in order of authority.**

1. **The archive.** `mrmind/archive/1_NeuroServer_fromVaio_MrMind/NeuroScript/`.
   Paths below are relative to that directory. Ground truth.
2. **The vendor's own NeuroScript Language Manual**, shipped with NeuroServer and preserved at
   `archive/1_NeuroServer_fromVaio_MrMind/Program/Help/NeuroScriptManual/`, extracted to
   `spec/neuroserver-help/MANUAL__Operators.txt` and `MANUAL__BestFit.txt`. Cited as `[man:Operators]`
   / `[man:BestFit]`. **No census agent used these; they settle the matcher (§5) and they overturn
   dimension B's central claim.**
3. **The vendor tutorial**, `archive/_research/raw/NEUROSERVER_tutorial.txt`, cited `[tut:LINE]`.
4. **The patent-derived notes**, `archive/_research/patents/GERBIL-LANGUAGE-NOTES.md`, cited `[spec §N]`.
   Authoritative only for what the archive cannot show: the run loop and the specificity formula.
5. **The shipped conversation database**, `_work/cdb/mrmind3/*.csv` (25 conversations, 11 Dec 2000 –
   9 Apr 2001, 7,160 user inputs, 7,312 bot utterances). Cited as **CDB**. Behavioural ground truth —
   it outranks source comments about behaviour.
6. Compiled artefacts (`NSOBJ/*.nso`, `MRMIND3.vre`) — corroboration only.

Every count in this document was re-measured with a string- and comment-aware tokenizer over the 49
build files. Where a dimension file disagrees, §12 says so and gives the evidence.

---

## 0. What MrMind is, and what "faithful" means here

MrMind is a chatbot written by Peggy Weil between 1998 and 2014 and hosted at `mrmind.com`. It asks
the user to prove they are human. It is a work of art, not a product: the interest is in the exact
text, the exact evasions, and the exact ways it fails.

The engine is **NeuroServer 2.2** (NativeMinds, formerly Neuromedia), and the language is
**NeuroScript 2.2**, a descendant of GeRBiL. There is no statistical model anywhere in it. Every
response is a hand-written string selected by hand-written patterns and one arithmetic tie-break rule.
Reproducing it is a matter of getting five mechanisms exactly right: the matcher, the condition
evaluator, the block/terminator control flow, the attention-focus list, and the specificity score.

### 0.1 The fidelity contract

**Faithful means: same input, same output, for the same reasons.** Concretely, in decreasing order of
importance:

1. **Reproduce bugs.** The archive is full of them and they are load-bearing. `?NameTries` never
   advances past `"1"` (§9.4). `it's been` uses the wrong buffer (§9.2). `Subjects "ME,AGE";` is one
   subject, not two (§8.6). `"what if X"` yields `" if X"` (§9.3). Apologising does not reset the
   profanity counter. Do not fix any of these.
2. **Reproduce dead code.** 24 of the 62 `Focus Subjects` arguments name a subject no category
   declares; they must still reset the active-subject set and still fail to focus anything.
3. **Byte-exact output strings.** Double spaces, trailing spaces, `<BR>`, `é` in "Paul Valéry",
   "how do know that", "You can at make a donation", the unbalanced `\"not alive.` — all preserved.
   `G-all-say-strings.tsv` field 4 is the reference; a diff against it is the test.
4. **Statistical fidelity where determinism is impossible.** `SayOneOf` and `IfChance` are random. The
   calibration target is the CDB: **26.3 % of bot utterances come from a `Default` topic**
   (the engine's own report says 25.68 %; re-measured 26.27 %), **2.94 % from a `Priority` topic**,
   and **94.6 % of answered turns are produced by a single topic**. A port outside the 25–27 % default
   band has the selection logic wrong.
5. **Not faithful, deliberately.** `SayToFile` writes the user's self-declared name, IP address and
   free text to disk in 73 places. Implement it as a no-op behind an explicit opt-in (§7.4). Nothing
   user-visible depends on it. Spell-check cannot be reproduced (§4.3).

### 0.2 What the port does _not_ need

`Do`, `DoOneOf`, `Show`, `ShowTemplate`, `ShowLocalFile`, `Recover`, `RememberOneOf`, `ForgetOneOf`,
`SwitchToOneOf`, `IsOneOf`, `Expires`, `SequenceExample`, `LastTopic`, `NextScenario`, `IfNotHeard`,
`DoesNotExactlyMatch`, `ReplacePronouns`, `SubjectInfo`, `TopicList`/`ScenarioList`/`CategoryList`,
`SwitchTo <symbol>` (unquoted), the `LoginAs`/account family, `Get … from PLUGIN`, hierarchical bot
scripts, and the learned question classifier (`?CategoryLabel`). Every one of these has **zero live
occurrences in the 49-file build**; most have zero occurrences in the whole archive. Parse them if you
like; do not implement them.

**22 commands** and **six condition heads** are the whole language MrMind3 uses.

---

## 1. File and project model

Detail: `A-lexical-and-structure.md` §1, §10.

### 1.1 Bytes

- `.n` files are **CRLF** and **Windows-1252 / Latin-1**. Never UTF-8. The build contains exactly
  three non-ASCII bytes, all `0xE9` (`é`), all in `Mrmind3/AboutMrMind/MMIdentity.n` (lines 204, 213,
  217 — line 213 is a _pattern_, `("Paul Valery","Paul Valéry")`). Decode `latin1`, then work in JS
  strings.
- Strip `\r` before line-based work; CR is whitespace.
- **Zero-byte files exist and must be reported, not silently accepted**: `Mrmind3/Activities/picutres.n`,
  `Mrmind3/AboutMrMind/MMfamily.n`, `Mrmind3old/Answering.n`,
  `Mrmind3old/AboutMrMind/MMfamily.n`. `Mrmind3/Defaults/Switches.n` is 18 bytes of whitespace. **None
  is in the build manifest.** No NUL-filled files exist anywhere.

### 1.2 The manifest

`Mrmind3/MRMIND3.vsr` is a Windows INI file. Its `[FILES]` section lists **49** entries — not 50.
(The task brief and dimension F both say 50; the file says 49, verified by direct count. All 49
resolve on disk.)

- Paths are backslash-separated and relative to the directory holding the `.vsr` (`Mrmind3/`).
- The prefix `LIBRARY:` re-roots at `NeuroScript/Library/`. Used exactly once:
  `LIBRARY:StdQuestion\combis\QuesResDebug.us.n=1`.
- **Resolve case-insensitively.** The manifest contains both `Customization\` and `customization\`
  for one on-disk directory.
- Filenames may contain spaces (`Activities\Expressions Filter.n`) and `&` (`Humans&Machines\`).
- `[DICTIONARY FILES]` / `[MISC FILES]` name the Wintertree spell-check lexicons and thesaurus with
  the prefixes `DICTIONARY-LIBRARY:` / `THESAURUS-LIBRARY:`, re-rooted the same way. **They are not
  in the archive.** `[BUILDER]` holds lint switches; `[SETTINGS]` server config; `[ODBC]` the LTM and
  conversation databases. There is no search path beyond those three prefixes.

The full 49-entry list in order is in `A-lexical-and-structure.md` §10.1.

### 1.3 Load order is semantics, three ways

1. **Declaration before use.** Concatenated in manifest order, all 231 `Pattern`/`PatternList`
   references fall after their definitions: 0 forward references, 0 duplicate definitions. Build the
   pattern environment in manifest order; treat a forward reference as a load error.
2. **Priority and Default execution order** is program order = manifest order, then position in file.
   The last category of the last file is `Default topic "Last Line Of Defense"` — a designed catch-all.
   Reordering `[FILES]` changes the bot.
3. **Initial attention-focus order** for a new user is program order over the Standard categories
   `[man:BestFit]`: _"When a user first logs on, standard topics are ordered on the 'attention stack'
   in the same order in which they appear in the script files."_

### 1.4 What loads, verified

**49 files → 691 categories.** Verified by tokenizer over the resolved build:

| kind                | count   |
| ------------------- | ------- |
| Standard `Topic`    | **559** |
| `Sequence Topic`    | **61**  |
| `Default Topic`     | **38**  |
| `Priority Topic`    | **30**  |
| `Priority Scenario` | **3**   |
| **total**           | **691** |

`EndTopic` 688 + `EndScenario` 3 = 691. (Dimension E says 690/558; it drops
`Mrmind3/Humans&Machines/Bots.n:1`, whose header is `/Topic "Are bots smart" is` with a stray leading
slash. That topic **is** in the compiled `.nso`, so the compiler tolerated the slash. Accept a lone
`/` before a category keyword — §12.4.)

Do not load: `Mrmind3/Issues/Bots.n` (a byte-identical twin of the built `Humans&Machines/Bots.n`),
`Mrmind3/Defaults/Switches.n`, the two zero-byte files, and the 34 further `.n` files under
`Library/` — in particular **not** `StdQuestion/StdQuestion.us.n` or `StdResponse.us.n`, whose
combined build `combis/QuesResDebug.us.n` is what the manifest loads. Loading both would define every
`StdP.*` list twice.

---

## 2. Full EBNF of NeuroScript 2.2 as the archive uses it

Terminals in `"quotes"` are **case-insensitive** keywords. All identifiers, keywords, attribute names,
pattern-list names, category names and subject names are case-insensitive — key every symbol table on
a case-folded string. Whitespace (space, TAB, CR, LF) is free-form and separates nothing but tokens;
**newlines terminate nothing**.

### 2.1 Lexical

```ebnf
Program        = { WS | Comment | TopLevelStatement } ;

Comment        = "//" , { AnyCharExceptNewline } , ( Newline | EOF ) ;
WS             = " " | "\t" | "\r" | "\n" ;

String         = '"' , { '\' , AnyChar | AnyCharExcept('"','\') } , '"' ;
Symbol         = Letter , { Letter | Digit | "_" | "." } ;
MemRef         = "?" , NameChar , { NameChar } ;
NameChar       = Letter | Digit | "_" | "." ;
StarBufRef     = ( "*" | "#" | "^" | "%" ) , Digit , { Digit } | "*match" ;
Integer        = Digit , { Digit } ;
Decimal        = Digit , { Digit } , "." , Digit , { Digit } ;
Percent        = ( Integer | Decimal ) , "%" ;
```

**Lexer rules that are not optional.**

1. **Scan string literals before comments.** `//` inside a literal is data:
   `"http://www.hotbot.com/?MT="`, `"Speciallogs//WhereFrom"`. Stripping comments first truncates them
   into unterminated literals.
2. **`//` is the only comment form.** There are no block comments. All 38 occurrences of `/*` in the
   build are inside `//` banner rules; exactly **one** `/` survives outside comments and strings in the
   whole build, and it is the stray slash at `Humans&Machines/Bots.n:1`. (Dimension E says `/* … */`
   "also occur"; it does not.)
3. **The backslash escape consumes exactly one character and only `\"` collapses.** On `\`, take the
   backslash and the next character; if that character is `"`, emit `"` alone; **otherwise emit both
   characters unchanged**. Proved against the compiled objects: `PatternList Punc is "\.","\?","\!","\,";`
   (`Utilities/WebNameGreet.n:665`) stores four **2-byte** strings; `"#\'s"` stores 4 characters;
   `"C:\Program Files\NativeMinds\TextFiles\NameReason.txt"` stores the path verbatim. A C-style lexer
   corrupts every `SayToFile` path and every escaped pattern character.
   `unescape("\\.") === "\\."` — two characters. `unescape('\\"') === '"'` — one.
4. **Dots and underscores are name characters**, contradicting the patent BNF. 88 dotted symbols
   (`StdP.QuestionStarts`, `BOTHER_AGGRAVATE.V`, `SDeb.CONSOLEDEBUGGING`) and 22 dotted memrefs
   (`?StdQ.LocalQuestion`). The dot is not a field access.
5. **Memref names may contain and begin with digits** (`?20QAns`, `?Name1`); symbols may not (none
   does). After `?`, take the longest run of `[A-Za-z0-9_.]`.
6. **Star-buffer references are single tokens**, not `*` followed by a number. But `#1` _inside a
   string literal_ is `#` followed by the digit `1` — `PatternList HEX is "#0#","#1#",…,"#f#";`
   (`Patterns.n:327`) is a hex-digit test, not a buffer reference.
7. **Strings do not span lines.** Of 14,180 build lines exactly 10 have an odd unescaped-quote count
   and all 10 are comments. Reject an unterminated literal at end of line with a clear error.
8. **No whitespace is required between tokens** where the character classes differ:
   `Matches"*zink*"`, `?IPaddress+ " says: "`, `"a"+"b"`.
9. Numbers may be integers (`Specificity 3000`), decimals (`IfChance 0.90`) or percentages
   (`IfChance 33%`). `%` after a number is a suffix; `%` _inside a string_ is a wildcard.
10. Tolerate a lone `/` immediately before a category keyword (rule 2).

### 2.2 Top level

```ebnf
TopLevelStatement = PatternDef | PatternListDef | AttributeDef | MemoryLockStmt
                  | OtherExampleDef | Category ;

PatternDef      = "Pattern"     , Symbol , "is" , PatList , ";" ;
PatternListDef  = "PatternList" , Symbol , "is" , PatList , ";" ;
AttributeDef    = "Attribute" , MemRef , [ "Specificity" , Integer ] , ";" ;
MemoryLockStmt  = "MemoryLock" , MemRef , { "," , MemRef } , ";" ;
OtherExampleDef = "OtherExamples" , "of" , String , [ ExampleGuard ] , "are" , PatList , ";" ;
ExampleGuard    = "WhenFocused"
                | "When" , [ "Focused" , "and" ] , MemRef , "is" , PatList ,
                          { "and" , MemRef , "is" , PatList } ;

Category        = TopicDecl | ScenarioDecl ;
TopicDecl       = [ CategoryInfo ] , "Topic"    , String , "is" , { CategoryStatement } , "EndTopic" ;
ScenarioDecl    = [ CategoryInfo ] , "Scenario" , String , "is" , { CategoryStatement } , "EndScenario" ;
CategoryInfo    = [ "Suppressed" ] , [ "Priority" | "Default" | "Sequence" ] ;

CategoryStatement = MemoryLockStmt | SubjectsStmt | ConditionalBlock ;
SubjectsStmt      = "Subjects" , String , { "," , String } , ";" ;
```

- Categories do not nest. Names are unique across the build (0 duplicates, case-insensitively), which
  is what makes `SwitchTo "name"` well-defined. Names may contain spaces, punctuation, `?`, `/`,
  `<BR>`, and **a trailing space** (`Priority Topic "FindQuestion "`). Preserve them; trim only when
  comparing.
- `is` is mandatory in a header (691/691).
- `Suppressed` never occurs in the build; parse it anyway (a category so declared starts suppressed
  for every user).
- Build census: `PatternList` 228, `Pattern` 3, `Attribute` 33 (all with `Specificity`; the bare form
  never occurs), `MemoryLock` 33, `OtherExamples` 182, `Subjects` 570 statements.

### 2.3 Blocks, conditions, terminators

```ebnf
ConditionalBlock = HeadCondition , { BodyItem } , Terminator ;

HeadCondition = "Always"                                              (* no "Then" *)
              | "If"           , ClauseExpr   , "Then"
              | "IfHeard"      , MatchingList , { BoolOp , Clause } , "Then"
              | "IfRecall"     , MemList      , { BoolOp , Clause } , "Then"
              | "IfDontRecall" , MemList      , { BoolOp , Clause } , "Then"
              | "IfChance"     , [ Chance ]   , "Then"
              | "IfNotHeard"   , MatchingList , "Then" ;   (* 0 occurrences; dead grammar *)

BodyItem   = Command | ConditionalBlock | "Otherwise" , ConditionalBlock ;

Terminator = "Done" | "Continue" | "NextTopic" | "TryAgain" | "SwitchBack"
           | "NextScenario" ;                              (* 0 occurrences *)

ClauseExpr = Clause , { "and" , Clause }
           | Clause , { OrOp  , Clause } ;   (* and and or may NOT be mixed at one level *)

Clause = "(" , ClauseExpr , ")"
       | "{" , ClauseExpr , "}"                            (* optional clause; 1 in the archive *)
       | "Focused" | "IfFocused"                           (* IfFocused: archive-only *)
       | "Chance" , [ Chance ] | "IfChance" , [ Chance ]
       | HeardKw  , MatchingList
       | RecallKw , MemList
       | Pat , MatchKw , MatchingList ;

HeardKw  = "Heard" | "NotHeard" | "IfHeard" | "IfNotHeard" ;
RecallKw = "Recall" | "DontRecall" | "IfRecall" | "IfDontRecall" ;
MatchKw  = "Contains" | "Matches" | "ExactlyMatches"
         | "DoesNotContain" | "DoesNotMatch" | "DoesNotExactlyMatch" ;

AndOp  = "and" | "&" ;      OrOp = "or" | "," ;      BoolOp = AndOp | OrOp ;
Chance = Number | Number , "%" ;

MatchingList = Pat , { AndOp , [ "not" ] , Pat }
             | Pat , { OrOp , Pat } ;
MemList      = MemRef , { AndOp , MemRef } | MemRef , { OrOp , MemRef } ;
```

**Every non-`Always` head is followed by `Then`.** Verified: 1374 head keywords, 1374 `Then`, zero
exceptions. (Dimension E says "`Then` is optional in practice"; it is not. `Always` is the only head
that never takes `Then`, 0/123.)

**`;` rules, uniform across the whole build.** A `;` terminates every _declaration_ and every
_command_. A `;` is **never** written after `Then`, `Always`, `Otherwise`, `Done`, `Continue`,
`NextTopic`, `TryAgain`, `SwitchBack`, `EndTopic`, `EndScenario`. Census (token immediately
following): `Done` 759/759 not followed by `;`; `WaitForResponse` 89/89 followed by `;`; and so on.
Accept a stray `;` after a terminator rather than erroring — the compiler's tolerance is untested.

### 2.4 Commands

```ebnf
Command =
    "Say"               , PatList , ";"
  | "SayOneOf"          , PatList , ";"
  | "SayToConsole"      , PatList , ";"
  | "Trace"             , PatList , ";"
  | "SayToFile"         , PatList , PatList , ";"   (* path, then content; NO separator *)
  | "Remember"          , Assign , { "," , Assign } , ";"
  | "Forget"            , MemRef , { "," , MemRef } , ";"
  | "Focus" , "Subjects", String , { "," , String } , ";"
  | "Focus"             , String , { "," , String } , ";"
  | "DontFocus"         , ";"
  | "Suppress"          , ( "This" | String { "," , String } ) , ";"
  | "SwitchTo"          , String , ";"
  | "WaitForResponse"   , ";"
  | "InterruptSequence" , ";"
  | "DisconnectThisUser", ";"
  | ExampleStmt ;

Assign = MemRef
       | MemRef , "is"      , PatList
       | MemRef , "IsOneOf" , PatList                       (* 0 uses in the build *)
       | MemRef , "is" , "Compute" , FnName , "of" , PatList ;

FnName = "SpellCheck" | "Capitalize" | "UpperCase" | "LowerCase"
       | "Sum" | "Difference" | "Product" | "Ratio" | "URLEncoding" ;

ExampleStmt = [ "WhenFocused" ] , "Example" , PatList , ";"
            | "When" , WhenCond , { "and" , WhenCond } , "Example" , PatList , ";"
            | "InitialExample" , Integer , String , ";" ;
WhenCond    = [ "Focused" , "and" ] , MemRef , "is" , PatList ;
```

**No command ever appears at the top level of a category outside a conditional block.** Verified over
the whole build. Every command is inside a block.

Build census (tokenizer, comments and strings excluded): `Say` 555, `SayOneOf` 305, `SayToConsole` 116,
`SayToFile` 73, `Trace` 4, `Remember` 571, `Forget` 82, `Focus` 69 (of which 62 `Focus Subjects`),
`DontFocus` 58, `Suppress` 37 (36 × `Suppress This`), `SwitchTo` 134, `SwitchBack` 286,
`WaitForResponse` 89, `TryAgain` 9, `InterruptSequence` 3, `NextTopic` 17, `DisconnectThisUser` 1,
`Done` 759, `Continue` 414, `Otherwise` 107, `Always` 123, `IfChance` 102, bare `Chance` 1,
`Example` **545**, `OtherExamples` 182, `InitialExample` 2, `WhenFocused` 46, `Focused` 96,
`IfFocused` 4, `Compute` 8. (Dimension E's `Example` 553 and F's 748 count occurrences inside string
literals; 545 is right.)

### 2.5 Pattern lists

```ebnf
PatList  = Concat , { "," , Concat } ;              (* "," = alternation / list union *)
Concat   = Atom , { ( "+" | "&" ) , Atom } ;        (* "+" = concatenation / cross product *)
Atom     = String | Symbol | MemRef | StarBufRef
         | "(" , PatList , ")"                      (* inline anonymous list *)
         | "{" , PatList , "}" ;                    (* optional element *)
```

`+` binds tighter than `,`. `&` occurs **exactly once** in the whole archive, at
`Defaults/Answers.n:285` — `And ?DescriptionQuestion contains (YOU & "think")`. Treat it as `+` and
record the divergence.

Nesting is shallow: over the whole archive, depth 0 → 4000, depth 1 → 1012, depth 2 → 43, depth 3 → 1.

**Two parser quirks to tolerate**, both malformed and both real:

- `Say "…" + ,` — a `+` immediately followed by `,` (`Issues/Misc.n:69`, `Mrmind3old/Issues/Misc.n:67`).
  The compiled `.nso` contains both strings. Parse as a plain `,` (two utterances) and warn.
- `SayOneOf STDX.RESPONSE_TO_SEXUAL+"  "+;` — a trailing `+` with no right operand
  (`Utilities/CProfanity.n:84, 92, 98`). Parse as `<list> + "  "`.

### 2.6 The one genuine parsing ambiguity

After `If`, a `(` may open **either** an inline pattern list **or** a condition group. Resolution rule
(this parses 4543/4543 conditional blocks in the archive with zero failures):

> While parsing a `MatchingList` or `MemList`, after consuming a `BoolOp`, look ahead. Stop the list
> and hand the operator back to the clause level **iff**:
>
> 1. the next token is a clause keyword (`Heard`, `NotHeard`, `Recall`, `DontRecall`, `Focused`,
>    `Chance`, `IfHeard`, `IfNotHeard`, `IfRecall`, `IfDontRecall`, `IfChance`, `IfFocused`), **or**
> 2. the next token opens a bracket group whose balanced contents contain a clause keyword or a match
>    keyword at any depth, **or**
> 3. scanning forward at bracket depth 0 (stopping at the first unbalanced `)`/`}`, at the next
>    `BoolOp`, or at `Then`) reaches a match keyword.
>
> Exception: `not` immediately after an `AndOp` always belongs to the matching list.

Worked: `If Recall ?FactQuestion and Heard (BOTS, YOU) and SMARTWORD Then`
(`Humans&Machines/Bots.n:3-4`). The first `and` joins clauses; the second stays inside `Heard`'s list
because `SMARTWORD` is a pattern-list name. Reading: _a fact question was detected, and the input
contains (BOTS or YOU) and a SMARTWORD._

**`and` and `or` may not be mixed at one bracketing level.** Zero violations in 4543 blocks. Reject a
mixed level as a load error; do not invent a precedence.

---

## 3. Runtime data model

### 3.1 Program (immutable after load)

```
PriorityCategories   : Category[]                 // manifest order
StandardCategories   : Category[]                 // manifest order
DefaultCategories    : Category[]                 // manifest order
SequenceCategories   : Category[]                 // addressed by name only
categoriesByName     : Map<lower(name.trim()), Category>
patternLists         : Map<lower(symbol), PatListNode>
subjectMap           : Map<lower(subject), Category[] in manifest order>   // 196 entries
attributeSpecificity : Map<lower(attr), int>      // from Attribute…Specificity; default 2000
wordFrequency        : Map<word, count>           // from all Example/OtherExamples strings (§8.5)
```

A `Category` holds: name (verbatim), type (`Standard | Priority | Default | Sequence`), kind
(`Topic | Scenario`), declared subjects (verbatim + normalised), block tree, and a precomputed
`autoFocusGroup` — the ordered list `[self] ++ (for each subject in declaration order: the other
Standard categories carrying it, in manifest order, de-duplicated)`.

### 3.2 Per user (persists for the whole conversation)

```
memory               : Map<lower(attr), string[]>     // Recall(k) ⇔ key present (even if "")
AttentionFocus       : Category[]                     // a permutation of StandardCategories
SuppressList         : Set<Category>
Continuation         : Continuation | null            // armed by WaitForResponse / TryAgain
SwitchContinuations  : Continuation[]                 // stack, one frame per pending SwitchTo
SequenceContinuations: Continuation[]                 // stack, one frame per unresumed InterruptSequence
ActiveSubjects       : Set<lower(subject)>
LastTopic            : string                         // → ?LastTopic
rng                  : seedable PRNG
```

Both continuation stacks **persist across inputs**. A `Continuation` is (category, block path,
statement index) — enough to restart `Category.run()` in the middle.

### 3.3 Per run (cleared at the top of every run)

```
FocusList            : Category[]        // append-only; consumed by Refocus()
FocusSubjectsSeen    : Set<string>       // literal args of every Focus Subjects executed this run
ActivePriority       : 'Priority' | 'Standard' | 'Default'
ActiveCatPos         : int
SwitchToCategory     : Category | null
Continuation         : Continuation|null // the frame being resumed right now
outputBuffer         : string[]
starBuffer           : { '*':[], '#':[], '^':[], '%':[], match:"" }
```

Per category, per run: `Executed`, `ProducedOutput`, `DontFocus` — all reset at step 1 of the run.

### 3.4 Attributes

- Every attribute is a **list of strings**. `Remember ?X;` (no `is`) stores the single value `"TRUE"`.
- `Recall ?X` is true iff the key is present with a value. **An empty string still counts as
  remembered** — only `Forget` makes `Recall` false. `?ExampleQuestion` is deliberately set to `""`
  (`QRD:1598`) and the library relies on it.
- Names are case-insensitive: `?name` and `?Name` are one slot
  (`WebNameGreet.n:678-679` lowercases then capitalises the same slot).
- `?WhatUserSaid` is engine-set and never written by any script in the build. `?WhatUserMeant` is
  engine-initialised to `?WhatUserSaid` and is freely script-writable — and **is written after
  classification** by one Priority topic (§4.5).
- Host-supplied and never written by a script: `?WhatUserDid`, `?UserIsConsole`, `?Username`,
  `?HostName`, `?IPAddress`, `?HTTP_*`, `?REMOTE_*`, `?SCRIPT_NAME`, `?SERVER_NAME`,
  `?DOCUMENT_ROOT`, `?RobotHandle`. `?LTM.*` is long-term memory keyed by cookie. Stub them.
- Engine-maintained: `?WhatRobotSaid` (the list of this run's utterances),
  `?EverythingRobotJustSaid` (one string, their concatenation), `?WhatUserSaidBefore`,
  `?WhatUserSaidBeforeThat`, `?LastTopic`, `?SayPageTemplate`.
- `MemoryLock ?X;` is a **compile-time assertion only** — no `CMemoryLock` class exists in the
  serialised runtime `MRMIND3.vre`. Parse and ignore, or use it as a lint check. All 33 uses are in
  the library file.

---

## 4. The input pipeline

The pipeline is **script, not engine**. Implement it by running the Priority categories, not by
hard-coding it. Full detail: `F-stdquestion-library.md` §4–§8.

### 4.1 The two tracks

```
?WhatUserSaid          raw input, never modified
   │  Priority "Find ?WhatUserMeant"  (QRD:132)
   │    ?WhatUserMeant := ?WhatUserSaid
   │    if Matches "want to*","wanna*"  →  "do you want to " + *1
   │    ?WhatUserMeant := Compute SpellCheck of ?WhatUserMeant
   │    ≤5 × SwitchTo "remove excess punctuation"   (strips ' " ( ) * only)
   │    ?UnProcessedString := ?WhatUserMeant
   ▼
?WhatUserMeant   ← every Heard / IfHeard / NotHeard in the whole bot tests THIS
   │  Priority "find ?ProcessedString"  (QRD:173)
   │    ?ProcessedString := ?UnProcessedString
   │    ≤4 × "Strip meaningless leaders"      ("okay, ", "well, ", "you know", "wanna ")
   │    ≤5 × "strip meaningless internals"    ("really", "just", "still", double spaces)
   │    ≤6 × "Expand Contractions"            (don't → do not, I'm → I am, …)
   ▼
?ProcessedString
   │  Priority "Set possible statements"
   ├─→ ?StdQ.PossibleQuestion   → 20 question finders  → ?CanQuestion … ?AnyQuestion
   └─→ ?StdS.PossibleStatement  → 12 statement finders → ?MessageStatement … ?AnyStatement
```

**The single most consequential fact.** `Heard X` ≡ `?WhatUserMeant Contains X`. `?WhatUserMeant` is
spell-checked and quote/paren-stripped but **not contraction-expanded and not leader-stripped**.
Contraction expansion lands only in `?ProcessedString`, which no MrMind3 content file ever reads
(0 references outside the library). Therefore:

- `Heard "do not"` does **not** fire on "I don't know".
- `?FactStatement contains "do not"` **does**, because the statement attributes carry
  `?ProcessedString`.

The library is written around this: `StdResponse.NotSure` lists both `"I don't know"` and
`"I do not know"` side by side (`QRD:2260`).

### 4.2 No pronoun replacement

`[spec §13.3]` documents `Compute ReplacePronouns of …` driven by `SubjectInfo`. **Both strings occur
zero times in the entire archive.** MrMind resolves pronouns entirely through subject-based
auto-focus and the `Focused` condition (149 uses of `Focused`/`WhenFocused`/`DontFocus` in the build).
**Do not implement pronoun substitution.**

### 4.3 Spell-check

`Compute SpellCheck of ?WhatUserMeant` (one call, `QRD:149`) runs the Wintertree engine against
`ssceam.tlx`, `ssceam2.clx`, `Additions.tlx` plus the project lexicons. **The dictionaries are not in
the archive.** Make `SpellCheck` the identity function behind a pluggable hook and record the
divergence. This is safe: `Activities/ategag.n:19` relies on `zink`/`zlink`/`pkink` being words that
_cannot_ survive the checker, and under identity they still work (the user would have to type them);
and the one script that tests for spell-check damage (`WebNameGreet.n:142`) is dead code (§9.4).

### 4.4 Classification, in one paragraph

`Priority "FindQuestion "` runs 12 primary finders in a fixed order, then up to three rounds of
"strip a leading clause and re-run", then two last-ditch finders on the unstripped string, then 8
secondary finders. **At most one primary question type is ever set** (each finder is gated on
`DontRecall <every earlier type>`): precedence
`Can > Method > Who > WhatIf > Location > Reason > Should > Time > Fact > Description > Other`.
`?AnyQuestion` is always the whole `?ProcessedString`, never a fragment. Secondaries do not gate each
other; several may be set. `ParseStatements` does the same for statements with precedence
`Message > Act > Is > Have > Want > Fact > Other`, all vetoed by `?StdS.Question` (which fires when
the input looks syntactically like a question — including any **single-word** input).

**Attribute values are the stripped subject of the utterance, not booleans.** "who is Walter" sets
`?WhoQuestion = "Walter"`; "what is a soul" sets `?DescriptionQuestion = "a soul"`.

The 33 registered `Attribute … Specificity` declarations (`QRD:20-58`) are the bot's whole
answer-preference policy and are reproduced in §8.5.

### 4.5 A Priority topic mutates `?WhatUserMeant` after classification

`Activities/ategag.n:1-5` is loaded 15th — after the whole library:

```
Priority topic "hate" is
	If ?WhatUserMeant matches "*hate*" then
		Remember ?WhatUserMeant is *1+" ate "+*2;
	continue
EndTopic
```

So the question/statement attributes are computed from the string **with** "hate" while every
Standard topic's `Heard` sees the string with "ate". This is the setup for `Topic "ate"` →
`Sequence Topic "Invert"`, MrMind's word-inversion gag. **`?WhatUserMeant` must be a live mutable
attribute read at condition-evaluation time**, not a value normalised once up front.

### 4.6 What the pipeline does _not_ do

It does not strip sentence punctuation. `FindOtherQuestion` detects questions with
`?StdQ.PossibleQuestion contains "*#\?*"` (`QRD:1381`), which requires the `?` to survive. The
matcher itself is punctuation-preserving (§5.6).

---

## 5. Pattern matching — **normative, and this section corrects dimension B**

### 5.1 Matching is word-level, not character-level

Dimension B's headline claim — _"matching is character-level, not word-level"_ — is **wrong**, and a
port built on it will misbehave comprehensively. Three independent sources agree against it.

**(a) The vendor's own Language Manual**, `[man:Operators]`, which no census agent consulted. Its
systematic summary table:

| user input                  | pattern       | match? |
| --------------------------- | ------------- | ------ |
| `Are you a robot`           | `robot`       | Yes    |
| `Are you a robot?`          | `robot`       | Yes    |
| `You are a Robot.`          | `robot`       | Yes    |
| `Have you seen any robots?` | `robot`       | **No** |
| `Have you seen any robots?` | `robot#`      | Yes    |
| `Chat Site`                 | `chat# site#` | Yes    |
| `Chatter Sites`             | `chat# site#` | Yes    |
| `Chat World Site`           | `chat# site#` | **No** |
| `Chat World Sites`          | `chat#*site#` | Yes    |

and in prose: _"Each word in the input pattern must match a user's input exactly, therefore,
'virtualrobotic' and 'virtuallyrobot' do not match [`virtual*robot`]."_

**(b) The patents.** The matcher is an NFA _"where each node represents a pattern and each arc
represents an element for pattern matching, for instance a word, space, punctuation mark, wildcard
character"_ `[6604090:3990]`, and `*` _"can match zero or more words"_ `[6604090:3228]`.

**(c) The archive itself**, decisively, in three ways.

1. **Redundant list entries only make sense word-level.**
   `PatternList AILIFE is "ALIFE","android","Artificial intelligence","bot","computer","computer program","droid","machine","robot";`
   (`Patterns.n:10-11`). Under a character-level reading `"bot"` already subsumes `"robot"` and
   `"computer"` subsumes `"computer program"`; listing them separately would be pointless. Under a
   word-level reading both are necessary.
2. **The `#` idiom only makes sense word-level.**
   `PatternList BOTS is "BOT","BOT's","Program","Programs","machine#","computer#";`
   (`Patterns.n:98`). Character-level, `"machine"` already matches "machines" and `"BOT"` already
   matches "BOT's"; the `#`s and the extra entries are dead weight. Word-level, every one is needed.
3. **Character-level makes the bot fire on nonsense.** Measured over the 479 non-empty `Example`
   strings of the build, used as a sample of real inputs:

   | pattern (a real list element) | word-level hits | char-level hits | char-level false friends                         |
   | ----------------------------- | --------------: | --------------: | ------------------------------------------------ |
   | `"us"` (`StdP.I`)             |               0 |          **36** | "User Survey", "I want the user survey."         |
   | `"no"` (`NT`)                 |              15 |          **57** | "I'm not telling.", "…whether or not I'm human?" |
   | `"bot"` (`AILIFE`)            |               3 |           **5** | "Are you a robot", "What are bots?"              |
   | `"I"` (`STDP.I`)              |             222 |         **355** | "Its short for Fido", "my real name is Zorro"    |
   | `"ate"` (`ategag`)            |               0 |           **4** | "I hate rabbits.", "I celebrate holidays"        |

   `notheard NT` guards appear all over the bot; under a character-level reading they are false for
   almost any input containing "know", "now", "another" or "cannot", and the bot collapses.

The one dissenting source is the vendor **tutorial**'s hands-on exercise `[tut:2661-2679]`, which
predicts that `who*kronos` activates on `whois kronos` and `whoaskflkronos`. It is a tutorial
prediction, contradicted by the Language Manual's own table and by the archive. **Follow word-level.**
See `OPEN-QUESTIONS.md` §1.

Consequences: `Contains "what"` does **not** match "somewhat" (dimension B says it does), and the
archive patterns `"fantas*"`, `"mast*rbat#"` and `"search*for"` are **dead** — they never fire. Each
has a working sibling in the same list (`"masterbat#"`, `"search*for"` alongside `"find"`), so nothing
is lost. Reproduce the deadness.

### 5.2 The operator table

Verbatim from `[man:Operators]`, corroborated by `[tut:2720-2731]`:

| op   | meaning                                                                             | build |  ALL |
| ---- | ----------------------------------------------------------------------------------- | ----: | ---: |
| `*`  | zero or more **words or punctuation marks**                                         |   980 | 3429 |
| `#`  | any one character, multiple characters, **or no character** — never crosses a space |   731 | 2963 |
| `,`  | zero or more spaces **and/or** punctuation marks                                    |   158 |  671 |
| `.`  | one or more spaces **and/or** punctuation marks                                     |    78 |  260 |
| `^`  | exactly one character that is not a space                                           |    15 |   82 |
| `%`  | exactly one digit (0–9)                                                             |     3 |   31 |
| ` `  | one or more spaces in the user's input                                              |     — |    — |
| `'`  | an **optional** apostrophe                                                          |     — |    — |
| `\X` | literal `X` (any operator); before a letter, case-sensitive match on that letter    |     — |    — |
| `$`  | **does not exist in 2.2**                                                           |     0 |    0 |
| `&`  | not a wildcard in 2.2 (`^` fills the 1998 BNF's `&` slot)                           |     0 |    0 |

Notes that matter:

- **`,` and `.` are wildcards and are absent from every patent BNF.** Reading `,` as a literal comma
  makes nonsense of `PatternList NT is …"aren,t","doesn,t","can,t"`, `PatternList OKAY is "O,K"`,
  `"Belly,button"`, `"Mr,"`, `"#,one"…"#,nine"`, `"ass,hole#"`, `"good,night"`, and the whole
  `,#, ,#, *@*` email-stripping idiom. The manual's own example: `"f,u,d,g,e"` matches "fudge",
  "f u d g e" and "f.u.d.g.e".
  (Dimension F §3.1 calls `,` an unsettled hypothesis meaning "zero or one intra-word separator";
  the manual settles it as **zero or more spaces and/or punctuation**.)
- **`#` matches the empty string.** `[man:Operators]`: _"any one character, multiple characters, or no
  character."_ Archive proof: `BOTS` must match bare _machine_ and `APOLOGY` bare _forgive_, and the
  debug toggle `If ?Debugging matches "#P#"` must work when `?Debugging` is exactly `"P"`.
  (Dimension F §15.6 hypothesises one-or-more; it is zero-or-more.)
- **`#` never crosses a space.** `Matches "#"` is the archive's test for "a single word"
  (`WebNameGreet.n:547`). `"##"` matches one word, not two `[man:Operators]`. `"# #"` is exactly two
  words.
- **`#` does not match an apostrophe** — which is why the possessive pattern is written `"#\'s"`
  rather than relying on `#`. Implement `#` as `[A-Za-z0-9]*` (zero or more alphanumerics): this
  satisfies `"#-#"` for "anne-marie", `"#\'s"` for possessives, `",#,"` for the email stripper,
  `"robot#"` for "robots?", and the vendor's own note _"(# doesn't match apostrophes)"_ `[tut:6002]`.
- **An unescaped `.` in what looks like prose is a wildcard.** `"A.I."` requires punctuation or a
  space between the letters, so plain `ai` does **not** match it, while `a i` and `a-i-` do. Same for
  `"Mr. Mind"`, `"St. Patricks Day"`, `"h.a.r.l.i.e."`. Keep the wildcard reading — it is a real
  behavioural quirk, not a bug.
- **Escaped separators do not suppress the implicit space** (§5.4). Check the backslash before
  classifying an edge character.
- **`"mc^2"`** (`AboutUser/UserMind.n:146`) is the only place a caret is almost certainly meant
  literally. Under the wildcard reading it still matches the literal input. Do not special-case.
- The `\A` case-sensitivity escape is documented and used **zero times**; no escape before an
  alphabetic character occurs anywhere in the archive.

### 5.3 Alternation, optionality, memory references

- **`A, B, C`** → the union of the rendered sets. Applies identically to a `PatternList` body, an
  inline `( … )`, and the right-hand side of a match operator. A match succeeds if **any** rendered
  string matches.
- **`""`** is a legal element (30 in the build, 151 archive-wide) and is the canonical way to make an
  element optional. It is not redundant with `#`: see §5.4.
- **`{X}`** renders as `render(X) ∪ {""}`. **For matching, `{X}` and `(X,"")` are identical**; they
  differ only in specificity accounting (§8.5). 3 uses in the build. Two of the three wrap a whole
  condition (`and heard {MRMIND}`), i.e. an _optional condition_ that never prevents the block from
  firing and only raises its score when true.
- **`?Attr` inside a pattern** splices the attribute's current string value in **as literal text, not
  as a pattern** (22 uses; otherwise a user named `*` would match everything). Evaluated at match time.
- **A `PatternList` may reference another** by name, case-insensitively, over the whole program:
  `PatternList CLOTHES is …, ACCESSORYCLOTHING;`. Resolution is global, not per file.
- **`Pattern X is S;`** ≡ a one-element `PatternList` (3 uses, all in `DebugCustomize.n`).

### 5.4 Concatenation `+` and the implicit space — normative

The rendered set of `A + B` is `{ join(a,b) : a ∈ render(A), b ∈ render(B) }`.

```
joinPieces(pieces):                     # rendered strings, in order
    ps = pieces with every "" removed   # empty strings contribute nothing at all
    if ps is empty: return ""
    out = ps[0]
    for p in ps[1:]:
        if not endsWithSeparator(out) and not startsWithSeparator(p):
            out += " "                  # the implicit space
        out += p
    return out

endsWithSeparator(s):   s ≠ "" and s[-1] ∈ { " ", "*", ",", "." } and not backslash-escaped
startsWithSeparator(s): s ≠ "" and s[0]  ∈ { " ", "*", ",", "." } and not backslash-escaped
```

Then collapse runs of two or more literal spaces to one. `#`, `^` and `%` are **not** separators —
they take an implicit space on both sides.

Evidence, all from the shipped build:

- **The space exists.** `?FactStatement contains YOU + "have to" + "trust me"` (`Issues/TrustTruth.n:108`)
  must match _you have to trust me_. Also `"I have" + "a" + SOUL` (`Issues/Consciousness.n:183`),
  `("Opposable" + "thumb#")` (`AboutUser/UserPhysical.n:206`).
- **`*` suppresses it.** `heard "are"+YOU+"*"+OKAY` (`AboutMrMind/WhatIsMM.n:68`) with
  `PatternList OKAY is "O,K",…` renders `are you*O,K` and must match _Are you OK?_.
- **`#` does _not_ suppress it.** `"how"+("do","does",…)+"#"+"do that"` (`Base/Patterns.n:295`) must
  render `how do # do that`; `("human#" + "have *")` (`Issues/Consciousness.n:184`) renders
  `human# have *`.
- **`,` suppresses it.** `StdP.COOL+", "` (`QRD:516`) must match _cool, tell me…_; `"#,"+HELLOQUESTION`
  (`WebNameGreet.n:927`) must match _hi,hello_.
- **`""` is transparent.** `("","#","# #")` means "zero, one or two intervening words" — the `""`
  branch is needed **because of the implicit space**, not because `#` cannot match empty:
  `"give"+""+"information"` renders `give information`, `"give"+"#"+"information"` renders
  `give # information`.

**The implicit space applies only in match context.** The same `+` in `Say` / `SayOneOf` / `Remember`
/ `SayToFile` is plain string concatenation with no separator; authors write their own spaces
(`?Name + ?IPaddress+ " says: " + ?UserJoke`). Neither the patents nor any census file except B makes
this distinction explicitly — it is essential.

**A `PatternList` may be an output list, not a matching pattern.** `ProfanityCustomize.n` and
`GoodbyeCustomize.n` define lists of whole sentences used only as `SayOneOf` arguments. Do not apply
the implicit-space rule when a list is used as output.

### 5.5 The compiler — normative algorithm

```
PUNCT  = "!-/:-@\\[-`{-~"                          # ASCII: every printable non-alphanumeric non-space
EDGE   = "(?:^|$|(?<=[\\s" + PUNCT + "])|(?=[\\s" + PUNCT + "]))"   # zero-width token edge

compile(P):                                        # P is one rendered pattern string, escapes intact
  out = []; n = {'*':0,'#':0,'^':0,'%':0}; slots = []
  i = 0
  while i < P.length:
    c = P[i]
    if c == "\\" and i+1 < P.length:
        out.push(escapeRegex(P[i+1])); i += 2; continue
    switch c:
      case "*": n['*']++; slots.push(['*',n['*']])
                out.push("(?:" + EDGE + "([\\s\\S]*)" + EDGE + "|())")
      case "#": n['#']++; slots.push(['#',n['#']]); out.push("([A-Za-z0-9]*)")
      case "^": n['^']++; slots.push(['^',n['^']]); out.push("([^\\s])")
      case "%": n['%']++; slots.push(['%',n['%']]); out.push("([0-9])")
      case ",":  out.push("[\\s" + PUNCT + "]*")
      case ".":  out.push("[\\s" + PUNCT + "]+")
      case " ":  while P[i+1] == " ": i++            # collapse runs
                 out.push("\\s+")
      case "'":  out.push("'?")                      # apostrophes optional
      default:   out.push(escapeRegex(c))
    i++
  return out.join(""), slots
```

The `*` production is the whole trick and must be copied exactly: **`*` matching a non-empty span
requires a token edge on both sides; `*` matching nothing requires no edge at all.** That is what
makes `virtual*robot` match "virtual/robot" and "virtualrobot" but not "virtualrobotic" or
"virtuallyrobot", and what makes `who*kronos` match "who is kronos" but not "whoiskronos".

### 5.6 Applying an operator

```
matchOne(value, renderedPattern, op):
  rx, slots = compile(renderedPattern)
  if op ∈ {Matches, DoesNotMatch}:
      full = "^\\s*(" + rx + ")\\s*$"
  if op ∈ {Contains, DoesNotContain, Heard, NotHeard}:
      full = EDGE + "(" + rx + ")" + EDGE                 # searched, not anchored
  m = exec(new RegExp(full, "i"), value)
  if m == null: return FAIL
  starBuffer['*match'] = m[1]                             # the outer group: the matched substring
  for k, slot in slots:  starBuffer[slot.class][slot.index] = m[k+2]
  return SUCCESS
```

- **`Matches` anchors the whole value**, ignoring leading and trailing whitespace.
  **`Contains P` ≡ `Matches "*" + P + "*"`** semantically, but the two wrapper stars are **not
  numbered** into the star buffer. Proof: `Contains "*@*"` then `Remember ?PossibleEmail is *1+"@"+*2`
  (`Base/Utilities/EmailCapture.n:152-155`) — if the wrappers were numbered the author's stars would
  be `*2` and `*3`.
- **`ExactlyMatches` bypasses everything**: `value.trim().toLowerCase() === pattern.toLowerCase()`, no
  wildcards, no normalisation. `[man:Operators]`: _"You cannot use pattern-matching operators in an
  ExactlyMatches condition… the pattern-matching operators are treated as literal characters."_ One
  use in the build, with the author's own note:
  `If ?WhatUserSaid ExactlyMatches GRINNIES // we have to use exactlymatches here -- otherwise punctuation is stripped.`
  (`Reactions/Compliments.n:51-52`, `GRINNIES` is the emoticon list).
- **Negated operators (`DoesNotMatch`, `DoesNotContain`, `notheard`) must not write the star buffer.**
- **Case-insensitive throughout**, both keywords and pattern text.
- **The matcher does not normalise the input.** No punctuation stripping happens in the matcher; the
  script pipeline (§4.1) strips only quotes, parens and asterisks, and only from `?WhatUserMeant`.
  `FindOtherQuestion`'s `contains "*#\?*"` and `Matches "*\,*"` both require punctuation to survive.
  The Compliments comment is the one unexplained counter-statement — see `OPEN-QUESTIONS.md` §3.

Whole-expression application:

```
test(value, expr, op):
  for rendered in render(expr):     # lazily; the largest cross product in the build is 8192
    if matchOne(value, rendered, op) == SUCCESS: return true
  return false
```

Cross-product sizes over the build: 596 expressions render to 1 string, 689 to 2–10, 394 to 11–100,
100 to 101–1000, 14 to >1000; the largest is 8192
(`Humans&Machines/Convincing.n:126  ?CanQuestion Contains STDP.I+CONVINCE+YOU+STDP.I+STDP.BE+"human"`).
Compile once at load and cache. An alternation-based compile is strictly better and gives identical
results **provided** the implicit-space rule is applied per combination — because `""` is a member of
many lists, the space cannot be hoisted out of the alternation: `X + ("","the") + "#"` must compile to
`(?:X\s+|X\s+the\s+)#`, never `X\s+(?:|the)\s+#`.

### 5.7 Star buffers

Each wildcard class has **its own counter**, assigned left to right over the rendered pattern: `*1`
is the first `*`, `#1` the first `#`, `^1` the first `^`, independently. `Matches "#? *"` then
`*1 contains #1` (`StdQuestion.us.n:814`) works because the single `#` is `#1` and the single `*` is
`*1`. `Matches "*#*"` gives `#1` and `*1`,`*2`.

Highest indices in the whole archive: `*5`, `#3`, `^2`. `%n` never occurs. Support `*1..*9`,
`#1..#9`, `^1..^9`, `%1..%9`.

`[man:Operators]` on `^` and `%`: _"The matching buffers that represent values matched by the caret
and the percent sign… match a group of consecutive instances of the matched value."_ So a run of
adjacent `%` or `^` fills **one** buffer slot: `Contains "(%%%) %%%-%%%%"` gives `%1`=area code,
`%2` and `%3` the two halves of the number. Implement adjacent `^`/`%` as a single capture group.
(The archive's uses — `"^\.^\."`, `"%%%"` — are consistent with this and the archive alone cannot
distinguish it; the manual settles it.)

**`*match`** is the substring consumed by the pattern proper of the **most recent successful match
test** — for a `Contains`, the middle group only, not the whole input. Proof:

```
Mrmind3/Humans&Machines/Bots.n:44-53
Topic "Do you know <fictional bot>" is
Subjects "Fictional Bots";
	If (heard "do you know" and
		(Heard FICTIONALBOTS or (Focused and heard "him","her","it","them")))
		or (?FactQuestion contains "you *"
			and heard FICTIONALBOTS)
	Then
		Example "Do you know HAL?";
		SayOneOf *match + " is a fictional Bot.  <BR>I am a real Bot.";
		Done
EndTopic
```

The intended output is "HAL is a fictional Bot.", so `*match` is what `Heard FICTIONALBOTS` matched,
not what `heard "do you know"` matched and not the whole utterance. Second proof:
`AboutMrMind/MMphysical.n:1-8`, `If Heard YOU, YOUR and heard BODYPARTWORD` → `"…I have no "+*match+"."`
→ "…I have no feet."

**Lifetime.** The star buffer is global to the run, not scoped to a condition. Conditions are
evaluated left to right; each **successful** match test overwrites the buffer, and a failed test
leaves the previous contents — which is what makes the
`If ?X matches "…" then Remember ?X is *1; Continue` rewrite chains work
(`EmailCapture.n:170-183`, `ategag.n:22-42`). Values visible in a `Then` block therefore come from
the **last successful match test in the condition**.

**Greediness is a port decision, not an archive fact.** Nothing in the archive, the manual, the
tutorial or the patents specifies which of several possible matches fills the buffer. Fix **greedy,
leftmost-first** (JavaScript `RegExp` semantics). Weak supporting evidence: `StdQuestion.us.n:675-678`
does `matches "#"+"*"` then tests `#1 matches "been"`, which only works if `#` is greedy.

**Multi-valued attributes.** `Matches`/`Contains` against an attribute holding several values succeed
if **any** value matches. Not exercised by the archive; adopted.

### 5.8 `and` / `or` / `not` inside a pattern-position expression

A match operator may be followed by several patterns joined by `and`/`or`/`not`. Each operand is a
**separate independent test with the same LHS and the same operator**, combined with Boolean logic.
This is not concatenation and not alternation. `[man:Operators]`: _"To match a phrase that contains
two or more words in any order, use the keyword `and` between each word."_

```
Mrmind3/Utilities/CProfanity.n:79  If (?WhatUserSaid Contains DirtyBodyPartPhrases AND DirtyActionPhrases AND NOT PseudoBadWords)
Mrmind3/Humans&Machines/Machines.n:112  If ((?IsStatement Contains I and "not" and BOTS) and notheard ("human", "program"))
```

`and not X` is legal only inside a **positive** matching list, never after
`DoesNotContain`/`DoesNotMatch`/`DontRecall`. 5 uses in the build.
`DoesNotContain A, B` means "contains **neither**" — the negation applies to the whole list's truth
value.

---

## 6. Condition evaluation — normative

Detail: `C-conditions.md`.

### 6.1 The clause forms and their semantics

| clause                              | truth                                                                              | build |
| ----------------------------------- | ---------------------------------------------------------------------------------- | ----: |
| `Always`                            | true                                                                               |   123 |
| `<pat> Contains <list>`             | some rendered string of the list is contained in the LHS value                     |   798 |
| `<pat> Matches <list>`              | some rendered string matches the whole LHS value                                   |   570 |
| `<pat> ExactlyMatches <list>`       | trimmed case-insensitive string equality, no wildcards                             |     1 |
| `<pat> DoesNotContain/DoesNotMatch` | **no** rendered string matches                                                     | 37/11 |
| `Heard <list>`                      | ≡ `?WhatUserMeant Contains <list>`                                                 |   183 |
| `NotHeard <list>`                   | ≡ `?WhatUserMeant DoesNotContain <list>`                                           |    84 |
| `IfHeard <list>`                    | the single-condition spelling of `Heard`; usable as a head                         |    40 |
| `Recall <memlist>` / `IfRecall`     | the list's and/or structure over "this key has a value"                            |   168 |
| `DontRecall` / `IfDontRecall`       | negation of the above                                                              | 59/11 |
| `Focused` / `IfFocused`             | `\|subjects(C) ∩ user.ActiveSubjects\| ≥ 1`; false if the category has no subjects |  96/4 |
| `Chance p` / `IfChance p`           | true with probability p, rolled each evaluation                                    |     — |
| `IfChance` (no argument)            | member of a random-choice group — §6.5                                             |    61 |
| `{ <clause> }`                      | **always true**; records its own truth only for specificity                        |     1 |

`IfFocused` is in no patent grammar and is an archive-only spelling (4 uses, all
`Issues/Life.n:151,152,166,167`). **Treat it as an exact synonym of `Focused`.**

`WhenFocused` is **not a condition** — it is a modifier on `Example`/`OtherExamples` statements
(46 uses). The condition evaluator must ignore it entirely.

**`Recall ?a, ?b` is OR; `Recall ?a and ?b` is AND.** The comma spelling dominates and is easy to
misread as a plain argument list.

**Edge case to preserve, not fix.** 9 clauses in the build pass a _memory reference_ as the pattern of
`Heard`/`NotHeard`. For attributes holding real strings this is meaningful; for boolean flags it is an
authoring bug, since `Remember ?YesResponse;` stores `"TRUE"`, so `IfHeard ?YesResponse` tests whether
the input contains the literal word "TRUE" (`Defaults/AskMe.n:62-63` and 8 others). Evaluate the
memref to its stored value and match that as a pattern.

### 6.2 Boolean composition

- Spellings: conjunction `and` / `&` (688 / **1**); disjunction `or` / `,` (519 / 2008).
- **`and` and `or` may not be mixed at one bracketing level** — zero violations in 4543 blocks.
  At each level the first operator seen fixes that level's operator.
- Evaluation may short-circuit; the difference is unobservable.
- `{ … }` never changes truth, only specificity.

### 6.3 Block terminators and value propagation

The value set is `NotActivated, Continue, Done, NextCategory, Switch, SwitchBack, Waiting, RunTimeError`.
Every terminator compiles to a command that does nothing but return its value; the runtime object
confirms the classes `CDone`, `CContinue`, `CNextCategory`, `CSwitchBack`, and notably **no
`CTryAgain`** (it is a `CWaitForResponse` variant) and **no `CDontFocus`** (it is a flag).

| terminator                   | value          | effect                                                                                                                                                                                                                      |
| ---------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Done`                       | `Done`         | Category stops. The whole run stops **unless** `SequenceContinuations` is non-empty, in which case the topmost suspended Sequence resumes. A `Done` that is not resuming an interruption also clears `SwitchContinuations`. |
| `Continue`                   | `Continue`     | Execution proceeds with the next item after this block, subject to the `Otherwise` and `IfChance` skip rules (§6.4, §6.5).                                                                                                  |
| `NextTopic` / `NextScenario` | `NextCategory` | The rest of the category — **including enclosing blocks** — is abandoned.                                                                                                                                                   |
| `TryAgain`                   | `Waiting`      | Re-arm the continuation at the statement _after_ the governing `WaitForResponse` and stop the run.                                                                                                                          |
| `SwitchBack`                 | `SwitchBack`   | Pop `SwitchContinuations` and resume immediately after the `SwitchTo`. Legal only inside a `Sequence` category (286/286 in the build).                                                                                      |

**A block whose condition is false returns `NotActivated`, not `Continue`.** The distinction is
load-bearing: `NotActivated` lets the following `Otherwise` block run; `Continue` suppresses it.

**Propagation.** When a nested block returns anything other than `Continue` or `NotActivated`, that
value is returned by the enclosing block immediately and the enclosing block's own terminator is never
reached. This is why a `Done` inside an `IfChance` block ends the whole category — and it is the
mechanism behind the Name Capture dead code (§9.4).

**`TryAgain` resolution** — resolve statically at load time. From the `TryAgain` token, scan backwards
through the statements of its own block (descending into earlier nested blocks, last one wins); if
none is found, move to the parent block and repeat, up to the category top. Bind to the position
immediately after the `WaitForResponse` found. `[spec §3]` calls a `TryAgain` without a
`WaitForResponse` in its own block an error, but **4 of the build's 9 do exactly that**
(`WebNameGreet.n:46, 48, 134, 771` — the `WaitForResponse` is at line 42 in the enclosing `Always`).
Every archive `TryAgain` resolves uniquely under this rule.

### 6.4 `Otherwise`

`Otherwise` is not a block opener and carries no condition. It prefixes the **next conditional block
in the same statement list**, marking it as the else-branch of the **immediately preceding sibling
block at the same nesting depth**. There is no `COtherwise` class; it is a flag on
`CConditionActionBlock`. 107 in the build (95 nested, 12 at category top level); every one has a
preceding sibling.

The archive settles the binding: in `Sequence Topic "Expand Contractions"` the
`Otherwise Always Remember ?StdP.DoneExpanding;` at `QRD:746` binds to the immediately preceding
`we'd` block opened at `QRD:729`, **not** to the outer contraction guard at `QRD:537`.

**The skip flag must persist across an entire else-if chain**:

```
skipOtherwise := false
on reaching a block marked Otherwise while skipOtherwise:  skip it entirely, leave the flag set
on a block whose condition is FALSE (NotActivated):        skipOtherwise := false
on a block that is TRUE and returns Continue:              skipOtherwise := true
on any non-block statement:                                skipOtherwise := false
```

`[spec §3]`'s wording is compatible with clearing the flag after one skip; `QRD:2291-2309` proves it
must not be. That topic is a three-branch chain; if the first branch fires and returns `Continue`, the
second **and** third must be skipped, or `?Debugging` is always overwritten by the final
`Otherwise Always` branch and the three-way choice is pointless. The five-branch chains in
`Activities/Expressions Filter.n:67-90` behave the same way.

`Otherwise` after a `Done` is common (32 in the build) and is unreachable within one turn — the `Done`
propagates out first. It **is** reachable when the head block's condition is false. Not an error.

### 6.5 `IfChance` groups

A **bare-`IfChance` group** is a maximal run of two or more sibling conditional blocks all headed by
argument-less `IfChance`. The build contains 61 bare `IfChance` blocks and **every one is in a group
of ≥ 2** — 18 groups, all nested inside an enclosing block.

**Rule A — probability. Exactly one member of the group fires, chosen uniformly.**

```
For a run of length N (fixed at load time):
  remaining := N ; chosen := false
  for i in 0 … N-1:
      if chosen:                          block i is false
      else if random() < 1/remaining:     block i is true; chosen := true
      else:                               block i is false; remaining -= 1
```

This gives every member marginal probability exactly 1/N and guarantees exactly one fires.

**This resolves an open question in `C-conditions.md` §15.1**, which offered "exactly one" and
"independent 1/N" as alternatives. The CDB settles it quantitatively. `Default Topic "Last Line Of
Defense"` is the terminal category of the build; its whole body is `Always` wrapping 8 bare `IfChance`
blocks each ending in `Done`, and it produced **1264 SAY rows** in the log. Under the independent
reading it would be silent on `1 − (7/8)^8 ≈ 34 %` of the times it is reached — that is
`1264 × 0.343/0.657 ≈ 660` silent turns from this topic alone. **The entire log contains only 413
user inputs that produced no output at all**, from all causes. The independent reading is refuted.

**Rule B — the skip.** `[spec §3]`: _"If a block returns Continue, the next block is activated unless
it is an Otherwise block or unless both the current and next blocks are IfChance blocks, in which case
it and all other IfChance blocks immediately following it are skipped."_

Rule B applies to **argument-bearing** `IfChance` too, which the patent permits but does not
emphasise. `AboutUser/UserFamily.n:36-65` requires it: a 20 % block that always says something and
returns `Continue`, followed by 35 % and 45 % blocks — without Rule B the bot emits two family lines
in one turn.

```
skipChance := false
if the current item is an IfChance block and skipChance:      skip it entirely
if an IfChance block is activated, returns Continue, and the
   next item is also an IfChance block:                       skipChance := true
on reaching any item that is not an IfChance block:           skipChance := false
```

For a bare group under Rule A, Rule B is a no-op, but it is still needed for argument-bearing runs.

**At selection time, `IfChance` is treated as always true with specificity 0** and rolled only during
execution (§8.4).

### 6.6 The evaluator

```
evalCondition(node, state) -> boolean
  ALWAYS               -> true
  BOOL(and, kids)      -> every kid true            (may short-circuit)
  BOOL(or,  kids)      -> some  kid true
  GROUP("(", kid)      -> evalCondition(kid)
  GROUP("{", kid)      -> true       // record the kid's truth for specificity only
  MATCH(lhs,op,neg,rhs):
      v    = valueOf(lhs)            // attribute value(s), literal, star buffer, or concatenation
      hit  = test(v, rhs, op)        // §5.6
      -> neg ? !hit : hit
  RECALL(neg, memlist) -> honour the list's and/or/comma structure over "key has a value"
  FOCUSED              -> |subjects(currentCategory) ∩ state.ActiveSubjects| > 0
  CHANCE(p)            -> rng() < normalise(p)      // "33%" -> 0.33 ; 0.90 -> 0.90
  CHANCE(none)         -> handled by the group rule of §6.5, never independently
```

**Conditions whose LHS is a star buffer** (`#1 DoesNotMatch OPTARTICLE`) are _run-time conditions_:
they depend on a sibling test's result, so they are evaluated only when the enclosing block is
otherwise active, strictly after the tests that fill the buffer, in source order. They do not
participate in activation scanning (§8.4).

---

## 7. Command semantics — normative

Detail: `D-commands.md`.

### 7.1 The argument model

**Every command argument is a pattern list and evaluates to an ordered list of strings.**

```
eval(string s)   = [ unescape(s) ]
eval(?A)         = memory[A]                                   // [] if unset
eval(*n)         = [ starBuffer[n] ]                           // "" if unbound
eval(NAME)       = the members of PatternList NAME, in declaration order
eval(a "," b)    = eval(a) ++ eval(b)                          // list union
eval(a "+" b)    = [ x + y for x in eval(a) for y in eval(b) ] // cross product, NO separator
```

An unset attribute contributes the empty string, not its name and not `"TRUE"`.

The archive states the rule and its consequence in prose, at
`Library/Utilities/components/CMailUtil.n:43-56`:

```
// Administrator's note:  If your vRep is executing multiple "say" commands, or a "Say" command
// on  multiple strings, then ?WhatRobotSaid is actually a set of several strings.
// If you were to remember ?mail.body is ?mail.body+?WhatRobotSaid, therefore,
// ?mail.body would become multiple strings as well -- and if it were already
// multiple strings, it would then have one value for every possible combination.
```

Cross-product enumeration order (row-major vs column-major) does not affect the build; adopt
right-most-index-varies-fastest.

### 7.2 `Say` and `SayOneOf`

```
Say <patlist>;       → append EVERY string in eval(patlist) to the output buffer, in order,
                       each as its own utterance
SayOneOf <patlist>;  → append exactly ONE, chosen uniformly at random
```

Both set the category's `ProducedOutput` flag (which triggers auto-focus unless `DontFocus` ran in the
same run), and both contribute to `?WhatRobotSaid` and `?EverythingRobotJustSaid`.

**Comma versus `+` — the decisive evidence.** Source `Mrmind3old/Humans&Machines/Machines.n:129`:

```
		Say "I don't think.  I cause you to think.","That's what you think, let's have a thinking contest.";
```

CDB lines 14456-14457, **one user turn**:

```
U: you can't think
M: I don't think.  I cause you to think.    [You (MrMind, Machines) can't think. | Humans&Machines\Machines.n:124]
M: That's what you think, let's have a thinking contest.    [… | Machines.n:124]
```

Two comma-separated strings → **two separate utterances**, each logged against the same source line.
Contrast `Say ?WhatUserSaid + " who?";` (`Issues/Humor.n:50`) → CDB `M: peggy who?` — one utterance,
no separator inserted. `[man:BestFit]`'s own example topic does the same with six `Say` arguments
rendering as six `vRep said:` lines.

Multi-argument `Say` is rare: 11 in the whole archive, 4 in the build.

**`SayOneOf` chooses over the evaluated list, i.e. over the cross product.**
`SayOneOf STDW_WebGreetingFirstHalf +MYNAME+ STDW_WebGreetingSecondHalf;` (`WebNameGreet.n:886`) is
**one** argument that evaluates to 2 × 3 × 1 = **six** strings.

**`SayOneOf` is memoryless — uniform, independent, per execution.** `G-corpus-and-voice.md` §3.1
proposes non-repetition cycling on the strength of a source comment
(`Defaults/Defaults.n:138-139`, signed `-JB 8/1/99`: _"a 'SayOneOf'… has protection against repetition
while [IfChance] does not"_). **The shipped conversation database refutes it.** Over all 129
`(connection, topic, source-line)` groups with ≥ 8 fires and ≥ 2 distinct outputs:

| model                                       | predicted adjacent repeats |
| ------------------------------------------- | -------------------------: |
| **observed**                                |            **1046 / 2531** |
| memoryless draw with the observed marginals |                     1071.8 |
| no-repeat-until-exhausted cycling           |                      230.4 |
| never immediately repeat                    |                          0 |

The observed rate is within 2.4 % of the memoryless prediction and nowhere near either
anti-repetition model. Implement uniform random per execution, seedable. (The marginals themselves are
skewed — e.g. 65/14/13/12 over four greeting variants — but that is fully explained by nine months of
script edits changing the alternative sets mid-log, and it is _memorylessness_, not uniformity, that
the data tests.)

**Output buffering.** All utterances produced during one run are delivered together at the end of the
run, in execution order. `?WhatRobotSaid` afterwards is the **list**; a `Matches` against it succeeds
if any element matches — which is how the build implements follow-up topics
(`Defaults/Answers.n:538` matches a whole `Say` argument, `<BR>`s included, so `?WhatRobotSaid` holds
the **pre-HTML** text). `?EverythingRobotJustSaid` is a single concatenated string.

**`<BR>` is not engine syntax.** It is literal HTML in the output string, emitted verbatim; the web
template renders it. 1214 occurrences in the build. Do not interpret it, do not replace it with a
space. The historical log stripped tags **with no substitution** (the CDB literally contains
`possible thatmachines` from `"…possible that<BR>machines…"`). Render as `<br>` in HTML or `\n` in
text; strip with no substitute only if reproducing the historical log.

**One output string in the build is empty and it is deliberate**: `Topic "Shut up"`
(`Reactions/Annoyance.n:34-43`) ends `Say "";`. Told to shut up, MrMind shuts up. Emit a turn with an
empty reply body; do **not** fall through to a default.

### 7.3 `SayToConsole` and `Trace`

Both are side channels that **never reach the user** — the CDB has 11,109 `SAY_TO_CONSOLE` rows and
zero of them among the 7,312 `SAY` rows. Implement as a debug log array. `SayToConsole` is gated by
the `?Debugging` letter flags (`P` preprocessor, `Q` questions, `R` responses, `S` statements,
`W` said-history, `Y` previous statements, `Z` previous questions); for a live web user
`?Debugging = ""` so none of the dump topics produce anything. `Trace` is the same but only in
debugging modes. Neither sets the auto-focus flag.

### 7.4 `SayToFile`

```
SayToFile <pathPatList> <contentPatList> ;      // NO separator between the two arguments
```

Append one line per element of the content list, CRLF-terminated, to the named file in append mode.
No user-visible output; does not set the auto-focus flag. 73 uses; every one has the shape
`?Name + ?IPaddress + " says: " + ?<UserAnswer>` and writes to
`C:\Program Files\NativeMinds\TextFiles\<Topic>.txt`. Two paths deviate (`Reactions/Asides.n:174` uses
a different absolute root; `Defaults/AskMe.n:49` uses a bare relative filename). Note `?IPaddress` vs
`?Ipaddress` — case-insensitive attribute lookup or those two files silently get an empty IP.

**Implement as a no-op by default, behind an explicit opt-in.** Nothing user-visible depends on it:
no topic ever reads a `SayToFile` target back. See §0.1(5).

### 7.5 Memory

- `Remember ?X;` — assign the single value `"TRUE"`. 47 uses in the build.
- `Remember ?X is <patlist>;` — assign the **whole evaluated list**, replacing any prior value. 516.
- `Remember ?X is Compute F of <patlist>;` — 8 uses. **Inside `Compute`, a comma separates the
  function's arguments**, not a list union: `Compute Sum of ?ProfanityStrikes, "1"`.
- `Remember ?X IsOneOf <patlist>;` — collapse to one randomly chosen element. **0 uses in the build.**
- `Forget ?a, ?b;` — un-assign. `Recall` then returns false until the next `Remember`.
- Assignment is not atomic across a statement: successive `Remember`s to the same slot see the
  previous result (`WebNameGreet.n:678-679`).

**The `Compute` functions the build actually uses** (four names, 8 call sites):

| function     | semantics                                                               |
| ------------ | ----------------------------------------------------------------------- |
| `LowerCase`  | whole-string lower-casing                                               |
| `UpperCase`  | whole-string upper-casing                                               |
| `Capitalize` | capitalise the first letter of each word, lower-casing the rest         |
| `Sum`        | integer addition over decimal-string arguments, result a decimal string |
| `SpellCheck` | §4.3 — make it the identity                                             |

`Difference`, `Product`, `Ratio`, `URLEncoding` exist in the archive but not in the build.
`ReplacePronouns`, `ListItem`, `ListSize`, `ListTail`, `Comparison` occur **nowhere**.
`Capitalize` is per-word or first-letter-only — indistinguishable from the build, because
`WebNameGreet.n` always runs `Lowercase` first; per-word is implied by the name and by
`compute capitalize of #1` on a surname fragment.

### 7.6 Attention and suppression

| command                                 | build | effect                                                                                                                                                                       |
| --------------------------------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Focus "<category>", …;`                |     7 | append the named categories to `FocusList`. All 7 uses are single-argument; multi-argument never occurs, so the ordering question is moot.                                   |
| `Focus Subjects "<subject>", …;`        |    62 | append every category in `subjectMap[lower(arg)]` (manifest order) to `FocusList`, **and** add the literal argument to `FocusSubjectsSeen`.                                  |
| `DontFocus;`                            |    58 | set the per-run `DontFocus` latch for the enclosing category.                                                                                                                |
| `Suppress This;` / `Suppress "<name>";` |  36/1 | add the category to `user.SuppressList`. **Per user, persists for the whole conversation.** A suppressed category is never executed, _even if an explicit `Focus` names it_. |
| `Recover "<name>";`                     |     0 | undo suppression. Implement for completeness; it never fires in MrMind3.                                                                                                     |

**`Focus Subjects` naming a subject no category declares is a no-op for the focus list but still
resets `ActiveSubjects`.** 24 of the 62 do this — `"Paul Valery"`, `"M TESTE"` (a _category_ name, not
a subject), `"WantSomePointers?"` (the declared subject has no `?`). Reproduce every miss; do not
"helpfully" fall back to a category lookup.

**`DontFocus` is a per-run latch, not a positional command.** It occurs both before the `Say`
(`Issues/Emotion.n:24-27`) and after it (`Reactions/Questions.n:66`); a naive "clear the flag now"
implementation breaks the first form. The serialised runtime contains no `CDontFocus` class — it
compiles to a flag.

```
categoryRunState = { Executed:false, ProducedOutput:false, DontFocus:false }
on DontFocus                                          -> DontFocus = true
on any Say / SayOneOf (Standard category only)        -> ProducedOutput = true
at end of Category.run()                              -> if (Standard && ProducedOutput && !DontFocus)
                                                            autoFocus(category)
```

`SayToConsole`, `Trace` and `SayToFile` do **not** set `ProducedOutput` (the patent phrase "all
variants of Say" literally includes them; the intent, "any output command", clearly means
user-visible output). The build cannot distinguish the readings — every `SayToFile` topic also
contains a real `Say` — so this is safe either way.

### 7.7 Control transfer

- **`SwitchTo "<name>";`** — resolve case-insensitively; **cycle guard**: if the target has already
  executed this run **and is not a Sequence category**, return `RunTimeError`, which ends the run and
  clears both continuation stacks. Otherwise push a return continuation (the statement immediately
  after this `SwitchTo`, in this category, at this nesting) onto `SwitchContinuations`, set
  `SwitchToCategory`, and return `Switch`. All 134 uses take a quoted string and all resolve.
  The Sequence exemption is essential: `QRD:154-163` switches to the same Sequence topic five times in
  one run, and `20 questions` enters `GetYN` 21 times in one game.
- **`WaitForResponse;`** — store a continuation pointing at the following statement into
  `user.Continuation` and return `Waiting`. The run ends immediately: no Standard selection continues,
  no Defaults run. 89 uses — **40 in Standard categories, 49 in Sequence**; it is not confined to
  Sequence topics.
- **`InterruptSequence;`** — legal only inside a Sequence category and only after a
  `WaitForResponse`. Push a continuation onto `SequenceContinuations` and return `NextCategory`, so
  the Standard and Default categories run and the sequence is resumed later by a `Done` (§8.3).
  3 uses, all in `Name Capture`, all dead code (§9.4). The author's own note at `WebNameGreet.n:147`
  records that it did not behave as expected on NeuroServer 2.1/2.2.
- **`DisconnectThisUser;`** — flush the buffer (the goodbye line is said on the preceding line), then
  reset the user record and end the session. 1 use, in the profanity strike counter.

### 7.8 `Example`, `OtherExamples`, `InitialExample`

No runtime effect on a conversation, but they must parse, they feed the offline verifier, and — this
is the part that matters at runtime — **the words in every `Example` and `OtherExamples` string are
the frequency corpus for specificity** (§8.5).

- `Example "…";` — 545 in the build; all single-argument. **66 of them are `Example "";`** — blocks
  reachable only after a `WaitForResponse` have no standalone trigger input. A verifier must skip
  empty examples, not run them as empty input.
- `WhenFocused Example "…";` — 14 uses; verified from the state saved after the topic's plain example.
- `When ?X is "…" Example "…";` — one use in the build (`Utilities/CProfanity.n:128-129`).
- `OtherExamples of "<example text>" [WhenFocused] are <patlist>;` — 182. Binds by case-insensitive
  string equality on the example text.
- `InitialExample <n> "<string>";` — 2 uses, both in `WebNameGreet.n`; they bootstrap the verifier's
  user state (greeting, then name capture). Indexes must be unique.

---

## 8. The run loop and best-fit selection — normative

This is the algorithm. The step numbering is the contract. Detail and worked transcripts:
`E-topics-focus-and-selection.md` §11–§12.

### 8.1 One run

```
run(input, executionType /* Statement | Action */):

 1. For every category:  Executed = ProducedOutput = DontFocus = false
    FocusList = []; FocusSubjectsSeen = ∅; outputBuffer = []
    SwitchToCategory = null; runtime.Continuation = null
    ActivePriority = 'Priority'; ActiveCatPos = 0
    Set ?WhatUserSaid (Statement) or ?WhatUserDid (Action); roll ?WhatUserSaidBefore forward

 2. ReturnVal = NextCategory
    ActiveCategory = getNextCategory(ReturnVal)
    while ActiveCategory != null:
        ActiveCategory.Executed = true
        ReturnVal = ActiveCategory.run()
        ActiveCategory = getNextCategory(ReturnVal)

 3. flush outputBuffer to the user; set ?WhatRobotSaid, ?EverythingRobotJustSaid
 4. Refocus()                       // §8.6
 5. Update ActiveSubjects           // §8.7
 6. user.LastTopic = name of the last category that produced output
```

### 8.2 `Category.run()`

```
Category.run():
    i = (runtime.Continuation targets this category) ? continuation.blockIndex : 0
    while i < blocks.length:
        r = blocks[i].run()                     // resuming mid-block if a continuation says so
        if r ∈ {NextCategory, Switch, SwitchBack, Waiting, Done, RunTimeError}: goto finish
        if r == NotActivated: i++; continue
        if r == Continue:     i = nextBlockAfterContinue(i); continue   // §6.4 and §6.5 skips
    r = NextCategory                            // ran off the end
  finish:
    if type == Standard and ProducedOutput and not DontFocus: autoFocus(this)
    return r
```

`runList` for a statement list (this is where all the control flow lives):

```
runList(items) -> CABlockEnd
  skipOtherwise = false; skipChance = false; chanceGroup = null
  for i in 0 … items.length-1:
      it = items[i]
      if it is a Command:
          skipOtherwise = skipChance = false; chanceGroup = null
          r = exec(it); if r != Continue: return r
          continue
      // it is a ConditionalBlock
      if it.isOtherwise and skipOtherwise:      continue      // skipped unevaluated; flag stays set
      if it.isBareIfChance and skipChance:      continue
      if it.isBareIfChance and chanceGroup == null:
          chanceGroup = beginChanceGroup(length of the bare run starting at i)   // §6.5
      if not it.isBareIfChance: chanceGroup = null
      if not it.isIfChance:     skipChance   = false
      cond = it.isBareIfChance ? chanceGroup.next() : evalCondition(it.head)
      if not cond: skipOtherwise = false; continue            // NotActivated
      r = runList(it.body)
      if r == Continue: r = valueOf(it.terminator)
      if r == Continue:
          skipOtherwise = true
          if it.isIfChance and items[i+1] is an IfChance block: skipChance = true
          continue
      return r
  return Continue
```

### 8.3 `getNextCategory(ReturnVal)` — the phase machine

```
case RunTimeError:  clear SwitchContinuations and SequenceContinuations; return null
case Waiting:       return null                       // user.Continuation is armed

case Switch:
    target = SwitchToCategory
    if target.type == Standard: ActiveCatPos = index of target in AttentionFocus
    return target

case SwitchBack:
    frame = SwitchContinuations.pop()                 // error if empty
    runtime.Continuation = frame ; return frame.category

case Done:
    if SequenceContinuations is non-empty:            // resume an interrupted Sequence
        frame = SequenceContinuations.pop()
        runtime.Continuation = frame ; return frame.category
    SwitchContinuations = []                          // no way back now
    return null                                       // run over

case NextCategory:
  loop:
    if ActivePriority == 'Priority':
        c = next unexecuted, unsuppressed Priority category in manifest order
            whose kind matches executionType (Topic for statements, Scenario for actions)
        if c: return c
        ActivePriority = 'Standard'; ActiveCatPos = 0
        if user.Continuation != null:                 // the pending WaitForResponse
            frame = user.Continuation; user.Continuation = null
            runtime.Continuation = frame
            if frame.category.type == Standard: ActiveCatPos = index in AttentionFocus
            return frame.category
        continue loop
    if ActivePriority == 'Standard':
        c = selectBestFit()                           // §8.4
        if c: return c
        ActivePriority = 'Default'; continue loop
    if ActivePriority == 'Default':
        c = next unexecuted, unsuppressed Default category in manifest order
        if c: return c
        return null                                   // run over, nothing said
```

Five facts this encodes, each backed by `[spec §11]`:

- **Priority first, in manifest order**, every input, unconditionally except for suppression.
- **A `Done` in a Priority category ends the run before the continuation is resumed** — and the
  continuation is _not_ consumed; it stays armed for the next input.
- **The pending `WaitForResponse` continuation runs immediately after the Priority phase**, before any
  Standard selection, whatever its specificity would have been and whatever its category type. This is
  the "topic that asked a question gets first refusal on the answer" rule, and it is why bare
  `yes`/`no` works at all.
- **Defaults run only if no `Done` has been reached.**
- **A category is never executed twice in one run** (the `Executed` flag), except a Sequence category
  re-entered by `SwitchTo`.

**A Sequence category that runs off its end returns `NextCategory`, and selection resumes among the
Standard categories — it does NOT return to the caller of the `SwitchTo`.** Only `SwitchBack` returns.
This resolves the disagreement between `E` §5.6 and `F` §4.6; E is right and has CDB evidence
(`Shape` → `SwitchTo "ShapeImportance"` → `ShapeImportance` does not activate → `Generic answers`, a
Default, answers the same input).

### 8.4 Best-fit selection — Standard phase only

Priority, Default and Sequence categories are never selected this way.

```
selectBestFit():
  1. candidates = []
     for each category C in user.AttentionFocus, in current order:      // front = most recently focused
         if C.Executed or C ∈ user.SuppressList: continue
         for each base-level block B of C (in source order):
             if isActive(B):
                 candidates.push({ category:C, block:B,
                                   spec: specificity(B),
                                   focusRank: index of C in AttentionFocus })
                 break                                                   // only the FIRST active block
  2. if candidates is empty: return null
  3. sort by spec DESC, then focusRank ASC
  4. return candidates[0].category
```

**Selection scores blocks; execution runs the whole containing category from its first block.** The
selected block is not jumped to.

A **base-level block** is a conditional block whose body contains at least one **non-`If` statement**
at its own top level. Blocks whose body is only nested `If` blocks are routers; only their innermost
statement-bearing descendants are activators. Build census: 1400 of 1485 blocks are base-level; 47
contain only nested blocks; 38 have completely empty bodies (`If … then SwitchBack`).

A base-level block `B` in category `C` is **eligible** iff `C.type == Standard`, `C` is unsuppressed
and unexecuted, and **every enclosing condition of `B` and `B`'s own condition** evaluates true.
Two qualifiers:

- **`IfChance` (bare or argument-bearing) counts as true with specificity 0** during the scan, and is
  rolled for real during execution. Otherwise `Last Line Of Defense` — a pure `IfChance` cascade —
  could never be reached, and the CDB shows it reaching 1264 times. If the roll then fails, the block
  returns `NotActivated`, the category runs its remaining blocks and returns `NextCategory`, and
  selection continues.
- **Run-time-only conditions** (LHS is a star buffer, or the RHS is not a fixed pattern) do not
  participate in the scan. Score them as true contributing 0, and evaluate them for real during
  execution. `Issues/Emotion.n:32` (`if *match matches EMOTE then`) is exactly this case.

**Tie-breaking**: the category nearer the front of `user.AttentionFocus` wins.
`[man:BestFit]`: _"If a user's input matches a conditional statement in more than one topic, the
matching topic with the most recent focus of attention runs in response."_ Positions in
`AttentionFocus` are unique (it is a permutation of the Standard categories), so no third key is
needed.

**The loop.** `selectBestFit()` is called again after each Standard category that returns
`NextCategory` or `Continue`, with that category now excluded by `Executed`. It stops on `Done`,
`Waiting`, `Switch` or `RunTimeError`, or when no candidates remain — at which point the Default phase
begins. In real traffic this loop almost never iterates: **94.6 % of answered turns are produced by a
single topic** and only 409 of ~6,750 answered inputs involved more than one, nearly all of them
`SwitchTo` chains.

### 8.5 The specificity formula

`[spec §14.2]`: _specificity is `log(1/f)` where `f` is the estimated likelihood that a condition is
true for any particular input, multiplied by 1000 so the computation is integer._

Per element:

| element                                         | specificity                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| a literal word `w`                              | `round(1000 · ln(1/freq(w)))` over the Example corpus            |
| a partial word (`develop#`)                     | as above, with `freq` = summed frequency of all matching words   |
| a multi-word string                             | the sum of the individual word specificities                     |
| `*` wildcard, and a space                       | **0**                                                            |
| `Recall ?X` / `IfRecall ?X` / any test on `?X`  | `attributeSpecificity[?X]`, default **2000**                     |
| `Focused`                                       | **0** at compile time; **100 × \|shared subjects\|** at run time |
| a negated condition                             | a fixed constant — value never stated; **use 0**, see §11        |
| an optional element/condition that is **false** | **0**                                                            |
| an optional element/condition that is **true**  | its normal specificity                                           |
| `Chance` / `IfChance`                           | **0** (and treated as true during the scan)                      |
| `Always`                                        | **0**                                                            |

Combining `[spec §14.3]`:

```
spec(literal w)      = wordSpec(w)
spec(concat e1..en)  = Σ spec(ei)                     // a pattern is a concatenation of arcs
spec(patternList L)  = max over the elements of L that actually matched
spec(optional e)     = e matched ? spec(e) : 0
spec(OR  c1..cn)     = max over the ci that are TRUE
spec(AND c1..cn)     = ( Σ spec(ci) ) − 1000 · (n − 1)   // the correlation penalty
spec(block B)        = spec(B.condition)                 // scored as a conjunction of its conditions
```

If more than one match path exists for a given input (an optional element was found, or two elements
of a `PatternList` matched), **the highest value wins**.

Worked numbers from the patent, with the stated assumed word specificities (`you 3000, bot 4000,
virtual 8000, robot 8000, sales 6000, complex 8000, cost 6000, expensive 8000, NeuroStudio 8000,
Recall 2000`):

- `"Are you a bot"` matched by `*you*` + `BOTS` + `*` → **7000** (you 3000 + bot 4000; the stars and
  spaces contribute 0).
- `"Are you a sales bot?"` matched by `*you*sales bot*` → **13000**, beating 7000.
- `"Are you a complex virtual robot"` against a pattern with an optional `{BOTS}`: two paths give
  11000 (optional absent) and 27000 (you+complex+virtual+robot); **max wins → 27000**.
- `IfHeard "you" and ((Recall ?FactQuestion and Heard "expensive") or (Recall ?DescriptionQuestion and Heard "cost"))`
  on a `?DescriptionQuestion` input: inner AND = 6000 + 2000 − 1000 = **7000**; OR = 7000; outer AND
  with `"you"` = 7000 + 3000 − 1000 = **9000**.
- `IfHeard "cost" and "NeuroStudio"` plus a `Recall`: (8000 + 6000 − 1000) = 13000, + 2000 − 1000 =
  **14000** → this block wins.

Real integers of this scale appear in the vendor's own verification report
(`### Best answer had specificity value 3753` / `>>>Selecting: Category 'Where Walter works'
(Specificity 3169)`), which confirms the 1000-scale.

**The word-frequency corpus** is every `Example` and `OtherExamples` string from every loaded file,
tokenised the same way as input. The build has **545 `Example` + 182 `OtherExamples` + 2
`InitialExample`**. `Example ""` contributes nothing; do not divide by zero. A word absent from the
corpus gets the maximum specificity (treat `freq` as `1/N`). This is the largest calibration risk in
the port — see §11.2.

**The 33 registered attribute specificities** (`QRD:20-58`) are the shipped build's entire
answer-preference policy. Verbatim:

```
?CanQuestion 3000   ?DescriptionQuestion 3000   ?FactQuestion 3000   ?LocationQuestion 3000
?MethodQuestion 3000   ?ReasonQuestion 3000   ?ShouldQuestion 3000   ?TimeQuestion 3000
?WhatIfQuestion 3000   ?OtherQuestion 3000   ?WhoQuestion 5000   ?AnyQuestion 2500
?ObtainQuestion 5500   ?CostQuestion 6000   ?DirectionsQuestion 6000   ?CompareQuestion 6000
?ExampleQuestion 6000   ?MoreQuestion 6000   ?ConfirmQuestion 6000   ?DoHaveQuestion 7000
?FollowUpQuestion 8000
?MessageStatement 3400   ?ActStatement 3400   ?TimeStatement 3400   ?ConditionalStatement 3400
?CauseStatement 3200   ?FeelingStatement 3200
?IsStatement 2800   ?HaveStatement 2800   ?WantStatement 2800   ?FactStatement 2800
?AnyStatement 2200   ?OtherStatement 1950
```

Everything else — including `?YesResponse`, `?NoResponse`, `?NotSureResponse`, `?HaveName`, `?Name`
— is unregistered and scores **2000**. That default is load-bearing: a topic keyed on
`Recall ?YesResponse` alone (2000) loses to any topic keyed on a `?FactQuestion` (3000).

### 8.6 Auto-focus and `Refocus()`

```
autoFocus(cat):                        // only Standard categories reach here
    FocusList.append(cat)
    for each subject s of cat, in DECLARATION order:
        for each other category c in subjectMap[s], in MANIFEST order:
            if c !== cat and c.type == Standard and c not already appended in this call:
                FocusList.append(c)

Refocus():                             // once, at the very end of the run
    for each entry e of FocusList, BACK TO FRONT:
        remove e from user.AttentionFocus
        insert e at position 0
```

**Iterate `FocusList` back to front.** `[spec §11]` describes an implementation ("remove it from its
previous position and place it at the front") that reverses `FocusList`, while the same document's
Example-1 walkthrough (`Focus "Cats"` inside `CatsOrComputers` → resulting order
`Cats, CatsOrComputers, …`) and the documented `Focus "dogs","cats"` semantics both require
**first-appended-ends-up-first**. The archive breaks the tie: the `DontFocus`-plus-`Focus` idiom
(37 of the 58 `DontFocus` uses sit within ±6 lines of an explicit `Focus`) only makes sense if an
explicitly focused successor ends up **ahead** of the auto-focused current category — which is why the
author had to add `DontFocus` at all.

**Focusing is deferred.** Nothing moves during execution. `FocusList` is cleared at the start of every
run.

**Activation without output does not refocus.** `[spec §12]`: if the outer `If` of a topic is
activated but the inner one is not, nothing is added to `FocusList`.

**Sequence, Priority and Default categories are never auto-focused.**

### 8.7 Active subjects and `Focused`

```
newSubjects = (union of the subjects of every category placed on FocusList this run)
            ∪ (every literal argument of every Focus Subjects executed this run)
if newSubjects is non-empty:  user.ActiveSubjects = newSubjects      // replace, do not merge
// else: leave user.ActiveSubjects unchanged
```

`Focused` is true in category `C` iff `|subjects(C) ∩ user.ActiveSubjects| ≥ 1`.

**The "leave unchanged when empty" rule is the point of the whole mechanism.** 33 of the 38 Default
categories declare no `Subjects`, so a fallback answer does not wipe the conversational context and
the follow-up "yes" still lands on the topic that asked the question two turns ago. `[man:BestFit]`
states it in the worked conversation: _"because the default Topic 'I Don't Know' has no Subjects line,
the subject NEUROSCRIPT is preserved as the focus of attention."_

**Subject identity is case-insensitive.** 241 distinct verbatim subject strings, **196 distinct
normalised subjects**. Settled by the compiled `Topics.csv`, which stores subjects lower-cased in
square brackets (`"[me,age]"`, `"[default answers][identity][alife]"`). The bracket notation is a
serialisation artefact, not source syntax.

**`Subjects "ME,AGE";`** (`AboutMrMind/MMIdentity.n:82`) is **one** opaque subject `me,age`, not two —
confirmed by `Topics.csv` recording `"[me,age]"` for that topic while recording `"[me][age]"` for
correctly written neighbours. Split on commas **between** string literals only, never inside one.
Reproduce the bug: that topic shares its subject with nothing and auto-focuses only itself.

`"NONE"`, `"None"`, `"none"` (15 categories) and `"NULL"` (2) are ordinary subject strings that merely
_look_ special. They are not special-cased: those categories genuinely share a subject, co-focus, and
satisfy each other's `Focused` conditions. Reproduce that.

Do not merge near-duplicates: `emotion` vs `emotions`, `current event` vs `current events`,
`understanding` vs `understsanding` (a source typo), `you annoy me` vs `you annoy me 1..4`. Each
spelling is its own group. The full 196-entry census is `E-topics-focus-and-selection.md` Appendix A.

---

## 9. The standard library's role

Detail: `F-stdquestion-library.md`, which is accurate throughout except for the "50 files" count.

### 9.1 What is loaded

**Exactly one file from `Library/`**: `StdQuestion/combis/QuesResDebug.us.n`, a _combi_ of
`StdQuestion.us.n` + `StdResponse.us.n` + `StdDebugger.n`. It contributes **65 of the build's 691
categories** — 25 Priority and 40 Sequence — and emits **no user-visible text at all** (its 97
`SayToConsole` calls are debug tracing).

**Everything else under `Library/` is present but unloaded.** The manifest's `Utilities\` and
`Customization\` entries have no `LIBRARY:` prefix, so they resolve to **Peggy Weil's modified forks**
under `Mrmind3/`, not to the library originals. **Port the forks.** The behavioural deltas are real:

- `CGoodbye.n` drops the library's `NotHeard PseudoGoodBye` guard and adds an exit-survey
  `WaitForResponse` before the goodbye line.
- `CProfanity.n` removes `fuck#`, `piss#`, `hell` and `touch#` from `DirtyWords` and **comments out
  `forget ?Profanitystrikes;`** in the apology topic — so apologising no longer resets the counter,
  contradicting `ProfanityCustomize.n`'s own comment.
- `WebNameGreet.n` adds two `IfRecall ?HaveName` blocks that silently re-parent the whole name-retry
  machinery (§9.4).

`CMultiSentence.n` is **not** loaded, so MrMind does **no** sentence splitting: a multi-sentence input
is processed as one string.

### 9.2 Library bugs to replicate

Numbered for the test suite; all evidence in `F-stdquestion-library.md` §4, §6, §7.

1. `?StdP.DoneStrippingPunctuation` is attached to the _edge-stripping_ block, not to "nothing
   changed", so if the embedded-punctuation block fires but the edge block does not, the flag is set
   anyway and the driver stops looping. `he said "a" and "b"` keeps one quote mark.
2. **`it's been` uses `*1`, not `?StdP.SecondPart`** (`QRD:637`) where every sibling rule uses
   `?StdP.SecondPart`. The result is correct ("it has been fun") but the mechanism differs; copy it.
3. **`you'd` always expands to `you had`**, never `you would` — unlike `I'd`/`he'd`/`she'd`/`they'd`/`we'd`.
4. **Contraction expansion normally runs exactly once**, so only the first occurrence of each
   contraction is expanded ("I don't know and you don't either" keeps its second `don't`). Only an
   input containing `we'd` triggers all six passes, because the `we'd` block ends `SwitchBack` and the
   `Otherwise Always Remember ?StdP.DoneExpanding;` binds to _it_ rather than to the outer guard.
5. **`?FollowUpQuestion` is only reachable from retry round 2 onward**, so an input that produces a
   question on the first pass never sets it, no matter how much it looks like a follow-up.
6. **`FindWhatIfQuestion` rule 4 ends `Continue`** instead of `SwitchBack`, so `"what if X"` is
   immediately overwritten by rule 5 and yields `" if X"` rather than `X`.
7. **`FindTimeQuestion` rule 2 ends `Continue`**, so a recovered follow-up value can be overwritten.
8. **`FindDescriptionQuestion` rule 5 writes the attribute, not `?StdQ.LocalQuestion`**, unlike every
   other finder's rule 3.
9. **`FindHaveStatement` reads an uninitialised `?StdS.LocalStatement`** — whatever
   `FindIsStatement` left there. Attribute state must persist across Sequence-topic invocations
   within one run.
10. **A single-word input is never a statement** (`StdS.FindQuestion`'s final `"#"` alternative).
11. **A question can be an `?IsStatement`/`?FactStatement` but never an `?OtherStatement`** — the
    catch-all is the only statement finder that also gates on `?AnyQuestion`.
12. `StdP.I` contains `"I/'#"` — a forward slash where a backslash was meant, so that element matches
    the literal text `I/'` plus a word, never `I'm`/`I've`. Keep it.
13. `?ExampleQuestion` may be set to `""` and must still satisfy `Recall`.

### 9.3 The opening sequence — exact

`Priority Scenario "Login over Web"` fires on `?WhatUserDid Contains "Web ACCEPT CONNECTION"`, dumps
CGI headers to the console, sets `?SayPageTemplate`, does `Suppress "Login from Console";` and
`SwitchTo "Robot Greeting";`. `Robot Greeting` says
`SayOneOf STDW_WebGreetingFirstHalf +MYNAME+ STDW_WebGreetingSecondHalf;` — a 2 × 3 × 1 cross product,
**one of six strings** — then `SwitchTo "Name Capture"`, which immediately says
`SayOneOf STDN_NameRequests` (one of three) and `WaitForResponse`.

**So MrMind's first screen is always two lines**, in one flushed buffer:

```
<B>Hello.  I'm mrmind      |  <B>What's your name?</B>
<B>Hello.  I'm mr mind     |  <B>Please tell me your name.</B>
<B>Hello.  I'm MRMIND      |  <B>What is your name?</B>
<B>Hi, my name is mrmind   |
<B>Hi, my name is mr mind  |
<B>Hi, my name is MRMIND   |
```

(Note the unclosed `<B>` and the double space in `"Hello.  I'm "`. Both are in the shipped strings.)

### 9.4 Name Capture is mis-nested, and the retry machinery is dead code

**This corrects `G-corpus-and-voice.md` §5.2–§5.3, which describes the retry flow as live and the
`Say STDN_GOTNAME…` line as unconditional.** I re-verified the block nesting directly against
`Mrmind3/Utilities/WebNameGreet.n:36-156`. The resolved structure:

```
L38  Always
L46    IfRecall ?HaveName                      <-- block B
L48      If (?Name Matches MYNAME) and …           -> TryAgain (L51)
L54      IfRecall ?HaveName                    <-- block D   (added by PW, 12/00)
L56        If ?Name Matches "Human"                -> Done (L61)
L66        IfRecall ?HaveName AND Chance 60%       -> Done (L71)
L86        InitialExample 2 "My name is Fred";
L94        Say STDN_GOTNAMEFIRSTHALF+?Name+STDN_GOTNAMESECONDHALF;
L95        Focus Subjects "Intro";
L98      Done                                  <-- closes D
L105     If ?NameTries Matches "3" …               -> Done
L116     If ?NameTries Matches "2" …               -> Continue
L120     If ?NameTries Matches "1" …               -> Continue
L124     IfRecall ?NoResponse or heard StdN.Refusals … -> Done
L134     IfRecall ?ReasonQuestion …                -> TryAgain
L142     If (Recall ?AnyQuestion) and (?String1 matches ?String2) -> Continue
L154     SayOneOf STDN_NAMEREQUESTS;
L155   TryAgain                                <-- closes B
L156 Done                                      <-- closes Always
```

Two consequences the port must reproduce:

1. **The `Chance 60%` branch ends `Done`, so it is exclusive**, not additive. 60 % of the time the
   user gets only `Hi <Name>! <BR>Can you convince me <BR>that you're human?`; 40 % of the time only
   `<B>Hi <Name>! <BR>Can you convince me <BR>that you are human?  </B>` **plus**
   `Focus Subjects "Intro"`. The user is never asked twice in one turn, and **the 60 % branch does not
   focus the Intro subject**.
2. **Everything from L105 to L154 is nested inside block B (`IfRecall ?HaveName`)**, and block D —
   whose condition is identical to B's, hence always true whenever B fires — always terminates in
   `Done`. So the retry machinery is unreachable. **`?NameTries` never advances past `"1"`; the
   "I'll just call you User" line, the "why do you want my name" reply, the re-ask, and the
   `InterruptSequence` are all dead code.** MrMind asks your name exactly once; if it cannot parse
   one, it says nothing more, `Name Parser Missed Name` has already set `?Name` to `"User"` (only if
   `?Name` was previously unset), and the conversation carries on.

Do **not** "fix" this.

### 9.5 Other library behaviour worth knowing

- **`StdResponse`** sets `?YesResponse` / `?NoResponse` / `?NotSureResponse` per turn, forgetting all
  three first. Matching both affirmative and negative resolves to `?NotSureResponse`. The lists carry
  both `"I don't know"` and `"I do not know"` because `IfHeard` sees the un-expanded track (§4.1).
- **The profanity filter** is three tiers, each ending `Done` so it pre-empts the whole run. Tiers 1
  and 3 test the **raw `?WhatUserSaid`** so spell-check cannot launder profanity; tier 2 tests
  `?WhatUserMeant`. The disable switch is `and ("" DoesNotMatch STDX.RESPONSE_TO_X)` — including the
  empty string in a response list turns that tier off. Three strikes disconnect; the warning fires at
  strike 2 (`?STDX.TEST = strikes + 1`).
- **The first goodbye does not produce a goodbye line** — it produces the survey question. The goodbye
  line is said only on the `SwitchBack` after a `?NoResponse`, or on a second goodbye. If the reply is
  neither yes nor no, `AskSurvey` returns `NextCategory` and the answer is handled as a normal
  utterance; the goodbye line is never said.
- **`MYNAMEPLUS` and `PseudoGoodbye` are declared and never referenced.** Ten library attributes are
  computed and never read by any content topic, along with all 31 `?Previous*` slots (which are read
  only inside the finders themselves).

---

## 10. Conformance test cases

Numbered for reference. Each is drawn from the archive, the vendor manual, or the conversation
database. Groups **A** and **B** are pure unit tests; **C** onwards need the engine.

### A. Lexer and loader

1. `MRMIND3.vsr` `[FILES]` resolves to **49** files, case-insensitively, all present.
2. Loading them produces **691** categories: 559 Standard, 61 Sequence, 38 Default, 30 Priority Topic,
   3 Priority Scenario — including `Humans&Machines/Bots.n`'s `/Topic "Are bots smart" is`.
3. `unescape("\\.")` is 2 characters; `unescape('\\"')` is 1. `PatternList Punc is "\.","\?","\!","\,";`
   yields four 2-character strings.
4. `"C:\Program Files\NativeMinds\TextFiles\Joke.txt"` survives the lexer verbatim.
5. `MMIdentity.n` decodes with `é` intact at lines 204, 213, 217 and does not throw.
6. `"http://www.hotbot.com/?MT="` is one string; the `//` is not a comment.
7. The four zero-byte files are reported as damaged, not loaded as empty scripts.
8. Command census matches §2.4 exactly (`Say` 555, `Example` 545, `WhenFocused` 46, `DontFocus` 58, …).
9. All 4543 conditional blocks in the archive parse with zero unterminated blocks.
10. Zero levels mix `and` and `or`; zero forward pattern references; zero duplicate category names.

### B. The matcher (§5) — all 70 pass under the specified compiler

The full table is in `§5` and reproduced in the harness; the load-bearing rows:

11. `Contains "robot"` on `Are you a robot` → **true**; on `You are a Robot.` → **true**;
    on `Have you seen any robots?` → **false**. `[man:Operators]`
12. `Contains "robot#"` on `Have you seen any robots?` → **true**.
13. `Contains "chat# site#"` on `Chat Sites` → true, on `Chatter Sites` → true,
    on `Chat World Site` → **false**; `Contains "chat#*site#"` on `Chat World Sites` → true.
14. `Contains "virtual*robot"` on `virtual/robot` → true, on `virtual. The robot` → true,
    on `virtualrobot` → true, on `virtualrobotic` → **false**, on `virtuallyrobot` → **false**.
15. `Contains "hel^o"` on `hello`/`heloo` → true, on `helllo` → **false**.
16. `Contains "f,u,d,g,e"` on `fudge`, `f u d g e`, `f.u.d.g.e` → all true.
17. `Contains "part.time"` on `part-time`, `part time`, `part - time` → all true.
18. `Matches "#"` on `anne` → true, on `anne marie` → **false**; `Matches "# #"` on `anne marie` →
    true; `Matches "##"` on `anne marie` → **false**.
19. `Contains "market#"` on `marketing` → true, on `remarket` → **false**.
20. `Contains "machine#"` on `are you a machine` and on `Machines don't have legs!` → both true.
21. `Contains "aren,t"` on `you arent` and `you aren't` → true. `Contains "O,K"` on `are you o.k.`
    and `are you ok` → true. `Contains "Belly,button"` on `bellybutton` and `belly button` → true.
22. `Contains "#,one"` on `I am twenty-one` → true. `Contains "#teen"` on `i am thirteen` → true.
    `Contains "%%%"` on `i am 100 years old` → true.
23. `Matches "^\.^\."` on `j.w.` → true. `Matches "#-#"` on `anne-marie` → true.
24. `Matches "It's short for *"` on `Its short for Fido` → true, `*1 == "Fido"`.
    (`customization/NameCustomize.n:82-83`; the pattern spells `It's`, the Example spells `Its`.)
25. `Contains "*@*"` on `my email is a@b.com` → true, and the two wrapper stars are **not** numbered:
    `*1 == "my email is a"`, `*2 == "b.com"`.
26. `Matches "you are"` on `you sure are` → **false**. `Contains "what"` on `so what` → true;
    `Matches "what"` on `so what` → **false**.
27. `Contains "bot"` on `Are you a robot` → **false** (word-level; `AILIFE` lists both separately).
28. `Contains "us"` on `I want the user survey.` → **false**. `Contains "no"` on `I do not know` →
    **false**.
29. `Contains "A.I."` on `a.i.` → true, on `ai` → **false**.
30. `?WhatUserSaid ExactlyMatches GRINNIES` on `:-)` → true; on `:-) ` (trailing space) → true;
    on `hi :-)` → **false**.
31. `"are"+YOU+"*"+OKAY` renders `are you*O,K` (implicit space before `YOU`, none around `*`) and
    `Contains` it on `Are you OK?` → true.
32. `YOU + "have to" + "trust me"` renders `you have to trust me` and matches
    `you have to trust me` under `Contains`.
33. `"give"+("","#","# #")+"information"` renders exactly
    `{give information, give # information, give # # information}`.
34. `SayOneOf STDW_WebGreetingFirstHalf +MYNAME+ STDW_WebGreetingSecondHalf` evaluates to exactly the
    **six** strings of §9.3.
35. `Contains STDP.I+CONVINCE+YOU+STDP.I+STDP.BE+"human"` (`Convincing.n:126`) renders 8192 strings
    without blowing up.

### C. Conditions and control flow

36. `Priority topic "Set Defaults for level of debugging information. "` (`QRD:2291-2309`): if the
    first `Otherwise` branch fires and returns `Continue`, the **second and third** are skipped.
37. `Topic "I have a family member"` (`AboutUser/UserFamily.n:36-65`): a 20 % `IfChance` that returns
    `Continue` suppresses the 35 % and 45 % branches — the bot emits **one** family line, never two.
38. `Default Topic "Last Line Of Defense"`: over 10,000 simulated reaches, **exactly one** of the 8
    bare `IfChance` branches fires each time; the topic is never silent.
39. `Topic "Computers Don't Have"` (`Humans&Machines/Machines.n:65-89`): input matches → `Say` +
    `WaitForResponse`; next input neither yes nor no → the fallback `Say` + `TryAgain` re-arms the
    _same_ continuation, so the following input is tested against the same two blocks again.
40. `Sequence Topic "Name Capture"`: `TryAgain` at line 155 resolves outward to the
    `WaitForResponse` at line 42 in the enclosing `Always`.
41. `Sequence topic "remove excess punctuation"` is entered at most 5 times per turn, and stops early
    once `?StdP.DoneStrippingPunctuation` is set (bug §9.2.1 included).
42. `QRD:154-163` switches to `"Remove excess punctuation"` five times in one run without a
    `RunTimeError` (Sequence exemption from the cycle guard).
43. `SwitchTo` a **non**-Sequence category already executed this run → `RunTimeError`, both
    continuation stacks cleared, run ends silently.
44. `Sequence Topic "GetYN"` is entered 21 times in one game of 20 Questions.
45. `Priority Topic "STD_Goodbye Detect"` → `SwitchTo "asksurvey"` → `WaitForResponse` spans two
    inputs; on `?NoResponse` the `SwitchBack` returns into the goodbye topic and _then_ says
    `SayOneOf STD_GoodbyePhrases`.
46. `Sequence Topic "ShapeImportance"` fails to activate → returns `NextCategory` → Standard
    selection resumes (it does **not** return to `Shape`'s caller).

### D. Selection, focus and the run loop

47. Initial `AttentionFocus` for a new user is manifest order; the first eight entries are
    `RealName, NotRealName, It's short for, It's my initials, EvadeNameQuestion, ReasonForName,
NewRealName, NewRealName2` and the last is `Why do you think whatever`.
48. `[man:BestFit]`'s Walter/Scott worked conversation reproduces exactly:
    `Who is Scott?` → Scott's answer; `How old is he?` → Scott's age; `Who is Walter?` →
    Walter's answer; `How old is he?` → **Walter's** age.
49. `[man:BestFit]`'s Focused conversation reproduces exactly, including
    `What is NeuroScript?` → `Where?` → **"I don't know what you mean."** (because
    `Where is NativeMinds?` is no longer the most recent focus) and the subsequent
    `Is it easy?` still answering about NeuroScript (because the subject-less default did not clear
    `ActiveSubjects`).
50. `Topic "Shape"` (`Humans.n:259-273`) produces output, never reaches a `Done`, and the run **falls
    through to the Defaults**: the CDB shows `Shape` then `Generic answers` on one input, and
    `Shape` then `IHave`, and `Shape` then `I am human.`
51. `Topic "Knock Knock."` (`Issues/Humor.n:41-53`): the `IfChance` block ends `Continue`, so after
    the punchline the category returns `NextCategory` and the Default `Is that your RealName` also
    fires. (CDB: exactly this pair.)
52. `Subjects "ME,AGE";` produces **one** subject `me,age`, shared with no other category.
53. `Focus subjects "WantSomePointers?"` (`Defaults/Pointers.n:37`) focuses **nothing** (the declared
    subject has no `?`), while `Focus Subjects "HELP", "WantSomePointers"` (`Defaults/Defaults.n:159`)
    focuses 5 categories. Both still reset `ActiveSubjects`.
54. `Focus Subjects "M TESTE"` (`UserFamily.n:50, 56`) names a _category_, not a subject, and focuses
    nothing.
55. A `Done` in a Priority category ends the run **without consuming** the pending `WaitForResponse`
    continuation; it is still armed on the next input.
56. `Suppress This;` in `Defaults/OneShots.n` retires the topic for the rest of the conversation, per
    user. `Is that your RealName` (p = 0.90) fires at most once.
57. `?LastTopic` is maintained and `Default topic "Why default"` (`Defaults.n:98-107`) is correctly
    blocked when `?LastTopic` is one of its three named topics.

### E. Corpus and statistical calibration (the CDB, `_work/cdb/mrmind3/`)

58. Parsing the 49 files reproduces **1375 output rows** byte-identical to `G-all-say-strings.tsv`
    field 4, in the same order; **1264** distinct strings; **50** distinct `SayToFile` targets;
    **116** `SayToConsole` statements; **zero** live `Do` actions.
59. `Reactions/Annoyance.n:41` yields exactly one row whose string is `""`, and the engine emits a
    turn with an empty reply body rather than falling through to a default.
60. Replaying the 7,160 recorded user inputs, the share of bot utterances produced by `Default`
    categories lands in **25–27 %** (target: engine's own report 25.68 %, re-measured 26.27 %).
61. The share produced by `Priority` categories is ≈ **2.94 %**.
62. **≥ 90 %** of answered turns are produced by a single topic (CDB: 94.6 %).
63. Over ≥ 8 fires of a fixed-alternative `SayOneOf`, the adjacent-repeat rate matches the memoryless
    prediction Σp², not 0 and not 1/k².
64. `Say "I don't think.  I cause you to think.","That's what you think, …";` produces **two**
    utterances in one turn (CDB lines 14456-14457).
65. `Say ?WhatUserSaid + " who?";` on input `peggy` produces the single utterance `peggy who?`.
66. `Compute Lowercase` then `Compute Capitalize` on `?Name` turns the input `peggy` into
    `Hi Peggy! …` (CDB line 6) and `human` into `That's a good trick -- OK, I'll CALL you Human...`
    (CDB line 12).
67. Bare `yes` resolves through **three** distinct mechanisms and all three must work: a pending
    `WaitForResponse` continuation (`20 questions`, `Exit Survey`, `AskMe3`, `Pointers`,
    `AnnoyanceThree`); `Focused and Recall ?YesResponse` (`NO to Machine Companionship`,
    `I am not a human by choice`, `I have a body.`); and Default fallback (`No`,
    `Last Line Of Defense` — 23 times).
68. `I'm going dancing` is answered by `Topic "I'm going to France."` with
    "Are you going by FedEx or modem?" — pure over-matching, no focus involved. Keep it.

### F. The library and the opening

69. Turn 0 produces exactly two lines, one of six greetings and one of three name requests (§9.3).
70. Turn 1 with a parseable name produces **exactly one** of: the own-name rebuke + `TryAgain`; the
    "Human" pair + `Done`; the 60 % `you're human` line; or the 40 % `you are human?  </B>` line
    **plus** `Focus Subjects "Intro"`. Never two of them.
71. `?NameTries` never becomes `"2"` (§9.4).
72. `Heard "do not"` is **false** on `I don't know`, while `?FactStatement contains "do not"` is
    **true** on the same input.
73. `I hate rabbits.` → `?WhatUserMeant` becomes `I ate rabbits.` _after_ classification, and
    `Sequence Topic "Invert"` answers `you ate rabbits?`.
74. A single-word input never sets any `?…Statement`.
75. `what if X` sets `?WhatIfQuestion` to `" if X"`, not `X`.
76. Apologising after a profanity strike says `Thanks for apologizing.  <BR>Now, show me your human
side.` and does **not** reset `?ProfanityStrikes`.
77. The first goodbye produces `Before you leave, can you take a <BR>moment to take the user survey?`
    and **not** a goodbye line.

---

## 11. Open risks

Full list with evidence and hypotheses: `OPEN-QUESTIONS.md`. The five that can actually change output:

### 11.1 The word-level matcher versus the tutorial

§5.1 chooses word-level on the strength of the Language Manual, the patents and three independent
archive arguments. The vendor **tutorial**'s `who*kronos` exercise predicts character-level behaviour.
If a running NeuroServer 2.2 ever surfaces, this is the first thing to test. Consequence if wrong:
patterns like `"fantas*"` and `"mast*rbat#"` would come alive, and `Contains "us"`/`"no"`/`"bot"`
would fire far more often. Mitigation: put the matcher's boundary rule behind a single flag.

### 11.2 The specificity word-frequency corpus

The formula is fully specified (§8.5) but the corpus is not. Unsettled: whether library `Example`s
count alongside bot ones; whether `OtherExamples` count; how `#`-prefix frequencies are aggregated;
whether NeuroServer shipped a base frequency dictionary; and the tokenisation. Adopted: all `Example`
and `OtherExamples` strings from every loaded file, tokenised as input is, absent word = maximum
specificity. **This is the largest single risk to output fidelity**, and it is testable: replay the
7,160 CDB inputs and check both the 25–27 % default band (test 60) and the specific topic attributions
in `E` §10.3.

### 11.3 The specificity of a negated condition

`[spec §14.3]` says only that it is "a fixed specificity" and never gives the constant. Adopted: **0**.
MrMind uses `NotHeard`/`DoesNotContain`/`DontRecall` as guards rather than discriminators
(`Issues/Emotion.n:17-18` has two `notheard` clauses guarding a six-way `or`), so 0 leaves the observed
rankings unchanged. Make it a tunable constant and calibrate against test 60.

### 11.4 Spell-check

Not reproducible (§4.3). Identity is behaviourally safe for the build but degrades typo tolerance,
which will shift the default-response rate upward — the opposite direction from a matcher that is too
permissive. Expect the two errors to partly cancel and do not tune one against the other.

### 11.5 `ActiveCatPos` after a continuation resumes into a Standard category

`[spec §11]` states explicitly that a `Switch` into a Standard category sets `ActiveCatPos`; it does
not say whether a resumed `WaitForResponse` continuation does. This path is exercised constantly — 40
of the 89 `WaitForResponse` are in Standard categories. Adopted: **it is set**, by symmetry. The five
observed multi-round turns in the CDB are too few to discriminate.

### 11.6 Smaller ones, listed so they are not forgotten

- The separator (if any) in `?EverythingRobotJustSaid` when a run produced several utterances.
  Make it one configurable constant; `<BR>` for an HTML surface, `\n` for text.
- `\\` in a string literal: absent from the build, present in 61 `Base` strings. Either behaviour is
  acceptable.
- `Capitalize` per-word versus first-letter-only: indistinguishable from the build.
- `Compute ratio` rounding: one call site, not in the build.
- `Say "…" + ,` and `SayOneOf X+"  "+;`: malformed, parsed as specified in §2.5, unverifiable.
- Whether `Example` counts as a base-level statement for activation. It is a statement, so under
  §8.4 it does; nothing in the build hinges on it.
- `InterruptSequence` fidelity — the author's own comment records that it misbehaved on NeuroServer
  2.1/2.2, and all 3 uses are dead code anyway.

---

## 12. Disagreements between the dimension files, and how they were resolved

Every one was resolved by going back to the archive, the vendor manual, or the conversation database.
The evidence is in the section named.

| #   | Disagreement                                                                                                                    | Resolution                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Character-level vs word-level matching.** B says character-level; the patents say word-level.                                 | **Word-level.** `[man:Operators]`'s summary table, `AILIFE` listing `"bot"` and `"robot"` separately, `BOTS` needing `machine#`, and the false-positive measurement of §5.1. B is wrong.                                                    |
| 2   | **Number of build files: 49 (A,B,C,D,E,G) vs 50 (F, and the task brief).**                                                      | **49.** Counted directly from `[FILES]`; all 49 resolve.                                                                                                                                                                                    |
| 3   | **Categories: 691 (A,C,G) vs 690 (E). Standard 559 vs 558.**                                                                    | **691 / 559.** E drops `Humans&Machines/Bots.n:1` because of the stray `/` before `Topic`; the topic is in the compiled `.nso`. Tolerate the slash.                                                                                         |
| 4   | **`Example` count: 545 (A,D) vs 553 (E) vs 748 (F).**                                                                           | **545.** E and F count occurrences inside string literals. Matters because Examples are the specificity corpus.                                                                                                                             |
| 5   | **`WhenFocused`: 46 (A,C,D) vs 11 (E).**                                                                                        | **46.**                                                                                                                                                                                                                                     |
| 6   | **`#`: zero-or-more (B) vs one-or-more-with-boundary-exception (F §15.6).**                                                     | **Zero or more.** `[man:Operators]`: _"any one character, multiple characters, or no character."_ Plus `BOTS`/`machine`, plus `"#P#"` on `"P"`.                                                                                             |
| 7   | **The unescaped `,`: a wildcard (B) vs an unsettled hypothesis (F §3.1).**                                                      | **A wildcard**: zero or more spaces and/or punctuation. `[man:Operators]` gives `"f,u,d,g,e"` matching `fudge`, `f u d g e`, `f.u.d.g.e`.                                                                                                   |
| 8   | **`SayOneOf`: uniform memoryless (D) vs non-repetition cycling (G §3.1, §9.1).**                                                | **Memoryless.** CDB: observed 1046/2531 adjacent repeats vs 1071.8 predicted by memoryless draw, 230.4 by cycling, 0 by never-immediately-repeat. G's source comment (`-JB 8/1/99`) describes an engine generation the shipped log refutes. |
| 9   | **Bare `IfChance` group: exactly one fires (C, adopted) vs independent 1/N (C, alternative).**                                  | **Exactly one.** `Last Line Of Defense` produced 1264 SAY rows; the independent reading implies ≈ 660 silent turns from that topic alone, while the whole log has only 413 silent inputs from all causes.                                   |
| 10  | **A Sequence category running off its end: `NextCategory` (E §5.6) vs implicit `SwitchBack` (F §4.6).**                         | **`NextCategory`.** E has CDB evidence (`Shape` → `ShapeImportance` → `Generic answers`). F itself flags this as a recommendation, not a finding.                                                                                           |
| 11  | **Name Capture's `Chance 60%` branch: exclusive (F §10.3) vs additive (G §5.2).**                                               | **Exclusive.** The block ends `Done`, which propagates out. Re-verified against `WebNameGreet.n:66-95`; see §9.4. G's "asked twice in one turn" is wrong.                                                                                   |
| 12  | **Name Capture retry logic: dead code (F §10.3) vs live (G §5.3).**                                                             | **Dead code.** Block nesting re-verified line by line; see §9.4.                                                                                                                                                                            |
| 13  | **Block comments `/* … */`: none (A, C) vs "also occur" (E §1).**                                                               | **None.** Exactly one `/` survives outside comments and strings in the whole build, and it is the Bots.n stray slash.                                                                                                                       |
| 14  | **`Then`: mandatory after every non-`Always` head (C) vs "optional in practice" (E §1).**                                       | **Mandatory.** 1374 heads, 1374 `Then`, zero exceptions.                                                                                                                                                                                    |
| 15  | **`DontFocus` count: 58 (A, E) vs 32 (the task brief).**                                                                        | **58.** A naive `grep` drops `MMIdentity.n` as binary because of the Latin-1 `é`.                                                                                                                                                           |
| 16  | **`Refocus()` iteration order.** `[spec §11]`'s described implementation reverses `FocusList`; its own worked example does not. | **Back to front**, so first-appended ends up first. The `DontFocus`-plus-`Focus` idiom (37 of 58 uses) only makes sense that way.                                                                                                           |
| 17  | **What normalisation the `Matches`/`Contains` path applies (B §14.2 hypothesises upstream stripping).**                         | **None in the matcher.** `FindOtherQuestion`'s `contains "*#\?*"` requires `?` to survive. The `Compliments.n:52` comment remains unexplained — `OPEN-QUESTIONS.md` §3.                                                                     |
| 18  | **`^`/`%` star buffers: one slot per operator (B §6.1) vs one slot per consecutive run.**                                       | **Per consecutive run.** `[man:Operators]`: _"the caret and the percent sign… match a group of consecutive instances."_ The archive cannot distinguish them.                                                                                |
| 19  | **Multi-argument `Focus` ordering (D §, E §6.1 both flag it).**                                                                 | **Moot.** Zero multi-argument bare `Focus` in the whole archive; all 7 uses are single-argument.                                                                                                                                            |
| 20  | **`SwitchTo <symbol>` (unquoted) in the BNF.**                                                                                  | **Never occurs.** All 577 archive uses take a quoted string. Implement category reference with a name→category map alone.                                                                                                                   |

Two further corrections that are not disagreements between files but between the files and the
archive: dimension F's §1.3 load-order table is right in content but says "the 50 files"; and every
file that repeats the task brief's "32 `DontFocus`" should read 58.

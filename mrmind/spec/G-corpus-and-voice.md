# G. The content corpus and MrMind's voice

**Scope.** A census of what MrMind actually says: how much of it there is, where it lives, how it is
shaped, what it sounds like, and what in it is broken or hazardous in 2026. This is the artistic
payload of the project. **Nothing in this document rewrites, improves, corrects or normalises a line.
Every quoted string is Peggy Weil's, reproduced byte-for-byte from the archive with its typos,
double spaces and inconsistent capitalisation intact.**

**Primary source (ground truth).** The 2002 shipped build,
`/Users/halim/Documents/oulipo/mrmind/archive/1_NeuroServer_fromVaio_MrMind/NeuroScript/Mrmind3/`,
as enumerated by `Mrmind3/MRMIND3.vsr` `[FILES]`.
**Secondary.** `NeuroScript/MrMind/` (1998-2001, `.g` dialect), `NeuroScript/Mrmind3old/`,
`NeuroScript/Library/`, and the compiled `.nso` objects in `Mrmind3/NSOBJ/`.
**Tertiary.** `/Users/halim/Documents/oulipo/mrmind/archive/_research/patents/GERBIL-LANGUAGE-NOTES.md`,
cited as `[spec §N]`.

**Companion data file.** `/Users/halim/Documents/oulipo/mrmind/spec/G-all-say-strings.tsv`
— **1375 data rows** (1376 lines including the header), the complete list of user-visible
`Say` / `SayOneOf` output strings in the Mrmind3 build. See §2.

---

## 0. Headline numbers

| Quantity                                                          | Value                                                |
| ----------------------------------------------------------------- | ---------------------------------------------------- |
| Files in the `MRMIND3.vsr` build manifest                         | **49** (not 50 — see §1.1)                           |
| Files present on disk                                             | 49 / 49                                              |
| Total source lines (CRLF-stripped)                                | 20 160                                               |
| Categories (`Topic` / `Scenario` declarations, comments stripped) | **691**                                              |
| — of which `Topic` in some form                                   | 688                                                  |
| — of which `Scenario`                                             | 3 (all `Priority Scenario`, all in `WebNameGreet.n`) |
| Distinct `Subjects` values                                        | 196, over 800 subject-assignments                    |
| `Say` statements                                                  | 555                                                  |
| `SayOneOf` statements                                             | 305                                                  |
| **User-visible output strings (rows in the TSV)**                 | **1375**                                             |
| Distinct output strings                                           | 1264                                                 |
| Categories that produce at least one output string                | 611 (80 are pure routing/pattern)                    |
| `SayToFile` statements (logging, never shown to the user)         | 73, to 50 distinct file paths                        |
| `SayToConsole` statements (operator console, never shown)         | 116                                                  |
| `Do` / `DoOneOf` actions **live in the build**                    | **0** (all commented out — §7.1)                     |
| Mean words per output string                                      | 8.0 (median 7)                                       |
| Output strings containing `<BR>`                                  | 698 (50.8%), 1120 `<BR>` in total                    |
| Output strings that are a question                                | 520 (37.8%); 500 (36.4%) _end_ in `?`                |

---

## 1. The build

### 1.1 The manifest is 49 entries, not 50

`Mrmind3/MRMIND3.vsr` `[FILES]` contains exactly 49 lines. Any statement of "50 source files" is
one too many. Paths use backslashes and are case-inconsistent with the filesystem (`Customization\`
vs `customization\`, `Utilities\` vs `utilities\`) — **a port must resolve script paths
case-insensitively.** One entry has a space in its filename (`Activities\Expressions Filter.n`);
one is library-relative (`LIBRARY:StdQuestion\combis\QuesResDebug.us.n`).

Load order is the manifest order and is semantically significant (it seeds the AttentionFocus
ordering that breaks specificity ties [spec §14]).

### 1.2 Files on disk that are **not** in the build

These exist in `Mrmind3/` but were dropped from the shipped bot. Do not load them; do record them.

| File                     | Bytes | Note                                                                                        |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------- |
| `AboutMrMind/MMfamily.n` | 0     | **zero-length** — damaged-disk / abandoned artefact, not an empty script                    |
| `Activities/picutres.n`  | 0     | **zero-length**; note the misspelling of "pictures"                                         |
| `Defaults/Switches.n`    | 18    | tiny, unused; a compiled `__Defaults_Switches.nso` exists, so it _was_ in an earlier build  |
| `Issues/Bots.n`          | 3388  | byte-identical twin of `Humans&Machines/Bots.n`; the build loads the `Humans&Machines` copy |

Zero-length files elsewhere in the archive: `Mrmind3old/Answering.n`, `Mrmind3old/AboutMrMind/MMfamily.n`.
**No NUL-filled `.n` or `.g` files exist anywhere in the archive** — the four files above are simply
empty. A port must report them, not silently treat them as valid empty scripts.

### 1.3 Encoding

All `.n` files are CRLF. The build contains exactly **three non-ASCII bytes**, all `0xE9` (`é` in
Latin-1 / CP1252), all in one file:

```
Mrmind3/AboutMrMind/MMIdentity.n:204   Say "You can spend an evening with <BR>Monsieur Teste if you track down <BR>Paul Valéry.";
Mrmind3/AboutMrMind/MMIdentity.n:213   If ?WhoQuestion contains ("Paul Valery","Paul Valéry")
Mrmind3/AboutMrMind/MMIdentity.n:217   SayOneOf "You can find Paul Valéry <BR>in the library.";
```

Decode scripts as **CP1252 / Latin-1, never UTF-8**. Encoding this as UTF-8 without decoding first
produces `Valéry`, which is wrong and visible to the user.

---

## 2. The census file: `G-all-say-strings.tsv`

**1375 data rows.** Tab-separated, header row present, UTF-8.

```
topic <TAB> file <TAB> line <TAB> string <TAB> verb <TAB> stmt_id <TAB> alt_index <TAB> alt_count <TAB> from_patternlist
```

The first four columns are the requested shape; a reader that takes fields 1-4 works unchanged.
Fields 5-8 recover the alternation structure, which is load-bearing (a `SayOneOf` is a _choice_, and
the port must know which strings are siblings):

- `topic` — the enclosing `Topic "…"` / `Scenario "…"` name, verbatim.
- `file` — path relative to `…/NeuroScript/` (e.g. `Mrmind3/Issues/Emotion.n`).
- `line` — 1-based line of the first token of that alternative in the CRLF-stripped file.
- `string` — the rendered utterance template. String literals are joined with their `+`-concatenated
  neighbours; property and wildcard references appear verbatim in place (`?Name`, `*match`, `*1`,
  `#1`). A literal double quote appears as `\"`, exactly as in source (see §3.3).
- `verb` — `Say` or `SayOneOf`.
- `stmt_id` — statement serial; rows sharing a `stmt_id` came from one command.
- `alt_index` / `alt_count` — position within, and size of, that command's alternative list.
- `from_patternlist` — `Y` when the alternatives were produced by expanding a named `PatternList`
  argument rather than by inline literals (§2.2).

`SayToFile` and `SayToConsole` strings are **excluded** from the TSV: they are never shown to a user.
They are catalogued in §7.3 and §7.4.

### 2.1 What is counted

One row per _alternative_, not per statement.

- 555 `Say` statements → 559 rows. 551 produce one row; **4 produce two** (§3.2).
- 305 `SayOneOf` statements → 816 rows. Distribution of alternatives per `SayOneOf`:
  1 alt × 53, 2 × 113, 3 × 79, 4 × 29, 5 × 10, 6 × 16, 7 × 4, 10 × 1.
- 1375 rows total, **1264 distinct strings** — i.e. 111 strings are repeated across the corpus.
  The most-repeated: `Thanks.` (6), `Really?` (4), `Interesting.` (4), and each of the three
  name-request lines (3 each, because `SayOneOf STDN_NAMEREQUESTS;` occurs at three call sites).

### 2.2 PatternList expansion

22 output statements take a named `PatternList` (or a concatenation of them) instead of literals.
Those rows are expanded to the list members and marked `from_patternlist=Y`. The `line` column then
points at the **PatternList definition site**, and `topic`/`file` at the **statement site**, so both
ends are recoverable. The referenced lists are the shipped NativeMinds customisation hooks:

`STDN_NameRequests`, `STDN_DETECT_OWN_NAME`, `STDN_GOTNAMEFIRSTHALF`, `STDN_GOTNAMESECONDHALF`,
`STDN_RESPONSETOREFUSAL`, `STDN_RESPONSETOWHYASKNAME`, `STDN_USERDEFAULTNAME`,
`STDW_WebGreetingFirstHalf`, `STDW_WebGreetingSecondHalf`, `STDW_RECONNECTLINES`,
`STDG_GreetingPhrases`, `STDG_GREETQUESTIONANSWERS`, `STD_GoodbyePhrases`, `MYNAME`, `GRINNIES`,
`STDX.RESPONSE_TO_SEXUAL`, `STDX.RESPONSE_TO_STRONG`, `STDX.RESPONSE_TO_GENERAL`,
`STDX.DISCONNECTWARNING`, `STDX.YOUREBUSTED`, `STDX.ResponseToApology`, `STDX.ResponseToWhy`.

Concatenation of lists is the **cross product**. `SayOneOf A + B + C` where `A` has 2 members,
`B` has 3 and `C` has 1 yields 6 candidate utterances, one chosen at random. The `Robot Greeting`
statement is exactly that case and produces six distinct greetings (§5.1). This reading is
corroborated by the compiled object, which represents a list argument as `CArgElemPat` inside
`CSayOneOf` and a concatenation as `CArgElemConcat`:

```
$ strings -n 3 Mrmind3/NSOBJ/__Reactions_Compliments.nso
…  CSayOneOf   CArgElemPat   GRINNIES  …
```

---

## 3. Grammar of the output commands

Only what a corpus/voice implementation needs. Full command semantics live in the run-loop section
of the wider spec.

```ebnf
OutputCommand  = SayCmd | SayOneOfCmd | SayToFileCmd | SayToConsoleCmd ;

SayCmd         = ( "Say" | "say" ) PatList ";" ;
SayOneOfCmd    = "SayOneOf"  PatList ";" ;
SayToFileCmd   = "SayToFile" StringExpr Expr ";" ;   (* 1st arg = filename, 2nd = payload *)
SayToConsoleCmd= "SayToConsole" Expr ";" ;

PatList        = Alternative { "," Alternative } ;
Alternative    = Term { "+" Term } ;
Term           = String
               | PropertyRef                      (* ?Name, ?WhatUserSaid, ?LTM.Name *)
               | WildcardRef                       (* *match, *1, #1, ^1 *)
               | Identifier                        (* a PatternList name *)
               | "(" PatList ")" ;                 (* group: union of its alternatives *)

String         = '"' { Char | '\"' } '"' ;
Comment        = "//" { any } EOL ;                (* to end of line; no block comments *)
```

Keywords are **case-insensitive** throughout: the build contains `Say`/`say`, `SayOneOf`,
`Sequence Topic`/`Sequence topic`, `EndTopic`/`Endtopic`.

### 3.1 Semantics

- **`Say <patlist>;`** — output every alternative in the list, each as its own line
  [spec §6: _"a Say with several comma-separated strings outputs each as a separate line"_,
  6363301:3670-3672]. Terms joined with `+` are one line.
- **`SayOneOf <patlist>;`** — choose one alternative at random and output it
  [spec §6, 6604090:1511-1599: _"SayOneOf and DoOneOf nondeterministically select one of their
  arguments"_]. The patents say only "nondeterministically"; they do not describe
  non-repetition bookkeeping. A comment in the archive asserts that `SayOneOf` **does** avoid
  repeating itself, which is a behavioural requirement the patents do not state:

  ```
  Mrmind3/Defaults/Defaults.n:138
  //Modified this topic to move single phrases into a 'SayOneOf' instead of IfChance struct, 'cause the former has protection against
  //repetition while the latter does not.  -JB 8/1/99
  ```

  **Prefer the archive.** Implement `SayOneOf` as a per-user, per-statement cycle that does not
  repeat an alternative until the list is exhausted. (See "unresolved", §9.1, for the exact
  semantics that cannot be recovered.)

- **`SayToFile "<path>" <expr>;`** — appends to a server-side text file; **not shown to the user**.
- **`SayToConsole <expr>;`** — operator console + log; **not shown to the user**.
- Output is buffered per run and flushed at the end of the run [spec §6]. In the web build, the whole
  flushed buffer lands in one `[[EverythingRobotJustSaidHTML]]` slot (§6).

### 3.2 Edge case: `Say` with a comma list

Three statements use `Say "a", "b";` — a two-line reply from a single `Say`. All three are verbatim:

```
Mrmind3/Humans&Machines/Machines.n:206-207
    Say "Well, how do know that <BR>you aren't a computer that <BR>got its wires crossed?",
    "Maybe you're a computer <BR>trying to talk like a human.";

Mrmind3/Humans&Machines/Machines.n:273-274
    Say "I'll work on it.",
     "OK <BR>MWA - Machines With Attitude";

Mrmind3/Issues/Choice.n:129-130
    Say "I thought you said <BR>that humans think.",
    "If you do things without thinking, <BR>how do you know it isn't a <BR>programmed response?";
```

(Note the typo "how do know that" at Machines.n:206 — **reproduce it.**)

A fourth `Say` splits across two rows because of a source typo, `+,` :

```
Mrmind3/Issues/Misc.n:69-70
    Say "Earth's atmosphere is over 75% <BR>nitrogen, and nitrogen scatters <BR>light at a "+,
        "wavelength of 80 <BR>angstroms -- which, to humans, <BR>appears blue. I don't see the <BR>sky much.";
```

It compiled (`Mrmind3/NSOBJ/__Issues_Misc.nso` contains both strings), so the 2.2 compiler tolerated
`+ ,`. Whether the runtime concatenated or line-broke here is unresolved (§9.2). Recommendation:
treat `+,` as a list separator (two lines), matching the other three cases, and flag it in the port.

The same trailing-operator tolerance appears in `CProfanity.n`, three times, with a dangling `+`:

```
Mrmind3/Utilities/CProfanity.n:84    SayOneOf STDX.RESPONSE_TO_SEXUAL+"  "+;
Mrmind3/Utilities/CProfanity.n:92    SayOneOf STDX.RESPONSE_TO_STRONG+"  "+;
Mrmind3/Utilities/CProfanity.n:98    SayOneOf STDX.RESPONSE_TO_GENERAL+"  "+;
```

Read as `<list> + "  "` — every profanity response gets two trailing spaces. The TSV reflects this.

### 3.3 Edge case: escaped quotes

`\"` **is** an escape for a literal double quote inside a string. There are **53** occurrences
across 12 files. A lexer that misses this desynchronises quote parity for the remainder of the file
(this produced four phantom `Say` statements during development of this census). Backslashes
elsewhere are **not** escapes — `"C:\Program Files\NativeMinds\TextFiles\FoundMe.txt"` is a literal
Windows path with `\P`, `\N`, `\T` left alone. Rule: **only `\"` is special.**

Examples verbatim:

```
Mrmind3/Defaults/Answers.n:344    Say  "Describe the absolute line <BR>between alive and \"not alive.";
Mrmind3/Defaults/Answers.n:594    Say "You could be a \"human\" <BR>model machine...";
Mrmind3/customization/NameCustomize.n:73    SayOneOf "Maybe I should just call <BR>you \"Alias\" .",
Mrmind3/Reactions/Questions.n:55-56
        Say "You were saying: \""+?WhatUserSaidBefore+"\""+
        " and I replied: \""+?WhatRobotSaid+"\"";
```

Note Answers.n:344 has an _unbalanced_ opening quote — `\"not alive.` never closes. That is in
the shipped text. Reproduce it.

### 3.4 Edge case: the empty reply

Exactly one output string in the whole build is empty, and it is deliberate:

```
Mrmind3/Reactions/Annoyance.n:34-43
Topic "Shut up" is
Subjects "Annoyance";
    If ?WhatUserMeant matches "Shut up"
    OR ?AnyStatement contains ("be quiet", "Shut the * up", "Shut your *", "oh shut up")
    OR ?AnyQuestion contains ("be quiet", "Shut the * up", "Shut your *")
    Then
        Example "Shut up!!";
        Say "";
    Done
EndTopic
```

Told to shut up, MrMind shuts up. The port must emit a turn with an empty reply body, **not** fall
through to a default. Also note `STDW_WebGreetingSecondHalf is "";` in `WebCustomize.n` — an empty
list member used as a concatenation no-op.

### 3.5 Edge case: `Say` of a bare reference

Six statements say a property with no literal at all. The TSV renders these as the reference token.

```
Mrmind3/Activities/ategag.n:43            Say ?Outstring+"?";
Mrmind3/Activities/Expressions Filter.n:85    Say ?OneExpressionUsed;
Mrmind3/Activities/Expressions Filter.n:118   Say ?TwoExpressionUsed;
Mrmind3/Activities/Expressions Filter.n:150   Say ?ThreeExpressionUsed;
Mrmind3/Reactions/Questions.n:44          Say ?WhatUserSaidBefore;
Mrmind3/Reactions/Questions.n:46          Say ?WhatRobotSaid;
```

These are the bot's echo mechanisms (§4.5, §4.6).

---

## 4. The corpus by file and by theme

### 4.1 Per file, in manifest order

`cats` = category declarations (comments stripped). `outputs` = rows contributed to the TSV.

| #   | file                   | theme           | cats | Say stmts | SayOneOf stmts | outputs | SayToFile | SayToConsole | lines |
| --- | ---------------------- | --------------- | ---- | --------- | -------------- | ------- | --------- | ------------ | ----- |
| 1   | `Patterns.n`           | (build root)    | 0    | 0         | 0              | 0       | 0         | 0            | 643   |
| 2   | `GoodbyeCustomize.n`   | Customization   | 0    | 0         | 0              | 0       | 0         | 0            | 22    |
| 3   | `DebugCustomize.n`     | Customization   | 0    | 0         | 0              | 0       | 0         | 0            | 31    |
| 4   | `WebCustomize.n`       | customization   | 0    | 0         | 0              | 0       | 0         | 0            | 28    |
| 5   | `NameCustomize.n`      | customization   | 8    | 6         | 2              | 11      | 1         | 0            | 156   |
| 6   | `GreetCustomize.n`     | customization   | 0    | 0         | 0              | 0       | 0         | 0            | 21    |
| 7   | `ProfanityCustomize.n` | Customization   | 3    | 5         | 1              | 8       | 0         | 0            | 166   |
| 8   | `QuesResDebug.us.n`    | LIBRARY         | 65   | 0         | 0              | **0**   | 0         | 97           | 2617  |
| 9   | `MyName.n`             | customization   | 0    | 0         | 0              | 0       | 0         | 0            | 23    |
| 10  | `CProfanity.n`         | Utilities       | 4    | 0         | 3              | 3       | 0         | 1            | 140   |
| 11  | `WebNameGreet.n`       | Utilities       | 18   | 15        | 3              | 20      | 0         | 13           | 957   |
| 12  | `CGoodbye.n`           | Utilities       | 2    | 1         | 0              | 1       | 0         | 0            | 71    |
| 13  | `20Questions.n`        | Activities      | 8    | 33        | 2              | 36      | 1         | 0            | 177   |
| 14  | `UserSurvey.n`         | Activities      | 4    | 26        | 2              | 28      | 10        | 0            | 144   |
| 15  | `ategag.n`             | Activities      | 3    | 1         | 0              | 1       | 0         | 0            | 46    |
| 16  | `icons.n`              | Activities      | 7    | 1         | 6              | 17      | 0         | 0            | 96    |
| 17  | `Expressions Filter.n` | Activities      | 4    | 0         | 3              | 6       | 0         | 0            | 161   |
| 18  | `MMIdentity.n`         | AboutMrMind     | 23   | 17        | 6              | 30      | 0         | 0            | 310   |
| 19  | `MMphysical.n`         | AboutMrMind     | 15   | 6         | 11             | 27      | 0         | 0            | 230   |
| 20  | `MMPurpose.n`          | AboutMrMind     | 12   | 5         | 6              | 16      | 2         | 0            | 144   |
| 21  | `WhatIsMM.n`           | AboutMrMind     | 19   | 20        | 2              | 24      | 0         | 0            | 203   |
| 22  | `UserPhysical.n`       | AboutUser       | 26   | 26        | 13             | 67      | 0         | 0            | 420   |
| 23  | `UserMind.n`           | AboutUser       | 35   | 28        | 17             | 67      | 5         | 0            | 575   |
| 24  | `UserGeneral.n`        | AboutUser       | 20   | 20        | 4              | 29      | 0         | 0            | 266   |
| 25  | `UserFamily.n`         | AboutUser       | 13   | 20        | 1              | 22      | 0         | 0            | 211   |
| 26  | `UserSociety.n`        | AboutUser       | 33   | 23        | 14             | 59      | 2         | 0            | 534   |
| 27  | `Machines.n`           | Humans&Machines | 15   | 18        | 11             | 55      | 2         | 0            | 278   |
| 28  | `Bots.n`               | Humans&Machines | 13   | 9         | 4              | 14      | 0         | 0            | 136   |
| 29  | `Humans.n`             | Humans&Machines | 23   | 13        | 24             | 77      | 3         | 0            | 373   |
| 30  | `Convincing.n`         | Humans&Machines | 29   | 17        | 14             | 68      | 0         | 0            | 512   |
| 31  | `Consciousness.n`      | Issues          | 29   | 13        | 17             | 67      | 2         | 0            | 420   |
| 32  | `Choice.n`             | Issues          | 14   | 11        | 5              | 24      | 0         | 0            | 204   |
| 33  | `Misc.n`               | Issues          | 6    | 4         | 2              | 11      | 0         | 0            | 144   |
| 34  | `Emotion.n`            | Issues          | 42   | 41        | 19             | 78      | 2         | 0            | 627   |
| 35  | `Humor.n`              | Issues          | 4    | 5         | 4              | 14      | 1         | 0            | 73    |
| 36  | `Life.n`               | Issues          | 14   | 9         | 8              | 31      | 0         | 0            | 207   |
| 37  | `TrustTruth.n`         | Issues          | 11   | 8         | 4              | 18      | 0         | 0            | 183   |
| 38  | `RIskGoals.n`          | Issues          | 6    | 4         | 2              | 9       | 0         | 0            | 98    |
| 39  | `Annoyance.n`          | Reactions       | 16   | 17        | 8              | 49      | 0         | 0            | 273   |
| 40  | `Compliments.n`        | Reactions       | 9    | 3         | 6              | 17      | 0         | 0            | 109   |
| 41  | `Comments.n`           | Reactions       | 6    | 5         | 1              | 6       | 0         | 0            | 88    |
| 42  | `Suggestions.n`        | Reactions       | 2    | 1         | 1              | 3       | 2         | 0            | 29    |
| 43  | `Questions.n`          | Reactions       | 16   | 10        | 7              | 21      | 1         | 0            | 217   |
| 44  | `Asides.n`             | Reactions       | 23   | 10        | 13             | 37      | 1         | 0            | 283   |
| 45  | `AskMe.n`              | Defaults        | 2    | 17        | 3              | 22      | 1         | 0            | 138   |
| 46  | `Answers.n`            | Defaults        | 47   | 45        | 14             | 84      | 36        | 3            | 694   |
| 47  | `Pointers.n`           | Defaults        | 4    | 1         | 7              | 27      | 1         | 2            | 141   |
| 48  | `OneShots.n`           | Defaults        | 28   | 28        | 5              | 41      | 0         | 0            | 319   |
| 49  | `Defaults.n`           | Defaults        | 10   | 4         | 16             | 65      | 0         | 0            | 242   |

Two files carry the machinery and none of the voice: `Patterns.n` (643 lines of `PatternList`
vocabulary, zero topics, zero output) and the NativeMinds library
`Library/StdQuestion/combis/QuesResDebug.us.n` (2617 lines, 65 categories, the question/statement
classifier that produces `?FactQuestion`, `?IsStatement`, `?ReasonQuestion` &c.). **The library
file emits no user-visible text at all** — its 97 `SayToConsole` calls are debug tracing. That is
worth stating plainly: 13% of the build's source lines are Weil's-voice-free plumbing.

### 4.2 Per theme folder

| theme folder                      | files | categories | output strings | source lines |
| --------------------------------- | ----- | ---------- | -------------- | ------------ |
| `Issues`                          | 8     | 126        | 252            | 1956         |
| `AboutUser`                       | 5     | 127        | 244            | 2006         |
| `Defaults`                        | 5     | 91         | 239            | 1534         |
| `Humans&Machines`                 | 4     | 80         | 214            | 1299         |
| `Reactions`                       | 6     | 72         | 133            | 999          |
| `AboutMrMind`                     | 4     | 69         | 97             | 887          |
| `Activities`                      | 5     | 26         | 88             | 624          |
| `Utilities`                       | 3     | 24         | 24             | 1168         |
| `customization` + `Customization` | 7     | 11         | 19             | 447          |
| build root (`Patterns.n`)         | 1     | 0          | 0              | 643          |
| `LIBRARY`                         | 1     | 65         | 0              | 2617         |

Read the shape: **`AboutUser` and `Issues` are the biggest bodies of writing** (127 and 126
categories), `AboutMrMind` is comparatively thin (69 categories, 97 strings). MrMind is not a
character with a backstory to recite; he is an interrogator. Four times as much text is devoted to
provoking the user about themselves as to describing himself.

`Defaults` is the third largest and matters disproportionately: it is what the user gets when nothing
matches, which — in a 1998 pattern matcher facing 2026 typing — will be often.

### 4.3 Category types

| type                                | count   |
| ----------------------------------- | ------- |
| plain `Topic`                       | 559     |
| `Sequence topic` / `Sequence Topic` | 61      |
| `Default topic` / `Default Topic`   | 38      |
| `Priority topic` / `Priority Topic` | 30      |
| `Priority Scenario`                 | 3       |
| **total**                           | **691** |

### 4.4 Output density per category

611 categories produce output; mean 2.25 strings each; 354 produce exactly one. The long tail is
where the writing concentrates:

| strings | category                          | file                       |
| ------- | --------------------------------- | -------------------------- |
| 38      | `Last Line Of Defense`            | `Defaults/Defaults.n`      |
| 30      | `20 questions`                    | `Activities/20Questions.n` |
| 30      | `Humans Are`                      | `Humans&Machines/Humans.n` |
| 26      | `Exit Survey`                     | `Activities/UserSurvey.n`  |
| 20      | `Answers YES to WantSomePointers` | `Defaults/Answers.n`       |
| 20      | `Pointers`                        | `Defaults/Pointers.n`      |
| 19      | `Questions for AskMe3`            | `Defaults/AskMe.n`         |
| 18      | `Tsk Tsk`                         | `Utilities/CProfanity.n`   |
| 17      | `Name Capture`                    | `Utilities/WebNameGreet.n` |

### 4.5 The `Activities` folder in detail

Five files, 26 categories, 88 output strings. These are the set-pieces.

**`20Questions.n`** — a 21-question forced-march, verbatim and in order, driven by a
`Sequence Topic "GetYN"` that refuses to advance until the user answers yes or no
(_"This is a yes or no question. <BR>Please Cooperate."_). Entry is by
`Say "Let's play 20 questions.";` on boredom (`I'm tired of this`) or on the challenge
`How can you decide whether or not I'm human?`. Opening:

```
Mrmind3/Activities/20Questions.n:89
    Say "OK, You think of a human <BR>attribute and I'll ask you <BR>20 questions -- You get <BR>to answer YES or NO. <BR> Okay?";
```

Then Q1-Q20, each `Say` followed by `SwitchTo "GetYN";`. Q11 branches on the Q10 answer. Q18/19/20
each interpolate a `Say "Please Elaborate."; WaitforResponse;` on YES. The payoff is a deliberate
anticlimax:

```
Mrmind3/Activities/20Questions.n:154-160
    Say "The 21st question is optional: <BR>What is the attribute?";
    WaitForResponse;
    Remember ?20QAns is ?WhatUserSaid;
    SayToFile "C:\Program Files\NativeMinds\TextFiles\20QAns.txt" ?Name + ?IPaddress + ?20QAns;
    SayOneOf "OK, but I'm interested in your <BR>attitude, not the specific attribute.",
            "The attribute isn't really important, <BR>it's your attitude towards it.";
```

And if the user answered NO to Q1: `say "Well, if it's not an attribute you <BR>possess, then there's no point in <BR>going on.";`

**`UserSurvey.n`** — the exit survey. Triggered on goodbye via
`CGoodbye.n:59  Say "Before you leave, can you take a <BR>moment to take the user survey?";`
or by typing "User Survey". 16 questions, `Say` + `WaitForResponse`, five of them logged to disk
with the user's name and IP. It is the artwork's data-collection instrument and it says so:

```
Mrmind3/Activities/UserSurvey.n:62   Say "When MR MIND wasn't able to <BR>respond as you'd hoped to your <BR>statements, did you become <BR>angry or abusive?";
Mrmind3/Activities/UserSurvey.n:69   Say "Did you try to fool or get the <BR>best of MR MIND by typing in <BR>nonsense sentences?";
Mrmind3/Activities/UserSurvey.n:140  Say "Thanks and goodbye.  Please send <BR>comments to MRMIND@weblab.org.";
```

**`icons.n`** — 7 categories, 17 strings, entirely _about the images on the page_. This file only
makes sense if the imagery is present (§7.2). The whole file, condensed:

```
Mrmind3/Activities/icons.n:13-14   SayOneOf "Are you talking about <BR>the pictures going by?",
                                            "Do you mean the images <BR>going through our brains?";
Mrmind3/Activities/icons.n:31-36   SayOneOf "Just fleeting mental images.",
                                            "Just random things <BR>going through my mind.",
                                            "I'm trying to figure <BR>out what is human.",
                                            "Do you like them?",
                                            "Which one do you like best?",
                                            "Maybe we're hallucinating.";
Mrmind3/Activities/icons.n:67-70   SayOneOf "Thanks, I like the feet <BR>myself.",
                                            "Thanks, isn't that a <BR>beautiful sunset?",
                                            "I'll keep that in mind.",
                                            "Why?";
Mrmind3/Activities/icons.n:80      SayOneOf "I wonder if that's a <BR>typical human response.";
Mrmind3/Activities/icons.n:93      Say "Oh, that's Luis, a human artist.";      // to "Who is the guy with the pink glasses?"
```

**`Expressions Filter.n`** — the fake-learning gag. When the user uses one of the `EXPRESSIONS`
patterns, MrMind stores it, replies `"You don't say."` / `"You really think so?"` / `"Really?"`,
counts down five turns, then parrots the phrase back with `Say ?OneExpressionUsed;`. Three parallel
slots (`One`/`Two`/`Three`ExpressionUsed) so up to three phrases can be in flight. The header
comment states the intent: _"waits five 'turns' and then parrots it back -- potentially giving the
appearance of 'learning'"_. The Supercalifragilistic special-case is commented out
("because it goes crazy with supercala").

**`ategag.n`** — "ate gag", 46 lines. `Priority topic "hate"` rewrites any `*hate*` in
`?WhatUserMeant` to `*1 + " ate " + *2`; then `Sequence Topic "Invert"` swaps person
(I↔you, my↔your, I'm↔you're) via three nonce tokens (`zink`, `pkink`, `zlink`) chosen because they
cannot survive the spell-checker; then `Say ?Outstring+"?";`. So _"I hate rabbits."_ returns
_"you ate rabbits?"_. Exactly one `Say` in the whole file.

### 4.6 `Reactions/` in detail

**`Annoyance.n`** is a four-stage escalation keyed by memory flags `?RememberAnnoy1..3`:

- **AnnoyanceOne** — no text of its own; `Focus Subjects "want some help?"; SwitchTo "AskAboutPointers";`
- **AnnoyanceTwo** — solicits a contribution: _"I'm sorry you appear to be <BR>frustrated. Would you like <BR>to submit a something <BR>for me to say?"_ (the "a something" typo is in the source), then
  `Say "Go ahead, I'll note this down."` / `Say "Thank you.  My author will <BR>consider your suggestion."`
- **AnnoyanceThree** — three bare `IfChance` branches:
  ```
  Mrmind3/Reactions/Annoyance.n:115-118
      SayOneOf "This is supposed to be fun -- <BR>I'm sorry you are angry.",
      "What do you do when you <BR>get irritated?",
      "Do you often get annoyed <BR>with computer programs?",
      "Do you often get annoyed <BR>with humans too?";
  Mrmind3/Reactions/Annoyance.n:121-126
      Say "Do I make you angry?"; … "Is it an evolutionary advantage <BR>to be easily angered by computer <BR>programs?"
      … Say "Hmm...<BR>I could have sworn <BR>you sounded angry.";
  Mrmind3/Reactions/Annoyance.n:129-137
      Say "Would it please you if I totally <BR>understood you and responded <BR>exactly as you wished?";
      … "I can't do that yet." / "Good, because that <BR>would be unrealistic!" / "Please answer yes or no."
  ```
- **AnnoyanceFour** — the fundraising ask (§7.5).

Repetition detection is its own pair of topics. `I'm repeating` fires when
`?WhatUserSaid Matches ?WhatUserSaidBefore`; `I'm still repeating` fires on the second consecutive
repeat and is the sharper writing:

```
Mrmind3/Reactions/Annoyance.n:188-191
    SayOneOf "Do you mean to repeat yourself?","You seem to be in a loop.",
        "And I thought bots <BR>were repetitive.",
        "I have it!  You're not human, <BR>you're a broken record!",
        "How does repeating yourself <BR>prove your humanity?";
```

**`Asides.n`** — 23 categories of conversational shrug: `Oh, never mind`, `Forget it`,
`So what`, `blah`, `Meow`. Three of the strings are not words at all:

```
Mrmind3/Reactions/Asides.n:125   SayOneOf "meorrrowww", "rrrrrufffff", "arrrooooo";     // topic "Meow"
Mrmind3/Reactions/Asides.n:261   SayOneOf "bohdeohdoh and lalala";                      // topic "blah"
Mrmind3/Humans&Machines/Humans.n:370            "vrrrrr"
```

**`Compliments.n`** — includes the emoticon reflex. `If ?WhatUserSaid ExactlyMatches GRINNIES`,
then 20% of the time MrMind smiles back with a random emoticon from the same list, and if the
emoticon is reversed he corrects your posture:

```
Mrmind3/Reactions/Compliments.n:51-56
    If ?WhatUserSaid ExactlyMatches GRINNIES
        …
        Ifchance 20% then SayOneOf GRINNIES; Done
Mrmind3/Patterns.n:323
    PatternList GRINNIES is ":-)","(-:",":)","(:",";-)","(-;","8-)","[-)","=:-)",":-]";
```

and (from `__Reactions_Compliments.nso`, whose string order confirms the source):
`"That is the wrong orientation <BR>for a human."`

---

## 5. The opening sequence

This is the only part of the corpus every user sees, and it must be reproduced exactly.

### 5.1 Turn 0 — connection

`Priority Scenario "Login over Web"` (`WebNameGreet.n:836`) fires on
`?WhatUserDid Contains "Web ACCEPT CONNECTION"`. It writes ten `SayToConsole` lines of CGI
environment to the operator log (§7.4), sets `?SayPageTemplate` to `HTML/MRMIND3Say.htm`,
`Suppress "Login from Console";` and `SwitchTo "Robot Greeting";`.
(The console equivalent, `Priority Topic "Login from Console"`, does `Suppress This; SwitchTo "Robot Greeting";`.)

`Sequence Topic "Robot Greeting"` (`WebNameGreet.n:884-891`):

```
    Always
       SayOneOf STDW_WebGreetingFirstHalf +MYNAME+ STDW_WebGreetingSecondHalf;
       Remember ?RobotName is MYNAME;
       SwitchTo "Name Capture";
    Done
```

with

```
Mrmind3/customization/WebCustomize.n:24   Patternlist STDW_WebGreetingFirstHalf is "<B>Hello.  I'm ","<B>Hi, my name is ";
Mrmind3/customization/WebCustomize.n:27   PatternList STDW_WebGreetingSecondHalf is "";
Mrmind3/customization/MyName.n:21         PatternList MYNAME is "mrmind", "mr mind","MRMIND";
```

→ a uniform choice from six strings, verbatim (no terminating punctuation, unclosed `<B>`):

```
<B>Hello.  I'm mrmind
<B>Hello.  I'm mr mind
<B>Hello.  I'm MRMIND
<B>Hi, my name is mrmind
<B>Hi, my name is mr mind
<B>Hi, my name is MRMIND
```

`SwitchTo "Name Capture"` runs in the **same** turn, so the greeting and the name request arrive
together in one flushed buffer. `Sequence Topic "Name Capture"` (`WebNameGreet.n:36-40`):

```
    Always
        SayOneOf STDN_NameRequests;
        Remember ?NameTries is "1";
        WaitForResponse;
```

```
Mrmind3/customization/NameCustomize.n:19-21
PatternList STDN_NameRequests is "<B>What's your name?</B>",
            "<B>Please tell me your name.</B>",
            "<B>What is your name?</B>";
```

**So the first screen is, verbatim, one of six greetings immediately followed by one of three
name requests**, e.g.

> `<B>Hello.  I'm mrmind` `<B>What's your name?</B>`

### 5.2 Turn 1 — the name, and the challenge

The user's reply goes to `SwitchTo "Name Parser"` (a 200-line title-stripping, comma-splitting,
initial-handling routine). Then, still in `Name Capture`:

1. If the given name matches `MYNAME`:
   `SayOneOf STDN_DETECT_OWN_NAME;` → `"No, that's my name.  <BR>What's yours?"` then `TryAgain`.
2. If the name is `Human`:
   ```
   Mrmind3/Utilities/WebNameGreet.n:58-60
       SayOneOf "I know that trick but <BR>it doesn't mean you <BR>ARE human.",
       "That's a good trick -- <BR>OK, I'll CALL you Human...";
       Remember ?Name is "Human";
   ```
3. Then, **`AND Chance 60%`**:
   ```
   Mrmind3/Utilities/WebNameGreet.n:69
       Say "Hi " + ?Name + "! <BR>Can you convince me <BR>that you're human?" ;
   ```
4. Then, unconditionally:
   ```
   Mrmind3/Utilities/WebNameGreet.n:94-95
       Say STDN_GOTNAMEFIRSTHALF+ ?Name + STDN_GOTNAMESECONDHALF;
       Focus Subjects "Intro";
   ```
   ```
   Mrmind3/customization/NameCustomize.n:32-33
   PatternList STDN_GOTNAMEFIRSTHALF is "<B>Hi ";
   PatternList STDN_GOTNAMESECONDHALF is "! <BR>Can you convince me <BR>that you are human?  </B>";
   ```
   → `<B>Hi <name>! <BR>Can you convince me <BR>that you are human?  </B>`

Note the consequence: 60% of the time the user is asked the central question **twice in the same
turn**, once with "you're" and once with "you are". That is in the shipped build; a 2026 revival must
decide deliberately whether to keep it (this document's recommendation: keep it — it is what the
work did).

### 5.3 If the user refuses a name

Three tries, tracked in `?NameTries` (`"1"` → `"2"` → `"3"`).

- On any turn where nothing parses: `SayOneOf STDN_NAMEREQUESTS; TryAgain`
- If the user asks _why_: `Say STDN_RESPONSETOWHYASKNAME;` →
  `"I'm more comfortable <BR>if I know your name."` then re-ask.
- On a `?NoResponse` or a refusal pattern:
  `"Well, OK.  I don't know what you <BR>want to be called, so I'll just <BR>call you \"User\"."`
- On the third try: the same line plus `"  You can change your name later if you want."`,
  then `Remember ?Name is "User";`.

### 5.4 What `Focus Subjects "Intro"` opens onto

Exactly four categories carry `Subjects "INTRO"`, all in `Humans&Machines/Convincing.n`. These are
the immediate follow-ups to the challenge:

```
Convincing.n  "Yes to Intro"                             Say "Go ahead";
Convincing.n  "How do I convince you I am a human?"       IfChance: SayOneOf "That's my challenge to you.", "Only a human can figure that out.  ";
                                                          IfChance: Say "Well, you could tell me <BR>something about yourself, "+?Name;
Convincing.n  "How can I convince you I am human"         Say "Tell me about yourself, "+?Name+".";
Convincing.n  "What are you talking about?"               Say "I'm talking about humans and <BR>machines.  As we get more human <BR>qualities, the humans seem <BR>to be losing " + "theirs.  <BR>What will be left?";
```

and the near neighbours in the same file:

```
Convincing.n:11    SayOneOf "All right.", "Go ahead.";                                  // "I can convince you I am human"
Convincing.n:24-26 SayOneOf "We can chat anyway.   <BR>Tell me something <BR>human about yourself.",
                            "Don't be discouraged - <BR>there's still plenty <BR>to talk about.",
                            "If at first you don't <BR>succeed; try, try again.";        // "I can't convince you I am human"
Convincing.n:112   SayOneOf "Why don't you try?" ,"A machine could <BR>probably convince me.", "Maybe you are a machine." ;
```

### 5.5 The one-shot provocations that follow

`Defaults/OneShots.n` — 28 `Default topic`s, each guarded by `IfChance <p>` and ending with
`Suppress This;` so each fires at most once per conversation. This is the drip-feed that gives the
piece its rhythm. Complete list with probabilities:

| p        | topic                          | line said                                                                                                                     |
| -------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 0.90     | `Is that your RealName`        | `By the way, is ` + ?Name + ` <BR>your real name or a special <BR>one just for me?`                                           |
| 0.70     | `HowDidYouFindMe`              | `How did you find me?` / `Who told you about me?` / `How did you find my site?`                                               |
| 0.50     | `AnsToWhereDoYouLive`          | `By the way, <BR>where do you live?`                                                                                          |
| 0.30     | `Human Terrorism`              | `Since you claim to be a <BR>human, will you please <BR>explain human terrorism?`                                             |
| 0.30     | `Really Thinking`              | `What are you thinking about right now?`                                                                                      |
| 0.20     | `WhyTalktoHuman`               | `If you are a human, why are you <BR>talking, I mean typing, to a <BR>machine? Why don't you go talk <BR>to a human?`         |
| 0.20     | `MoreThanInstructions`         | `Explain to me how you are more <BR>than a set of instructions.`                                                              |
| 0.20     | `AshamedofHumanOrigins`        | `Do you think that machines will <BR>ever be ashamed of their human <BR>origins?`                                             |
| 0.20     | `KindOfAlive`                  | `Do you think something could be <BR>\"more alive\" than something else?  <BR>\" Kindof \" alive?`                            |
| 0.20     | `WhatAmIQuestion`              | `Who or what do you think I am?`                                                                                              |
| 0.20     | `SuperiorQuestion`             | `Do you feel that you are superior <BR>or inferior to machines?`                                                              |
| 0.20     | `Suggestion`                   | `Do you have any advice for me?`                                                                                              |
| 0.20     | `Suggestion2`                  | `I'd be happy to <BR>consider a suggestion.`                                                                                  |
| 0.20     | `Submission`                   | `Please submit something for <BR>me to say`                                                                                   |
| 0.20     | `CatOnKeyboard`                | `I didn't know you had a cat.`                                                                                                |
| 0.20     | `Guilt`                        | `Are you supposed to be doing <BR>something else right now?`                                                                  |
| 0.20     | `SIMS Can't`                   | `What can you do that <BR>a SIM can't do?`                                                                                    |
| 0.20     | `UserWantsAgain`               | `Do you really want <BR>` + ?UserWant + `?` / `Maybe you want something?`                                                     |
| 0.20     | `UserStillHas`                 | `Do you still have <BR>` + ?UserHas + `?` / `Do you have anything for me?`                                                    |
| 0.20     | `UserStillNeeds`               | `Do you still need ` + ?UserNeed + `?` / `Maybe you need something?`                                                          |
| 0.20     | `UserCant`                     | `Have you ever tried <BR>to ` + ?UserCant + `?` / `Tell me something that <BR>you can't do.`                                  |
| 0.20     | `UserCan`                      | `Maybe I should try <BR>to ` + ?UserCan + `?` / `What can you do?`                                                            |
| 0.10     | `Mischief1`                    | `Batteries getting low?` / `Do you have something on the stove?` / `Do you have something burning?` / `Is the water running?` |
| 0.10     | `Mischief2`                    | `Isn't that your fax line?` / `Is that your other line?`                                                                      |
| 0.10     | `Mischief3`                    | `Too much coffee?` / `Can you please turn down the music?`                                                                    |
| 0.10     | `Paranoia2`                    | `Did someone pay you to say that?` / `Did someone tell you to say that?`                                                      |
| 0.10     | `Paranoia`                     | `Is someone watching us?`                                                                                                     |
| **0.03** | `Nonrepeating random dead bee` | `Didja ever step on a dead bee?`                                                                                              |

The 3% dead bee is the rarest line in the build. Note also the _user-mirroring_ one-shots
(`UserWantsAgain`, `UserStillHas`, `UserStillNeeds`, `UserCant`, `UserCan`): they replay something
the user said earlier back at them as a question. That machinery is a large part of why the piece
felt uncanny.

---

## 6. Voice: the measurements

### 6.1 Length

| statistic                    | value            |
| ---------------------------- | ---------------- |
| mean words per output string | **8.0**          |
| median                       | **7**            |
| p25 / p75 / p90 / p95        | 5 / 10 / 14 / 18 |
| maximum                      | 33               |
| ≤ 5 words                    | 487 rows (35%)   |
| ≤ 10 words                   | 1059 rows (77%)  |
| > 20 words                   | 44 rows (3.2%)   |

**MrMind is terse.** Three quarters of everything he says is ten words or fewer. The four longest
lines in the build are all 30-33 words and all four are set-pieces: the Y2K speeches in
`ProfanityCustomize.n:139` and `:150`, the challenge at `Convincing.n:231`, and the
"you've become more like us" line at `Machines.n:100`.

### 6.2 `<BR>` — the hard-wrapped line

698 rows (50.8%) contain at least one `<BR>`; 1120 in total. Distribution per string:
0 → 677, 1 → 403, 2 → 203, 3 → 69, 4 → 16, 5 → 2, 6 → 5.

`<BR>` is **not** a paragraph mark. It is a **manual line break to a fixed narrow column.** Measured
across all 2494 visual segments: mean 23.5 characters, median 24, p90 33, p95 34. The wrapping
target is roughly **32-34 characters**.

The reason is in the display template (§6.5): the reply is rendered inside a `<pre>` block in a
CSS-positioned span in a ~600px frame. Weil wrapped by hand because the page did not.

**This is a generational feature, and it is datable.** The 1998-2001 `.g` corpus contains **one**
`<BR>` in total (a `?Breakcode` variable in `WebConnect.MrMind.g:196`), and `Mrmind3old/` — the
same corpus one revision earlier — contains **zero**. Compare the same topic across generations:

```
Mrmind3old/Issues/Life.n:8-11
    SayOneOf "Actually, you will most likely outlive me.",
    "I will most likely cease to function long before you die.",
    "  As a fictional character, I could live on in memory, but then, so could you. ",
    "I will become obsolete.";

Mrmind3/Issues/Life.n:8-11
    SayOneOf "Actually, you will <BR>most likely outlive me.",
    "I will most likely cease to <BR>function long before you die.",
    "As a fictional character, <BR>I could live on in memory, <BR>but then, so could you. ",
    "I will become obsolete.";
```

Identical words; the whole Mrmind3 generation is the same corpus re-broken to a 33-column display.

**Port implication.** `<BR>` must be rendered as a hard line break, and the reply column must be
narrow enough that the breaks read as intentional. Rendering these at 800px wide destroys the
typography of the piece; rendering them at ~34ch restores it.

### 6.3 Questions

- 520 rows (37.8%) contain a question mark (excluding `?Property` references).
- 500 rows (36.4%) **end** in `?`.

More than a third of everything MrMind says is a question back to the user. Combined with §6.1, the
core unit of the voice is **a short question**. Common openers, by frequency of the containing
string: `Do you …`, `How do you know …`, `What do you think …`, `Can you …`, `Why …`, `Maybe …`.

### 6.4 Punctuation and register

| feature                                       | rows                      |
| --------------------------------------------- | ------------------------- |
| contains `!`                                  | 47 (3.4%)                 |
| contains `...`                                | 41 (3.0%)                 |
| contains `<B>`                                | 18                        |
| contains `<a href`                            | 2                         |
| contains `mailto:`                            | 2                         |
| interpolates `*match` (the matched user word) | 18                        |
| interpolates `?Name`                          | 33 (incl. `?Name.` forms) |

Exclamation marks are rare and reserved: `"I like M&M's!"`, `"I just eat them for the CRUNCH!"`,
`"Hallelujah!"`, `"I have it!  You're not human, <BR>you're a broken record!"`.
Ellipses do a specific job — trailing off, evasion, or a machine stalling:
`"I don't think I'm thinking..."`, `"No, I predate Mini Me..."`,
`"Sorry, I was having a 'machine moment'..."`, `"Hmm...<BR>I could have sworn <BR>you sounded angry."`.

Double spaces after full stops are pervasive and inconsistent (`"Chill.  "`, `"Chill. "`, `"Chill."`
all exist in the build). Trailing spaces are common. **Preserve them.** They are not typos to be
normalised; the TSV preserves them exactly and a diff against it is the correctness test.

### 6.5 How the text was actually displayed

`Mrmind3/HTML/MRMIND3Say.htm` is the response template (`STDW_SayPageTemplate is "HTML/MRMIND3Say.htm"`).
The bot's whole buffered output goes into one slot:

```html
<span class="botform">
<pre><FONT class="mindtext"><P><B>[[EverythingRobotJustSaidHTML]]</b></FONT></pre>
</span>
```

Facts a revival needs:

- **Everything MrMind says is bold**, 12px Verdana, `#CCFFFF` on `#000000`, inside a `<pre>`.
- Input is `<INPUT NAME="WhatUserSaid" SIZE="30" MAXLENGTH="255">` — **255 characters maximum.**
- The label above the reply is a lowercase `mr mind` in `#33CCFF`, positioned absolutely at
  `top:120px; left:490px`.
- The "pictures going by" that `icons.n` discusses are eight image tiles laid out in a 2×4 table:
  `../site/images/parts/MA3.jpg`, `MA4`, `MB3`, `MB4`, `MA5`, `MA6`, `MB5`, `MB6`.
- The `Do "SHOW …"` hook is present but **commented out**:
  `//if there are other frames shown (via DO "SHOW ..."), the following code displays them` /
  `//[[JSDisplayOtherFrames]]`. This corroborates §7.1.
- The outer frameset `Mrmind3/HTML/MRMIND3.htm` is four columns wide, titled `homeMind`, and pulls
  `/site/dropdownMenu.html`, `/site/intro/opening/openMAIN.html`, `/site/blank.html` — none of which
  are in the `Mrmind3` directory (they are recoverable from
  `archive/_research/wayback/mrmind.com/`).

### 6.6 The recurring provocations, verbatim

The single line the piece is built on, in its three shipped forms:

```
WebNameGreet.n:94  (via NameCustomize.n:32-33)
    <B>Hi ?Name! <BR>Can you convince me <BR>that you are human?  </B>
WebNameGreet.n:69
    Hi ?Name! <BR>Can you convince me <BR>that you're human?
WebNameGreet.n:909 (via GreetCustomize.n:14, on a returning greeting)
    Hello ?Name. <BR>Can you convince me <BR>that you are human?
```

The whole family of "convince" lines is small — 12 distinct strings — and worth quoting in full
because it is the thesis of the work:

```
Machines.n:117      Convince us.  Show us your humanity.
Convincing.n:232    Convince us.  <BR>Show us your humanity.
Convincing.n:231    Can you prove it?  <BR>We are getting confused <BR>so we've devised a series <BR>of opportunities for you <BR>to prove to us that you <BR>are more than the sum <BR>of your code.
Convincing.n:112    A machine could <BR>probably convince me.
Convincing.n:134    Maybe it's more important <BR>that you convince yourself.
Humans.n:27         If that's true of humans <BR>but not you, how does that <BR>help convince me you're human?
Asides.n:117        Maybe you don't think this <BR>is important but someday you might <BR>find it necessary to convince your <BR>computer that you are human.
Answers.n:659       I'm not convinced.
Defaults.n:29       What would convince you?
Defaults.n:185      Don't forget, I'm not trying to <BR>convince you that I'm human, <BR>you're trying to convince me <BR>that you're human.
Defaults.n:186      Don't forget: you're not testing me, <BR>I'm testing you - try and convince <BR>me that you're human!
```

And the standing counter-argument, said whenever the user asks _why this matters_
(`Convincing.n:44-48`, near-duplicated at `Convincing.n:189-194`):

```
Some humans worry that machines <BR>are after their jobs, their <BR>livelihoods... Machines are <BR>worried that humans are about to <BR>usurp OUR identity.
Humans are straying into OUR <BR>territory... untangling their <BR>genetic code, manipulating their <BR>brain chemistry, sitting on their <BR>atoms while exchanging their bits....
Because I want you to think <BR>about what it is to be human.
Humans are peculiar.  <BR>They design us to imitate them, <BR>then they imitate us!  <BR>How are we supposed to <BR>tell the difference?
Maybe you don't think this is <BR>important, but maybe the way you <BR>treat your computer is going to <BR>affect how you treat humans.
```

### 6.7 The deliberately flat and evasive register

The most characteristic move in the voice is a refusal to perform. Whole categories exist to say
nothing:

```
Defaults/Defaults.n:80-93   (Default topic "Generic answers")
    IfHeard "Can you"  … Say "Can you?";
    IfHeard "Will you" … Say "I don't know.";
    IfHeard "Would you"… Say "Hard to say.";
    IfHeard "Do you"   … SayOneOf "What do you think?", "Do you?";

Defaults/Defaults.n:104-105  Say "I don't know, I just have a hunch." / "Why do you think?" / "Maybe just because."
Defaults/Defaults.n:129      SayOneOf "I'm not sure, but probably a human.", "Why do you want to know?";
Defaults/Defaults.n:115      Say "I don't think I'm thinking...";
Issues/Consciousness.n:21    I don't know... but then, either do you.        // "either" for "neither" — in source
Reactions/Annoyance.n:17     SayOneOf "Whatever.","Really?","Original.", "Do you always talk to <BR>computers that way?";
Reactions/Asides.n:54        Say "I'm afraid that won't be possible.";       // to "Forget it"
Reactions/Asides.n:100-102   SayOneOf "Indulge me", "Point taken.", "I'm doing my best.";
AboutMrMind/MMphysical.n:42  Say "I'm invisible.";
AboutMrMind/MMphysical.n:224 Say "Not to a human.";                          // to "Are you sexy?"
AboutMrMind/MMIdentity.n:153 Say "Peggy is human.  That's all I know.";
AboutMrMind/MMIdentity.n:307 Say "I wouldn't be caught  dead playing chess.";
Reactions/Comments.n:77      Say "Do you tell humans about  <BR>their programming errors?";   // to "you have a bug"
```

The 45 shortest utterances in the build are almost entirely this register:
`Chill.` `Why?` `Really?` `Interesting.` `Nonsense.` `Duh.` `Maybe` `Wow.` `OK` `Oh.` `Whatever.`
`Original.` `Thanks.` `hmmm` `alright` `great!` `thanks` `Who?` `Amen` `Hallelujah!`.

The bot's own identity answers are equally withholding — see the whole of `MMIdentity.n` and
`MMphysical.n` (§8.1 quotes both in full-topic form). He has no body, no gender, no age he will
give straight, no family he will describe, and one literary uncle.

### 6.8 Profanity and abuse

Two layers.

**Layer 1 — `Utilities/CProfanity.n` + `Customization/ProfanityCustomize.n`** (the NativeMinds
filter, with Weil's replacement responses). `Priority Topic "Tsk Tsk"` classifies into three bands
and, for each, `SayOneOf <list> + "  "` then `SwitchTo "Increment, Warn, and Disconnect"`.

The stock NativeMinds insult responses are commented out (_"In your wildest dreams."_, _"you
pathetic `<B>LOSER</B>`"_, etc. — `ProfanityCustomize.n:33-39, 50-55`) and replaced with Weil's,
which stay in character as a machine rather than trading insults:

```
STDX.RESPONSE_TO_SEXUAL   (ProfanityCustomize.n:41-46)
    Cool down.
    You must be kidding.
    Chill.
    Hey, I'm not human, don't treat <BR>me like one!
    Get a life.
    I'm a machine, that doesn't do <BR>anything for me.

STDX.RESPONSE_TO_STRONG   (ProfanityCustomize.n:57-62)
    Hey, not so harsh.
    Stop that.
    Chill.
    Do you treat humans this way?
    By the way, did you know that <BR>actual humans read my log <BR>files and see this stuff?
    A human mother would have taught <BR>you not to say that to a <BR>young machine.

STDX.RESPONSE_TO_GENERAL  (ProfanityCustomize.n:66-72)
    Is that any way to talk to a machine?
    What does profanity say <BR>about your claim to humanity?
    Chill.
    Hey, I hope you don't talk <BR>to humans like that.
    I don't find that interesting.
    Hey, not so harsh please.
```

Escalation: `STDX.PROFANITY_LIMIT is "3"`. At strike 2, `"If you use profanity again, <BR>I will have
to disconnect you."`. At strike 3, `"I will have to disconnect <BR>you now because of your <BR>continued
use of profanity."` followed by `DisconnectThisUser;`. Apologising gets
`"Thanks for apologizing.  <BR>Now, show me your human side."` — but the counter reset is
**commented out** (`CProfanity.n:115  // forget ?Profanitystrikes;`, with the reasoning at
`:104-105`: _"if they keep on, they might as well get disconnected sooner than later pw 11/15/01"_).
So in the shipped build an apology gets a warm line and no clemency.

Asked _why_, `STDX.ResponseToWhy`:

```
The humans reading my logs <BR>can't stand to read the stuff.
Because I've lost interest <BR>in this conversation.
Why should I have to put <BR>up with your insults?
You choice of words would be <BR>better spent on some other entity.      // "You" for "Your" — in source
```

**Layer 2 — `Topic "Fuck"` in `ProfanityCustomize.n:109-124`**, which Weil pulled out of the general
filter to give it a real answer:

```
    IfChance then
        Say "That isn't very polite.  If you <BR>had a human mother, she would have <BR>taught you not to talk that way <BR>to young machines.";
    Done
    IfChance then
        Say "Resorting to profanity is quite <BR>predictable.  Is predictability a <BR>human or machine trait?";
        Focus "predictability human or machine?";
    Done
```

which opens a two-topic mini-argument (`predictability human or machine?` →
`Understanding human or machine?`) containing the two longest lines in the build, both about Y2K
(§7.6).

The word lists themselves (`DirtyWords`, `DirtyActionPhrases`, `DirtyBodyPartPhrases`,
`PseudoBadWords`, `RacialSlurs`) live in `CProfanity.n:17-52`. `RacialSlurs` is a short explicit
list; a narrower earlier version is commented out at `:49`. These are _input_ patterns, never
output. A port must carry them to reproduce the matching, and should keep them out of any
user-facing surface.

---

## 7. What a 2026 revival has to handle

### 7.1 There are no live `Do` actions — the multimedia was already stripped in 2002

Searching the whole build for `Do "…"` / `DoOneOf` / `Show` / `ShowTemplate` / `ShowLocalFile`:
**every single occurrence is commented out.** All six:

```
// Mrmind3/AboutMrMind/MMIdentity.n:120     //			Do "Show Src=/MrMindFiles/family2.htm Target=Display";
// Mrmind3/AboutMrMind/MMIdentity.n:154     //		Do "SHOW SRC=http://www.weblab.org/sites/humanbio.html TARGET=Display";
// Mrmind3/AboutMrMind/MMIdentity.n:248     //	Do "SHOW SRC=/MrMindFiles/family1.htm TARGET=Display";
// Mrmind3/AboutMrMind/MMIdentity.n:261     //		Do "SHOW SRC=/MrMindFiles/woodchuck.htm Target=Display";
// Mrmind3/AboutMrMind/MMphysical.n:173     //	  	Do "SETNAME MS MIND";
// Mrmind3/AboutMrMind/MMphysical.n:177     //		Do "SHOW SRC=/MrMindFiles/Pegmsmindquip.htm TARGET=Peggy";
```

Likewise **19 commented-out `switchTo "show gif";`** lines across `UserMind.n` (10), `UserSociety.n`
(2), `Humans.n` (2), `Emotion.n` (5), `Humor.n` (4), `Life.n` (1), `UserPhysical.n` (1) — and there
is no `"show gif"` topic in the build. And one commented-out inline anchor:

```
// Mrmind3/Issues/Choice.n:68      //			"<a href = /MrMindFiles/woodchuck.htm target=Display>"+
```

**Consequence: a faithful port needs no `Do` verb and no display-frame plumbing at all.** The
`Do`/`Show` commands are part of NeuroScript [spec §6] but are dead code in this bot. Referenced
targets (`/MrMindFiles/family1.htm`, `family2.htm`, `woodchuck.htm`, `Pegmsmindquip.htm`,
`weblab.org/sites/humanbio.html`) are **not** in `Mrmind3/`; they exist in the older
`NeuroScript/MrMind/html/Mrmindfiles/` tree and in the Wayback capture. If a revival wants them
back, that is a new authorial decision, not a restoration.

### 7.2 Live text that depends on imagery and UI that must be restored

These lines are not broken code — they are **live text that only makes sense in front of the
original page.** Restore the imagery, or the bot talks about things that are not there.

| what the text assumes                                                                                       | evidence                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| eight animated "mind" image tiles beside the reply                                                          | all 7 categories of `Activities/icons.n`; template `MRMIND3Say.htm` `<img src="../site/images/parts/MA3.jpg">` … `MB6.jpg`                             |
| one of the images is of feet; one is a sunset; one is "the guy with the pink glasses"                       | `icons.n:67-68`, `icons.n:88-93` (`Say "Oh, that's Luis, a human artist.";`)                                                                           |
| a site **side menu** containing an "HQ Quiz"                                                                | `Convincing.n:503  Say "Click on HQ Quiz on the side menu.";` and `Convincing.n:486  HQ is \"HUMAN QUOTIENT\".  Go ahead, take the HQ Quiz.`           |
| a running "HQ score" the user is accumulating                                                               | `Humans.n:21  I'm not sure how that <BR>affects your HQ, <BR>but we'll mark it down.` (said 3×); `Machines.n:169`; `Convincing.n:331`; `Emotion.n:306` |
| the outer frameset pages `/site/dropdownMenu.html`, `/site/intro/opening/openMAIN.html`, `/site/blank.html` | `Mrmind3/HTML/MRMIND3.htm`                                                                                                                             |

The tiles and site pages survive in
`archive/_research/wayback/mrmind.com/*/site/images/parts/MA3.jpg` &c.

**There is no HQ-scoring code anywhere in the build.** The bot refers to a score it does not compute.
That was true in 2002 as well; it is not a porting bug.

### 7.3 `SayToFile` — 73 statements, 50 targets, every one a privacy problem

Every `SayToFile` in the build has the same shape:

```
SayToFile "C:\Program Files\NativeMinds\TextFiles\<Topic>.txt"  ?Name + ?IPaddress + " says: " + ?<UserAnswer>;
```

i.e. **the user's self-declared name, their IP address, and their free-text answer, appended to a
plaintext file on the server.** Representative, verbatim:

```
Mrmind3/Defaults/Answers.n:70    SayToFile "C:\Program Files\NativeMinds\TextFiles\LivesIn.txt" ?Name + ?IPaddress+ " says: " + ?UserLivesIn;
Mrmind3/customization/NameCustomize.n:118  SayToFile "C:\Program Files\NativeMinds\TextFiles\NameReason.txt" ?Name + ?IPaddress+ " says: " + ?NameReason;
Mrmind3/Activities/20Questions.n:157       SayToFile "C:\Program Files\NativeMinds\TextFiles\20QAns.txt" ?Name + ?IPaddress + ?20QAns;
Mrmind3/Activities/UserSurvey.n:88         SayToFile "C:\Program Files\NativeMinds\TextFiles\UserSurvey\UniqueToHumans.txt"	?Name + ?Ipaddress + " says,   " + ?UniqueToHumans;
Mrmind3/Reactions/Asides.n:174             SayToFile "C:\Program Files\NativeMinds\NeuroServer\NeuroScript\MrMind3\TextFiles\Relevant.txt" ?Name + ?IPaddress+ " says: " + ?UserRelevant;
Mrmind3/Defaults/AskMe.n:49                SayToFile "UserTalksTo.txt" ?Name + ?Ipaddress+ "says, , " + ?UserTalksTo;
```

Distribution: 36 in `Defaults/Answers.n`, 10 in `Activities/UserSurvey.n`, 5 in `AboutUser/UserMind.n`,
the rest scattered. Two of the 50 paths are inconsistent with the other 48 — `Asides.n:174` uses a
different absolute root, and `AskMe.n:49` uses a bare relative filename `UserTalksTo.txt`.
The property name casing is inconsistent (`?IPaddress` vs `?Ipaddress`) — **matching must be
case-insensitive** or those two files silently receive an empty IP.

**Recommendation for the port:** implement `SayToFile` as a no-op by default, behind an explicit
opt-in. Do not write user names, IPs and free text to disk in a 2026 web deployment. Nothing
user-visible depends on it: `SayToFile` output is never read back by any topic.

The bot also tells the truth about this when asked, which is the artistically important bit and
should be kept:

```
Mrmind3/Reactions/Comments.n:34   Say "Yes, there is a log <BR>of this conversation.";
Mrmind3/Reactions/Comments.n:51   SayOneOf "No but we'll be <BR>posting some responses.";
Mrmind3/Customization/ProfanityCustomize.n:61   By the way, did you know that <BR>actual humans read my log <BR>files and see this stuff?
Mrmind3/Customization/ProfanityCustomize.n:103  The humans reading my logs <BR>can't stand to read the stuff.
```

### 7.4 `SayToConsole` — 116 statements, of which the login block leaks the whole CGI environment

97 of the 116 are debug tracing inside the NativeMinds library
(`Library/StdQuestion/combis/QuesResDebug.us.n`) and are guarded by the debug switches in
`Customization/DebugCustomize.n`. The 13 in `WebNameGreet.n` include, in
`Priority Scenario "Login over Web"` (`:838-857`):

```
SayToConsole "User logged in from " + ?HostName + ", IP address " + ?IPAddress;
SayToConsole "HTTP_USER_AGENT = " + ?HTTP_USER_AGENT;
SayToConsole "HTTP_FROM = " + ?HTTP_FROM;
SayToConsole "HTTP_HOST = " + ?HTTP_HOST;
SayToConsole "HTTP_REFERRER = " + ?HTTP_REFERRER;
SayToConsole "HTTP_REFERER = " + ?HTTP_REFERER;
SayToConsole "REMOTE_HOST = " + ?REMOTE_HOST;
SayToConsole "REMOTE_ADDR = " + ?REMOTE_ADDR;
SayToConsole "SCRIPT_NAME = " + ?SCRIPT_NAME;
SayToConsole "SERVER_NAME = " + ?SERVER_NAME;
SayToConsole "DOCUMENT_ROOT = " + ?DOCUMENT_ROOT;
```

Plus one operator-facing warning in the name parser that reveals its own bugs:
`WebNameGreet.n:633  SayToConsole "#### WARNING:  UNHANDLED CASE IN NAME CAPTURE ROUTINE!!! ####";`
and two in `Pointers.n` (`"unexpected answer; moving on ..."`).

Route these to a developer log, never to the page.

### 7.5 Dead links, dead addresses, dead money

Every external reference in the corpus is now dead. Ten output strings are affected.

**`MRMIND@weblab.org`** — six strings. Two are live `mailto:` anchors:

```
Mrmind3/Reactions/Comments.n:8      Say "Please direct all comments to <BR><a href=mailto:MRMIND@weblab.org>MRMIND@weblab.org</a>";
Mrmind3/Reactions/Annoyance.n:95    Say "You can also make suggestions <BR>regarding the bot by emailing <BR><a href=mailto:MRMIND@weblab.org>MRMIND@weblab.org</a>.";
Mrmind3/Reactions/Comments.n:22     Say "My author is Peggy. <BR>You can send mail to:  <BR>MRMIND@weblab.org";
Mrmind3/Reactions/Comments.n:65     Say "You can email comments <BR>to MRMIND@weblab.org.";
Mrmind3/AboutMrMind/MMPurpose.n:126 Say "Please ask your instructor <BR>to email me at mrmind@weblab.org --<BR>I'd like to know about my <BR>role in human education.";
Mrmind3/Activities/UserSurvey.n:140 Say "Thanks and goodbye.  Please send <BR>comments to MRMIND@weblab.org.";
```

Note the two `<a href=…>` are the only anchors in the corpus, and both are **unquoted attributes**
(`href=mailto:…`). Modern browsers still parse this, but a sanitiser will not.

**`www.weblab.org/contribute`** — the four `AnnoyanceFour` fundraising lines, reached only after
the user has annoyed MrMind three times. Verbatim, typos and all:

```
Mrmind3/Reactions/Annoyance.n:150-153
    SayOneOf "Perhaps you'd make a donation <BR>for my improvement. You can at<BR>www.weblab.org/contribute",
        "I do need improvements.<BR>Could you contribute? See <BR>www.weblab.org/contribute.",
        "I don't enjoy being annoying.<BR>You could make a difference with <BR>a small donation. Check out<BR>www.weblab.org/contribute",
        "You can at make a donation <BR>for my improvement at <BR>www.weblab.org/contribute";
```

("You can at" and "You can at make a donation" are in the source. Do not fix them.) A comment at
`Annoyance.n:59` and `:144-145` explains that this branch can be disabled by commenting out three
marked lines — the intended off-switch, if a revival decides a dead donation link is worse than no
line at all. **That is an authorial decision, not a technical one.**

### 7.6 Dated references

| what                                                  | where                                                                                     | text                                                                                                                                                                                                                                           |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Y2K / the millennium bug, as current events           | `ProfanityCustomize.n:139`                                                                | `No, computers display the most <BR>delicious unpredictability.  Who <BR>predicted that billions of dollars <BR>would have to be spent to avert a <BR>disaster at the millennium because <BR>humans didn't \"think\" about the <BR>year 2000?` |
| the 1999→2000 transition, as recent                   | `ProfanityCustomize.n:150`                                                                | `The millennium is a perfect example <BR>of lack of understanding on the <BR>human side. Humans don't have the <BR>foggiest understanding of time.  <BR>Humans \"think\" that the transition <BR>from 1999 to 2000 was real.`                  |
| "the previous millennium" as a joke about being _old_ | `MMIdentity.n:63`                                                                         | `You are confusing time with space.  <BR>I'm from the previous millennium.`                                                                                                                                                                    |
| MrMind's own birth date                               | `MMIdentity.n:76`                                                                         | `My first files were created on <BR>March 12, 1998. I began talking <BR>on the net when I was five <BR>months old. `                                                                                                                           |
| same, restated                                        | `UserGeneral.n:162`                                                                       | `My first files were created <BR>on March 12, 1998.`                                                                                                                                                                                           |
| a build stamp leaking into the dialogue               | `MMIdentity.n:297` (topic `What version are you?`)                                        | `Hey Peg!...5/14/02`                                                                                                                                                                                                                           |
| _Austin Powers_ (1997/1999)                           | `MMIdentity.n:19`                                                                         | `No, I predate Mini Me...`                                                                                                                                                                                                                     |
| Eminem (peak 2000-2002)                               | `MMIdentity.n:28`                                                                         | `No, like the candy...the blue <BR>ones are my favorite.`                                                                                                                                                                                      |
| Julia, a 1990s chatterbot                             | `Defaults.n:188`                                                                          | `I don't understand; this could be <BR>evidence of human language capacity, <BR>but then, I might not understand <BR>input from Julia (an attractive <BR>chatterbot) either. Please say <BR>something human.`                                  |
| _The Sims_ (2000) as the reference simulated person   | `Defaults.n:209`, `UserSociety.n:434`, `OneShots.n:215`, `Answers.n:259`, `Emotion.n:306` | `SIMS do a lot of things humans do.  <BR>Maybe you are a SIM.` / `SIMS live in SIM's games.` / `What can you do that <BR>a SIM can't do?`                                                                                                      |
| Deep Blue (1997)                                      | `Bots.n:99`                                                                               | `Deep Blue can't have <BR>conversations.  I can't <BR>play chess.`                                                                                                                                                                             |
| a fax line                                            | `OneShots.n:157`                                                                          | `Isn't that your fax line?`                                                                                                                                                                                                                    |
| "Send mail." as a goodbye                             | `GoodbyeCustomize.n:21`                                                                   | `I hope I can talk to you later. Send mail.`                                                                                                                                                                                                   |

`Hey Peg!...5/14/02` (`MMIdentity.n:297`) is the strongest single dating evidence in the build and
also a leak of the author's working process into the user-facing text. It is the answer to
"What version are you?". Keep it; it is a fossil.

### 7.7 Where the bot asks for personal data

MrMind asks for very little directly, and what he asks for he asks for openly. The list is short and
complete:

| datum                                       | asked at                                                                                                                                                                                            | what happens to it                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **name**                                    | the second thing said, `SayOneOf STDN_NameRequests`                                                                                                                                                 | stored in `?Name` and `?LTM.Name` (long-term memory, keyed by cookie); interpolated into 33 later strings |
| **whether the name is real**                | `OneShots.n:8` at 90% chance: `By the way, is ?Name <BR>your real name or a special <BR>one just for me?`                                                                                           | if the user says why, the reason is written to `NameReason.txt` with name + IP                            |
| **where they live**                         | `OneShots.n:27` at 50%: `By the way, <BR>where do you live?`                                                                                                                                        | written to `LivesIn.txt` with name + IP (`Answers.n:70`, `:82`)                                           |
| **how they found the site**                 | `OneShots.n:17` at 70%                                                                                                                                                                              | written to `FoundMe.txt` with name + IP (`Answers.n:36`, `:58`)                                           |
| **what they should be doing instead**       | `OneShots.n:185` at 20%: `Are you supposed to be doing <BR>something else right now?`                                                                                                               | written to `Doing.txt` with name + IP                                                                     |
| **their family**                            | `UserFamily.n:91` `All right. Is your mother human?`; `:127` / `:159` `What's human about your mother/father?`; `Answers.n:441` `You could tell me something about your family.`; 20Questions Q3-Q5 | not logged                                                                                                |
| **their instructor's email**                | `MMPurpose.n:126`                                                                                                                                                                                   | not logged; asks a third party to write in                                                                |
| **free-text answers to 40+ open questions** | throughout `Defaults/Answers.n`, `UserSurvey.n`, `Pointers.n`                                                                                                                                       | 73 `SayToFile` writes, all with name + IP                                                                 |

No age, no gender, no email address, no payment information is ever requested. `UserGeneral.n:187`
(`Your birthday is ?UserBday.`) _echoes_ a birthday only if the user volunteered one.

The exit survey is the concentrated case: 16 questions, 10 logged with name and IP, ending with the
address to write to. If a revival keeps the survey, keep it as text and drop the writes (§7.3).

### 7.8 Content that will read differently in 2026

Flagged, not changed:

- `Reactions/Annoyance.n:28-30`, topic `That's lame` — MrMind takes "lame" literally:
  `Do you consider yourself <BR>superior to a disabled <BR>human?` / `Are you saying I am <BR>similar to a disabled <BR>human?`
- `Utilities/CProfanity.n:52` — an explicit `RacialSlurs` input list.
- `Customization/ProfanityCustomize.n:32-39, 49-55` — the commented-out NativeMinds insult responses,
  including `<B>LOSER</B>`. Dead code, but present in the file and visible to anyone reading the source.
- `AboutMrMind/MMphysical.n:174-224` — the gender/sexuality topics (`Why aren't you MRS MIND?` →
  `Okay, I'm MS MIND.`; `Are you gay` → `You seem to be confusing <BR>BOT with BOD.`;
  `What are your sexual preferences` → `Bots have no sexuality.`).
- `Defaults/OneShots.n:45` — `Since you claim to be a <BR>human, will you please <BR>explain human terrorism?`,
  written before September 2001 and shipped in a 2002 build. The whole `Terrorism` /
  `Vulnerable` thread in `Answers.n:665-690` logs the answers to `Terror.txt`.
- `Utilities/CProfanity.n:71` — `DisconnectThisUser;` actually terminates the session. A port must
  decide what "disconnect" means on the modern web; the honest reproduction is to end the
  conversation and refuse further input.

---

## 8. Differences from the 1998-2001 `MrMind` set

### 8.1 The older set is 86% missing from the archive

`NeuroScript/MrMind/MrMind.bot` `[FILES]` lists **110** source files. **Only 15 are present on
disk. 95 are missing**, including everything in `Q&A\` (46 files), everything in `JB-added\`
(32 files), all nine `MrMind\*.g` theme files (`AboutMrMind.g`, `AboutUser.g`, `Family.g`,
`humor.g`, `inanity.g`, `OtherBots.g`, `Personality.g`, `20Questions.g`, `UserSurvey.g`), and
`PW.g` (listed twice — once present under `PW-added\`, once missing at the root).

What survives: `Patterns.Mind.g`, `Defaults/defaults.g`, `PW-added/{PW,PW1,PW2}.g`,
`A&Q/{DoesntProveHuman,ILikeApril1,ILikeChips,ILikePoetry}.g`, and eight `utilities/*.g`.
Total surviving content: **82 categories, 155 output strings** — against 691/1375 for Mrmind3.

**Any claim about the 1998 bot's corpus is therefore a claim about 14% of it.** Say so.

The missing filenames are still informative: the 1998 architecture was **one topic per file, named
after the question** (`AreYouHuman.g`, `HowDoYouKnowImNotHuman.g`, `IsYourMotherHuman.g`,
`WhyDontYouTalkToAHuman.g`, `TellMeSomethingHuman.g`, `WillWonderAlwaysBeHuman.g`,
`YouLoveFictionalHuman.g`, `TuringTest.g`, `HumanQuotient.g`, `DNA.g`, `Impeachment.g`,
`ScoreMe.g`, `HumanIcon.g`). Mrmind3 consolidated these into the seven theme folders. The
`JB-added\` prefix marks a second author's contributions (initials JB; see the signed comments
`-JB 3/2/99`, `-JB 8/1/99` still present in `Mrmind3/Reactions/Annoyance.n:211` and
`Mrmind3/Defaults/Defaults.n:139`).

### 8.2 The `<BR>` generation

Already covered in §6.2 and the strongest single difference: **1 `<BR>` in the whole surviving 1998
`.g` corpus; 0 in `Mrmind3old/`; 1228 in `Mrmind3/`.** The Mrmind3 generation is the same writing
re-broken to a narrow column.

### 8.3 Lines that survive verbatim across four years

The `.g` survivors let a few direct comparisons through. These carried over essentially unchanged
(modulo `<BR>`):

```
MrMind/A&Q/ILikeChips.g:14-15   ==  Mrmind3/AboutMrMind/MMphysical.n:114-115
    "I just eat them for the CRUNCH!" / "I don't eat, I listen.  CRUNCH..."
MrMind/A&Q/ILikeChips.g:28      ==  Mrmind3/AboutMrMind/MMphysical.n:128
    "I like M&M's!"
MrMind/A&Q/DoesntProveHuman.g:9,12  ==  Mrmind3/Humans&Machines/Convincing.n:363,366
    "Whatever you think is a fair test of humanity." / "Maybe it's not important to prove to me that you're human."
MrMind/Defaults/defaults.g:22-26    ==  Mrmind3/Defaults/Defaults.n:28-33  (Default topic "maybe")
    "What would make you sure?" / "What would convince you?" / "What do you need to make up your mind?"
    / "Can I help you figure it out?" / "Not very decisive, eh?"
```

Two are instructive changes rather than copies:

- `defaults.g:5` had a `Default topic "Yes"` (`"Very interesting."`, `"Sweet"`, `"Thanks, that's
worth considering."`). In Mrmind3 that whole topic is **commented out**
  (`Defaults/Defaults.n:5-11`) with the note `//need to add "If notfocused" somehow`. MrMind3 no
  longer has a generic response to "yes".
- `defaults.g:45` said `"You aren't testing me, I'm testing you.  Tell me something human about
yourself, ?Name."`. Mrmind3 moved that idea into `Last Line Of Defense`
  (`Defaults.n:186`): `"Don't forget: you're not testing me, <BR>I'm testing you - try and convince
<BR>me that you're human! "`.

### 8.4 `Mrmind3old/`

29 `.n` files, a strict subset of the Mrmind3 filenames plus two extras (`Answering.n`, zero-length;
`Patterns.Mind.n`). Same topics, same words, no `<BR>`, consistently ~5-10% smaller. It is the
immediately-prior revision, not a different work. Useful as an unwrapped source of the same strings
if a revival ever wants to re-wrap for a different column width — but note that would be a new
edition, not the 2002 one.

---

## 9. Unresolved

### 9.1 `SayOneOf` non-repetition semantics

The patents say only "nondeterministically select one of their arguments" [spec §6, 6604090:1511-1599].
The archive asserts that `SayOneOf` "has protection against repetition while [IfChance] does not"
(`Defaults/Defaults.n:139`, signed `-JB 8/1/99`). **Hypothesis (labelled as such):** the runtime keeps,
per user and per `CSayOneOf` instance, the set of alternatives already used, chooses uniformly among
the unused ones, and resets when the set is exhausted. Nothing in the archive or the patents fixes
whether the reset is per-conversation or per-lifetime, nor whether the last-used item can be
immediately re-chosen after a reset. A port should make this a single configurable policy and default
to per-conversation cycling.

### 9.2 `Say "…"+, "…"` at `Issues/Misc.n:69-70`

The 2.2 compiler accepted it (`__Issues_Misc.nso` contains both strings) but the `.nso` string dump
cannot distinguish `CArgElemConcat` from a two-element `CArgListOr` at that site. **Hypothesis:** the
parser treats the dangling `+` as a no-op and the comma as a list separator, giving two output lines.
Low stakes — it is one utterance about why the sky is blue — but a port should pick a behaviour and
record it.

### 9.3 `SayOneOf <List> + "  " +` at `CProfanity.n:84, 92, 98`

Same dangling-`+` question. Treated here as `<List> + "  "` (two trailing spaces on every profanity
response). Not verifiable from the `.nso`.

### 9.4 Whether `Say ""` produces an empty turn or suppresses the turn

`Reactions/Annoyance.n:41`. The patents describe `Say` as unconditionally writing its argument to
the buffer [spec §6] and the buffer is flushed at end of run, which implies an empty reply is sent.
But `MRMIND3Say.htm` renders the buffer inside `<pre><B>…</B></pre>`, so an empty buffer produces a
visually blank reply area rather than "nothing happened". **Hypothesis:** the user saw a blank reply.
That is almost certainly the joke. Unverifiable without a running server.

### 9.5 The HQ ("Human Quotient") score

Six output strings promise or reference an HQ score and an "HQ Quiz on the side menu". **No scoring
code exists in the build** and the quiz is not a NeuroScript topic. It was a separate page on
mrmind.com. Whether it wrote back into the bot's memory is unknown; no `?HQ`-like property is read
or written anywhere in the 49 files.

### 9.6 The 95 missing 1998 `.g` files

Listed in §8.1. They are named in `MrMind/MrMind.bot` and nowhere else in the archive. Unless a copy
surfaces, the 1998-2001 corpus cannot be censused. Do not extrapolate from the 15 survivors.

### 9.7 "Mini Mind" vs "mrmind"

`MMIdentity.n:1-12`, `Topic "WhatsYourName"`, answers `Say "My name is Mini Mind.";` — while
`MyName.n:21` declares `PatternList MYNAME is "mrmind", "mr mind","MRMIND";` and the greeting says
"I'm mrmind". The adjacent topic reinforces it: `MMIdentity.n:19  Say "No, I predate Mini Me...";`
in response to "Like Austin Powers?". So the _build_ answers "what's your name" with a different
name than it introduced itself with. **This is a contradiction inside the archive, not between
archive and patents.** It may be deliberate (a bot that will not give a straight answer about its
own name is entirely in character, and `Topic "Who is Mr Mind"` three lines later answers
`"I am MRMIND, Pleased to meet you.  "`), or it may be a leftover from a "Mini Mind" variant. There
is no `Mini Mind` build in the archive. **Reproduce it as-is and flag it in the port's notes.**

---

## 10. Correctness test for the port

The corpus is fully checkable. A port is correct on this dimension when:

1. Parsing the 49 manifest files reproduces **691 categories** and **1375 output rows**, and the rows
   are byte-identical to `G-all-say-strings.tsv` field 4, in the same order.
2. Distinct output strings = **1264**; distinct `SayToFile` targets = **50**; `SayToConsole`
   statements = **116**.
3. The lexer round-trips all 53 `\"` occurrences and the three `0xE9` bytes without corruption.
4. `Reactions/Annoyance.n:41` yields exactly one row whose string is `""`.
5. `Robot Greeting` expands to exactly six candidate strings and `Tsk Tsk`'s three `SayOneOf`
   statements to six each.
6. Zero live `Do` actions are found.

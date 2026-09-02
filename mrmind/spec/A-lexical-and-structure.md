# A. Lexical structure and top-level grammar of NeuroScript 2.2

Specification for a faithful, model-free JavaScript re-implementation of the MrMind engine.

**Scope.** Everything a lexer and a top-level parser need: bytes on disk, whitespace, comments, string
literals and their one escape, identifiers, case rules, statement termination, the complete set of
top-level statement forms, and how a set of `.n` files becomes one program via the `.vsr` project file.
Patterns (`*`, `#`, `+`, `( )`, `{ }`, `,` inside a pattern), conditions, commands and the run loop are
other dimensions; this document specifies only the surface syntax that encloses them, and refers to a
non-terminal `PatList` that dimension B defines.

**Ground truth.** The shipped bot is `Mrmind3`, whose build manifest is
`/Users/halim/Documents/oulipo/mrmind/archive/1_NeuroServer_fromVaio_MrMind/NeuroScript/Mrmind3/MRMIND3.vsr`.
Its `[FILES]` section lists **49** source files (not 50); all 49 resolve on disk. Unless stated otherwise
every count below is over exactly those 49 files ("the build"), read as bytes and normalised only by
converting CRLF to LF. Corpus size: 489,625 bytes, 14,180 lines, of which 2,585 are blank, 997 are
comment-only and 160 carry a trailing comment.

Where the archive and the patent-derived spec (`archive/_research/patents/GERBIL-LANGUAGE-NOTES.md`,
cited as `[spec §N]`) disagree, the archive wins and the disagreement is called out in §11.

---

## 1. Files, encoding, line endings, damaged files

### 1.1 Encoding

- Single-byte, **Windows-1252 / Latin-1**. Not UTF-8, not UTF-16, no BOM anywhere.
- The entire 49-file build contains exactly **three** non-ASCII bytes, all `0xE9` (`é`), all in one file:

  ```
  Mrmind3/AboutMrMind/MMIdentity.n:204   Say "You can spend an evening with <BR>Monsieur Teste if you track down <BR>Paul Valéry.";
  Mrmind3/AboutMrMind/MMIdentity.n:213   If ?WhoQuestion contains ("Paul Valery","Paul Valéry")
  Mrmind3/AboutMrMind/MMIdentity.n:217   SayOneOf "You can find Paul Valéry <BR>in the library.";
  ```

  Reading these as UTF-8 throws. **Decode `.n` files as `latin1`/`windows-1252`, then work in JS strings.**
  If the port re-serialises output as UTF-8, `é` must survive; nothing else in the corpus is affected.

- No control characters other than CR (0x0D), LF (0x0A) and TAB (0x09) occur anywhere in the build.

### 1.2 Line endings

- **Every** `.n` file in the archive is uniformly CRLF. There is not one mixed-ending or LF-only script.
- CR is pure whitespace to the lexer. Strip `\r` (or treat CR as whitespace) before any line-based work;
  a naive line splitter that keeps `\r` will corrupt trailing tokens and turn `Done\r` into an unknown word.
- Line numbers cited in this document are 1-based over the CRLF-normalised text, matching what a
  `sed 's/\r$//' file | nl` pipeline shows.

### 1.3 Damaged / empty files (report, do not silently treat as empty scripts)

Four `.n` files in the archive are **zero bytes**. None is NUL-filled; none is in the Mrmind3 build:

| File                                | Size | In build? |
| ----------------------------------- | ---- | --------- |
| `Mrmind3/Activities/picutres.n`     | 0    | no        |
| `Mrmind3/AboutMrMind/MMfamily.n`    | 0    | no        |
| `Mrmind3old/Answering.n`            | 0    | no        |
| `Mrmind3old/AboutMrMind/MMfamily.n` | 0    | no        |

One near-empty file, also not in the build: `Mrmind3/Defaults/Switches.n`, 18 bytes, six empty CRLF lines
plus a line of two tabs and two spaces. It parses as the empty program.

Because none of these is referenced by `MRMIND3.vsr`, the port never loads them. A loader that is pointed
at a directory rather than the manifest must refuse them loudly rather than treat 0 bytes as "a script
with no topics".

### 1.4 Other file types in the tree (not NeuroScript source)

- `.vsr` — project/build manifest (§10). `.vsr.BAK` — its previous version.
- `.nso` — compiled objects under `NSOBJ/` (§12).
- `.vre`, `.vri`, `.sdb`, `.cdb`, `.ltm` — runtime/database artefacts.
- `.tlx` / `.clx` / `.cth` — spell-check lexicons and thesaurus. A `.tlx` is a `#LID <n>` header line
  followed by tab-separated `WORD<TAB>i` lines (`Mrmind3/MRMIND3.tlx` starts `#LID 30840`). Not script.
- `.ntm` — hierarchy _templates_ (`Library/Hierarchy/*.ntm`), NeuroScript-shaped but used by the
  hierarchical-bot generator, not compiled directly. None is in the MrMind build.

---

## 2. Whitespace and free-form layout

Space, TAB, CR and LF are all interchangeable whitespace with no other significance.

- **Newlines terminate nothing.** Statements are terminated by `;` (§6), blocks by keywords.
- A statement may span any number of lines; a `;` may sit alone on its own line. Real example, verbatim:

  ```
  Mrmind3/Patterns.n:421   PatternList MOTHER is "Mom","Ma","mother","momma","mama","mommy","mere","Madre"
  Mrmind3/Patterns.n:422   ;
  ```

- A definition may put its whole body on later lines, with blank lines in the middle:

  ```
  Mrmind3/Patterns.n:476   PatternList PLACENAME is
  Mrmind3/Patterns.n:477
  Mrmind3/Patterns.n:478
  Mrmind3/Patterns.n:479
  Mrmind3/Patterns.n:480       "springs","mountain#","north#","south#","east#","west#","up","over","down","across",
  ```

- Indentation is decorative only. The corpus mixes tabs and spaces freely, including inside otherwise
  identical statements.
- Two tokens may be juxtaposed with no space where the character classes differ (`"a"+"b"`, `?Name+","`).

---

## 3. Comments

### 3.1 The only comment form

`//` to end of line. There are **no block comments**. `/* … */` never appears in any `.n` file in the
archive (the strings that grep finds as `/*` are all inside `//****…` banner rules, i.e. already inside a
line comment). No `#`, `--`, `;` or `REM` comment form exists.

### 3.2 Interaction with string literals — load-bearing

A `//` **inside a string literal is not a comment.** The lexer must scan string literals before it looks
for comments. Proof, from the wider archive — no live string in the Mrmind3 build contains `//`, but 36
elsewhere in the archive do (23 in `Base`, 5 in `HttpExample`, 4 in `Library`, 4 in `Copy of Library`):

```
Base/Defaults/HighDefault.n:60    "http://www.netfunny.com/cgi-bin/randomurl/rhf/jokes/masterlist"
Base/Inanities/Personality.n:1632 "Speciallogs//WhereFrom"
Base/NativeMinds/vReps.n:66       "<a href=http://www.nativeminds.com target=_top> NativeMinds, inc.</a>"
```

Stripping comments before parsing strings would truncate these to unterminated literals.

### 3.3 Conventions in the corpus (not language rules)

- Vendor files begin with a banner block of `//***…*` rules and a copyright, e.g.
  `Mrmind3/Customization/GoodbyeCustomize.n:1-11`, `Library/StdQuestion/StdQuestion.us.n:1-14`.
- Author files carry dated maintenance notes: `Mrmind3/Patterns.n:24  //note 'regret' has it's own pattern to give it another reply but that was deleted...`
- Large amounts of dead code are commented out line-by-line; a commented-out block may contain an
  _unterminated_ or multi-line string (`Mrmind3/Issues/Misc.n:133-136`). This is harmless because the
  comment is removed first, but it means a "count the quotes" sanity check must ignore comments.

---

## 4. String literals

### 4.1 Form

```
String = '"' { StringChar } '"' ;
StringChar = '\' AnyChar | any character except '"' and '\' ;
```

- Delimited by ASCII double quotes only. No single-quoted strings: `'` is an ordinary character
  (`"don't"`, `"I'm my own Bot"`), never a delimiter.
- **Strings do not span lines** anywhere in the build. Checked mechanically: of the 14,180 lines, exactly
  10 have an odd number of unescaped `"` and all 10 are inside `//` comments. Treat an unterminated
  literal at end of line as an error, but see §11.4 for the one commented-out counter-example.
- 12,828 string literals occur in the build.

### 4.2 The backslash escape — exactly one character is consumed

This is the single most misunderstood point and it is settled by the compiled objects.

**Rule.** On `\`, consume the backslash and the following character. If that character is `"`, emit `"`
alone. **Otherwise emit both the backslash and the character**, unchanged.

Evidence, source → compiled `.nso` string:

| Source (file:line)                               | Source text                                               | Compiled string in `.nso`                               |
| ------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------- |
| `Mrmind3/Customization/ProfanityCustomize.n:139` | `…humans didn't \"think\" about the…`                     | `…humans didn't "think" about the…`                     |
| `Mrmind3/customization/NameCustomize.n:118`      | `"C:\Program Files\NativeMinds\TextFiles\NameReason.txt"` | `C:\Program Files\NativeMinds\TextFiles\NameReason.txt` |
| `Mrmind3/Utilities/WebNameGreet.n:665`           | `PatternList Punc is "\.","\?","\!","\,";`                | four 2-byte strings `\.` `\?` `\!` `\,`                 |
| `Mrmind3/Patterns.n:31`                          | `"#\'s"`                                                  | `#\'s` (4 chars)                                        |
| `Mrmind3/Utilities/WebNameGreet.n:538`           | `"*\,*\,*\,*"`                                            | `*\,*\,*\,*` (10 chars)                                 |

(The `.nso` values were read directly out of `Mrmind3/NSOBJ/__customization_NameCustomize.nso`,
`__Customization_ProfanityCustomize.nso` and `__Utilities_WebNameGreet.nso`, where every string is stored
length-prefixed.)

So `\` is **not** a C-style escape introducer. It is a _pattern-level_ marker meaning "the next character
is a literal punctuation character, not a pattern metacharacter or a word separator", and it survives the
string lexer intact so the pattern compiler can see it. The only string-level job the backslash does is
to let a `"` appear inside a literal.

Consequences for the port:

1. `unescape("\\.") === "\\."` — two characters. Do **not** map `\.` to `.` in the lexer.
2. `unescape('\\"') === '"'` — one character. This is the only reduction.
3. Windows paths in `SayToFile` arguments come through verbatim: `"C:\Program Files\…\Joke.txt"` stays a
   valid Windows path. A C-style lexer would corrupt it to `C:Program FilesNativeMindsTextFilesJoke.txt`.
4. A backslash immediately before the closing quote (`"foo\"`) would swallow the quote and is therefore
   ill-formed. It does not occur in the archive.

**Frequency of `\X` in the build**, so the port knows what it must survive
(`\T` 81, `\N` 75, `\P` 73 — these are all inside `C:\Program Files\NativeMinds\TextFiles\…`;
`\"` 51; `\'` 25; `\.` 21; `\S` 19; `\A` 16; `\U` 15; `\,` 11; `\D` 9; `\M` 8; `\W` 7; `\L` 6;
`\*` 6; `\)` 6; `\(` 6; `\F` 5; `\C` 5; `\?` 5; `\O` 3; `\R` 2; `\H` 2; `\B` 2; `\&` 2;
`\Q` `\K` `\J` `\I` `\E` `\2` `\!` one each).

`\\` **never occurs in a live string in the Mrmind3 build** (its one appearance,
`Mrmind3/AboutMrMind/MMIdentity.n:179`, is inside a `//` comment). It occurs in **61 live string
literals** in the sibling `Base` bot, spread over six files, always inside a log path
(`Base/context-free/why.n:20  SaytoFile "speciallogs\\why.log" ?WhatRobotSaid;`). Under the rule above
that yields a two-backslash path, which Windows also accepts; the author was probably writing C out of
habit. Since it is absent from the shipped bot the port may treat `\\` either way; §11.3 lists it as
unresolved.

### 4.3 Embedded markup

Strings routinely contain HTML, which is opaque to the language — `<` and `>` are ordinary characters.
In the build, 1,238 angle-bracket runs occur inside string literals:

| tag                                                 | count                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| `<BR>`                                              | 1214                                                                      |
| `<B>` / `</B>`                                      | 14                                                                        |
| `<a href=…>` / `</a>`                               | 4                                                                         |
| `<Otherbot>`, `<other bot>`, `<AGE>`, `<Fictional>` | 6 (these are inside _topic-name_ strings, as human-readable placeholders) |

Verbatim:

```
Mrmind3/Issues/Choice.n:66     Say "If you didn't choose to be human, <BR>then how can you say you have <BR>\"choice\"?  ";
Mrmind3/Humans&Machines/Bots.n:10  Topic "Are you <Otherbot>" is
Base/NativeMinds/vReps.n:66    "<a href=http://www.nativeminds.com target=_top> NativeMinds, inc.</a>"
```

`<BR>` is how the author controls line wrapping in the web front end. The engine must pass it through
untouched; nothing in the language interprets it.

Note the double quotes inside the unquoted HTML attribute in `Base` are avoided by the author precisely
because `\"` would be needed. `<a href = /MrMindFiles/woodchuck.htm target=Display>` appears
(commented out) at `Mrmind3/Issues/Choice.n:68`.

### 4.4 The empty string

`""` is a legal, meaningful literal (it makes a pattern-list element optional):

```
Mrmind3/Patterns.n:33          PatternList OPTARTICLE is ARTICLES,"";
Mrmind3/Customization/DebugCustomize.n:28   Pattern SDeb.LIVEDEBUGGING is "";
```

Six PatternLists in the build contain an explicit `""` element.

---

## 5. Identifiers, symbols, references

Four distinct lexical classes start a "name":

```
Symbol   = Letter { Letter | Digit | "_" | "." } ;          -- pattern / pattern-list names, keywords
MemRef   = "?" NameChar { NameChar } ;   NameChar = Letter | Digit | "_" | "."
StarRef  = "*" Digit+ | "#" Digit+ | "^" Digit+ | "*Match"
Number   = Digit+ [ "." Digit+ ] [ "%" ]
```

### 5.1 Symbols (pattern and pattern-list names, and keywords)

Observed character set across the 49 build files: **letters, `_`, `.`**. Nothing else.

- **Dots** are legal inside a symbol, contradicting the patent BNF's "alphanumeric or underscore
  characters" `[spec §1]`. 88 distinct dotted symbols occur, in two idioms:
  - library namespacing — `StdP.QuestionStarts`, `StdQ.QUESTIONWORDS`, `SDeb.CONSOLEDEBUGGING`,
    `STDX.RESPONSE_TO_SEXUAL`, `StdResponse.Negative`, `NameCapture.Titles`;
  - thesaurus part-of-speech suffixes — `BOTHER_AGGRAVATE.V`, `BAD_BAD.ADJ`, `CRAZY_LUNATIC.N`,
    `DISEASE.N`, `FEAR.V`, `FEAR.N`.
    The dot is **not** an operator: `StdP.QuestionStarts` is one token, not a field access. The compiled
    objects store the whole dotted string as the list's name.
- **Underscores** are legal anywhere after the first letter. 44 distinct symbols use them
  (`STDN_RESPONSETOREFUSAL`, `STD_Goodbye_Contains`, `LONELY_DESOLATE.ADJ`, `Pseudo_Hello`).
- **Digits never occur in a symbol** anywhere in the build. Accept them (the patent BNF does) but do not
  rely on them.
- **`&` never occurs in a symbol.** The `&` in `Humans&Machines` is a _directory_ name in the `.vsr`
  manifest and in the on-disk path, not a NeuroScript identifier. `&` appears in NeuroScript source only
  (a) inside string literals — `"I like M&M's!"`, `Mrmind3/AboutMrMind/MMphysical.n:128` — and
  (b) once, as an operator, `Mrmind3/Defaults/Answers.n:285`: `And ?DescriptionQuestion contains (YOU & "think")`.
  That single occurrence is a pattern-level operator, not a name character; see §11.2.
- Spaces are never inside a symbol. Multi-word names live in _string_ literals (topic names, subjects).

### 5.2 Memory references

`?` immediately followed by the name; no space between. 22 dotted memrefs occur
(`?StdQ.LocalQuestion`, `?NameCapture.TempName`, `?StdP.DoneStrippingPunctuation`, `?LTM.Name`,
`?STDX.TEST`). Unlike symbols, **memref names may contain and even begin with digits**:

```
Mrmind3/Activities/20Questions.n:157   SayToFile "…\20QAns.txt" ?Name + ?IPaddress + ?20QAns;
```

Full list of digit-bearing memrefs in the build: `?20QAns`, `?20Questions`, `?20questions`, `?Name1`,
`?Name2`, `?RememberAnnoy1..3`, `?String1`, `?String2`, `?UserFoundMe2`, `?UserLimitCould2`,
`?UserLimitShould2`, `?UserTcontest2`, `?UserTerror1`.

Lexer rule: after `?`, take the longest run of `[A-Za-z0-9_.]`.

### 5.3 Star-buffer references

`*1`, `*2`, `#1`, `^1`, `^2`, and the bare word `*Match`. These are lexed as single tokens, not as
`*` followed by a number. Verbatim:

```
Mrmind3/Utilities/WebNameGreet.n:538   If ?NameCapture.TempName Matches "*\,*\,*\,*" then remember ?NameCapture.TempName is *1; Continue
Mrmind3/Utilities/WebNameGreet.n:622   Remember ?NameCapture.TempName is ^1+"."+^2+".";
Mrmind3/Humans&Machines/Bots.n:16      Say "I'm my own Bot, but <BR>"+*Match+" is a relative.";
```

`^1`/`^2` occur only twice (`WebNameGreet.n:622`, `:686`). Semantics belong to dimension B; lexically
they behave exactly like `*1`.

### 5.4 Numbers

Integers (`Attribute … Specificity 3000;`, `InitialExample 2 "…";`), decimals (`IfChance 0.90`,
28 occurrences of a `.` inside a number) and percentages (`IfChance 33%`, `AND Chance 60%`, 14 `%`
tokens outside string literals). `%` is a suffix on a number here; inside a _string_ it is a
pattern wildcard, a different thing entirely.

---

## 6. Case sensitivity

**All keywords are case-insensitive. Symbol and memref names are also case-insensitive.**

The archive proves this by accident: authors typed the same keyword many ways and the compiler accepted
all of them. Complete census of keyword spellings over the 49 build files (token counts, comments and
string literals excluded):

| keyword (lowercased) | total | spellings observed                                              |
| -------------------- | ----- | --------------------------------------------------------------- |
| `if`                 | 1035  | If=960, if=75                                                   |
| `then`               | 1362  | Then=786, then=576                                              |
| `is`                 | 1447  | is=1441, IS=5, Is=1                                             |
| `topic`              | 688   | Topic=602, topic=86                                             |
| `endtopic`           | 688   | EndTopic=603, Endtopic=85                                       |
| `done`               | 759   | Done=756, done=3                                                |
| `continue`           | 414   | Continue=306, continue=108                                      |
| `subjects`           | 633   | Subjects=544, SUBJECTS=62, subjects=27                          |
| `contains`           | 798   | Contains=450, contains=347, CONTAINS=1                          |
| `matches`            | 570   | matches=468, Matches=102                                        |
| `and`                | 688   | and=577, AND=84, And=27                                         |
| `or`                 | 519   | or=404, OR=83, Or=32                                            |
| `remember`           | 571   | Remember=496, remember=75                                       |
| `say`                | 555   | Say=552, say=3                                                  |
| `sayoneof`           | 305   | SayOneOf=301, SayOneof=2, Sayoneof=1, SayoneOf=1                |
| `switchback`         | 286   | SwitchBack=213, Switchback=71, switchback=2                     |
| `patternlist`        | 228   | PatternList=222, Patternlist=6                                  |
| `otherexamples`      | 182   | OtherExamples=181, Otherexamples=1                              |
| `heard`              | 183   | Heard=114, heard=69                                             |
| `recall`             | 168   | Recall=145, recall=22, RECALL=1                                 |
| `switchto`           | 134   | SwitchTo=124, Switchto=10                                       |
| `always`             | 123   | Always=90, always=33                                            |
| `saytoconsole`       | 116   | SayToConsole=110, SaytoConsole=6                                |
| `otherwise`          | 107   | Otherwise=75, otherwise=32                                      |
| `ifchance`           | 102   | IfChance=89, Ifchance=12, ifchance=1                            |
| `focused`            | 96    | Focused=88, FOCUSED=8                                           |
| `waitforresponse`    | 89    | WaitForResponse=83, WaitforResponse=5, WaitFOrResponse=1        |
| `forget`             | 82    | Forget=51, forget=31                                            |
| `focus`              | 69    | Focus=66, focus=3                                               |
| `dontrecall`         | 59    | DontRecall=56, dontrecall=2, dontRecall=1                       |
| `whenfocused`        | 46    | WhenFocused=31, whenfocused=10, Whenfocused=5                   |
| `ifheard`            | 40    | IfHeard=39, Ifheard=1                                           |
| `doesnotmatch`       | 37    | DoesNotMatch=31, doesNotMatch=4, doesnotMatch=1, DoesNotmatch=1 |
| `this`               | 36    | This=35, this=1                                                 |
| `doesnotcontain`     | 11    | DoesNotContain=5, doesnotcontain=4, doesNotContain=2            |
| `compute`            | 8     | compute=5, Compute=3                                            |
| `not`                | 5     | NOT=4, not=1                                                    |

Keywords with only one observed spelling in the build (do not infer case sensitivity from this):
`Attribute` 33, `Specificity` 33, `Pattern` 3, `Priority` 33, `Default` 38, `Sequence` 61,
`Scenario`/`EndScenario` 3 each, `MemoryLock` 33, `Example` 545, `IfRecall` 186, `IfDontRecall` 11,
`NextTopic` 17, `TryAgain` 9, `SayToFile` 73, `DontFocus` 58, `Suppress` 37, `InterruptSequence` 3,
`InitialExample` 2, `Trace` 4, `DisconnectThisUser` 1, `ExactlyMatches` 1, `Chance` 1, `When` 1,
`are` 182, `of` 190.

**Names are case-insensitive too.** Same list referenced two ways:

```
Mrmind3/Customization/DebugCustomize.n:27   Pattern SDeb.CONSOLEDEBUGGING is "QSR";
Mrmind3/Customization/DebugCustomize.n:29   Pattern Sdeb.EXAMPLEDEBUGGING is "PQRS";
Mrmind3/Utilities/WebNameGreet.n:547        If ?NameCapture.Tempname matches …
Mrmind3/Utilities/WebNameGreet.n:538        If ?NameCapture.TempName Matches …
```

`?StdS.LocalStatement` / `?StdS.Localstatement` / `?Stds.LocalStatement` / `?stdS.localstatement` are all
the same attribute in `QuesResDebug.us.n`. **Implement every symbol table with a case-folded key.**
Topic-name strings used by `SwitchTo`/`Suppress`/`Focus` are matched case-insensitively too — see
`Mrmind3/Utilities/CProfanity.n:112 And (?LastTopic matches "Tsk Tsk","why (stop that)")` against the
declaration `Topic "why (stop that)" is` at line 122.

Keywords are **reserved only positionally**: `Topic "Decisions" is` uses `is` as a keyword while
`PatternList BELIEVE is "Believe", …` contains the word "believe" as data. Because keywords are only
recognised where the grammar expects them, a pattern-list _name_ could in principle collide with a
keyword; none does in the archive.

---

## 7. Statement terminators: where `;` is and is not required

`;` is required at the end of a **declaration** and of a **command**. It is **never** written after a
block terminator or a block/category keyword. This is not a style preference; it is uniform across the
whole build.

Mechanical census (token immediately following the keyword):

| keyword              | occurrences | followed by `;` | followed by something else |
| -------------------- | ----------- | --------------- | -------------------------- |
| `Done`               | 759         | 0               | 759                        |
| `Continue`           | 414         | 0               | 414                        |
| `SwitchBack`         | 286         | 0               | 286                        |
| `NextTopic`          | 17          | 0               | 17                         |
| `TryAgain`           | 9           | 0               | 9                          |
| `EndTopic`           | 688         | 0               | 688                        |
| `EndScenario`        | 3           | 0               | 3                          |
| `Then`               | 1362        | 0               | 1362                       |
| `Otherwise`          | 107         | 0               | 107                        |
| `Always`             | 123         | 0               | 123                        |
| `WaitForResponse`    | 89          | **89**          | 0                          |
| `DontFocus`          | 58          | **58**          | 0                          |
| `InterruptSequence`  | 3           | **3**           | 0                          |
| `DisconnectThisUser` | 1           | **1**           | 0                          |

So:

- **Take `;`:** `Pattern`, `PatternList`, `Attribute`, `OtherExamples`, `Subjects`, `MemoryLock`,
  `Example`, `InitialExample`, and every command (`Say`, `SayOneOf`, `SayToFile`, `SayToConsole`,
  `Trace`, `Remember`, `Forget`, `Focus`, `Focus Subjects`, `DontFocus`, `Suppress`, `SwitchTo`,
  `WaitForResponse`, `InterruptSequence`, `DisconnectThisUser`).
- **Do not take `;`:** the topic/scenario header line ending in `is`, `EndTopic`/`EndScenario`,
  the condition header ending in `Then`, `Always`, `Otherwise`, and the block terminators
  `Done` / `Continue` / `NextTopic` / `TryAgain` / `SwitchBack`.

Every one of the 446 top-level declarations in the build is properly `;`-terminated; a mechanical scan
found zero unterminated declarations.

Recommended parser behaviour: require `;` where the grammar says so, but accept a stray `;` after a
terminator rather than erroring (the compiler's tolerance here is untested by the archive).

---

## 8. The top-level statement forms actually used

Exhaustive census over the 49 build files:

| form                                  | occurrences | files                                              |
| ------------------------------------- | ----------- | -------------------------------------------------- |
| `PatternList … is …;`                 | 228         | 12                                                 |
| `Pattern … is …;`                     | 3           | 1 (`Customization/DebugCustomize.n`)               |
| `Attribute ?X Specificity N;`         | 33          | 1 (`Library/StdQuestion/combis/QuesResDebug.us.n`) |
| `OtherExamples of "…" [guard] are …;` | 182         | many                                               |
| Topic declaration                     | 688         | many                                               |
| Scenario declaration                  | 3           | 2                                                  |
| **total categories**                  | **691**     |                                                    |

Category modifiers, over the build:

| modifier             | Topic | Scenario |
| -------------------- | ----- | -------- |
| _(none, "standard")_ | 559   | 0        |
| `Sequence`           | 61    | 0        |
| `Default`            | 38    | 0        |
| `Priority`           | 30    | 3        |

Over the **whole archive** (Base, MrMind, Mrmind3old, Library, HttpExample as well) the same four
modifiers and nothing else: standard topic 1101, `Sequence topic` 262, `Priority topic` 156,
`Default topic` 89, `Priority Scenario` 32, plain `Scenario` 5, `Default Scenario` 1.

**`Suppressed` never appears anywhere in the archive.** The patent BNF allows
`[Suppressed] [Priority|Default|Sequence] Topic` `[spec §2]`; the port should accept it (a category
declared `Suppressed` starts suppressed) but no MrMind script exercises it.

**`TopicList`, `ScenarioList`, `CategoryList` and `SubjectInfo` never appear anywhere in the archive** —
0 occurrences in every `.n` file. They are in the 1998 BNF `[spec §1]`. Consequently every category
reference in `SwitchTo` / `Suppress` / `Focus` is a **string literal or the keyword `This`**, never a
list symbol:

| form                  | count |
| --------------------- | ----- |
| `SwitchTo "string";`  | 134   |
| `Focus Subjects "…";` | 62    |
| `Suppress This;`      | 36    |
| `Focus "…";`          | 7     |
| `Suppress "…";`       | 1     |

The port can therefore implement `SwitchTo` with a string→category map alone.

### 8.1 `PatternList`

```
Mrmind3/Patterns.n:1     PatternList ACCESSORYCLOTHING is "bracelet", "necklace", "ring", "cufflink", "button", "zipper", "earring", "jewelry","jewel#";
Mrmind3/Patterns.n:33    PatternList OPTARTICLE is ARTICLES,"";
Mrmind3/Patterns.n:203   PatternList DEVELOPWORDS is DEVELOP, DEVELOPER;
Mrmind3/Patterns.n:357   PatternList INSULT is "eat " + I,"fuck*" + YOU,"suck " + I,"go to hell", "idiot#","you stink";
```

Body composition in the build: 219 lists are plain comma-separated string literals; 9 reference other
lists by symbol; 9 use `+` concatenation; 7 use parenthesised sub-alternatives; 6 include `""`; 2 contain
no string literal at all (`OPTARTICLE`, `DEVELOPWORDS`). That a list element may itself be a pattern-list
object is the 1999 extension `[spec §1]` and it is in use.

One list contains a **memory reference**, which the port must evaluate at runtime rather than at compile
time:

```
Mrmind3/customization/GreetCustomize.n:13   PatternList STDG_GreetingPhrases is
                                            "Hello " +?Name+". <BR>Can you convince me <BR>that you are human?";
```

The most complex body in the build, verbatim, showing nesting, `+`, and a cross-namespace reference:

```
Library/StdQuestion/combis/QuesResDebug.us.n:72
PatternList StdP.QuestionStarts is
	(("can","could","would","will", Stdp.DO)+"you","")+
	  ("say","tell me","talk about","explain","tell","know","define"),

  	(("can","could","would","will", Stdp.DO)+"you","")+
	   "give"+("","#","# #")+"information"+("about","on","concerning"),

	"I"+("want","would like","need")+("","#","# #")+
		("to know",("information","news")+("on","about","concerning")),

	"I"+("was","")+"wonder#";
```

Note `Stdp.DO` here versus `StdP.QuestionStarts` in the header — the same namespace, differently cased
(§6).

### 8.2 `Pattern`

Three occurrences, all in one file, all single string literals:

```
Mrmind3/Customization/DebugCustomize.n:27   Pattern SDeb.CONSOLEDEBUGGING is "QSR";
Mrmind3/Customization/DebugCustomize.n:28   Pattern SDeb.LIVEDEBUGGING is "";
Mrmind3/Customization/DebugCustomize.n:29   Pattern Sdeb.EXAMPLEDEBUGGING is "PQRS";
```

Treat `Pattern X is S;` as `PatternList X is S;` with exactly one element.

### 8.3 `Attribute`

Only ever the specificity-bearing form. Every one of the 132 `Attribute` declarations in the whole
archive carries `Specificity <integer>`; the bare `Attribute ?X;` form allowed by the BNF `[spec §1]`
never occurs.

```
Library/StdQuestion/combis/QuesResDebug.us.n:20   Attribute ?CanQuestion            Specificity 3000;
Library/StdQuestion/combis/QuesResDebug.us.n:29   Attribute ?WhoQuestion            Specificity 5000;
Library/StdQuestion/combis/QuesResDebug.us.n:31   Attribute ?AnyQuestion 			  Specificity 2500;
```

Undeclared attributes are legal and default to specificity 2000 `[spec §1]`.

### 8.4 `OtherExamples`

Three guard forms occur:

```
(a) plain
Mrmind3/Issues/Choice.n:50    OtherExamples of "I am a human by choice." are
                              "I chose to be human";

(b) WhenFocused                                (the guard may sit on its own line)
Mrmind3/Issues/Choice.n:77    OtherExamples of "I'm not a human by choice."
Mrmind3/Issues/Choice.n:78        Whenfocused are
Mrmind3/Issues/Choice.n:79        "No.";

(c) When <memref> is <patlist>                 (1999 form; not in the Mrmind3 build, present in Base)
Base/Inanities/Capabilities.n:1811   OtherExamples of "How do you facilitate online sales?"
Base/Inanities/Capabilities.n:1812       When ?WhatRobotSaid is "I facilitate online sales" are
Base/Inanities/Capabilities.n:1813           "How?";
Base/Inanities/Conversation.n:294    OtherExamples of "why do you think this is important?" When
Base/Inanities/Conversation.n:295        ?WhatRobotSaid is "Indulge me here, I think this stuff is important." are "why?";
```

The right-hand side is a full `PatList`, not just literals:

```
Base/Inanities/Capabilities.n:82   OtherExamples of "Can I use you?"
Base/Inanities/Capabilities.n:83       are "Can I use "+MYNAME+"?";
Base/Inanities/Conversation.n:549  OtherExamples of "Skagglemankattenfoober?" are
Base/Inanities/Conversation.n:550      MYNAME+"?";
```

`OtherExamples` binds by **string equality on the example text**, and that string must match an
`Example "…"` inside some topic. Matching is case-insensitive and the archive shows the author relying on
that only loosely — see §11.5.

`OtherExamples` affects only the offline example-verification tool. A runtime-only port may parse and
discard them, but must still parse them correctly to reach the next statement.

### 8.5 Category declarations

```
Category    = [ Modifier ] ( "Topic" | "Scenario" ) String "is" Body ( "EndTopic" | "EndScenario" ) ;
Modifier    = "Priority" | "Default" | "Sequence" ;      (+ "Suppressed" per the BNF, unused)
```

- `is` is mandatory: all 690 well-formed headers in the build end with it (0 exceptions).
- The header always occupies one line in the archive, though nothing in the grammar requires that.
  Whitespace before `is` may be a tab: `Mrmind3/Utilities/WebNameGreet.n:941  Default Topic "Greeting detect"	is`.
- The category name is a string literal and may contain spaces, punctuation, apostrophes, `?`, `/`, and
  angle brackets:
  `Topic "It's short for"`, `Topic "Are you <Otherbot>"`, `Sequence Topic "Set Previous Questions/Statements"`,
  `Priority topic "find ?ProcessedString"`, `Topic "Knock Knock."`.
- **Category names are unique** across the build (0 duplicates among the 690), which is what makes
  `SwitchTo "name"` well-defined.
- `EndTopic` closes a `Topic`; `EndScenario` closes a `Scenario`. The corpus never mismatches them.
  Categories do not nest.

Complete verbatim category, showing header, `Subjects`, condition, commands, terminator and end:

```
Mrmind3/Issues/Humor.n:29
Topic "Why did the chicken cross the road?" is
Subjects "JOKES";
	If ?ReasonQuestion Contains "chicken cross*road" Then
		Remember ?UserHasClaimedHumor;
//		SwitchTo "show gif";
		Example "Why did the chicken cross the road?";
		Say "..to get away from the humans.";
	Done
EndTopic
```

A `Priority Scenario`, verbatim and complete:

```
Mrmind3/Utilities/WebNameGreet.n:864
Priority Scenario "Reconnect" is
	If ?WhatUserDid Contains "Web RECONNECT" Then
		Remember ?SayPageTemplate is STDW_SayPageTemplate;
		SayOneOf STDW_RECONNECTLINES;
	Done
EndScenario
```

---

## 9. Complete top-level EBNF as the archive uses it

Terminals in `"quotes"` are case-insensitive keywords. `PatList`, `Condition`, `Command` and
`BlockTerminator` are specified by dimensions B and C; their productions here are the minimum needed to
delimit a top-level statement.

```ebnf
(* ---------- lexical ---------- *)

Program        = { WS | Comment | TopLevelStatement } ;

Comment        = "//" { AnyCharExceptNewline } ( Newline | EOF ) ;   (* not recognised inside String *)
WS             = " " | "\t" | "\r" | "\n" ;

String         = '"' { '\' AnyChar | AnyCharExcept('"', '\') } '"' ;
                 (* value: '\"' -> '"' ; every other '\' X -> '\' X ; no line breaks *)

Symbol         = Letter , { Letter | Digit | "_" | "." } ;
MemRef         = "?" , NameChar , { NameChar } ;
NameChar       = Letter | Digit | "_" | "." ;
StarRef        = ( "*" | "#" | "^" ) , Digit , { Digit } | "*Match" ;
Integer        = Digit , { Digit } ;
Decimal        = Digit , { Digit } , "." , Digit , { Digit } ;
Percent        = ( Integer | Decimal ) , "%" ;

(* ---------- top level ---------- *)

TopLevelStatement =
      PatternDef
    | PatternListDef
    | AttributeDef
    | OtherExampleDef
    | Category ;

PatternDef      = "Pattern"     , Symbol , "is" , PatList , ";" ;
PatternListDef  = "PatternList" , Symbol , "is" , PatList , ";" ;

AttributeDef    = "Attribute" , MemRef , [ "Specificity" , Integer ] , ";" ;
                  (* the optional form never occurs in the archive; default specificity 2000 *)

OtherExampleDef = "OtherExamples" , "of" , String , [ ExampleGuard ] , "are" , PatList , ";" ;
ExampleGuard    = "WhenFocused"
                | "When" , [ "Focused" , "and" ] , MemRef , "is" , PatList ,
                          { "and" , MemRef , "is" , PatList } ;

Category        = TopicDecl | ScenarioDecl ;
TopicDecl       = [ CategoryInfo ] , "Topic"    , String , "is" , { TopicStatement } , "EndTopic" ;
ScenarioDecl    = [ CategoryInfo ] , "Scenario" , String , "is" , { TopicStatement } , "EndScenario" ;
CategoryInfo    = [ "Suppressed" ] , [ "Priority" | "Default" | "Sequence" ] ;
                  (* archive: exactly one of Priority | Default | Sequence, or none; Suppressed unused *)

(* ---------- category body: boundary only; see dimension C ---------- *)

TopicStatement  = MemoryLockStmt | SubjectsStmt | ConditionalBlock ;
MemoryLockStmt  = "MemoryLock" , MemRef , { "," , MemRef } , ";" ;
SubjectsStmt    = "Subjects"  , String , { "," , String } , ";" ;
ConditionalBlock= Condition , { Command | ConditionalBlock } , BlockTerminator ,
                  [ "Otherwise" , ConditionalBlock ] ;
BlockTerminator = "Done" | "Continue" | "NextTopic" | "NextScenario" | "TryAgain" | "SwitchBack" ;
                  (* no ';' after any of these, nor after Then / Always / Otherwise / EndTopic *)

(* ---------- what a top-level parser must know about PatList ---------- *)

PatList         = PatElem , { "," , PatList } ;
PatElem         = String | Symbol | MemRef | StarRef
                | "(" , PatList , ")"
                | "{" , PatList , "}"
                | PatElem , ( "+" | "&" ) , PatElem ;
                  (* '&' occurs exactly once: Mrmind3/Defaults/Answers.n:285 *)
```

**Parser notes.**

1. A top-level statement is recognised by its first keyword; `Topic`/`Scenario` may be preceded by one
   modifier keyword, so lookahead of two tokens is enough.
2. Declarations are delimited by the next `;` at paren depth 0.
3. Categories are delimited by the matching `EndTopic`/`EndScenario`; they do not nest.
4. Nothing in the language depends on line boundaries.

---

## 10. From files to a program: the `.vsr` project

`MRMIND3.vsr` is a Windows INI file, CRLF, with sections `[FILES]`, `[DICTIONARY FILES]`,
`[MISC FILES]`, `[BUILDER]`, `[SETTINGS]`, `[ODBC]`. Every entry is `NAME=1` (the `1` is a
"present/enabled" flag; no `=0` entry exists in any `.vsr` in the archive).

### 10.1 `[FILES]` — the compilation unit, in order

49 entries. Path syntax:

- Backslash-separated, **relative to the directory holding the `.vsr`** (`…/NeuroScript/Mrmind3/`).
- The prefix `LIBRARY:` re-roots the remainder at the NeuroServer library directory,
  `…/NeuroScript/Library/`. The Mrmind3 build uses it exactly once:
  `LIBRARY:StdQuestion\combis\QuesResDebug.us.n=1` → `…/NeuroScript/Library/StdQuestion/combis/QuesResDebug.us.n`.
- Paths are **case-insensitive** (they were written on Windows): the manifest contains both
  `Customization\GoodbyeCustomize.n` and `customization\WebCustomize.n` for the same on-disk directory
  `Mrmind3/Customization/`. A port on a case-sensitive filesystem must resolve case-insensitively.
- Filenames may contain spaces (`Activities\Expressions Filter.n`) and `&`
  (`Humans&Machines\Machines.n`). Both are ordinary path characters.

The list, verbatim and in order:

```
Patterns.n
Customization\GoodbyeCustomize.n
Customization\DebugCustomize.n
customization\WebCustomize.n
customization\NameCustomize.n
customization\GreetCustomize.n
Customization\ProfanityCustomize.n
LIBRARY:StdQuestion\combis\QuesResDebug.us.n
customization\MyName.n
Utilities\CProfanity.n
Utilities\WebNameGreet.n
Utilities\CGoodbye.n
Activities\20Questions.n
Activities\UserSurvey.n
Activities\ategag.n
Activities\icons.n
Activities\Expressions Filter.n
AboutMrMind\MMIdentity.n
AboutMrMind\MMphysical.n
AboutMrMind\MMPurpose.n
AboutMrMind\WhatIsMM.n
AboutUser\UserPhysical.n
AboutUser\UserMind.n
AboutUser\UserGeneral.n
AboutUser\UserFamily.n
AboutUser\UserSociety.n
Humans&Machines\Machines.n
Humans&Machines\Bots.n
Humans&Machines\Humans.n
Humans&Machines\Convincing.n
Issues\Consciousness.n
Issues\Choice.n
Issues\Misc.n
Issues\Emotion.n
Issues\Humor.n
Issues\Life.n
Issues\TrustTruth.n
Issues\RIskGoals.n
Reactions\Annoyance.n
Reactions\Compliments.n
Reactions\Comments.n
Reactions\Suggestions.n
Reactions\Questions.n
Reactions\Asides.n
Defaults\AskMe.n
Defaults\Answers.n
Defaults\Pointers.n
Defaults\OneShots.n
Defaults\Defaults.n
```

### 10.2 Order matters, in three distinct ways

**(a) Declaration before use.** Concatenate the 49 files in manifest order and every `Pattern`/
`PatternList` reference falls _after_ its definition. Verified mechanically: 231 definitions,
**0 forward references**, 0 duplicate definitions. This is why `Patterns.n` is first and why library
files precede the files that use them. The port should build the pattern-list environment in manifest
order and may treat a forward reference as an error.

**(b) Priority and Default execution order.** Priority categories run in program order and Default
categories run in program order `[spec §2]`. Program order is manifest order, then position within file.
The 33 Priority categories in the build come from file #8 (the StdQuestion/StdResponse pipeline, 25 of
them), then #10 (`Tsk Tsk`, the profanity filter), #11 (web login/greeting), #12 (goodbye), #15
(`ategag`). The 38 Default categories run from file #11 through file #49, ending with:

```
Mrmind3/Defaults/Defaults.n:144   Default topic "Last Line Of Defense" is
```

which is the last category of the last file — a designed catch-all. Reordering `[FILES]` changes the
bot's behaviour.

**(c) Initial attention-focus order.** The standard-category list starts in program order and is
reordered at runtime `[spec §2]`. The initial order is manifest order.

### 10.3 Other sections

```
[DICTIONARY FILES]
DICTIONARY-LIBRARY:Additions.tlx=1
DICTIONARY-LIBRARY:ssceam.tlx=1
DICTIONARY-LIBRARY:ssceam2.clx=1
[MISC FILES]
THESAURUS-LIBRARY:thesdbam.cth=1
```

- `DICTIONARY-LIBRARY:` and `THESAURUS-LIBRARY:` re-root at the same Library directory as `LIBRARY:`.
  These feed `Compute SpellCheck` (used once, at `QuesResDebug.us.n:149`) and the thesaurus. A port that
  does not implement spell-checking can ignore them, but must then accept that `?WhatUserMeant` equals
  `?WhatUserSaid` after the priority pipeline.
- `[BUILDER]` holds compiler warning switches, not language semantics: `ContinueWarning`,
  `DoneWarning`, `HeardAttributeWarning`, `NoExampleWarning`, `NoSubjectWarning`,
  `UnusedPatListWarning`, plus `AutoBuildOnLoad=1`. They name exactly the lint classes a faithful port
  might reproduce (a topic with no `Example`, a topic with no `Subjects`, an unused PatternList).
- `[SETTINGS]` is server configuration. The only language-adjacent key is
  `PatternDefaultName=Patterns.n` (where the authoring tool writes new PatternLists) and
  `HierarchyRootDirectoryPath=` (empty — MrMind does **not** use the hierarchical-bot feature of
  US 6,754,647).
- `[ODBC]` names the long-term-memory and conversation databases (`MRMIND3LTM.ltm`, `MRMIND3CDB.cdb`).

**There is no "search path" section.** The three prefixes above are the whole path-resolution mechanism:
un-prefixed = relative to the project directory, `LIBRARY:`/`DICTIONARY-LIBRARY:`/`THESAURUS-LIBRARY:` =
relative to the shared library directory.

### 10.4 Files on disk that are _not_ in the build

Do not load these; they are older or superseded copies. Under `Mrmind3/`:
`Defaults/Switches.n` (18 bytes), `Activities/picutres.n` (0), `AboutMrMind/MMfamily.n` (0),
`Issues/Bots.n` (3388 bytes — a byte-identical older sibling of the built
`Humans&Machines/Bots.n`). Under `Library/`: 34 further `.n` files, including
`StdQuestion/StdQuestion.us.n` and `StdQuestion/StdResponse.us.n`, whose _combined_ build
`StdQuestion/combis/QuesResDebug.us.n` is what the manifest actually loads. Loading both would define
every `StdP.*` list twice.

`Mrmind3old/MRMIND3.vsr` is the previous build: identical to `MRMIND3.vsr` except that it lacks
`Activities\icons.n` (48 files) and lacks the `HierarchyRootDirectoryPath` key.

---

## 11. Constructs the patent BNF does not contain, and other anomalies

Ordered by how much they can bite an implementer.

### 11.1 Dots inside symbols

`[spec §1]` quotes the BNF: _"A symbol is a string of alphanumeric or underscore characters, beginning
with a letter."_ The archive uses `.` in 88 distinct symbols and 22 memrefs. **Archive wins:** `.` is a
name character.

### 11.2 `&` as a binary pattern operator — exactly once

```
Mrmind3/Defaults/Answers.n:285   And ?DescriptionQuestion contains (YOU & "think")
```

The 1998 BNF lists `&` among the wildcards and the 1999 BNF replaces it with `^` `[spec §19]`. Whatever
`&` means, it occurs **once** in the entire build, in one condition, and the port may special-case it —
or, safest, treat it exactly as `+` and note the divergence. (Dimension B owns the semantics.)

### 11.3 `\\` in string literals — behaviour undetermined

Absent from live code in the Mrmind3 build; present in 61 live strings in `Base`
(`"speciallogs\\why.log"`). Under the escape
rule proved in §4.2 it yields two backslashes. **Hypothesis** (labelled as such): the lexer has a single
rule "backslash escapes the next character, and only `\"` collapses", so `\\` yields `\\`, and the Base
author's C habit produced a path that Windows tolerated anyway. Not provable from the archive; the
compiled objects for `Base` were not preserved.

### 11.4 Multi-line string literals — possible but never exercised

Every string literal in the build is single-line. One _commented-out_ fragment shows an author writing a
string across a line break:

```
Mrmind3/Issues/Misc.n:133   //	Say "I was expecting an answer to \""+
Mrmind3/Issues/Misc.n:134   //	?ThisIsTheQuestion +"\".  " +
Mrmind3/Issues/Misc.n:135   //	"I encourage you to please respond with one
Mrmind3/Issues/Misc.n:136   //	of these, or else ask me a new question.  ";
```

**Hypothesis:** the lexer allowed a raw newline inside a literal (the author would have had it working
before commenting it out). Since no live example exists, the port should reject an unterminated literal
at end-of-line but say so clearly rather than resynchronising silently.

### 11.5 A stray `/` before a keyword — exactly once

```
Mrmind3/Humans&Machines/Bots.n:1   /Topic "Are bots smart" is
```

(byte-identical in the unused `Mrmind3/Issues/Bots.n:1`). A single `/` is not a comment, and yet the
topic **is present in the compiled object**: `strings Mrmind3/NSOBJ/__Humans&Machines_Bots.nso` contains
`Are bots smart`, `intelligence`, `Are you intelligent?` and `It depends what <BR>you mean by <BR>intelligent.`
in the expected `CCategory` / `CConditionActionBlock` / `CExample` / `CSayOneOf` sequence.

**Hypothesis:** the tokenizer discards an unrecognised single character with at most a warning and
continues, so `/Topic` lexes as `Topic`. The port should either (a) skip a lone `/` before a keyword, or
(b) hard-code this one file. Getting it wrong loses one topic out of 691.

### 11.6 `When <memref> is <string>` as an `Example` guard inside a topic body

```
Mrmind3/Utilities/CProfanity.n:122
Topic "why (stop that)" is
Subjects "Profanity";
   If ( (?WhatUserSaid matches "how come","why","what for","why so","why not" )
      or (?WhatUserMeant contains "what*mean"))
   and (?LastTopic matches "Tsk Tsk")
   Then
		When ?LastTopic is "Tsk Tsk"
		   Example "why";
        SayOneOf STDX.RESPONSETOWHY;
	Done
EndTopic
```

This is the 1999 `When [Focused and] <memref> is <patlist> … Example <patlist>;` form `[spec §6]`, so it
is _in_ the spec — but only in the 1999 BNF, and it occurs **once** in the build. Note the `;` belongs to
the `Example`, not to the `When`.

### 11.7 Constructs present in the archive but outside the 1998 BNF

All are documented in the 1999 BNF `[spec §19]`; listed here so the port does not treat them as errors:
`SayToFile` (73), `SayToConsole` (116), `Trace` (4), `DisconnectThisUser` (1),
`Compute Sum` (`Mrmind3/Utilities/CProfanity.n:61  Remember ?ProfanityStrikes is Compute Sum of ?ProfanityStrikes, "1";`),
`Compute Uppercase` / `Lowercase` / `SpellCheck`, `Suppress This`, `Chance <n>%` as a clause
(`Mrmind3/Utilities/WebNameGreet.n:67  AND Chance 60%`), `InitialExample <n> "<string>";`
(`WebNameGreet.n:86, :875`), `NotHeard` / `NOT <patternlist>`, `ExactlyMatches` (1, with the author's own
explanation at `Mrmind3/Reactions/Compliments.n:52  //we have to use exactlymatches here -- otherwise punctuation is stripped.`),
and `{ … }` optional pattern groups (4 pairs, e.g. `Mrmind3/AboutUser/UserFamily.n:88  and heard {"human"}`).

### 11.8 Constructs in the BNF but absent from the archive

`TopicList` / `ScenarioList` / `CategoryList`, `SubjectInfo`, `Suppressed`, `Do` / `DoOneOf`,
`Recover`, `ForgetOneOf`, `RememberOneOf`, `SwitchToOneOf`, `MarkResponse`, `Show`, `Expires`,
`NextScenario`, `DoesNotExactlyMatch`, `ReplacePronouns`, and `SwitchTo <symbol>` (unquoted): **zero
occurrences** in every `.n` file in the archive. A minimal faithful engine need not implement them.

`Do` deserves a note: it appears six times in the Mrmind3 build and **every one is commented out**, so
the compiled bot contains no `Do` at all. The dead lines record what MrMind's host front end understood
(`Mrmind3/AboutMrMind/MMIdentity.n:120  //			Do "Show Src=/MrMindFiles/family2.htm Target=Display";`,
`Mrmind3/AboutMrMind/MMphysical.n:173  //	  	Do "SETNAME MS MIND";`), i.e. `Do` took an opaque
host-specific string, exactly as the patents describe `[spec §6]`.

---

## 12. Corroboration from the compiled objects

`Mrmind3/NSOBJ/*.nso` are the compiler's output, one per source file, named by flattening the source
path (`__Humans&Machines_Bots.nso`, `_C_Program Files_NativeMinds_NeuroServer_NeuroScript_Library_StdQuestion_combis_QuesResDebug.us.nso`).
They are MFC-serialised object graphs; `strings -n 4` shows the class names and, crucially, **every
string literal in its final, post-lexer form**. That is how §4.2 was settled. Class names visible:
`CObjFile`, `CObList`, `CCategory`, `CConditionActionBlock`, `CExample`, `CContinuation`, `CDone`,
`CSay`, `CSayOneOf`, `CAndCondition`, `COrCondition`, `CPropertyCondition`, `CPatternMatchCondition`,
`CFocusCondition`, `CArgElemString`, `CArgElemPat`, `CArgElemPropty`, `CArgElemStarBf`,
`CArgElemConcat`, `CArgListAnd`, `CArgListOr`, `CPatListDef`.

Strings are stored length-prefixed, so a literal's exact character count is recoverable — e.g. the
`Punc` list compiles to four strings of length 2 (`\.`, `\?`, `\!`, `\,`), and `#\'s` to length 4.

Use `.nso` files only as corroboration; the mapping is one file → one object, and the object does not
record source positions.

---

## 13. Implementation checklist

1. Read each `.n` as **latin-1**; normalise CRLF→LF; do not otherwise transform bytes.
2. Lex with a single pass that recognises, in this priority order: string literal, `//` comment,
   whitespace, `?name`, `*n`/`#n`/`^n`/`*Match`, number (with optional `.` fraction and optional `%`),
   symbol, single-character punctuation (`; , ( ) { } + & *`).
3. String value: consume `\` + next char; `\"` → `"`; otherwise keep both characters.
4. Case-fold every keyword, symbol, memref and category-name key.
5. `;` terminates declarations and commands; never emit or require one after
   `Then` / `Always` / `Otherwise` / `Done` / `Continue` / `NextTopic` / `TryAgain` / `SwitchBack` /
   `EndTopic` / `EndScenario`.
6. Parse the `.vsr` `[FILES]` list, resolve `LIBRARY:` against the library root, resolve paths
   case-insensitively and with backslash→separator translation, and compile **in list order** into one
   program. Preserve that order for the Priority list, the Default list, and the initial standard list.
7. Tolerate a lone `/` before a category keyword (§11.5).
8. Refuse zero-byte and NUL-filled files with an explicit error rather than treating them as empty.

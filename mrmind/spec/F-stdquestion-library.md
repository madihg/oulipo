# F. The NativeMinds StdQuestion library and the MrMind input pipeline

Implementation specification for a faithful JavaScript re-implementation of NeuroScript 2.2,
dimension **F**: the standard libraries that sit between raw user text and the bot's content
topics — `StdQuestion` (question/statement/response classification), the `Utilities`
name-capture/greeting machinery, the profanity filter and the goodbye handler.

Ground truth is the archive at
`mrmind/archive/1_NeuroServer_fromVaio_MrMind/NeuroScript/`.
Everything quoted below is copied verbatim from those files (CRLF stripped); every quote carries
`file:line`. Semantics that the archive cannot show (the run loop, block terminators, specificity)
are taken from `mrmind/archive/_research/patents/GERBIL-LANGUAGE-NOTES.md`
and cited as `[spec §N]`. **Where the two disagree, the archive wins**; disagreements are listed
explicitly in §13.

Throughout, paths are abbreviated:

| Abbreviation | Real path (under `.../NeuroScript/`)           |
| ------------ | ---------------------------------------------- |
| `QRD`        | `Library/StdQuestion/combis/QuesResDebug.us.n` |
| `WNG`        | `Mrmind3/Utilities/WebNameGreet.n`             |
| `CPROF`      | `Mrmind3/Utilities/CProfanity.n`               |
| `CGOOD`      | `Mrmind3/Utilities/CGoodbye.n`                 |
| `LIB/…`      | `Library/…`                                    |

---

## 1. What the Mrmind3 build actually loads

The build manifest is `Mrmind3/MRMIND3.vsr`, section `[FILES]`. It lists 50 files in load order.
Entries prefixed `LIBRARY:` resolve under `Library/`; all others under `Mrmind3/`. Backslashes are
Windows separators; the archive's on-disk directory names differ in case from the manifest
(`customization\` vs `Customization/`), so **path resolution must be case-insensitive**.

### 1.1 Library files the build loads

Exactly **one** file from the `Library/` tree is loaded:

```
LIBRARY:StdQuestion\combis\QuesResDebug.us.n=1
```

— `Mrmind3/MRMIND3.vsr:8`

`QuesResDebug.us.n` is a _combi_: its own header says so.

> `// This combines StdQuestion, StdResponse, and StdDebug in one file.` — `QRD:5`
> `//  It is the recommended replacement for StdQuestion.` — `QRD:7`

I verified this mechanically: `diff` of `QRD` lines 60–2231 against `LIB/StdQuestion/StdQuestion.us.n`
lines 100–2271 differs only in blank lines and one line-wrap (`QRD:2096-2098` vs
`StdQuestion.us.n:2092-2097`). The `StdResponse` half (`QRD:2236-2286`) is `StdResponse.us.n`
verbatim. The `StdDebugger` half (`QRD:2291-2607`) is `StdDebugger.n` with the three literal
debug-level strings replaced by pattern references (`SDeb.CONSOLEDEBUGGING` etc.).

**There is no `#include` mechanism.** The `Library` tree is _not_ pulled in transitively. The
`.vsr` file list is the complete compilation unit; anything not named there does not exist at
runtime.

### 1.2 Utility and customization files: Mrmind3 has its own forks

The manifest names `Utilities\CProfanity.n`, `Utilities\WebNameGreet.n`, `Utilities\CGoodbye.n`
and six `Customization\*.n` files **without** the `LIBRARY:` prefix, so they resolve to
`Mrmind3/Utilities/` and `Mrmind3/Customization/`, which are **modified forks** of the library
originals, not copies. Sizes differ (e.g. `Mrmind3/Utilities/WebNameGreet.n` 41 181 bytes vs
`LIB/Utilities/combis/WebNameGreet.n` 40 250 bytes) and so does behaviour — the deltas are
documented in §10–§12. **Port the Mrmind3 forks, not the library originals.**

### 1.3 Complete load order (the 50 files)

```
 1  Patterns.n                                  (bot-wide PatternLists; no categories)
 2  Customization/GoodbyeCustomize.n            (STD_GoodbyePhrases)
 3  Customization/DebugCustomize.n              (SDeb.* debug levels)
 4  Customization/WebCustomize.n                (STDW_* greeting/template patterns)
 5  Customization/NameCustomize.n               (STDN_* + 7 name-challenge Topics)
 6  Customization/GreetCustomize.n              (STDG_*)
 7  Customization/ProfanityCustomize.n          (STDX.* + Topic "Fuck" + 2 follow-ups)
 8  LIBRARY:StdQuestion/combis/QuesResDebug.us.n   <-- 25 Priority categories, the whole pipeline
 9  Customization/MyName.n                      (MYNAME, MYNAMEPLUS)
10  Utilities/CProfanity.n                      (1 Priority topic "Tsk Tsk")
11  Utilities/WebNameGreet.n                    (5 Priority categories; name capture; greeting)
12  Utilities/CGoodbye.n                        (1 Priority topic "STD_Goodbye Detect")
13  Activities/20Questions.n
14  Activities/UserSurvey.n
15  Activities/ategag.n                         (1 Priority topic "hate" — rewrites ?WhatUserMeant)
16  Activities/icons.n
17  Activities/Expressions Filter.n
18-22  AboutMrMind/{MMIdentity, MMphysical, MMPurpose, WhatIsMM}.n
23-27  AboutUser/{UserPhysical, UserMind, UserGeneral, UserFamily, UserSociety}.n
28-31  Humans&Machines/{Machines, Bots, Humans, Convincing}.n
32-39  Issues/{Consciousness, Choice, Misc, Emotion, Humor, Life, TrustTruth, RIskGoals}.n
40-45  Reactions/{Annoyance, Compliments, Comments, Suggestions, Questions, Asides}.n
46-50  Defaults/{AskMe, Answers, Pointers, OneShots, Defaults}.n
```

Load order matters in three ways:

1. **Priority categories execute in load order** [spec §2, §11]. The 25 categories of `QRD` therefore
   run before every other Priority category in the bot, so `Tsk Tsk`, the login/greeting topics and
   `STD_Goodbye Detect` can all read `?AnyQuestion`, `?YesResponse` etc.
2. `Customization/*.n` files are loaded _before_ the components that reference their PatternLists
   (`STDN_*` before `WebNameGreet.n`, `STDX.*` before `CProfanity.n`). `MyName.n` sits between
   `QuesResDebug` and `CProfanity`/`WebNameGreet` because `MYNAME` is referenced by the latter.
3. `Activities/ategag.n` (#15) declares `Priority topic "hate"`, which rewrites `?WhatUserMeant`
   **after** the whole StdQuestion pipeline has already run (§13.4).

### 1.4 Library files present in the archive but NOT loaded

All of these exist under `Library/` and are dead weight for the port:

| File                                                                                            | What it is                                                                                                                                            | Why unused                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LIB/StdQuestion/StdQuestion.us.n`                                                              | the un-combined question library                                                                                                                      | superseded by `QuesResDebug.us.n`                                                                                                                                                                         |
| `LIB/StdQuestion/StdResponse.us.n`                                                              | yes/no library                                                                                                                                        | ditto                                                                                                                                                                                                     |
| `LIB/StdQuestion/StdDebugger.n`                                                                 | console debugger                                                                                                                                      | ditto                                                                                                                                                                                                     |
| `LIB/StdQuestion/Customization/DebugCustomize.n`                                                | byte-identical to `Mrmind3/Customization/DebugCustomize.n`                                                                                            | the Mrmind3 copy is loaded                                                                                                                                                                                |
| `LIB/StdError/StdError.us.n`                                                                    | 54 `Pattern Error.NNN is "<H3>…"` HTTP / contributor error and warning pages                                                                          | not in `[FILES]`; NeuroServer falls back to built-in copies ("IF FOR ONE REASON THIS FILE IS NOT ADDED TO A PROJECT THE SAME ERROR Messages are loaded internally." — `LIB/StdError/StdError.us.n:31-32`) |
| `LIB/Hierarchy/StdDomainPriority.n`, `StdDomainPatterns.n`, `*.ntm`                             | the hierarchical-domain-bot scaffolding of US 6,754,647 (ordinal reference patterns `THEFIRSTONE`…, "Limit number of consecutive Reminder responses") | MrMind3 is a flat bot; `HierarchyRootDirectoryPath=` is empty in the `.vsr`                                                                                                                               |
| `LIB/Utilities/combis/WebName.n`                                                                | WebNameGreet minus the greeting half                                                                                                                  | superseded                                                                                                                                                                                                |
| `LIB/Utilities/combis/{GoodbyeLogger,MailComment,MailCommentFeedback}.n`                        | transcript-mailing goodbye variants                                                                                                                   | MrMind3 uses plain `CGoodbye.n`                                                                                                                                                                           |
| `LIB/Utilities/components/{CComments,CFeedback,CGreet,CLogger,CMailUtil,CMultiSentence,CWeb}.n` | the un-combined components                                                                                                                            | `WebNameGreet.n` = `CWeb` + `CGreet` + name capture                                                                                                                                                       |
| `LIB/Utilities/customization/{Comment,Feedback,Logger,Mail,MultiSent}Customize.n`               | customization for the above                                                                                                                           | unused                                                                                                                                                                                                    |
| `LIB/Utilities/components/Edward.tlx`, `Edward.script.tlx`                                      | lexicon stubs                                                                                                                                         | not scripts                                                                                                                                                                                               |

Notably, **`CMultiSentence.n` is not loaded**, so MrMind3 does **no** sentence splitting: a
multi-sentence input is processed as one string.

### 1.5 Nothing referenced by the build is missing

I resolved every one of the 50 manifest entries against the filesystem (case-insensitively): all 50
exist and are non-empty. The three `[DICTIONARY FILES]` (`Additions.tlx`, `ssceam.tlx`,
`ssceam2.clx`) and the thesaurus (`thesdbam.cth`) are named `DICTIONARY-LIBRARY:` /
`THESAURUS-LIBRARY:` and are **absent from the archive** — they are the Wintertree spell-check
dictionary that backs `Compute SpellCheck` (§4.2). The project-local lexicons
`Mrmind3/MRMIND3.tlx` (1 219 B) and `Mrmind3/MRMIND3.script.tlx` (15 603 B) _are_ present.

Two zero-length files exist in `Mrmind3/` — `AboutMrMind/MMfamily.n` and `Activities/picutres.n` —
but **neither is in the manifest**, so they are damaged-disk debris, not empty scripts. No file
under `Library/` or in the build is zero-length or NUL-filled. One file carries 3 non-ASCII bytes
(`Mrmind3/AboutMrMind/MMIdentity.n`); everything else in the pipeline is pure ASCII.

### 1.6 Compiled-object corroboration

`Mrmind3/NSOBJ/_C_Program Files_NativeMinds_NeuroServer_NeuroScript_Library_StdQuestion_combis_QuesResDebug.us.nso`
(272 625 B) is the compiled form. `strings -n 4` on it yields, among 4 393 strings, a
`CAttributeInfo` record for every attribute named in §6.1 (each stored twice, lower-cased then
cased: `morequestion` / `MoreQuestion`), plus the class names `CPatListDef`,
`CConditionActionBlock`, `CPatternMatchCondition`, `CPropertyCondition`, `CAndCondition`,
`COrCondition`, `CArgListAnd`, `CArgListOr`, `CArgElemString`, `CArgElemStarBf`,
`CArgElemPropty`, `CArgElemConcat`, `CArgElemCompute`, `CArgElemCat`, `CArgElemPat`,
`CMemReference`, `CRemember`, `CForget`, `CSwitchTo`, `CSwitchBack`, `CSuppress`, `CTrace`,
`CContinue`, `CContinuation`, `CConsole`, `CCategory`. This confirms the attribute set and that
the file compiles to exactly the constructs described below.

---

## 2. The pipeline, end to end

### 2.1 Where the pipeline sits in the run loop

Per [spec §11], one user input drives one `CProgram::Run`, in this order:

1. **All Priority categories, in load order**, each until it returns `Done`/`Waiting`.
2. The pending `WaitForResponse` continuation, if any.
3. Standard categories by best-fit specificity, ties broken by attention focus [spec §14].
4. Default categories in load order, only if no `Done` yet.
5. `Refocus()`.

The whole of this dimension lives in step 1. `Sequence` categories are never scheduled; they run
only when a `SwitchTo` names them, and — critically — **a Sequence category is exempt from the
"already executed this run" cycle guard**, which is what makes the library's repeated
`SwitchTo "Expand Contractions";` loops legal:

> `if ((DestCategory->Executed) && (DestCategory->Priority != SequencePriority)) { … return RunTimeError; }` [spec §11]

### 2.2 Every Priority category that runs, in order

Numbering is the execution order for a _statement_ turn (`?WhatUserSaid` present). Scenario
categories (marked **S**) run for _action_ turns (`?WhatUserDid`).

| #     | Category                                                                                                                                                                                                                                               | File:line                       | What it does                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `Priority Topic "Find ?WhatUserMeant"`                                                                                                                                                                                                                 | `QRD:132`                       | seeds `?WhatUserMeant`, `wanna`→`do you want to`, spell-check, strips quotes/parens/asterisks (≤5 passes), sets `?UnProcessedString` |
| 2     | `Priority topic "find ?ProcessedString"`                                                                                                                                                                                                               | `QRD:173`                       | `?ProcessedString := ?UnProcessedString`, strips leaders (≤4), internals (≤5), expands contractions (≤6)                             |
| 3     | `Priority topic "Set possible statements"`                                                                                                                                                                                                             | `QRD:226`                       | `?StdS.PossibleStatement := ?StdQ.PossibleQuestion := ?ProcessedString`                                                              |
| 4     | `Priority topic "Previous utterance topic"`                                                                                                                                                                                                            | `QRD:240`                       | snapshots last turn's 31 question/statement attributes into `?PreviousXxx`                                                           |
| 4S    | `Priority Scenario "Previous utterance Scenario"`                                                                                                                                                                                                      | `QRD:246`                       | same, for action turns                                                                                                               |
| 5     | `Priority topic "FindQuestion "`                                                                                                                                                                                                                       | `QRD:350`                       | the question classifier driver (note the trailing space in the name)                                                                 |
| 6     | `Priority topic "ParseStatements"`                                                                                                                                                                                                                     | `QRD:388`                       | the statement classifier driver                                                                                                      |
| 7     | `Priority Topic "StdResponse Computation"`                                                                                                                                                                                                             | `QRD:2262`                      | `?YesResponse` / `?NoResponse` / `?NotSureResponse`                                                                                  |
| 8     | `Priority topic "Set Defaults for level of debugging information. "`                                                                                                                                                                                   | `QRD:2291`                      | sets `?Debugging`, then `Suppress this;` (runs once per user)                                                                        |
| 9–18  | `"debugging info ON"`, `"debugging info OFF"`, `"Toggle {PreProcessor,Question,Response,Statement,WhatUserSaid,EarlyStatement,EarlyQuestion} Debugging"`                                                                                               | `QRD:2313`–`2433`               | console debug switches keyed on exact `?WhatUserSaid`                                                                                |
| 19–25 | `"Report PreProcessor debugging to console"`, `"debugging StdQuestion information"`, `"debugging Response information"`, `"StdStatement Debugging"`, `"Reporting WhatUserSaid"`, `"EarlyStatement Debugging"`, `"debugging EarlyQuestion information"` | `QRD:2449`–`2607`               | `SayToConsole` dumps, gated on `?Debugging`                                                                                          |
| 26    | `Priority Topic "Tsk Tsk"`                                                                                                                                                                                                                             | `CPROF:78`                      | profanity filter                                                                                                                     |
| 27S   | `Priority Scenario "Login over Web"`                                                                                                                                                                                                                   | `WNG:835`                       | on `Web ACCEPT CONNECTION`: logs headers, sets `?SayPageTemplate`, suppresses console login, `SwitchTo "Robot Greeting"`             |
| 28S   | `Priority Scenario "Reconnect"`                                                                                                                                                                                                                        | `WNG:864`                       | on `Web RECONNECT`: `SayOneOf STDW_RECONNECTLINES`                                                                                   |
| 29    | `Priority Topic "Login from Console"`                                                                                                                                                                                                                  | `WNG:873`                       | `Suppress This; SwitchTo "Robot Greeting";`                                                                                          |
| 30    | `Priority Topic "STD_Greeting Detect"`                                                                                                                                                                                                                 | `WNG:905`                       | hello handling                                                                                                                       |
| 31    | `Priority Topic "Std_GreetingQuestion Detect"`                                                                                                                                                                                                         | `WNG:926`                       | "how are you" handling                                                                                                               |
| 32    | `Priority Topic "STD_Goodbye Detect"`                                                                                                                                                                                                                  | `CGOOD:44`                      | goodbye + exit-survey offer                                                                                                          |
| 33    | `Priority topic "hate"`                                                                                                                                                                                                                                | `Mrmind3/Activities/ategag.n:1` | rewrites `?WhatUserMeant`: `*hate*` → `*1 + " ate " + *2`                                                                            |

Categories 1–7 are the "input pipeline" proper. Categories 8–25 produce no user-visible output
(`SayToConsole`/`Trace` only). Categories 26–33 are content filters that already see the parsed
attributes.

### 2.3 String flow diagram

```
?WhatUserSaid                       raw, never modified by any script in the build
  |
  |  [1] Priority "Find ?WhatUserMeant"
  |     ?WhatUserMeant := ?WhatUserSaid
  |     if matches "want to*" | "wanna*"  ->  "do you want to " + *1
  |     ?WhatUserMeant := Compute SpellCheck of ?WhatUserMeant
  |     <= 5 x SwitchTo "remove excess punctuation"   (' " ( ) * )
  |     ?UnProcessedString := ?WhatUserMeant
  v
?WhatUserMeant   <-- this is what every `Heard` / `IfHeard` / `NotHeard` in the whole bot tests
  |
  |  [2] Priority "find ?ProcessedString"
  |     ?ProcessedString := ?UnProcessedString
  |     <= 4 x SwitchTo "Strip meaningless leaders"
  |     <= 5 x SwitchTo "strip meaningless internals"
  |     <= 6 x SwitchTo "Expand Contractions"
  v
?ProcessedString
  |
  |  [3] Priority "Set possible statements"
  +--> ?StdQ.PossibleQuestion   (mutated further by "strip leading phrases")
  +--> ?StdS.PossibleStatement  (never mutated)
          |
          |  [5] FindQuestion  -> ?CanQuestion … ?AnyQuestion, ?FollowUpQuestion, secondaries
          |  [6] ParseStatements -> ?MessageStatement … ?AnyStatement
          v
      attribute values = the *stripped subject* of the question/statement
```

**The single most consequential fact for the port:** `Heard X` is defined by the patents as
`?WhatUserMeant Contains X` [spec §4], and `?WhatUserMeant` in this build is **spell-checked and
punctuation-stripped but NOT contraction-expanded and NOT leader-stripped**. Contraction expansion
happens only on `?ProcessedString`, which no MrMind3 content file ever reads (0 references to
`?ProcessedString` outside the library, measured across all 50 build files). So:

- `Heard "do not"` does **not** fire on "I don't know".
- `?FactStatement contains "do not"` **does** fire on "I don't know", because the statement
  attributes carry the expanded `?ProcessedString`.

This asymmetry is deliberate: `StdResponse` lists both spellings —
`"I don't know", "I do not know"` at `QRD:2260`.

### 2.4 Attribute-usage census across the 50 build files

How often each library attribute is actually read by MrMind3 content (comment lines excluded).
This tells the port what must be exactly right versus what is decorative.

```
?IsStatement 148   ?FactStatement 129   ?AnyStatement 113   ?DescriptionQuestion 80
?YesResponse  74   ?NoResponse     63   ?FactQuestion  62   ?HaveStatement       50
?AnyQuestion  45   ?ReasonQuestion 28   ?NotSureResponse 26  ?WhoQuestion        24
?OtherStatement 21 ?WantStatement  18   ?MethodQuestion 17   ?CanQuestion        14
?FeelingStatement 14  ?ActStatement 13  ?ObtainQuestion  7   ?LocationQuestion    5
?MessageStatement 4   ?CompareQuestion 4  ?ShouldQuestion 3  ?TimeQuestion        3
?OtherQuestion 2   ?DirectionsQuestion 1  ?DoHaveQuestion 1
?WhatIfQuestion 0  ?CostQuestion 0  ?ExampleQuestion 0  ?MoreQuestion 0
?ConfirmQuestion 0 ?FollowUpQuestion 0  ?TimeStatement 0  ?ConditionalStatement 0
?CauseStatement 0  ?ProcessedString 0   ?PreviousXxxQuestion/Statement 0 (all 31)

?WhatUserSaid 157  ?Name 151  ?WhatRobotSaid 126  ?WhatUserMeant 46  ?LastTopic 27
```

Reading of that: `?IsStatement`, `?FactStatement`, `?AnyStatement`, `?DescriptionQuestion`,
`?FactQuestion`, `?HaveStatement` and the three response flags carry MrMind. Ten attributes are
computed and never read. The `?Previous*` family is read **only** inside `QRD` itself (by the
`?FollowUpQuestion` / `StdP.WhatAbout` branches of the finders) and by nothing in Mrmind3.

---

## 3. Grammar of the pattern expressions used by this library

The library uses only a subset of NeuroScript's pattern syntax, but uses all of it heavily. EBNF
for what actually appears in `QRD`, `WNG`, `CPROF`, `CGOOD` (full-language grammar belongs to
another dimension; this is the closure needed to evaluate _these_ files):

```ebnf
PatListDef   = ("PatternList" | "Patternlist" | "patternlist") Symbol "is" PatList ";" ;
PatternDef   = "Pattern" Symbol "is" String ";" ;
AttributeDef = "Attribute" MemRef "Specificity" Integer ";" ;

PatList      = PatListObj { "," PatListObj } ;          (* comma = OR / list append *)
PatListObj   = Atom { "+" Atom } ;                      (* + = cross-product concat *)
Atom         = String                                   (* "what is" *)
             | Symbol                                   (* StdP.Articles, MYNAME *)
             | MemRef                                   (* ?Name, ?StdQ.LocalQuestion *)
             | StarBufRef                               (* *1 #1 ^1 %1 *match *)
             | "(" PatList ")"                          (* implicit anonymous list *)
             | "{" PatList "}" ;                        (* optional: 0 specificity if absent *)

MemRef       = "?" Symbol ;
Symbol       = ( Letter | "_" ) { Letter | Digit | "_" | "." } ;   (* dots ARE legal: StdP.BE *)
StarBufRef   = ("*" | "#" | "%" | "^") Digit+ | "*match" ;
```

Semantics of the operators, as needed here:

- **`,` (list)** — `("a","b") + "x"` is the two-element list `{"a x", "b x"}`. A match against a
  list succeeds if any element matches; specificity is that of the element that matched
  [spec §14.3].
- **`+` (concat)** — cross product of the two lists, joining with an implicit single space unless
  a wildcard already separates them [spec §5.1]. `("","#","# #")` is the standard idiom for
  "zero, one or two words".
- **`""` inside a list** — makes the whole element optional by producing an empty alternative:
  `("hi","hello","hey")+("there","")+(MYNAME,"")` — `WNG:433`.
- **`*`** — zero or more words. **`#`** — one word (or a word fragment when adjacent to
  literal characters: `"broil#"`, `"#ing"`, `"#\'s"`). **`^`** — exactly one character.
  **`%`** — one digit. [spec §5.1]
- **`\`** escapes the next character inside a string: `"*\,*"` is a literal comma, `"\?"` a
  literal question mark, `"#\'s"` a possessive.
- **Case is irrelevant** everywhere — keywords, symbol names (`Stdp.DO` at `QRD:780` and
  `StdP.Do` at `QRD:70` are the same list) and pattern text.
- **`Matches` vs `Contains`** — `Matches P` anchors the whole string; `Contains P` is
  `Matches "*"+P+"*"` [spec §5.2]. The library relies on this constantly: `FindOtherQuestion`
  uses `?StdQ.PossibleQuestion contains "*#\?*"` (`QRD:1381`) to find a `?` anywhere.

### 3.1 The unescaped comma inside a quoted pattern — HYPOTHESIS

An **unescaped** comma inside a pattern string is _not_ a literal comma. Evidence from the loaded
files (51 such strings in `QRD`, 36 in `WNG`, 19 in `CPROF`, 4 in `CGOOD`):

- `"uh,huh"` (`QRD:2242`) and `"Uh,uh"` (`QRD:2254`) are meant to catch _uh-huh_ / _uh huh_.
- `"O,K"` (`QRD:2238`) is meant to catch _OK_ / _O.K._ / _O K_.
- `"what,s up"`, `"how,s it goin#"`, `"what,s hap#"` (`WNG:920-924`) are meant to catch
  _what's up_, _how's it going_.
- `"good,night"` (`CGOOD:24`), `"ass,hole#"` / `"cock,tail"` / `"stop,cock"` (`CPROF:18,46`).
- By contrast the library writes `"\,"` when it wants a literal comma:
  `PatternList Punc is "\.","\?","\!","\,";` — `WNG:665`, and
  `If ?NameCapture.TempName Matches "*\,*" then …` — `WNG:540`.

**Hypothesis (not settled by the archive or the patents):** an unescaped `,` inside a pattern
string matches _zero or one intra-word separator_ — i.e. nothing, a space, a hyphen, an
apostrophe, or a period. The patents never mention it [spec §21 item 1]. A port should implement
it as a character class matching `""`, `" "`, `"-"`, `"'"`, `"."` and record the choice as an
assumption; getting it wrong degrades yes/no detection and the goodbye filter.

### 3.2 The block-terminator idioms used by this library

Three idioms recur and must be understood before reading §4–§7 [terminator semantics: spec §3]:

1. **The veto block** — an `If` whose body contains _only_ the terminator:
   ```
   If ?StdQ.LocalQuestion contains "how come*"
   then  //a ?ReasonQuestion, not a ?MethodQuestion.
   SwitchBack
   ```
   — `QRD:921-923`. It means "this input looks like something else; abandon this finder with the
   attribute still `Forget`ten". These are the _negative_ rules and there are dozens.
2. **The gate** — every finder after the first opens
   `If DontRecall <every earlier primary type> then Remember ?StdQ.LocalQuestion is ?StdQ.PossibleQuestion;`
   and encloses its whole body. If an earlier finder already set its attribute, the gate is false,
   the body is skipped, and the enclosing `Always` block falls through to `Switchback`.
3. **`MemoryLock ?X;`** at the top of a category asserts `?X` may only be written inside it
   [spec §3]. It is a compile-time assertion with no runtime effect; the port can ignore it, but
   it is a reliable index of which category owns which attribute.

---

## 4. `?WhatUserSaid` → `?WhatUserMeant`

### 4.1 `Priority Topic "Find ?WhatUserMeant"` (`QRD:132-169`)

Verbatim, with the nesting resolved (I verified block/terminator balance mechanically for the whole
file; the four trailing `Continue`s close the four nested `If`s):

```
Priority Topic "Find ?WhatUserMeant" is
//MemoryLock ?WhatUserMeant;
	Always

	// ?WhatUserMeant is part of the language.  By default it's set equal to ?WhatUserSaid.
	// ?WhatUserSaid cannot be modified, but we can 'clean up' ?WhatUserMeant to make it easier
	// to match on.

	// first the paranoia thing to protect us from any interference by code inserted before this.
	Remember ?WhatUserMeant is ?WhatUserSaid;

	If ?WhatUserMeant matches "want to*","wanna*" then
		Remember ?WhatUserMeant is "do you want to "+*1;
	Continue

	// then the spellchecker (ships with English dictionary -- dictionaries for other languages
	// are available from Neuromedia or Wintertree)
	Remember ?WhatUserMeant is Compute SpellCheck of ?WhatUserMeant;

	Forget ?StdP.DoneStrippingPunctuation;
	SwitchTo "Remove excess punctuation";
	If DontRecall ?StdP.DoneStrippingPunctuation
	then SwitchTo "Remove excess punctuation";
	   ( … 3 more nested repetitions … )
	Continue Continue Continue Continue
	Remember ?UnProcessedString is ?WhatUserMeant;
	Continue
EndTopic
```

Order of operations:

1. `?WhatUserMeant := ?WhatUserSaid`.
2. **`wanna` rewrite.** If the _whole_ string matches `"want to*"` or `"wanna*"`,
   `?WhatUserMeant := "do you want to " + *1`. Note this fires only at the very start of the
   string (`Matches`, not `Contains`), and it turns a user statement into a bot question — the
   user typing "wanna play a game" becomes "do you want to play a game", which then classifies as
   a `?FactQuestion`. This is intentional (MrMind's 20-Questions activity depends on it).
3. **Spell-check.** `Compute SpellCheck of ?WhatUserMeant`. Backed by the Wintertree dictionary
   named in the `.vsr` (`ssceam.tlx`, `ssceam2.clx`, `Additions.tlx`) plus the project lexicons
   `MRMIND3.tlx` / `MRMIND3.script.tlx`. **The dictionaries are not in the archive** (§1.5), so a
   faithful port cannot reproduce spell correction exactly; see §14 for the recommended
   mitigation. Its effects are visible in the scripts: `WNG:459-463` captures
   `?String1` = first word of `?WhatUserSaid` and `?String2` = first word of `?WhatUserMeant`
   precisely to detect when spell-check has mangled a user's name
   ("a check for people whose names spell-check to cause bogus response-type activations." —
   `WNG:458`), and `Mrmind3/Activities/ategag.n:22-23` relies on `zink`, `zlink`, `pkink` being
   "words that cannot be entered through the spell checker".
4. **Punctuation stripping**, up to 5 calls of the Sequence topic below.
5. `?UnProcessedString := ?WhatUserMeant`.

### 4.2 `Sequence topic "remove excess punctuation"` (`QRD:439-464`)

```
Sequence topic "remove excess punctuation" is
 //strips quotes, asterisks, and parens from the input string -- they confuse pattern matching.

 							  //alone    trailing  leading   embedded
	If ?WhatUserMeant Matches "* \' #*", "*#\' *", "* \'#*",            //singlquote
							  "* \" #*", "*#\" *", "* \"#*",            //doublequote
							  "* \) #*", "*#\) *", "* \)#*", "*\)#*",   //right paren
							  "* \( #*", "*#\( *", "* \(#*", "*\(#*",   //left paren
							  "* \* #*", "*#\* *", "* \*#*", "*\*#*"    //asterisks
	then
		Remember ?WhatUserMeant is *1+" "+#1+" "+*2;
	Continue
							 //sentence leading  sentence trailing
	If ?WhatUserMeant Matches "\'*",			"*\'",   //singlequote
							   "\"*",			"*\"",   //doublequote
							   "\)*",			"*\(",   //rightparen
							   "\(*",			"*\)",   //leftparen
							   "\**",			"*\*"	  //asterisks
	then
		Remember ?WhatUserMeant is *1;

	SwitchBack
	Otherwise Always
		Remember ?StdP.DoneStrippingPunctuation;
	SwitchBack
EndTopic
```

Semantics per call:

- **Block 1 (embedded)** removes _one_ occurrence of `'`, `"`, `(`, `)` or `*` that sits between
  two other tokens, rebuilding the string as `*1 + " " + #1 + " " + *2`. Ends `Continue`, so
  block 2 is evaluated in the same call.
- **Block 2 (edge)** removes _one_ leading or trailing such character. Ends `SwitchBack`.
- **`Otherwise Always`** — reached only when block 2 did **not** fire — sets
  `?StdP.DoneStrippingPunctuation` and `SwitchBack`s.

**Edge case (original bug, must be replicated).** `?StdP.DoneStrippingPunctuation` is attached to
block 2, not to "nothing changed". So if block 1 fires but block 2 does not, the flag is set
anyway and the driver stops looping — leaving any _second_ embedded quote/paren in place. Input
`he said "a" and "b"` therefore keeps one of its quote marks.

**Edge case.** Note the swapped comment/pattern at `QRD:454`: `"\)*"` is labelled "rightparen" and
`"*\("` "leftparen", i.e. the edge rules strip a _leading_ `)` and a _trailing_ `(`, and
`QRD:455` strips a leading `(` and a trailing `)`. Both lines together cover all four cases, so
the mislabelling is harmless — but copy the patterns, not the comments.

**Cost model.** 1 unconditional call + 4 conditional = at most 5 calls, so at most 5 embedded and
5 edge characters removed per turn. Longer runs of punctuation survive.

### 4.3 `Priority topic "find ?ProcessedString"` (`QRD:173-223`)

```
Priority topic "find ?ProcessedString" is
	Always
		Remember ?ProcessedString is ?UnProcessedString;

		Forget ?StdP.DoneStrippingLeaders;
		SwitchTo "Strip meaningless leaders";
		If DontRecall ?StdP.DoneStrippingLeaders then
			SwitchTo "Strip meaningless leaders";      (x3 nested)
		Continue Continue Continue

		Forget ?StdP.DoneStrippingInternals;
		SwitchTo "strip meaningless internals";
		If DontRecall ?StdP.DoneStrippingInternals then
			SwitchTo "strip meaningless internals";    (x4 nested)
		Continue Continue Continue Continue

		Forget ?StdP.DoneExpanding;
		SwitchTo "Expand Contractions";
		If DontRecall ?StdP.DoneExpanding then
			SwitchTo "Expand Contractions";            (x5 nested)
		Continue Continue Continue Continue Continue
	Endtopic
```

Call budgets, verified by counting the nested `If`s: **leaders ≤ 4, internals ≤ 5, contractions ≤ 6.**

### 4.4 `Sequence Topic "Strip meaningless leaders"` (`QRD:467-492`)

```
	Always
		If ?ProcessedString matches ("and,", "but,","Exactly,", "or," ,"Please, ","Excellent, ",
		"great, ", "OK, ","okay, ","yep, ","nope, ","yes, ","no, ", "wow, ","oh, ","of course, ",
		"hey, ", "wait\,", "maybe ","perhaps, ", "possibly, ","Uh, ","well, ","so, ","now, ",
		"then, ", "thanks, ", StdP.COOL+", ","whatever, ","hi, ","hello, ", "Hmm," ) + "*",
		"*, Please"                 //okay, so the last is actually a trailer...
		and *1 DoesNotMatch ""
		then
			Remember ?ProcessedString is *1;
		SwitchBack
		Otherwise if (?ProcessedString DoesNotMatch
			"you know how*","you know what","you know whether*","you know anything*","you know about*")
			and ?ProcessedString Matches "you know*"
			and *1 doesnotMatch ""
		Then
			Remember ?ProcessedString is *1;
		SwitchBack
		Otherwise if ?ProcessedString matches "wanna *" then
			Remember ?ProcessedString is "Do you want to "+*1;
		SwitchBack
		Otherwise Always
			Remember ?StdP.DoneStrippingLeaders;
		SwitchBack
	SwitchBack
```

with

```
PatternList StdP.COOL is "cool","great","terrific","excellent",
"all right","definitely","very cool","kewl", ":-)",";-)","wow",
"alright","totally","fine","sounds cool","no problem";
```

— `QRD:86-88`

One leader per call, at most four calls. `*1 DoesNotMatch ""` prevents stripping the _whole_
input (so a bare "okay," survives). The `"you know*"` rule strips conversational "you know" but
protects the five real-question forms. The `"wanna *"` rule duplicates the `?WhatUserMeant` rule
of §4.1 on the `?ProcessedString` track (note: capital `"Do you want to "` here, lower-case
`"do you want to "` there).

### 4.5 `Sequence Topic "Strip meaningless internals"` (`QRD:497-527`)

```
	Always
		If ?ProcessedString matches
			//various emphasizers which don't change the core meaning.
			"*" +
			("actually", "really", "completely",  "utterly",  "exactly",
			"quite",  "in the heck", "the heck",	"only","Thanks", "Thanks",
			"honestly","very","just","Thank you,","   ","  ") + "*"
			//the last two contract doublespaces into singlespaces.
		then
			Remember ?ProcessedString is *1 +" "+ *2;
		SwitchBack
		Otherwise if
			?ProcessedString doesNotMatch "*"+("stand#,","stood")+"still"+"*"
			and ?ProcessedString Matches "*"+"still"+"*"
			then
				Remember ?ProcessedString is *1 + " " + *2;
			SwitchBack
		Otherwise if
			?ProcessedString Matches "*or something,"
			then
				Remember ?ProcessedString is *1;
				if ?WhatUserSaid matches "*?" then
					remember ?ProcessedString is ?ProcessedString+"?";
				switchback
			SwitchBack
		Otherwise Always
			Remember ?StdP.DoneStrippingInternals;
		SwitchBack
	SwitchBack
```

Notes: `"Thanks"` appears twice (harmless duplicate). The trailing `"   "` / `"  "` entries collapse
triple/double spaces. The `"still"` rule deletes the adverb _still_ unless it is part of
_stand(s/ing) still_ / _stood still_. The `"or something,"` rule strips the trailing hedge and then
**re-appends a `?`** if the raw `?WhatUserSaid` ended in one — the only place in the library where
`?WhatUserSaid` is consulted to repair `?ProcessedString`.

### 4.6 `Sequence Topic "Expand Contractions"` (`QRD:532-750`)

Guard (the whole topic body is inside this one block):

```
	If ?ProcessedString contains
		("aren't","can't","cannot","couldn't","doesn't","Don't","didn't","isn\'t",
		"I'm","I've","I\'ll","haven't","he\'ll","she\'ll","shouldn't","that's","they're",
		"let's","they've","they'll","we\'re","we\'ll","what's","where's","who's","Won't",
		"wouldn't","you're","you've","you'll","you'd","I\'d",
		"it's","he's","he'd","how're","how's","she's",
		"she\'d","they'd","we\'d","   ","  ")
	Then
```

— `QRD:537-544`

**Simple expansions**, each its own `If … Then Remember ?ProcessedString is *1 + " X " + *2; Continue`,
so _one occurrence of each_ is expanded per call, and all of them are tried in this fixed order:

| Contraction                                       | Replacement                             | Line |
| ------------------------------------------------- | --------------------------------------- | ---- |
| `"   "` / `"  "`                                  | `" "`                                   | 545  |
| `aren't`                                          | `are not`                               | 547  |
| `can't`, `cannot`                                 | `can not`                               | 549  |
| `couldn't`                                        | `could not`                             | 551  |
| `did'NT`                                          | `did not`                               | 553  |
| `doesn't`                                         | `does not`                              | 555  |
| `Don't`                                           | `do not`                                | 557  |
| `didn't`                                          | `did not`                               | 559  |
| `I'm`                                             | `I am`                                  | 561  |
| `Isn't`                                           | `is not`                                | 563  |
| `I've`                                            | `I have`                                | 565  |
| `I'll`                                            | `I will`                                | 567  |
| `haven't`                                         | `have not`                              | 569  |
| `he'll`                                           | `he will`                               | 571  |
| `how're`                                          | `how are`                               | 573  |
| `how's`                                           | `how is`                                | 575  |
| `she'll`                                          | `she will`                              | 577  |
| `shouldn't`                                       | `should not`                            | 579  |
| `that's`                                          | `that is ` (two spaces, verbatim)       | 581  |
| `they're`                                         | `they are`                              | 583  |
| `let's` (**leading only**: `matches "let's"+"*"`) | `"Let us "+*1`                          | 585  |
| `they've`                                         | `they have`                             | 587  |
| `they'll`                                         | `they will`                             | 589  |
| `we're`                                           | `we are`                                | 591  |
| `we'll`                                           | `we will`                               | 593  |
| `what's`                                          | `what is`                               | 595  |
| `where's`                                         | `where is`                              | 597  |
| `who's`                                           | `who is`                                | 599  |
| `Won't`                                           | `will not`                              | 601  |
| `wouldn't`                                        | `would not`                             | 603  |
| `you're`                                          | `you are`                               | 605  |
| `you've`                                          | `you have`                              | 607  |
| `you'll`                                          | `you will`                              | 609  |
| `you'd`                                           | `you had` (always "had", never "would") | 611  |

**Ambiguous expansions**, each disambiguated by looking at the first word of the remainder. The
pattern is identical for all seven; here it is verbatim for `I'd`:

```
		If ?ProcessedString matches "*"+"I\'d"+"*"
		Then
			Remember ?StdP.Firstpart is *1;
			Remember ?StdP.SecondPart is *2;

			if ?StdP.SecondPart matches "#*" and #1 matches ("like","rather", StdP.HAVE)
			then
				Remember ?ProcessedString is ?StdP.Firstpart + " I would " + ?StdP.SecondPart;
			continue

			if ?StdP.SecondPart matches "#*" and #1 DoesNotMatch ("like","rather",StdP.HAVE)
			then
				Remember ?ProcessedString is ?StdP.Firstpart + " I had " + ?StdP.SecondPart;
			continue
		Continue
```

— `QRD:614-628`, with `PatternList StdP.HAVE is "Have","Had","Having","has";` (`QRD:91`)

| Contraction | next word ∈ …               | →                                  | else →     | Line |
| ----------- | --------------------------- | ---------------------------------- | ---------- | ---- |
| `I'd`       | `like`, `rather`, StdP.HAVE | `I would`                          | `I had`    | 614  |
| `it's`      | `been`                      | `it has been` **+ `*1`** (see bug) | `it is`    | 630  |
| `he's`      | StdP.Articles               | `He is` (capital H)                | `he has`   | 647  |
| `he'd`      | `like`, `rather`, StdP.HAVE | `he would`                         | `he had`   | 664  |
| `she's`     | StdP.Articles               | `she is`                           | `she has`  | 681  |
| `she'd`     | `like`, `rather`, StdP.HAVE | `she would`                        | `she had`  | 697  |
| `they'd`    | `like`, `rather`, StdP.HAVE | `they would`                       | `they had` | 713  |
| `we'd`      | `like`, `rather`, StdP.HAVE | `we would`                         | `we had`   | 729  |

with `PatternList StdP.Articles is "a","an","the", "these","those","some", "your","my","his","her","our","their", "#\'s";` (`QRD:62-65`).

**Bug to replicate — `it's been`.** `QRD:637` reads
`Remember ?ProcessedString is ?StdP.Firstpart + " it has been " + *1;` where every sibling rule uses
`?StdP.SecondPart`. `*1` at that point is the star buffer of the _inner_ match
`?StdP.SecondPart matches "#"+"*"`, i.e. everything after "been". So "it's been fun" correctly
yields "it has been fun", but the mechanism differs and the port must use `*1` here, not
`?StdP.SecondPart` (which would give "it has been been fun").

**Bug to replicate — the `we'd` block terminates the topic.** I verified the block/terminator
nesting mechanically. The `we'd` block ends `SwitchBack` (`QRD:745`), unlike every sibling which
ends `Continue`; and the `Otherwise Always Remember ?StdP.DoneExpanding;` (`QRD:746-748`) is
therefore attached to the **`we'd` block**, not to the outer guard. Consequences:

- If the input contains `we'd`, the topic `SwitchBack`s _without_ setting `?StdP.DoneExpanding`,
  so the driver calls it again — all six times.
- If the input contains some contraction but not `we'd`, `?StdP.DoneExpanding` is set on the first
  call and the driver stops after one pass. **So at most one occurrence of each contraction is
  ever expanded** ("I don't know and you don't either" keeps its second `don't`).
- If the input contains _no_ contraction and no double space, the outer guard is false, **no block
  activates**, and the Sequence category falls off its end. Per [spec §3] that returns
  `NextCategory`, which under [spec §11] abandons the rest of `"find ?ProcessedString"` and moves
  to the next Priority category. In this file the remainder of `"find ?ProcessedString"` is only
  the five unexecuted `SwitchTo` attempts, so the observable result is identical to a clean
  `SwitchBack`. **Recommended implementation:** treat "fell off the end of a Sequence category
  entered by `SwitchTo`" as an implicit `SwitchBack`; for this build it is observationally
  equivalent and it avoids leaving a stale entry on the switch stack.

There is also a stray inside the `we'd` block: `If ?ProcessedString matches " *" then remember
?ProcessedString is *1; Continue` (`QRD:743`) — a leading-space trim that only ever runs when the
input contained `we'd`.

### 4.7 `Priority topic "Set possible statements"` (`QRD:226-231`)

```
Priority topic "Set possible statements" is
	Always
		Remember ?StdS.PossibleStatement is ?ProcessedString;
		Remember ?StdQ.PossibleQuestion is ?ProcessedString;
	Continue
EndTopic
```

### 4.8 Pronoun replacement: **MrMind3 does none**

[spec §13.3] documents `Compute ReplacePronouns of …` driven by `SubjectInfo` declarations. I
grepped the entire archive: **zero** occurrences of `ReplacePronouns` or `SubjectInfo` in any file.
The only `Compute` functions used anywhere in the build are:

```
18  Compute URLEncoding of      (WNG / web templates)
 6  Compute Uppercase of
 6  Compute Capitalize of
 5  Compute Sum of              (profanity strike counter)
 3  Compute Lowercase of
 2  Compute SpellCheck of       (QRD:149 and the identical line in the unused StdQuestion.us.n)
```

MrMind resolves pronouns entirely through subject-based attention focus and the `Focused`
condition [spec §13.1-13.2] — 149 occurrences of `Focused`/`WhenFocused`/`DontFocus` in the build.
A port must **not** add pronoun substitution.

---

## 5. The previous-utterance snapshot

```
Priority topic "Previous utterance topic" is
	Always
		SwitchTo "Set Previous Questions/Statements";
	Continue
EndTopic

Priority Scenario "Previous utterance Scenario" is
	Always
		SwitchTo "Set Previous Questions/Statements";
	Continue
EndScenario
```

— `QRD:240-250`

`Sequence Topic "Set Previous Questions/Statements"` (`QRD:253-339`) `MemoryLock`s 31
`?Previous…` attributes and then, for each of the 31 base attributes, executes the identical pair

```
IfRecall ?AnyStatement then Remember ?PreviousAnyStatement is ?AnyStatement; continue
Otherwise Always Forget ?PreviousAnyStatement; continue
```

— `QRD:274-275`

Because this Priority topic runs **before** `FindQuestion` and `ParseStatements`, the values it
reads are still last turn's. The snapshot list (all 31, in file order):

```
AnyStatement, CanQuestion, MethodQuestion, WhoQuestion, WhatIfQuestion, LocationQuestion,
ReasonQuestion, ShouldQuestion, TimeQuestion, FactQuestion, DescriptionQuestion, OtherQuestion,
AnyQuestion, CompareQuestion, ConfirmQuestion, CostQuestion, DirectionsQuestion, DoHaveQuestion,
ExampleQuestion, MoreQuestion, ObtainQuestion, MessageStatement, ActStatement, TimeStatement,
ConditionalStatement, IsStatement, HaveStatement, WantStatement, FactStatement, CauseStatement,
FeelingStatement, otherStatement
```

(That is 32 entries; the `MemoryLock` list at `QRD:259-271` names 31 and omits
`?PreviousOtherStatement`, which is nonetheless written at `QRD:336` — an inconsistency with no
runtime effect, since `MemoryLock` is a compile-time assertion.)

The `?Previous*` attributes are consumed **only** inside the question finders, by two rule shapes:

- `If Recall ?FollowUpQuestion and recall ?PreviousXxxQuestion then Remember ?XxxQuestion is ?PreviousXxxQuestion;`
- `If ?StdQ.LocalQuestion matches StdP.WhatAbout+"*" and Recall ?PreviousXxxQuestion then Remember ?XxxQuestion is *1;`

with `PatternList StdP.WhatAbout is "what about","how about","more about";` (`QRD:120`).

---

## 6. Question classification

### 6.1 Registered attributes and their specificities

Verbatim from `QRD:20-58`. These are the **only** `Attribute … Specificity` declarations in the
entire build (the identical block in `LIB/StdQuestion/StdQuestion.us.n` is not loaded).

```
Attribute ?CanQuestion            Specificity 3000;
Attribute ?DescriptionQuestion    Specificity 3000;
Attribute ?FactQuestion           Specificity 3000;
Attribute ?LocationQuestion       Specificity 3000;
Attribute ?MethodQuestion         Specificity 3000;
Attribute ?ReasonQuestion         Specificity 3000;
Attribute ?ShouldQuestion         Specificity 3000;
Attribute ?TimeQuestion           Specificity 3000;
Attribute ?WhatIfQuestion         Specificity 3000;
Attribute ?WhoQuestion            Specificity 5000;
Attribute ?OtherQuestion          Specificity 3000;
Attribute ?AnyQuestion 			  Specificity 2500;

Attribute ?ObtainQuestion 		Specificity 5500;
Attribute ?CostQuestion 		Specificity 6000;
Attribute ?DirectionsQuestion 	Specificity 6000;
Attribute ?CompareQuestion 		Specificity 6000;
Attribute ?ExampleQuestion 		Specificity 6000;
Attribute ?MoreQuestion 		Specificity 6000;
Attribute ?ConfirmQuestion 		Specificity 6000;
Attribute ?DoHaveQuestion 		Specificity 7000;
Attribute ?FollowUpQuestion		Specificity 8000;

Attribute ?MessageStatement			Specificity 3400;
Attribute ?ActStatement				Specificity 3400;
Attribute ?IsStatement				Specificity 2800;
Attribute ?HaveStatement			Specificity 2800;
Attribute ?WantStatement			Specificity 2800;
Attribute ?FactStatement 			Specificity 2800;

Attribute ?TimeStatement			Specificity 3400;
Attribute ?ConditionalStatement     Specificity 3400;
Attribute ?CauseStatement 			Specificity 3200;
Attribute ?FeelingStatement			Specificity 3200;

Attribute ?OtherStatement           Specificity 1950;
Attribute ?AnyStatement             Specificity 2200;
```

That is **33 registered attributes**. Every other attribute the library sets —
`?YesResponse`, `?NoResponse`, `?NotSureResponse`, `?HaveName`, `?Name`, `?ProfanityStrikes`,
`?StdQ.*`, `?StdS.*`, `?StdP.*`, `?Previous*` — is **unregistered and therefore scores the default
2000** when tested with `Recall`/`Matches` in a best-fit computation [spec §14.2]. This matters
directly for response selection: a topic keyed on `Recall ?DoHaveQuestion` (7000) beats one keyed
on `Recall ?FactQuestion` (3000) beats one on `Recall ?AnyQuestion` (2500) beats one on
`Recall ?OtherStatement` (1950); a topic keyed on `Recall ?YesResponse` scores 2000.

### 6.2 Values: what each attribute is set _to_

Every finder writes the **stripped subject** of the utterance, not a boolean. `Remember ?X;` with
no `is` sets the value `"TRUE"` [spec §6]; the question/statement finders always use
`Remember ?X is <string>`. Examples straight from the archive:

- `If ?StdQ.LocalQuestion matches ("who","whom","whose")+StdP.BE+"*" then remember ?WhoQuestion is *1;`
  — `QRD:976-977`. Input "who is Walter" → `?WhoQuestion = "Walter"`.
- `If ?StdQ.LocalQuestion matches "What"+(StdP.Be,StdP.Do, "about")+"*" then remember ?DescriptionQuestion is *1;`
  — `QRD:1286-1288`. Input "what is a soul" → `?DescriptionQuestion = "a soul"`.
- `If ?StdQ.LocalQuestion matches "Can*", "Could*","May*","would*" then Remember ?CanQuestion is *1;`
  — `QRD:869-870`. Input "can you think" → `?CanQuestion = "you think"`.

Three exceptions where the value is _not_ a substring of the input:

- `?ConfirmQuestion` may be set to the literal `"Really?"` — `QRD:1499`.
- `?ExampleQuestion` may be set to `""` — `QRD:1598`, with the comment `//totally context free…`.
  An empty string still counts as "remembered" for `Recall` purposes in this library's own logic
  (the finders rely on it).
- `?CompareQuestion` and `?DoHaveQuestion` synthesise text: `Remember ?CompareQuestion is *1+" and "+*2;`
  (`QRD:1458`), `Remember ?DoHaveQuestion is #1 + " has "+ *1;` (`QRD:1580`).

`?AnyQuestion` and `?AnyStatement` are special: they are always set to the _whole_
`?ProcessedString` / `?StdS.PossibleStatement`, never a stripped fragment:

```
Sequence topic "StdQ.FindAnyQuestion" is
MemoryLock ?AnyQuestion;
	Always
	Forget ?AnyQuestion;
		IfRecall ?CanQuestion,?MethodQuestion,?WhoQuestion,?WhatIfQuestion,
			 ?LocationQuestion, ?ReasonQuestion, ?ShouldQuestion,
			 ?TimeQuestion, ?LocationQuestion, ?FactQuestion,
			 ?DescriptionQuestion, ?OtherQuestion
		Then  //an ?AnyQuestion is equal to a ?ProcessedString, no matter what.
			  //The StdQ.PossibleQuestion may have had stuff stripped from it.
			Remember ?AnyQuestion is ?ProcessedString;
		Switchback
	Switchback
EndTopic
```

— `QRD:1418-1431` (the comma list in `IfRecall` is OR [spec §4]; `?LocationQuestion` is listed twice)

### 6.3 The shared PatternLists (`QRD:62-122`)

```
PatternList StdP.Articles is "a","an","the",  //general articles
"these","those","some",                   //demonstrative articles
"your","my","his","her","our","their",    //pronominal posessive articles
"#\'s"; 								  //proper posessives

PatternList StdP.BE is "is","are","was","were","am","be","been","being";

PatternList StdP.Do is "do","done","did","doing","does";

PatternList StdP.QuestionStarts is
(("can","could","would","will", Stdp.DO)+"you","")+
("say","tell me","talk about","explain","tell","know","define"),

(("can","could","would","will", Stdp.DO)+"you","")+
"give"+("","#","# #")+"information"+("about","on","concerning"),

"I"+("want","would like","need")+("","#","# #")+
("to know",("information","news")+("on","about","concerning")),

"I"+("was","")+"wonder#";

PatternList StdP.COOL is "cool","great","terrific","excellent",
"all right","definitely","very cool","kewl", ":-)",";-)","wow",
"alright","totally","fine","sounds cool","no problem";

PatternList StdP.HAVE is "Have","Had","Having","has";

PatternList StdP.I is "I","I/'#","me","my","we","us","myself","ourselves";

PatternList StdP.Location is "state","county","city","street","neighborhood","town",
"country","nation","location";

Patternlist StdP.Prepositions is
"to","across","in","on","of","at","through","over","under","beside","behind", "between","among",
"before","within","without","inside","outside","around","near","for","from","off","out";

Patternlist StdP.YOU is "you", "U","yourself";

PatternList StdP.MorePatterns is
"and",
"for example",
"go on",
"Give me more detail#",
"like",
"like what",
"More",
"such as",
"Tell me more about that",
"Tell me more",
"What else",
"#, some more information please";

PatternList StdP.WhatAbout is "what about","how about","more about";

PatternList StdQ.QuestionWords is "who","what","why","when","where","how";
```

Two typos worth preserving exactly: `StdP.I` contains `"I/'#"` (`QRD:93`) — a forward slash where
a backslash was meant, so this element matches the literal text `I/'` + one word rather than
`I'm`/`I've`; and `StdP.QuestionStarts` writes `Stdp.DO` where every other reference writes
`StdP.Do` (case-insensitive, so it resolves).

`StdP.QuestionStarts` expands to a large list; the important members are
`{can,could,would,will,do,done,did,doing,does} you {say, tell me, talk about, explain, tell, know,
define}`, the bare `{say, tell me, …}` forms (because of the trailing `""` alternative),
`… give [1-2 words] information {about,on,concerning}`, `I {want, would like, need} [0-2 words] to
know`, `I {want,…} [0-2 words] {information,news} {on,about,concerning}`, and `I [was] wonder…`.

### 6.4 `Priority topic "FindQuestion "` — the driver (`QRD:350-377`)

Note the trailing space in the category name.

```
Priority topic "FindQuestion " is
	Always
	Forget ?StdQ.LastDitchEffort;
	Forget ?FollowUpQuestion;
	SwitchTo "Find Primary Question types";
	If (Recall ?OtherQuestion) or (DontRecall ?AnyQuestion)  then
		SwitchTo "Strip leading phrases";
		SwitchTo "Find Primary Question types";
		If (Recall ?OtherQuestion) or (DontRecall ?AnyQuestion)  then
			SwitchTo "Strip leading phrases";
			SwitchTo "Find Primary Question types";
			If (Recall ?OtherQuestion) or (DontRecall ?AnyQuestion)  then
				SwitchTo "Strip leading phrases";
				SwitchTo "Find Primary Question types";
			Continue
		Continue
	Continue
	//okay, these last two will be equal to processedString anyway
	//if set, and besides we may have cut something that OtherQuestion
	//can identify...so we undo any cutting that's been done.
	Remember ?StdQ.PossibleQuestion is ?ProcessedString;
	remember ?StdQ.LastDitchEffort; //a signal to FindOtherQuestion
	SwitchTo "StdQ.FindOtherQuestion";
	SwitchTo "StdQ.FindAnyQuestion";
	//We now have our primary and our AnyQuestion, if we're gonna, so...  /////
	SwitchTo "Find Secondary Question Types";
	Continue
EndTopic
```

Algorithm:

1. `Forget ?StdQ.LastDitchEffort`, `Forget ?FollowUpQuestion`.
2. Run all twelve primary finders once (`"Find Primary Question types"`).
3. **Up to three retry rounds.** Each round runs `"Strip leading phrases"` (which cuts one clause
   off `?StdQ.PossibleQuestion`, and may set `?FollowUpQuestion`) then re-runs all twelve finders.
   A round happens iff `?OtherQuestion` is set **or** `?AnyQuestion` is not.
4. Restore `?StdQ.PossibleQuestion := ?ProcessedString`, set `?StdQ.LastDitchEffort`, and run
   `StdQ.FindOtherQuestion` and `StdQ.FindAnyQuestion` one final time on the _unstripped_ string.
5. Run the eight secondary finders.

**Important consequence:** `?FollowUpQuestion` can only be set inside `"Strip leading phrases"`,
which only runs from round 2 onward. So on an input that produces a question on the first pass,
`?FollowUpQuestion` is **never** set — no matter how much it looks like a follow-up.

### 6.5 `Sequence Topic "strip leading phrases"` (`QRD:766-802`)

```
	Always
		Always
			If ?StdQ.PossibleQuestion matches STDP.MorePatterns then
				Remember ?FollowUpQuestion;
			Continue
		Continue

		If ?StdQ.PossibleQuestion Matches "#? *" and *1 contains #1
		Then  //as in "gerbil?  What's gerbil?"
			Remember ?StdQ.PossibleQuestion is *1;
		SwitchBack

		If ?StdQ.PossibleQuestion Contains StdQ.QuestionWords+
			(StdP.Do,"can","would","should","could")+"*"
		Then
			Remember ?StdQ.PossibleQuestion is *match;
		SwitchBack

		If ?StdQ.PossibleQuestion contains
		"how" +("large","small","many","much","far","near","close","few","long","short","often")+"*"
		Then
			Remember ?StdQ.PossibleQuestion is *match;
		SwitchBack

		If ?StdQ.PossibleQuestion contains ("and*","but*")
		Then
			Remember ?StdQ.PossibleQuestion is *1;
		SwitchBack

		If (?StdQ.PossibleQuestion Matches "*\,*", "*;*", "*\.*", "*!*" )
			and (*2 DoesNotMatch "")
		Then
		   	Remember ?StdQ.PossibleQuestion is *2;
		SwitchBack
	SwitchBack
```

`?FollowUpQuestion` is set (value `"TRUE"`) when the _whole_ remaining question string is one of
`StdP.MorePatterns`. `*match` is the substring that matched the whole `Contains` pattern
[spec §5], so rules 2 and 3 _keep_ the question core and throw away the preamble. Rule 5 keeps the
text **after** the last comma/semicolon/period/exclamation (`*2`), which is why the finders can
handle "yes, but what is a soul?".

### 6.6 `Sequence topic "Find Primary Question types"` (`QRD:807-826`)

```
	Always
	//The order in which these are called is very important.  They check attributes
	//definitely forgotten and possibly set by the other topics called before them.
	//Thus, if there is a ?CanQuestion, an ?MethodQuestion will NOT be found,
	//etc.
	SwitchTo "StdQ.FindCanQuestion";
	SwitchTo "StdQ.FindMethodQuestion";
	SwitchTo "StdQ.FindWhoQuestion";
	SwitchTo "StdQ.FindWhatIfQuestion" ;
	SwitchTo "StdQ.FindLocationQuestion";
	SwitchTo "StdQ.FindReasonQuestion";
	SwitchTo "StdQ.FindShouldQuestion";
	SwitchTo "StdQ.FindTimeQuestion";
	SwitchTo "StdQ.FindFactQuestion";
	SwitchTo "StdQ.FindDescriptionQuestion";
	SwitchTo "StdQ.FindOtherQuestion";  //if this is removed, it won't get things like "huh?";
	SwitchTo "StdQ.FindAnyQuestion";
	Switchback
EndTopic
```

**At most one primary type is ever set** (excluding `?AnyQuestion`), because each finder's gate is
`If DontRecall <all earlier finders' attributes>`. The precedence order is exactly the call order:

```
Can > Method > Who > WhatIf > Location > Reason > Should > Time > Fact > Description > Other
```

Each finder begins `MemoryLock ?X; Always Forget ?X;` so the attribute is cleared every turn even
when nothing matches.

### 6.7 The eleven primary finders, rule by rule

Notation: rules execute top to bottom; **[veto]** = the rule's body is empty and it ends
`SwitchBack`, abandoning the finder with the attribute unset; **[set]** = assigns then
`SwitchBack`; **[strip]** = rewrites `?StdQ.LocalQuestion` then `continue`s to the next rule.
`LQ` = `?StdQ.LocalQuestion`, initialised to `?StdQ.PossibleQuestion` by the gate.

---

**`StdQ.FindCanQuestion`** (`QRD:846-884`) — gate: none (runs first).

| #   | Condition                                                                                             | Action                                           |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | `Recall ?FollowUpQuestion and recall ?PreviousCanQuestion`                                            | **[set]** `?CanQuestion := ?PreviousCanQuestion` |
| 2   | `LQ matches StdP.WhatAbout+"*" and Recall ?PreviousCanQuestion`                                       | **[set]** `*1`                                   |
| 3   | `LQ matches StdP.QuestionStarts+"*"`                                                                  | **[veto]**                                       |
| 4   | `LQ matches ("*")+("time","day","date","month","week","season","year")+"*"`                           | **[veto]** `//a timequestion not a canquestion.` |
| 5   | `LQ matches "Can*", "Could*","May*","would*"`                                                         | **[set]** `*1`                                   |
| 6   | `LQ matches (StdP.I,StdP.You,"he","she","they")+("can","could","would")+"*\?" and LQ matches "# # *"` | **[set]** `#1+" "+*1`                            |
| 7   | `LQ matches StdP.Be + "# capable of*"`                                                                | **[set]** `#1 + " " + *1`                        |

---

**`StdQ.FindMethodQuestion`** (`QRD:887-948`) — gate: `DontRecall ?CanQuestion`.

| #   | Condition                                                                                                                                                                                                                                                                                                                                     | Action                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `LQ matches StdP.WhatAbout+"*" and Recall ?PreviousMethodQuestion`                                                                                                                                                                                                                                                                            | **[set]** `*1`                                                     |
| 2   | `Recall ?FollowUpQuestion and recall ?PreviousMethodQuestion`                                                                                                                                                                                                                                                                                 | **[set]** `?PreviousMethodQuestion`                                |
| 3   | `LQ matches StdP.QuestionStarts+"*"`                                                                                                                                                                                                                                                                                                          | **[strip]** `LQ := *1`                                             |
| 4   | `LQ matches "how much*","how many*","how large*","how big*","how small*","how old*","how long*","how fast*","how slow*","how quickly*","how slowly*","how far*","how near*","how easy*","how hard*","how difficult*","how compl#*","how simple*","how"+StdP.Be+("",StdP.Articles)+"#","how"+(StdP.Be,StdP.Have)+"*"+("been","doing","going")` | **[veto]**                                                         |
| 5   | `LQ matches "how #"+(StdP.Be,StdP.Have,StdP.Do,"can")+"*" and #1 DoesNotmatch ("he","she",StdP.I,"they")`                                                                                                                                                                                                                                     | **[veto]** `//intended to catch the case where #1 is an adjective` |
| 6   | `LQ contains "much*cost","much*price","much*money"`                                                                                                                                                                                                                                                                                           | **[veto]**                                                         |
| 7   | `LQ contains "how come*"`                                                                                                                                                                                                                                                                                                                     | **[veto]** `//a ?ReasonQuestion`                                   |
| 8   | `LQ matches "How about*", "how do you feel about*"`                                                                                                                                                                                                                                                                                           | **[veto]**                                                         |
| 9   | `LQ matches "how*compare#*","how*differ#*"`                                                                                                                                                                                                                                                                                                   | **[veto]**                                                         |
| 10  | `LQ matches "how"+(StdP.do,"would","could","will","can",StdP.be)+"*"`                                                                                                                                                                                                                                                                         | **[set]** `*1`                                                     |
| 11  | `LQ matches "how*","show me how*"`                                                                                                                                                                                                                                                                                                            | **[set]** `*1`                                                     |

(A commented-out rule 10½ for `"what should I do"` sits at `QRD:938-940`.)

---

**`StdQ.FindWhoQuestion`** (`QRD:950-990`) — gate: `DontRecall ?MethodQuestion, ?CanQuestion`.
Specificity **5000**, the highest of the primaries.

| #   | Condition                                                                                                           | Action                           |
| --- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | `Recall ?FollowUpQuestion and recall ?PreviousWhoQuestion`                                                          | **[set]** `?PreviousWhoQuestion` |
| 2   | `LQ matches StdP.WhatAbout+"*" and Recall ?PreviousWhoQuestion`                                                     | **[set]** `*1`                   |
| 3   | `LQ matches StdP.QuestionStarts+"*"`                                                                                | **[strip]**                      |
| 4   | `LQ contains ("someone","man","men","guy#","woman","women","boy#","girl#","bot","bots","person","people")+"named*"` | **[set]** `*1`                   |
| 5   | `LQ matches ("who","whom","whose")+StdP.BE+"*"`                                                                     | **[set]** `*1`                   |
| 6   | `LQ matches "what"+("man","woman","person","company")+"*"`                                                          | **[set]** `*1`                   |
| 7   | `LQ matches ("who","whom","whose")+"*"`                                                                             | **[set]** `*1`                   |

---

**`StdQ.FindWhatIfQuestion`** (`QRD:992-1027`) — gate: `DontRecall ?WhoQuestion, ?MethodQuestion, ?CanQuestion`.

| #   | Condition                                                          | Action                                                                     |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1   | `Recall ?FollowUpQuestion and recall ?PreviousWhatIfQuestion`      | **[set]**                                                                  |
| 2   | `LQ matches StdP.QuestionStarts+"*"`                               | **[strip]**                                                                |
| 3   | `LQ matches StdP.WhatAbout+"*" and Recall ?PreviousWhatIfQuestion` | **[set]** `*1`                                                             |
| 4   | `LQ matches "what if*"`                                            | `Remember ?WhatifQuestion is *1;` then **`Continue`** — anomaly, see below |
| 5   | `LQ matches "what*if*","what*when*"`                               | **[set]** `*1 + " if " + *2`                                               |
| 6   | `LQ matches "if*what*"`                                            | **[set]** `*2 + " if " + *1`                                               |

**Anomaly:** rule 4 ends `Continue` (`QRD:1014`), not `SwitchBack`, so its value is immediately
overwritten by rule 5 whenever both match — which they always do for "what if X" (rule 5's
`"what*if*"` matches with `*1=""`, `*2=X`), giving `?WhatIfQuestion = " if X"` rather than `X`.
Replicate this.

---

**`StdQ.FindLocationQuestion`** (`QRD:1030-1082`) — gate: `DontRecall ?WhatIfQuestion, ?WhoQuestion, ?MethodQuestion, ?CanQuestion`.

| #   | Condition                                                                            | Action         |
| --- | ------------------------------------------------------------------------------------ | -------------- |
| 1   | `Recall ?FollowUpQuestion and recall ?PreviousLocationQuestion`                      | **[set]**      |
| 2   | `LQ matches StdP.WhatAbout+"*" and Recall ?PreviousLocationQuestion`                 | **[set]** `*1` |
| 3   | `LQ matches StdP.QuestionStarts+"*"`                                                 | **[strip]**    |
| 4   | `LQ matches "Where"+StdP.Be+"*","where do*"`                                         | **[set]** `*1` |
| 5   | `LQ matches "tell me where*","Do you know where*","Where*"`                          | **[set]** `*1` |
| 6   | `LQ matches ("what","which")+ StdP.Location +StdP.BE+"*"`                            | **[set]** `*1` |
| 7   | `LQ matches ("what","which")+ StdP.Location+"*"`                                     | **[set]** `*1` |
| 8   | `LQ matches ("what","which")+StdP.Be+"*"+STDP.location`                              | **[set]** `*1` |
| 9   | `LQ matches ("what","which")+StdP.Be+"*"+StdP.location+"*" and (LQ matches "# # *")` | **[set]** `*1` |
| 10  | `LQ matches ("*like","*want#","*need#")+"to know where*"`                            | **[set]** `*2` |

---

**`StdQ.FindReasonQuestion`** (`QRD:1085-1116`) — gate adds `?LocationQuestion`.

| #   | Condition                                                            | Action         |
| --- | -------------------------------------------------------------------- | -------------- |
| 1   | `LQ matches StdP.WhatAbout+"*" and Recall ?PreviousReasonQuestion`   | **[set]** `*1` |
| 2   | `Recall ?FollowUpQuestion and recall ?PreviousReasonQuestion`        | **[set]**      |
| 3   | `LQ matches StdP.QuestionStarts+"*"`                                 | **[strip]**    |
| 4   | `LQ contains "tell me why*", "but why*", "how come*", "reason for*"` | **[set]** `*1` |
| 5   | `LQ matches "Why*","what makes*","is that why*"`                     | **[set]** `*1` |

---

**`StdQ.FindShouldQuestion`** (`QRD:1119-1151`) — gate adds `?ReasonQuestion`.

| #   | Condition                                                                      | Action                |
| --- | ------------------------------------------------------------------------------ | --------------------- |
| 1   | `LQ matches StdP.WhatAbout+"*" and Recall ?PreviousShouldQuestion`             | **[set]** `*1`        |
| 2   | `Recall ?FollowUpQuestion and recall ?PreviousShouldQuestion`                  | **[set]**             |
| 3   | `LQ matches StdP.QuestionStarts+"*"`                                           | **[strip]**           |
| 4   | `LQ matches "Should*","must*","ought*"`                                        | **[set]** `*1`        |
| 5   | `LQ matches Stdp.DO+("","not")+"# have to *", Stdp.DO+("","not")+"# need to*"` | **[set]** `#1+" "+*1` |

---

**`StdQ.FindTimeQuestion`** (`QRD:1153-1188`) — gate adds `?ShouldQuestion`.

| #   | Condition                                                                                    | Action                                                                           |
| --- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | `LQ matches StdP.WhatAbout+"*" and Recall ?PreviousTimeQuestion`                             | **[set]** `*1`                                                                   |
| 2   | `Recall ?FollowUpQuestion and recall ?PreviousTimeQuestion`                                  | `Remember ?TimeQuestion is ?PreviousTimeQuestion;` then **`Continue`** — anomaly |
| 3   | `LQ matches StdP.QuestionStarts+"*"`                                                         | **[strip]**                                                                      |
| 4   | `LQ matches "When*"`                                                                         | **[set]** `*1`                                                                   |
| 5   | `LQ contains ("what is the","what","what the","which")+("time","date","year","day","month")` | **[set]** whole `LQ`                                                             |
| 6   | `LQ matches "DO"+StdP.YOU+StdP.Have+"*time"`                                                 | **[set]** whole `LQ`                                                             |

**Anomaly:** rule 2 ends `Continue` (`QRD:1167`) where every sibling finder uses `SwitchBack`, so
on a follow-up the recovered previous value can be overwritten by rules 4–6.

---

**`StdQ.FindFactQuestion`** (`QRD:1190-1267`) — gate adds `?TimeQuestion`. Second-most-used
attribute in the bot (62 references).

| #   | Condition                                                                                                                                                  | Action                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | `LQ matches StdP.WhatAbout+"*" and Recall ?PreviousFactQuestion`                                                                                           | **[set]** `*1`                                                                        |
| 2   | `Recall ?FollowUpQuestion and recall ?PreviousFactQuestion`                                                                                                | **[set]**                                                                             |
| 3   | `LQ matches StdP.QuestionStarts+("if","that","whether")+"*"`                                                                                               | `Remember ?FactQuestion is *1;` then **`Continue`** (sets the attribute, keeps going) |
| 4   | `LQ contains ("you know*about","you heard of")`                                                                                                            | **[veto]** `//usually a descriptionquestion`                                          |
| 5   | `LQ matches "do you know*"`                                                                                                                                | **[veto]**                                                                            |
| 6   | `LQ matches StdP.QuestionStarts+"*"`                                                                                                                       | **[strip]**                                                                           |
| 7   | `LQ Matches ("whether",StdP.Have)+"*"`                                                                                                                     | **[set]** `*1`                                                                        |
| 8   | `LQ matches "Will*","did*","do*","does*",StdP.Be+"*"`                                                                                                      | **[set]** `*1`                                                                        |
| 9   | `LQ Matches "What*"+(StdP.Be,StdP.Do,"can")+("","not")+(StdP.I,Stdp.YOU,"he","she","they","we","it")`                                                      | **[veto]** `//descriptionquestion`                                                    |
| 10  | `LQ matches "how *"+("can","will",StdP.Be)+(StdP.I,Stdp.YOU,"he","she","they","we","it")+"*"`                                                              | **[veto]**                                                                            |
| 11  | `LQ matches ("*")+(StdP.Be,StdP.Do)+("","not","can")+(StdP.I,Stdp.YOU,"he","she","they","we","it") and *1 doesNotContain StdQ.Questionwords`               | if `*1 doesNotMatch ""` **[set]** `*1`; otherwise **[set]** whole `LQ`                |
| 12  | `LQ matches ("would you say that #","do you think that#")+StdP.be+"*"`                                                                                     | **[set]** `#1+" "+*1`                                                                 |
| 13  | `LQ matches (StdP.Articles+"#,", "#,")+ StdP.Be+("it","that","he","she","they","those")+"*" and #1 DoesNotMatch ("what","when","where","why","how","who")` | **[set]** `#1+" "+*1`                                                                 |

Verbatim for rule 11, which is the workhorse ("are you a bot", "do you think", "is it true"):

```
			If ?StdQ.LocalQuestion matches
				("*")+(StdP.Be,StdP.Do)+("","not","can")+(StdP.I,Stdp.YOU,"he","she","they","we","it")
				and *1 doesNotContain StdQ.Questionwords
			then
		 		if *1 doesNotMatch ""
					then remember ?FactQuestion is *1; continue
				otherwise always
					Remember ?FactQuestion is ?StdQ.LocalQuestion;
				continue

			SwitchBack
```

— `QRD:1241-1251`

---

**`StdQ.FindDescriptionQuestion`** (`QRD:1269-1347`) — gate adds `?FactQuestion`. Most-used
question attribute (80 references).

| #   | Condition                                                                                                                                                                                                                                       | Action                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `LQ matches StdP.WhatAbout+"*" and Recall ?PreviousDescriptionQuestion`                                                                                                                                                                         | **[set]** `*1`                                                                                                                                                                                                           |
| 2   | `Recall ?FollowUpQuestion and recall ?PreviousDescriptionQuestion`                                                                                                                                                                              | **[set]**                                                                                                                                                                                                                |
| 3   | `LQ matches "What"+(StdP.Be,StdP.Do, "about")+"*"`                                                                                                                                                                                              | `Remember ?DescriptionQuestion is *1;` then, nested, `if ?DescriptionQuestion matches "you think of*","you think about*","you know about*" then Remember ?DescriptionQuestion is *1; Continue` — **[set]**, `SwitchBack` |
| 4   | `LQ matches StdP.Prepositions + "what*"`                                                                                                                                                                                                        | **[set]** whole `LQ`                                                                                                                                                                                                     |
| 5   | `LQ matches StdP.QuestionStarts+"*"`                                                                                                                                                                                                            | `Remember ?DescriptionQuestion is *1;` then **`Continue`** — note it sets the _attribute_, not `LQ`, unlike every other finder's rule 3                                                                                  |
| 6   | `LQ matches "you say*\?"`                                                                                                                                                                                                                       | **[set]** `*1`                                                                                                                                                                                                           |
| 7   | `LQ matches "do you know"+("#","")+ "about*","What*","define*","describe*","explain*","do you know*","which*","I want to know*","tell about*","tell what*", "tell"+StdP.I+("about","what")+"*",StdP.HAVE+"you heard of*",StdP.I+"do not know*"` | **[set]** `*1`                                                                                                                                                                                                           |
| 8   | `LQ matches "tell"+StdP.I+"*"`                                                                                                                                                                                                                  | **[set]** `*1`                                                                                                                                                                                                           |
| 9   | `LQ matches ("can you","could you","are you able to")+("describe*", "define*", "explain*","tell me about*","tell me what*")`                                                                                                                    | **[set]** `*1`                                                                                                                                                                                                           |
| 10  | `LQ matches "how*"`                                                                                                                                                                                                                             | **[set]** `*match` — `//batting cleanup for all the special forms excluded from the methodquestion.`                                                                                                                     |
| 11  | `LQ matches "do*about*","can*about*","tell*about*"`                                                                                                                                                                                             | **[set]** `*2`                                                                                                                                                                                                           |
| 12  | `LQ matches ("have you","you","")+"ever hear# of*"`                                                                                                                                                                                             | **[set]** `*1`                                                                                                                                                                                                           |
| 13  | `LQ matches (StdP.Articles+"#,", "#,")+ ("What")+StdP.Be+("it","that","he","she","they","those")+"*" and #1 DoesNotMatch StdQ.QuestionWords`                                                                                                    | **[set]** `#1+" "+*1`                                                                                                                                                                                                    |

Note rule 7's `StdP.I+"do not know*"` — this is the branch the 2000-05-08 changelog restored:

> `//5/8/02000   Added "I don't know *" to the patterns that FindDescriptionQuestion is`
> `//            sensitive to.` — `LIB/StdQuestion/StdQuestion.us.n:24-25`

Because contraction expansion has already turned `don't` into `do not` on the `?ProcessedString`
track, the pattern is written `do not`.

---

**`StdQ.FindOtherQuestion`** (`QRD:1350-1414`) — gate adds `?DescriptionQuestion`. Also
`Forget ?StdQ.PseudoQuestion;` at the top.

Its first section runs **only when `?StdQ.LastDitchEffort` is not set** (i.e. during the retry
rounds, not on the final pass), and vetoes inputs that the phrase-stripper might still crack open:

```
		//First we eliminate cases that the phrase stripper may still reveal another kind of
		//question inside.
			If DontRecall ?StdQ.LastDitchEffort then
				If ?StdQ.PossibleQuestion matches "*\,*", "*;*", "*\.*", "*!*"
					and *2 DoesNotMatch "" then
				SwitchBack

				If ?StdQ.PossibleQuestion Matches "#? *" and *1 contains #1 Then
				SwitchBack

				If ?StdQ.PossibleQuestion Contains StdQ.QuestionWords+StdP.DO+"*"
					and ?StdQ.PossibleQuestion DoesNotMatch StdQ.QuestionWords+"*"
				then SwitchBack

				If ?StdQ.PossibleQuestion Contains "how" +
					("large","small","many","much","far","near","close","few","long","short","often")
				then SwitchBack

			Continue
```

— `QRD:1360-1378`

Then:

| #   | Condition                                                    | Action                                                                                                                                                                 |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | `?StdQ.PossibleQuestion contains "*#\?*"`                    | **[set]** `?OtherQuestion := ?ProcessedString`                                                                                                                         |
| 6   | `?WhatUserMeant contains "*#\?"`                             | **[set]** `?OtherQuestion := ?WhatUserMeant` — `//sometimes one-word inputs that get stripped from the processedstring (such as "really?") are intended as questions.` |
| 7   | `LQ matches StdP.I + ("want*","desire*","require*","need*")` | **[set]** `?StdQ.PseudoQuestion := ?ProcessedString`                                                                                                                   |
| 8   | `?WhatUserMeant matches "Really,,"`                          | **[set]** `?StdQ.PseudoQuestion := ?WhatUserMeant`                                                                                                                     |
| 9   | `?StdQ.PossibleQuestion matches "Compare * and *"`           | **[set]** `?StdQ.PseudoQuestion := ?StdQ.PossibleQuestion`                                                                                                             |
| 10  | `?StdQ.PossibleQuestion matches "give me*","show me*"`       | **[set]** `?StdQ.PseudoQuestion := ?ProcessedString`                                                                                                                   |

`?StdQ.PseudoQuestion` is _not_ a question: it is a flag that lets the **secondary** finders
(`Compare`, `Confirm`, `Example`, `Obtain`) fire on inputs that are not questions at all.

---

**`StdQ.FindAnyQuestion`** — quoted in full at §6.2.

### 6.8 The eight secondary finders

`Sequence topic "Find Secondary Question types"` (`QRD:828-843`) calls, in order:
`Compare, Confirm, Cost, Directions, DoHave, Example, More, Obtain`.

> `//These all depend on some question having been found.`
> `//If ?AnyQuestion is not set, they will fail.` — `QRD:831-832`

Unlike the primaries, **several secondaries can be set at once**; they do not gate on each other.

| Finder       | Line | Gate                                                                             | Key rules                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | ---- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Compare`    | 1435 | `IfRecall ?AnyQuestion, ?StdQ.PseudoQuestion`                                    | vetoes `StdP.DO+"you like*"` and `StdP.BE+"There*like*"`; sets from `"difference between*"`, `"Compare *"`, `(("how","why","")+(StdP.Be,StdP.DO)+"*","what makes*")+("like*","similar to","differ# from*","differ# than*")` → `*1+" and "+*2`; `"*similar to*"`, `"*different from*"`, `"*different than*"`; `"how"+StdP.do+"*"+("compare to","compare with")+"*"`; `StdP.Be+["not"]+"* #er than*"` → `*1+" "+#1+"ER "+*2`; `StdP.Be+"*"+"as # as"+"*"` |
| `Confirm`    | 1485 | `IfRecall ?AnyQuestion,?StdQ.PseudoQuestion`                                     | `?WhatUserMeant matches ("really,","honestly,")` → value = `?WhatUserMeant`; `StdP.BE+("it","that")+"true"` or `StdP.Be+StdP.YOU+"sure"` → value = literal `"Really?"`                                                                                                                                                                                                                                                                                  |
| `Cost`       | 1506 | `IfRecall ?AnyQuestion`                                                          | `"how much"+StdP.Be+"*"`, `"how much for*"`, `"you want for*"`, `"how expensive"+StdP.Be+"*"`, `"how cheap…"`, `"how pricey…"`, `"how much does * cost"`, `"charge for*"` → `*1`, then strip a leading article; **or** `?DescriptionQuestion contains "prices","price","cost","money"` → copy `?DescriptionQuestion`                                                                                                                                    |
| `Directions` | 1531 | `IfRecall ?AnyQuestion`                                                          | vetoes `"how"+("do","can")+STDP.I+("find out","get to know")` and `("upgrad#","chang#","switch#","learn#")+("to","from")`; sets from `"how"+("do","can")+STDP.I+("find*","reach*","get to*","get from*")`, `StdP.I+("want","need","desire")+"directions*"`, `"the way to*"`, `"how to get to*"`, `"How to reach*"`, `"from*to*"`, `"to*from*"`                                                                                                          |
| `DoHave`     | 1562 | `IfRecall ?AnyQuestion`                                                          | vetoes type/kind/variety phrasings and `StdP.Do+PRONOUN+StdP.Have+"to*"`; sets `#1 + " has " + *1` from `StdP.Do+"#"+StdP.Have+StdP.Articles+"*"` then `StdP.Do+"#"+StdP.Have+"*"`. Specificity **7000**                                                                                                                                                                                                                                                |
| `Example`    | 1590 | `IfRecall ?AnyQuestion or ?StdQ.PseudoQuestion`                                  | `"such as"`, `"like what"` → `""`; `"example of*"`, `"sample of*"` → `*1`; `(StdP.I+"want to see","show"+StdP.I)+StdP.Articles+"*"` → `*1`; veto when followed by a question word; else `(…)+"*"` → `*1`                                                                                                                                                                                                                                                |
| `More`       | 1622 | `IfRecall ?AnyQuestion, ?FollowUpQuestion`                                       | `Recall ?FollowUpQuestion` → `?MoreQuestion := ?PreviousAnyQuestion`; `"more information on*"`, `"more about*"`, `"more detail# *"` → `*1` minus a leading `on`/`about`; `"tell me more*"` → `*1`                                                                                                                                                                                                                                                       |
| `Obtain`     | 1649 | `IfRecall (?AnyQuestion or ?StdQ.PseudoQuestion) and DontRecall ?ReasonQuestion` | eleven rules; the interesting one is `If ?CanQuestion matches "I have*", "I get*" then Remember ?ObtainQuestion is *1;` (`QRD:1665-1667`) — the only place a secondary reads a primary's _value_. Every set is followed by a leading-article strip. Specificity **5500**                                                                                                                                                                                |

Verbatim, `StdQ.FindMoreQuestion`, because `?FollowUpQuestion` semantics hang off it:

```
Sequence topic "StdQ.FindMoreQuestion" is
MemoryLock ?MoreQuestion;
	Always
		Forget ?MoreQuestion;
		IfRecall ?AnyQuestion, ?FollowUpQuestion then
			Remember ?StdQ.LocalQuestion is ?StdQ.PossibleQuestion;

				If Recall ?FollowUpQuestion
					then remember ?MoreQuestion is ?PreviousAnyQuestion;
				SwitchBack

				If ?StdQ.LocalQuestion contains "more information on*","more about*","more detail# *"
				Then Remember ?MoreQuestion is *1;
					If ?MoreQuestion matches ("on","about")+"*"
					Then Remember ?MoreQuestion is *1;
					Continue
				Switchback

				If ?StdQ.LocalQuestion matches "tell me more*"
					then remember ?MoreQuestion is *1;
				SwitchBack

		SwitchBack
	Switchback
Endtopic
```

— `QRD:1622-1646`

---

## 7. Statement classification

### 7.1 `Priority topic "ParseStatements"` (`QRD:388-423`)

```
Priority topic "ParseStatements" is
MemoryLock ?AnyStatement;
	Always
	Forget ?AnyStatement;
	//relying on preprocessing of ?WhatUserMeant which happens in PreProcessor.us.n
	//The order in which these are called is very important.  They check attributes
	//definitely forgotten and possibly set by the other topics called before them.
	//Thus, if there is a ?MessageStatement, an ?ActStatement will NOT be found,
	//etc.
	SwitchTo "StdS.FindQuestion";
	SwitchTo "StdS.FindMessageStatement";
	SwitchTo "StdS.FindActStatement";
	SwitchTo "StdS.FindIsStatement";
	SwitchTo "StdS.FindHaveStatement";
	SwitchTo "StdS.FindWantStatement";
	SwitchTo "StdS.FindFactStatement";
	SwitchTo "StdS.FindOtherStatement";
	//only one of the above 7 statement types may be found.

	Switchto "StdS.FindCauseStatement";
	SwitchTo "StdS.FindFeelingStatement";
	//a causestatement or FeelingStatement
	//can be found only for an assertion: is, have, want, or fact.

	SwitchTo "StdS.FindTimeStatement";
	SwitchTo "StdS.FindConditionalStatement";
	//Timestatements and conditionalstatements can be found only for an imperative:
	//meaning, an ActStatement or a MessageStatement.

	IfRecall ?MessageStatement, ?ActStatement, ?IsStatement,
		?HaveStatement,?WantStatement,?FactStatement,?OtherStatement
	Then
		Remember ?AnyStatement is ?StdS.PossibleStatement;
	Continue
	Continue
EndTopic
```

Precedence: `Message > Act > Is > Have > Want > Fact > Other`, all gated on `DontRecall ?StdS.Question`.

### 7.2 `Sequence Topic "StdS.FindQuestion"` (`QRD:1749-1776`) — the statement veto

`?StdS.Question` is an internal flag (unregistered, so specificity 2000 if anyone tested it —
nobody does). It suppresses **all** statement types when the input looks syntactically like a
question. Verbatim:

```
	Always
	Forget ?StdS.Question;
		If ?StdS.PossibleStatement matches
			(("what","who","how","when","where","why")+
			 (StdP.Be,StdP.Have,"can","will","would","should","could","might","may","do","did","does"),
			(StdP.Be,StdP.Have,"would","will","should","could","do","might","may","did","does")+
			 ("not",StdP.YOU,StdP.I,"he","she","they","this","that","it", StdP.Articles),
			"can"+("not",StdP.I,"he","she","they","this","that","it", StdP.Articles),
			StdP.Be+(StdP.YOU,StdP.I,"he","she","they","this","that","it", StdP.Articles),
			"tell me about",//actually a statement but to be responded to as a question
			"how" +("large","small","many","much","far","near","close","few","long","short","often"),
			"what")+"*","#"

			//	we're skipping "can you" -- it usually precedes utterances that ought
			//to be interpreted  as ?ActStatements.

			//  the single-word sentences may not be literally questions -- but
			//  it's to our advantage to not recognize them as statements.  That
			//  way when they're used as keywords in the topic wizard, the topics
			//   generated will work as expected, ie, key on ?WhatUserMeant instead
			//  of whatever statement type grabs single-word utterances.

		Then
			Remember ?StdS.Question is ?StdS.PossibleStatement;
		Continue
	SwitchBack
```

Note the final alternative `"#"` — **a single-word input is never a statement.**

### 7.3 The seven statement finders

`LS` = `?StdS.LocalStatement`, `PS` = `?StdS.PossibleStatement`.

**`StdS.FindMessageStatement`** (`QRD:1782-1823`) — "tell X that Y". Gate `DontRecall ?StdS.Question`.

1. **[strip]** `("can you *","please *", StdP.YOU+"*")` → `LS := *1`
2. **[strip]** `("* for","* from")+StdP.I` → `LS := *1`
3. **[set]** `"Tell *"`, `"Ask *"` **and** `*1 DoesNotMatch (StdP.I,"if","whether")+"*"` → `?MessageStatement := LS`
4. **[set]** `"If * Tell * "+("that *","about *")`, `"If * Ask *"` with `*1 DoesNotMatch (StdP.I,StdP.YOU,"* can")` and `*2 DoesNotMatch (StdP.I,StdP.YOU)`
5. **[set]** `"Let "+("#","# #","# # #")+"know*"`, `"in on*"`, `"Say * to *"`

**`StdS.FindActStatement`** (`QRD:1828-1902`) — imperatives. Gate adds `?MessageStatement`.

1. **[strip]** `("Except for","Although","because","in spite of","on account #")+"*"`
2. **[veto]** `LS contains StdP.Articles+"#"+StdP.Be` **or** `LS Matches "#"+StdP.Be+"*"` `//these are is-statements`
3. **[veto]** `LS matches "tell"+StdP.I+"*"` `//to be interpreted as a question`
4. **[veto]** `LS matches StdP.Prepositions+"*"` `//a fragment → factstatement`
5. **[set]** `("can you *", "please *", "* for me", "go *","you have to *","you must *","you should *","let us *")` → `*1`, then `if ?ActStatement matches "*, okay" then remember ?ActStatement is *1`
6. **[set]** `("never *")` → whole `LS` (same `", okay"` trim)
7. **[veto]** `LS matches "# *" and #1 matches StdP.Articles` `//starts with an article → assertion`
8. **[set]** `LS matches "# # *" and #1 doesNotMatch "not" and #2 matches StdP.Prepositions,StdP.Articles` → whole `LS`
9. **[set]** `LS matches "# #*" and #2 matches ("you","me","us","him","her","them","it")` → whole `LS`

**`StdS.FindIsStatement`** (`QRD:1942-1996`) — the single most-used attribute (148 references).
Gate: `DontRecall ?MessageStatement, ?ActStatement, ?StdS.Question`.

```
			If ?stds.possiblestatement matches ("because","except for","on account #")+"*"
				then remember ?StdS.Localstatement is *1;
			Continue

			If ?StdS.LocalStatement matches (StdP.I,StdP.YOU,"he","she","they")+
					("do","done","did","can","could","should","would")+"*"
				then //this is almost definitely a ?FactStatement
			SwitchBack

			If ?StdS.LocalStatement contains StdP.Articles + "#"+StdP.Be then
				Remember ?IsStatement is ?StdS.LocalStatement;
			SwitchBack

			If ?StdS.LocalStatement matches
				(StdP.I,StdP.YOU,"he","she","they") + StdP.Have + StdP.Be + "there" then
				//special case -- "I've been there..."
				Remember ?IsStatement is ?StdS.LocalStatement;
			SwitchBack

			If ?StdS.LocalStatement contains StdP.Be + (StdP.Articles,StdP.Prepositions) then
				//verb be,followed by a noun phrase or prepositional phrase.
				Remember ?IsStatement is ?StdS.LocalStatement;
			SwitchBack

			if ?StdS.LocalStatement contains StdP.Be + StdP.Be then
				//verb be, in progressive form.
				Remember ?IsStatement is ?StdS.LocalStatement;
			SwitchBack

			If ?StdS.LocalStatement contains StdP.Be+("nothing","something")  Then
				//any -ing form which is not a gerund verb
				Remember ?IsStatement is ?StdS.LocalStatement;
			SwitchBack

			If ?StdS.LocalStatement contains StdP.Be+" #ing"  Then
				//Be followed by a gerund form -- definitely not the main verb.
			SwitchBack

			If ?StdS.LocalStatement matches ("",StdP.Articles)+"# # *" and #2 matches StdP.Be
				//subject noun, followed by a be form...
				Then
				Remember ?IsStatement is ?StdS.LocalStatement;
			SwitchBack
```

**`StdS.FindHaveStatement`** (`QRD:2001-2051`) — gate adds `?IsStatement`.

**Bug to replicate:** this finder does **not** initialise `?StdS.LocalStatement` before using it.
Its gate is `If DontRecall ?MessageStatement, ?ActStatement, ?IsStatement, ?StdS.Question then`
followed immediately by `If ?StdS.LocalStatement matches …` (`QRD:2005-2008`). The value in
`?StdS.LocalStatement` is whatever `StdS.FindIsStatement` left there — i.e. `?StdS.PossibleStatement`
with a leading `because` / `except for` / `on account of` possibly stripped. It only assigns
`Remember ?StdS.LocalStatement is ?StdS.PossibleStatement;` at `QRD:2030`, part-way through.
A port must carry `?StdS.LocalStatement` across finder invocations for this to work.

1. **[veto]** `(StdP.Articles,"")+("#"+StdP.Have+"#ed*","#"+StdP.Have+"#"+StdP.Articles+"*")` `//usually a perfect form of some other verb`
2. **[set]** `"#"+StdP.Have+"*"` → `?HaveStatement := PS`
3. **[set]** `"*"+StdP.Have+StdP.Articles+"*"` → `PS`
4. **[set]** `LS contains StdP.Have+"got"` and `DoesNotContain StdP.Have+"got to"` → `PS`
5. re-init `LS := PS`; `if LS contains (StdP.Have)+StdP.Be+"*" then remember ?Temporary is *1;` then `If (?Temporary Matches "# *" and #1 Matches StdP.Have) or (?Temporary Matches "# # *" and #2 Matches StdP.Have) Then Remember ?HaveStatement is LS;`
6. **[set]** `LS contains StdP.Be+ StdP.Have` → `PS`

**`StdS.FindWantStatement`** (`QRD:2055-2079`) — gate adds `?HaveStatement`.

1. **[veto]** `"want to know"`, `"want to find out"` `//information, not the things themselves`
2. **[set]** contains `("want","wants","desire","desires","need","needs","drool# over","dying for","likes","appreciat#")`
3. **[set]** contains `("like #")` and `#1 DoesNotMatch ("him","her","you","me")`

**`StdS.FindFactStatement`** (`QRD:2084-2176`) — gate adds `?WantStatement`. 129 references.

Let `SUBJ = (StdP.I,StdP.YOU,"he","she","they","this")`.

1. **[set]** `LS matches SUBJ+"#"` `//a two-word statement starting with a noun must end with a verb`
2. **[set]** `SUBJ+("*not")+StdP.Have`, `SUBJ+StdP.Have+("not")`
3. **[set]** `SUBJ+"#ed*"` `//regular past-tense verb`
4. **[set]** `SUBJ+"# #s*"` `//plural noun acting as direct object`
5. **[set]** `"#"+(StdP.DO,"can")+"not #"` or `StdP.Articles+"#"+(StdP.DO,"can")+"not #"`
6. **[set]** `LS contains SUBJ+("can","could","should","would","will","do","did",StdP.Be,"have","had","has")`
7. **[set]** `LS contains (SUBJ,"that")+"#"+(StdP.Articles,StdP.Prepositions,StdP.I,StdP.YOU,"him","her","them","that","it")`
8. **[set]** `LS matches StdP.Articles + "# #" + ((StdP.I,StdP.YOU,"he","she","they"),StdP.Articles+"*")`
9. **[set]** `LS matches ("",StdP.Articles) + "# #" + StdP.Prepositions+"*"` and `#1 DoesNotMatch StdP.Articles`
10. **[set]** `LS Matches StdP.Prepositions+"*"` and `LS DoesNotMatch "*?"` `//sentence fragment conveying a fact`

Every one assigns the whole `?StdS.LocalStatement`.

**`StdS.FindOtherStatement`** (`QRD:2221-2231`) — the catch-all, specificity **1950** (the lowest
registered value in the whole build, so it always loses a tie).

```
Sequence Topic "StdS.FindOtherStatement" is
	MemoryLock ?OtherStatement;
	Always
		Forget ?OtherStatement;
		If DontRecall ?IsStatement, ?ActStatement, ?MessageStatement, ?WantStatement,
						?HaveStatement, ?FactStatement, ?StdS.Question, ?AnyQuestion
		Then
				Remember ?OtherStatement is ?StdS.PossibleStatement;
		SwitchBack
	SwitchBack
Endtopic
```

Note it is the only statement finder that also gates on `?AnyQuestion`: **a question is never an
`?OtherStatement`**, but a question _can_ be an `?IsStatement` / `?FactStatement` etc. whenever
`?StdS.Question` failed to catch it.

### 7.4 The three modifier statements

These do not gate each other out; they annotate a statement already found.

**`StdS.FindCauseStatement`** (`QRD:2181-2196`) — gate
`IfRecall ?IsStatement, ?HaveStatement, ?WantStatement, ?FactStatement, ?OtherStatement and dontrecall ?StdS.Question`;
fires when `LS contains "because", "# #\, so # #", "not * except","on account of"`; value = `PS`.

**`StdS.FindFeelingStatement`** (`QRD:2200-2217`) — gate
`IfRecall ?IsStatement, ?HaveStatement, ?WantStatement, ?FactStatement and dontrecall ?StdS.Question`:

```
			If ?StdS.PossibleStatement Contains
					"like", "likes", "liked", "hate", "hates", "hated",StdP.BE+"great",
					"love","loves","loved","enjoys","enjoy","enjoyed","crazy about",
					"lust","lusts","lusted","my vices",	"my vice","disgust#",
					"hatred","antipathy","dislike","dislikes","disliked",
					"irritate#","annoy#"
				and notheard StdP.Be+"like" //"is like" is like something else.
				Then Remember ?FeelingStatement is ?StdS.PossibleStatement;
```

The `notheard StdP.Be+"like"` clause tests `?WhatUserMeant`, not `?StdS.PossibleStatement` — the
only place a statement finder crosses tracks.

**`StdS.FindTimeStatement`** (`QRD:1907-1921`) — gate `Recall (?MessageStatement, ?ActStatement) and DontRecall ?StdS.Question`;
fires when `LS contains "when","after","before","once you","until"`; value = whole `LS`.

**`StdS.FindConditionalStatement`** (`QRD:1925-1937`) — gate
`Recall ?MessageStatement, ?ActStatement and DontRecall ?TimeStatement, ?StdS.Question`;
fires when `LS contains "if"`; value = whole `LS`.

---

## 8. `StdResponse` — yes / no / not sure

The PatternLists (`QRD:2236-2260`), verbatim:

```
PatternList StdResponse.Affirmative IS
	"all right","right then","y","yes", "yeah", "yea", "yep", "yup",
	"you bet*", "O,K", "okay", "alr#", "i'm sure", "of course",
	"fine", "cool", "terrific", "great", "excellent",
	//// "aw*", I have commented this out temporarily
	"si","sure", "i think so", "I do", "why not",
	"probably", "what th# h#", "i guess so", "uh,huh",
	"y not", "no prob", "if you say", "if you ins",
	"that would be good", "that would be nice",
	"that would be ok", "definitely", "certainly", "absolutely", "right",
	//(damn right, darn tootin', etc)
	"da# r#", "da# s#", "da# t#";

PatternList StdResponse.AffirmativeException IS
	"# # right then","probably n#", "do no#", "don't", "not sure", "I'm sure #","absolutely not";

PatternList StdResponse.Negative IS
"n", "no", "neg#", "nad#", "nope", "nay", "I don#", "I do n#", "I guess n#","not yet","never",
"Uh,uh", "I doubt", "probably n#", "I think n#","forget it","rather not","not really",
("absolutely","probably","perhaps")+ "not";

PatternList StdResponse.NegativeException IS "no prob#";

PatternList StdResponse.NotSure IS
"not*sure", "I don't know", "I do not know", "maybe";
```

The topic (`QRD:2262-2286`), verbatim:

```
Priority Topic "StdResponse Computation" is
	Always
		Forget ?YesResponse,
			 ?NoResponse,
			 ?NotSureResponse;
	Continue
	IfHeard StdResponse.Affirmative AND NOT StdResponse.AffirmativeException Then
		Trace "Setting flag ?YesResponse";
		Remember ?YesResponse;
	Continue
	IfHeard StdResponse.Negative AND NOT StdResponse.NegativeException Then
		Trace "Setting flag ?NoResponse";
		Remember ?NoResponse;
	Continue
	IfHeard StdResponse.NotSure Then
		Trace "Setting flag ?NoSureResponse";
		Remember ?NotSureResponse;
		Forget ?YesResponse, ?NoResponse; // sanity check
	Continue
	IfRecall ?YesResponse AND ?NoResponse Then
		Trace "Setting flag ?NotSureResponse";
		Remember ?NotSureResponse;
		Forget ?YesResponse, ?NoResponse;
	Continue
EndTopic
```

Points a port must get right:

- `IfHeard` = `?WhatUserMeant Contains`, so these are **substring** tests on the spell-checked,
  punctuation-stripped, **un-expanded** input. Hence the list carries both `"I don't know"` and
  `"I do not know"`, and both `"I don#"` and `"I do n#"`.
- All three flags are `Forget`ten first, so they are per-turn.
- `AND NOT` is the `<MatchingList>` form `X and not Y` [spec §4]: affirmative wins **unless** an
  exception pattern is also heard.
- Matching both Affirmative and Negative resolves to `?NotSureResponse`.
- The values are `"TRUE"` (bare `Remember`) — but the debugger nevertheless prints
  `"YesResponse:     "+?YesResponse` (`QRD:2492`).
- Typo preserved: the Trace at `QRD:2277` says `?NoSureResponse` while the attribute set is
  `?NotSureResponse`. `Trace` output is console-only [spec §6], so this is cosmetic.
- These three attributes are **not** registered, so they score the default 2000 in best-fit
  selection. With 74 / 63 / 26 references in the content files, that default is load-bearing:
  a topic keyed on `Recall ?YesResponse` alone loses to any topic keyed on a `?FactQuestion` (3000).

---

## 9. The debugger (categories 8–25)

`Pattern SDeb.CONSOLEDEBUGGING is "QSR"; Pattern SDeb.LIVEDEBUGGING is ""; Pattern Sdeb.EXAMPLEDEBUGGING is "PQRS";`
— `Mrmind3/Customization/DebugCustomize.n:29-31` (byte-identical to the library copy)

```
Priority topic "Set Defaults for level of debugging information. " is
	Always
		If DontRecall ?Debugging then
			// if it wasn't set in the customization file then
			If Recall ?UserIsConsole then
				Remember ?Debugging is SDeb.CONSOLEDEBUGGING; // "QSR";
			Continue

			Otherwise if ?Username contains "WEBUSER" then //when dealing with live users
				Remember ?Debugging is SDeb.LIVEDEBUGGING;  // "";
			Continue

			Otherwise Always //in example runs
				Remember ?Debugging is Sdeb.EXAMPLEDEBUGGING;  //  "PQRS";
			Continue
		Continue
	Suppress this;
	Continue
EndTopic
```

— `QRD:2291-2309`

Flag letters, from the customization file's own comment block
(`Mrmind3/Customization/DebugCustomize.n:12-19`):

| Letter | Dump                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| `P`    | `?WhatUserSaid`, `?WhatUserMeant`, `?ProcessedString`                             |
| `Q`    | every set `?…Question`                                                            |
| `R`    | the three response flags                                                          |
| `S`    | every set `?…Statement`                                                           |
| `W`    | the `?WhatUserSaid/Did` + `?WhatRobotSaid/Did` history (`…Before`, `…BeforeThat`) |
| `Y`    | every set `?Previous…Statement`                                                   |
| `Z`    | every set `?Previous…Question`                                                    |

> `//		  Debugger output NEVER goes out to web users` — `DebugCustomize.n:23`

For a live web user `?Debugging = ""`, so **none of categories 19–25 produce output**. Toggle
topics respond to the exact strings `"debugging info ON"`, `"debugging info OFF"`,
`"Toggle Preprocessor debugging"`, `"Toggle Question debugging"`, `"Toggle Response debugging"`,
`"Toggle Statement debugging"`, `"Toggle WhatUserSaid debugging"`, `"Toggle EarlyStatement debugging"`,
`"Toggle EarlyQuestion debugging"` matched against **`?WhatUserSaid`** (not `?WhatUserMeant`).
Each toggles its letter with `If ?Debugging matches "#P#" then Remember ?Debugging is #1+#2;` —
which relies on `#` matching the empty string at one end. A port may implement these as no-ops for
a web-only replay, but must keep them in the Priority chain because each ends `Continue` and none
of them ever swallows a turn.

`Suppress this;` on category 8 means it runs once and is then removed from the user's schedule for
the rest of the conversation [spec §11]. Suppression is per user and persistent.

---

## 10. Name capture and greeting (`Utilities/WebNameGreet.n` + customization)

`WebNameGreet.n` is a combi of three library components:

> `// WebnameGreet.n -- functions as Cweb.n, CNameCapture.n, and CGreeting.n`
> `// but switches to name capture immediately after greeting user or on a`
> `// user's greeting if the name is unknown.`
> `// Requires a webcustomize.n, a NameCustomize.n, and a GreetCustomize.n`
> `//  to be filled out.` — `WNG:3-8`

Its Gerbil-dialect ancestor is `MrMind/utilities/StdNameCapture.g` (761 lines, header
"A Gerbil(tm) Standard Robot Module / For use only with the NeuroStudio(tm) Robot Server ...
Author: Ray, Neuromedia, Inc. ... (c) 1998"), and a second copy at
`Base/Utilities/old/StdNameCapture.g` (846 lines). Neither is in the build. The `.g` version is
structurally identical (same `NameCapture.Titles`, same `Namecapture.Prepositions`, same
`Sequence Topic "Name Capture"` shape) but hard-codes the strings that `NameCustomize.n` later
externalised, and its own-name check is `If ?Name Matches "Mr, Mind"` (`StdNameCapture.g:51`) —
which is where the unescaped-comma idiom of §3.1 is most clearly load-bearing, since MrMind's own
name has to match "Mr Mind", "Mr. Mind" and "MrMind".

### 10.1 The customization values MrMind3 ships

```
PatternList STDW_SayPageTemplate is "HTML/MRMIND3Say.htm";
PatternList STDW_RECONNECTLINES is  "Don't you trust me?",
			"Do you enjoy discussing humanity?",
			"Maybe you have some <BR>questions for me?" ;
Patternlist STDW_WebGreetingFirstHalf is "<B>Hello.  I'm ","<B>Hi, my name is ";
PatternList STDW_WebGreetingSecondHalf is "";
```

— `Mrmind3/Customization/WebCustomize.n:14-27`

```
PatternList MYNAME is "mrmind", "mr mind","MRMIND";
PatternList MYNAMEPLUS is "Mr. Mind", "MS.MIND", "MRSMIND", "MSMIND","Mme Mind";
```

— `Mrmind3/Customization/MyName.n:21-22`. `MYNAMEPLUS` is **declared and never referenced** in the
whole build (the `.vsr` sets `UnusedPatListWarning=1`, so this produced a build warning).
The library default was `PatternList MYNAME is ?RobotHandle;`, commented out at `MyName.n:20`.

```
PatternList STDN_NameRequests is "<B>What's your name?</B>",
			"<B>Please tell me your name.</B>",
			"<B>What is your name?</B>";
PatternList STDN_DETECT_OWN_NAME is "No, that's my name.  <BR>What's yours?";
PatternList STDN_GOTNAMEFIRSTHALF is "<B>Hi ";
PatternList STDN_GOTNAMESECONDHALF is "! <BR>Can you convince me <BR>that you are human?  </B>";
PatternList STDN_RESPONSETOREFUSAL is
         "Well, OK.  I don't know what you <BR>want to be called, so I'll just <BR>call you \"User\".";
PatternList STDN_USERDEFAULTNAME is "User";
PatternList STDN_RESPONSETOWHYASKNAME is
             "I'm more comfortable <BR>if I know your name.";
```

— `Mrmind3/Customization/NameCustomize.n:19-46`

```
PatternList STDG_GreetingPhrases is
"Hello " +?Name+". <BR>Can you convince me <BR>that you are human?";
PatternList STDG_GREETQUESTIONANSWERS is "I'm fine, thanks.", "I'm doing pretty well, thank you.  ";
```

— `Mrmind3/Customization/GreetCustomize.n:13-20`. Note `STDG_GreetingPhrases` embeds a **memory
reference** (`?Name`) inside a PatternList — legal per the grammar (`<pat> = … | <memref> | …`),
and evaluated at use time.

### 10.2 The opening lines, exactly

Web connection:

```
Priority Scenario "Login over Web" is
 	If ?WhatUserDid Contains "Web ACCEPT CONNECTION" Then
		IfRecall ?HostName Then
			SayToConsole "User logged in from " + ?HostName + ", IP address " + ?IPAddress;
		Continue
		Otherwise Always
			SayToConsole "User logged in from IP address " + ?IPAddress + " (no hostname found)";
		Continue

		Remember ?SayPageTemplate is STDW_SAYPAGETEMPLATE;

		SayToConsole "HTTP_USER_AGENT = " + ?HTTP_USER_AGENT;
        … eight more SayToConsole header dumps …
		Suppress "Login from Console";
		SwitchTo "Robot Greeting";
	Done
EndScenario
```

— `WNG:835-860`

Console connection: `Priority Topic "Login from Console" is Always InitialExample 1 "hi"; Suppress This; SwitchTo "Robot Greeting"; Done EndTopic` — `WNG:873-879`.

```
Sequence Topic "Robot Greeting" is
	Always
       SayOneOf STDW_WebGreetingFirstHalf +MYNAME+ STDW_WebGreetingSecondHalf;
	   Remember ?RobotName is MYNAME;
	   SwitchTo "Name Capture";
	Done
EndTopic
```

— `WNG:884-890`

`STDW_WebGreetingFirstHalf + MYNAME + STDW_WebGreetingSecondHalf` is the cross product
2 × 3 × 1 = **six** strings, one chosen at random by `SayOneOf`:

```
<B>Hello.  I'm mrmind          <B>Hi, my name is mrmind
<B>Hello.  I'm mr mind         <B>Hi, my name is mr mind
<B>Hello.  I'm MRMIND          <B>Hi, my name is MRMIND
```

`Sequence Topic "Name Capture"` then immediately says `SayOneOf STDN_NameRequests`. So **MrMind's
opening turn is always two lines**: a greeting and a name request, e.g.

```
<B>Hi, my name is mrmind
<B>What's your name?</B>
```

Both are buffered into one response [spec §6, "Output is buffered per run"], then
`WaitForResponse` suspends the sequence.

### 10.3 `Sequence Topic "Name Capture"` (`WNG:36-157`) and its mis-nesting

```
Sequence Topic "Name Capture" is
Subjects "Convince";
	Always
		SayOneOf STDN_NameRequests;
		Remember ?NameTries is "1";

		WaitForResponse;

		SwitchTo "Name Parser";

	 	IfRecall ?HaveName
		Then
			If (?Name Matches MYNAME) and ("" DoesNotMatch STDN_DETECT_OWN_NAME)
			Then
				SayOneOf STDN_DETECT_OWN_NAME; // "Hey, wiseguy, that's my name.  What's yours?";
			TryAgain

		//pw added to cover the case of someone claiming their name is HUMAN - pw 12/00
			IfRecall ?HaveName
			Then
				If ?Name Matches "Human"
				Then
					SayOneOf "I know that trick but <BR>it doesn't mean you <BR>ARE human.",
					"That's a good trick -- <BR>OK, I'll CALL you Human...";
				Remember ?Name is "Human";
			Done

			IfRecall ?HaveName
			AND Chance 60%
			Then
			Say "Hi " + ?Name + "! <BR>Can you convince me <BR>that you're human?" ;
			Done

			InitialExample 2 "My name is Fred";

		 	Say STDN_GOTNAMEFIRSTHALF+ ?Name + STDN_GOTNAMESECONDHALF;
			Focus Subjects "Intro";
		Done
		…
```

**I verified the block/terminator nesting mechanically for this category** (balanced overall, no
syntax error). The resolved structure is:

```
L38  Always
L46    IfRecall ?HaveName                     <-- block B
L48      If (?Name Matches MYNAME) and …      -> TryAgain (L51)
L54      IfRecall ?HaveName                   <-- block D
L56        If ?Name Matches "Human"           -> Done (L61)
L66        IfRecall ?HaveName AND Chance 60%  -> Done (L71)
L86        InitialExample 2 "My name is Fred";
L94        Say STDN_GOTNAMEFIRSTHALF+?Name+STDN_GOTNAMESECONDHALF;
L95        Focus Subjects "Intro";
L98      Done                                 <-- closes D
L105     If ?NameTries Matches "3" …          -> Done (L114)
L116     If ?NameTries Matches "2" …          -> Continue (L118)
L120     If ?NameTries Matches "1" …          -> Continue (L122)
L124     IfRecall ?NoResponse or heard StdN.Refusals … -> Done (L132)
L134     IfRecall ?ReasonQuestion …           -> TryAgain (L139)
L142     If (Recall ?AnyQuestion) and (?String1 matches ?String2) -> Continue (L145)
L154     SayOneOf STDN_NAMEREQUESTS;
L155   TryAgain                               <-- closes B
L156 Done                                     <-- closes Always
```

**Everything from L105 to L154 is nested inside `IfRecall ?HaveName` (block B).** In the library
original this is not so: `LIB/Utilities/combis/WebNameGreet.n` closes the `?HaveName` block at its
line 68 and the retry logic is a sibling. The Mrmind3 fork added two `IfRecall ?HaveName` blocks
(the "Human" and `Chance 60%` branches) plus a `Done` at L156, and the extra opener silently
re-parented the retry logic.

**Behavioural consequence, which the port must reproduce:**

- If `Name Parser` succeeded (`?HaveName` set), block B fires; block D's condition
  (`IfRecall ?HaveName`) is necessarily also true, and block D always terminates with `Done`
  (L61, L71, or L98). Execution stops.
- If `Name Parser` failed, block B is not activated at all, and the enclosing `Always` block has
  no further statements — so `Done` (L156) ends the turn **silently**.

Therefore, in the shipped bot: **`?NameTries` never advances past `"1"`; the "give up and call you
User" line (`STDN_RESPONSETOREFUSAL`), the "why do you want my name" reply
(`STDN_RESPONSETOWHYASKNAME`), the re-ask, and the `InterruptSequence` that would let MrMind answer
a question asked instead of a name — are all dead code.** MrMind asks your name exactly once. If it
cannot parse one, it says nothing more, `Name Parser Missed Name` has already set `?Name` to
`"User"` (only if `?Name` was previously unset), and the conversation carries on.

The three reachable outcomes of a successful parse:

1. name equals `MYNAME` → `SayOneOf STDN_DETECT_OWN_NAME` = `"No, that's my name.  <BR>What's yours?"`, then `TryAgain` (re-runs the `WaitForResponse`).
2. name is `"Human"` → one of two lines, and `?Name` is pinned to `"Human"`; `Done`.
3. otherwise, 60 % of the time `Say "Hi " + ?Name + "! <BR>Can you convince me <BR>that you're human?"`; otherwise `Say "<B>Hi " + ?Name + "! <BR>Can you convince me <BR>that you are human?  </B>"` **and** `Focus Subjects "Intro"`.

Note that the 60 % branch does _not_ focus the Intro subject; the 40 % branch does. `Chance 60%`
is a probability of 0.6 [spec §4].

### 10.4 `Sequence Topic "Name Parser"` (`WNG:436-649`)

Contract, stated in the file's own design note:

> `//Design note:  There are only two acceptable results from this procedure;`
> `//success and failure.  Make **SURE** that no matter how you modify this, it`
> `//Always calls exactly one of the two sequence topics "Name parser got name"`
> `//or "Name parser missed name" immediately before exiting.` — `WNG:446-451`

Algorithm, in order:

1. `Forget ?HaveName;`
2. `?String1 := ` first word of **`?WhatUserSaid`**; `?String2 := ` first word of `?WhatUserMeant`.
   (`//a check for people whose names spell-check to cause bogus response-type activations.`)
3. **Refusal** — `IfRecall ?NoResponse or heard StdN.Refusals` → `"Name Parser Missed Name"`, with
   ```
   PatternList StdN.Refusals is "none*your business", "not telling",
       "won't"+("give","tell")+"*name","refuse*"+("give","tell")+"*name",
       "not giv#*name", "not*need*know","don't*need*know";
   ```
   — `WNG:31-33`
4. **Nameless greeting** — `If ?WhatUserSaid matches NONAMEGREETINGS` → missed, with
   `PatternList NONAMEGREETINGS is ("hi","hello","hey")+("there","")+(MYNAME,""),"not #";` — `WNG:433`
5. `?NameCapture.TempName := ?WhatUserSaid` — **the raw, un-spell-checked input**
   (`//We are not using ?WhatUserMeant because we don't want usernames spellchecked.` `WNG:476`).
6. `Forget ?NameCapture.RecoverName;` then
   `If (?String1 doesNotMatch ?String2) or (?String1 matches COMMONNAMES) then Remember ?NameCapture.RecoverName is ?String1;`
7. **Giveaway-phrase strip.** If `TempName` contains any of
   `"name is*", "name be*", "name's*", "known as*", "called*", "named*", "I'm just plain old*", "I'm just plain*", "I'm just*", "I'm*", "it's just me*", "It is just me*", "it is just*", "it's just*", "I am just plain old*", "I am just plain *", "I am just*", "I am*", "call me*", "it is*", "it's*", "named me*", "name me*", "this is*"`
   then `TempName := *1`, and if `TempName Matches "#*"` set `?NameCapture.RecoverName := #1`.
8. **Common-name scan** against `PatternList CommonNames` (`WNG:160-430`, 1 623 entries,
   _"shamelessly lifted from the US social security office records -- most popular names for
   babies born in the US, 1997, with minor additions and changes by Ray Dillinger"_): first word,
   then any word, sets `RecoverName`.
9. **Question bail-out** — `If (Recall ?AnyQuestion and dontRecall ?NameCapture.RecoverName)` → missed.
10. **"Bond, James Bond"** — `If ?NameCapture.Tempname matches "#, # #,*" and #1 Matches #3 then TempName := #2;`
11. **Comma truncation** — three successive rules strip everything after the first comma
    (`"*\,*\,*\,*"`, then `"*\,*\,*"`, then `"*\,*"` → `*1`).
12. `SwitchTo "strip non-name words";` **twice**, then test for a single token:
    `If ?NameCapture.Tempname matches "#", "#-#", "^\.^\.","^\.,#" then "Name Parser Got Name"`.
    (`^` = one character, so `"^\.^\."` = initials like `J.R.` and `"^\.,#"` = `J. Smith`.)
13. `SwitchTo "strip non-name words";` twice more, retest.
14. **Preposition truncation** — `"*"+NameCapture.Prepositions+"*"` → `*1`; retest.
15. `"^\.^"` → append a period, got-name.
16. `NameCapture.Titles + ("#","#-#")` → keep both, got-name.
    ```
    PatternList NameCapture.Titles is "Mr,", "Mrs,", "Miss,", "Ms,", "Dr,", "Sir", "Lord", "Lady",
    			"Baron","Duke","Duchess","Count","Countess","Contessa","President","Senor",
    			"Herr", "Sr,", "Mister", "^."; //the last (^) is for first initials.
    ```
    — `WNG:23-25`
17. Title + ≥2 words → keep the first word (or the first hyphenated pair); retest.
18. First-word fallback: `"# *"` → `#1`; `"#-# *"` → `#1+"-"+#2`; `"^\.^ *"` / `"^\.^\. *"` → `^1+"."+^2+"."`.
19. **RecoverName fallback** —
    ```
    		If Recall ?NameCapture.RecoverName
    		Then
    			SayToConsole "#### WARNING:  UNHANDLED CASE IN NAME CAPTURE ROUTINE!!! ####";
    			Remember ?NameCapture.TempName is ?NameCapture.RecoverName;
    			SwitchTo "Name Parser got Name";
    		SwitchBack
    ```
    — `WNG:631-636`
20. `If Recall ?NoResponse then Say STDN_RESPONSETOREFUSAL; TempName := STDN_USERDEFAULTNAME; got-name.`
21. Otherwise `"Name Parser Missed Name"`.

```
Sequence Topic "strip non-name words" is
	Always
		if ?NameCapture.TempName matches
			("a","an","the","one","I", "hi", "howdy", "hello", "what", "another", "or", "dummy",
				"Aunt","Uncle","Sister","Brother","Father","you", "not", "fool","idiot",
				"who", "this", "just","great","my","your","best","worst", "Don't","know")+"*"
		then
		remember ?NameCapture.TempName is *1;
		Continue
	SwitchBack
EndTopic
```

— `WNG:652-662`

```
Sequence topic "Name Parser Got Name" is
	Always
		//okay, if we get to here, then ?NameCapture.Tempname is the new name.
	 	Remember ?Name is ?NameCapture.TempName;

		//first we strip trailing punctuation, in cases other than initials.
		if ?Name matches "#"+Punc+Punc+Punc+Punc Then remember ?Name is #1; continue
		if ?Name matches "#"+Punc+Punc Then remember ?Name is #1; continue
		if ?Name matches "#"+Punc Then remember ?Name is #1; continue

		//then we fuss with the capitalization....
		Remember ?name is compute Lowercase of ?Name;
		Remember ?Name is compute Capitalize of ?Name;
		If ?Name matches "^\.^\." then remember ?NAME is compute uppercase of ?Name; continue

		Remember ?LTM.Name is ?Name;

		//and in the case of a first initial and name, we "correct" spacing as well.
		If ?name matches "^\.,#" then
			remember ?Name1 is compute uppercase of ^1;
			remember ?Name2 is compute capitalize of #1;
			remember ?name is ?Name1+". "+?Name2;

		continue

		//Then we set the flag to tell the caller that Name Parser succeeded
		Remember ?HaveName;

	SwitchBack
EndTopic
```

— `WNG:667-697`, with `PatternList Punc is "\.","\?","\!","\,";` (`WNG:665`)

Note there is no 3-punctuation rule (4, 2, 1 only). `?LTM.Name` is the long-term-memory copy
(`LTMConnect` in the `.vsr` points at `MRMIND3LTM.ltm`); a port that persists user records should
mirror it. `?HaveName` is set unconditionally at the end (I verified the nesting: `continue` at
L691 closes the `"^\.,#"` block, so L694 is at `Always` level).

```
Sequence Topic "Name Parser Missed Name" is
	Always
		If DontRecall ?Name //If the user has no name
		then
			Remember ?Name is STDN_USERDEFAULTNAME;
		SwitchBack

		If ?Name DoesNotMatch STDN_USERDEFAULTNAME
			then //No action:  we prefer to keep using it rather than re-dubbing her "User".
		SwitchBack

	SwitchBack
EndTopic
```

— `WNG:701-714`

### 10.5 The rest of `WebNameGreet.n`

Standard topics (subject `USER` unless noted):

| Topic                                     | Line | Trigger                                                                                                                                                                                                                  | Reply                                                                          |
| ----------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `"about the user's name and name change"` | 718  | `?DescriptionQuestion Contains ("my*name","call me")` or `?WhoQuestion Matches ("I","me","I am")` or `?WhoQuestion contains ("you","u")+"* I am"` or `?OtherQuestion Contains "So you know my name*"`                    | `"You told me your name is " +?Name+"."`                                       |
| `"Quit calling me Shirley!"`              | 738  | `IfHeard "quit call# me ","stop call# me","lied*my name","change my name"` or four `?AnyStatement` variants                                                                                                              | asks, `WaitForResponse`, `SwitchTo "Name Parser"`, twice                       |
| `"Who is User's name?"`                   | 784  | `Recall ?WhoQuestion` or `?DescriptionQuestion`, **and** `?WhatUserSaid contains ?Name`                                                                                                                                  | `"Well, you told me that you were "+?Name+"."`                                 |
| `"My name is ... "`                       | 800  | `?WhatUserSaid Matches "my name is *","my name's *","call me *","please, call me *","I * be called *"` and `notheard "call me*"+("tomorrow","some,time","in a few","in a couple","whenever","in just a","next*","back")` | `SwitchTo "Name Parser"`; `"Ok, " + ?Name + "."` — ends `Continue`, not `Done` |
| `"Can you tell me my name"`               | 819  | `Heard ("you","U","Yoursel#")` and `Recall ?CanQuestion, ?DescriptionQuestion, ?FactQuestion` and `Heard "tell me*my name","recall my name"`                                                                             | `"Sure. Your name is "+?Name+"."`                                              |

Greeting topics:

```
PatternList STD_Hello is //I'm sure this list will get huge
	"Hello", "Yo", "Hi", "howdy", "Bonjour", "Hey there",
	"Greetin#", "have a nice day",
	"bongiorn#", "g'day",
	"Good mornin#", "Good afterno#", "Good evenin#";
PatternList Pseudo_Hello is "How do you do #*","how are you doing #*";
//we don't want "how do you do that" to set this off....

Priority Topic "STD_Greeting Detect" is
	IfHeard STD_Hello and notheard Pseudo_Hello and DontRecall ?AnyQuestion, ?MessageStatement Then
		IfRecall ?HaveName Then
			Example "YO";
			SayOneOf STDG_GreetingPhrases;
			Focus Subjects "Intro";
		Done
	Continue
EndTopic
```

— `WNG:893-913`

```
PatternList HELLOQUESTION is "What's up","what is up", "what,s hap#", "Whazzup",
	"how's life", "how is life",
	"whassup", "what,s up","What,s goin# on", "What,s cook#","tell me how you are" ,
	"How are you"+("","doing"), "how,s it goin#", "how,s it hangin#","How do you do",
    "How's things?";

Priority Topic "Std_GreetingQuestion Detect" is
	If (?WhatUserMeant matches (HELLOQUESTION, "#,"+HELLOQUESTION) or
	   ?WhatUserMeant contains HELLOQUESTION+("today","Red"))
	Then
		SayOneOf "I'm fine, thanks.", "I'm doing pretty well, thank you.  ";
		If
			DontRecall ?HaveName then Say "What's your name? ";
		Done
    Done
EndTopic
```

— `WNG:920-935`. (`"Red"` is a leftover from Shallow Red, NativeMinds' demo bot.)

```
Default Topic "Greeting detect"	is
	If Heard HELLOQUESTION and notheard Pseudo_Hello
	Then
		SayOneOf STDG_GREETQUESTIONANSWERS;
	Done
EndTopic
```

— `WNG:941-946`. This is the build's only `Default` category outside `Defaults/`.

### 10.6 The name-challenge topics in `NameCustomize.n`

Peggy Weil added seven Standard topics to what is otherwise a pure customization file
(`//pw-added 1/19/01 to challenge the User about their name, some of the time.` —
`NameCustomize.n:48`). All are subject `"TRUTH", "NAMES"`, and all key on
`?WhatRobotSaid matches "By the way, is " + ?Name + " <BR>your real name or a special <BR>one just for me?"`:
`"RealName"`, `"NotRealName"`, `"It's short for"`, `"It's my initials"`, `"EvadeNameQuestion"`,
`"ReasonForName"` (which logs to a file:
`SayToFile "C:\Program Files\NativeMinds\TextFiles\NameReason.txt" ?Name + ?IPaddress+ " says: " + ?NameReason;`
— `NameCustomize.n:118`), and `"NewRealName"` / `"NewRealName2"` (which call `SwitchTo "Name Parser"`
and then restore the old name from `?Alias`).

**Dangling reference.** The trigger line `"By the way, is … your real name …"` appears **only** in
these conditions; nothing in the build ever _says_ it. The commented-out code that would have said
it is at `WNG:70` (`//			+	" (Is that your real name or a special one just for me?)";`)
and the comment at `WNG:63` explains the removal
(`//…this is probably unnescessary....because the 'realname' query is in 'oneshots'`). A port
should keep these topics — `Mrmind3/Defaults/OneShots.n` may say the line — but expect them to be
mostly unreachable.

---

## 11. The profanity filter (`Utilities/CProfanity.n` + `ProfanityCustomize.n`)

### 11.1 Word lists (`CPROF:15-52`), verbatim

```
//note:  piss# and hell were removed so that "you piss me off" or "Piss off" could be
// in annoyance, fuck was removed because it has it's own topic
PatternList DirtyWords is "butt","butts","areola#","breast#","testicl#",
"anus", "ass,hole#", "ass,wipe#", "clit#", "crap", "cunt", "damn",
"damnit", "derrier#", "#fucker","#fucking", "bitch#", "nipple#",
"pubes", "pussy" , "#shit", "tits", "tit","blow job#", "blow me",
"cock#","sex.organ","dickhead#", "do*wild*thing", "dumb,ass", "eat# me",
"genital#","felatio","eat*shit", "private parts","lick#*cum",
"slurp#*cum","swallow#*cum","cum on", "cum all", "give# me head",
"give# good head","give# great head", ("whack#","jerk#","jack#", "wank")+
("me","him","her","them","you","")+("off"),"jack# off","kiss# my ass",
"cunniling#","let's make love", "let's screw",  "masturbat#", "screw# me",
"screw# you","sex# with me", "braid# my pub#", "sleep# with me","vagina#",
"vulva#","suck# off","bone me", "spank# me*","spread your legs*",
"suck# me", "suck# my", "bone her","bone you", "dillhole", "#bastard",
"screw# your",  "#damn#","goddam#","whore","oral sex","shithead",
("in","up")+"*ass", "bollocks", "bugger off", "hump*";
//removed 'touch#"
PatternList DirtyActionPhrases is "bite#", "blow#", "bone", "buff#", "caress#", "drill#",
"eat#", "feel#", "finger#", "flic#", "fondl#", "grab#", "jerk#", "kick#","hump*",
"kiss#", "lick#", "massag#", " * masterbate *", "masterbat#" ,"penetrat#", "pet#", "pierc#", "poke#", "polish#", "pork#", "pull#",
"rub#", "scratch#", "screw#", "shov#", "show#", "slide#", "slip#", "slurp#", "spread#", "squeez#",
"stretch#", "stroke#", "suck#",  "tug#", "twist#", "whip#","wank";

PatternList DirtyBodyPartPhrases is "ass", "asshole", "asswipe", "balls*", "behind", "boner#",
"bottom#", "bun", "butt#", "cum#", "cunt", "dick#", "gash", "knob#",
"member", "nut", "orifice", "penis", "pussy", "rump", "rear#", "slit",
"wank#", "wean#", "ween#";

PatternList PseudoBadWords is "head butt#","butt of*joke","button#","shitake#", "bitchin",
"author*tool","have*tool","sell*tool","buy*tool","be*member", "screw*light,bulb", "screw,top",
"cock,tail","stop,cock","cock,of*walk", "tool,box","tool,bar","bottom of", "pretty damn *",
 "assume*";

PatternList RacialSlurs is "nigger","niggers","kike","kikes","WOP","Dago","Dagos";
```

Deltas from `LIB/Utilities/components/CProfanity.n`: MrMind removed `"fuck#"`, `"piss#"`, `"hell"`
and `"touch#"` and added `"wank"`, `"bollocks"`, `"bugger off"`, `"hump*"`, `" * masterbate *"`,
`"pretty damn *"`, `"assume*"`, `"ass,hole#"`/`"ass,wipe#"` (splitting the library's `"ass#"`),
`"i hate you"` was **removed** from the strong list, and `Subjects "Profanity"` was added to two
topics. The removals are documented in the file's own comments.

### 11.2 `Priority Topic "Tsk Tsk"` (`CPROF:78-102`), verbatim

```
Priority Topic "Tsk Tsk" is
Subjects "Profanity";
	If (?WhatUserSaid Contains DirtyBodyPartPhrases AND DirtyActionPhrases AND NOT PseudoBadWords)
	and ("" DoesNotMatch STDX.RESPONSE_TO_SEXUAL)
	Then
		   //responses to sexual profanity.
		SayOneOf STDX.RESPONSE_TO_SEXUAL+"  "+;
		SwitchTo "Increment, Warn, and Disconnect";
	Done
	//temporarily removed 'fuck you", "fuck off" to see if would be caught by other topic
    If (?WhatUserMeant Contains "you suck", "you * suck", "eat me", "blow me", "suck me",
		 "up yours","screw you","bite me","get bent","mast*rbat#")
	and ("" DoesNotMatch STDX.RESPONSE_TO_STRONG)
	Then
	    SayOneOf STDX.RESPONSE_TO_STRONG+"  "+;
		SwitchTo "Increment, Warn, and Disconnect";
    Done
	If (?WhatUserSaid Contains (DirtyWords,RacialSlurs) AND NOT PseudoBadWords)
		and ("" DoesNotMatch STDX.RESPONSE_TO_GENERAL)
	Then
		SayOneOf STDX.RESPONSE_TO_GENERAL+"  "+;
		    //"Stop that.", "Cool down.", "Chill.", "Hey, not so harsh please.";
		SwitchTo "Increment, Warn, and Disconnect";
	Done
EndTopic
```

Three tiers, tested in order, each `Done` (so the profanity reply pre-empts the whole rest of the
run):

1. **Sexual** — `?WhatUserSaid` contains a body-part word **and** an action word **and not** a
   pseudo-bad word. Note `Contains A AND B AND NOT C` is a `<MatchingList>` conjunction with a
   negated tail [spec §4].
2. **Strong** — `?WhatUserMeant` contains one of ten fixed phrases.
3. **General** — `?WhatUserSaid` contains a dirty word or racial slur and not a pseudo-bad word.

Tier 1 and 3 test the **raw** `?WhatUserSaid` (so spell-check cannot launder profanity), tier 2
tests `?WhatUserMeant`.

The `and ("" DoesNotMatch STDX.RESPONSE_TO_X)` guard is the documented disable switch:

> `// In order to disable any particular aspect of the profanity filter, simply include`
> `// the empty string in the patternlist of possible responses.` — `ProfanityCustomize.n:14-15`

`SayOneOf STDX.RESPONSE_TO_SEXUAL+"  "+;` — note the trailing `+;` with no operand. This is the
NeuroScript idiom for "append and do not add a newline / keep the buffer open" and appears three
times here and nowhere else in the build. **Unresolved** (§15).

### 11.3 The strike counter (`CPROF:55-74`), verbatim

```
Sequence topic "Increment, Warn, and Disconnect" is
Subjects "Profanity";
	Always
	    If DontRecall ?ProfanityStrikes then
		    Remember ?ProfanityStrikes is "0";
		Continue
	    Remember ?ProfanityStrikes is Compute Sum of ?ProfanityStrikes, "1";
	    Remember ?STDX.TEST is Compute SUM of ?ProfanityStrikes, "1";
		SayToConsole "Profanity strikes: "+?ProfanityStrikes;

		If ?STDX.TEST matches STDX.PROFANITY_LIMIT then
			SayOneOf STDX.DisconnectWarning;  // "Next time you use bad language, I will disconnect you.";
		SwitchBack

		If ?ProfanityStrikes matches STDX.PROFANITY_LIMIT then
			SayOneOf STDX.YOUREBUSTED; // "I will have to disconnect you now because of your continued use of profanity.";
            DisconnectThisUser;
		Done
	SwitchBack
EndTopic
```

With `PatternList STDX.PROFANITY_LIMIT is "3";` (`ProfanityCustomize.n:82`): strike 2 triggers the
warning (`?STDX.TEST = 3`), strike 3 triggers `DisconnectThisUser` — the **only**
`DisconnectThisUser` in the entire build.

`Topic "I'm sorry"` (`CPROF:106-118`, subjects `"LOSER","Profanity"`) fires when the user
apologises **and** `?LastTopic matches "Tsk Tsk","why (stop that)"`; it says
`STDX.ResponseToApology` = `"Thanks for apologizing.  <BR>Now, show me your human side."`.
Crucially, the library's `forget ?Profanitystrikes;` has been commented out:

> `//I commented out the 'forget' line because the counter reset to "1" each time and`
> `//if they keep on, they might as well get disconnected sooner than later  pw 11/15/01` — `CPROF:104-105`

So **in MrMind3, apologising does not reset the counter** (contradicting `ProfanityCustomize.n:77`'s
comment "it starts counting all over if they apologize though").

`Topic "why (stop that)"` (`CPROF:122-135`) answers "why"/"how come"/"what for" after a `Tsk Tsk`
with `STDX.RESPONSETOWHY`, and contains the build's use of `When ?LastTopic is "Tsk Tsk" Example "why";`.

### 11.4 `Topic "Fuck"` lives in the customization file

Because `"fuck#"` was deleted from `DirtyWords`, profanity of that form is handled by a topic
appended to `ProfanityCustomize.n`:

```
Topic "Fuck" is
SUBJECTS "PROFANITY";
	IfHeard "*Fuck#*"
	Then
		Example "Fuck you.";
		IfRecall (?RememberAnnoy1,?RememberAnnoy2) Then SwitchTo "AnnoyanceThree";
			Continue
		IfChance then
			Say "That isn't very polite.  If you <BR>had a human mother, she would have <BR>taught you not to talk that way <BR>to young machines.";
		Done
		IfChance then
			Say "Resorting to profanity is quite <BR>predictable.  Is predictability a <BR>human or machine trait?";
			Focus "predictability human or machine?";
		Done
	continue
EndTopic
```

— `ProfanityCustomize.n:109-124`

This is a **Standard** topic, so it competes by specificity, does **not** increment the strike
counter, and the two bare `IfChance` blocks form a 50/50 group [spec §3]. It pulls in two
follow-up topics, `"predictability human or machine?"` and `"Understanding human or machine?"`
(`ProfanityCustomize.n:127-161`), which are the only place in the pipeline files that use
`If Focused` / `WhenFocused Example` / `DontFocus`.

The response lists MrMind actually ships (`ProfanityCustomize.n:32-107`) are entirely rewritten
from the library defaults; they are quoted in full in §16 of this document's appendix below.

---

## 12. The goodbye handler (`Utilities/CGoodbye.n`)

```
//these are strict patterns
PatternList STD_Goodbye_Match is

	"See you","Later", "good,night","Hasta","Nice talking","Nice chatting","Nice talking to you",
	"Nice meeting you", "so long", "signing off";


//these are more complex patterns
PatternList STD_Goodbye_Contains is
	"good bye #","goodbye #","good,night #", "logout", "I'm leaving",
	"gotta run","*nice*talk#*you","bye bye","Seeya later", "See ya later",
	"See you later","Hasta la vista","Catch you later", "Goodbye","Goodby",
	"Good bye","Good by","Good-by","Bye now","Bye","Seeya", "See ya", "Catch ya later",
	"Thanks for everything","was nice talking","was nice chatting", "I must go",
	"was nice meeting you","sign off","exit","adios","ciao", "fare,well","fare # well",
	("was","been")+"*pleasure "+("talk#","#ing")+"*you","bye","by by",
	"was*very*#ing with","was*very*#ing you","have to be going",
	"got to be going","I've got to go","I have to go","I am going now",
	"I'm going to go","I'm signing off","it's time to go","time for me to go",
	"hasta la","I'm going away now","I am going away now";

PatternList PseudoGoodbye is "I see you are";
//switches to query about UserSurvey
Priority Topic "STD_Goodbye Detect" is
	If ?WhatUserMeant Matches STD_Goodbye_Match
		or (Heard STD_Goodbye_Contains and DontRecall ?Anyquestion)
	Then
		If DontRecall ?NoSurvey then SwitchTo "asksurvey"; Continue
		SayOneOf STD_GoodbyePhrases;
	Done
EndTopic

Sequence topic "AskSurvey" is
	Always
	Say "Before you leave, can you take a <BR>moment to take the user survey?";
		WaitForResponse;
		IfRecall ?YesResponse then
			SwitchTo "Exit Survey";
		Done

		IfRecall ?NoResponse then
			Remember ?NoSurvey;
		SwitchBack
	Continue
Endtopic
```

— `CGOOD:21-69`, with
`PatternList STD_GoodbyePhrases is "Goodbye for now, <BR>but please talk to me again.", "I hope I can talk to you later. Send mail.";`
(`Mrmind3/Customization/GoodbyeCustomize.n:19-21`)

Semantics:

- `STD_Goodbye_Match` is tested with `Matches` (whole string) against `?WhatUserMeant`;
  `STD_Goodbye_Contains` with `Heard` (= `Contains`), and only when the input is not a question.
- **First goodbye:** `?NoSurvey` unset → `SwitchTo "asksurvey"` → `Say "Before you leave…"` +
  `WaitForResponse`. **The goodbye line is not said yet.** On the reply: `?YesResponse` →
  `SwitchTo "Exit Survey"` (`Mrmind3/Activities/UserSurvey.n:33`, an 8-question `WaitForResponse`
  chain that starts by setting `?NoSurvey`); `?NoResponse` → set `?NoSurvey`, `SwitchBack` into
  `STD_Goodbye Detect`, which then says `SayOneOf STD_GoodbyePhrases` and `Done`.
- Neither yes nor no → `AskSurvey`'s `Always` block ends `Continue`, the Sequence category returns
  `NextCategory`, and the run falls through to the Standard categories: the user's answer is
  treated as a normal utterance and the goodbye line is never said.
- **Second goodbye** (or after a survey): `?NoSurvey` set → the inner `If` is false, `Continue`,
  `SayOneOf STD_GoodbyePhrases`, `Done`.

**Delta from the library.** `LIB/Utilities/components/CGoodbye.n:47-50` reads

```
	If (?WhatUserMeant Matches STD_Goodbye_Match )
		or (Heard STD_Goodbye_Contains
		    and (NotHeard PseudoGoodBye)
			and (DontRecall ?Anyquestion))
```

MrMind3 **dropped the `NotHeard PseudoGoodBye` clause** while keeping the
`PatternList PseudoGoodbye is "I see you are";` declaration (`CGOOD:42`). `PseudoGoodbye` is
therefore the build's second dead PatternList, alongside `MYNAMEPLUS`. With the shipped
`STD_Goodbye_Contains` list I cannot construct an input that the guard would have blocked (no
member of the `Contains` list is a substring of "I see you are"), so removing it appears to be
behaviourally inert against this word list — but the guard was presumably written against an
earlier list in which `"see you"` was a `Contains` entry. **The port must implement the Mrmind3
condition as written**, without the guard.

Also removed in MrMind3: the library's `Example "Parting brings us such ";` (`LIB/…/CGoodbye.n:52`);
added: the whole `AskSurvey` sequence.

---

## 13. Where the archive contradicts the patent-derived spec

In each case **the archive wins**.

**13.1 Pronoun replacement does not happen.** [spec §13.3] describes `SubjectInfo` declarations and
`Remember ?WhatUserMeant is Compute ReplacePronouns of ?WhatUserSaid;` as the way `?WhatUserMeant`
is produced. In MrMind3 `?WhatUserMeant` is produced by spell-check + punctuation stripping only
(`QRD:141-167`), and the strings `ReplacePronouns` and `SubjectInfo` occur **zero** times in the
entire archive. Do not implement pronoun substitution.

**13.2 `?WhatUserMeant` is not the fully normalised string.** [spec §7] describes `?WhatUserMeant`
as "the input after processing by Priority topics", which invites the assumption that all
normalisation lands there. In this library, contraction expansion and phrase stripping land in
`?ProcessedString`, a separate attribute the patents never name. Since `Heard`/`IfHeard`/`NotHeard`
resolve to `?WhatUserMeant Contains` [spec §4], every `Heard` in the bot sees un-expanded
contractions. The library is written around this (`"I don't know", "I do not know"` side by side
at `QRD:2260`).

**13.3 There are more question types than the patents list.** [spec §7] names
`?FactQuestion, ?DescriptionQuestion, ?WhoQuestion, ?LocationQuestion, ?TimeQuestion, ?AnyQuestion`.
The shipped library registers **21 question attributes and 12 statement attributes** (§6.1), and
adds a third family (`?YesResponse`/`?NoResponse`/`?NotSureResponse`) that the patents do not
mention at all. `?CategoryLabel`, the auto-generated classifier output of [spec §18], does not
appear anywhere in the archive: MrMind's question classification is entirely the hand-written
`StdQuestion` cascade, not the learned classifier.

**13.4 A Priority topic mutates `?WhatUserMeant` after classification.** [spec §11] presents the
Priority phase as "initial filters". `Mrmind3/Activities/ategag.n:1-5` is a Priority topic loaded
15th — i.e. **after** `QuesResDebug` — that rewrites `?WhatUserMeant`:

```
Priority topic "hate" is
	If ?WhatUserMeant matches "*hate*" then
		Remember ?WhatUserMeant is *1+" ate "+*2;
	continue
EndTopic
```

So question and statement attributes are computed from the string _with_ "hate", while every
Standard topic's `Heard` sees the string with "ate". This is deliberate (it is the setup for
`Topic "ate"` / `Sequence Topic "Invert"`, MrMind's word-inversion gag). A port that normalises the
input once, up front, will get this wrong: `?WhatUserMeant` must be a live, mutable attribute read
at condition-evaluation time.

**13.5 The `Otherwise` associativity trap.** [spec §3] says only "if the first condition is true
then the condition block(s) that follow the Otherwise keyword are not executed". It does not say
which block an `Otherwise` binds to when a chain of sibling `If` blocks precedes it. The archive
settles it: in `"Expand Contractions"` the `Otherwise Always` at `QRD:746` binds to the
**immediately preceding sibling block** (`we'd`, opened at 729), not to the outer guard at 537.
Implement `Otherwise` as binding to the immediately preceding sibling block at the same nesting
depth.

**13.6 Multi-argument `SayOneOf` over concatenated PatternLists.** [spec §6] documents
`SayOneOf` as choosing one argument. `SayOneOf STDW_WebGreetingFirstHalf +MYNAME+ STDW_WebGreetingSecondHalf;`
(`WNG:886`) has **one** argument which is a concatenation of three PatternLists, i.e. a list of
2 × 3 × 1 = 6 strings. The choice is over the cross product. Same for
`SayOneOf STDX.RESPONSE_TO_SEXUAL+"  "+;`.

---

## 14. Edge cases and hazards, consolidated

Numbered for test-suite reference. Each is something a naive port gets wrong.

1. **`?WhatUserSaid` is immutable; `?WhatUserMeant` is not.** No script in the build ever writes
   `?WhatUserSaid`. Exactly one non-library topic writes `?WhatUserMeant` (§13.4).
2. **`Heard` sees `?WhatUserMeant`, statement/question attributes carry `?ProcessedString`.** (§2.3)
3. **Spell-check is not reproducible.** The Wintertree dictionaries (`ssceam.tlx`, `ssceam2.clx`,
   `Additions.tlx`, `thesdbam.cth`) are named in the `.vsr` but absent from the archive. Two
   scripts depend on its behaviour: `WNG:459-463` (`?String1` vs `?String2`) and
   `ategag.n:22-23` (relies on `zink`/`zlink`/`pkink` being unspellable). **Recommended
   implementation:** make `Compute SpellCheck` the identity function by default, behind a
   pluggable hook, and note in the port's docs that MrMind's real behaviour differed. Identity
   makes `?String1 == ?String2` always, which _disables_ `WNG:142`'s
   `If (Recall ?AnyQuestion) and (?String1 matches ?String2) then InterruptSequence;` — but that
   block is dead code anyway (§10.3), so identity is safe here.
4. **Punctuation stripping is capped at 5 passes and stops early.** (§4.2)
5. **`?StdP.DoneStrippingPunctuation` is set even when block 1 stripped something.** Two embedded
   quotes are not both removed.
6. **Contraction expansion normally runs once.** Only an input containing `we'd` triggers all six
   passes. Only the first occurrence of each contraction is expanded. (§4.6)
7. **`"Expand Contractions"` falls off its end when the input has no contraction.** Treat as an
   implicit `SwitchBack`. (§4.6)
8. **`it's been` uses `*1`, not `?StdP.SecondPart`.** (§4.6)
9. **`you'd` always expands to `you had`**, never `you would` — unlike `I'd`/`he'd`/`she'd`/`they'd`/`we'd`. (§4.6)
10. **`?FollowUpQuestion` is only reachable from retry round 2 onward.** (§6.4)
11. **`FindWhatIfQuestion` rule 4 ends `Continue`**, so `"what if X"` yields `" if X"`. (§6.7)
12. **`FindTimeQuestion` rule 2 ends `Continue`**, so a follow-up value can be overwritten. (§6.7)
13. **`FindDescriptionQuestion` rule 5 writes the attribute, not `LocalQuestion`.** (§6.7)
14. **`FindHaveStatement` reads an uninitialised `?StdS.LocalStatement`.** Attribute state must
    persist across Sequence-topic invocations within one run. (§7.3)
15. **A single-word input is never a statement** (`StdS.FindQuestion`'s final `"#"` alternative). (§7.2)
16. **A question can be an `?IsStatement`/`?FactStatement` but never an `?OtherStatement`.** (§7.3)
17. **`?ExampleQuestion` can be set to the empty string** and must still count as remembered. (§6.2)
18. **`Remember ?X;` sets `"TRUE"`; `Forget ?X;` makes `Recall ?X` false.** [spec §6]
19. **Name capture retry logic is dead code in the shipped build.** (§10.3) Do **not** "fix" it.
20. **`Name Parser` reads `?WhatUserSaid`, not `?WhatUserMeant`** — usernames are never
    spell-checked. (§10.4)
21. **`Name Parser Missed Name` only assigns `"User"` if `?Name` was previously unset**; an
    existing name survives a failed re-parse. (§10.4)
22. **`?Name` is capitalised**: lowercase, then `Capitalize`; uppercase if it matches `"^\.^\."`. (§10.4)
23. **Profanity tiers 1 and 3 test raw `?WhatUserSaid`**, tier 2 tests `?WhatUserMeant`. (§11.2)
24. **Apologising does not reset `?ProfanityStrikes`** in MrMind3. (§11.3)
25. **Three strikes disconnects.** `?STDX.TEST = strikes + 1`; the warning fires at strike 2. (§11.3)
26. **The first goodbye does not produce a goodbye line** — it produces the survey question. (§12)
27. **`AskSurvey` falls through to Standard topics if the reply is neither yes nor no.** (§12)
28. **`MYNAMEPLUS` and `PseudoGoodbye` are declared and unused**; `?WhatIfQuestion`, `?CostQuestion`,
    `?ExampleQuestion`, `?MoreQuestion`, `?ConfirmQuestion`, `?FollowUpQuestion`, `?TimeStatement`,
    `?ConditionalStatement`, `?CauseStatement` and all 31 `?Previous*` attributes are computed and
    never read by content topics. A port may compute them lazily but must keep the ones the
    finders themselves consult (`?Previous*`, `?FollowUpQuestion`, `?StdQ.PseudoQuestion`,
    `?StdQ.LastDitchEffort`, `?StdS.Question`).
29. **Category names are matched with their exact spelling including trailing spaces**:
    `"FindQuestion "` (`QRD:350`) and `"Set Defaults for level of debugging information. "`
    (`QRD:2291`) both end in a space. `SwitchTo` targets are matched case-insensitively
    (`SwitchTo "asksurvey"` at `CGOOD:48` targets `Sequence topic "AskSurvey"` at `CGOOD:57`;
    `SwitchTo "strip meaningless internals"` at `QRD:190` targets
    `Sequence Topic "Strip meaningless internals"` at `QRD:497`).
30. **Sequence categories are exempt from the SwitchTo cycle guard**; every other category is not.
    The library's repeat-until-done loops depend on this. [spec §11]
31. **`Suppress this;`** on the debug-defaults topic persists for the conversation, per user.
32. **`Trace` and `SayToConsole` never reach the user.** `SayToFile` writes a Windows path
    (`C:\Program Files\NativeMinds\TextFiles\…`); the archive's `Mrmind3/TextFiles/` holds 16 such
    logs. 73 `SayToFile` calls exist in the build.

---

## 15. Unresolved

Things I could not determine from the archive or the patents. Hypotheses are labelled.

1. **The unescaped comma inside a pattern string.** Evidence and hypothesis in §3.1. Neither the
   patents [spec §21 item 1] nor any archive comment defines it. **Hypothesis:** matches zero or
   one of `{"", " ", "-", "'", "."}`. Affects `StdResponse` (`"uh,huh"`, `"O,K"`, `"Uh,uh"`), the
   goodbye list (`"good,night"`, `"fare,well"`), the greeting list (`"what,s up"`), the profanity
   lists (`"ass,hole#"`, `"cock,tail"`), and `NameCapture.Titles` (`"Mr,"`, `"Dr,"`).
2. **`Compute SpellCheck` semantics.** Dictionary files absent (§1.5). Unknown whether it is
   word-by-word, whether it preserves case, and what it does with unknown proper nouns. The
   scripts prove it _can_ alter the first word of an input into a question word (`WNG:143`:
   `//  This is to keep it from triggering when someone's name spell-corrects to a question-word.`).
3. **`SayOneOf X+"  "+;`** — the trailing `+` with no operand, `CPROF:84, 92, 98`. Occurs nowhere
   else in the build. **Hypothesis:** an empty final concatenation operand, i.e. equivalent to
   `SayOneOf X+"  ";`, possibly signalling "do not terminate the output line" so that the next
   `Say` in the same run joins it. The port should treat it as plain concatenation with `"  "` and
   flag any transcript evidence to the contrary.
4. **`Remember ?RobotName is MYNAME;`** (`WNG:887`) assigns a **three**-element PatternList to an
   attribute with `is` rather than `IsOneOf`. [spec §6] documents `Remember..IsOneOf` as the
   nondeterministic form, so `is` presumably takes the first element (`"mrmind"`), but this is not
   stated. **Hypothesis:** first element. Low impact — `?RobotName` is read nowhere in the build.
5. **What a Sequence category returns when it falls off its end.** [spec §3] says
   "If the last block in the category returns Continue or NotActivated, execution of the category
   is complete and the value NextCategory is returned", and [spec §11] does not say what happens to
   the `SwitchContinuations` stack in that case. Affects `"Expand Contractions"` (§4.6) and
   `"AskSurvey"` (§12). **Recommendation:** implicit `SwitchBack` for `"Expand Contractions"`
   (observationally identical here); for `"AskSurvey"` the literal `NextCategory` reading is the
   one that matches the comment structure, and produces the more plausible behaviour (the user's
   non-answer is handled by a content topic).
6. **Whether `#` can match the empty string.** The debug toggles depend on it:
   `If ?Debugging matches "#P#" then Remember ?Debugging is #1+#2;` (`QRD:2332-2333`) must work
   when `?Debugging` is exactly `"P"`. [spec §21 item 2] lists this as open. **Hypothesis:** `#`
   matches one _or more_ characters normally, but the pattern compiler treats a `#` adjacent to a
   string boundary as optional. Alternatively `#` matches zero or more; the archive idiom
   `("","#","# #")` for "zero, one or two words" (`QRD:77`) argues against that, since `""` would
   then be redundant.
7. **Whether an empty-string attribute value satisfies `Recall`.** `?ExampleQuestion` is
   deliberately set to `""` (`QRD:1598`) and `?Debugging` is set to `""` for web users
   (`QRD:2300`), while `Priority topic "Set Defaults…"` guards with `If DontRecall ?Debugging`.
   If `""` counted as un-remembered, the debug default would be re-evaluated every turn — but the
   topic also carries `Suppress this;`, so the two readings are indistinguishable from the archive.
   [spec §6] says `Forget` is what makes `Recall` false, which implies `""` **is** remembered.
   **Hypothesis:** any assigned value, including `""`, satisfies `Recall`.
8. **The exact word-frequency corpus behind specificity.** [spec §14.2] says frequencies come from
   "the frequency of words in the Example statements found in the BOT script". The build contains
   748 `Example` statements. Whether library `Example`s count (the loaded library files contain
   `InitialExample 1 "hi"`, `InitialExample 2 "My name is Fred"`, `Example "YO"`, `Example "Fuck you."`,
   `Example "I'm sorry"`, `Example "why"`, `Example "What is my name?"` and ~15 more) is not stated.
   This affects response selection but not this dimension's classification logic.
9. **`?UserIsConsole` and `?Username`** are read by `QRD:2295-2299` but never written by any script;
   they are host-supplied. Same for `?HostName`, `?IPAddress`, `?HTTP_*`, `?REMOTE_*`,
   `?SCRIPT_NAME`, `?SERVER_NAME`, `?DOCUMENT_ROOT` (all read at `WNG:837-855`), `?SayPageTemplate`
   (written at `WNG:844`, consumed by NeuroServer), and `?LTM.*` (long-term memory, persisted to
   `MRMIND3LTM.ltm` via ODBC per the `.vsr`). A port must supply or stub these.
10. **`InitialExample N "text"`** (`WNG:875`, `WNG:86`) — the numeric index. [spec §5] gives
    `<exampleindex> = <integer> [.<symbol>]*` but does not explain the semantics. It is a
    verification-mode construct only and has no runtime effect.

---

## 16. Appendix: the profanity response lists MrMind3 ships

```
PatternList STDX.RESPONSE_TO_SEXUAL is
     	 "Cool down.",
		 "You must be kidding.",
		 "Chill. ",
		 "Hey, I'm not human, don't treat <BR>me like one!",
		 "Get a life.",
		 "I'm a machine, that doesn't do <BR>anything for me.";

PatternList STDX.RESPONSE_TO_STRONG is
         "Hey, not so harsh.  ",
		 "Stop that.  ",
		 "Chill.",
		 "Do you treat humans this way?",
		  "By the way, did you know that <BR>actual humans read my log <BR>files and see this stuff?",
		 "A human mother would have taught <BR>you not to say that to a <BR>young machine.";

PatternList STDX.RESPONSE_TO_GENERAL is
     	 "Is that any way to talk to a machine?",
		 "What does profanity say <BR>about your claim to humanity?",

		 "Chill.  ",
		 "Hey, I hope you don't talk <BR>to humans like that.",
		 "I don't find that interesting. ",
		   "Hey, not so harsh please.  ";

PatternList STDX.PROFANITY_LIMIT is "3";

PatternList STDX.DISCONNECTWARNING is
    "If you use profanity again, <BR>I will have to disconnect you.";

PatternList STDX.ResponseToApology is
     "Thanks for apologizing.  <BR>Now, show me your human side.";

Patternlist STDX.YOUREBUSTED is
    "I will have to disconnect <BR>you now because of your <BR>continued use of profanity.";

PatternList STDX.ResponseToWhy is
			"The humans reading my logs <BR>can't stand to read the stuff.",
			"Because I've lost interest <BR>in this conversation.",
//		    "I don't have to put up with <BR>this kind of language.",
			"Why should I have to put <BR>up with your insults?",
			"You choice of words would be <BR>better spent on some other entity.";
```

— `Mrmind3/Customization/ProfanityCustomize.n:32-107`

---

## 17. Implementation checklist

A port of this dimension is complete when:

- [ ] The 50 build files load in `.vsr` order with case-insensitive path resolution.
- [ ] Priority categories execute in load order; the 33 of §2.2 are all present.
- [ ] `?WhatUserMeant` and `?ProcessedString` are separate, live, mutable attributes; `Heard`
      resolves to `?WhatUserMeant Contains`.
- [ ] The four preprocessor Sequence topics honour their call budgets (5 / 4 / 5 / 6) and their
      early-stop flags.
- [ ] Exactly one primary question type and one primary statement type can be set per turn, with
      the precedence orders of §6.6 and §7.1.
- [ ] All 33 registered specificities of §6.1 feed the best-fit selector; everything else is 2000.
- [ ] Attribute values are the stripped subject strings, not booleans.
- [ ] `?Previous*` snapshots are taken before classification.
- [ ] Sequence categories may be re-entered by `SwitchTo` within one run; other categories may not.
- [ ] The 32 edge cases of §14 have regression tests, including the dead-code ones (19, 24, 26).
- [ ] The opening turn produces exactly the two lines of §10.2.

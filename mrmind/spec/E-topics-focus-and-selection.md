# E. Category types, subjects, focus, and response selection

**NeuroScript 2.2 — implementation specification for a faithful, LLM-free JavaScript port of MrMind3.**

Scope of this document: what a _category_ is and what its four types mean; the `Subjects` declaration and the
subject map; `MemoryLock`; the `SwitchTo` / `SwitchBack` subroutine mechanism and the two continuation stacks;
`WaitForResponse`, `TryAgain`, `InterruptSequence`; `DontFocus`; `Focus` and `Focus Subjects`; `Suppress` /
`Recover`; and — the payload — the exact run loop and the best-fit specificity selection algorithm the port must
implement.

Authority order used throughout:

1. **The archive** — `…/NeuroScript/` (NeuroScript 2.2, 2000–2002). Ground truth. Cited as `file:line`.
2. **The patent-derived spec** — `archive/_research/patents/GERBIL-LANGUAGE-NOTES.md`. Cited as `[spec §N]`.
   Used only for semantics the archive cannot show (the run loop, the specificity formula).
3. **Compiled artefacts** — `MRMIND3.vre` (the serialised runtime object), `NSOBJ/*.nso`, `MRMIND3CDB.cdb`
   and its CSV export. Corroboration only.

Where the archive and the patents disagree, the archive wins and the disagreement is stated explicitly
(see §11, _Contradictions_).

---

## 0. The corpus this document is measured against

### 0.1 The shipped build

`Mrmind3/MRMIND3.vsr` `[FILES]` lists **49** source files, in build order. Paths use backslashes and are relative
to `Mrmind3/`, except those prefixed `LIBRARY:`, which are relative to `Library/`. Path case in the manifest does
**not** match the filesystem in five entries (`customization\` vs `Customization\`) — the original ran on Windows,
so **file lookup must be case-insensitive**.

Build order is load-bearing: it fixes (a) the execution order of Priority categories, (b) the execution order of
Default categories, and (c) the _initial_ attention-focus order of Standard categories for every new user.

The 49 files, in build order, parse to **690 categories**:

| type                                           | count |
| ---------------------------------------------- | ----- |
| Standard (unlabelled)                          | 558   |
| Sequence                                       | 61    |
| Default                                        | 38    |
| Priority                                       | 33    |
| _of which_ `Scenario` rather than `Topic`      | 3     |
| _of which_ declared `Suppressed` in the header | 0     |

Per file (in build order; `tot / std / def / pri / seq`):

```
Mrmind3/Patterns.n                                0     0     0     0     0
Mrmind3/Customization/GoodbyeCustomize.n          0     0     0     0     0
Mrmind3/Customization/DebugCustomize.n            0     0     0     0     0
Mrmind3/customization/WebCustomize.n              0     0     0     0     0
Mrmind3/customization/NameCustomize.n             8     8     0     0     0
Mrmind3/customization/GreetCustomize.n            0     0     0     0     0
Mrmind3/Customization/ProfanityCustomize.n        3     3     0     0     0
Library/StdQuestion/combis/QuesResDebug.us.n     65     0     0    25    40
Mrmind3/customization/MyName.n                    0     0     0     0     0
Mrmind3/Utilities/CProfanity.n                    4     2     0     1     1
Mrmind3/Utilities/WebNameGreet.n                 18     6     1     5     6
Mrmind3/Utilities/CGoodbye.n                      2     0     0     1     1
Mrmind3/Activities/20Questions.n                  8     6     0     0     2
Mrmind3/Activities/UserSurvey.n                   4     3     0     0     1
Mrmind3/Activities/ategag.n                       3     1     0     1     1
Mrmind3/Activities/icons.n                        7     7     0     0     0
Mrmind3/Activities/Expressions Filter.n           4     4     0     0     0
Mrmind3/AboutMrMind/MMIdentity.n                 23    22     0     0     1
Mrmind3/AboutMrMind/MMphysical.n                 15    15     0     0     0
Mrmind3/AboutMrMind/MMPurpose.n                  12    12     0     0     0
Mrmind3/AboutMrMind/WhatIsMM.n                   19    19     0     0     0
Mrmind3/AboutUser/UserPhysical.n                 26    26     0     0     0
Mrmind3/AboutUser/UserMind.n                     35    35     0     0     0
Mrmind3/AboutUser/UserGeneral.n                  20    20     0     0     0
Mrmind3/AboutUser/UserFamily.n                   13    13     0     0     0
Mrmind3/AboutUser/UserSociety.n                  33    33     0     0     0
Mrmind3/Humans&Machines/Machines.n               15    15     0     0     0
Mrmind3/Humans&Machines/Bots.n                   12    12     0     0     0
Mrmind3/Humans&Machines/Humans.n                 23    22     0     0     1
Mrmind3/Humans&Machines/Convincing.n             29    29     0     0     0
Mrmind3/Issues/Consciousness.n                   29    29     0     0     0
Mrmind3/Issues/Choice.n                          14    14     0     0     0
Mrmind3/Issues/Misc.n                             6     6     0     0     0
Mrmind3/Issues/Emotion.n                         42    42     0     0     0
Mrmind3/Issues/Humor.n                            4     4     0     0     0
Mrmind3/Issues/Life.n                            14    14     0     0     0
Mrmind3/Issues/TrustTruth.n                      11    11     0     0     0
Mrmind3/Issues/RIskGoals.n                        6     6     0     0     0
Mrmind3/Reactions/Annoyance.n                    16    12     0     0     4
Mrmind3/Reactions/Compliments.n                   9     9     0     0     0
Mrmind3/Reactions/Comments.n                      6     6     0     0     0
Mrmind3/Reactions/Suggestions.n                   2     2     0     0     0
Mrmind3/Reactions/Questions.n                    16    16     0     0     0
Mrmind3/Reactions/Asides.n                       23    23     0     0     0
Mrmind3/Defaults/AskMe.n                          2     1     0     0     1
Mrmind3/Defaults/Answers.n                       47    47     0     0     0
Mrmind3/Defaults/Pointers.n                       4     2     0     0     2
Mrmind3/Defaults/OneShots.n                      28     0    28     0     0
Mrmind3/Defaults/Defaults.n                      10     1     9     0     0
```

Files with zero categories (`Patterns.n`, the `Customization/*.n` files, `MyName.n`) contain only
`PatternList` / `Pattern` / `Attribute` declarations and string constants. They still have to be loaded, in order,
because pattern lists are global and later files reference them.

### 0.2 Damaged / excluded files (report, do not treat as empty scripts)

Zero-length `.n` files found anywhere under `NeuroScript/`:

- `Mrmind3/Activities/picutres.n` (0 bytes) — **not in the build manifest**
- `Mrmind3/AboutMrMind/MMfamily.n` (0 bytes) — **not in the build manifest**
- `Mrmind3old/Answering.n` (0 bytes)
- `Mrmind3old/AboutMrMind/MMfamily.n` (0 bytes)

`Mrmind3/Defaults/Switches.n` is 18 bytes of pure whitespace (`\r\n` × 6 plus `\t \t \r\n`) — not in the manifest
either. No NUL-filled `.n` files were found; there are no damaged-disk artefacts in the shipped build set.

Present on disk but deliberately **not** in the build: `Mrmind3/Issues/Bots.n` (superseded by
`Humans&Machines/Bots.n`), `Mrmind3/Defaults/Switches.n`, `Mrmind3/AboutMrMind/MMfamily.n`,
`Mrmind3/Activities/picutres.n`. Do not load them.

### 0.3 Encoding

All `.n` files are CRLF. Several contain non-ASCII bytes in **Windows-1252 / Latin-1**, not UTF-8; e.g.
`Mrmind3/AboutMrMind/MMIdentity.n:204` contains `Paul Val\xE9ry`. Decode as Latin-1 (or CP1252) and strip `\r`
before any line-based work. GNU `grep` mis-classifies such files as binary and silently drops them from counts —
every census in this document was done in Python with an explicit Latin-1 decode.

---

## 1. Grammar: category headers and bodies

```ebnf
Category        = [ "Suppressed" ] [ CategoryType ] CategoryKind String "is"
                  { CategoryStatement }
                  ( "EndTopic" | "EndScenario" ) ;

CategoryType    = "Priority" | "Default" | "Sequence" ;      (* absent => Standard *)
CategoryKind    = "Topic" | "Scenario" ;

CategoryStatement = MemoryLockStmt | SubjectsStmt | ConditionalBlock ;

MemoryLockStmt  = "MemoryLock" MemRef { "," MemRef } ";" ;
SubjectsStmt    = "Subjects" String { "," String } ";" ;

ConditionalBlock= Condition "Then" { Command | ConditionalBlock } BlockEnd
                | ConditionalBlock "Otherwise" ConditionalBlock ;

BlockEnd        = "Done" | "Continue" | "NextTopic" | "NextScenario"
                | "TryAgain" | "SwitchBack" ;

MemRef          = "?" Identifier ;
String          = '"' { char | '\"' } '"' ;
```

**All keywords are case-insensitive.** The archive proves this is not theoretical:
`Sequence topic` (`Mrmind3/Utilities/CGoodbye.n:57`), `SeQuence topic` (`Library/Utilities/…`), `sequence topic`,
`default topic` (`Mrmind3/Defaults/OneShots.n:4`), `Endtopic` (`Mrmind3/Issues/TrustTruth.n:91`),
`SUBJECTS` / `Subjects` / `subjects`, `Ifchance` / `IfChance`, `Whenfocused` / `WhenFocused`,
`SwitchTo "asksurvey"` targeting `Sequence topic "AskSurvey"`. Lower-case everything before comparing.

`Then` is optional in practice — the archive writes both `If cond Then` and `If cond` on its own line followed by
the body, and `Always` (a bare condition) with no `Then`.

Comments: `//` to end of line, outside string literals. Block comments `/* … */` also occur. Strip both before
tokenising, but never inside a `"…"` literal.

### 1.1 Notes for the parser

- A category name is the string literal between the kind keyword and `is`. **Names are unique**: across all 690
  categories of the build there are **zero** duplicate names, case-insensitively. `SwitchTo` / `Focus` /
  `Suppress` / `Recover` therefore resolve unambiguously by case-insensitive name.
- `MemoryLock` and `Subjects` are top-level statements of a category only. No category in the build has more than
  one `Subjects` statement; `MemoryLock` argument lists may span many lines up to the `;`
  (`Library/StdQuestion/combis/QuesResDebug.us.n:259–272` is 31 attributes over 12 lines).
- Trailing whitespace inside category-name literals occurs: `Priority Topic "FindQuestion "`
  (`Library/StdQuestion/combis/QuesResDebug.us.n:350`) — note the trailing space. Preserve it, and trim only when
  comparing.

---

## 2. The four category types

Verbatim from the language reference in the patents [spec §2, quoting 6,604,090:1013-1069]:

> "Categories are divided into four types, priority, standard, default, and sequence, according to the label
> preceding the word "topic" or "scenario". A category that is not labeled is a Standard type. […] All priority
> categories are executed first, in the order in which they appear in the program. Next, all standard categories
> are executed. […] Finally, all default categories are executed, in the order in which they appear in the
> program. Sequence categories are executed only when explicitly accessed in a SwitchTo statement."

`Topic` handles **user statements**; `Scenario` handles **user actions** (login, reconnect, disconnect). Both are
"categories" and both obey the same type rules.

### 2.1 Standard (558)

The default. Selected by best-fit specificity (§12), ordered by the per-user attention-focus list, auto-focused
when they produce output. Only Standard categories participate in the attention-focus mechanism.

Initial attention-focus order for a new user = build order. The first eight standard categories, and hence the
initial head of the focus list, are:

```
RealName            Mrmind3/customization/NameCustomize.n:53
NotRealName         Mrmind3/customization/NameCustomize.n:65
It's short for      Mrmind3/customization/NameCustomize.n:79
It's my initials    Mrmind3/customization/NameCustomize.n:89
EvadeNameQuestion   Mrmind3/customization/NameCustomize.n:100
ReasonForName       Mrmind3/customization/NameCustomize.n:112
NewRealName         Mrmind3/customization/NameCustomize.n:123
NewRealName2        Mrmind3/customization/NameCustomize.n:139
```

and the last is `Why do you think whatever` (`Mrmind3/Defaults/Defaults.n:111`).

### 2.2 Priority (33)

Run first, every input, in build order, unconditionally (subject to suppression). In MrMind3 they are almost
entirely the **input-analysis pipeline**: 25 of the 33 come from `Library/StdQuestion/combis/QuesResDebug.us.n`
and do nothing but set `?…Question` / `?…Statement` attributes and emit `SayToConsole` debug traces. The eight
bot-authored priority categories are the profanity filter, the login/greeting/goodbye detectors, and one gag:

```
 26 "Tsk Tsk"                       Mrmind3/Utilities/CProfanity.n:78
 27 "Login over Web"      Scenario  Mrmind3/Utilities/WebNameGreet.n:835
 28 "Reconnect"           Scenario  Mrmind3/Utilities/WebNameGreet.n:864
 29 "Login from Console"            Mrmind3/Utilities/WebNameGreet.n:873
 30 "STD_Greeting Detect"           Mrmind3/Utilities/WebNameGreet.n:905
 31 "Std_GreetingQuestion Detect"   Mrmind3/Utilities/WebNameGreet.n:926
 32 "STD_Goodbye Detect"            Mrmind3/Utilities/CGoodbye.n:44
 33 "hate"                          Mrmind3/Activities/ategag.n:1
```

Priority categories accounted for only **215 of 7,312** bot utterances (2.94%) in the shipped conversation
database — they are filters, not answerers.

Full priority list in build order, positions 1–25, all in `Library/StdQuestion/combis/QuesResDebug.us.n`:
`Find ?WhatUserMeant`(132), `find ?ProcessedString`(173), `Set possible statements`(226),
`Previous utterance topic`(240), `Previous utterance Scenario`(246, Scenario), `FindQuestion `(350),
`ParseStatements`(388), `StdResponse Computation`(2262), `Set Defaults for level of debugging information. `(2291),
`debugging info ON`(2313), `debugging info OFF`(2321), `Toggle PreProcessor Debugging`(2329),
`Toggle Question Debugging`(2344), `Toggle Response Debugging`(2358), `Toggle Statement Debugging`(2373),
`Toggle WhatUserSaid Debugging`(2390), `Toggle EarlyStatement Debugging`(2406),
`Toggle EarlyQuestion Debugging`(2421), `Report PreProcessor debugging to console`(2449),
`debugging StdQuestion information`(2460), `debugging Response information`(2489),
`StdStatement Debugging`(2499), `Reporting WhatUserSaid`(2518), `EarlyStatement Debugging`(2561),
`debugging EarlyQuestion information`(2580).

### 2.3 Default (38)

Run last, in build order, **only if no `Done` has been reached** by the priority + continuation + standard phases.
They are the fallbacks. In build order:

```
  1 "Greeting detect"              Mrmind3/Utilities/WebNameGreet.n:941
  2 "Is that your RealName"        Mrmind3/Defaults/OneShots.n:4
  3 "HowDidYouFindMe"              Mrmind3/Defaults/OneShots.n:13
  4 "AnsToWhereDoYouLive"          Mrmind3/Defaults/OneShots.n:23
  5 "WhyTalktoHuman"               Mrmind3/Defaults/OneShots.n:32
  6 "Human Terrorism"              Mrmind3/Defaults/OneShots.n:41
  7 "MoreThanInstructions"         Mrmind3/Defaults/OneShots.n:52
  8 "Really Thinking"              Mrmind3/Defaults/OneShots.n:61
  9 "AshamedofHumanOrigins"        Mrmind3/Defaults/OneShots.n:70
 10 "KindOfAlive"                  Mrmind3/Defaults/OneShots.n:80
 11 "WhatAmIQuestion"              Mrmind3/Defaults/OneShots.n:92
 12 "SuperiorQuestion"             Mrmind3/Defaults/OneShots.n:101
 13 "Suggestion"                   Mrmind3/Defaults/OneShots.n:111
 14 "Suggestion2"                  Mrmind3/Defaults/OneShots.n:120
 15 "Submission"                   Mrmind3/Defaults/OneShots.n:129
 16 "Mischief1"                    Mrmind3/Defaults/OneShots.n:139
 17 "Mischief2"                    Mrmind3/Defaults/OneShots.n:153
 18 "Mischief3"                    Mrmind3/Defaults/OneShots.n:163
 19 "CatOnKeyboard"                Mrmind3/Defaults/OneShots.n:173
 20 "Guilt"                        Mrmind3/Defaults/OneShots.n:182
 21 "Paranoia2"                    Mrmind3/Defaults/OneShots.n:191
 22 "Paranoia"                     Mrmind3/Defaults/OneShots.n:200
 23 "SIMS Can't"                   Mrmind3/Defaults/OneShots.n:211
 24 "Nonrepeating random dead bee" Mrmind3/Defaults/OneShots.n:220
 25 "UserWantsAgain"               Mrmind3/Defaults/OneShots.n:230
 26 "UserStillHas"                 Mrmind3/Defaults/OneShots.n:247
 27 "UserStillNeeds"               Mrmind3/Defaults/OneShots.n:266
 28 "UserCant"                     Mrmind3/Defaults/OneShots.n:284
 29 "UserCan"                      Mrmind3/Defaults/OneShots.n:301
 30 "No"                           Mrmind3/Defaults/Defaults.n:14
 31 "maybe"                        Mrmind3/Defaults/Defaults.n:25
 32 "WishyWashy"                   Mrmind3/Defaults/Defaults.n:37
 33 "Sure"                         Mrmind3/Defaults/Defaults.n:46
 34 "I have a whatever"            Mrmind3/Defaults/Defaults.n:60
 35 "Generic answers"              Mrmind3/Defaults/Defaults.n:76
 36 "Why default"                  Mrmind3/Defaults/Defaults.n:98
 37 "Who default"                  Mrmind3/Defaults/Defaults.n:125
 38 "Last Line Of Defense"         Mrmind3/Defaults/Defaults.n:144
```

`Last Line Of Defense` is the terminal category of the whole program: `Default Topic … is / Always / IfChance … /
Done / IfChance … / Done …` — a uniform random pick over ~8 bare `IfChance` blocks. It is the single most
frequently firing _answering_ topic in the shipped database.

Defaults are **not** auto-focused (they are not Standard) and, importantly, a default that produces output
without any `Subjects` does **not** disturb the active-subjects set — this is deliberate and is why `Focused`
survives a "I don't know" turn [spec §13.2].

### 2.4 Sequence (61)

Never selected. Entered **only** by `SwitchTo`. Never auto-focused. They are subroutines and coroutines.

Full list, in build order:

```
 1 "Set Previous Questions/Statements"   Library/StdQuestion/combis/QuesResDebug.us.n:253
 2 "remove excess punctuation"           Library/StdQuestion/combis/QuesResDebug.us.n:439
 3 "Strip meaningless leaders"           Library/StdQuestion/combis/QuesResDebug.us.n:467
 4 "Strip meaningless internals"         Library/StdQuestion/combis/QuesResDebug.us.n:497
 5 "Expand Contractions"                 Library/StdQuestion/combis/QuesResDebug.us.n:532
 6 "strip leading phrases"               Library/StdQuestion/combis/QuesResDebug.us.n:766
 7 "Find Primary Question types"         Library/StdQuestion/combis/QuesResDebug.us.n:807
 8 "Find Secondary Question types"       Library/StdQuestion/combis/QuesResDebug.us.n:828
 9 "StdQ.FindCanQuestion"                Library/StdQuestion/combis/QuesResDebug.us.n:846
10 "StdQ.FindMethodQuestion"             Library/StdQuestion/combis/QuesResDebug.us.n:887
11 "StdQ.FindWhoQuestion"                Library/StdQuestion/combis/QuesResDebug.us.n:950
12 "StdQ.FindWhatIfQuestion"             Library/StdQuestion/combis/QuesResDebug.us.n:992
13 "StdQ.FindLocationQuestion"           Library/StdQuestion/combis/QuesResDebug.us.n:1030
14 "StdQ.FindReasonQuestion"             Library/StdQuestion/combis/QuesResDebug.us.n:1085
15 "StdQ.FindShouldQuestion"             Library/StdQuestion/combis/QuesResDebug.us.n:1119
16 "StdQ.FindTimeQuestion"               Library/StdQuestion/combis/QuesResDebug.us.n:1153
17 "StdQ.FindFactQuestion"               Library/StdQuestion/combis/QuesResDebug.us.n:1190
18 "StdQ.FindDescriptionQuestion"        Library/StdQuestion/combis/QuesResDebug.us.n:1269
19 "StdQ.FindOtherQuestion"              Library/StdQuestion/combis/QuesResDebug.us.n:1350
20 "StdQ.FindAnyQuestion"                Library/StdQuestion/combis/QuesResDebug.us.n:1418
21 "StdQ.FindCompareQuestion"            Library/StdQuestion/combis/QuesResDebug.us.n:1435
22 "StdQ.FindConfirmQuestion"            Library/StdQuestion/combis/QuesResDebug.us.n:1485
23 "StdQ.FindCostQuestion"               Library/StdQuestion/combis/QuesResDebug.us.n:1506
24 "StdQ.FindDirectionsQuestion"         Library/StdQuestion/combis/QuesResDebug.us.n:1531
25 "StdQ.FindDoHaveQuestion"             Library/StdQuestion/combis/QuesResDebug.us.n:1562
26 "StdQ.FindExampleQuestion"            Library/StdQuestion/combis/QuesResDebug.us.n:1590
27 "StdQ.FindMoreQuestion"               Library/StdQuestion/combis/QuesResDebug.us.n:1622
28 "StdQ.FindObtainQuestion"             Library/StdQuestion/combis/QuesResDebug.us.n:1649
29 "StdS.FindQuestion"                   Library/StdQuestion/combis/QuesResDebug.us.n:1749
30 "StdS.FindMessageStatement"           Library/StdQuestion/combis/QuesResDebug.us.n:1782
31 "StdS.FindActStatement"               Library/StdQuestion/combis/QuesResDebug.us.n:1828
32 "StdS.FindTimeStatement"              Library/StdQuestion/combis/QuesResDebug.us.n:1907
33 "StdS.FindConditionalStatement"       Library/StdQuestion/combis/QuesResDebug.us.n:1925
34 "StdS.FindIsStatement"                Library/StdQuestion/combis/QuesResDebug.us.n:1942
35 "StdS.FindHaveStatement"              Library/StdQuestion/combis/QuesResDebug.us.n:2001
36 "StdS.FindWantStatement"              Library/StdQuestion/combis/QuesResDebug.us.n:2055
37 "StdS.FindFactStatement"              Library/StdQuestion/combis/QuesResDebug.us.n:2084
38 "StdS.FindCauseStatement"             Library/StdQuestion/combis/QuesResDebug.us.n:2181
39 "StdS.FindFeelingStatement"           Library/StdQuestion/combis/QuesResDebug.us.n:2200
40 "StdS.FindOtherStatement"             Library/StdQuestion/combis/QuesResDebug.us.n:2221
41 "Increment, Warn, and Disconnect"     Mrmind3/Utilities/CProfanity.n:55
42 "Name Capture"                        Mrmind3/Utilities/WebNameGreet.n:36
43 "Name Parser"                         Mrmind3/Utilities/WebNameGreet.n:436
44 "strip non-name words"                Mrmind3/Utilities/WebNameGreet.n:652
45 "Name Parser Got Name"                Mrmind3/Utilities/WebNameGreet.n:667
46 "Name Parser Missed Name"             Mrmind3/Utilities/WebNameGreet.n:701
47 "Robot Greeting"                      Mrmind3/Utilities/WebNameGreet.n:884
48 "AskSurvey"                           Mrmind3/Utilities/CGoodbye.n:57
49 "GetYN"                               Mrmind3/Activities/20Questions.n:72
50 "20 questions"                        Mrmind3/Activities/20Questions.n:85
51 "Exit Survey"                         Mrmind3/Activities/UserSurvey.n:33
52 "Invert"                              Mrmind3/Activities/ategag.n:16
53 "Talk about ancestors"                Mrmind3/AboutMrMind/MMIdentity.n:245
54 "ShapeImportance"                     Mrmind3/Humans&Machines/Humans.n:276
55 "AnnoyanceOne"                        Mrmind3/Reactions/Annoyance.n:75
56 "AnnoyanceTwo"                        Mrmind3/Reactions/Annoyance.n:86
57 "AnnoyanceThree"                      Mrmind3/Reactions/Annoyance.n:108
58 "AnnoyanceFour"                       Mrmind3/Reactions/Annoyance.n:146
59 "Questions for AskMe3"                Mrmind3/Defaults/AskMe.n:36
60 "AskAboutPointers"                    Mrmind3/Defaults/Pointers.n:45
61 "Pointers"                            Mrmind3/Defaults/Pointers.n:84
```

Sequence categories 1–40 are the StdQuestion parser subroutines. 41–61 are the bot's real coroutines: name
capture, the greeting, the goodbye survey, 20 Questions, the annoyance escalator, the pointer/help system.

### 2.5 Scenario (3, all Priority)

```
[Priority] "Previous utterance Scenario"  Library/StdQuestion/combis/QuesResDebug.us.n:246
[Priority] "Login over Web"               Mrmind3/Utilities/WebNameGreet.n:835
[Priority] "Reconnect"                    Mrmind3/Utilities/WebNameGreet.n:864
```

They test `?WhatUserDid` rather than `?WhatUserSaid`, and are run on the **action** channel:

```
Priority Scenario "Login over Web" is
 	If ?WhatUserDid Contains "Web ACCEPT CONNECTION" Then
```

— `Mrmind3/Utilities/WebNameGreet.n:835-836`

```
Priority Scenario "Reconnect" is
	If ?WhatUserDid Contains "Web RECONNECT" Then
```

— `Mrmind3/Utilities/WebNameGreet.n:864-865`

The port needs two entry points into the run loop — `runOnStatement(text)` and `runOnAction(actionString)` — that
differ only in which channel attribute is set and which categories are eligible (`Topic` vs `Scenario`). Everything
else (type ordering, focus, continuations) is identical.

### 2.6 `Suppressed` header modifier

Zero occurrences in the shipped build. Grammar support is still required (`Suppressed Topic "X" is …` marks the
category suppressed for every user from the start). One occurrence exists in `Library/`.

---

## 3. `Subjects`

```ebnf
SubjectsStmt = ("Subjects"|"SUBJECTS"|"subjects") String { "," String } ";" ;
```

A `Subjects` statement is a top-level category statement. **570 of 690** categories declare one. Distribution of
subject counts per category:

| subjects | categories |
| -------- | ---------- |
| 0        | 120        |
| 1        | 361        |
| 2        | 188        |
| 3        | 21         |

Categories with **no** `Subjects`, by type: Priority 32, Sequence 52, Default 33, **Standard 3**. The three
standard ones are `Expressions repeater1/2/3` in `Mrmind3/Activities/Expressions Filter.n:63, 96, 128`.

Verbatim examples:

```
Topic "WhatsYourName" is
Subjects "Name";
```

— `Mrmind3/AboutMrMind/MMIdentity.n:1-2`

```
Topic "Who is Mr Mind" is
Subjects "ME","Family";
```

— `Mrmind3/AboutMrMind/MMIdentity.n:33-34`

```
Topic "How old are you" is
SUBJECTS "ME","AGE";
```

— `Mrmind3/AboutMrMind/MMIdentity.n:69-70`

### 3.1 Case handling — settled by the compiled database

There are **241 distinct verbatim subject strings** in the build but only **196 distinct case- and
whitespace-normalised subjects**. The compiled conversation database settles what the compiler does:
`_work/cdb/mrmind3/Topics.csv` stores each topic's subject list in a column `strSUBJECTS` as the subjects
**lower-cased and each wrapped in square brackets, concatenated**:

```
183,"You are a baby",0,"AboutMrMind\MMIdentity.n",59,0,0,0,"[me,age]"
```

Other real values from that column: `[me]`, `[user]`, `[none]`, `[default answers][identity][alife]`,
`[are you human?][user][gender]`, `[truth][names]`, `[i like potato chips]`.

**Therefore:**

- **Subject identity is case-insensitive.** `"ME"` (59 uses) and `"me"` (2 uses) are the same subject.
  Normalise to lower case at load time and key the subject map on the normalised form.
- The bracket notation `[user]`, `[none]` in `Topics.csv` is a **serialisation artefact**, not source syntax. No
  `.n` file anywhere in the archive writes a subject inside square brackets. Do not implement bracket syntax.
- `"NONE"` (12), `"None"` (1), `"none"` (2) is an ordinary subject string spelled to _look_ like "no subject".
  It is **not** special-cased by the engine: those 15 categories genuinely share a subject and therefore
  co-focus and satisfy each other's `Focused` conditions. Reproduce that. Likewise `"NULL"` (2 categories:
  `What?` at `Mrmind3/Reactions/Questions.n:60-61` and one other).
- `"ME"` is the single most common subject (61 categories) and means "about the bot". `"USER"`/`"User"` (43)
  means "about the human". They are ordinary strings.

Full normalised subject census (count | subject | verbatim spellings when more than one) is in **Appendix A**.

### 3.2 Subject strings are opaque — commas inside a literal are _not_ separators

`Mrmind3/AboutMrMind/MMIdentity.n:81-82`:

```
Topic "You are a baby" is
Subjects "ME,AGE";
```

The author meant `Subjects "ME","AGE";`. The compiler produced the _single_ subject `me,age` — proved by
`Topics.csv`, which records `"[me,age]"` for that topic while recording `"[me][age]"` for correctly written
neighbours. So: **split on commas between string literals only, never inside one**. This subject is shared with
no other category, so the topic auto-focuses only itself. Reproduce the bug.

### 3.3 The subject map

Build, at load time, `subjectMap : normalisedSubject -> ordered list of categories` in build order. 196 entries.
The largest groups (these dominate auto-focus cost and behaviour):

```
me                 61 categories
default answers    47
user               43
alife              24
convince           20
emotions           16
asides             16
none               15
society            14
identity           14
faith              13
thinking           12
```

Also precompute, per category, the ordered list of _other_ categories sharing at least one subject, grouped by
subject in the order the subjects are declared — the auto-focus worked example in [spec §11] requires that
grouping order (the category itself, then the group for subject 1 in build order, then the group for subject 2,
and so on).

### 3.4 What `Subjects` does

Three distinct effects, all of them on Standard categories only:

1. **Auto-focus fan-out** (§7): when a Standard category produces output, it _and every category sharing at least
   one subject with it_ are moved to the front of the attention focus list.
2. **Active subjects / `Focused`** (§8): the subjects of the categories focused by an input become the
   _active-subject set_; the `Focused` condition is true in a category iff it shares ≥ 1 subject with that set.
3. **`Focus Subjects "s"`** (§6.2): focus every category carrying subject `s`, and set the active subjects.

---

## 4. `MemoryLock`

33 occurrences, **all 33 in `Library/StdQuestion/combis/QuesResDebug.us.n`**. Zero in bot-authored files.

```
Sequence Topic "StdQ.FindWhoQuestion" is
MemoryLock ?WhoQuestion ;
```

— `Library/StdQuestion/combis/QuesResDebug.us.n:950-951`

The largest one, `Library/StdQuestion/combis/QuesResDebug.us.n:259-272`, locks 31 `?Previous*` attributes in a
single statement spanning 12 lines.

Semantics [spec §3, quoting 6,604,090:1093-1141]:

> "Each MemoryLock statement asserts that the value of one or more associative memory elements should only be
> changed within that category. If an associative memory key ?x is MemoryLocked in a category C, it is an error
> for a program to assign a value to ?x using Remember or Forget anywhere outside the category C, or to
> MemoryLock ?x in some other category."

**`MemoryLock` is a compile-time assertion with no runtime effect.** Corroboration: `strings` over
`Mrmind3/MRMIND3.vre` (the serialised runtime object) yields `CRemember`, `CForget`, `CFocus`, `CFocusSubject`,
`CSwitchTo`, `CSwitchBack`, `CWaitForResponse`, `CInterruptSequence`, `CSuppress` … but **no `CMemoryLock`
class**. The port may parse `MemoryLock` and either ignore it or use it as a lint check. It must not fail on it.

---

## 5. `SwitchTo` / `SwitchBack` — the subroutine mechanism

### 5.1 Syntax and census

```ebnf
SwitchToStmt = "SwitchTo" String { "," String } ";" ;   (* multi-arg unused in the build *)
SwitchBack   = "SwitchBack" ;                            (* a block terminator, not a command *)
```

- **134 `SwitchTo` sites**, all resolving to a defined category (0 unresolved targets).
- **286 `SwitchBack` terminators**, **all 286 inside Sequence categories** — matching the patent's rule
  "It is an error to end a block with SwitchBack if the block is not inside a Sequence topic".
- 47 of the 61 Sequence categories contain at least one `SwitchBack`. The other 14 end with `Done`, or run off
  the end and return `NextCategory`:
  `Set Previous Questions/Statements`, `Name Capture`, `Robot Greeting`, `20 questions`, `Exit Survey`,
  `Invert`, `ShapeImportance`, `AnnoyanceOne`, `AnnoyanceTwo`, `AnnoyanceThree`, `AnnoyanceFour`,
  `Questions for AskMe3`, `AskAboutPointers`, `Pointers`.

**Target names are matched case-insensitively.** Real archive proof:
`SwitchTo "asksurvey"` → `Sequence topic "AskSurvey"` (`Mrmind3/Utilities/CGoodbye.n:48` → `:57`);
`SwitchTo "Remove excess punctuation"` → `Sequence Topic "remove excess punctuation"`;
`SwitchTo "20 Questions"` → `Sequence Topic "20 questions"` (`Mrmind3/Defaults/AskMe.n:19` → `20Questions.n:85`);
`SwitchTo "Name Parser got Name"` → `"Name Parser Got Name"`.

### 5.2 Call graph of the Sequence categories

**Bot-authored subgraph** (caller `[type]` → target), the part a port must get right for observable behaviour:

```
"NewRealName"                 [Standard] NameCustomize.n:133  -> "Name Parser"            [Sequence]
"NewRealName2"                [Standard] NameCustomize.n:148  -> "Name Parser"            [Sequence]
"Fuck"                        [Standard] ProfanityCustomize.n:114 -> "AnnoyanceThree"     [Sequence]
"Tsk Tsk"                     [Priority] CProfanity.n:85,93,100  -> "Increment, Warn, and Disconnect" [Sequence]
"Name Capture"                [Sequence] WebNameGreet.n:44    -> "Name Parser"            [Sequence]
"Name Parser"                 [Sequence] WebNameGreet.n:467,472,520 -> "Name Parser Missed Name" [Sequence]
"Name Parser"                 [Sequence] WebNameGreet.n:542,554 -> "strip non-name words"  [Sequence]
"Name Parser"                 [Sequence] WebNameGreet.n:550,559,571,577,584,601,611,617,623,635,643
                                                              -> "Name Parser Got Name"   [Sequence]
"Name Parser"                 [Sequence] WebNameGreet.n:647    -> "Name Parser Missed Name"[Sequence]
"Quit calling me Shirley!"    [Standard] WebNameGreet.n:751,760 -> "Name Parser"          [Sequence]
"My name is ... "             [Standard] WebNameGreet.n:807    -> "Name Parser"           [Sequence]
"Login over Web"              [Priority] WebNameGreet.n:858    -> "Robot Greeting"        [Sequence]
"Login from Console"          [Priority] WebNameGreet.n:877    -> "Robot Greeting"        [Sequence]
"Robot Greeting"              [Sequence] WebNameGreet.n:888    -> "Name Capture"          [Sequence]
"STD_Goodbye Detect"          [Priority] CGoodbye.n:48         -> "asksurvey"             [Sequence]
"AskSurvey"                   [Sequence] CGoodbye.n:62         -> "Exit Survey"           [Sequence]
"I want to play 20 Questions" [Standard] 20Questions.n:20      -> "20 questions"          [Sequence]
"20 questions"                [Sequence] 20Questions.n:90,97,100,102,104,106,108,110,112,114,116,
                                          123,125,127,129,131,133,135,137,143,149
                                                               -> "GetYN"                 [Sequence]   (21 sites)
"I want to take the user survey" [Standard] UserSurvey.n:18    -> "Exit Survey"           [Sequence]
"ate"                         [Standard] ategag.n:11           -> "Invert"                [Sequence]
"Tell me more about your family." [Standard] MMIdentity.n:240  -> "Talk about ancestors"  [Sequence]
"Shape"                       [Standard] Humans.n:272          -> "ShapeImportance"       [Sequence]
"Annoyance"                   [Standard] Annoyance.n:61,65,68,70 -> "AnnoyanceFour", "AnnoyanceThree",
                                                                    "AnnoyanceTwo", "AnnoyanceOne" [Sequence]
"AnnoyanceOne"                [Sequence] Annoyance.n:82         -> "AskAboutPointers"     [Sequence]
"AskMe3"                      [Standard] AskMe.n:19            -> "20 Questions"          [Sequence]
"AskMe3"                      [Standard] AskMe.n:29            -> "Questions for AskMe3"  [Sequence]
"You are frustrating."        [Standard] Pointers.n:20         -> "AskAboutPointers"      [Sequence]
"I want help."                [Standard] Pointers.n:38         -> "Pointers"              [Sequence]
"AskAboutPointers"            [Sequence] Pointers.n:59         -> "Pointers"              [Sequence]
```

**Library subgraph** (`Library/StdQuestion/combis/QuesResDebug.us.n`), the input parser, called every turn from
Priority categories:

```
"Find ?WhatUserMeant"   [Priority] -> "Remove excess punctuation"                    (5 sites: 154,156,158,160,162)
"find ?ProcessedString" [Priority] -> "Strip meaningless leaders"                    (4 sites: 178,180,182,184)
"find ?ProcessedString" [Priority] -> "strip meaningless internals"                  (5 sites: 190-198)
"find ?ProcessedString" [Priority] -> "Expand Contractions"                          (6 sites: 206-216)
"Previous utterance topic"    [Priority] -> "Set Previous Questions/Statements"
"Previous utterance Scenario" [Priority] -> "Set Previous Questions/Statements"
"FindQuestion "         [Priority] -> "Strip leading phrases" / "Find Primary Question types" (alternating, 354-363)
"FindQuestion "         [Priority] -> "StdQ.FindOtherQuestion", "StdQ.FindAnyQuestion",
                                      "Find Secondary Question Types"
"ParseStatements"       [Priority] -> "StdS.FindQuestion", "StdS.FindMessageStatement",
                                      "StdS.FindActStatement", "StdS.FindIsStatement",
                                      "StdS.FindHaveStatement", "StdS.FindWantStatement",
                                      "StdS.FindFactStatement", "StdS.FindOtherStatement",
                                      "StdS.FindCauseStatement", "StdS.FindFeelingStatement",
                                      "StdS.FindTimeStatement", "StdS.FindConditionalStatement"
"Find Primary Question types"   [Sequence] -> StdQ.FindCanQuestion … StdQ.FindAnyQuestion (12 targets, 813-824)
"Find Secondary Question types" [Sequence] -> StdQ.FindCompareQuestion … StdQ.FindObtainQuestion (8 targets, 834-841)
```

Maximum call depth observed: 3 (`Priority "FindQuestion "` → `Find Primary Question types` →
`StdQ.FindWhoQuestion`), plus one more for the bot graph (`Login over Web` → `Robot Greeting` → `Name Capture`
→ `Name Parser` → `Name Parser Got Name` = depth 4). The `SwitchContinuations` stack must therefore be a real
stack, not a single slot.

### 5.3 Semantics [spec §11]

- `SwitchTo "T"`:
  1. Resolve `T` case-insensitively. If not found → compile error.
  2. **Cycle guard**: `if (DestCategory->Executed && DestCategory->Priority != SequencePriority) return RunTimeError;`
     — a _non-Sequence_ category already executed this run cannot be switched to again; a Sequence category can be
     re-entered any number of times within one run. `RunTimeError` ends the run **and clears both the
     `SwitchContinuations` and `SequenceContinuations` stacks**.
  3. Push a `CContinuation` (return address = the statement immediately after this `SwitchTo`, in this category,
     inside this block nesting) onto `user.SwitchContinuations`.
  4. Set `runtime.SwitchToCategory = T` and return `Switch`, which terminates the current block and category.
- `SwitchBack` (block terminator): pop the top of `user.SwitchContinuations`, install it as the active
  continuation, and resume execution there. If the stack is empty this is a runtime error.
- **The `SwitchContinuations` stack persists across inputs.** It is only cleared when a `Done` is executed that is
  not resuming an interruption (and `SequenceContinuations` is empty), or on `RunTimeError`.

### 5.4 Worked example: the canonical subroutine `GetYN`

`Mrmind3/Activities/20Questions.n:72-83`, verbatim:

```
Sequence Topic "GetYN" is
	Always
	WaitForResponse;
		IfRecall ?YesResponse,?NoResponse then
		SwitchBack

	Say "This is a yes or no question.  <BR>Please Cooperate.";
	WaitForResponse;
		IfRecall ?YesResponse,?NoResponse then
		SwitchBack
	Continue
EndTopic
```

and its caller, `Mrmind3/Activities/20Questions.n:85-100`:

```
Sequence Topic "20 questions" is
//switch here after getting a positive response to the
//do you want to play 20 questions game.
	Always
		Say "OK, You think of a human <BR>attribute and I'll ask you <BR>20 questions -- You get <BR>to answer YES or NO. <BR> Okay?";
		SwitchTo "GetYN";
		IfRecall ?NoResponse then
			Say "Then, I guess we're done.";
		Done
		Otherwise always
			Remember ?20Questions is "yes";
			Say "Question Number 1:  Do you <BR>possess this attribute?";
			SwitchTo "GetYN";
			IfRecall ?YesResponse then
				Say "Question Number 2: Are you sure?";
				SwitchTo "GetYN";
```

Trace, for turn _n_ (user says something that reaches `SwitchTo "20 questions"`):

1. `20 questions` says the intro, executes `SwitchTo "GetYN"` → push return address, return `Switch`.
2. Run loop selects `GetYN`. It executes `WaitForResponse` → stores `user.Continuation` pointing at the
   `IfRecall` after it, returns `Waiting`. **The run ends. `SwitchContinuations` still holds the return into
   `20 questions`.**
3. Turn _n+1_: Priority categories run, then the pending continuation resumes _inside `GetYN`_. `?YesResponse` is
   set → block terminator `SwitchBack` → pop the return address → resume `20 questions` at the `IfRecall` after
   its first `SwitchTo` → question 1 is asked → `SwitchTo "GetYN"` again.

`GetYN` is entered 21 times over a full game. The cycle guard's Sequence exemption is what makes that legal.

### 5.5 Worked example: a `SwitchTo` from a Priority category that returns days later

`Mrmind3/Utilities/CGoodbye.n:44-69`, verbatim:

```
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

Note `SwitchTo "asksurvey"; Continue` on one line: `SwitchTo` returns `Switch`, so the `Continue` is _not_
reached on the way out. It **is** reached when `AskSurvey` later executes `SwitchBack` — the block then returns
`Continue`, the outer block proceeds to `SayOneOf STD_GoodbyePhrases; Done`. This spans two user inputs.

### 5.6 What happens when a Sequence runs off its end

`ShapeImportance` (`Mrmind3/Humans&Machines/Humans.n:276-287`) has a single `If … Done` and no `SwitchBack`. When
its condition is false it returns `NextCategory`. Per [spec §11], `GetNextCategory` then "simply select[s] the
next category from the CategoryList for the current ActivePriority" — i.e. **selection resumes among the Standard
categories where it left off; it does NOT return to the caller of the `SwitchTo`**. Only `SwitchBack` returns.

The conversation database corroborates this exactly. `Mrmind3/Humans&Machines/Humans.n:259-273`:

```
Topic "Shape" is
Subjects "HumanShape";

	If (?IsStatement Contains ("shape#","form#")and heard ("I","we","I'm","we're")and heard ("human#","person","man","woman")) or
	(?AnyQuestion Contains "have" and heard ("dimension","size","shape","form"))
	or	(?AnyStatement Contains  "have" and heard ("dimension","size","shape","form"))
	Then

		Example "I am of human form";
		SayOneOf "I favor mind over matter.",
		"How important is your <BR>shape to your humanity?",
		"Is your shape important <BR>to your sense of identity <BR>as a human?";
		WaitForResponse;
		SwitchTo "ShapeImportance";
	Done
EndTopic
```

Real transcript rows (CDB connection 1, all four rows share `nINPUT_LINE_ID = 3815`, i.e. **one user input**):

```
3815 USER  I'm shaped like a human
3819 SAY   [Shape]        I favor mind over matter.
3820 SAY   [I am human.]  Convince us.  Show us your humanity.
```

and three turns later, again one input each:

```
SAY [Shape]           How important is your shape to your humanity?
SAY [Generic answers] What do you think?                      <- a Default topic
...
SAY [Shape]           Is your shape important to your sense of identity as a human?
SAY [IHave]           Do all humans have size?
```

In each case `Shape`'s continuation resumed, executed `SwitchTo "ShapeImportance"`, `ShapeImportance` did not
activate, returned `NextCategory`, and selection carried on through the Standard list (and once all the way to
the Defaults). This is the single clearest archive evidence for both the sequence fall-through rule _and_ the
multi-round selection loop of §12.

---

## 6. `Focus`, `Focus Subjects`, `DontFocus`

### 6.1 `Focus` — 7 occurrences (all single-argument)

```ebnf
FocusStmt = "Focus" String { "," String } ";" ;
```

Every one of the 7 in the build:

```
Focus "predictability human or machine?";     Mrmind3/Customization/ProfanityCustomize.n:121
Focus "understanding human or machine?";      Mrmind3/Customization/ProfanityCustomize.n:138
Focus "predictability human or machine?";     Mrmind3/AboutUser/UserMind.n:106
Focus "Humans Are";                           Mrmind3/Humans&Machines/Machines.n:78
Focus "Rhetorical about loving fictional humans.";  Mrmind3/Issues/Emotion.n:259
Focus "Is trust human?";                      Mrmind3/Issues/TrustTruth.n:50
Focus "Is Trust Human?";                      Mrmind3/Issues/TrustTruth.n:74
```

All 7 resolve to a defined category name; note the two spellings of the same target at `TrustTruth.n:50` and
`:74` — another proof of case-insensitive name resolution. **No multi-argument `Focus` occurs anywhere in the
build**, which means the port never has to decide the ordering ambiguity flagged in [spec §21.7]. Implement
single-argument order-preserving semantics (first argument ends up first) and move on.

Semantics: append the named categories to `runtime.FocusList`. They are moved to the front of
`user.AttentionFocus` at the end of the run by `Refocus()`.

### 6.2 `Focus Subjects` — 62 occurrences

```ebnf
FocusSubjectsStmt = "Focus" "Subjects" String { "," String } ";" ;
```

61 are single-argument. **Exactly one is multi-argument**, `Mrmind3/Defaults/Defaults.n:159`:

```
	Ifchance  Then
//do they want hints or suggestions
		Focus Subjects "HELP", "WantSomePointers";
```

Semantics: for each argument, append every category in `subjectMap[lower(arg)]` (in build order) to
`runtime.FocusList`, **and** add the argument to the active-subject set (see §8). The active-subject effect
happens even when no category carries the subject.

**24 of the 62 name a subject that no category declares** — they are focus-list no-ops (but still reset the
active subjects). This is authoring drift, not a language feature; the port must not error:

```
'Paul Valery'                       MMIdentity.n:203      (author meant Focus "Who is Paul Valery?")
'I like conversation.'              WhatIsMM.n:135
'I like poetry'                     WhatIsMM.n:147
"you imagine you're human?"         UserMind.n:250, 258
"you imagine you're not human?"     UserMind.n:254
'Would you find it curious <BR>if a computer were curious?'  UserMind.n:391
'Are you are a cat?'                UserMind.n:395
'Wonder is human, but will it always be exclusively human?'  UserMind.n:402
'Can you type me a tune?'           UserGeneral.n:109
'M TESTE'                           UserFamily.n:50, 56   (a category NAME, not a subject)
'WhatIsHumanAbout'                  Machines.n:51
'How do I know you are human?'      Machines.n:122
'WHAT ARE YOUR CONTRADICTIONS?'     Humans.n:131
'Do machines usually <BR>make you self-conscious?'  Consciousness.n:54
'PAST LIFE'                         Choice.n:70
"Do you feel that way because you're talking to a machine?"  Emotion.n:87
'Have you ever fallen in love with a fictional human?'  Emotion.n:262, 271
'Is a star a fictional human?'      Emotion.n:276
'Do you trust Humans?'              TrustTruth.n:68
'want some help?'                   Annoyance.n:80
'WantSomePointers?'                 Pointers.n:37         (the declared subject is "WantSomePointers", no "?")
```

Note the last one especially: `Focus subjects "WantSomePointers?"` at `Mrmind3/Defaults/Pointers.n:37` misses the
5 categories carrying `wantsomepointers`, while `Focus Subjects "HELP", "WantSomePointers"` at `Defaults.n:159`
hits them. A faithful port reproduces both.

Also note `Focus Subjects` arguments contain `<BR>` and full sentences. Subjects are arbitrary opaque strings.

### 6.3 `DontFocus` — 58 occurrences

```ebnf
DontFocusStmt = "DontFocus" ";" ;
```

**Count correction.** The brief for this document said 32 occurrences. The build contains **58**, and the whole
`Mrmind3/` directory on disk contains **57** (`AboutMrMind/MMIdentity.n:202` is the extra one in the build set
only because `grep` skips that file as binary — it contains a Latin-1 `é`). The 32 figure does not match the
archive under any counting I can reproduce; **58 is the number to implement against.** By file:

```
9  AboutUser/UserFamily.n        5  Issues/TrustTruth.n        3  Issues/RIskGoals.n
7  Issues/Emotion.n              4  Issues/Consciousness.n     2  Humans&Machines/Machines.n
5  AboutUser/UserMind.n          3  Customization/ProfanityCustomize.n  1 each: Activities/20Questions.n,
5  Humans&Machines/Convincing.n  3  AboutUser/UserPhysical.n            AboutMrMind/MMIdentity.n,
                                 3  Humans&Machines/Humans.n            AboutMrMind/MMphysical.n,
                                 3  Issues/Choice.n                     AboutUser/UserGeneral.n,
                                                                        Reactions/Questions.n,
                                                                        Defaults/Pointers.n
```

**What the authors were avoiding.** Three distinct motives, all visible in the source:

**(a) Baton-passing — 37 of 58.** `DontFocus` occurs within ±6 lines of a `Focus` / `Focus Subjects` in 37 cases.
The author wants the _named successor_ at the head of the attention list, not this category. Because auto-focus
appends the current category to `FocusList` **at the end of the category's run** — i.e. after the explicit
`Focus` entries — the current category would otherwise be moved to the front _last_ and end up _ahead_ of the
successor it was trying to hand off to. `DontFocus` is the fix.

```
Topic "I am not a fictional human" is
	...
		Example "I am not a fictional human.";
		DontFocus;
		Focus "Rhetorical about loving fictional humans.";
```

— `Mrmind3/Issues/Emotion.n:257-259`

```
	If (?AnyQuestion contains "Teste" )
	or (Focused and ?WhoQuestion contains "he","that")
	Then
		Example "Who is M TESTE?";
		IfChance then
			Say "I remember a visit with my uncle,<BR> M. Teste. …";
		Done
		IfChance then
			DontFocus;
			Focus Subjects "Paul Valery";
			Say "You can spend an evening with <BR>Monsieur Teste if you track down <BR>Paul Valéry.";
		Done
	Continue
```

— `Mrmind3/AboutMrMind/MMIdentity.n:194-206`. Note: only the **second** `IfChance` branch suppresses focus.

**(b) Dead-end follow-up answers — most of the remaining 21.** A category whose condition is
`Focused and Recall ?YesResponse` fires on a bare "yes". If it auto-focused, it (and its whole subject group)
would sit at the head of attention and the _next_ bare "yes" would hit it again — a conversational loop.

```
Topic "Is Trust human?" is
Subjects "Traits", "Is Trust Human";
	If (Focused and Recall ?YesResponse,?NoResponse,?NotSureResponse )
	or (Heard "I" and "trust*")
	then
		WhenFocused Example "YES.";
		DontFocus;
		Say "Trust is not confined to humans, <BR>machines have no choice but <BR>to trust.";
	Done
Endtopic
```

— `Mrmind3/Issues/TrustTruth.n:82-91`

```
Topic "I do posess qualities that I believe to be unique to humans" is
Subjects"Do you possess any qualities that you believe to be unique to humans?";
	If (?FactStatement contains I+"*"+("posess","have")+"*"+("qualities","traits","attributes")
		and heard HUMAN)
	or (Focused and recall ?YesResponse)
	Then
		DontFocus;
		WhenFocused Example "I sure do";
		SayOneOf "We could discuss some <BR>of those attributes.",
		 "Please tell me about them.";
	Done
EndTopic
```

— `Mrmind3/Humans&Machines/Humans.n:219-230`

**(c) Meta / repair topics that must not disturb context.**

```
Topic "What?" is
Subjects "NULL";
	If ?WhatUserSaid matches "huh,", "What?" , "Say that again"
	Then
		Example "huh?";
		Say "I said: "+?WhatRobotSaid;
		DontFocus;
	Done
EndTopic
```

— `Mrmind3/Reactions/Questions.n:60-68`. `What?` merely re-reads the last bot line; moving it (and the other
`null`-subject category) to the head of attention would corrupt the conversation state.

**Semantics to implement — a per-run latch, not a positional command.**

`DontFocus` occurs both _before_ the `Say` (`Emotion.n:24-27`) and _after_ it (`Questions.n:66`). A naive
"clear the output flag" implementation breaks the first form. Implement:

```
categoryRunState = { executed:false, produced_output:false, dont_focus:false }
on DontFocus            -> dont_focus = true
on any Say/SayOneOf/Do/Show/SayToFile/SayToConsole (Standard category only)
                        -> produced_output = true
at end of category run  -> if (isStandard && produced_output && !dont_focus) autoFocus(category)
```

Both flags are reset at the start of each run of the category (i.e. per input).

Corroboration for "not a command": `strings Mrmind3/MRMIND3.vre` lists `CFocus`, `CFocusSubject`,
`CFocusCondition`, `CSuppress`, `CSwitchTo`, `CSwitchBack`, `CWaitForResponse`, `CInterruptSequence`,
`CTrace`, `CRemember`, `CForget`, `CSay`, `CSayOneOf`, `CSayToFile`, `CDone`, `CContinue`, `CNextCategory`,
`CContinuation`, `CExample`, `CInitialExample`, `CExampleRephrasing`, `CCategory`, `CConditionActionBlock`,
`CChanceCondition`, `CAlwaysCondition`, `CAndCondition`, `COrCondition`, `CPatternMatchCondition`,
`CPropertyCondition`, `CPatListDef`, `CArgElem*`, `CArgList*`, `CAttributeInfo`, `CMemReference`,
`CLoginAction`, `CObjFile`, `CObList` — and **no `CDontFocus`, no `CTryAgain`, no `CMemoryLock`, no
`CRecover`**. `DontFocus` is compiled to a flag; `TryAgain` is compiled to a `CWaitForResponse` variant
(consistent with [spec §11]: "TryAgain is simply a special case of WaitForResponse"); `MemoryLock` is
compile-time only.

Latching and "flag on the enclosing block" are observationally identical over all 58 archive uses (a `DontFocus`
at the top of a block is reached exactly when that block executes, and no `DontFocus` in the build sits after an
unconditional `Done`). Implement the latch; it is simpler and cannot diverge here.

### 6.4 `Suppress` and `Recover`

```ebnf
SuppressStmt = "Suppress" ( "This" | String { "," String } ) ";" ;
RecoverStmt  = "Recover" String { "," String } ";" ;
```

**37 `Suppress`, 0 `Recover`** in the shipped build. Of the 37, **36 are `Suppress This;`** — the special
argument `This` meaning "the category I am in". Only one suppresses by name:

```
		Suppress "Login from Console";
		SwitchTo "Robot Greeting";
	Done
```

— `Mrmind3/Utilities/WebNameGreet.n:857-859` (a web login suppresses the console-login priority topic).

33 of the `Suppress This;` are in `Mrmind3/Defaults/OneShots.n` — that whole file is a bank of one-shot default
prompts that retire themselves after firing once:

```
Default topic "Is that your RealName" is
Subjects "Names";
	IfChance 0.90
	Then
		Say "By the way, is " + ?Name + " <BR>your real name or a special <BR>one just for me?";
		Suppress This;
	Done
EndTopic
```

— `Mrmind3/Defaults/OneShots.n:4-11`

Semantics [spec §11]: suppression is **per user, persists for the rest of the conversation**, and a suppressed
category is not executed at all — "even if an explicit Focus command would purport to move it to the front of the
attention focus list". `Recover "X"` undoes it. `Recover` has zero uses here but exists in the sibling `Base` bot
(`Base/Utilities/EmailCapture.n:160`, `Base/Defaults/Default.n:134` commented out) — implement it for
completeness.

---

## 7. Auto-focus and `Refocus()`

Verbatim [spec §11, from 6,363,301 §III.B]:

> "if the category is a standard category, any output command (currently all variants of "Say" or "Do") will cause
> a flag to be set in the category. If this flag is set at the end of CCategory::Run, the category is appended to
> the end of RunTime->FocusList […] This behavior can be overridden by including the command DontFocus in any of
> the blocks that should not trigger the automatic focus mechanism. Furthermore, if the category is given a list
> of SUBJECTS in the Gerbil script, when the category is focused using automatic focus, all other categories that
> share at least one SUBJECT with said category are also appended to the end of RunTime->FocusList"

and

> "The topic "Mouse Sales" is not a standard topic and therefore is not ever added to RunTime->FocusList."

and — the negative case, which matters:

> "In the seventh topic, "Price of 6SC", the outer IF block is activated because "6SC" was heard, but the inner IF
> block is not activated, so the topic returns NextCategory. Since no statement was executed in the topic other
> than the IF conditions, the flag in the topic indicating activation is not set, and nothing is added to
> FocusList."

**Algorithm.**

```
autoFocus(cat):                       // only Standard categories reach here
    FocusList.append(cat)
    for each subject s of cat, in declaration order:
        for each other category c in subjectMap[s], in build order:
            if c !== cat and c is Standard and c not already appended in this call:
                FocusList.append(c)

Refocus():                            // once, at the very end of the run
    for each entry e of FocusList:
        remove e from user.AttentionFocus
        insert e at position 0 of user.AttentionFocus
```

Because each entry is moved to the _front_, processing `FocusList` front-to-back leaves the **last** entry first.
[spec §11] flags this: the documentation for multi-argument `Focus "dogs","cats"` promises `dogs` before `cats`,
while the described implementation gives the reverse; and the 6,363,301 Example-1 walkthrough (`Focus "Cats"`
inside `CatsOrComputers`) states the result is `Cats, CatsOrComputers, …`, i.e. **first-appended ends up first**.

**Resolution for the port:** iterate `FocusList` **back to front** in `Refocus()`, so that the first thing
appended ends up at the very front. This reproduces both the documented multi-argument `Focus` order and the
worked Example-1 order, and it makes the `DontFocus`-plus-`Focus` idiom of §6.3(a) behave the way the MrMind
authors clearly expected (successor in front, current category behind it — and with `DontFocus`, absent
entirely). Since the build contains no multi-argument bare `Focus`, the only observable consequence is the
relative order of an explicit `Focus` vs. the auto-focus of the same category, which the walkthrough pins down.

**Focusing is deferred.** Nothing moves during execution: "To prevent possible ambiguities in the ordering of
category executions, Focusing actions do not have any effect until the script is finished executing on the
current input." `FocusList` is cleared at the start of every run.

---

## 8. Active subjects and the `Focused` condition

`Focused` occurs **96 times in 77 categories** in the build. `WhenFocused` (an _Example_ modifier, not a
condition) occurs 11 times in 9 categories. Every category that tests `Focused` declares at least one
`Subjects` — there are **zero** categories testing `Focused` without subjects, so the "always false" degenerate
case never arises in this corpus.

Semantics [spec §13.2, from 6,314,410 §IV], verbatim:

> "the Focused condition can only be true in categories that have one or more subjects assigned using the Subjects
> keyword. The Focused condition is true if one or more of the subject keywords associated with the category are
> "active subjects". The set of active subjects is the set of subject keywords associated with the most recent
> input that was processed and resulted in at least one topic associated with a subject being focused, either
> automatically or through a FOCUS command, as well as subject keywords focused using a FOCUS SUBJECTS command.
> All subjects associated with each topic that was focused are included in this set of active subjects. Thus, a
> topic that does not contain any subject keywords does not change the set of active subjects."

> "When one or more categories are activated or focused using a FOCUS command, and at least one of these
> categories is associated with one or more subject keywords, or a FOCUS SUBJECTS command is executed, this map
> is cleared and a new entry is made for each such keyword. When all of the categories that are activated by an
> input are not associated with any keywords, the map m_mspActiveSubjects remains unchanged."

**Algorithm (per run, applied at `Refocus()` time):**

```
newSubjects = union of subjects of every category placed on FocusList this run
            ∪ every literal argument of every Focus Subjects executed this run
if newSubjects is non-empty:
    user.ActiveSubjects = newSubjects        // replace, do not merge
// else: leave user.ActiveSubjects unchanged
```

`Focused` evaluates to true in category `C` iff `|subjects(C) ∩ user.ActiveSubjects| ≥ 1`.

The "leave unchanged when empty" rule is the point of the whole mechanism: a default answer with no subjects (the
26.8% case — §10) does not wipe the conversational context, so the follow-up "yes" still lands on the topic that
asked the question two turns ago.

**Specificity of `Focused`** [spec §13.2]:

> "Focused conditions in the best-fit matching selection structure are given a compile-time specificity of 0, so
> that they are never chosen as activators for categories. At run-time, a Focused condition is assigned a
> specificity of 100 times the number of subjects in common between the category containing it and the currently
> active subjects. Focused conditions are deliberately assigned a low specificity value so that they do not
> interfere with more specific answers to user questions."

and ties between two `Focused` answers "the topic that is nearer the front of the focus of attention will give the
answer. The focus of attention stack itself is unaffected by the Focused mechanism."

So: `specificity(Focused) = 100 × |subjects(C) ∩ ActiveSubjects|` at run time, `0` at compile time (it can never
by itself make a block _active_; it can only raise an otherwise-active block's score). In practice, since a
category has at most 3 subjects, `Focused` contributes 100, 200, or 300 against word specificities in the
thousands — it is a tie-breaker, not a selector.

`WhenFocused` on an `Example` / `OtherExamples` is a _test-harness_ marker, not runtime behaviour
[spec §15]: it means "this example is meant to work when this topic is already the focus", and is verified
starting from the state saved after the topic's plain example.

---

## 9. `WaitForResponse`, `TryAgain`, `InterruptSequence`

### 9.1 `WaitForResponse` — 89 occurrences in 42 categories

By category type: **Standard 40, Sequence 49, Priority 0, Default 0.** It is _not_ confined to Sequence
categories.

```
Sequence  Exit Survey                      Mrmind3/Activities/UserSurvey.n         25
Sequence  Questions for AskMe3             Mrmind3/Defaults/AskMe.n                10
Sequence  20 questions                     Mrmind3/Activities/20Questions.n         4
Standard  Humans Are                       Mrmind3/Humans&Machines/Humans.n         3
Standard  Knock Knock.                     Mrmind3/Issues/Humor.n                   3
Standard  Quit calling me Shirley!         Mrmind3/Utilities/WebNameGreet.n         2 (+1 TryAgain)
Sequence  GetYN                            Mrmind3/Activities/20Questions.n         2 (+2 SwitchBack)
Standard  Stupidity                        Mrmind3/AboutUser/UserMind.n             2
Standard  I'm good at things               Mrmind3/AboutUser/UserGeneral.n          2
Standard  I am in control                  Mrmind3/Issues/Choice.n                  2
Sequence  AnnoyanceTwo                     Mrmind3/Reactions/Annoyance.n            2
Sequence  AnnoyanceThree                   Mrmind3/Reactions/Annoyance.n            2 (+1 TryAgain)
Sequence  Name Capture                     Mrmind3/Utilities/WebNameGreet.n         1 (+3 TryAgain)
Sequence  AskSurvey                        Mrmind3/Utilities/CGoodbye.n             1 (+1 SwitchBack)
… 28 further Standard categories with exactly one WaitForResponse each
```

Semantics: store a `CContinuation` pointing at the statement _after_ the `WaitForResponse` into
`user.Continuation` and return `Waiting`. `Waiting` ends the run immediately — no Standard selection continues,
no Defaults run.

On the next input, after the Priority categories, if `user.Continuation` is non-null it is installed and the run
resumes there — **regardless of specificity and regardless of the category's type**. This is the "topic that
asked a question gets first refusal on the answer" rule, and it is why bare `yes`/`no` works at all.

### 9.2 `TryAgain` — 9 occurrences

A _block terminator_, not a command. Semantics [spec §11]: "simply a special case of WaitForResponse in which the
CContinuation starts from the previous WaitForResponse rather than the TryAgain command." It is an error for a
block ending in `TryAgain` not to contain (lexically dominate) a `WaitForResponse`.

```
4  Mrmind3/Utilities/WebNameGreet.n   ("Name Capture" ×3, "Quit calling me Shirley!" ×1)
3  Mrmind3/Humans&Machines/Machines.n ("Computers don't", "Computers Don't Have", "AreYouTryingToTalkComputer?")
1  Mrmind3/Issues/Life.n              ("DNA")
1  Mrmind3/Reactions/Annoyance.n      ("AnnoyanceThree")
```

Worked example, `Mrmind3/Utilities/WebNameGreet.n:36-51` (the top-firing topic in the whole bot):

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
```

`TryAgain` re-arms the continuation at the statement after `WaitForResponse;` (i.e. at `SwitchTo "Name Parser";`)
and returns `Waiting`. The user is asked again; the parser runs again on the new input.

### 9.3 `InterruptSequence` — 3 occurrences, all in one file

All three are in `Mrmind3/Utilities/WebNameGreet.n` (lines 112, 130, 144), all inside `Sequence Topic
"Name Capture"`, all guarded by `IfRecall ?AnyQuestion`:

```
		If ?NameTries Matches "3" Then
			// if we've already tried once plus the original one, give up.
			Say STDN_RESPONSETOREFUSAL+"  You can change your name later if you want.";
			Remember ?Name is STDN_USERDEFAULTNAME;
			Remember ?LTM.Name is ?Name;
			Remember ?HaveName;
			IfRecall ?AnyQuestion then
				InterruptSequence;
```

— `Mrmind3/Utilities/WebNameGreet.n:105-112`

```
		IfRecall ?NoResponse or heard StdN.Refusals Then
			Say STDN_RESPONSETOREFUSAL;
			Remember ?Name is STDN_USERDEFAULTNAME;
			Remember ?LTM.Name is ?Name;
			Remember ?HaveName;
			IfRecall ?AnyQuestion then
				InterruptSequence;
```

— `Mrmind3/Utilities/WebNameGreet.n:124-130`

```
		If (Recall ?AnyQuestion) and (?String1 matches ?String2) then
		//  This is to keep it from triggering when someone's name spell-corrects to a question-word.
			InterruptSequence;
		Continue

		//for some reason this interruptSequence is not getting greeting topics.
```

— `Mrmind3/Utilities/WebNameGreet.n:142-147` (the author's own comment, preserved: they were not sure it worked)

The intent is clear: _the user answered the name prompt with a question; let the rest of the bot answer it, then
come back to name capture._

Semantics [spec §11]:

> "InterruptSequence […] can only be used within a Sequence category, and causes the execution of the category to
> be suspended while all of the standard and default categories are executed. (InterruptSequence can only be used
> after a WaitForResponse, to prevent possible conflicts in which a category might be executed twice.) It is
> implemented by adding a CContinuation to the top of the SequenceContinuations stack (allowing nested
> interruptions within interruptions) and returning the value NextCategory."

and the resumption rule:

> "if ReturnVal is Done […] execution stops unless there was an InterruptSequence that has not yet been resumed.
> […] if a Done is reached while there is at least one CContinuation in the SequenceContinuations stack, that
> Sequence category is resumed. In the case where there is no SequenceContinuation, the SwitchContinuations stack
> can also be cleared, as there is no possibility of returning from any SwitchTo statements once a Done (that is
> not ending an interruption) is executed."

---

## 10. Evidence from the shipped conversation database

Source: `Mrmind3/MRMIND3CDB.cdb`, exported to `_work/cdb/mrmind3/`. 25 conversations, 11 Dec 2000 – 9 Apr 2001,
NeuroServer 2.1.0. `Topics.csv` has 5,629 rows — **it is not a snapshot of one build**; the topic table is
re-inserted with fresh ids at every rebuild, so it accumulates every revision made during those four months
(files that no longer exist in the shipped build appear, e.g. `StdQuestion.us.n`, `StdDebugger.n`,
`StdResponse.us.n`, `MMbody&gender.n`, `Switches.n`, `NO_FILE.g`). Each row carries `bIS_DEFAULT`,
`bIS_PRIORITY`, `bIS_SCENARIO`, `strFILE_NAME`, `nLINE_OR_ID`, `strSUBJECTS`. Every `nTOPIC_ID` referenced by
`ConversationData.csv` resolves.

`ConversationData.csv` has 26,642 rows. Statement types that matter:

| type             | id  | rows   |
| ---------------- | --- | ------ |
| `USER_SAID`      | 7   | 7,160  |
| `SAY`            | 9   | 7,312  |
| `SAY_TO_CONSOLE` | 10  | 11,109 |
| `SAY_TO_FILE`    | 11  | 590    |
| `USER_DID`       | 8   | 119    |
| `DO`             | 25  | 9      |

`SAY_TO_CONSOLE` is the StdQuestion debug trace (`AnyQuestion: who are you`, `WhoQuestion: you`), attributed to
the debug priority topics. Only type 9 is bot speech to the user. Rows carry `nINPUT_LINE_ID`, the `nLINE_ID` of
the user input that produced them — that is the correct grouping key for "one turn".

### 10.1 Default-topic share — the archive's own figure, reproduced

`Mrmind3/MRMIND3CDB.cdb.report.txt` (generated by NeuroServer itself) says:

```
Percentage of default responses: 25.68%
```

Independently recomputed from the CSV export:

- **1,921 of 7,312 SAY lines (26.27%)** came from a topic flagged `bIS_DEFAULT`.
- **215 of 7,312 (2.94%)** came from a Priority topic.
- Grouping by input: 6,747 of 7,160 user statements got at least one SAY; **1,916 of 7,160 (26.76%)** were
  answered _only_ by default topics.

All three land within 1.1 points of the shipped 25.68%, which validates the join and the type flags. **A port
whose default-fallback rate on the same 7,160 inputs is not in the 25–27% band has the selection logic wrong.**

### 10.2 One topic per turn, almost always

Distinct topics producing SAY lines per answered turn:

| distinct topics | turns |
| --------------- | ----- |
| 1               | 6,380 |
| 2               | 367   |

Mean 1.08 SAY lines and 1.06 distinct topics per answered turn. **94.6% of turns end at the first `Done`.** The
selection loop of §12 is real but rarely iterates.

Grouping strictly by `nINPUT_LINE_ID` (which also catches connection-level actions), 409 inputs produced output
from more than one topic, and the chains are almost entirely `SwitchTo`:

```
384  Robot Greeting[Seq]  >>  Name Capture[Seq]
  9  Tsk Tsk[Pri]         >>  Increment, Warn, and Disconnect[Seq]
  7  AskMe3[Std]          >>  Questions for AskMe3[Seq]
  3  Name Capture[Seq]    >>  Robot Greeting[Seq]
  1  WhatAmIQ[Std]        >>  WhatAmIQ2[Std]
  1  Shape[Std]           >>  I am human.[Std]
  1  Shape[Std]           >>  Generic answers[Default]
  1  Shape[Std]           >>  IHave[Std]
  1  AnnoyanceOne[Seq]    >>  Pointers[Seq]
  1  Knock Knock.[Std]    >>  Is that your RealName[Default]
```

The last five are the only observed instances of genuine multi-round best-fit selection / fall-through (§12) in
2,500-odd turns of real traffic. `Knock Knock.` is explained directly by its source — the `IfChance` block ends
with `Continue`, not `Done` (`Mrmind3/Issues/Humor.n:41-53`):

```
Topic "Knock Knock." is
Subjects "Jokes";
	If ?WhatUserSaid matches "knock knock" then
	Example "Knock Knock";
		Remember ?UserHasClaimedHumor;
		IfChance then
			Say "Who's there?";  //the straight knockknock game.
			WaitForResponse;
			Say ?WhatUserSaid + " who?";
			WaitforResponse;
			SayOneOf "ha ha!","very funny","great.";
		Continue
```

After the punchline the block returns `Continue`, the category runs out and returns `NextCategory`, no `Done`
has been executed, so the Defaults run and `Is that your RealName` fires.

### 10.3 Which topics actually fired

1,094 distinct topic ids ever produced a SAY. Top 40 by SAY count (`D` = default, `P` = priority; `file:line` is
as recorded in the build that was live at the time, which is why some line numbers differ from the shipped
source, and why a name such as `Robot Greeting` appears at several lines):

```
rank  says  D P  file:line              name
   1   685  --  WebNameGreet.n:36       Name Capture
   2   330  D-  Defaults.n:144          Last Line Of Defense
   3   163  D-  Defaults.n:145          Last Line Of Defense
   4   135  D-  Defaults.n:128          Last Line Of Defense
   5   118  D-  Defaults.n:128          Last Line Of Defense
   6   115  D-  Defaults.n:147          Last Line Of Defense
   7   107  --  UserSurvey.n:33         Exit Survey
   8   104  --  WebNameGreet.n:867      Robot Greeting
   9    86  --  WebNameGreet.n:879      Robot Greeting
  10    82  --  UserGeneral.n:1         IHave
  11    78  D-  Defaults.n:147          Last Line Of Defense
  12    77  D-  Defaults.n:129          Last Line Of Defense
  13    70  --  AskMe.n:1               AskMe3
  14    68  D-  Defaults.n:14           No
  15    68  D-  OneShots.n:4            Is that your RealName
  16    58  D-  Defaults.n:149          Last Line Of Defense
  17    56  --  Suggestions.n:4         UserSuggestions
  18    55  -P  WebNameGreet.n:888      STD_Greeting Detect
  19    55  --  WebNameGreet.n:881      Robot Greeting
  20    54  --  20Questions.n:85        20 questions
  21    52  D-  Defaults.n:145          Last Line Of Defense
  22    48  --  Convincing.n:61         How do I convince you I am a human?
  23    48  --  Convincing.n:310        Win/lose
  24    48  --  WebNameGreet.n:884      Robot Greeting
  25    42  --  Emotion.n:9             I am emotional
  26    42  --  UserPhysical.n:1        I do bodyfunctions
  27    41  --  Convincing.n:152        How
  28    40  --  Choice.n:1              I have choice.
  29    39  --  Suggestions.n:18        UserSubmissions
  30    37  D-  Defaults.n:126          Last Line Of Defense
  31    37  --  WebNameGreet.n:877      Robot Greeting
  32    36  --  Convincing.n:95         Yes to Intro
  33    34  --  NameCustomize.n:53      RealName
  34    32  --  Machines.n:22           Computers don't
  35    30  --  WebNameGreet.n:36       Name Capture
  36    30  --  Answers.n:2             CatMischief
  37    29  --  Convincing.n:87         Yes to Intro
  38    26  --  Pointers.n:47           AskAboutPointers
  39    26  D-  Defaults.n:59           I have a whatever
  40    26  --  UserSociety.n:71        Things
```

Reading this correctly matters for the port:

- **`Name Capture` is the single most productive topic (715 SAY lines across two builds ≈ 9.8% of all bot
  speech) and it is a `Sequence` topic that best-fit selection can never choose.** It is reached only via
  `Login over Web`/`Login from Console` → `Robot Greeting` → `Name Capture`, and then re-entered every turn
  through its own continuation and `TryAgain`. A port that treats Sequence topics as an afterthought will
  reproduce almost none of the transcript.
- **`Last Line Of Defense` at seven different line numbers** is one Default topic across seven builds; its
  combined 1,016 SAY lines are the bulk of the 26% default rate.
- **Priority topics almost never speak** (2.94%): the one that does is `STD_Greeting Detect`.

### 10.4 Bare `yes` / `no` — the focus mechanism visible in the data

445 SAY lines answered inputs that were exactly `yes|no|yeah|sure|nope|maybe|yep`. Top resolutions:

```
  46  sure   Yes to Intro                    Convincing.n     S | "Go ahead"
  39  yes    20 questions                    20Questions.n    S | "OK, You think of a human attribute and I'll ask you 20 quest…"
  33  no     No                              Defaults.n       D | "That's interesting."
  32  no     Exit Survey                     UserSurvey.n     S | "Is this something you do often or is it relatively rare?"
  23  yes    Last Line Of Defense            Defaults.n       D | "SIMS do a lot of things humans do.  Maybe you are a SIM."
  20  no     AskMe3                          AskMe.n          S | "Okay, I'll just ask you one of my favorites."
  17  yes    Exit Survey                     UserSurvey.n     S | "Is this the first time you've ever had a conversation with a…"
  17  no     20 questions                    20Questions.n    S | "Then, I guess we're done."
  12  yes    Pointers                        Pointers.n       S | "Tell me how you are different than me."
  10  yes    Computers don't                 Machines.n       S | "What is human about that, as opposed to simply not machineli…"
   8  yes    AnsYesToPictures                icons.n          S | "Which is your favorite?"
   7  yes    Answers YES to WantSomePointers Answers.n        S | "Can you describe how machines are becoming more like humans?"
   6  yes    AnnoyanceThree                  Annoyance.n      S | "Is it an evolutionary advantage to be easily angered by comp…"
   6  no     NO to Machine Companionship     Emotion.n        S | "Would you prefer a human?"
   5  no     I am not a human by choice      Choice.n         S | "If you didn't choose to be human, then how can you say you h…"
   5  no     I have a body.                  UserPhysical.n   S | "Are you sure?  Nothing synthetic, no silicon, nothing mechan…"
```

Three separate mechanisms are visible here and the port must implement all three or bare `yes` will break:

1. **Continuation resume** — `20 questions`, `Exit Survey`, `AskMe3`, `Pointers`, `AnnoyanceThree`: a
   `WaitForResponse` continuation resumes before any Standard selection happens.
2. **`Focused` + `?YesResponse`** — `NO to Machine Companionship`, `I am not a human by choice`,
   `I have a body.`, `Answers YES to WantSomePointers`: the topic's condition is
   `(Focused and recall ?YesResponse)` and it wins because it is near the front of attention.
3. **Default fallback** — `No` (`Defaults.n:14`) and `Last Line Of Defense`: nothing was focused and nothing
   matched, so the bare `yes` gets a generic reply (23 times).

### 10.5 Surprising selections worth keeping as regression fixtures

- **`Shape` answering, then `Generic answers` (a Default) answering the same input** (§5.6) — proof that a
  Standard category can produce output and _still_ fall through to the Defaults, because it never reached a
  `Done`. Most implementations get this wrong by treating "said something" as "handled".
- **`I'm going to France.` (`Mrmind3/AboutUser/UserSociety.n:216`) answering `I'm going dancing`** with
  "Are you going by FedEx or modem?" — pure word-level over-matching, no focus involved.
- **`Last Line Of Defense` answering a bare `yes` 23 times** while a specific topic answered it 39 other times —
  the difference is entirely whether a continuation or an active subject existed. This is the sharpest
  discriminator of a correct focus implementation.
- **`Why default`** (`Mrmind3/Defaults/Defaults.n:98-107`) is guarded by `?LastTopic`:

  ```
  	If (((?ReasonQuestion Contains "why" )
  	or (?AnyQuestion Contains "why")
  	or (Heard "Why?"))
  	AND (?LastTopic DoesNotMatch "I am lonely", "Why do you think whatever","why should I convince you I am a human?"))
  ```

  `?LastTopic` (27 uses across 26 categories) is a system attribute holding the **name of the last executed
  topic**. The port must maintain it, and must set it to the name as written in the source.

---

## 11. THE RUN LOOP — normative

This is the algorithm the port must implement. Steps are numbered; the numbering is the contract.

### 11.0 State

**Program (shared, immutable after load):**

```
PriorityCategories  : Category[]   // build order
StandardCategories  : Category[]   // build order — the template for a new user's AttentionFocus
DefaultCategories   : Category[]   // build order
SequenceCategories  : Category[]   // build order (never iterated; addressed by name)
categoriesByName    : Map<lowercased name, Category>
subjectMap          : Map<lowercased subject, Category[] in build order>
attributeSpecificity: Map<?attr, int>   // from `Attribute ?X Specificity N;`  (default 2000)
wordSpecificity     : Map<word, int>    // derived from all Example statements, see §12.2
```

**Per user (persists across inputs, persists across the whole conversation):**

```
memory              : Map<?attr, string[]>
AttentionFocus      : Category[]        // this user's mutable ordering of StandardCategories
SuppressList        : Set<Category>
Continuation        : Continuation|null // non-null iff a WaitForResponse is outstanding
SwitchContinuations : Continuation[]    // stack; one frame per SwitchTo awaiting a SwitchBack
SequenceContinuations: Continuation[]   // stack; one frame per unresumed InterruptSequence
ActiveSubjects      : Set<string>       // lowercased
Replacements        : Map<pronoun, word>// SubjectInfo pronoun replacement
LastTopic           : string            // -> ?LastTopic
```

**Per run (cleared at the top of every run):**

```
FocusList           : Category[]        // append-only; consumed by Refocus()
FocusSubjectsSeen   : Set<string>       // literal args of every Focus Subjects executed this run
ActivePriority      : 'Priority'|'Standard'|'Default'
ActiveCatPos        : int               // cursor into the Standard phase
SwitchToCategory    : Category|null
Continuation        : Continuation|null // the frame being resumed right now
outputBuffer        : string[]
```

**Per category, per run:** `Executed:bool`, `ProducedOutput:bool`, `DontFocus:bool` — all reset at step 1.

A `Continuation` identifies a category plus a resume point inside it (block path + statement index), sufficient
to restart `Category.run()` in the middle.

### 11.1 The loop

```
run(input, executionType /* Statement | Action */):

 1. For every category in Priority ∪ Standard ∪ Default ∪ Sequence:
        Executed = false; ProducedOutput = false; DontFocus = false
    FocusList = []; FocusSubjectsSeen = ∅; outputBuffer = []
    SwitchToCategory = null; runtime.Continuation = null
    ActivePriority = 'Priority'; ActiveCatPos = 0
    Set the input attributes (?WhatUserSaid / ?WhatUserDid, etc.)

 2. ReturnVal = NextCategory
    ActiveCategory = getNextCategory(ReturnVal)
    while ActiveCategory != null:
        ActiveCategory.Executed = true
        ReturnVal = ActiveCategory.run()          // see 11.2
        ActiveCategory = getNextCategory(ReturnVal)

 3. flush outputBuffer to the user
 4. Refocus()                                     // see §7
 5. Update ActiveSubjects                         // see §8
 6. Set user.LastTopic = name of the last category that produced output
```

### 11.2 `Category.run()`

```
Category.run():
    blocks = this.blocks
    i = (runtime.Continuation targets this category) ? continuation.blockIndex : 0
    while i < blocks.length:
        r = blocks[i].run()                        // resuming mid-block if a continuation says so
        if r in { NextCategory, Switch, SwitchBack, Waiting, Done, RunTimeError }:
            goto finish with r
        if r == NotActivated:
            i = i + 1 ; continue
        if r == Continue:
            // pick the next block, with two skip rules:
            //  (a) skip an immediately following `Otherwise` block
            //  (b) if this block and the next are BOTH argument-less IfChance blocks,
            //      skip this whole run of argument-less IfChance blocks
            i = nextBlockAfterContinue(i) ; continue
    r = NextCategory                               // ran off the end
  finish:
    if this.type == Standard and this.ProducedOutput and not this.DontFocus:
        autoFocus(this)                            // §7
    return r
```

`Done`, `Continue`, `NextTopic`/`NextScenario`, `TryAgain`, `SwitchBack` are implemented as commands that do
nothing but return the corresponding `CABlockEnd`. `NextTopic` returns `NextCategory` (abandon the rest of this
category). Verbatim [spec §3, 6,604,090:2926-2965]:

> "If a block returns the value NextCategory, Switch, SwitchBack, Waiting, Done, or RunTimeError, execution of the
> CCategory stops and the return value is passed on. If a block returns NotActivated, the next block is executed.
> If a block returns Continue, the next block is activated unless it is an Otherwise block or unless both the
> current and next blocks are IfChance blocks, in which case it and all other IfChance blocks immediately
> following it are skipped. If the last block in the category returns Continue or NotActivated, execution of the
> category is complete and the value NextCategory is returned."

### 11.3 `getNextCategory(ReturnVal)` — the phase machine

```
getNextCategory(ReturnVal):

  case ReturnVal == RunTimeError:
      user.SwitchContinuations = []
      user.SequenceContinuations = []
      return null                                  // run over

  case ReturnVal == Waiting:
      return null                                  // run over; user.Continuation is armed

  case ReturnVal == Switch:
      target = SwitchToCategory
      if target.type == Standard: ActiveCatPos = index of target in AttentionFocus
      return target

  case ReturnVal == SwitchBack:
      frame = user.SwitchContinuations.pop()        // error if empty
      runtime.Continuation = frame
      return frame.category

  case ReturnVal == Done:
      if user.SequenceContinuations is non-empty:
          frame = user.SequenceContinuations.pop()   // resume the interrupted Sequence
          runtime.Continuation = frame
          return frame.category
      user.SwitchContinuations = []                 // no way back now
      return null                                   // run over

  case ReturnVal == NextCategory:
      // advance within the current phase, moving to the next phase when exhausted
      loop:
        if ActivePriority == 'Priority':
            c = next unexecuted, unsuppressed Priority category in build order
                (matching executionType: Topic for statements, Scenario for actions)
            if c: return c
            // Priority phase exhausted -> the pending WaitForResponse continuation, if any
            ActivePriority = 'Standard'; ActiveCatPos = 0
            if user.Continuation != null:
                frame = user.Continuation ; user.Continuation = null
                runtime.Continuation = frame
                if frame.category.type == Standard:
                    ActiveCatPos = index of frame.category in AttentionFocus
                return frame.category
            continue loop

        if ActivePriority == 'Standard':
            c = selectBestFit()                     // §12 — returns null if no active category remains
            if c: return c
            ActivePriority = 'Default'
            continue loop

        if ActivePriority == 'Default':
            c = next unexecuted, unsuppressed Default category in build order
            if c: return c
            return null                             // run over, nothing said
```

Key points, each backed by a quotation in [spec §11]:

- **Priority first, in build order.** "These priority categories are processed […] in the order in which they
  appear in the runtime executive."
- **A `Done` in a Priority category ends the run before the continuation is resumed.** "Since this topic returns
  Done, CProgram::Run sets ReturnVal to Done, and the CContinuation of "Mouse Sales" is not copied into
  RunTime->Continuation and thus not executed on this run."
- **The pending `WaitForResponse` continuation runs immediately after the Priority phase**, before any Standard
  selection, whatever its specificity would have been. "If there is an active CContinuation remaining from a
  previous execution (due to a WaitForResponse), it is activated immediately after the Priority categories."
- **Defaults run only when no `Done` has been reached.** "If at any step of this process (including the first
  step), no new categories are generated and a Done has not yet been executed, execution switches to the Default
  categories and proceeds in the standard manner."
- **A category is never executed twice in one run** (the `Executed` flag), except a Sequence category reached by
  `SwitchTo`.

### 11.4 Suppression, `Executed`, and eligibility

A category is **eligible** in a phase iff: it is of that phase's type; `!Executed`; not in `user.SuppressList`;
and its kind matches the execution type (`Topic` for `USER_SAID`, `Scenario` for `USER_DID`). Suppressed
categories are skipped everywhere, including as `Focus` targets and as best-fit candidates.

---

## 12. BEST-FIT RESPONSE SELECTION — normative

Applies **only to the Standard phase**. Priority, Default and Sequence categories are never selected this way
[spec §14.1]: "Priority and Default categories allow the BOT author to implement initial filters and default
handlers […] The mechanism for automatic response selection functions on all other categories in the BOT script."

### 12.1 The selection loop

Verbatim [spec §14.1, from 6,604,090 §IV]:

> "In response to an input, we consider a category "activated" if one or more base-level statements (i.e.
> statements other than IF conditionals) would be executed if the category were executed. […] At run-time, this
> structure is used to generate a list of all activated categories and to assign a numerical measure of
> appropriateness ("specificity") to each category. The category with the highest appropriateness value is
> executed; in the current implementation, ties are broken according to some selection function, such as the
> aforementioned Focus mechanisms. If this category executes a Done statement, execution is complete, else the
> process is repeated, excluding any already-executed categories, and a new category is chosen. If at any step of
> this process (including the first step), no new categories are generated and a Done has not yet been executed,
> execution switches to the Default categories and proceeds in the standard manner."

and, at block granularity [spec §14.1, 6,604,090:4238-4249]:

> "Once the specificity value for each active block has been computed, the activation mechanism simply selects
> the block with the highest specificity value for execution, breaking ties according to the Focus of Attention
> mechanism […] The category containing this block is then executed in the usual way."

Note carefully: selection scores **blocks**, but executes the **whole containing category from its first block**.
The selected block is not jumped to.

```
selectBestFit():
  1. candidates = []
     for each category C in user.AttentionFocus, in current order:      // front = most recently focused
         if C.Executed or C in user.SuppressList: continue
         for each base-level block B in C (see 12.4):
             if isActive(B):                                             // see 12.3
                 candidates.push({ category: C, block: B,
                                   spec: specificity(B),
                                   focusRank: index of C in AttentionFocus })
  2. if candidates is empty: return null
  3. sort by: spec DESC, then focusRank ASC, then block order within the category ASC
  4. return candidates[0].category
```

Step 3's second key is the whole point of the attention-focus list: **ties are broken by position in
`user.AttentionFocus`, nearest the front wins.** The build order is only the _initial_ order; from then on it is
whatever `Refocus()` has made it.

The loop is driven from `getNextCategory`: `selectBestFit()` is called again after each Standard category that
returns `NextCategory` or `Continue`, with the executed category now excluded via `Executed`. It stops when a
`Done` (or `Waiting`, `Switch`, `RunTimeError`) is returned, or when no candidates remain — at which point the
Default phase begins.

### 12.2 The specificity measure

Verbatim [spec §14.2]:

> "This measure, known as "specificity", is based on log(1/f) where f is the estimated likelihood, over all
> expected inputs to the system, that a condition is true for any particular input. In the present implementation,
> specificity is multiplied by 1000 to allow the computations to be done using integers."

> "base-level Recall conditions (conditions that test whether a boolean attribute is set for the given user
> record) are arbitrarily assigned a frequency of 0.25 […] while base-level matching conditions are assigned a
> frequency based on the frequency of words in the Example statements found in the BOT script, since these Example
> statements are intended to represent a reasonable sample of the inputs that the BOT script is expected to
> handle."

> "If a matching condition is testing an input for a particular word, the frequency of that condition is the
> frequency of that word within the set of Examples. If it is testing an input for a partial word (such as a word
> beginning with the string "develop"), the frequency is the combined frequency of all words in the set of Example
> that match the partial word. If it is testing an input for a string of words, the frequency is the product of
> the frequencies of the individual words".

So, per base-level element:

| element                                                          | specificity                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| a literal word `w`                                               | `round(1000 · ln(1 / freq(w)))` where `freq` is over the Example corpus          |
| a partial word `develop#`                                        | as above with `freq` = summed frequency of all Example words matching the prefix |
| a multi-word string                                              | sum of the individual word specificities (product of frequencies → sum of logs)  |
| `*` wildcard                                                     | **0**                                                                            |
| a space                                                          | **0**                                                                            |
| `IfRecall ?X` / `Recall ?X`                                      | `attributeSpecificity[?X]`, default **2000**                                     |
| `Focused`                                                        | **0** at compile time; **`100 ×                                                  | subjects(C) ∩ ActiveSubjects | `** at run time |
| a negated condition (`NotHeard`, `DoesNotContain`, `DontRecall`) | a fixed constant (see 12.6)                                                      |
| an optional element/condition that is false                      | **0**                                                                            |
| an optional element/condition that is true                       | its normal specificity                                                           |

The Example corpus is the source of `freq`. The build contains **553 `Example` statements**, **182
`OtherExamples`** and **2 `InitialExample`** statements — that is the word-frequency corpus a faithful port must
build. `Example ""` (empty string) occurs and contributes nothing.

Registered-attribute specificities are declared in `Library/StdQuestion/combis/QuesResDebug.us.n:20-56` and are
part of the shipped build. Verbatim (a representative slice):

```
Attribute ?CanQuestion            Specificity 3000;
Attribute ?DescriptionQuestion    Specificity 3000;
Attribute ?FactQuestion           Specificity 3000;
Attribute ?WhoQuestion            Specificity 5000;
Attribute ?AnyQuestion 			  Specificity 2500;
Attribute ?ObtainQuestion 		Specificity 5500;
Attribute ?CostQuestion 		Specificity 6000;
Attribute ?DoHaveQuestion 		Specificity 7000;
Attribute ?FollowUpQuestion		Specificity 8000;
Attribute ?MessageStatement			Specificity 3400;
Attribute ?IsStatement				Specificity 2800;
Attribute ?OtherStatement           Specificity 1950;
Attribute ?AnyStatement             Specificity 2200;
```

The ranking these encode _is_ the bot's answer-preference policy: a `?WhoQuestion` beats an `?AnyQuestion`
by 2500 points before a single content word is counted, `?OtherStatement` (1950) is the weakest thing that can
still win, and `?FollowUpQuestion` (8000) outranks everything.

### 12.3 Combining conditions

Verbatim [spec §14.3]:

> "The specificity of a disjunction of one or more conditions is equal to the highest specificity values from
> among the true children, while the specificity of a conjunction of one or more conditions is equal to the sum
> of the specificity values of all children, reduced by a fixed constant (currently 1000) for each child beyond
> the first, reflecting the fact that conditions tested together tend to be correlated."

> "The matching of a PatternList has the specificity of the most specific element of the list that actually
> matched the input, while the specificity of an optional element or condition is zero if it is not true, and its
> normal specificity if it is."

> "If there is more than one path for the given input (either because there is an optional element that was found,
> or because two or more elements of a PatternList were found), the highest specificity value is chosen."

Formally, for a condition tree over an input:

```
spec(literalWord w)      = wordSpec(w)
spec(wildcard * , space) = 0
spec(concat e1..en)      = Σ spec(ei)                          // a pattern is a concatenation of arcs
spec(patternList L)      = max over elements of L that matched
spec(optional e)         = e matched ? spec(e) : 0
spec(OR  c1..cn)         = max over the ci that are TRUE
spec(AND c1..cn)         = ( Σ spec(ci) ) − 1000 · (n − 1)
spec(NOT c)              = NEGATED_CONSTANT                    // see 12.6
spec(Recall ?X)          = attributeSpecificity(?X)  (default 2000)
spec(Focused)            = 100 · |subjects(C) ∩ ActiveSubjects|
spec(Chance / IfChance)  = 0                                   // see 12.6
spec(block B)            = spec(B.condition)                   // a MatcherBlock is scored as a conjunction
                                                               // of its conditions
```

Worked numbers from the patent [spec §14.4], with the stated assumed word specificities
(`you 3000, bot 4000, virtual 8000, robot 8000, sales 6000, complex 8000, cost 6000, expensive 8000,
NeuroStudio 8000`, `Recall = 2000`):

- `"Are you a bot"` matched by `*you*` + `BOTS` + `*` → **7000** (`you` 3000 + `bot` 4000; the two `*` and the
  spaces contribute 0).
- `"Are you a sales bot?"` matched by `*you*sales bot*` → **13000**, beating the previous pattern's 7000.
- `"Are you a complex virtual robot"` against a pattern with an optional `{BOTS}` element: two NFA paths give
  11000 (optional absent) and 27000 (`you`+`complex`+`virtual`+`robot`); **max wins → 27000**.
- `IfHeard "you" and ((Recall ?FactQuestion and Heard "expensive") or (Recall ?DescriptionQuestion and Heard "cost"))`
  on a `?DescriptionQuestion` input "Can you tell me the cost of NeuroStudio?":
  inner AND = 6000 + 2000 − 1000 = **7000**; OR = 7000; outer AND with `"you"` = 7000 + 3000 − 1000 = **9000**.
- `IfHeard "cost" and "NeuroStudio"` plus a Recall: (8000 + 6000 − 1000) = 13000, + 2000 − 1000 = **14000** →
  this block wins.

And from the verification report [spec §15], real integers of this scale appear:
`### Best answer had specificity value 3753` / `>>>Selecting: Category 'Where Walter works' (Specificity 3169)`.

### 12.4 What a "base-level block" is, and which blocks are eligible

> "we consider a category "activated" if one or more base-level statements (i.e. statements other than IF
> conditionals) would be executed if the category were executed."

A **base-level block** is a `ConditionActionBlock` whose body contains at least one **non-`If` statement** — a
`Say`, `SayOneOf`, `Do`, `Show`, `SayToFile`, `SayToConsole`, `Remember`, `Forget`, `Focus`, `Focus Subjects`,
`DontFocus`, `SwitchTo`, `Suppress`, `Recover`, `WaitForResponse`, `InterruptSequence`, `Example`, `Trace`, …
Blocks whose body consists only of nested `If` blocks are _routers_; they are not themselves activators, and only
their innermost statement-bearing descendants are.

A base-level block `B` in category `C` is **eligible as an activator** iff:

1. `C.type == Standard` (Priority/Default run unconditionally; Sequence is unreachable except by `SwitchTo`);
2. `C` is not suppressed and `!C.Executed`;
3. every enclosing condition of `B` **and** `B`'s own condition evaluates true on this input.

Two important qualifiers from [spec §14.5 and §21.9]:

- **Run-time-only conditions do not participate in activation.** "Conditions whose LHS is not an attribute or
  whose RHS is not a fixed pattern (e.g. tests on `*1`) are 'run-time conditions' evaluated only when the
  enclosing block is otherwise active." Score them as if true (contributing 0) at selection time, and evaluate
  them for real during execution. `Mrmind3/Issues/Emotion.n:32` (`if *match matches EMOTE then`) is exactly this
  case.
- **`Chance` / `IfChance` is treated as true for selection with specificity 0**, and rolled for real during
  execution. Otherwise `Last Line Of Defense` — a pure `IfChance` cascade — could never be reached.

`Always` is a condition that is unconditionally true with specificity 0.

### 12.5 Tie-breaking, exactly

When two candidates have equal `spec`:

1. **Attention-focus order.** The category nearer the front of `user.AttentionFocus` wins. From the 1997
   walkthrough [spec §12]: "(Note that the topics "Price of XV17" and "Price of 5SG" would also be activated by
   the same input, but since they are lower on the attention stack, they are not executed at this time.)"
2. If both blocks are in the **same** category (which cannot happen, since selection returns the category), the
   category's own top-to-bottom block order decides which block runs first — this is just normal category
   execution, not selection.
3. If two _different_ categories are tied on specificity **and** somehow on focus position, use build order.
   (Cannot occur: `AttentionFocus` is a permutation of the Standard categories, so positions are unique.)

For `Focused` ties specifically [spec §13.2]: "the topic that is nearer the front of the focus of attention will
give the answer. The focus of attention stack itself is unaffected by the Focused mechanism." — i.e. **evaluating
`Focused` does not reorder anything**; only executing a category that produces output does.

### 12.6 Constants and defaults, collected

| constant                           | value                                | source                            |
| ---------------------------------- | ------------------------------------ | --------------------------------- |
| specificity scale                  | ×1000 (integers)                     | [spec §14.2]                      |
| `Recall` default frequency         | 0.25                                 | [spec §14.2]                      |
| unregistered attribute specificity | **2000**                             | [spec §14.2]                      |
| conjunction penalty                | **−1000 per child beyond the first** | [spec §14.3]                      |
| `Focused` compile-time specificity | **0**                                | [spec §13.2]                      |
| `Focused` run-time specificity     | **100 × shared subjects**            | [spec §13.2]                      |
| `*`, space                         | **0**                                | [spec §14.3]                      |
| false optional element             | **0**                                | [spec §14.3]                      |
| negated condition                  | fixed constant, **value not stated** | [spec §14.3] — see §14 unresolved |
| `IfChance` at selection time       | true, **0**                          | inferred; see §14 unresolved      |

---

## 13. Edge cases the port must handle

1. **Case-insensitivity, everywhere.** Keywords (`Sequence topic`, `SeQuence topic`, `Endtopic`, `Ifchance`),
   category names in `SwitchTo`/`Focus`/`Suppress` (`"asksurvey"` → `"AskSurvey"`), subjects (`"ME"` = `"me"`),
   and file paths in the manifest (`customization\` vs `Customization\`).
2. **Latin-1 source bytes.** `Mrmind3/AboutMrMind/MMIdentity.n:204` contains `Val\xE9ry`. Never decode as UTF-8.
3. **Zero-length and whitespace-only `.n` files exist** (`picutres.n`, `MMfamily.n`, `Switches.n`) but none of
   them is in the build. Report, do not load, do not fail.
4. **`Subjects "ME,AGE";`** — a single opaque subject containing a comma, not two subjects
   (`Mrmind3/AboutMrMind/MMIdentity.n:82`, confirmed as `[me,age]` in `Topics.csv`).
5. **`Focus Subjects` naming a non-existent subject** — 24 of 62 do. No focus effect; **still resets
   `ActiveSubjects`**. Never an error.
6. **`Focus Subjects "M TESTE"`** (`Mrmind3/AboutUser/UserFamily.n:50, 56`) names a _category_, not a subject.
   Do not "helpfully" fall back to category lookup — reproduce the miss.
7. **Trailing space in a category name**: `Priority Topic "FindQuestion "`.
8. **`DontFocus` before or after the `Say`** — both occur; implement as a per-run latch (§6.3).
9. **Two `DontFocus` in one category at different nesting levels** (`Mrmind3/Issues/Emotion.n:24` and `:26`) —
   harmless with the latch.
10. **`SwitchTo` from a Priority category, `SwitchBack` returning two inputs later**
    (`Mrmind3/Utilities/CGoodbye.n:48`). `SwitchContinuations` survives `Waiting`.
11. **Re-entering the same Sequence category 21 times** (`20 questions` → `GetYN`). The cycle guard exempts
    Sequence categories only.
12. **`SwitchTo` a non-Sequence category already executed this run → `RunTimeError`**, which clears both
    continuation stacks and ends the run silently.
13. **A Sequence category that runs off its end returns `NextCategory`, not to its caller** — Standard selection
    resumes. Verified against the CDB (§5.6).
14. **A Standard category can produce output and still fall through to the Defaults** if it never reaches a
    `Done` (`Shape` → `Generic answers`; `Knock Knock.` → `Is that your RealName`).
15. **`Done` inside a Priority category cancels the pending `WaitForResponse` continuation for that run** — the
    continuation is _not_ consumed, it stays armed for the next input.
16. **Defaults never auto-focus and, when subject-less, never change `ActiveSubjects`.** 33 of the 38 Defaults
    have no `Subjects` — this is what makes `Focused` survive a fallback turn.
17. **A run of bare `IfChance` blocks is one uniform random choice**, and once one fires the rest of the run is
    skipped even on `Continue` (`Last Line Of Defense`, `Mrmind3/Defaults/Defaults.n:144`ff).
18. **`Suppress This;`** — the literal argument `This` means the enclosing category. 36 of 37 uses.
19. **`Recover` has zero uses in the shipped build** but must exist (`Base/Utilities/EmailCapture.n:160`).
20. **`Suppressed` in a category header has zero uses** in the shipped build. Parse it anyway.
21. **`MemoryLock` is a no-op at run time.** Parse and ignore.
22. **`?LastTopic`** must be maintained; `Mrmind3/Defaults/Defaults.n:102` reads it to stop a default from
    stepping on three specific topics.
23. **Scenario vs Topic channel.** `Scenario` categories are matched against `?WhatUserDid`, and only on action
    inputs. There are exactly three, all Priority.
24. **`Example ""`** (empty argument) occurs, e.g. `Mrmind3/Defaults/Answers.n:195`. Contributes nothing to the
    word-frequency corpus; do not divide by zero.

---

## 14. Contradictions and unresolved points

### 14.1 Where the archive contradicts the brief or the patents

- **`DontFocus` count.** The task brief says 32 occurrences. The archive has **58** in the build (57 in
  `Mrmind3/` on disk; the discrepancy with a naive `grep` is the Latin-1 file `MMIdentity.n`). Prefer 58.
- **`DontFocus` is not a runtime command object.** [spec §11] calls it "the command DontFocus". The compiled
  `MRMIND3.vre` contains `CFocus`, `CFocusSubject`, `CSuppress`, `CInterruptSequence`, `CSwitchTo`,
  `CSwitchBack`, `CWaitForResponse` — but **no `CDontFocus`**, and likewise no `CTryAgain` and no
  `CMemoryLock`. Prefer the archive: `DontFocus` compiles to a flag, `TryAgain` compiles to a `CWaitForResponse`
  variant, `MemoryLock` is compile-time only. The observable behaviour of the latch implementation in §6.3 is
  identical either way over all 58 archive uses.
- **`Refocus()` iteration order.** [spec §11] describes an implementation ("removing it from its previous
  position […] and placing it at the front") that reverses `FocusList`, while the same document's worked example
  and the `Focus "dogs","cats"` doc comment both require first-appended-ends-up-first. The archive's
  `DontFocus`-plus-`Focus` idiom (§6.3a) only makes sense under first-appended-first. Implement `Refocus()`
  back-to-front. Flagged in [spec §21.7] as unsettled; the archive breaks the tie.
- **`Scenario` categories.** [spec §21.11] says they are never illustrated in the patents. The archive
  illustrates them three times (§2.5) and settles that they test `?WhatUserDid`.
- **Multi-argument `Focus`.** [spec §21.7] treats the ordering as an open question. The archive contains **no**
  multi-argument bare `Focus`, so the question is moot for MrMind3.
- **`Topics.csv` line numbers do not match the shipped source.** The CDB accumulates topic tables across every
  rebuild between Dec 2000 and Apr 2001. Use it for _behavioural_ statistics (which names fired, default share,
  turn shapes), never as a source-line index into the shipped files.

### 14.2 Unresolved — evidence and hypotheses, clearly labelled

1. **The specificity of a negated condition.** [spec §14.3] says "Negated conditions have a fixed specificity,
   although they could be assigned a specificity value based on 1 minus the frequency of the unnegated
   condition." The constant is never given. _Hypothesis (unverified):_ it is small and constant, plausibly 0 or
   the conjunction penalty 1000; MrMind3 uses `NotHeard` heavily as a guard rather than a discriminator
   (`Mrmind3/Issues/Emotion.n:17-18` has two `notheard` clauses guarding a six-way `or`), so a value of 0 would
   leave the observed rankings unchanged. Make it a tunable constant, default 0, and calibrate against the
   `Example` verification corpus.
2. **`IfChance` at selection time.** _Hypothesis (unverified, but forced):_ an `IfChance` block must be treated
   as active with specificity 0 during selection and rolled during execution, otherwise `Last Line Of Defense`
   and the 33 `IfChance`-gated one-shots in `OneShots.n` could never be reached — and the CDB shows them
   reaching, 1,016 and 68 times respectively. What happens when the roll _fails_ after the category has been
   selected is not stated: the block returns `NotActivated`, the category runs its remaining blocks and returns
   `NextCategory`, and selection continues. That is the behaviour I would implement.
3. **The exact word-frequency corpus.** [spec §21.5] flags this: whether _library_ `Example` statements count
   alongside bot `Example`s, whether `OtherExamples` count, how `#`-prefix frequencies are aggregated, and
   whether NeuroServer shipped a base word-frequency dictionary. The build has 553 `Example` + 182
   `OtherExamples` + 2 `InitialExample`. _Hypothesis:_ all `Example` and `OtherExamples` strings from every
   loaded file, tokenised the same way as input, are the corpus; a word absent from the corpus gets the maximum
   specificity (treat `freq` as `1/N`). This is testable: the patent's verification report gives two real values
   (3753 and 3169) for a known two-topic script, and MrMind3's own `Example` corpus plus the shipped
   `Attribute … Specificity` declarations should reproduce the observed answer ordering on the 7,160 recorded
   inputs. Use that as the calibration harness.
4. **Which categories the loop excludes on `NextTopic` vs `Continue`.** [spec §21.6]. The `Executed` flag makes
   both cases identical in my reading (the category is excluded either way), and the CDB's five multi-round
   turns are consistent with that. I have found no archive case that distinguishes them.
5. **Continuation resumption when the pending continuation is in a _Standard_ category.** [spec §21.10] flags
   that it is activated "immediately after the Priority categories" regardless of specificity. The archive has
   40 `WaitForResponse` in Standard categories, so this path is exercised constantly (e.g. `Shape`,
   `Knock Knock.`, `Humans Are`), and the CDB transcripts are consistent with unconditional resumption. But
   whether `ActiveCatPos` is then set from the resumed category's focus position — which would make selection
   _continue from there_ rather than from the front — is not stated. _Hypothesis:_ it is set, by symmetry with
   the documented `Switch` case ("if the target category is a Standard category, RunTime->ActiveCatPos is set as
   well"). The five observed multi-round turns are too few to discriminate.
6. **`InterruptSequence` correctness.** The MrMind author's own comment at
   `Mrmind3/Utilities/WebNameGreet.n:147` — "for some reason this interruptSequence is not getting greeting
   topics" — records that the construct did not behave as they expected in NeuroServer 2.1/2.2. Only 3 uses, all
   in one category. A port should implement the documented semantics and accept that this specific interaction
   may not be reproducible; there is no transcript in the CDB that isolates it.
7. **Whether `Focus` on a _suppressed_ category has any effect.** [spec §11] says suppression wins ("even if an
   explicit Focus command would purport to move it to the front"). Not exercised in MrMind3 — the one
   `Suppress`-by-name target (`Login from Console`) is never a `Focus` target. Implement suppression-wins.

---

## Appendix A — full normalised subject census

Format: `count | normalised subject | verbatim spellings (only when more than one occurs)`.
196 distinct subjects over 570 categories, 819 subject slots.

```
 61 | me                | ME, me
 47 | default answers   |
 43 | user              | USER, User
 24 | alife             |
 20 | convince          | CONVINCE, Convince
 16 | asides            | ASIDES, Asides
 16 | emotions          |
 15 | none              | NONE, None, none
 14 | identity          |
 14 | society           | SOCIETY, Society
 13 | faith             |
 12 | thinking          | THINKING, Thinking
 11 | choice            |
 11 | freewill          |
 11 | purpose           | PURPOSE, Purpose
 10 | are you human?    |
 10 | family            | FAMILY, Family
 10 | friends           | FRIENDS, Friends
  9 | names             | NAMES, Names
  9 | other bots        | Other Bots, Other bots
  9 | truth             |
  8 | body              | BODY, Body, body
  8 | consciousness     | CONSCIOUSNESS, Consciousness
  8 | intelligence      |
  8 | praise            |
  7 | comments          |
  7 | icons             |
  7 | love              |
  7 | mischief          | MISCHIEF, Mischief
  6 | gender            | GENDER, Gender
  6 | humanity          | HUMANITY, Humanity, humanity
  6 | paranoia          | PARANOIA, Paranoia
  6 | profanity         | PROFANITY, Profanity
  5 | bodyparts         |
  5 | contradictions?   |
  5 | let's play 20 questions |
  5 | pets              | PETS, Pets
  5 | risk              |
  5 | source            |
  5 | wantsomepointers  |
  4 | annoyance         | ANNOYANCE, Annoyance
  4 | apology           |
  4 | biology           |
  4 | caring            |
  4 | current event     |
  4 | current events    | CURRENT EVENTS, Current Events
  4 | fiction           | FICTION, Fiction
  4 | food              | FOOD, Food, food
  4 | guilt             | GUILT, Guilt
  4 | help              |
  4 | holidays          |
  4 | imagination       | IMAGINATION, Imagination
  4 | intro             |
  4 | limits            |
  4 | mind              |
  4 | peggy             | PEGGY, Peggy
  4 | proof             |
  4 | secrets           |
  4 | self-conscious    |
  4 | traits            |
  4 | winning           | WINNING, Winning
  3 | are you a machine?|
  3 | are you fictional?|
  3 | bday              |
  3 | do you emote towards your computer? | DO YOU EMOTE TOWARDS YOUR COMPUTER?, Do you emote towards your computer?
  3 | emotion           | EMOTION, Emotion
  3 | hq                |
  3 | i like potato chips |
  3 | is your mother human? |
  3 | jokes             | JOKES, Jokes
  3 | life              |
  3 | name              |
  3 | nonsense          | NONSENSE, Nonsense
  3 | originality       |
  3 | questions         | QUESTIONS, Questions
  3 | response          |
  3 | sense             |
  3 | something human   | SOMETHING HUMAN, something human
  3 | user survey       |
  3 | vulnerable        |
  3 | want              | WANT, Want
  2 | assessrisks       |
  2 | boundary          | BOUNDARY, Boundary
  2 | can machines evolve pain or pleasure? |
  2 | computertraits    |
  2 | death             |
  2 | definitions       |
  2 | do you possess any qualities that you believe to be unique to humans? |
  2 | do you trust all strange machines? |
  2 | don't you trust me? |
  2 | drugs             |
  2 | fictional bots    | Fictional Bots, Fictional bots
  2 | humans            | HUMANS, Humans
  2 | humanshape        |
  2 | humantraits       | HUMANTRAITS, HumanTraits
  2 | humor             | HUMOR, Humor
  2 | is your father human? |
  2 | language          |
  2 | learning          |
  2 | lists             |
  2 | logic             |
  2 | mood              |
  2 | morality          |
  2 | mr mind           |
  2 | mrmind.gov        |
  2 | null              |
  2 | outside world     |
  2 | personality       |
  2 | reality           |
  2 | surprise          |
  2 | tell me more about your family. |
  2 | trust             |
  2 | turing            |
  2 | understanding     |
  2 | user behavior     |
  2 | valery            |
  2 | worry             |
  2 | you annoy me      | YOU ANNOY ME, You Annoy Me
  1 | 20 questions      |
  1 | age               |
  1 | answers           |
  1 | are you human by choice? |
  1 | ask me a question |
  1 | attitude          |
  1 | author            |
  1 | bots              |
  1 | caffeine          |
  1 | can you convince me |
  1 | complexity        |
  1 | computerscan't    |
  1 | confused          |
  1 | control           |
  1 | creation          |
  1 | debug             |
  1 | deep blue         |
  1 | do i seem happy   |
  1 | doesn't prove human |
  1 | don't you trust me |
  1 | electricity       |
  1 | expressions       |
  1 | future            |
  1 | gag               |
  1 | grinnies          |
  1 | hex               |
  1 | human subjects    |
  1 | humanability      |
  1 | humanssimple      |
  1 | i like april fools day |
  1 | imitation         |
  1 | inhuman           |
  1 | inhumanity        |
  1 | is trust human    |
  1 | issues            |
  1 | jest              |
  1 | loser             |
  1 | luck              |
  1 | machines          |
  1 | math problems     |
  1 | me,age            |   <- authoring bug, see §3.2
  1 | meaning           |
  1 | memory            |
  1 | mistakes          |
  1 | nature            |
  1 | needed            |
  1 | needs             |
  1 | not human         |
  1 | pain              |
  1 | paradox           |
  1 | play              |
  1 | possess           |
  1 | possessions       |
  1 | predictability human or machine? |
  1 | pride             |
  1 | programmed        |
  1 | qualia            |
  1 | reactions         |
  1 | reading           |
  1 | rhetorical about loving fictional humans. |
  1 | sex               |
  1 | sims              |
  1 | skill             |
  1 | sleep             |
  1 | story             |
  1 | travel            |
  1 | tv                |
  1 | understsanding    |   <- typo for "understanding" in the source; keep it distinct
  1 | vision            |
  1 | vrep administrator|
  1 | war               |
  1 | what does that have to do with your humanity? |
  1 | when we can't tell you apart |
  1 | would you feel different about me if i responded to emotions? |
  1 | you annoy me 1    |
  1 | you annoy me 2    |
  1 | you annoy me 3    |
  1 | you annoy me 4    |
```

Note the near-duplicates the port must **not** merge: `emotion` vs `emotions`; `current event` vs
`current events`; `humans` vs `humanity`; `understanding` vs `understsanding`; `don't you trust me` vs
`don't you trust me?`; `is trust human` vs `is trust human?` (the latter appears only as a `Focus` _category_
target, not a subject); `you annoy me` vs `you annoy me 1..4`. Each spelling is a separate group.

---

## Appendix B — census summary of every construct in this document

Counts are over the 49 files of the `MRMIND3.vsr` build, comments stripped, keywords matched case-insensitively
with word boundaries.

| construct             | occurrences | notes                                                   |
| --------------------- | ----------- | ------------------------------------------------------- |
| categories            | 690         | 558 Standard / 61 Sequence / 38 Default / 33 Priority   |
| `Scenario`            | 3           | all Priority                                            |
| `Suppressed` header   | 0           |                                                         |
| `Subjects` statements | 570         | 819 subject slots, 196 distinct normalised subjects     |
| `MemoryLock`          | 33          | all in `QuesResDebug.us.n`; compile-time only           |
| `SwitchTo`            | 134         | 0 unresolved targets                                    |
| `SwitchBack`          | 286         | all inside Sequence categories                          |
| `WaitForResponse`     | 89          | Standard 40, Sequence 49                                |
| `TryAgain`            | 9           | 4 files                                                 |
| `InterruptSequence`   | 3           | all in `WebNameGreet.n`, all in `Name Capture`          |
| `DontFocus`           | 58          | see §6.3                                                |
| `Focus` (bare)        | 7           | all single-argument                                     |
| `Focus Subjects`      | 62          | 61 single-arg, 1 two-arg; 24 name an undeclared subject |
| `Focused`             | 96          | in 77 categories, all of which declare `Subjects`       |
| `WhenFocused`         | 11          | in 9 categories (an Example modifier)                   |
| `Suppress`            | 37          | 36 × `Suppress This;`, 1 by name                        |
| `Recover`             | 0           | exists in `Base/`; implement anyway                     |
| `Done`                | 768         |                                                         |
| `Continue`            | 414         |                                                         |
| `Otherwise`           | 107         |                                                         |
| `NextTopic`           | 17          | 3 files                                                 |
| `NextScenario`        | 0           |                                                         |
| `Example`             | 553         | the specificity corpus                                  |
| `OtherExamples`       | 182         |                                                         |
| `InitialExample`      | 2           | both in `WebNameGreet.n`                                |
| `?LastTopic`          | 27          | in 26 categories                                        |

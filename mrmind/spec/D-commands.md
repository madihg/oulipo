# D. Commands and output — NeuroScript 2.2 implementation specification

Scope: every command (action statement) that can appear inside a category body, plus the
declaration-level statements that belong to the output/verification machinery
(`Example`, `OtherExamples`, `InitialExample`, `MemoryLock`, `Expires`, `Attribute … Specificity`).
Conditions (`If`, `IfRecall`, `IfHeard`, `IfChance`, `Matches`, `Contains`, …), block
terminators as control flow, category headers, and the specificity/selection loop belong to
other sections; this document covers them only where they change what reaches the user.

Sources and how they are cited:

- **Archive** = `mrmind/archive/1_NeuroServer_fromVaio_MrMind/`.
  Script paths below are relative to `…/NeuroScript/`. Quoted lines are verbatim (CRLF stripped).
- **[spec §N]** = `mrmind/archive/_research/patents/GERBIL-LANGUAGE-NOTES.md`.
- **CDB** = `mrmind/_work/transcripts/mrmind3-cdb.txt`
  (7,312 real bot replies, 57 connections, 12 Dec 2000 – 29 Aug 2001, each tagged
  `[<topic name> | <file>:<line>]`).
- **NSO** = compiled `.nso` objects; `strings -n 3` yields the runtime class names.

Where the archive and the patents disagree, the archive wins and the disagreement is stated.

---

## 0. Corpus, and what "common" means

The shipped bot is `Mrmind3`. Its manifest `Mrmind3/MRMIND3.vsr` `[FILES]` section lists
**49** files (not 50), in build order: 48 under `Mrmind3/` and one `LIBRARY:` entry
(`Library/StdQuestion/combis/QuesResDebug.us.n`, 98,788 bytes — the whole StdQuestion
preprocessing library rolled into one file). Manifest paths use backslashes and vary in case
from the on-disk names (`Customization\` vs `customization\`); resolve case-insensitively.

Three corpora are counted separately throughout:

- **build** — the 49 files of `MRMIND3.vsr`.
- **NeuroScript** — all 206 `.n` files under `NeuroScript/` (adds `MrMind/`, `Mrmind3old/`,
  `Base/`, the full `Library/`, `Copy of Library/`, `HttpExample/`, `MMprojectdir/`).
- **archive** — NeuroScript plus `Program/Help/Examples/` (NativeMinds demo scripts).

Damaged/empty files (report, do not treat as valid empty scripts): four zero-length `.n`
files — `Mrmind3old/Answering.n`, `Mrmind3old/AboutMrMind/MMfamily.n`,
`Mrmind3/AboutMrMind/MMfamily.n`, `Mrmind3/Activities/picutres.n`. No NUL-filled files were
found. `Mrmind3/AboutMrMind/MMfamily.n` and `Mrmind3/Activities/picutres.n` are not in the
build manifest, so the build is unaffected.

Encoding: files are CRLF, Windows-1252 / Latin-1 — **not** UTF-8. One build file contains
high bytes: `Mrmind3/AboutMrMind/MMIdentity.n` has three `0xE9` (`é`) inside Say strings
("Paul Valéry"). Decode as `latin-1`, or the byte will corrupt.

### 0.1 Command census

Token counts (case-insensitive, strings and `//` comments excluded, `?`-prefixed names not
counted as bare keywords):

| command                      | build | NeuroScript | archive |
| ---------------------------- | ----- | ----------- | ------- |
| `Say`                        | 555   | 1119        | 1130    |
| `SayOneOf`                   | 305   | 650         | 659     |
| `SayToConsole`               | 116   | 534         | 544     |
| `SayToFile`                  | 73    | 151         | 151     |
| `Trace`                      | 4     | 16          | 16      |
| `Show`                       | 0     | 28          | 28      |
| `ShowTemplate`               | 0     | 7           | 7       |
| `ShowLocalFile`              | 0     | 0           | 0       |
| `Do`                         | 0     | 0           | 0       |
| `DoOneOf`                    | 0     | 0           | 0       |
| `Remember`                   | 571   | 2287        | 2287    |
| `RememberOneOf`              | 0     | 0           | 0       |
| `Remember … IsOneOf`         | 0     | 76          | 76      |
| `Compute`                    | 8     | 88          | 88      |
| `Forget`                     | 82    | 395         | 395     |
| `ForgetOneOf`                | 0     | 0           | 0       |
| `MemoryLock`                 | 33    | 132         | 132     |
| `Expires`                    | 0     | 10          | 10      |
| `Focus` (total)              | 69    | 104         | 104     |
| … of which `Focus Subjects`  | 62    | 93          | 93      |
| … of which `Focus <catlist>` | 7     | 11          | 11      |
| `DontFocus`                  | 58    | 84          | 86      |
| `Suppress`                   | 37    | 60          | 60      |
| `Recover`                    | 0     | 1           | 1       |
| `SwitchTo`                   | 134   | 577         | 578     |
| `SwitchToOneOf`              | 0     | 0           | 0       |
| `SwitchBack`                 | 286   | 1228        | 1228    |
| `WaitForResponse`            | 89    | 158         | 158     |
| `TryAgain`                   | 9     | 37          | 37      |
| `InterruptSequence`          | 3     | 18          | 18      |
| `NextTopic`                  | 17    | 34          | 34      |
| `LastTopic`                  | 0     | 0           | 0       |
| `Done`                       | 759   | 1539        | 1558    |
| `Continue`                   | 414   | 1705        | 1707    |
| `DisconnectThisUser`         | 1     | 7           | 7       |
| `Example`                    | 545   | 1133        | 1143    |
| `OtherExamples`              | 182   | 399         | 405     |
| `InitialExample`             | 2     | 15          | 15      |
| `SequenceExample`            | 0     | 0           | 0       |
| `WhenFocused`                | 46    | 75          | 78      |
| `Get … from PLUGIN`          | 0     | 5           | 5       |

**A faithful MrMind3 port needs only 22 commands**: `Say`, `SayOneOf`, `SayToConsole`,
`SayToFile`, `Trace`, `Remember` (three forms), `Forget`, `MemoryLock`, `Focus`,
`Focus Subjects`, `DontFocus`, `Suppress`, `SwitchTo`, `SwitchBack`, `WaitForResponse`,
`TryAgain`, `InterruptSequence`, `NextTopic`, `Done`, `Continue`, `DisconnectThisUser`,
`Example` / `OtherExamples` / `InitialExample`. Everything else is either unused in the
build (`Show`, `ShowTemplate`, `Expires`, `Recover`, `IsOneOf`, `Get`) or unused everywhere
(`Do`, `DoOneOf`, `RememberOneOf`, `ForgetOneOf`, `SwitchToOneOf`, `SequenceExample`,
`ShowLocalFile`, `LastTopic`, the `LoginAs`/account family).

### 0.2 Compiled-class corroboration

`strings -n 3` over all 86 `.nso` files yields exactly these runtime classes, which
one-to-one confirm the command set and, crucially, the **argument model**:

```
CAlwaysCondition  CAndCondition   CArgElemCat     CArgElemCompute CArgElemConcat
CArgElemPat       CArgElemPropty  CArgElemStarBf  CArgElemString  CArgListAnd
CArgListOr        CCategory       CChanceCondition CConditionActionBlock
CConsole          CContinuation   CContinue       CDo             CDone
CExample          CExampleRephrasing              CFocus          CFocusCondition
CFocusSubject     CForget         CInitialExample CInterruptSequence
CLoginAction      CMemReference   CNextCategory   CObList         CObjFile
COrCondition      CPatListDef     CPatternMatchCondition          CPropertyCondition
CRecover          CRemember       CSay            CSayOneOf       CSayToFile
CShow             CSuppress       CSwitchBack     CSwitchTo       CTrace
CWaitForResponse
```

Read: `CArgListOr` = a comma-separated argument list; `CArgListAnd` / `CArgElemConcat` =
a `+`-joined argument list; `CArgElemString` / `CArgElemPropty` (`?attr`) /
`CArgElemStarBf` (`*1`, `#1`, `^1`) / `CArgElemPat` (pattern-list reference) /
`CArgElemCat` (category name) / `CArgElemCompute` = the five kinds of argument atom.
`CConsole` is `SayToConsole`; `CExampleRephrasing` is `OtherExamples`;
`CNextCategory` is `NextTopic`.

---

## 1. The argument model: `<patlist>` is a **list of strings**

This is the single most important thing to get right, and it is what makes commas differ
from `+`. Everything else follows from it.

**Every command argument is a pattern list, and a pattern list evaluates to an ordered list
of zero or more strings.** Memory attributes hold lists too: the user record maps each
attribute name "to a list of strings representing the value of that attribute"
[spec §6, quoting US 6,604,090 §III.A].

The archive states the rule and its consequence in prose. `Library/Utilities/components/CMailUtil.n:43-56`,
verbatim:

```
	// Administrator's note:  If your vRep is executing multiple "say" commands, or a "Say" command
	// on  multiple strings, then ?WhatRobotSaid is actually a set of several strings.

	// If you were to remember ?mail.body is ?mail.body+?WhatRobotSaid, therefore,
	// ?mail.body would become multiple strings as well -- and if it were already
	// multiple strings, it would then have one value for every possible combination.

	// "DO", or "SHOW", which we are using to invoke a CGI url, would then apply to every
	// one of those strings, sending you arbitrarily many emails in response to a single
	// user comment. Since this is bad, we use a little-documented attribute,
	// ?EverythingRobotJustSaid, (a concatenation of robot say's) instead.
```

### 1.1 Grammar

```ebnf
patlist   = alt , { "," , alt } ;                    (* CArgListOr:  list concatenation *)
alt       = concat ;
concat    = atom , { "+" , atom } ;                  (* CArgListAnd: pairwise cross product *)
atom      = string
          | attrref                                  (* ?Name, ?StdQ.LocalQuestion       *)
          | starbuf                                  (* *1 .. *9, #1 .. #9, ^1 .. ^9     *)
          | patlistname                              (* bare symbol: a PatternList/Pattern *)
          | "(" , patlist , ")" ;
string    = '"' , { char | '\\' , any } , '"' ;
attrref   = "?" , ident ;
starbuf   = ( "*" | "#" | "^" ) , digit ;
patlistname = ident ;                                (* case-insensitive *)
```

`ident` is `[A-Za-z_][A-Za-z0-9_.]*`. Dots are ordinary name characters
(`?StdM.SentenceToAnswer`, `PatternList STDL.LOGREASONANSWER`, `?STDX.TEST`).
All identifiers, keywords, attribute names, pattern-list names, category names and subject
names are **case-insensitive**. Proof, `Mrmind3/Utilities/WebNameGreet.n:678-679`:

```
		Remember ?name is compute Lowercase of ?Name;
		Remember ?Name is compute Capitalize of ?Name;
```

`?name` and `?Name` are the same slot; the second line capitalises what the first
lowercased. The CDB shows the result: user types `peggy`, bot says `Hi Peggy!`.

### 1.2 Evaluation

```
eval(string s)              = [ unescape(s) ]
eval(?A)                    = memory[A]                    (* [] if unset *)
eval(*n)                    = [ starbuffer[n] ]             (* "" if unbound *)
eval(NAME)                  = members of PatternList NAME, in declaration order
eval(a "," b)               = eval(a) ++ eval(b)            (* list concatenation *)
eval(a "+" b)               = [ x + y for x in eval(a) for y in eval(b) ]   (* cross product *)
```

`+` is bare string concatenation — no separator is inserted. Empty/unset attributes
contribute the empty string, not the literal name and not `"TRUE"`.

**Evidence for `+` = concatenation with no separator, and for empty attributes rendering as
`""`.** `Mrmind3/Defaults/Answers.n:380`:

```
		SayToFile "C:\Program Files\NativeMinds\TextFiles\Ashamed.txt" ?Name + ?IPaddress+ " says: " + ?UserAshamed;
```

produced, in `Mrmind3/TextFiles/Ashamed.txt`, three lines of the shape below. The
surviving file holds what real visitors typed in 2001, so the values here are invented and
only the shape is reproduced:

```
User says: <the visitor's answer>
 says: <the visitor's answer>
New10.0.0.1 says: <the visitor's answer>
```

`?Name`=`"User"`, `?IPaddress`=`""` → `User says: …`. Second line: `?Name` unset → leading
space only. Third: `?Name`=`"New"`, `?IPaddress`=`"10.0.0.1"`, concatenated with
nothing between them.

**Evidence for `+` = cross product over multi-valued operands.** The greeting,
`Mrmind3/Utilities/WebNameGreet.n:886`:

```
       SayOneOf STDW_WebGreetingFirstHalf +MYNAME+ STDW_WebGreetingSecondHalf;
```

with `Mrmind3/customization/WebCustomize.n:24,27` and `Mrmind3/customization/MyName.n:21`:

```
Patternlist STDW_WebGreetingFirstHalf is "<B>Hello.  I'm ","<B>Hi, my name is ";
PatternList STDW_WebGreetingSecondHalf is "";
PatternList MYNAME is "mrmind", "mr mind","MRMIND";
```

2 × 3 × 1 = 6 candidate strings; `SayOneOf` emits exactly one of them. The CDB shows
precisely this shape of output: `Hi, my name is MRMIND`, `Hello.  I'm MRMIND`,
`Hi, my name is MR MIND`, `Hello.  I'm MR MIND`, plus one `Hi, my name is mrmind`
(CDB line 3, 13, and 190 more).

The same file's own comment states the intent, `WebCustomize.n:22`:

```
//  The robot does SayOneOf WebGreetingFirstHalf +MYNAME+ WebGreetingSecondHalf to greet new users.
```

**The authoring idiom that exists because of the cross product.** `Base/Defaults/Default.n:349-357`:

```
		Remember ?String1 isOneOf "I don't know the answer to that, " + ?Name + ".  Check back in a couple of weeks, and " + …
		Remember ?String3 isOneOf "<PERSONALIZE HERE>.  " , "<PERSONALIZE HERE>.  " , "<PERSONALIZE HERE>.  " , "<PERSONALIZE HERE>.  ";
		…
		Say ?String1 + ?String2 + ?String3 + ?String4;
```

Each `IsOneOf` collapses its list to a single value first, so the final `Say` concatenates
1×1×1×1 = one string. Without the collapse the `Say` would emit the full cross product as
separate lines.

**Unresolved:** the enumeration order of the cross product (`a1b1, a1b2, a2b1, a2b2` vs
`a1b1, a2b1, a1b2, a2b2`). It only matters for `Say` over a multi-valued concat, which does
not occur in the build. _Hypothesis:_ right-most index varies fastest (row-major), matching
the natural nested-loop implementation.

### 1.3 String literals and escapes

Escape counts across all `.n` files: `\"` 140, `\.` 135, `\'` 105, `\\` 65, `\,` 58,
`\?` 31, `\*` 26, `\)` 24, `\(` 24, `\!` 9, `\&` 6, `\=` 4.

Two different roles:

- `\"` inside any string is a literal double quote. `Mrmind3/Humans&Machines/Convincing.n:486`:
  `Say "HQ is \"HUMAN QUOTIENT\".<BR> Go ahead, take the HQ Quiz.";`
- `\.` `\?` `\!` `\,` `\*` `\+` `\-` `\/` `\(` `\)` `\'` escape **pattern metacharacters**.
  They matter on the condition side, not in output. `Mrmind3/Utilities/WebNameGreet.n:665`:
  `PatternList Punc is "\.","\?","\!","\,";`

**Backslash is not a general C escape.** Windows paths appear raw:
`"C:\Program Files\NativeMinds\TextFiles\Joke.txt"` — `\P`, `\N`, `\T` are literal
backslash-plus-letter. A port must only special-case `\"` and, for patterns, the
metacharacter set; every other `\x` is two literal characters. There is no `\n`, `\t`
whitespace escape anywhere in the archive.

### 1.4 Pattern-list declarations (top level, not commands)

```ebnf
patlistdecl = "PatternList" , ident , "is" , patlist , ";" ;
patterndecl = "Pattern"     , ident , "is" , patlist , ";" ;
```

`PatternList` 961 occurrences (build 228); `Pattern` 142 (build 3). `Pattern` is the
single-valued form used for scalars, e.g. `Library/StdQuestion/Customization/DebugCustomize.n`:

```
Pattern SDeb.CONSOLEDEBUGGING is "QSR";
```

Lists may reference other lists and use `+`, producing a cross product at declaration time —
`Mrmind3/Utilities/WebNameGreet.n:433`:

```
PatternList NONAMEGREETINGS is ("hi","hello","hey")+("there","")+(MYNAME,""),"not #";
```

---

## 2. Output commands

### 2.1 `Say`

```ebnf
say = "Say" , patlist , ";" ;
```

**Effect.** Append **every** string in `eval(patlist)`, in order, to the run's output
buffer as a separate utterance. Set the category's "produced output" flag (which triggers
auto-focus unless `DontFocus` ran in the same block) [spec §11]. Set `?WhatRobotSaid` to
the list of utterances produced this run, and append to `?EverythingRobotJustSaid`.

**Comma vs `+` — the decisive evidence.** This is the question the port must not get wrong.

Source, `Mrmind3old/Humans&Machines/Machines.n:120-133` (the revision that was live on
20 Mar 2001):

```
Topic "You (MrMind, Machines) can't think." is
Subjects "THINKING", "ME", "PURPOSE";
	If (Recall ?AnyStatement)
	and (heard (YOU,BOTS)
	and ("can't","don't","think you can")
		and ("don't #","do not #","can't #","cannot #","aren't able to #","computers can't #","computers can not #")
	and THINKWORD)
	Then
		Example "You can't think.";
		Say "I don't think.  I cause you to think.","That's what you think, let's have a thinking contest.";
	Done
EndTopic
```

Output, CDB lines 14456-14457, one user turn:

```
U: you can't think
M: I don't think.  I cause you to think.    [You (MrMind, Machines) can't think. | Humans&Machines\Machines.n:124]
M: That's what you think, let's have a thinking contest.    [You (MrMind, Machines) can't think. | Humans&Machines\Machines.n:124]
```

**One `Say`, two commas-separated strings → two separate bot utterances**, each logged as
its own row against the same topic and source line. This matches the patent claim
[spec §6, US 6,363,301:3670-3672] and matches the CMailUtil comment quoted in §1.

Contrast, `+`. `Mrmind3/Issues/Humor.n:50`:

```
			Say ?WhatUserSaid + " who?";
```

Output, CDB lines 13171-13175:

```
M: Who's there?    [Knock Knock. | Issues\Humor.n:43]
U: peggy
M: peggy who?    [Knock Knock. | Issues\Humor.n:43]
U: peggyopolis
M: very funny    [Knock Knock. | Issues\Humor.n:43]
```

`?WhatUserSaid` (`peggy`) and `" who?"` joined by `+` produce **one** utterance,
`peggy who?`, with no separator inserted.

**Rarity.** Multi-argument `Say` is very rare: **11 occurrences in all of NeuroScript,
4 in the build.** All eleven, verbatim:

| file:line                                   | argument text                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Base/Inanities/Capabilities.n:153`         | `"If you want to search, you can use one of these search engines.  " , "I'm not a search engine, I'm a virtual representative. "`                 |
| `Base/Inanities/Capabilities.n:1142`        | 3 alternatives, each containing `+`                                                                                                               |
| `Base/Inanities/Conversation.n:499`         | `""+"vReps"+"…don't understand ,they simply reply to questions " , "they have been scripted to answer."`                                          |
| `Base/Inanities/Personality.n:1393`         | `"I was not designed to be entertaining.  I was designed to be useful. " , "I'm not too much fun. I talk about my employers and their products."` |
| `Mrmind3/Humans&Machines/Machines.n:206`    | `"Well, how do know that <BR>you aren't a computer that <BR>got its wires crossed?" , "Maybe you're a computer <BR>trying to talk like a human."` |
| `Mrmind3/Humans&Machines/Machines.n:273`    | `"I'll work on it." , "OK <BR>MWA - Machines With Attitude"`                                                                                      |
| `Mrmind3/Issues/Choice.n:129`               | `"I thought you said <BR>that humans think." , "If you do things without thinking, <BR>how do you know it isn't a <BR>programmed response?"`      |
| `Mrmind3/Issues/Misc.n:69`                  | **malformed**, see below                                                                                                                          |
| `Mrmind3old/Humans&Machines/Machines.n:129` | the "thinking contest" case above                                                                                                                 |
| `Mrmind3old/Issues/Choice.n:126`            | same as Choice.n:129, earlier wording                                                                                                             |
| `Mrmind3old/Issues/Misc.n:67`               | same malformed case                                                                                                                               |

The malformed one, `Mrmind3/Issues/Misc.n:69` verbatim:

```
		Say "Earth's atmosphere is over 75% <BR>nitrogen, and nitrogen scatters <BR>light at a " + ,
		"wavelength of 80 <BR>angstroms -- which, to humans, <BR>appears blue. I don't see the <BR>sky much.";
```

A `+` immediately followed by `,`. The author clearly meant `+`. Whether NeuroServer's
parser accepted this (treating `+ ,` as `,`, or as `+ "" ,`) or emitted a warning is not
recoverable from the archive. **Special-case it**: the port should parse `+` followed by
`,` as a plain `,` (or hard-code these two lines to a single `+`), and log a warning.

**Say's arguments in practice** (all of NeuroScript, atoms, ignoring operators):
2,833 string literals, 330 bare pattern-list symbols, 199 `?attr`, 89 `*n` star buffers,
6 `#n` star buffers. `Say` with a bare pattern-list symbol occurs 36 times, and in **every
case the referenced list has exactly one member** — the authors reserved multi-member lists
for `SayOneOf`. e.g. `Mrmind3/Utilities/WebNameGreet.n:94`:

```
		 	Say STDN_GOTNAMEFIRSTHALF+ ?Name + STDN_GOTNAMESECONDHALF;
```

```
PatternList STDN_GOTNAMEFIRSTHALF is "<B>Hi ";
PatternList STDN_GOTNAMESECONDHALF is "! <BR>Can you convince me <BR>that you are human?  </B>";
```

→ CDB: `M: Hi Pw! Can you convince me that you are human?` (one line).

### 2.2 `SayOneOf`

```ebnf
sayoneof = "SayOneOf" , patlist , ";" ;
```

**Effect.** Evaluate `patlist` to a list; emit **exactly one** element, chosen at random.
Otherwise identical to `Say` (same buffer, same auto-focus flag, same `?WhatRobotSaid`).

Patent wording [spec §6]: "SayOneOf and DoOneOf nondeterministically select one of their
arguments, and Say or Do that argument."

Because selection is over the _evaluated list_, a `SayOneOf` whose single argument is a
concatenation of multi-member pattern lists chooses uniformly among the cross product
(§1.2). And a `SayOneOf` with one literal argument is simply a `Say` — 57 such statements in
the build. Authors used it as a placeholder for later expansion, e.g.
`Mrmind3/Issues/Humor.n:69`:

```
	SayOneOf "Computers don't have a sense of <BR>humor, but you can try a knock <BR>knock joke.";
```

**Alternative-count distribution of `SayOneOf` in the build** (top-level commas + 1):
1 alt 65, 2 alts 111, 3 alts 75, 4 alts 28, 5 alts 10, 6 alts 12, 7 alts 4 — plus the cases
whose alternatives come from a pattern-list symbol rather than inline commas.

**Repeats are allowed.** `Mrmind3/Issues/Humor.n:22`: `SayOneOf "ha ha!", "great!";`
and CDB shows the same choice repeating on consecutive fires of the greeting topic
(e.g. CDB lines 3, 14, 20 all `Hi, my name is MRMIND`). It is not round-robin and it is not
"no immediate repeat".

**Is it uniform? — unresolved.** The CDB gives the only empirical handle, and it does not
settle the question. For `Robot Greeting` at `Utilities\WebNameGreet.n:867`, 104 fires over
a 4-alternative space:

```
Hi, my name is MRMIND      65
Hi, my name is MR MIND     14
Hello.  I'm MRMIND         13
Hello.  I'm MR MIND        12
```

and 48 of the 103 adjacent pairs are identical (uniform-iid over 4 predicts ≈26). The same
skew appears at `WebNameGreet.n:879` (43/16/13/11 over 86 fires). The confound is fatal:
CDB connection 1 is a single 13,744-line developer session spanning 12 Dec 2000 onward
during which the scripts were being edited continuously, so the alternative set was not
constant. _Recommendation:_ implement uniform random over the evaluated list, seeded per
process, and expose the seed so behaviour is reproducible. _Hypotheses for the skew, none
confirmed:_ (a) the alternative set changed mid-log; (b) NeuroServer used
`rand() % n` with a rarely-reseeded generator; (c) selection was made once per user record
rather than once per execution.

### 2.3 `SayToConsole`

```ebnf
saytoconsole = "SayToConsole" , patlist , ";" ;
```

Class `CConsole`. "SayToConsole is a Say statement whose output is directed to the console
window and log file" [spec §6]. **It never reaches the user.**
`Mrmind3/Customization/DebugCustomize.n:23-24`, verbatim:

```
//		  Debugger output NEVER goes out to web users -- if you set SDeb.LIVEDEBUGGING to "Q",
//		  the local display will show what question strings are set when a web user is on --
//			but the users will never see a difference.
```

Corroborated by the CDB: 7,312 `M:` rows and zero console text among them.

116 uses in the build; 96 of them contain `+`, none contains a top-level comma. Typical,
`Mrmind3/Utilities/WebNameGreet.n:846-855` and `Mrmind3/Utilities/CProfanity.n:63`:

```
		SayToConsole "HTTP_USER_AGENT = " + ?HTTP_USER_AGENT;
		SayToConsole "Profanity strikes: "+?ProfanityStrikes;
```

Gated by the `?Debugging` flag string, `Library/StdQuestion/combis/QuesResDebug.us.n:2450-2455`:

```
Priority topic "Report PreProcessor debugging to console" is
	If ?Debugging Matches "#P#" then
		SayToConsole "WhatUserSaid:  "+?WhatUserSaid;
		SayToConsole "WhatUserMeant:  "+?WhatUserMeant;
		SayToConsole "ProcessedString: "+?ProcessedString;
	Continue
EndTopic
```

The flag letters are documented in `Mrmind3/Customization/DebugCustomize.n:12-19`:
`P` preprocessor, `Q` question strings, `R` yes/no responses, `S` statement strings,
`W` what-user/robot-said, `Y` previous statements, `Z` previous questions. The build ships
`Pattern SDeb.CONSOLEDEBUGGING is "QSR";`, `SDeb.LIVEDEBUGGING is "";`,
`Sdeb.EXAMPLEDEBUGGING is "PQRS";`.

**Port recommendation:** implement `SayToConsole` as a side channel (a debug log array),
never merged into the user-visible reply.

### 2.4 `Trace`

```ebnf
trace = "Trace" , patlist , ";" ;
```

Class `CTrace`. "Trace is a Say statement whose output is directed to the console window and
log file, and only appears when the script is being run in various debugging modes"
[spec §6]. 16 occurrences, all four distinct, all in the StdQuestion library and all of the
same shape — `Library/StdQuestion/StdResponse.us.n:63-78`:

```
	IfHeard StdResponse.Affirmative AND NOT StdResponse.AffirmativeException Then
		Trace "Setting flag ?YesResponse";
		Remember ?YesResponse;
	Continue
```

Four of these are in the build (via `QuesResDebug.us.n:2269,2273,2277,2282`). Treat exactly
like `SayToConsole` but suppressed unless a debug mode is on.

### 2.5 `SayToFile`

```ebnf
saytofile = "SayToFile" , pat , patlist , ";" ;
```

**Note the grammar: no comma or keyword between the filename and the content.** The first
pattern is the destination path; everything after it is the content pattern list.
73 uses in the build; every one of them has a `+`-joined content list and none has a
top-level comma. Canonical form, `Mrmind3/Issues/Humor.n:21`:

```
			SayToFile "C:\Program Files\NativeMinds\TextFiles\Joke.txt" ?Name + ?IPaddress+ " says: " + ?UserJoke;
```

**Effect.** Append one line per element of the content list to the named file, each
terminated by CRLF. Does **not** produce user-visible output, does not set the auto-focus
flag. The file is opened in append mode and created if absent; existing content is
preserved across runs and across server restarts (the archived files accumulate months of
entries).

**Verified against the archive's own output files.** `Mrmind3/Defaults/Answers.n:380` and
`:393`:

```
		SayToFile "C:\Program Files\NativeMinds\TextFiles\Ashamed.txt" ?Name + ?IPaddress+ " says: " + ?UserAshamed;
		SayToFile "C:\Program Files\NativeMinds\TextFiles\Ashamed.txt" ?Name + ?IPaddress+ " continues: " + ?UserAshamed;
```

produced `Mrmind3/TextFiles/Ashamed.txt`. Its structure, with the line terminators shown
literally and the visitor-supplied values replaced by placeholders, since the real file is
2001 visitor input and is not published:

```
MRMIND Says "Do you think that machines will ever be ashamed of their human origins?";\r\n
\r\n
<name> says: <answer>\r\n
<name> elaborates: <answer>\r\n
User says: <answer>\r\n
User elaborates: <answer>\r\n
 says: <answer>\r\n
```

(The header line is a hand-written note by the author, not engine output; the `elaborates:`
lines come from an earlier revision of the second statement. The last line has an unset
`?Name`, which is what leaves the leading space.)

Paths in the build are absolute Windows paths under
`C:\Program Files\NativeMinds\TextFiles\` — except `Mrmind3/Reactions/Asides.n:174`, which
uses `C:\Program Files\NativeMinds\NeuroServer\NeuroScript\MrMind3\TextFiles\Relevant.txt`.
`HttpExample/httpex.n:50` shows the relative form: `SayToFile "httpexResult.htm" ?Result;`.
The surviving output files live in `NeuroScript/Mrmind3/TextFiles/` and
`NeuroScript/Mrmind3old/TextFiles/`.

**Port recommendation:** map the `C:\Program Files\NativeMinds\…\TextFiles\` prefix (and the
longer variant) onto a sandboxed directory; refuse writes outside it. The manifest
`[BUILDER]` section sets `IncludeSayToFileInLog=1`, so the original also mirrored these into
the server log.

### 2.6 `Show`, `ShowTemplate`, `ShowLocalFile`

```ebnf
show         = "Show"         , patlist , [ "in" , patlist ] , ";" ;
showtemplate = "ShowTemplate" , patlist , [ "in" , patlist ] , ";" ;
```

**Not used in the MrMind3 build (0 occurrences).** 28 `Show` and 7 `ShowTemplate` elsewhere;
`ShowLocalFile` never. "Show, ShowTemplate, and ShowLocalFile show content in an HTML display
frame" [spec §6]. Every archive use has an `in <frame>` clause.
`Library/Utilities/components/CMailUtil.n:125-127`:

```
		SHOW STDM_MAILGATEWAY+
			?Totarget+"&SUBJECT="+?Subjecttarget+"&REPLY-TO="+?Replytarget+"&FROM="+
			?FromTarget+"&BODY="+?BodyTarget in STDM_CGIDISPLAYFRAME;
```

`HttpExample/httpex.n:38`: `ShowTemplate "Html/Template.htm" in "Display";`

Note from CMailUtil (§1) that `SHOW` fires **once per element** of its evaluated list, same
as `Say` — which is why the author collapsed the list with `IsOneOf` first.

A port that renders MrMind as a chat log can implement these as no-ops with a warning.

### 2.7 `Do` / `DoOneOf`

**Zero occurrences anywhere in the archive.** The class `CDo` exists in the compiled objects,
and four _commented-out_ uses survive, all of the frame-display form:

```
Mrmind3/AboutMrMind/MMphysical.n:173://	  	Do "SETNAME MS MIND";
Mrmind3/AboutMrMind/MMphysical.n:177://		Do "SHOW SRC=/MrMindFiles/Pegmsmindquip.htm TARGET=Peggy";
Mrmind3old/Humans&Machines/Machines.n:130://		Do "SHOW SRC=http://peggysplace/20questions.htm TARGET=http://";
Base/Inanities/Personality.n:586://	  	Do "SHOW SRC="+HOMEDIRECTORY+"Splash.htm Target=Display";
```

`Mrmind3/HTML/MRMIND3Say.htm` confirms the mechanism:
`//if there are other frames shown (via DO "SHOW ..."), the following code displays them`.
Arguments are opaque host commands. The port may omit `Do` entirely, or accept and log it.

### 2.8 What `<BR>` and other HTML in Say strings mean

HTML tag census inside all string literals in `NeuroScript/`:
**`<BR>` 1,122**, `<personalize here>` 36, `<b>` 12, `</b>` 12, `</a>` 11, `<sup>` 4,
`</sup>` 4, `<i>` 2, `</i>` 2, `<p>` 2. Zero HTML entities (`&nbsp;` etc.).

**Say strings are raw HTML, emitted verbatim, and rendered by the front end.** The tags are
not interpreted by the engine. The web template `Mrmind3/HTML/MRMIND3Say.htm` substitutes:

```
                       <pre><FONT class="mindtext"><P><B>[[EverythingRobotJustSaidHTML]]</b></FONT></pre>
```

so `<BR>` becomes a real line break in the browser and `<B>…</B>` becomes bold. The full set
of template placeholders across all `.htm` files in the archive is
`[[EverythingRobotJustSaidHTML]]` (18), `[[WhatRobotSaid]]` (10), `[[WhatUserSaid]]` (10),
`[[RobotHandle]]` (32), `[[WhoUserIs]]` (16), `[[JSDisplayOtherFrames]]` (16),
`[[RobotName]]` (4), `[[Result]]` (2), plus the `[[Contributor.*]]` authoring-tool family.

Authors used `<BR>` purely as manual line-wrapping for the ~30-character-wide MrMind display
panel, inserted mid-sentence at arbitrary points. Two examples,
`Mrmind3/Issues/Consciousness.n:143` and `Mrmind3/AboutMrMind/MMIdentity.n:278`:

```
		"Maybe you need a purpose...<BR>do you have a purpose?";
		"I communicate in English --<BR>what languages do you speak?"
```

**What the log did with them, and what the port should do.** The conversation database
stored the reply text with the tags **deleted, with no substitution**. Matching 376 build
strings containing `<BR>` against the 7,312 CDB replies: 371 match under
_delete-with-no-substitute_ and only 5 under _replace-with-space_. The clean discriminator is
a `<BR>` with no adjacent whitespace on either side; there are 12 such matches, 10 delete vs
2 space, and the delete cases are unambiguous. CDB lines 12566, 1429, 2147, 9557:

```
M: Do you think it is possible thatmachines may evolve a sense of pain or pleasure?    [I feel pain. | AboutUser\UserPhysical.n:332]
M: I communicate in English --what languages do you speak?    [Do you know other languages | AboutMrMind\MMIdentity.n:209]
M: Maybe you need a purpose...do you have a purpose?    [why am I bored with my life? | Issues\Consciousness.n:112]
M: I don't know...but then, either do you.    [Are you conscious? | Issues\Consciousness.n:17]
```

against `Mrmind3/AboutUser/UserPhysical.n:347`:
`"Do you think it is possible that<BR>machines may evolve a sense of "…`
— note **`thatmachines`**, the tag removed with nothing in its place. (`<B>` was stripped the
same way: the greeting source is `"<B>Hi, my name is "` and the log row is
`Hi, my name is MRMIND`.) The two counter-examples are almost certainly revision drift, since
the CDB predates the archived file revisions by up to 18 months.

**Recommendation for the port.** Keep the tag in the model as literal output text. Render it
as a real `<br>` in an HTML surface, or as `\n` in a plain-text surface; do **not** replace it
with a space (that would silently change `--what` into `-- what`). If a plain-text transcript
matching the historical CDB is wanted, strip tags with no substitution. Say strings must be
inserted into HTML unescaped — `Mrmind3/Reactions/Comments.n:8` emits a live mailto link:

```
	Say ("Please direct all comments to <BR><a href=mailto:MRMIND@weblab.org>MRMIND@weblab.org</a>" );
```

`<PERSONALIZE HERE>` (36 uses, all in `Base/`) is _not_ HTML; it is a NativeMinds
placeholder in the stock bot and never appears in Mrmind3.

### 2.9 Output buffering and ordering

"Output is buffered per run … and only released to the user at the end of the run;
in Example mode output is captured instead" [spec §6]; the run loop handles output buffers
after all categories have run and before `Refocus()` [spec §11].

Consequences the port must reproduce:

1. All utterances produced during one run are delivered together, in the order the `Say`
   statements executed. Proven by the two-row CDB pair in §2.1, and by multi-topic runs such
   as CDB lines 13175-13176 where a `Done` in one topic and a Default topic each contribute a
   row.
2. `?WhatRobotSaid` after the run is the **list** of that run's utterances. A `Matches`
   against it succeeds if _any_ element matches — which is exactly how the build implements
   follow-up topics. `Mrmind3/Defaults/Answers.n:538`:

   ```
   	If ?WhatRobotSaid matches "Can you imagine a situation where <BR>you'd have to prove your humanity <BR>to a computer?"
   ```

   The pattern is one whole `Say` argument, `<BR>`s included — so `?WhatRobotSaid` holds the
   **pre-HTML-stripping** text, and equality is against the exact source string.

3. `?EverythingRobotJustSaid` is a **single string**: the concatenation of that run's
   utterances (`Library/Utilities/components/CMailUtil.n:53`, quoted in §1). It exists
   specifically so that scripts can avoid the cross-product blow-up.

**Unresolved:** the separator, if any, that `EverythingRobotJustSaid(HTML)` inserts between
consecutive utterances. No archive string ends in `<BR>`, and the two-`Say` topics
(`Machines.n:206`, `Choice.n:129`) would run together without one. _Hypothesis:_ the engine
joins with `<BR>` (or with `" "`) when building `EverythingRobotJustSaidHTML`. A port should
make the joiner a single configurable constant; `"<BR>"` is the safest default for an HTML
surface, `"\n"` for text.

---

## 3. Memory commands

### 3.1 `Remember`

```ebnf
remember  = "Remember" , assignlist , ";" ;
assignlist = assign , { "," , assign } ;
assign    = memref                                     (* flag form *)
          | memref , "is"      , patlist
          | memref , "IsOneOf" , patlist
          | memref , "is" , "Compute" , fnname , "of" , patlist ;
memref    = "?" , ident ;
```

Form distribution:

| form                            | build | NeuroScript |
| ------------------------------- | ----- | ----------- |
| `Remember ?X is <patlist>`      | 516   | 2015        |
| `Remember ?X` (flag)            | 47    | 108         |
| `Remember ?X is Compute …`      | 8     | 88          |
| `Remember ?X IsOneOf <patlist>` | **0** | 76          |

**Effect.**

- `Remember ?X;` — assign the single value `"TRUE"`, making `IfRecall ?X` true.
  [spec §6, US 6,363,301:1240-1252: "Each single key is assigned a default value of "TRUE",
  which will cause the key to be recalled if used in an IfRecall conditional."]
  e.g. `Mrmind3/Issues/Humor.n:12`: `Remember ?UserHasClaimedHumor;`
- `Remember ?X is <patlist>;` — assign the **whole evaluated list**. Replaces any prior value.
- `Remember ?X IsOneOf <patlist>;` — assign **one randomly chosen element**. The
  collapse-to-scalar operator (see §1.2). Zero uses in the build; 76 in `Base/` and the
  libraries. `Library/Utilities/components/CMailUtil.n:68`:
  `Remember ?UserSay1 isOneOf ?WhatUserSaid+"("+?WhatUserDid+")";`
- `Remember ?X is Compute F of <patlist>;` — see §3.3.
- Multiple assignments in one statement, comma-separated, are legal but rare
  (2 in the build, 21 in NeuroScript, and most of those are actually
  `Compute Sum of *1, *2` where the comma is the function's argument separator).

Assignment is **not** atomic across a statement: successive `Remember`s referring to the
same slot see the previous line's result (see the `?name` / `?Name` capitalisation chain in
§1.1). Star buffers may be assigned: `Mrmind3/Activities/ategag.n:3`:

```
		Remember ?WhatUserMeant is *1+" ate "+*2;
```

Attribute names are case-insensitive and dotted names are ordinary identifiers
(`?STDX.TEST`, `?StdM.SentenceToAnswer`, `?LTM.Name`).

### 3.2 `Forget` (and `RememberOneOf` / `ForgetOneOf`)

```ebnf
forget = "Forget" , memref , { "," , memref } , ";" ;
```

Un-assign the named slots. "Once `Forget ?x` has been executed for some element `?x`, `?x`
will have no value and will not cause an `IfRecall` statement to become true, until a
`Remember` statement is executed for `?x`" [spec §6].

395 uses (build 82). Multi-argument form: 12 in NeuroScript (8 in the build's
`QuesResDebug.us.n`). `Library/StdQuestion/StdResponse.us.n:58-60`:

```
	Always
		Forget ?YesResponse,
			 ?NoResponse,
			 ?NotSureResponse;
	Continue
```

`RememberOneOf` and `ForgetOneOf` exist in the 1997/1998 grammars [spec §6] but have
**zero occurrences anywhere in the archive**. Do not implement.

### 3.3 `Compute` — the function library

```ebnf
compute = "Compute" , fnname , "of" , patlist ;
```

Only ever appears as the right-hand side of `Remember … is`. Never nested, never used
directly as a `Say` argument.

**Every `Compute` call in the whole archive**, with counts (duplicates across
`Library/` and `Copy of Library/` collapsed):

| function                                            | archive uses | in build | call sites                                                                                                                                                                                                      |
| --------------------------------------------------- | ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `URLEncoding`                                       | 41           | 0        | `Library/Utilities/combis/MailComment.n:141-145`, `MailCommentFeedback.n:128-132`, `components/CMailUtil.n:118-122`, `components/CMultiSentence.n:162,188,200`, `Base/Inanities/Conversation.n:303` (commented) |
| `Sum`                                               | 9            | 2        | `Mrmind3/Utilities/CProfanity.n:61,62`; `Base/Inanities/Capabilities.n:447`; `Library/Hierarchy/StdDomainPriority.n:28`                                                                                         |
| `SpellCheck`                                        | 4            | 1        | `Library/StdQuestion/StdQuestion.us.n:189`; `Library/StdQuestion/combis/QuesResDebug.us.n:149` **(build)**                                                                                                      |
| `Capitalize`                                        | 8            | 3        | `Mrmind3/Utilities/WebNameGreet.n:679,687`; `Library/Utilities/combis/WebName*.n`                                                                                                                               |
| `LowerCase`                                         | 4            | 1        | `Mrmind3/Utilities/WebNameGreet.n:678`                                                                                                                                                                          |
| `UpperCase`                                         | 8            | 2        | `Mrmind3/Utilities/WebNameGreet.n:680,686`                                                                                                                                                                      |
| `difference`                                        | 1            | 0        | `Base/Inanities/Capabilities.n:460`                                                                                                                                                                             |
| `product`                                           | 1            | 0        | `Base/Inanities/Capabilities.n:485`                                                                                                                                                                             |
| `ratio`                                             | 1            | 0        | `Base/Inanities/Capabilities.n:498`                                                                                                                                                                             |
| `ReplacePronouns`                                   | **0**        | 0        | —                                                                                                                                                                                                               |
| `ListItem` / `ListSize` / `ListTail` / `Comparison` | **0**        | 0        | —                                                                                                                                                                                                               |

Function names are case-insensitive in the source (`compute SUM`, `Compute Sum`,
`compute uppercase` all occur).

**The build uses only four**: `SpellCheck`, `Sum`, `Capitalize`, `LowerCase`, `UpperCase`
(five names, two of which are the same family). Everything else is dead code for a MrMind3
port.

Semantics, in the order they matter:

- **`Capitalize`** — capitalise the first letter of each word, lower-casing the rest. The
  build's name-normalisation chain, `Mrmind3/Utilities/WebNameGreet.n:675-690`, verbatim:

  ```
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
  ```

  Verified against the CDB: user types `peggy` → `M: Hi Peggy! Can you convince me that you
are human?` (CDB line 6); user types `human` → `M: That's a good trick -- OK, I'll CALL you
Human...` (CDB line 12). Because `Lowercase` runs first, `Capitalize` always sees an
  all-lowercase input, so "capitalise first letter of each word" and "capitalise first letter
  of the string" are indistinguishable from build evidence. _Recommendation:_ per-word, which
  is what the name `Capitalize` and the `?Name2` usage (`compute capitalize of #1` on a
  surname fragment) imply.

- **`LowerCase` / `UpperCase`** — whole-string case folding.
- **`Sum`** — integer addition over the argument list. Two-argument form,
  `Mrmind3/Utilities/CProfanity.n:58-63` verbatim:

  ```
  	    If DontRecall ?ProfanityStrikes then
  		    Remember ?ProfanityStrikes is "0";
  		Continue
  	    Remember ?ProfanityStrikes is Compute Sum of ?ProfanityStrikes, "1";
  	    Remember ?STDX.TEST is Compute SUM of ?ProfanityStrikes, "1";
  		SayToConsole "Profanity strikes: "+?ProfanityStrikes;
  ```

  Note the arguments are **comma-separated** — inside `Compute`, the comma is the function's
  argument separator, not a list union. Values are decimal strings; the result is a decimal
  string.

- **`difference`, `product`, `ratio`** — the other three arithmetic functions, one use each,
  all in `Base/Inanities/Capabilities.n:438-500`:

  ```
  		Remember ?Sum is Compute Sum of *1, *2;
  		Remember ?difference is Compute difference of *1, *2;
  		Remember ?product is Compute product of ?Number1, ?Number2;
  		Remember ?quotient is Compute ratio of *1, *2;
  ```

  The patents list the family as `Sum | Difference | Product | Ratio | Comparison |
ListSize | ListTail` [spec §6]. Only the first four appear. **`ratio`'s rounding behaviour
  is unresolved** — the topic's own Example is `"What is 22/7?"` and the answer format is
  `"I think it's "+?quotient+", "+?Name+"."` but no CDB row exercises it.
  _Hypothesis:_ integer division, since all four use the same string-integer representation.

- **`SpellCheck`** — the Wintertree spell-checker against the shipped dictionaries
  (`Program/Ssceam.tlx`, `Ssceam2.clx`, `Additions.tlx`, plus per-bot
  `Mrmind3/MRMIND3.tlx`, `MRMIND3.script.tlx` and the thesaurus `Program/thesdbam.cth`;
  the manifest's `[DICTIONARY FILES]` section names them). One call in the build,
  `Library/StdQuestion/combis/QuesResDebug.us.n:149`. **A faithful no-LLM port cannot
  reproduce this** without reimplementing that spell-checker. Options, in order of fidelity:
  (i) port the `.tlx` dictionary and a nearest-word algorithm; (ii) make `SpellCheck` the
  identity function and accept that misspelled input matches less often. The archive marks
  the risk itself — `Mrmind3/Activities/ategag.n:19-20`:

  ```
  	  //this relies on zink, zlink, and pkink being "words" that cannot be entered through the
  	  //spell checker. and it won't change more than 2 of each.
  ```

  i.e. `SpellCheck` maps unknown words to a nearest dictionary word, and the script depends
  on `zink`/`zlink`/`pkink` never surviving it. Under an identity-function `SpellCheck` those
  sentinels would still work (the user would have to type them literally), so option (ii) is
  behaviourally safe for `ategag.n`; it degrades only the tolerance of typos.

- **`URLEncoding`** — percent-encoding for the CGI mail gateway. Zero uses in the build.
- **`ReplacePronouns`** — named in the 1998 patent grammar [spec §6] and its worked example
  `Remember ?WhatUserMeant is Compute ReplacePronouns of ?WhatUserSaid;`. **Zero uses in the
  archive.** MrMind3 does its pronoun inversion by hand instead, with a `Sequence Topic` of
  string rewrites — `Mrmind3/Activities/ategag.n:16-44` (see §7.2). Do not implement.

### 3.4 `?WhatUserMeant`

`?WhatUserMeant` is a **built-in, script-writable** attribute. It is not computed by the
engine beyond its initial value; the StdQuestion library owns it. The library's own comment
is the authoritative statement — `Library/StdQuestion/combis/QuesResDebug.us.n:132-141`,
verbatim:

```
Priority Topic "Find ?WhatUserMeant" is
//MemoryLock ?WhatUserMeant;
	Always
	// ?WhatUserMeant is part of the language.  By default it's set equal to ?WhatUserSaid.
	// ?WhatUserSaid cannot be modified, but we can 'clean up' ?WhatUserMeant to make it easier
	// to match on.

	// first the paranoia thing to protect us from any interference by code inserted before this.
	Remember ?WhatUserMeant is ?WhatUserSaid;
```

The pipeline that follows, in the build, in execution order:

```
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
			…                                          (* five nested retries *)
		Remember ?UnProcessedString is ?WhatUserMeant;
	Continue
EndTopic
```

Then `Priority topic "find ?ProcessedString"` copies `?UnProcessedString` into
`?ProcessedString` and strips meaningless leaders, and quote-stripping runs at
`QuesResDebug.us.n:443-458`.

Because `Find ?WhatUserMeant` is a **Priority** topic and Priority topics run first, in
manifest order [spec §11], and because `QuesResDebug.us.n` is the 8th of 49 files, every
build file listed after it sees the cleaned value. Two Mrmind3 files exploit this by adding
their own Priority rewrites _after_ the library — `Mrmind3/Activities/ategag.n:1-5`
(file 15 of 49), verbatim:

```
Priority topic "hate" is
	If ?WhatUserMeant matches "*hate*" then
		Remember ?WhatUserMeant is *1+" ate "+*2;
	continue
EndTopic
```

215 references to `?WhatUserMeant` archive-wide; **63 in the build**, of which 6 are writes
(`Remember ?WhatUserMeant is …`) and the remaining 57 are reads on the condition side.

**Port requirements.** (1) `?WhatUserSaid` is engine-set and read-only. (2) `?WhatUserMeant`
is initialised to `?WhatUserSaid` at the start of every run and is freely writable.
(3) The rewrite pipeline is _script_, not engine — implement it by running the scripts, not
by hard-coding it. (4) `MemoryLock` on it is deliberately commented out (see §3.5) so it is
reset each run.

### 3.5 `MemoryLock`

```ebnf
memorylock = "MemoryLock" , memref , { "," , memref } , ";" ;
```

A **top-level declaration**, not a command — it appears outside category bodies (or
immediately after a category header). 132 occurrences, 33 in the build, **all inside
`Library/StdQuestion/*`**; Mrmind3's own files never use it.

The name is not in any patent BNF [spec §6], so semantics must come from usage. Every locked
attribute is a `?Previous…` slot or a question/statement flag whose value must **survive
the automatic per-run reset** that the StdQuestion library performs on the non-`Previous`
versions. `Library/StdQuestion/StdQuestion.us.n:295-310`, verbatim opening:

```
// I don't know how useful these are actually going to be,
// but they are easy to provide and they are *potentially*
// useful, so.....

MemoryLock
?PreviousAnyStatement,        ?PreviousCanQuestion,        ?PreviousMethodQuestion,
?PreviousWhoQuestion,         ?PreviousWhatIfQuestion,     ?PreviousLocationQuestion,
?PreviousReasonQuestion,      ?PreviousShouldQuestion,     ?PreviousTimeQuestion,
…
```

and the single-attribute form, `StdQuestion.us.n:429,887,928,991,1033,1071,1126`:

```
MemoryLock ?AnyStatement;
MemoryLock ?CanQuestion ;
MemoryLock ?MethodQuestion ;
```

_Semantics (best reading of the evidence, labelled as such):_ `MemoryLock ?X` declares `?X`
persistent for the conversation — it is exempt from whatever automatic clearing the runtime
applies between inputs, and can only be changed by an explicit `Remember`/`Forget`. The
strongest supporting evidence is the deliberately commented-out
`//MemoryLock ?WhatUserMeant;` in `QuesResDebug.us.n:133`: the author _wanted_ it and turned
it off, immediately above the line that re-derives `?WhatUserMeant` from scratch every run.
**This is an inference, not a documented fact — listed in §9.**

_Port recommendation:_ mark these 33 attributes as sticky and never auto-clear them. Since
the port's scripts already `Forget` and `Remember` explicitly, the practical difference is
nil for MrMind3; implement it as a no-op registry and revisit only if a divergence appears.

### 3.6 `Attribute … Specificity`

```ebnf
attrdecl = "Attribute" , memref , "Specificity" , integer , ";" ;
```

132 occurrences (33 in the build), all in `Library/StdQuestion/StdQuestion.us.n:60-71`
and its `combis` copy. Not an output command, but it lives in the same declaration space:

```
Attribute ?CanQuestion            Specificity 3000;
Attribute ?DescriptionQuestion    Specificity 3000;
Attribute ?WhoQuestion            Specificity 5000;
Attribute ?AnyQuestion 			  Specificity 2500;
```

Feeds the best-fit response selection [spec §14] and example verification [spec §7].
Belongs to the selection section; recorded here for completeness of the declaration grammar.

### 3.7 `Expires`

```ebnf
expires = "Expires" , string , ";" ;
```

"Expires is a non-executable statement that produces a warning when compiled after a certain
date" [spec §6]. **Zero uses in the build**; 10 in `Base/`.
`Base/Inanities/Capabilities.n:1559`: `Expires "22 July 1999";`

The archive contains the actual compiler output, `Base/Base.log` (build of 11/15/04):

```
WARNING: in file Inanities\Capabilities.n line 1559: Expired information: Topic 'Are you a big bot' expired on 22 July 1999
WARNING: in file Inanities\Personality.n line 1654: Expired information: Topic 'you are almost two years old' expired on July 10 1999
```

Date strings are free-form and inconsistent (`"22 July 1999"`, `"May 22 1999"`,
`"July 10 1999"`). The statement has **no runtime effect**: an expired topic still runs.
Implement as a compile-time warning only, or ignore.

---

## 4. Attention / suppression commands

### 4.1 `Focus`

```ebnf
focus = "Focus" , catname , { "," , catname } , ";" ;
```

11 uses in NeuroScript, **7 in the build**. Arguments are **category (topic) names**, quoted.
`Mrmind3/Humans&Machines/Machines.n:78`: `Focus "Humans Are";`
(and `Mrmind3/Humans&Machines/Humans.n:1`: `Topic "Humans Are" is`).

The build's seven sites, exhaustively: `Mrmind3/AboutUser/UserMind.n:106`
(`Focus "predictability human or machine?";`), `Mrmind3/Customization/ProfanityCustomize.n:121,138`,
`Mrmind3/Humans&Machines/Machines.n:78`, `Mrmind3/Issues/Emotion.n:259`,
`Mrmind3/Issues/TrustTruth.n:50,74`. No multi-argument `Focus` occurs anywhere in the archive.

**Effect** [spec §11]: append the named categories to `RunTime->FocusList`; at the end of the
run `Refocus()` moves each to the front of the attention-focus list. The documented result is
that the first argument ends up first. Focusing has no effect until the run ends.

### 4.2 `Focus Subjects`

```ebnf
focussubjects = "Focus" , "Subjects" , string , { "," , string } , ";" ;
```

93 uses in NeuroScript, **62 in the build** — the dominant form, roughly nine times commoner
than plain `Focus`. Arguments are **subject strings**, matched case-insensitively against the
`Subjects` declarations of categories. `Mrmind3/Humans&Machines/Convincing.n:114`:
`Focus Subjects "HEX";` against `Mrmind3/Humans&Machines/Machines.n:231`: `Subjects "HEX";`

**Effect** [spec §11]: append every category that declares at least one of the named subjects
to `FocusList`.

MrMind's authors habitually use a whole sentence as a subject name, so a subject often names
exactly one follow-up topic. `Mrmind3/Issues/Emotion.n:46` and `:106`:

```
			Focus Subjects "Do you emote towards your computer?";
Subjects "Do you emote towards your computer?";
```

**Multi-argument form: exactly one occurrence in the whole archive.**
`Mrmind3/Defaults/Defaults.n:159`:

```
		Focus Subjects "HELP", "WantSomePointers";
```

The port may special-case it.

### 4.3 `DontFocus`

```ebnf
dontfocus = "DontFocus" , ";" ;
```

84 uses, **58 in the build** — very common. Takes no arguments. Suppresses the automatic
focus that any output command would otherwise trigger, for the block it appears in
[spec §11]: "This behavior can be overridden by including the command DontFocus in any of
the blocks that should not trigger the automatic focus mechanism."

Typical, `Mrmind3/Issues/Emotion.n:24-29`:

```
		DontFocus;
		IfChance then
			DontFocus;
			Say "That is an emotional state. <BR>If I could recognize and respond <BR>to your emotional state would you <BR>feel differently about me?";
			Focus Subjects "would you feel different about me if I responded to emotions?";
		Done
```

Note the idiom: `DontFocus` (suppress _self_-focus) immediately followed by an explicit
`Focus Subjects` (focus the intended _follow-up_). The port must keep these independent:
`DontFocus` clears only the auto-focus flag, not the explicit `FocusList` entries.

Position within the block does not matter — the flag is read at the end of `CCategory::Run`.

### 4.4 `Suppress`

```ebnf
suppress = "Suppress" , ( "This" | catname { "," , catname } ) , ";" ;
```

60 uses, **37 in the build**. Two forms, and the bare-word form dominates: **51 `Suppress This`**
vs 9 `Suppress "<name>"`.

`Suppress This;` — suppress the _enclosing_ category. This is the one-shot idiom: the whole
of `Mrmind3/Defaults/OneShots.n` is built from it (`OneShots.n:9,18,28,37,46,57,…`).
`Mrmind3/Utilities/WebNameGreet.n:874-877`:

```
	Always
		InitialExample 1 "hi";
		Suppress This;
		SwitchTo "Robot Greeting";
```

`Suppress "<name>";` — `Mrmind3/Utilities/WebNameGreet.n:857`: `Suppress "Login from Console";`

**Effect** [spec §11]: "an explicit command that disables the activation of the categories
named in the command for the remainder of the course of conversation with that user … even
if an explicit Focus command would purport to move it to the front of the attention focus
list." Suppression is **per user** and **persists across inputs** for the whole conversation.

`This` is a keyword, case-insensitive in practice (`Suppress this;` and `Suppress This;`
both occur).

### 4.5 `Recover`

```ebnf
recover = "Recover" , catname , { "," , catname } , ";" ;
```

**Exactly one occurrence in the entire archive**: `Base/Utilities/EmailCapture.n:160`:

```
		Recover "report email addresses";
```

Zero in the build. Reverses `Suppress` [spec §6]. Implement for completeness; it will never
fire in MrMind3.

---

## 5. Control-transfer commands

These interact with the run loop [spec §11]; only their command-level surface is specified
here.

### 5.1 `SwitchTo` / `SwitchBack`

```ebnf
switchto   = "SwitchTo" , string , ";" ;
switchback = "SwitchBack" ;
```

`SwitchTo` 578 uses (build 134); `SwitchBack` 1,228 (build 286). **All 577 `SwitchTo`
arguments in NeuroScript are quoted strings** — the `SwitchTo <symbol>` form allowed by the
1997/1998 grammars [spec §6] is never used. No `SwitchToOneOf` anywhere.

`SwitchTo` transfers control to the named category immediately, pushing a return
continuation; `SwitchBack` (a block terminator, not a command with arguments) pops it
[spec §11]. Cycle guard: switching to an already-executed **non-Sequence** category in the
same run returns `RunTimeError` and aborts the run, clearing both continuation stacks; a
**Sequence** category may be re-entered. The build depends on that — `QuesResDebug.us.n:154-163`
switches to the same Sequence topic five times in one run:

```
	Forget ?StdP.DoneStrippingPunctuation;
	SwitchTo "Remove excess punctuation";
		If DontRecall ?StdP.DoneStrippingPunctuation
		then SwitchTo "Remove excess punctuation";
			If DontRecall ?StdP.DoneStrippingPunctuation
			then SwitchTo "Remove excess punctuation";
```

### 5.2 `WaitForResponse`

```ebnf
waitforresponse = "WaitForResponse" , ";" ;
```

158 uses (build 89). Halts the run like `Done`, but stores a continuation so the **next**
input resumes at the following statement [spec §6]. The continuation is activated
immediately after the Priority categories on the next run [spec §11].

Canonical build example, `Mrmind3/Activities/UserSurvey.n:33-41`:

```
Sequence topic "Exit Survey" is
Always
	Remember ?NoSurvey;
	Say "Is this the first time you've ever <BR>had a conversation with a piece of <BR>software?";
	WaitForResponse;
	IfRecall ?NoResponse then
		Say "Is this something you do often or <BR>is it relatively rare?";
		WaitForResponse;
```

CDB confirms the resumed sequence (`Exit Survey | Activities\UserSurvey.n:33`, 107 rows over
22 distinct prompts).

And the knock-knock, `Mrmind3/Issues/Humor.n:47-53`:

```
		IfChance then
			Say "Who's there?";  //the straight knockknock game.
			WaitForResponse;
			Say ?WhatUserSaid + " who?";
			WaitforResponse;
			SayOneOf "ha ha!","very funny","great.";
		Continue
```

Case-insensitive: `WaitforResponse` and `WaitForResponse` both occur, in the same block.

### 5.3 `TryAgain`

```ebnf
tryagain = "TryAgain" ;
```

37 uses (build 9). A block terminator. "simply a special case of WaitForResponse in which the
CContinuation starts from the _previous_ WaitForResponse rather than the TryAgain command"
[spec §11]. `Mrmind3/Humans&Machines/Machines.n:203-214`:

```
		Say "Are you trying to talk like a computer?";
		WaitForResponse;
		IfRecall ?YesResponse Then
			Say "Well, how do know that <BR>you aren't a computer that <BR>got its wires crossed?",
			"Maybe you're a computer <BR>trying to talk like a human.";
		Done
		…
		SayOneOf "I didn't get that. <BR>Are you trying to talk <BR>like a computer?",
		"Yes or No?","Well, are you trying <BR>to talk like a computer?";
	TryAgain
```

### 5.4 `InterruptSequence`

```ebnf
interruptsequence = "InterruptSequence" , ";" ;
```

18 uses, **3 in the build** (`Mrmind3/Utilities/WebNameGreet.n:112,130,144`). Legal only
inside a `Sequence` category and only after a `WaitForResponse` [spec §11]. Suspends the
sequence, runs the Standard and Default categories, then resumes inside the sequence without
waiting for further input.

### 5.5 `NextTopic`

```ebnf
nexttopic = "NextTopic" ;
```

34 uses (build 17). A block terminator (class `CNextCategory`): abandon the current category
and continue the run at the next one. `LastTopic` appears in no BNF and has zero uses;
`?LastTopic` (44 uses) is an unrelated _attribute_.

### 5.6 `DisconnectThisUser`

```ebnf
disconnectthisuser = "DisconnectThisUser" , ";" ;
```

7 uses, **1 in the build**. "a command used to terminate an interaction with a user and clear
the user record from the BOT's memory" [spec §6]. `Mrmind3/Utilities/CProfanity.n:69-72`:

```
		If ?ProfanityStrikes matches STDX.PROFANITY_LIMIT then
			SayOneOf STDX.YOUREBUSTED; // "I will have to disconnect you now because of your continued use of profanity.";
            DisconnectThisUser;
		Done
```

The output buffered before it must still be delivered (the `SayOneOf` on the preceding line
is the goodbye). Port: flush the buffer, then reset the user record and end the session.

### 5.7 The account family and `Get … from PLUGIN`

`LoginAs`, `ChangeAccountName`, `ChangeAccountPassword`, `ChangeAccountEmail`,
`RetrieveAccountInfo`, `DestroyUserAccount`, `CreateUserAccount`, `CreateThisUserAccount`
[spec §6] — **zero uses anywhere in the archive**, despite `CLoginAction` existing in the
compiled objects. Do not implement.

`Get <memref> from PLUGIN <string> where INPUT <name> is <patlist>;` — 5 uses, all in
`HttpExample/httpex.n`, which is not part of any MrMind build.
`HttpExample/httpex.n:35-38`:

```
        Get ?Result from PLUGIN "HTTP" where
            INPUT URL is "http" + *1;
        Say "Below is my local copy of that page.";
        ShowTemplate "Html/Template.htm" in "Display";
```

Not in any patent BNF. Out of scope for the port.

---

## 6. Verification statements (`Example` family)

These have **no runtime effect** on a conversation — "Example statements do not have any
immediate effect, but are used in automatic verification" [spec §6] — but they must be
parsed, and a port that wants a regression suite should implement the verifier
[spec §15].

### 6.1 `Example`

```ebnf
example         = [ "WhenFocused" ] , "Example" , patlist , ";"
                | "When" , whencond , { "and" , whencond } , "Example" , patlist , ";" ;
whencond        = [ "Focused" , "and" ] , memref , "is" , patlist ;
```

545 uses in the build, 1,133 in NeuroScript. **All are single-argument** — the multi-argument
`<patlist>` form allowed by the grammar never occurs.

Placement convention: first statement inside the `Then` block, before the `Say`.
`Mrmind3/Issues/Emotion.n:1-6`:

```
Topic "Affect" is
Subjects "EMOTIONS";
	IfHeard ("Affect#" or "effect#") then
	Example "What affects you?";
	SayOneOf "I wonder what effect <BR>I have on you?", "How do I affect you?";
	Done
EndTopic
```

**Edge case: `Example "";` — 66 of the build's 545 Examples (12%), 73 archive-wide.** Used in
blocks that can only be reached by a preceding `WaitForResponse`/`?WhatRobotSaid` test and
therefore have no standalone trigger input. `Mrmind3/Defaults/Answers.n:374-382`:

```
Topic "Ashamed" is
Subjects "Default Answers", "ALIFE";
	If ?WhatRobotSaid matches "Do you think that machines will <BR>ever be ashamed of their human <BR>origins?"
	Then
		Example "";
		Remember ?UserAshamed is ?WhatUserSaid;
		SayToFile "C:\Program Files\NativeMinds\TextFiles\Ashamed.txt" ?Name + ?IPaddress+ " says: " + ?UserAshamed;
		Say "Can you please elaborate?";
	Done
EndTopic
```

`Mrmind3/Defaults/Answers.n` alone holds 36 of them. A verifier must skip empty examples,
not run them as empty input.

`WhenFocused Example "…";` — 14 uses. Runs the example only from the state in which the
associated topic is already the focus. `Mrmind3/Humans&Machines/Humans.n:226,243`:

```
		WhenFocused Example "I sure do";
		WhenFocused Example "Not really.";
```

`When <memref> is <patlist> [and …] Example "…";` — the guarded form.
**One occurrence in the build**, `Mrmind3/Utilities/CProfanity.n:128-129`:

```
		When ?LastTopic is "Tsk Tsk"
		   Example "why";
```

and 11 elsewhere, e.g. `Base/Utilities/LearningDemo.n:95-96`:

```
		When ?DEFINED1 is "turbot" and ?DEFINITION1 is "fish"
			Example "What is a turbot";
```

### 6.2 `OtherExamples`

```ebnf
otherexamples = "OtherExamples" , "of" , string , [ "WhenFocused" ] , "are" , patlist , ";" ;
```

Class `CExampleRephrasing`. A **top-level** declaration (outside any category), associating
extra inputs with an existing `Example` string so they are expected to produce the same
answer [spec §15].

405 uses (build 182). Of the 399 in NeuroScript, **53 carry `WhenFocused`**. The `are`
keyword is present in all but 6 malformed instances that omit it. Case varies freely
(`OtherExamples`, `Otherexamples`, `whenfocused`, `WhenFocused`, `Whenfocused`).

`Mrmind3/Humans&Machines/Machines.n:104-106`:

```
OtherExamples of "Computers don't understand." are
	"Computers don't really understand.",
	…
```

`Mrmind3/Issues/Emotion.n:138`:

```
OtherExamples of "Why do you care whether I emote my computer?" WhenFocused are
```

Argument-count distribution in the build: 1 alt 77, 2 alts 42, 3 alts 33, 4 alts 19,
5 alts 6, 6 alts 2, 7 alts 2, 8 alts 1, 10 alts 1.

### 6.3 `InitialExample`

```ebnf
initialexample = "InitialExample" , integer , string , ";" ;
```

15 uses, **2 in the build**. The integer is the ordering index; exactly one string argument
is allowed [spec §15]. `Mrmind3/Utilities/WebNameGreet.n:875` and `:86`:

```
		InitialExample 1 "hi";
		 	InitialExample 2 "My name is Fred";
```

These bootstrap the verifier's user state (greeting, then name capture) before any ordinary
example runs. Indexes must be unique.

### 6.4 `SequenceExample`

In the 1998 BNF [spec §6] but **zero occurrences**; the prose form uses dotted indexes on
plain `Example` (`Example 170.yes "Yes";`), which also never appear in the archive. Do not
implement.

---

## 7. Worked examples, verbatim

### 7.1 Full topic exercising ten different commands

`Mrmind3/Issues/Humor.n:1-25`, verbatim:

```
//see Reactions/compliments.n for reactions to 'lol', 'haha' etc

Topic "I Laugh" is
SUBJECTS "Humor";
	If (?FactStatement contains "I" and ("Laugh", "funny"))
		or (?IsStatement contains "I" and ("Laugh","funny","joking"))
		or (?AnyStatement contains I+"Laugh", I + "have to"+"Laugh")
		or (?AnyStatement contains I+"*"+HUMOR)


	Then
		Remember ?UserHasClaimedHumor;
//		switchTo "show gif";

		Example "I can laugh.";
		SayOneOf "Tell me a human joke.",
		"Say something that a human <BR>would think is funny.",
		"Say something that makes you laugh.";
		WaitForResponse;
			Remember ?UserJoke is ?WhatUserSaid;
			SayToFile "C:\Program Files\NativeMinds\TextFiles\Joke.txt" ?Name + ?IPaddress+ " says: " + ?UserJoke;
			SayOneOf "ha ha!", "great!";
		Done

EndTopic
```

Traced against the CDB (lines 1547-1550) and against the archived
`Mrmind3old/TextFiles/Joke.txt`:

```
U: I laugh
M: Tell me a human joke.    [I Laugh | Issues\Humor.n:2]
U: haha
M: ha ha!    [I Laugh | Issues\Humor.n:2]
```

```
User169.254.225.224 says: this is a joke
```

One `SayOneOf` alternative chosen; `WaitForResponse` resumed on the next input;
`?Name + ?IPaddress` concatenated with no separator into the append-only text file.

### 7.2 Hand-rolled pronoun inversion (no `ReplacePronouns`)

`Mrmind3/Activities/ategag.n`, verbatim in full — the whole file, and the best single
illustration of `Remember` with star buffers driving a `Sequence Topic`:

```
Priority topic "hate" is
	If ?WhatUserMeant matches "*hate*" then
		Remember ?WhatUserMeant is *1+" ate "+*2;
	continue
EndTopic

Topic "ate" is
	Subjects "FOOD","JEST";
	If ?WhatUserMeant matches "*ate*" then
	Example "I hate rabbits.";
	SwitchTo "Invert";
	Continue
EndTopic


Sequence Topic "Invert" is
	Always
		Remember ?Outstring is ?WhatUserMeant;
	  //this relies on zink, zlink, and pkink being "words" that cannot be entered through the
	  //spell checker. and it won't change more than 2 of each.

		if ?OutString Matches "*I*" then Remember ?OutString is *1 + " zink " + *2; Continue
		if ?OutString Matches "*I*" then Remember ?OutString is *1 + " zink " + *2; Continue
		if ?OutString Matches "*my*" then Remember ?OutString is *1 + " pkink " + *2; Continue
		if ?OutString Matches "*my*" then Remember ?OutString is *1 + " pkink " + *2; Continue
		if ?Outstring Matches "*I'm*" then remember ?OutString is *1 + " zlink " + *2; Continue
		if ?Outstring Matches "*I'm*" then remember ?OutString is *1 + " zlink " + *2; Continue

		if ?OutString Matches "*you*"  then Remember ?OutString is *1 + " I " + *2; Continue
		if ?OutString Matches "*you*"  then Remember ?OutString is *1 + " I " + *2; Continue
		if ?Outstring Matches "*your*" then remember ?OutString is *1 + " my "+ *2; Continue
		if ?Outstring Matches "*your*" then remember ?OutString is *1 + " my "+ *2; Continue
		if ?Outstring Matches"*you're*"then remember ?OutString is *1 +" I'm "+ *2; Continue
		if ?Outstring Matches"*you're*"then remember ?OutString is *1 +" I'm "+ *2; Continue

		if ?OutString Matches "*zink*" then Remember ?OutString is *1 + " you "  + *2; Continue
		if ?OutString Matches "*zink*" then Remember ?OutString is *1 + " you "  + *2; Continue
		if ?OutString Matches"*pkink*" then Remember ?OutString is *1 + " your " + *2; Continue
		if ?OutString Matches"*pkink*" then Remember ?OutString is *1 + " your " + *2; Continue
		if ?OutString Matches"*zlink*" then Remember ?OutString is *1 +" you're "+ *2; Continue
		if ?OutString Matches"*zlink*" then Remember ?OutString is *1 +" you're "+ *2; Continue
		if ?Outstring matches "*," then remember ?Outstring is *1; Continue
		Say ?Outstring+"?";
	Done
EndTopic
```

Note `Matches"*zink*"` with no space before the string — the lexer must not require
whitespace between a keyword and a string literal.

### 7.3 The greeting chain (Sequence + SwitchTo + Suppress + InitialExample)

`Mrmind3/Utilities/WebNameGreet.n:873-890`, verbatim:

```
Priority Topic "Login from Console" is
	Always
		InitialExample 1 "hi";
		Suppress This;
		SwitchTo "Robot Greeting";
	Done
EndTopic




Sequence Topic "Robot Greeting" is
	Always
       SayOneOf STDW_WebGreetingFirstHalf +MYNAME+ STDW_WebGreetingSecondHalf;
	   Remember ?RobotName is MYNAME;
	   SwitchTo "Name Capture";
	Done
EndTopic
```

CDB, connection 1, lines 3-6:

```
M: Hi, my name is MRMIND    [Robot Greeting | …\WebNameGreet.n:864]
M: What is your name?    [Name Capture | …\WebNameGreet.n:36]
U: peggy
M: Hi Peggy! Can you convince me that you are human?    [Name Capture | …\WebNameGreet.n:36]
```

Two `SayOneOf`s in two categories in one run → two `M:` rows; the `<B>` and `<BR>` tags in
the source strings are absent from the log rows.

---

## 8. Edge cases the port must handle

1. **`Say` with commas is two utterances, `Say` with `+` is one.** Proven in §2.1. Getting
   this backwards changes 4 build topics.
2. **`Say "…" + ,` (a `+` immediately followed by `,`)** — `Mrmind3/Issues/Misc.n:69` and
   `Mrmind3old/Issues/Misc.n:67`. Malformed; parse as `,` and warn, or hard-code as `+`.
3. **`Example "";`** — 66 in the build. Parse fine, skip in verification.
4. **`SayToFile` has no separator between path and content.** `SayToFile <pat> <patlist>;`
   Do not parse the path as the first element of a comma list.
5. **`Compute Sum of ?X, "1"`** — inside `Compute`, commas separate function arguments.
   Everywhere else, a top-level comma is a list union.
6. **Case-insensitivity everywhere**: `SayoneOf`, `SaytoConsole`, `WaitforResponse`,
   `remember`, `compute uppercase`, `Otherexamples`, `whenfocused`, `Suppress this`,
   `endtopic` all occur. `?name` and `?Name` are the same slot.
7. **No whitespace required around string literals or `+`**: `Matches"*zink*"`,
   `"*"+NUMBER+"*"`, `?IPaddress+ " says: "`.
8. **Windows backslash paths are not escapes.** Only `\"` is a string escape; the pattern
   metacharacter escapes (`\. \? \! \, \* \+ \- \/ \( \) \'`) matter on the condition side.
9. **Latin-1, not UTF-8.** `Mrmind3/AboutMrMind/MMIdentity.n` contains `0xE9`.
10. **CRLF line endings** in every `.n` file; the archived `SayToFile` outputs are CRLF too.
11. **Four zero-length `.n` files** (§0). Two are outside the build; do not fail the loader,
    but do report them.
12. **`Suppress This`** — `This` is a keyword, not a category name.
13. **`Focus Subjects "A", "B"`** — one occurrence archive-wide
    (`Mrmind3/Defaults/Defaults.n:159`).
14. **`Recover`** — one occurrence archive-wide, and not in the build.
15. **Multi-line statements.** Statements freely span lines; only `;` terminates. A
    `MemoryLock` in the build spans 14 lines with 33 attributes
    (`QuesResDebug.us.n` copy of `StdQuestion.us.n:299`).
16. **Unbalanced quotes.** Five files contain a line with an odd number of `"` after comment
    stripping: `Library/StdQuestion/StdQuestion.us.n:484`,
    `Library/StdQuestion/combis/QuesResDebug.us.n:444` (both copies of each), and
    `Mrmind3/Defaults/Answers.n:344,351`. A naive line-based lexer will mis-scan; a
    string-aware one that treats `"` as toggling and `\"` as literal handles them.
17. **`//` comments inside string literals must not be stripped** — URLs such as
    `"SHOW SRC=http://peggysplace/…"` and `?SayPageTemplate` values contain `//`.
18. **`Do` is never called** but `CDo` exists; a topic may contain only a commented-out `Do`.
19. **Auto-focus is triggered by output commands** (`Say*`, `Do*`), including `SayOneOf`.
    It is **not** triggered by `SayToConsole`, `Trace`, or `SayToFile`
    [spec §11: "any output command (currently all variants of "Say" or "Do")"] — but see §9.
20. **Sequence categories are never auto-focused** [spec §11]. `Robot Greeting`,
    `Exit Survey`, `Invert` are all Sequence topics that `Say`.

---

## 9. Unresolved

Ordered by how much they can change observable output.

1. **Is `SayOneOf` uniform?** The patents say only "nondeterministically select". The CDB's
   104-fire greeting sample is 65/14/13/12 over four alternatives with 48/103 adjacent
   repeats, which is not uniform-iid — but the log spans nine months of continuous script
   editing, so the alternative set was not fixed. _Hypothesis:_ uniform random over the
   evaluated list, chosen fresh per execution; the skew is a corpus artefact. Implement
   uniform, seedable.
2. **Cross-product enumeration order for `A + B`** when both are multi-valued. Does not
   affect the build (no multi-valued `Say` concat survives). _Hypothesis:_ row-major,
   right-most varying fastest.
3. **The joiner in `EverythingRobotJustSaid` / `[[EverythingRobotJustSaidHTML]]`.** Multiple
   utterances are concatenated, but no archive artefact shows the separator. _Hypothesis:_
   `<BR>` for the HTML form. Make it a single constant.
4. **`MemoryLock` semantics.** Not in any patent BNF. _Hypothesis (§3.5):_ declares an
   attribute exempt from the runtime's between-input clearing. Supporting evidence: it is
   applied only to `?Previous…` slots and question flags, and
   `//MemoryLock ?WhatUserMeant;` is commented out immediately above the line that
   recomputes `?WhatUserMeant` every run. A no-op registry is behaviourally safe for
   MrMind3.
5. **`SpellCheck`.** Requires the Wintertree engine plus `Ssceam.tlx` / `Ssceam2.clx` /
   `Additions.tlx` / `MRMIND3.tlx`, which are present as binaries in `Program/` and
   `Mrmind3/` but not decoded here. A no-LLM port must either reimplement it or make it the
   identity; the latter degrades typo tolerance but does not break any topic
   (`ategag.n`'s sentinel words still work).
6. **`Capitalize`: per-word or first-letter-only?** The build always lower-cases first, so
   the two are indistinguishable from evidence. _Hypothesis:_ per-word.
7. **`ratio` rounding.** One call site, no CDB row exercising it. _Hypothesis:_ integer
   division on decimal-string operands, matching `Sum`/`difference`/`product`.
8. **Does `SayToFile` set the auto-focus flag?** The patent phrase is "all variants of
   "Say"", which literally includes `SayToFile`, `SayToConsole` and `Trace`; the intent
   ("any output command") clearly means user-visible output. _Hypothesis:_ only `Say`,
   `SayOneOf` (and `Do`/`DoOneOf`, `Show*`) set it. Divergence would show up as spurious
   focus on `Mrmind3/Defaults/Answers.n`'s 36 `SayToFile` topics, but each of those also
   contains a real `Say`, so the build cannot distinguish the two readings either.
9. **Whether `<BR>` stripping in the CDB was done by NeuroServer when writing the log, or by
   the modern extraction script.** The evidence (371 delete vs 5 space matches, and the
   literal `thatmachines`) fixes _what the archived text looks like_, not _who did it_.
   Immaterial to the port: `<BR>` is literal output text either way.
10. **`Show`'s `in <frame>` clause** — always present in the 28 archive uses, optional in the
    patent BNF. Irrelevant to MrMind3 (0 uses).
11. **The 50th build file.** `MRMIND3.vsr` `[FILES]` lists 49 entries, not the 50 stated in
    the brief. All 49 resolve on disk. If a 50th existed it is not in the manifest.

---

## 10. Consolidated EBNF for this dimension

```ebnf
(* ---- declarations, top level ---- *)
decl        = patlistdecl | patterndecl | attrdecl | memorylock | otherexamples ;
patlistdecl = "PatternList" , ident , "is" , patlist , ";" ;
patterndecl = "Pattern"     , ident , "is" , patlist , ";" ;
attrdecl    = "Attribute" , memref , "Specificity" , integer , ";" ;
memorylock  = "MemoryLock" , memref , { "," , memref } , ";" ;
otherexamples = "OtherExamples" , "of" , string , [ "WhenFocused" ] , "are" , patlist , ";" ;

(* ---- commands, inside a category body ---- *)
command =
    "Say"            , patlist , ";"
  | "SayOneOf"       , patlist , ";"
  | "SayToConsole"   , patlist , ";"
  | "Trace"          , patlist , ";"
  | "SayToFile"      , patlist , patlist , ";"       (* path, then content; no separator *)
  | "Show"           , patlist , [ "in" , patlist ] , ";"
  | "ShowTemplate"   , patlist , [ "in" , patlist ] , ";"
  | "Do"             , patlist , ";"                 (* unused in archive *)
  | "DoOneOf"        , patlist , ";"                 (* unused in archive *)
  | "Remember"       , assign , { "," , assign } , ";"
  | "Forget"         , memref , { "," , memref } , ";"
  | "Focus"          , "Subjects" , string , { "," , string } , ";"
  | "Focus"          , catref , { "," , catref } , ";"
  | "DontFocus"      , ";"
  | "Suppress"       , ( "This" | catref { "," , catref } ) , ";"
  | "Recover"        , catref , { "," , catref } , ";"
  | "SwitchTo"       , string , ";"
  | "WaitForResponse", ";"
  | "InterruptSequence" , ";"
  | "DisconnectThisUser" , ";"
  | "Expires"        , string , ";"
  | example ;

assign  = memref
        | memref , "is"      , patlist
        | memref , "IsOneOf" , patlist
        | memref , "is" , "Compute" , fnname , "of" , patlist ;

fnname  = "SpellCheck" | "URLEncoding" | "Capitalize" | "UpperCase" | "LowerCase"
        | "Sum" | "Difference" | "Product" | "Ratio" ;   (* only these occur *)

example = [ "WhenFocused" ] , "Example" , patlist , ";"
        | "When" , whencond , { "and" , whencond } , "Example" , patlist , ";"
        | "InitialExample" , integer , string , ";" ;
whencond = [ "Focused" , "and" ] , memref , "is" , patlist ;

(* ---- block terminators (control flow; listed for completeness) ---- *)
terminator = "Done" | "Continue" | "SwitchBack" | "TryAgain" | "NextTopic" ;

(* ---- argument atoms ---- *)
patlist  = concat , { "," , concat } ;
concat   = atom , { "+" , atom } ;
atom     = string | memref | starbuf | ident | "(" , patlist , ")" ;
memref   = "?" , ident ;
catref   = string ;
starbuf  = ( "*" | "#" | "^" ) , digit ;
ident    = ( letter | "_" ) , { letter | digit | "_" | "." } ;
string   = '"' , { char - '"' | '\\' , any } , '"' ;
```

All keywords, identifiers, and the `This` / `Focused` markers are case-insensitive.

# NeuroScript 2.2 — Conditions, Boolean Composition, Otherwise, and Block Terminators

**Implementation specification for the MrMind JavaScript port. Dimension C: conditions.**

Authority order used throughout: (1) the archive (ground truth), (2) the patent-derived
spec `archive/_research/patents/GERBIL-LANGUAGE-NOTES.md`, cited as `[spec §N]`,
(3) compiled `.nso` artefacts (corroboration only). Where they disagree the archive wins
and the disagreement is called out in §14.

---

## 1. Corpora, method, and headline counts

Two corpora are used. Every count in this document names which one it comes from.

**BUILD** — the 49 source files listed in the `[FILES]` section of
`mrmind/archive/1_NeuroServer_fromVaio_MrMind/NeuroScript/Mrmind3/MRMIND3.vsr`,
resolved case-insensitively (48 under `Mrmind3/`, 1 under `Library/` —
`Library/StdQuestion/combis/QuesResDebug.us.n`). This is the bot that shipped.

**ALL** — every non-empty `.n` file under
`mrmind/archive/1_NeuroServer_fromVaio_MrMind/NeuroScript/`
(180 files: BUILD + `MrMind/`, `Mrmind3old/`, `Base/`, `Library/`, `Copy of Library/`, `HttpExample/`).

Four `.n` files in the tree are **zero bytes** (damaged-disk artefacts, not empty scripts).
None is in the build manifest. No `.n` file contains NUL bytes.

```
Mrmind3/Activities/picutres.n          0 bytes
Mrmind3/AboutMrMind/MMfamily.n         0 bytes
Mrmind3old/Answering.n                 0 bytes
Mrmind3old/AboutMrMind/MMfamily.n      0 bytes
```

A tokeniser + block parser + condition parser was written for this analysis
(scratchpad `nlex.py` / `parse.py` / `cond.py`). It parses **4543 of 4543** conditional
blocks in ALL with **zero unterminated blocks** and **zero condition parse failures**,
so the grammar in §5 is known to cover the whole archive, not just a sample.

### 1.1 Structural totals

|                                  | BUILD                | ALL      |
| -------------------------------- | -------------------- | -------- |
| categories                       | 691                  | 1646     |
| conditional blocks               | 1485                 | 4543     |
| blocks introduced by `Otherwise` | 107                  | 375      |
| max block nesting depth          | 6 levels (depth 0–5) | 6 levels |
| unterminated blocks              | 0                    | 0        |

Category types in BUILD: 559 standard `Topic`, 61 `Sequence Topic`, 38 `Default Topic`,
30 `Priority Topic`, 3 `Priority Scenario`. No non-priority `Scenario`, no `Suppressed`
category header in BUILD.

### 1.2 Block-head census (the six condition-block openers)

| head keyword          | BUILD | ALL   |
| --------------------- | ----- | ----- |
| `If … Then`           | 1035  | 3088  |
| `IfRecall … Then`     | 183   | 684   |
| `Always` (no `Then`)  | 123   | 567   |
| `IfChance [arg] Then` | 102   | 119   |
| `IfHeard … Then`      | 32    | 73    |
| `IfDontRecall … Then` | 10    | 12    |
| `IfNotHeard`          | **0** | **0** |

`Always` is the only head that is **never** followed by `Then` (0 occurrences of
`Always Then` in ALL). Every other head is followed by `Then` — 1362 heads, 1362 `Then`
tokens in BUILD, exact match.

**There is no bare-clause block head.** No block anywhere in ALL begins with
`Heard`, `NotHeard`, `Recall`, `DontRecall`, `Focused` or `Chance` without an `If`.
Lines that look like one are always continuation lines of a multi-line condition
(e.g. `Mrmind3/Humans&Machines/Bots.n:95-97`) or an `If` alone on the previous line
(`Mrmind3/Utilities/WebNameGreet.n:931-932`).

### 1.3 Condition-clause census

Counts are of clause nodes in the parsed condition trees.

| clause                                            | BUILD | ALL   | notes                                   |
| ------------------------------------------------- | ----- | ----- | --------------------------------------- |
| `<pat> Contains <matchlist>`                      | 798   | 1637  |                                         |
| `<pat> Matches <matchlist>`                       | 570   | 1837  |                                         |
| `Heard <matchlist>` (≡ `?WhatUserMeant Contains`) | 183   | 422   |                                         |
| `IfRecall <memlist>`                              | 186   | 689   | head form + 3 nested                    |
| `Recall <memlist>`                                | 168   | 414   |                                         |
| `IfChance` head clause                            | 102   | 119   | 61 bare / 41 with arg (BUILD)           |
| `Focused`                                         | 96    | 156   |                                         |
| `NotHeard <matchlist>`                            | 84    | 156   |                                         |
| `DontRecall <memlist>`                            | 59    | 277   |                                         |
| `IfHeard <matchlist>`                             | 40    | 84    | head form + 8 nested                    |
| `<pat> DoesNotMatch <matchlist>`                  | 37    | 166   |                                         |
| `<pat> DoesNotContain <matchlist>`                | 11    | 43    |                                         |
| `IfDontRecall <memlist>`                          | 11    | 13    |                                         |
| `IfFocused`                                       | 4     | 8     | **not in the patent grammar**, see §6.9 |
| `<pat> ExactlyMatches <matchlist>`                | **1** | 6     |                                         |
| `Chance <n>` as a clause                          | **1** | 2     |                                         |
| `DoesNotExactlyMatch`                             | **0** | **0** |                                         |

Constructs that occur **exactly once in BUILD**: `ExactlyMatches`
(`Mrmind3/Reactions/Compliments.n:51`), `Chance <n>` as a clause
(`Mrmind3/Utilities/WebNameGreet.n:67`), and the `&` operator
(`Mrmind3/Defaults/Answers.n:285`). Constructs that occur **exactly once in ALL**:
`{ }` wrapped around a whole condition clause (`Base/Utilities/EmailCapture.n:136`).

---

## 2. Lexical preliminaries the condition parser must get right

1. **Line endings are CRLF.** Strip `\r` before any line-based work. Newlines are
   whitespace and carry no syntactic weight inside a condition (see §8).
2. **Comments are `//` to end of line, and nothing else.** All 139 occurrences of `/*`
   in the archive are inside `//` comment banners. Comments may appear _inside_ a
   condition, between operands and even between the last operand and `Then`:
   `Mrmind3/Reactions/Compliments.n:51-53`, `Library/StdQuestion/combis/QuesResDebug.us.n:443-447`.
3. **All keywords are case-insensitive.** The archive proves it exhaustively:
   `If`/`if`, `Then`/`then` (786/576 in BUILD), `Always`/`always`, `Otherwise`/`otherwise`,
   `IfChance`/`Ifchance`/`ifchance`, `Focused`/`FOCUSED`, `NotHeard`/`notheard`/`Notheard`,
   `SwitchBack`/`Switchback`/`switchback`, `DoesNotMatch`/`doesNotMatch`/`doesnotMatch`/`DoesNotmatch`,
   `and`/`AND`/`And`, `or`/`OR`/`Or`, `not`/`NOT`, `CONTAINS`, `RECALL`.
4. **String literals are `"…"` and support a backslash escape `\"`.**
   `Mrmind3/Defaults/Answers.n:351` — `"Describe the absolute line <BR>between alive and \"not alive.\""`.
   A tokeniser that does not honour `\"` will mis-parse ~9 conditions.
5. **Non-ASCII bytes occur** in string literals; decode as Latin-1 and pass through.
6. Identifiers (pattern-list names, subjects) may contain `.` and digits:
   `StdP.Be`, `FEARFUL.ADJ`, `PROVE.V`, `?StdQ.LocalQuestion`, `?NameCapture.TempName`.
7. Memory references are `?Name`; the cross-user form `?<pat>:<key>` is in the grammar
   [spec §5] but does not occur in the archive.
8. Star-buffer references are `*1 #1 %1 ^1` and `*Match` / `*match`. `#1` is the second
   most common non-attribute LHS in BUILD (33 uses).

---

## 3. Where conditions live

A category body [spec §3] is a list of items. In the archive the only items found at the
top level of a category are:

- `Subjects "…", "…";` — 570 occurrences in BUILD,
- `MemoryLock ?a, ?b;` — 33 occurrences in BUILD,
- conditional blocks.

**No command ever appears at the top level of a category outside a conditional block**
(verified over BUILD). Every command is inside a block.

A conditional block is:

```
<head-condition> [Then]
    <item>*
<terminator>
```

where `<item>` is a command (`Say`, `SayOneOf`, `Remember`, `Forget`, `Focus`,
`DontFocus`, `SwitchTo`, `WaitForResponse`, `InterruptSequence`, `Suppress`, `Example`,
`Trace`, `SayToFile`, …) or a nested conditional block. Blocks nest to 6 levels in the
archive (`Library/StdQuestion/combis/QuesResDebug.us.n:205-221`).

BUILD: 1400 blocks contain at least one non-`If` statement at their own top level
("base-level blocks" in the sense of [spec §14.1]); 47 contain only nested blocks;
38 have completely empty bodies (all of the form `If … then SwitchBack`).

---

## 4. Block terminators

### 4.1 Census

BUILD, by category kind (this is the complete cross-tabulation):

| terminator     | std Topic | Sequence Topic | Priority Topic | Default Topic | Priority Scenario | total   |
| -------------- | --------- | -------------- | -------------- | ------------- | ----------------- | ------- |
| `Done`         | 643       | 50             | 8              | 56            | 2                 | **759** |
| `Continue`     | 43        | 214            | 150            | 4             | 3                 | **414** |
| `SwitchBack`   | 0         | 286            | 0              | 0             | 0                 | **286** |
| `NextTopic`    | 15        | 2              | 0              | 0             | 0                 | **17**  |
| `TryAgain`     | 5         | 4              | 0              | 0             | 0                 | **9**   |
| `NextScenario` | 0         | 0              | 0              | 0             | 0                 | **0**   |

ALL: `Continue` 1705, `Done` 1539, `SwitchBack` 1228, `TryAgain` 37, `NextTopic` 34,
`NextScenario` 0.

Two facts the port can rely on:

- **`SwitchBack` occurs only inside `Sequence` categories** (286/286 in BUILD), exactly as
  [spec §3] requires ("It is an error to end a block with SwitchBack if the block is not
  inside a Sequence topic").
- **`NextScenario` is never used anywhere in the archive.** It is the `Scenario` spelling of
  `NextTopic`; the two `Sequence Topic` blocks that end with `NextTopic` show that the
  keyword is chosen by the category's `Topic`/`Scenario` keyword, not by its priority.

By position: `Done` is overwhelmingly a top-of-category terminator (584 top / 175 nested),
`Continue` is overwhelmingly nested (340 nested / 74 top), `SwitchBack` 240 nested / 46 top.

### 4.2 Exact control flow

Each terminator is compiled as a command that does nothing but return a `CABlockEnd`
value [spec §3]; the `.nso` class strings corroborate this — `CDone`, `CContinue`,
`CNextCategory`, `CSwitchBack` are all present as classes, alongside `CSwitchTo`,
`CWaitForResponse`, `CInterruptSequence`.

The `CABlockEnd` value set is:
`NotActivated`, `Continue`, `Done`, `NextCategory`, `Switch`, `SwitchBack`, `Waiting`, `RunTimeError`.

| terminator                   | value returned by the block | effect                                                                                                                                                                                                                                                                                              |
| ---------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Done`                       | `Done`                      | Category execution stops. The whole run stops **unless** the `SequenceContinuations` stack is non-empty, in which case the topmost suspended Sequence category is resumed. When a `Done` that is not resuming an interruption executes, the `SwitchContinuations` stack is also cleared. [spec §11] |
| `Continue`                   | `Continue`                  | Execution proceeds with the next item after this block in the enclosing block (or the next block in the category). Subject to the `Otherwise` and `IfChance` skip rules of §9 and §10.                                                                                                              |
| `NextTopic` / `NextScenario` | `NextCategory`              | The rest of the current category — including enclosing blocks — is abandoned; execution moves to the next category.                                                                                                                                                                                 |
| `TryAgain`                   | `Waiting`                   | Re-executes the most recent `WaitForResponse` in scope: store a continuation pointing at the statement _after_ that `WaitForResponse` into `User.Continuation`, and stop the run. On the next input the block body resumes there. [spec §3, §11]                                                    |
| `SwitchBack`                 | `SwitchBack`                | Pop the top entry of `SwitchContinuations` and resume execution immediately after the `SwitchTo` statement that switched to this category. Only legal inside `Sequence` categories.                                                                                                                 |

`SwitchTo <cat>;` is a _command_, not a terminator: it pushes a return continuation on
`SwitchContinuations`, sets `RunTime.SwitchToCategory` and returns `Switch`, which
propagates out of the enclosing blocks and out of the category. Cycle guard: if the target
has already executed this run and is not a Sequence category, `RunTimeError` is returned
instead [spec §11].

**A block whose condition is false returns `NotActivated`, not `Continue`.** The
distinction is load-bearing: `NotActivated` lets the following `Otherwise` block run,
`Continue` suppresses it (§9).

**Value propagation out of nested blocks.** When a nested block returns anything other
than `Continue` or `NotActivated`, that value is returned by the enclosing block
immediately; the enclosing block's own terminator is never reached. This is why
`Done` inside an `IfChance` block ends the whole category (§10) and why `TryAgain` inside
a doubly nested block ends the run (`Mrmind3/Utilities/WebNameGreet.n:48-51`).

#### `TryAgain` — which `WaitForResponse`?

[spec §3] says "the most recent `WaitForResponse` within the block is executed (it is an
error to end a block with `TryAgain` if it does not contain a `WaitForResponse`)". **The
archive contradicts the parenthetical**: of the 9 `TryAgain` blocks in BUILD, 5 contain a
`WaitForResponse` and **4 do not** — `Mrmind3/Utilities/WebNameGreet.n:46, 48, 134, 771`.
In every one of those the `WaitForResponse` is in an _enclosing_ block
(`Mrmind3/Utilities/WebNameGreet.n:42`, inside the `Always` block opened at line 38).

**Normative rule for the port:** resolve `TryAgain` statically at load time. From the
`TryAgain` token, scan backwards through the statements of its own block (descending into
earlier nested blocks, last one wins); if none is found, move to the parent block and
repeat, up to the category top. Bind `TryAgain` to the continuation position immediately
after the `WaitForResponse` found. If none exists anywhere in the chain, it is a load error.
Every `TryAgain` in the archive resolves uniquely under this rule — no block in the archive
contains two `WaitForResponse` statements in the same scope chain.

Worked example, `Mrmind3/Humans&Machines/Machines.n:65-89` (verbatim, `\r` stripped):

```
Topic "Computers Don't Have" is
Subjects "ComputersCan't","ComputerTraits";

	If ?AnyStatement Contains (COMPUTER,AILIFE,BOTS) and Heard ("don't have #","do not have #")
	Then

		Example "Machines don't have legs!";

		Say "Do you have " + #1 + "?";
		WaitForResponse;
		If ?WhatUserSaid Matches AFFIRMATIVE
		Then
			Say "What is human about that?";
			Focus "Humans Are";
		Done

		If ?WhatUserSaid Matches NEGATIVE
		Then
			Say "Well, if I don't, <BR>and you don't either,<BR>that doesn't help me<BR>believe you're human.";
		Done

		Say "It would help me if <BR>you would answer <BR>yes or no.";
		TryAgain

EndTopic
```

Trace: input matches → `Say`, `WaitForResponse` returns `Waiting` and stores a continuation
at the `If ?WhatUserSaid Matches AFFIRMATIVE` block. Next input: the continuation resumes
there. If neither yes nor no matches, both inner blocks return `NotActivated`, the `Say`
runs, and `TryAgain` re-arms the same continuation — so the next input is tested against
the same two blocks again.

Worked `SwitchBack` example, `Library/StdQuestion/combis/QuesResDebug.us.n:439-464`:

```
Sequence topic "remove excess punctuation" is
	If ?WhatUserMeant Matches "* \' #*", "*#\' *", "* \'#*",            //singlquote
							  "* \" #*", "*#\" *", "* \"#*",            //doublequote
							  ...
	then
		Remember ?WhatUserMeant is *1+" "+#1+" "+*2;
	Continue
	If ?WhatUserMeant Matches "\'*",			"*\'",   //singlquote
							   ...
	then
		Remember ?WhatUserMeant is *1;

	SwitchBack
	Otherwise Always
		Remember ?StdP.DoneStrippingPunctuation;
	SwitchBack
EndTopic
```

and its caller, `Library/StdQuestion/combis/QuesResDebug.us.n:153-168`, which unrolls a
loop by nesting the same `SwitchTo` five deep:

```
	Forget ?StdP.DoneStrippingPunctuation;
	SwitchTo "Remove excess punctuation";
		If DontRecall ?StdP.DoneStrippingPunctuation
		then SwitchTo "Remove excess punctuation";
			If DontRecall ?StdP.DoneStrippingPunctuation
			then SwitchTo "Remove excess punctuation";
				...
				Continue
			Continue
		Continue
		Remember ?UnProcessedString is ?WhatUserMeant;
	Continue
```

This is the archive's proof that a `SwitchBack` continuation resumes _inside_ nested
blocks, at the statement after the `SwitchTo`.

---

## 5. Grammar (EBNF, as actually used)

Terminals in `'quotes'` are case-insensitive keywords. Productions marked
**[patent-only]** are in the patent BNF [spec §4] but have zero occurrences in the archive;
productions marked **[archive-only]** are in the archive but not the patent BNF.

```ebnf
ConditionalBlock =
      HeadCondition , { BodyItem } , Terminator ;

HeadCondition =
      'Always'                                   (* no Then *)
    | 'If'            , ClauseExpr    , 'Then'
    | 'IfHeard'       , MatchingList  , [ ClauseTail ] , 'Then'
    | 'IfNotHeard'    , MatchingList  , [ ClauseTail ] , 'Then'   (* [patent-only] *)
    | 'IfRecall'      , MemList       , [ ClauseTail ] , 'Then'
    | 'IfDontRecall'  , MemList       , [ ClauseTail ] , 'Then'
    | 'IfChance'      , [ Chance ]    , 'Then' ;

ClauseTail = { BoolOp , Clause } ;           (* lets a head keyword be combined with clauses *)

BodyItem   = Command | ConditionalBlock | 'Otherwise' , ConditionalBlock ;

Terminator = 'Done' | 'Continue' | 'NextTopic' | 'NextScenario'   (* NextScenario [patent-only] *)
           | 'TryAgain' | 'SwitchBack' ;

(* ---------- condition-clause level ---------- *)

ClauseExpr =
      Clause
    | Clause , 'and' , Clause , { 'and' , Clause }
    | Clause , OrOp  , Clause , { OrOp  , Clause } ;
    (* and and or may NOT be mixed at the same level without parentheses; see §7 *)

Clause =
      '(' , ClauseExpr , ')'
    | '{' , ClauseExpr , '}'                     (* optional clause; 1 occurrence in ALL *)
    | 'Focused' | 'IfFocused'                    (* IfFocused is [archive-only] *)
    | 'Chance' , [ Chance ]
    | 'IfChance' , [ Chance ]                    (* nested single-condition form *)
    | HeardKw  , MatchingList
    | RecallKw , MemList
    | Pat , MatchKw , MatchingList ;

HeardKw  = 'Heard' | 'NotHeard' | 'IfHeard' | 'IfNotHeard' ;
RecallKw = 'Recall' | 'DontRecall' | 'IfRecall' | 'IfDontRecall' ;
MatchKw  = 'Contains' | 'Matches' | 'ExactlyMatches'
         | 'DoesNotContain' | 'DoesNotMatch' | 'DoesNotExactlyMatch' ;

AndOp = 'and' | '&' ;
OrOp  = 'or'  | ',' ;
BoolOp = AndOp | OrOp ;

Chance = number | number , '%' ;                 (* 0..1, or 0..100 followed by % *)

(* ---------- matching-list / mem-list level ---------- *)

MatchingList =
      Pat
    | Pat , AndOp , [ 'not' ] , Pat , { AndOp , [ 'not' ] , Pat }
    | Pat , OrOp  , Pat , { OrOp , Pat } ;
    (* 'not' is only legal after an AndOp, and only in a positive-keyword context *)

MemList =
      MemRef
    | MemRef , { AndOp , MemRef }
    | MemRef , { OrOp  , MemRef } ;

Pat        = PatAtom , { '+' , PatAtom } ;
PatAtom    = String | Symbol | MemRef | StarBufRef | Number
           | '(' , MatchingList , ')'
           | '{' , MatchingList , '}' ;          (* optional pattern-list element *)
MemRef     = '?' , Symbol , [ ':' , Symbol ] ;
StarBufRef = ( '*' | '#' | '%' | '^' | '&' ) , integer | '*Match' ;
```

### 5.1 The one real parsing ambiguity, and how to resolve it

`and`, `or`, `,` and `&` are used at **two different levels**: joining condition clauses,
and joining elements of a matching list. `If Recall ?FactQuestion and Heard (BOTS, YOU) and SMARTWORD Then`
(`Mrmind3/Humans&Machines/Bots.n:3-4`) contains three `and`s: the first joins two _clauses_,
the third joins two _pattern-list elements_ inside the `Heard` clause.

Resolution rule (this reproduces the archive exactly — 4543/4543 blocks parse):

> While parsing a `MatchingList` or `MemList`, after consuming a `BoolOp`, look ahead.
> Stop the list and hand the operator back to the clause level if and only if the next
> operand _begins a clause_, i.e. if:
>
> 1. the next token is a clause keyword (`Heard`, `NotHeard`, `Recall`, `DontRecall`,
>    `Focused`, `Chance`, `IfHeard`, `IfNotHeard`, `IfRecall`, `IfDontRecall`, `IfChance`,
>    `IfFocused`), **or**
> 2. the next token opens a bracket group whose balanced contents contain a clause keyword
>    or a match keyword at any depth, **or**
> 3. scanning forward at bracket depth 0 (stopping at the first unbalanced `)`/`}`, at the
>    next `BoolOp`, or at `Then`) reaches a match keyword.
>
> The single exception: `not` immediately after an `AndOp` always belongs to the matching
> list (`and not X`), never to the clause level.

Two archive cases that pin this down:

```
Library/Utilities/combis/WebNameGreet.n:789-790
	If Heard ("you","U","Yoursel#") and Recall ?CanQuestion, ?DescriptionQuestion, ?FactQuestion and
		Heard "tell me*my name" Then
```

`Heard`'s list is just `("you","U","Yoursel#")` — the following `and Recall` starts a clause.
`Recall`'s mem list is `?CanQuestion, ?DescriptionQuestion, ?FactQuestion` (comma = OR) —
the following `and Heard` starts a clause.

```
Mrmind3/Humans&Machines/Bots.n:3-4
	If Recall ?FactQuestion and Heard (BOTS, YOU) and SMARTWORD
	Then
```

`Heard`'s list is `(BOTS, YOU) and SMARTWORD` — `SMARTWORD` is a pattern-list name, not a
clause keyword, so it stays in the matching list. The clause reads
"a fact question was detected, **and** the input contains (BOTS or YOU) **and** a SMARTWORD".

---

## 6. Every condition form, with semantics

Notation: `M[p]` = the set of strings a pattern-list expression `p` evaluates to;
`mem[k]` = the user's associative memory. `Contains`, `Matches`, `ExactlyMatches` and their
negations are defined in [spec §5.2]; pattern semantics are dimension B, not this document.
Everything here treats a match test as an oracle `match(op, lhsValue, pattern) -> bool`.

### 6.1 `Always`

Syntax: the bare keyword, **never followed by `Then`**. Always true.
BUILD 123, ALL 567. Compiled class `CAlwaysCondition` is present in the `.nso` strings.

Its dominant uses are (a) the whole body of a Priority/Sequence category, and (b) the final
`else` of an `Otherwise` chain (§9). Verbatim, `Mrmind3/Defaults/Defaults.n:144-145`:

```
Default Topic "Last Line Of Defense" is
Always
```

### 6.2 `If <ClauseExpr> Then`

The general form. BUILD 1035. The clause expression may be any Boolean combination of §6.3–6.10
clauses subject to §7. Head-position breakdown of what follows `If` in BUILD: `(` 250,
an attribute reference 640, `heard` 32, `dontrecall` 41, `recall` 25, `focused` 10,
`#1` 6, `*match` 6.

### 6.3 `<pat> <MatchKw> <MatchingList>` — matching conditions

The LHS may be an attribute reference, a literal string, a star-buffer reference, or a
concatenation. Top LHS values in BUILD: `?WhatUserMeant` 357, `?IsStatement` 143,
`?WhatRobotSaid` 123, `?FactStatement` 123, `?StdQ.LocalQuestion` 115, `?AnyStatement` 110,
`?WhatUserSaid` 87, `#1` 33, `*match` 6, and the idiom `"" DoesNotMatch <PatternList>`
(used to test whether a pattern list is empty — `Mrmind3/Utilities/CProfanity.n:80`).

Truth: true iff **some** string in `M[rhs]` satisfies `match(op, value(lhs), s)`.
For a negated keyword: true iff **no** string in `M[rhs]` matches.
Note that `DoesNotContain X, Y` therefore means "contains neither X nor Y", not
"does not contain (X and Y)".

`ExactlyMatches` occurs once in BUILD, with the author's own explanation of why:

```
Mrmind3/Reactions/Compliments.n:49-53
Topic "grinnies" is
Subjects "grinnies";
	If ?WhatUserSaid ExactlyMatches GRINNIES
	//we have to use exactlymatches here -- otherwise punctuation is stripped.
	Then
```

### 6.4 `Heard` / `IfHeard` / `NotHeard` / `IfNotHeard`

`Heard L` ≡ `?WhatUserMeant Contains L`; `NotHeard L` ≡ `?WhatUserMeant DoesNotContain L`
[spec §4]. `IfHeard` / `IfNotHeard` are the "single condition" spellings usable as a block
head. The archive uses `Heard` (183), `NotHeard` (84), `IfHeard` (40) and **never**
`IfNotHeard`.

`IfHeard` used as a head with an `and not` list, `Library/StdQuestion/combis/QuesResDebug.us.n:2268-2275`:

```
	IfHeard StdResponse.Affirmative AND NOT StdResponse.AffirmativeException Then
		Trace "Setting flag ?YesResponse";
		Remember ?YesResponse;
	Continue
	IfHeard StdResponse.Negative AND NOT StdResponse.NegativeException Then
		Trace "Setting flag ?NoResponse";
		Remember ?NoResponse;
	Continue
```

**Edge case the port must reproduce, not fix.** 9 clauses in BUILD pass a _memory reference_
as the pattern of `Heard`/`NotHeard`. For attributes that hold real strings
(`?AnyQuestion`, `?DescriptionQuestion`, `?Name`) this is meaningful. For boolean flags it
is almost certainly an authoring bug, since `Remember ?YesResponse;` with no value stores
the string `"TRUE"`, so `IfHeard ?YesResponse` tests whether the user's input contains the
literal word "TRUE":

```
Mrmind3/Defaults/AskMe.n:62-63
				If ?WhatUserSaid Matches AFFIRMATIVE
				Or IfHeard ?YesResponse
```

(also `Mrmind3/Defaults/AskMe.n:23, 71`, `Mrmind3/Issues/Emotion.n:115`,
`Mrmind3/Defaults/Pointers.n:72`, `Mrmind3/Defaults/Answers.n:104, 294, 634`,
`Mrmind3/Issues/Consciousness.n:400`). The port must evaluate the memref to its stored value
and match that as a pattern.

### 6.5 `Recall` / `IfRecall` / `DontRecall` / `IfDontRecall`

`Recall <MemList>` is true iff **any** listed attribute currently has a value;
`DontRecall <MemList>` is true iff **none** does [spec §4]. Compiled class:
`CPropertyCondition`. `and not` is not permitted in a `DontRecall` list — and never occurs.

In the archive every argument of every `Recall`/`DontRecall` clause is a memory reference
(0 exceptions in BUILD). Commas are OR:

```
Mrmind3/Humans&Machines/Machines.n:113
		or (Focused and Recall ?NoResponse,?NotSureResponse)
```

An `IfRecall` head combined with a clause via `and`:

```
Mrmind3/Humans&Machines/Convincing.n:163
	IfRecall ?MethodQuestion and Focused then
```

An `IfRecall` head combined via `or` with a parenthesised clause group:

```
Mrmind3/Reactions/Annoyance.n:64
	IfRecall ?RememberAnnoy2 or ((?WhatUserSaid Contains INSULT) and (IfDontRecall ?RememberAnnoy3))
```

`IfDontRecall` as a head, `Mrmind3/Defaults/AskMe.n:14`:

```
		IfDontRecall ?20questions  Then
```

### 6.6 `IfChance <chance>` / `Chance <chance>`

Argument is either a real number in [0,1] or a real number in [0,100] followed by `%`
[spec §4]. Both spellings occur in BUILD: percentages 13 times
(`33% 67% 20% 35% 45% 30% 70% 25%×4 80% 20%`, in `AboutUser/UserPhysical.n`,
`AboutUser/UserFamily.n`, `Humans&Machines/Machines.n`, `Reactions/Compliments.n`) and
decimals 28 times, all in `Mrmind3/Defaults/OneShots.n` (`0.90 0.70 0.50 0.30 0.20 0.10 0.03`).

Truth: true with the given probability, independently, each time the condition is evaluated.

`Chance` as a _clause_ rather than a head occurs exactly once in BUILD,
`Mrmind3/Utilities/WebNameGreet.n:66-71` (inside `Sequence Topic "Name Capture"`):

```
			IfRecall ?HaveName
			AND Chance 60%
			Then
			Say "Hi " + ?Name + "! <BR>Can you convince me <BR>that you're human?" ;
			Done
```

and twice in `Mrmind3old/Issues/Choice.n:10, 16` in its **argument-less** clause form
`If Chance then`, which is the clause spelling of a bare `IfChance` group (§10).

Inline single-line use, `Mrmind3/Reactions/Compliments.n:55-56`:

```
		IfChance 80% then Say "That is the wrong orientation <BR>for a human."; Done
		Ifchance 20% then Say "Wrong orientation, wise guy.";Done
```

### 6.7 `IfChance` with no argument

See §10 — it is not an independent condition, it is a member of a random-choice group.

### 6.8 `Focused`

True iff the category containing the condition has at least one `Subjects` keyword in
common with the current _active subjects_ set [spec §13.2]. Compiled class
`CFocusCondition`. The active-subjects set is the union of the subjects of all categories
focused by the most recent input that focused at least one subject-bearing category; a
category with no subjects does not change it.

BUILD: 96 uses in 21 files, concentrated in `Humans&Machines/Convincing.n` (21),
`Issues/Emotion.n` (10), `AboutMrMind/MMIdentity.n` (7), `AboutUser/UserFamily.n` (7).

The archive idiom is almost always **`Focused and <pronoun / yes-no test>`** as one
disjunct of a larger condition — it is the mechanism by which a topic claims a bare "yes",
"no" or "it":

```
Mrmind3/Humans&Machines/Bots.n:35-41
Topic "Do you know <other bot>" is
Subjects "Other Bots";
	If heard "do you know" and
		(Heard OTHERBOTS or (Focused and heard "him","her","it","them"))
	Then
		Example "Do you know Julia?";
		Say "Yes, we chat from time to time.";
		Done
EndTopic
```

```
Mrmind3/Humans&Machines/Machines.n:166
		or (Focused and Recall ?YesResponse)
```

As a lone head condition, `Mrmind3/Customization/ProfanityCustomize.n:129`:

```
	If Focused  then
```

Specificity: 0 at compile time, `100 × (number of shared subjects)` at run time
[spec §13.2]. That is a §14 concern, but it explains why `Focused` is always ORed with
something more specific.

### 6.9 `IfFocused` — archive-only

**Not in any patent grammar.** 4 occurrences in BUILD, all in
`Mrmind3/Issues/Life.n` (lines 151, 152, 166, 167), plus the same 4 in the `Mrmind3old`
copy of that file — 8 in ALL. It is used exactly where `Focused` would be, inside a
parenthesised clause:

```
Mrmind3/Issues/Life.n:147-156
Topic "I'm on the ALIST" is
Subjects "ALIFE","LISTS";
	If (?IsStatement Contains "I am "+HEX+ ALIST)
//		or (?AnyStatment Contains ALIST)
		or (IfFocused and Heard ALIST)
		or (IfFocused and Heard "A","the"+ ALIST)
	Then
		Example "I'm on the ALIST";
		Say "Humans do not make <BR>the ALIFE A-LIST.";
	Done
```

The file is in `MRMIND3.vsr`, so the compiler accepted it.
**Normative for the port: `IfFocused` is an exact synonym of `Focused`.** This is
consistent with the language's pattern of `If<X>` single-condition spellings of every
clause keyword. Flagged in §15 as the one place where the reading is inferred rather than
documented.

### 6.10 `WhenFocused` is _not_ a condition

`WhenFocused` (46 occurrences in BUILD, 14 files) is a **modifier on `Example` and
`OtherExamples` statements**, not a condition. It marks a verification example as one that
is only expected to be hit when the topic is focused, so the automated Example runner does
not report a failure:

```
Mrmind3/Humans&Machines/Humans.n:226
		WhenFocused Example "I sure do";
Mrmind3/Humans&Machines/Convincing.n:15
OtherExamples of "I can convince you I am a human" whenfocused are
```

It never appears in a condition. The port's condition evaluator must ignore it entirely;
only the Example-verification harness (dimension: examples) cares.

---

## 7. Boolean composition

### 7.1 Operators and their spellings

| meaning                                | spellings  | BUILD token count    |
| -------------------------------------- | ---------- | -------------------- |
| conjunction                            | `and`, `&` | `and` 688, `&` **1** |
| disjunction                            | `or`, `,`  | `,` 2008, `or` 519   |
| negated conjunct (matching lists only) | `and not`  | `not` 5              |

`&` occurs exactly once in the entire archive:

```
Mrmind3/Defaults/Answers.n:282-289
Topic "Really ThinkingBack" is
Subjects "Default Answers", "Identity", "ALIFE";
	If ?WhatRobotSaid matches "What are you thinking about right now?"
	And ?DescriptionQuestion contains (YOU & "think")
	Then
	Example "What are you thinking right now?";
			Say  "You think I can't, <BR>You think I can't...";
	Done
```

The comma is the dominant OR spelling by 4:1, and is the _only_ OR spelling used inside
matching lists in practice (BUILD list-level: 827 OR joins, 173 AND joins; clause level:
452 AND, 279 OR).

### 7.2 Mixing `and` and `or`

[spec §4]: "A Boolean combination of basic conditions that includes both `and` and `or`
keywords must use parentheses to prevent possible ambiguity; there is no built-in operator
precedence between `and` and `or` in GeRBiL."

**The archive never violates this.** Across all 4543 conditional blocks in ALL there are
**zero** cases of `and` and `or` mixed at the same bracketing level, at either the clause
level or the matching-list level. The port may therefore reject a mixed level as a load
error, and must not invent a precedence.

Consequence for the parser: at each level, the first operator seen fixes the level's
operator; every subsequent operator at that level must be the same one (treating `and`≡`&`
and `or`≡`,`).

BUILD bracket usage: 846 parenthesised clause groups, 517 parenthesised pattern-list
groups, 8 brace-wrapped pattern-list groups, 0 brace-wrapped clause groups.

A representative deeply parenthesised condition, `Mrmind3/Reactions/Compliments.n:28-43`:

```
Topic "GeneralPraise" is
Subjects "PRAISE";
	If ((?AnyStatement contains (IT,YOUR) +"*"+ (SMARTWORD,GOOD)
		and (?AnyStatement doesnotcontain ("NOT","NO")))
	or (?feelingStatement contains I+("like","love") + (MRMIND,YOU),
		I + "* in love with*" + (MRMIND,YOU))
	or (Focused
		and (?FeelingStatement contains I+("like","love") + IT, I + "* in love with*" + IT))
    or (?AnyStatement contains ("I,m","I am")+ "*"+("impressed","amazed","wowed")
		and ?AnyStatement DoesNotContain ("not","no"))
	or (?IsStatement Contains "that is pretty"+("cool", "neat")))
	or (?FactStatement Contains "fancy" + YOU)
	OR (?WhatUserSaid Matches "good bot")
	OR (?WhatUserMeant Matches 	("*good answer", "*great answer", "*very nice", "*very good", "nicely done", "well done")
	OR (Heard GOOD))
 	Then
```

### 7.3 `and not`

`and not <pat>` is legal only inside a **positive** matching list (never after
`DoesNotContain`/`DoesNotMatch`/`DontRecall`) [spec §4]. It negates that one list element:
the list is true iff (the positive elements are satisfied) and (no negated element matches).

5 occurrences in BUILD, 22 in ALL. All five, verbatim:

```
Library/StdQuestion/combis/QuesResDebug.us.n:2268   IfHeard StdResponse.Affirmative AND NOT StdResponse.AffirmativeException Then
Library/StdQuestion/combis/QuesResDebug.us.n:2272   IfHeard StdResponse.Negative AND NOT StdResponse.NegativeException Then
Mrmind3/Utilities/CProfanity.n:80      If (?WhatUserSaid Contains DirtyBodyPartPhrases AND DirtyActionPhrases AND NOT PseudoBadWords) and ("" DoesNotMatch STDX.RESPONSE_TO_SEXUAL)
Mrmind3/Utilities/CProfanity.n:95      If (?WhatUserSaid Contains (DirtyWords, RacialSlurs) AND NOT PseudoBadWords) and ("" DoesNotMatch STDX.RESPONSE_TO_GENERAL)
Mrmind3/Reactions/Questions.n:27-28    If (?CanQuestion Contains "we" and "talk" and not "about") or
                                          (Heard "let's talk","talk # me" and notheard "about" )
```

`Mrmind3/Reactions/Questions.n:27-28` is instructive: the same negation is expressed twice,
once as `and not "about"` inside the matching list of a `Contains`, and once as a separate
`notheard "about"` clause. Both are legal and mean the same thing here.

### 7.4 Curly braces — optional elements

`{ … }` marks an element optional [spec §5]. **It never affects whether a condition is
true; it affects only specificity** — an optional element contributes 0 to specificity when
absent and its normal specificity when present [spec §14.3].

Two distinct uses:

**(a) Optional pattern-list element** — 8 occurrences in BUILD, 48 in ALL. This is the
common form. The clause is satisfied whether or not the braced element is found:

```
Mrmind3/AboutMrMind/MMphysical.n:183-192
Topic "Are you a male" is
SUBJECTS "ME","GENDER";
	If (?FactQuestion contains (YOU,MRMIND)
		or ?DescriptionQuestion contains (YOU,MRMIND))
	and heard "sex","gender","male#","female#","boy","girl","man","woman"
	and heard {MRMIND}
	Then
		Example "Are you a male";
		SayOneOf "Does MISTER mean anything to you?";
	Done
EndTopic
```

Here `heard {MRMIND}` is vacuously true, and exists purely so that a user who names
MrMind gets a higher-specificity match. Others:
`Mrmind3/AboutUser/UserFamily.n:86` (`and heard {"human"}`),
`Mrmind3/Humans&Machines/Humans.n:87` (`Matches "humanity" + {"anyway"}`),
`Mrmind3/Issues/Emotion.n:253, 300` (`("Fictional","Fictitious") + {"human"}`),
`Mrmind3/Reactions/Questions.n:183` (`and {"my question"}`).

**(b) Optional condition clause** — occurs **exactly once in the entire archive**, and not
in the shipped build:

```
Base/Utilities/EmailCapture.n:133-140
Topic "Is someone going to email me now?" is
subjects "EMAIL";
	If ?FactQuestion contains (YOU,"some#") and EMAIL and "me"
	and {?WhatRobotSaid contains "your email address"}
	Then
		Example "Is someone going to email me now?";
		SayOneOf "Not unless you send us email asking for information.";
	Done
EndTopic
```

The port should support both, but (b) may be special-cased.

---

## 8. Multi-line conditions

Newlines inside a condition are ordinary whitespace. Statistics for the 1362 non-`Always`
conditions in BUILD:

| lines spanned | count |
| ------------- | ----- |
| 1             | 896   |
| 2             | 261   |
| 3             | 88    |
| 4             | 56    |
| 5             | 31    |
| 6             | 13    |
| 7             | 13    |
| 9             | 2     |
| 10            | 1     |
| 13            | 1     |

The longest is `Mrmind3/Reactions/Compliments.n:30-42` (13 lines, quoted in §7.2).

`Then` sits on its own line 812 times and at the end of the last condition line 550 times
in BUILD. Both are equally valid; the port's tokeniser must not treat end-of-line as a
statement boundary. The wrap point is arbitrary — the archive wraps in the middle of a
matching list (`Library/StdQuestion/combis/QuesResDebug.us.n:443-447`), between a clause and
its operator (`Mrmind3/Humans&Machines/Bots.n:95-96`), after `and` at end of line, and
between `If` and its first clause (`Mrmind3/Utilities/WebNameGreet.n:931-932`).

Comments may be interleaved anywhere:

```
Mrmind3/Reactions/Compliments.n:51-53
	If ?WhatUserSaid ExactlyMatches GRINNIES
	//we have to use exactlymatches here -- otherwise punctuation is stripped.
	Then
```

---

## 9. `Otherwise`

### 9.1 Syntax and attachment

`Otherwise` is not a block opener and never carries a condition of its own. It prefixes the
**next conditional block** in the same statement list, marking it as an else-branch of the
immediately preceding sibling block. Compiled form: there is no `COtherwise` class in the
`.nso` strings — it is a flag on `CConditionActionBlock`.

BUILD: 107 `Otherwise`-marked blocks (95 nested inside another block, 12 at the top level of
a category). ALL: 375. Every single one has a preceding sibling block; there is no
dangling `Otherwise` anywhere in the archive.

What the else-branch itself is, in BUILD: `Always` 52, `If` 47, `IfDontRecall` 5,
`IfRecall` 3. **Never `IfChance`.** `Otherwise Always` is the plain `else`.

What it attaches to, in BUILD (kind and terminator of the preceding block):
`IfRecall`/`Continue` 34, `If`/`Done` 32, `If`/`NextTopic` 12, `IfRecall`/`Done` 11,
`If`/`Continue` 10, `If`/`SwitchBack` 8. It never attaches to an `Always` block (which
would be dead code).

Chain lengths in BUILD (head block plus its else-branches): 2 branches ×66, 3 ×9, 4 ×2,
5 ×3, 6 ×1.

### 9.2 Semantics — exactly how `Otherwise` blocks are skipped

[spec §3], from the runtime description: _"If a block returns `Continue`, the next block is
activated unless it is an `Otherwise` block …"_.

Restated precisely, and extended by archive evidence:

> Maintain a flag `skipOtherwise`, initially false, while walking a statement list.
>
> - When a conditional block is reached and `skipOtherwise` is true **and the block is
>   marked `Otherwise`**, skip it entirely (do not evaluate its condition) and leave
>   `skipOtherwise` true.
> - When a conditional block is evaluated and its condition is **false**, it returns
>   `NotActivated`; set `skipOtherwise := false` and go on. (This is what lets the next
>   `Otherwise` branch run.)
> - When a conditional block is evaluated, its condition is **true**, and it returns
>   `Continue`, set `skipOtherwise := true`.
> - When a block returns anything else (`Done`, `NextCategory`, `Switch`, `SwitchBack`,
>   `Waiting`, `RunTimeError`), that value propagates immediately out of the list; the
>   question of skipping does not arise.
> - When any **non-block** statement is reached, set `skipOtherwise := false`.

**The flag must persist across a whole chain, not just one block.** [spec §3] does not say
this explicitly; the archive settles it. `Library/StdQuestion/combis/QuesResDebug.us.n:2291-2309`:

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

If the first branch fires and returns `Continue`, both the second **and** the third branch
must be skipped. If `skipOtherwise` were cleared after skipping one block, the final
`Otherwise Always` would always run and `?Debugging` would always be overwritten with
`Sdeb.EXAMPLEDEBUGGING` — which would make the entire three-way choice pointless. The
three-branch chains in `Mrmind3/Defaults/Answers.n:89-112` and the five-branch chains in
`Mrmind3/Activities/Expressions Filter.n:67-90` behave the same way.

The rule applies identically at the top level of a category and inside any nested block —
95 of BUILD's 107 `Otherwise` blocks are nested.

### 9.3 Worked examples

**Plain `if/else`, one line each** — `Library/StdQuestion/combis/QuesResDebug.us.n:273-277`:

```
	Always
	IfRecall ?AnyStatement then Remember ?PreviousAnyStatement is ?AnyStatement; continue
		Otherwise Always Forget ?PreviousAnyStatement; continue
	IfRecall ?CanQuestion  then Remember ?PreviousCanQuestion is ?CanQuestion ; continue
		otherwise always forget ?PreviousCanQuestion; continue
```

This pattern repeats 32 times in that one topic and is the archive's canonical `else`.

**Nested yes/no `if/else`** — `Mrmind3/Defaults/AskMe.n:14-33`:

```
		IfDontRecall ?20questions  Then
//Play 20 Questions
			Say "Would you like to play 20 questions?";
			WaitForResponse;
			If ?WhatUserSaid Matches AFFIRMATIVE Then
				SwitchTo "20 Questions";
			Done  //If  AFFIRMATIVE

			Otherwise
			If ?WhatUserSaid Matches NEGATIVE
			OR Heard ?NoResponse
			Then

				SayOneOf "Okay, I'll just ask you <BR>one of my favorites.",
							"Well then, answer just one for me.";
				SwitchTo "Questions for AskMe3";

			Done //IF NEGATIVE
		Done // If Don't Recall
	Done // Original IF
	EndTopic
```

Note the line break between `Otherwise` and the `If` it prefixes — they need not be on the
same line.

**Top-level else-if chain ending in `NextTopic`** — `Mrmind3/Defaults/Answers.n:89-112`:

```
Topic "YES to Guilt" is
Subjects "Default Answers", "Guilt";
	If ?WhatRobotSaid matches  "Are you supposed to be doing <BR>something else right now?"
	AND Recall ?YesResponse
	Then
		Example "yes";
		Say "What are you supposed to be doing?";
	Done

	Otherwise If ?WhatRobotSaid matches  "Are you supposed to be doing <BR>something else right now?"
	and ?WhatUserSaid Matches NEGATIVE
	Then
			Say "Great, I love having your full attention.";
			Done // IF NEGATIVE

	Otherwise If ?WhatRobotSaid matches  "Are you supposed to be doing <BR>something else right now?"
	AND  (NotHeard ?NoResponse, ?YesResponse, ?NotSureResponse)
			Then
				SayToConsole "unexpected answer; moving on ...";
				//could collect answer in file....
			NextTopic
EndTopic
```

---

## 10. Consecutive `IfChance` blocks — the random-choice group

### 10.1 What the archive shows

A **bare-`IfChance` group** is a maximal run of two or more sibling conditional blocks all
of which are headed by argument-less `IfChance`.

BUILD contains **61 bare `IfChance` blocks, and every single one is inside a group of ≥2**
— there is not one solitary bare `IfChance` anywhere in the shipped bot. The 18 groups:

| file                                         | category                              | group size | branch terminators         |
| -------------------------------------------- | ------------------------------------- | ---------- | -------------------------- |
| `Mrmind3/Defaults/Defaults.n`                | `Last Line Of Defense`                | **8**      | all `Done`                 |
| `Mrmind3/Issues/Emotion.n`                   | `I am not a fictional human`          | 5          | all `Done`                 |
| `Mrmind3/Defaults/Answers.n`                 | `Answers YES to WantSomePointers`     | 5          | all `Done`                 |
| `Mrmind3/Defaults/Pointers.n`                | `Pointers`                            | 5          | all `Done`                 |
| `Mrmind3/AboutMrMind/WhatIsMM.n`             | `What do you like`                    | 4          | all `Done`                 |
| `Mrmind3/AboutUser/UserMind.n`               | `I wonder`                            | 4          | all `Done`                 |
| `Mrmind3/Defaults/AskMe.n`                   | `Questions for AskMe3`                | 4          | `Continue ×3`, `Done`      |
| `Mrmind3/AboutUser/UserMind.n`               | `I am imaginative`                    | 3          | all `Done`                 |
| `Mrmind3/Issues/Emotion.n`                   | `I am emotional`                      | 3          | `Done, Continue, Continue` |
| `Mrmind3/Issues/Emotion.n`                   | `I am Negative emotional`             | 3          | all `Done`                 |
| `Mrmind3/Reactions/Annoyance.n`              | `AnnoyanceThree`                      | 3          | `Done, Done, TryAgain`     |
| `Mrmind3/Customization/ProfanityCustomize.n` | `Fuck`                                | 2          | `Done, Done`               |
| `Mrmind3/AboutMrMind/MMIdentity.n`           | `M TESTE`                             | 2          | `Done, Done`               |
| `Mrmind3/AboutUser/UserGeneral.n`            | `I can sing`                          | 2          | `Done, Done`               |
| `Mrmind3/AboutUser/UserFamily.n`             | `I have a Father.`                    | 2          | `Done, Done`               |
| `Mrmind3/Humans&Machines/Humans.n`           | `something human`                     | 2          | `Done, Done`               |
| `Mrmind3/Humans&Machines/Convincing.n`       | `How do I convince you I am a human?` | 2          | `Done, Continue`           |
| `Mrmind3/Issues/Humor.n`                     | `Knock Knock.`                        | 2          | `Continue, Done`           |

All 18 groups are nested inside an enclosing block; none is at the top level of a category.

### 10.2 The two rules

**Rule A — probability.** [spec §4]: _"The `IfChance` condition with no numeric argument is
a probabilistic condition that has the same likelihood of being true as all the other
argument-less `IfChance` statements immediately before or after it."_

**Rule B — the skip.** [spec §3]: _"If a block returns `Continue`, the next block is
activated unless it is an `Otherwise` block or unless both the current and next blocks are
`IfChance` blocks, in which case it and all other `IfChance` blocks immediately following it
are skipped."_

Note that Rule B is written for **`IfChance` blocks generally**, not only argument-less
ones. The archive confirms it applies to argument-bearing ones —
`Mrmind3/AboutUser/UserFamily.n:36-65`:

```
Topic "I have a family member" is
Subjects "Family";
	If (?haveStatement contains I+"*"+FAMILYWORD and notheard MOTHER,FATHER)
	or (?FeelingStatement contains I+"*"+FAMILYWORD)
	Then
		Example "I have a cousin.";
		ifchance 20% then
			If DontRecall ?SaidVegetableLineAlready then
				Say "Even Vegetables have families.";
				Remember ?SaidVegetableLineAlready;
			Done
			Otherwise Always
				say "I have a french uncle named M. Teste.  ";
				DontFocus;
				Focus Subjects "M TESTE";
			Done
		continue
		Ifchance 35% then
			Say "I have a french uncle <BR>named M. Teste.  ";
			DontFocus;
			Focus subjects "M TESTE";
		Done
		Ifchance 45% then
			Say "BOTS have families, too.  <BR>I belong to a family of BOTS <BR>known as Chatterbots.";
			DontFocus;
			Focus subjects "tell me more about your family.";
		Done
	Continue
EndTopic
```

The 20% branch always says something and then returns `Continue`. Without Rule B the bot
would emit two family lines in one turn. With Rule B the 35% and 45% branches are skipped.

### 10.3 Normative specification for the port

```
For each maximal run of sibling conditional blocks whose heads are argument-less
IfChance, of length N (N is fixed at load time):

  When execution reaches the first block of the run that is not skipped,
  choose k uniformly at random from {0 … N-1} once for the run.
  Block i of the run has a true condition iff i == k.

Equivalently, and this is how to implement it lazily so that no roll is made for
a group that is never reached:

  remaining := N ; chosen := false
  for i in 0 … N-1:
      if chosen: block i is false
      else if random() < 1/remaining: block i is true; chosen := true
      else: block i is false; remaining := remaining - 1
```

Both formulations give every member marginal probability exactly `1/N` — "the same
likelihood of being true as all the other argument-less IfChance statements" — and
guarantee that exactly one member of the group fires.

`IfChance <arg>` is **not** part of a bare group: it is an independent Bernoulli trial with
the stated probability, evaluated when its block is reached.

Rule B applies to **every** `IfChance` block, bare or not:

```
Maintain a flag skipChance, initially false.
  * If the current item is an IfChance block and skipChance is true: skip it entirely.
  * If an IfChance block is activated and returns Continue, and the next item is also
    an IfChance block: set skipChance := true.
  * Set skipChance := false on reaching any item that is not an IfChance block.
```

For a bare group under the "exactly one" reading, Rule B is a no-op (the other members are
already false) but must still be implemented for argument-bearing runs.

**Why "exactly one" and not "independently 1/N"** — see §15 for the counter-argument. The
decisive archive evidence is `Mrmind3/Defaults/Defaults.n:144-235`, `Last Line Of Defense`:
it is a `Default Topic`, it is the **last topic of the last file in the build manifest**,
its whole body is `Always` wrapping eight bare `IfChance` blocks each ending in `Done`, and
its stated purpose is to answer anything nothing else answered. Under an
independent-1/8 reading it would produce **no output at all** on `(7/8)^8 ≈ 34%` of
unmatched inputs. Verbatim head of the topic, including the author's own weighting
comments (which do not sum to 100 and are aspirational, not semantics):

```
Default Topic "Last Line Of Defense" is
Always
//help (6) 				25%
//request restatement (4)		10%
//daydreaming (4)
//explain situation (6) 			10%
//random challenges (5)
// HDIK questions (6)    		10%
//boundary questions (4)
//limit questions (3)



	Ifchance  Then
//do they want hints or suggestions
		Focus Subjects "HELP", "WantSomePointers";
			SayOneOf "Sometimes it is hard for me to <BR>understand you. Would you like <BR>some help?",
 			"May I make a suggestion?",
			...
	Done //do they want hints


	IfChance  Then
	// Request Restatement
		SayOneOf "Could you please restate that? <BR>I had trouble recognizing <BR>your last statement.",
			...
		Done //If Restatement
	...
```

A second, smaller instance of the same shape — `Mrmind3/Customization/ProfanityCustomize.n:109-124`:

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

Note that the preceding `IfRecall … Continue` block is _not_ an `IfChance` block, so it
does not join the group and does not suppress it.

### 10.4 `IfChance` and best-fit selection

For the purposes of standard-category best-fit selection, **`IfChance` conditions are
treated as always true and are not included in the condition set** [spec §14.1]. So a
category whose only gate is `IfChance` is always a candidate; the dice are rolled only when
the category is actually executed. The port must evaluate chance lazily, at execution time,
never during activation scanning.

---

## 11. The decision procedure

### 11.1 State the evaluator needs

```
BotState {
  mem            : Map<attrName, string[]>       // per user; Recall(k) == mem.has(k) && non-empty
  activeSubjects : Set<subject>                  // per user, see [spec §13.2]
  rng            : () => number in [0,1)
  currentCategory: Category                      // for Focused
  starBuffer     : { star:[], hash:[], pct:[], caret:[], match:string }
}
```

### 11.2 Evaluating a condition

```
evalCondition(node, state) -> boolean

  ALWAYS                  -> true

  BOOL(op='and', kids)    -> every kid evaluates true          (may short-circuit)
  BOOL(op='or',  kids)    -> some  kid evaluates true          (may short-circuit)
  GROUP(paren, kid)       -> evalCondition(kid)
  GROUP(brace, kid)       -> true            // optional clause: never affects truth,
                                             // record its truth value for specificity only

  MATCH(lhs, op, neg, rhs):
      v      := valueOf(lhs, state)          // attribute value, literal, star-buffer, or concat
      pats   := expand(rhs, state)           // patternlist -> list of strings, see dimension B
      hit    := exists p in pats with match(op, v, p)
      -> neg ? not hit : hit
      // Heard L   is MATCH('?WhatUserMeant','contains',false,L)
      // NotHeard L is MATCH('?WhatUserMeant','contains',true ,L)

  RECALL(neg, memlist):
      // memlist is a MatchingList whose operands are all memory references
      // its and/or/comma structure is honoured exactly as for patterns:
      //   OR-list  -> any listed key is set
      //   AND-list -> every listed key is set
      set(k) := state.mem has k with a non-empty value
      -> neg ? not truth(memlist) : truth(memlist)

  FOCUSED                 -> |subjects(state.currentCategory) ∩ state.activeSubjects| > 0
                             // false by definition if the category declares no Subjects

  CHANCE(arg = p):        -> state.rng() < normalise(p)     // p% -> p/100 ; p in [0,1] -> p
  CHANCE(arg = none):     -> handled by the group rule of §10.3, never independently
```

`expand(rhs)` for `{ … }` pattern-list elements yields both the with-element and
without-element alternatives, so a braced element never causes a match failure.

Evaluation may short-circuit. RNG consumption order is unobservable for a `Chance` clause
inside a Boolean expression (the only such clause in BUILD is
`Mrmind3/Utilities/WebNameGreet.n:67`, in a Sequence topic).

### 11.3 Executing a statement list (this is where all the control flow lives)

```
runList(items, state) -> CABlockEnd

  skipOtherwise := false
  skipChance    := false
  chanceGroup   := null            // { pending: n, chosen: bool } for the current bare run

  for i from 0 to items.length-1:
      it := items[i]

      if it is a Command:
          skipOtherwise := false
          skipChance    := false
          chanceGroup   := null
          r := exec(it, state)
          if r != Continue: return r
          continue

      // it is a ConditionalBlock

      if it.isOtherwise and skipOtherwise:
          continue                               // skipped without evaluating; flag stays set

      if it.isBareIfChance and skipChance:
          continue

      if it.isBareIfChance and chanceGroup == null:
          chanceGroup := beginChanceGroup(run length of the bare IfChance run starting at i)
      if not it.isBareIfChance:
          chanceGroup := null
      if not it.isIfChance:
          skipChance := false

      cond := (it.isBareIfChance) ? chanceGroup.next()   // §10.3
                                  : evalCondition(it.head, state)

      if not cond:
          skipOtherwise := false
          continue                                // block returns NotActivated

      r := runList(it.body, state)                // nested blocks are items of it.body
      if r == Continue:
          r := valueOf(it.terminator)             // Done / Continue / NextCategory / Waiting / SwitchBack
      if r == Continue:
          skipOtherwise := true
          if it.isIfChance and items[i+1] is an IfChance block: skipChance := true
          continue
      return r                                    // Done, NextCategory, Switch, SwitchBack,
                                                  // Waiting, RunTimeError all propagate

  return Continue                                 // fell off the end of the list
```

At the category level:

```
runCategory(cat, state):
    r := runList(cat.blocks, state)
    if r == Continue: r := NextCategory        // [spec §3]
    return r
```

The `Waiting` value produced by `WaitForResponse` and by `TryAgain` propagates out of every
enclosing block and out of `CProgram::Run`, ending the turn [spec §11].

### 11.4 Interaction with the run loop and best-fit selection

Conditions are evaluated twice in different modes, and the port must keep them distinct
[spec §11, §14]:

- **Activation scan** (standard categories only). A block is _active_ if its condition is
  true **and** the conditions of all enclosing blocks are true. For this scan:
  `IfChance` (bare or not) counts as **true**; `Focused` counts as true with runtime
  specificity `100 × shared subjects` and compile-time specificity 0; only the **first**
  active base-level block of a category is eligible; blocks in already-executed categories
  are excluded. Highest specificity wins, ties broken by attention-focus order.
- **Execution**. The chosen category is then run from its _first_ block in the normal way of
  §11.3, with chance conditions rolled for real. It is therefore entirely possible for a
  category to be selected on the strength of a block that a chance roll then declines to
  execute.

Priority, Default and Sequence categories are never selected by specificity; they run in
script order (Priority first, Default last) and their blocks are evaluated by §11.3 only.

---

## 12. Complete list of condition-form spellings the parser must accept

Head positions:

```
Always
If <ClauseExpr> Then
IfHeard <MatchingList> [<BoolOp> <Clause>]* Then
IfRecall <MemList> [<BoolOp> <Clause>]* Then
IfDontRecall <MemList> [<BoolOp> <Clause>]* Then
IfChance Then
IfChance <number> Then
IfChance <number>% Then
IfNotHeard <MatchingList> Then          -- patent-only, 0 occurrences
```

Clause positions (inside `If …`, or after a `BoolOp` following a head keyword's list):

```
( <ClauseExpr> )
{ <ClauseExpr> }                        -- 1 occurrence in ALL
Focused
IfFocused                               -- archive-only, 8 occurrences in ALL
Chance <number>                         -- 1 occurrence in BUILD
Chance                                  -- 2 occurrences in ALL (Mrmind3old)
Heard <MatchingList>
NotHeard <MatchingList>
IfHeard <MatchingList>                  -- 8 nested occurrences in BUILD
IfRecall <MemList>                      -- 3 nested occurrences in BUILD
IfDontRecall <MemList>                  -- 1 nested occurrence in BUILD
Recall <MemList>
DontRecall <MemList>
<Pat> Contains <MatchingList>
<Pat> Matches <MatchingList>
<Pat> ExactlyMatches <MatchingList>     -- 1 occurrence in BUILD
<Pat> DoesNotContain <MatchingList>
<Pat> DoesNotMatch <MatchingList>
<Pat> DoesNotExactlyMatch <MatchingList> -- 0 occurrences anywhere
```

Confirming the "single condition objects can be substituted for condition clause objects"
note in [spec §4], 13 conditions in BUILD use an `If…` keyword in a non-head position:

```
Mrmind3/AboutUser/UserSociety.n:260      … or (IfHeard …)
Mrmind3/Issues/Emotion.n:209, 220        If ?FactQuestion Contains YOU+BADMOOD or (IfHeard "do you find that "+BADMOOD)
Mrmind3/Issues/Life.n:75                 If (Focused and IfRecall ?NotSureResponse) or (Focused and IfHeard NOTSURE)
Mrmind3/Issues/Life.n:109                If ((?IsStatement contains FEARFUL.ADJ) or … or (IfHeard FEARFUL.ADJ)) AND NotHeard …
Mrmind3/Issues/Life.n:151, 152, 166, 167 … or (IfFocused and Heard ALIST)
Mrmind3/Issues/RIskGoals.n:21            … or (IfHeard …)
Mrmind3/Reactions/Annoyance.n:64         IfRecall ?RememberAnnoy2 or ((?WhatUserSaid Contains INSULT) and (IfDontRecall ?RememberAnnoy3))
Mrmind3/Reactions/Annoyance.n:185        If ?WhatUserSaid Matches ?WhatUserSaidBefore and IfRecall ?InALoop
Mrmind3/Defaults/AskMe.n:63, 72          If ?WhatUserSaid Matches AFFIRMATIVE Or IfHeard ?YesResponse
Mrmind3/Defaults/Pointers.n:56           If ?WhatUserSaid Matches AFFIRMATIVE Or IfRecall ?YesResponse
```

---

## 13. Edge cases the port must handle

1. **Zero-length files.** Four `.n` files are 0 bytes (§1). Treat as damaged input, not as
   valid empty scripts; none is in the build.
2. **CRLF and `\"` escapes.** See §2.4. Nine BUILD conditions mis-parse without escape
   handling.
3. **Comments inside conditions**, including between the last operand and `Then`.
4. **`Then` on its own line** (812 of 1362 in BUILD) and `If` alone on a line
   (`Mrmind3/Utilities/WebNameGreet.n:931-932`).
5. **A stray leading `/` before a `Topic` keyword**: `Mrmind3/Humans&Machines/Bots.n:1`
   reads `/Topic "Are bots smart" is`. It compiled. Either the compiler tolerated it or the
   file was damaged after compilation; the port should tolerate a lone `/` before a
   category header.
6. **Empty block bodies.** 38 blocks in BUILD are `If <cond> then SwitchBack` with no
   statements at all.
7. **Blocks with no non-`If` statement at their own level** (47 in BUILD). These are not
   base-level blocks and are not eligible for best-fit selection [spec §14.1]; they are
   still executed normally.
8. **`Heard <memref>` against a boolean flag** (§6.4). Nine sites. Preserve the behaviour.
9. **`Recall` list operators.** `Recall ?a, ?b` is OR; `Recall ?a and ?b` is AND. The comma
   spelling dominates and is easy to misread as a plain argument list.
10. **`DoesNotContain A, B` means "contains neither"**, since the negation is applied to the
    whole matching-list truth value.
11. **`and not` only after a positive keyword**, never with `DoesNotContain`/`DontRecall`.
12. **`{ }` never changes truth**, only specificity. Both the pattern-list form (48 in ALL)
    and the clause form (1 in ALL) must parse.
13. **`IfChance` groups** (§10) — and note that all 61 bare `IfChance` blocks in BUILD are in
    a group, so a solitary bare `IfChance` has no archive precedent; if the port meets one,
    treat N = 1, i.e. always true.
14. **`Otherwise` chains** must keep skipping through the entire chain (§9.2).
15. **`Otherwise` after a `Done`** is common (32 in BUILD) and is effectively unreachable
    else-code within one turn — the `Done` propagates out of the category first. It is not an
    error; the block is simply never reached in that turn. It _is_ reachable when the head
    block's condition is false.
16. **`TryAgain` with no `WaitForResponse` in its own block** (4 of 9 in BUILD). Resolve
    outward through enclosing blocks (§4.2).
17. **`SwitchBack` continuations resume inside nested blocks**, at the statement following
    the `SwitchTo` (`Library/StdQuestion/combis/QuesResDebug.us.n:153-168`).
18. **Six levels of nesting.** Do not assume shallow blocks.
19. **`WhenFocused` is not a condition** (§6.10).
20. **A category may be `Sequence`, `Priority`, `Default`, or standard, and a `Scenario` as
    well as a `Topic`.** BUILD has 3 `Priority Scenario` categories. Their block terminators
    are the ordinary ones; `NextScenario` is never used.

---

## 14. Where the archive contradicts or extends the patent spec

1. **`IfFocused` exists.** Not in any patent BNF. 8 occurrences in ALL, 4 in BUILD
   (`Mrmind3/Issues/Life.n:151, 152, 166, 167`). Treated here as a synonym of `Focused`
   (§6.9). The patent's `<SingleCondition>` list is therefore incomplete.
2. **`TryAgain` may appear in a block that contains no `WaitForResponse`.** [spec §3] calls
   this an error; `Mrmind3/Utilities/WebNameGreet.n:46, 48, 134, 771` do it, in the shipped
   build. The `WaitForResponse` is in an enclosing block. §4.2 gives the resolution rule.
3. **The `Otherwise` skip must persist across a whole chain.** [spec §3]'s wording ("the
   next block is activated unless it is an Otherwise block") is compatible with clearing the
   flag after one skip; `Library/StdQuestion/combis/QuesResDebug.us.n:2293-2305` and the
   five-branch chains in `Mrmind3/Activities/Expressions Filter.n` show it must not be
   cleared (§9.2).
4. **Rule B (the `IfChance` skip) applies to argument-bearing `IfChance` too**, which the
   patent text permits but does not emphasise. `Mrmind3/AboutUser/UserFamily.n:42-63` is the
   evidence (§10.2).
5. **`IfNotHeard`, `NextScenario` and `DoesNotExactlyMatch` are dead grammar.** Zero
   occurrences in the entire archive. Implement them for completeness, but no archive
   behaviour depends on them.
6. **`ExactlyMatches`, `Chance` as a clause, `&`, and `{clause}` are each effectively
   one-offs** (§1.3). A port may special-case them.
7. **The `1997` grammar in [spec §4] is not the archive's grammar.** NeuroScript 2.2 uses the
   1998/1999 form throughout: `Otherwise` is present (375 in ALL), `Focused` is present,
   `Example` rather than `MarkResponse` is used. No 1997-only construct (`$word`
   wildcards, `MarkResponse`) appears anywhere.
8. **Comment syntax is `//`, not the patent's `--`.** All 170 lines containing `--` in the
   archive use it as an em-dash inside prose or inside a `//` comment.

---

## 15. Unresolved

1. **Bare-`IfChance` group probability: "exactly one" vs "independent 1/N".**
   [spec §4] says only that the members have "the same likelihood of being true as all the
   other argument-less IfChance statements immediately before or after it" — a _relative_
   statement, never an absolute probability.
   _Hypothesis adopted in §10.3 (labelled as such):_ exactly one member fires, chosen
   uniformly. _Evidence for:_ the relative phrasing; all 61 bare blocks in BUILD are in
   groups used as `SayOneOf`-at-block-level; and `Last Line Of Defense` — the terminal
   default topic of the shipped bot — would be silent ~34% of the time under the
   independent reading.
   _Evidence against:_ Rule B (the skip after `Continue`) is only strictly necessary under
   the independent reading, since under "exactly one" no second member can fire anyway.
   A port that wants to hedge should make this a single switch; nothing else in the
   specification depends on it.
2. **`Chance` with no argument** (`Mrmind3old/Issues/Choice.n:10, 16`, `If Chance then` ×2)
   — _hypothesis:_ identical to bare `IfChance`, i.e. it joins a group with the adjacent
   `If Chance` blocks. It does not occur in BUILD, so nothing shipped depends on it.
3. **`IfFocused`** — _hypothesis:_ exact synonym of `Focused`. No documentation; the only
   support is the language's uniform `If<X>` single-condition spellings and the fact that
   `Mrmind3/Issues/Life.n` compiled as part of the build.
4. **Whether a `Chance` clause (as opposed to an `IfChance` head) is also "treated as always
   true" during the best-fit activation scan.** [spec §14.1] names only `IfChance`. The one
   BUILD occurrence (`Mrmind3/Utilities/WebNameGreet.n:67`) is inside a `Sequence` topic,
   which is not subject to best-fit selection, so the question is unobservable in the
   shipped bot. _Hypothesis:_ it is the same `CChanceCondition` object and is treated the
   same way.
5. **Exact `TryAgain` resolution when a block contains more than one `WaitForResponse`.**
   No such block exists in the archive, so the "textually last one in scope" rule of §4.2
   is unfalsifiable against the archive.
6. **Whether `Example` counts as a "base-level statement"** for the purposes of activation
   and auto-focus [spec §14.1, §11]. This affects which blocks are eligible for best-fit
   selection when the only non-`If` statement in a block is an `Example`. Not a conditions
   question, but it is decided at the same place in the code; flagged for the
   selection/examples dimension.
7. **Short-circuit vs full evaluation of Boolean conditions.** Unobservable except through
   RNG consumption, which is itself unobservable. §11.2 permits either.

---

## 16. Provenance of every count in this document

All counts were produced by parsing the archive with a purpose-built tokeniser and parser
(scratchpad `nlex.py`, `parse.py`, `cond.py`, `census.py`). The parser handles `//`
comments, `\"` string escapes, CRLF, and the level-ambiguity rule of §5.1. It reaches
**0 unterminated blocks and 0 condition parse failures over all 4543 conditional blocks in
all 180 non-empty `.n` files**, which is the evidence that the grammar in §5 is complete for
this archive. Compiled-object corroboration comes from `strings -n 5` over the 86 `.nso`
files, which yields exactly these condition-related class names:

```
CAlwaysCondition  CAndCondition  COrCondition  CChanceCondition  CFocusCondition
CPatternMatchCondition  CPropertyCondition  CConditionActionBlock
CDone  CContinue  CNextCategory  CSwitchBack  CSwitchTo  CWaitForResponse  CInterruptSequence
CArgListAnd  CArgListOr  CArgElemString  CArgElemPat  CArgElemPropty  CArgElemStarBf
CArgElemConcat  CArgElemCat  CArgElemCompute  CMemReference  CPatListDef  CCategory
```

There is no `COtherwiseCondition`, no `CNotCondition` and no `CTryAgain`: `Otherwise` is a
flag on `CConditionActionBlock`, negation lives inside `CPatternMatchCondition` and
`CPropertyCondition`, and `TryAgain` is a variant of `CWaitForResponse` — all three exactly
as [spec §3] and [spec §11] describe.

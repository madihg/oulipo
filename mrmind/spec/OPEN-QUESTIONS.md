# OPEN QUESTIONS

Everything about NeuroScript 2.2 and the MrMind3 build that the archive, the vendor's own
documentation, the conversation database and the patents do **not** settle. Each entry gives the
evidence, the hypothesis the implementation specification adopts (labelled as such), and how the
conformance corpus could settle it.

Companion: `IMPL-SPEC.md`, which is the document to implement from. Questions the census agents left
open but that **have** now been resolved are listed in §0 so nobody re-opens them.

Sources are cited as in `IMPL-SPEC.md`: `[man:Operators]` / `[man:BestFit]` = the vendor's NeuroScript
Language Manual (`spec/neuroserver-help/`), `[tut:N]` = the NeuroServer Tutorial,
`[spec §N]` = `archive/_research/patents/GERBIL-LANGUAGE-NOTES.md`, **CDB** = the shipped conversation
database (`_work/cdb/mrmind3/`).

---

## 0. Closed — do not re-open these

The census agents flagged these as unresolved; they are now settled. Evidence in the section of
`IMPL-SPEC.md` named.

| was open in                     | question                                                       | settled answer                                                                                         | by                                                  |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| B §14.1, F §15.6                | Does `#` match the empty string?                               | **Yes.** Zero or more characters, never crossing a space, never an apostrophe.                         | `[man:Operators]`; `IMPL-SPEC` §5.2                 |
| F §15.1                         | What does an unescaped `,` inside a pattern mean?              | **Zero or more spaces and/or punctuation marks.** Not "zero or one intra-word separator".              | `[man:Operators]` (`f,u,d,g,e`); `IMPL-SPEC` §5.2   |
| B §6.1 (implicitly)             | Do `^` and `%` fill one buffer slot each, or one per run?      | **One slot per run of consecutive `^`/`%`.**                                                           | `[man:Operators]`; `IMPL-SPEC` §5.7                 |
| C §15.1                         | Bare-`IfChance` group: exactly one, or independent 1/N?        | **Exactly one, uniformly chosen.**                                                                     | CDB arithmetic; `IMPL-SPEC` §6.5                    |
| D §9.1, G §9.1                  | Is `SayOneOf` uniform? Does it avoid repetition?               | **Memoryless (no anti-repetition). Uniform per execution.**                                            | CDB adjacent-repeat test; `IMPL-SPEC` §7.2          |
| F §15.5                         | What does a Sequence category return when it runs off its end? | **`NextCategory`.** Selection resumes among the Standard categories; it does not return to the caller. | CDB (`Shape` → `Generic answers`); `IMPL-SPEC` §8.3 |
| F §15.7                         | Does an empty-string attribute value satisfy `Recall`?         | **Yes.** Only `Forget` makes `Recall` false.                                                           | `[spec §6]`; `IMPL-SPEC` §3.4                       |
| E §14.2.2                       | Is `IfChance` treated as true during the activation scan?      | **Yes, with specificity 0**, rolled for real at execution.                                             | `[spec §14.1]` + CDB; `IMPL-SPEC` §8.4              |
| E §14.1, D §                    | Multi-argument `Focus` ordering                                | **Moot.** Zero multi-argument bare `Focus` in the archive.                                             | `IMPL-SPEC` §7.6                                    |
| C §15.3                         | What does `IfFocused` mean?                                    | **An exact synonym of `Focused`.** (Still an inference, but a safe one — see §9 below.)                | `IMPL-SPEC` §6.1                                    |
| G §5.2-5.3 (as a factual claim) | Is Name Capture's retry logic live?                            | **No — it is dead code.** `?NameTries` never becomes `"2"`.                                            | block nesting re-verified; `IMPL-SPEC` §9.4         |

---

## 1. Word-level versus character-level matching — the one high-stakes call

**Status: decided against one vendor source. This is the first thing to test if a running NeuroServer
2.2 ever surfaces.**

### The evidence, all of it

**For word-level** (adopted, `IMPL-SPEC` §5.1):

1. `[man:Operators]`, the vendor's own Language Reference, summary table:

   | user input                  | pattern       | match? |
   | --------------------------- | ------------- | ------ |
   | `Are you a robot?`          | `robot`       | Yes    |
   | `Have you seen any robots?` | `robot`       | **No** |
   | `Have you seen any robots?` | `robot#`      | Yes    |
   | `Chat World Site`           | `chat# site#` | **No** |
   | `Chat World Sites`          | `chat#*site#` | Yes    |

   and in prose: _"Each word in the input pattern must match a user's input exactly, therefore,
   'virtualrobotic' and 'virtuallyrobot' do not match [`virtual*robot`]."_

2. `[6604090:3990]`: the matcher is an NFA _"where each node represents a pattern and each arc
   represents an element for pattern matching, for instance a word, space, punctuation mark, wildcard
   character"_; `[6604090:3228]`: `*` _"can match zero or more words"_.
3. `Mrmind3/Patterns.n:10-11` —
   `PatternList AILIFE is "ALIFE","android","Artificial intelligence","bot","computer","computer program","droid","machine","robot";`
   Under a character-level reading `"bot"` subsumes `"robot"` and `"computer"` subsumes
   `"computer program"`; both extra entries would be pointless.
4. `Mrmind3/Patterns.n:98` — `PatternList BOTS is "BOT","BOT's","Program","Programs","machine#","computer#";`
   Under a character-level reading the `#`s and the `"BOT's"`/`"Programs"` entries are all dead weight.
5. Measured false-positive rate over the 479 non-empty `Example` strings of the build used as a sample
   of real inputs: `Contains "us"` (an element of `StdP.I`) matches **0** word-level and **36**
   character-level ("User Survey", "I want the user survey."); `Contains "no"` (an element of `NT`)
   matches 15 vs 57; `Contains "I"` 222 vs 355. `notheard NT` guards are everywhere in the bot; under
   a character-level reading they are false for almost any input containing "know", "now", "another"
   or "cannot", and the bot collapses.

**Against word-level** — one source, one exercise. `[tut:2661-2679]`:

> 5. Edit the pattern to add an asterisk wildcard in place of the "was". Change the line
>    `If Heard "who was kronos"` to `If Heard "who*kronos"`
> 6. Test the topic in the Console window. The following variations should activate the who was
>    kronos topic: `who was kronos` / `who is kronos` / **`whois kronos`** / `who is krosno` /
>    **`whoaskfl kronos`** / **`whoaskflkronos`**

The word-level matcher reproduces the first, second and fourth of those and rejects the three in bold.

### Hypothesis adopted

**Word-level, with token-edge anchoring**, compiled exactly as `IMPL-SPEC` §5.5. `*` matching a
non-empty span requires a token edge on both sides; `*` matching nothing requires no edge at all (this
is what makes `virtual*robot` match `virtual/robot` and `virtualrobot` but not `virtualrobotic`). The
tutorial's exercise is a prediction written by a technical writer, not a specification, and it is
contradicted by the same vendor's reference manual.

### Consequences if it is wrong

- `"fantas*"`, `"mast*rbat#"` and `"search*for"` in the archive would come alive; under word-level they
  never fire. Each has a working sibling in the same list, so nothing observable is lost either way.
- `Contains "what"` would match "somewhat"; `Contains "bot"` would match "about" and "robot".
- The default-response rate would fall well below the CDB's 26 %.

### How to settle it

1. **Best**: run the CDB's 7,160 recorded inputs through both matchers and compare the resulting
   default-response rate against the engine's own 25.68 %. A character-level matcher will over-match
   badly and drive the rate down; word-level should land in the band. This is
   `IMPL-SPEC` test 60 and it discriminates cleanly.
2. **Second best**: replay the 545 `Example` statements through the verifier under both models and
   compare the "correct answer given" count.
3. Put the boundary rule behind a single flag so the experiment costs nothing.

---

## 2. The specificity word-frequency corpus

**Status: the formula is fully specified; the corpus is not. This is the largest single risk to output
fidelity.**

### What is settled

`[spec §14.2]`: specificity is `round(1000 · ln(1/f))`; `f` for a matching condition is _"the frequency
of that word within the set of Examples"_; a partial word takes _"the combined frequency of all words
in the set of Example that match the partial word"_; a string of words takes the **product** of the
individual frequencies (hence the sum of the logs). Conjunctions sum and subtract 1000 per child
beyond the first; disjunctions take the max over true children; a `PatternList` takes the max over
matched elements; `*` and spaces contribute 0; unregistered attributes score 2000. The vendor's own
verification report shows real integers of the right scale (`3753`, `3169`).

### What is not

1. Do the **library's** `Example` statements count alongside the bot's? `QuesResDebug.us.n` contributes
   a handful (`Example "YO"`, `InitialExample 1 "hi"`, `InitialExample 2 "My name is Fred"`, …).
2. Do **`OtherExamples`** strings count? The build has 182 of them against 545 `Example`s — a 33 %
   swing in corpus size.
3. Does `InitialExample` count?
4. How exactly is the corpus **tokenised**? Lower-cased? Punctuation stripped? Are `<BR>` tags removed
   first (they occur in no `Example` string, so probably moot)?
5. How are **`#`-prefix frequencies aggregated**? "the combined frequency of all words in the set of
   Example that match the partial word" is clear in principle; in practice `develop#` must be summed
   over every corpus word matching `develop*`, which requires a prefix index.
6. What is `f` for a word **absent** from the corpus? Dividing by zero is not an option.
7. Did NeuroServer ship a **base word-frequency dictionary** that the script's Examples were added to?
   Nothing in the archive suggests one, but nothing rules it out either.

### Hypothesis adopted (`IMPL-SPEC` §8.5)

All `Example` **and** `OtherExamples` strings from **every loaded file** (library included), tokenised
the same way as user input, lower-cased. `Example ""` contributes nothing. An absent word is treated as
having frequency `1/N` where `N` is the corpus token count, i.e. maximum specificity. No base
dictionary.

### How to settle it

The CDB is a calibration harness with 7,160 labelled inputs. For each recorded turn it names the topic
that actually answered. Implement the corpus as a swappable strategy and grid-search the seven
variables above against two targets: the 25–27 % default band, and per-topic attribution accuracy over
the 1,094 topics that ever fired. The top-40 table in `E-topics-focus-and-selection.md` §10.3 gives a
ranked target distribution. Expect the answer to be visible: including or excluding `OtherExamples`
changes every `ln(1/f)` in the system.

The patent's own verification report gives two exact integers (`3753` and `3169`) for a known
two-topic script reproduced verbatim in `[spec §15]`. Reconstructing that script and hitting both
numbers would settle the formula independently of MrMind.

---

## 3. What normalisation, if any, the `Matches`/`Contains` path applies to the input

**Status: three sources, no consistent reading. Adopted: none.**

### The evidence

- `Mrmind3/Reactions/Compliments.n:51-52`, the author's own comment:

  ```
  	If ?WhatUserSaid ExactlyMatches GRINNIES
  	//we have to use exactlymatches here -- otherwise punctuation is stripped.
  ```

  with `PatternList GRINNIES is ":-)","(-:",":)","(:",";-)","(-;","8-)","[-)","=:-)",":-]";`. The plain
  reading is that the `Matches` path would have stripped the emoticon away to nothing.

- `[tut:2591]`: _"NeuroServer strips out punctuation so that it doesn't matter if the user puts a
  question mark at the end or not."_
- **But**: `Library/StdQuestion/combis/QuesResDebug.us.n:1381`, inside `StdQ.FindOtherQuestion`, detects
  a question with `?StdQ.PossibleQuestion contains "*#\?*"`. If the matcher stripped the `?`, the
  entire `?OtherQuestion` mechanism would never fire — and the CDB shows it firing.
- **And**: `Mrmind3/Utilities/WebNameGreet.n:540` `If ?NameCapture.TempName Matches "*\,*"` (the
  "Smith, John" case) and `Base/Defaults/HighDefault.n:33` `or (?OtherStatement Exactlymatches "?")`
  both require punctuation to be present in attribute values.
- The script pipeline **does** strip punctuation, but only quotes, parens and asterisks, and only from
  `?WhatUserMeant` (`Sequence topic "remove excess punctuation"`, `QRD:439-464`). It never touches
  `?`, `.`, `,`, `!`, `:` or `;`. `GRINNIES` contains parens — but the Compliments condition tests
  `?WhatUserSaid`, which that pipeline never touches.

### Hypothesis adopted

**The matcher is punctuation-preserving and performs no normalisation.** `ExactlyMatches` differs from
`Matches` only in that it does not interpret wildcards — which, for `GRINNIES`, is already decisive:
under `Matches`, `":-)"` would be fine but `"(-:"`, `"(:"`, `"8-)"` and `"[-)"` are patterns whose
parens are literal only by luck, and `"=:-)"` and `":-]"` likewise; more importantly a `Matches`
against the same list would still have to contend with the author's other lists. The comment may
simply record an earlier revision's behaviour, or a confusion with the `?WhatUserMeant` pipeline.

**The Compliments comment remains unexplained.** It is recorded here rather than resolved.

### How to settle it

Replay the CDB looking for turns answered by `Topic "grinnies"` and see whether the input was a bare
emoticon or an emoticon inside a sentence. If `ExactlyMatches` is behaving as pure equality, only bare
emoticons will appear. Failing that, test whether any recorded input containing a trailing `?` was
answered by a topic whose condition requires the `?` to be present (`FindOtherQuestion` sets
`?OtherQuestion`, which 2 build topics read).

---

## 4. Greediness — which of several possible matches fills the star buffer

**Status: unspecified by every source. A port decision.**

Nothing in the archive, the Language Manual, the tutorial or the patents says which path fills the
buffer when a pattern can match in more than one way. The patents describe a non-deterministic
automaton, which is silent by construction.

**Hypothesis adopted**: greedy, leftmost-first — exactly JavaScript `RegExp` semantics
(`IMPL-SPEC` §5.7). Weak supporting evidence: `Library/StdQuestion/StdQuestion.us.n:675-678` does
`matches "#"+"*"` and then tests `#1 matches "been"`, which only works if `#` is greedy.

**Consequence**: `Contains "*@*"` on `my email is a@b.com ok` gives `*1 = "my email is a"` and
`*2 = "b.com ok"` rather than the shortest split.

**How to settle it**: the name parser is the most star-buffer-dense code in the build and the CDB
records the resulting `?Name` for hundreds of turns (`M: Hi Peggy!`, `M: Hi Pw!`). Replay every
recorded name-capture turn and compare the captured name under greedy and lazy quantifiers. Names with
titles, initials and commas ("Bond, James Bond" is an explicit case at `WebNameGreet.n:585`) should
discriminate.

---

## 5. `?Attr` spliced into a pattern: literal text or a re-parsed pattern?

22 occurrences in the build, e.g. `customization/NameCustomize.n:55`:

```
	If ?WhatRobotSaid matches "By the way, is " + ?Name + " <BR>your real name or a special <BR>one just for me?"
```

**Hypothesis adopted**: the spliced value is **literal text**, not re-parsed as a pattern
(`IMPL-SPEC` §5.3). Rationale: a user whose name is `*` would otherwise match everything, and a user
named `a.b` would match a class of strings.

**Why it is untestable from the archive**: no archive case has a wildcard character in the attribute's
value, because the values are always names, question fragments or bot utterances the bot itself
produced.

**How to settle it**: type `*` as your name. If the port re-parses, `Topic "Who is User's name?"`
(`WebNameGreet.n:784`, condition `?WhatUserSaid contains ?Name`) will fire on every subsequent input.
The original would have done the same if it re-parsed; nobody recorded it. A CDB search for a user
whose captured `?Name` contains `*`, `#`, `,` or `.` would settle it — the name parser strips commas
and periods, so `#` is the likeliest survivor.

---

## 6. The separator in `?EverythingRobotJustSaid`

`Library/Utilities/components/CMailUtil.n:53` documents the attribute as _"a concatenation of robot
say's"_. The web template `Mrmind3/HTML/MRMIND3Say.htm` puts the whole run's output into one
`[[EverythingRobotJustSaidHTML]]` slot inside a `<pre>`.

**What is not known**: what, if anything, the engine inserts between consecutive utterances. No
archive string ends in `<BR>`, and the four two-`Say` topics (`Machines.n:206`, `Machines.n:273`,
`Choice.n:129`, `Misc.n:69`) would run together without a separator.

**Hypothesis adopted**: `<BR>` for the HTML form, `\n` for a text surface. Make it a single
configurable constant (`IMPL-SPEC` §11.6).

**How to settle it**: the CDB stores each utterance as its own `SAY` row, so it cannot show the
joiner. The Wayback capture of `mrmind.com` (`archive/_research/wayback/`) might contain a rendered
reply page from a two-`Say` turn; that would show it directly.

---

## 7. Backslash edge cases

### 7.1 `\\` in a string literal

Absent from every live string in the Mrmind3 build (its one appearance,
`AboutMrMind/MMIdentity.n:179`, is inside a `//` comment). Present in **61 live strings** across six
`Base` files, always a log path: `Base/context-free/why.n:20`
`SaytoFile "speciallogs\\why.log" ?WhatRobotSaid;`. No compiled object for `Base` survives.

**Hypothesis**: the lexer has one rule — consume backslash plus the next character, collapse only
`\"` — so `\\` yields two backslashes, and Windows tolerated the doubled separator. Under that rule
`[man:Operators]`'s own example is consistent: _"The following conditional clause matches the user's
input `\`: `IfHeard "\\" Then`"_ — i.e. `\\` in a **pattern** denotes a literal backslash. So in a
pattern `\\` collapses to one backslash at the _pattern_ level while remaining two characters at the
_string_ level. Both readings agree.

Since `\\` never reaches the shipped bot, either behaviour is acceptable.

### 7.2 The case-sensitivity escape

`[man:Operators]`: _"Type a back slash (`\`) immediately before the letter you want to match exactly.
For example, `IfHeard "\May"` matches 'May' or 'MAY', but not 'may'."_

Note that the manual's own example is self-contradictory: if `\M` forces a case-sensitive match on
`M`, then `"MAY"` matches (M is capital) but so does `"May"` — consistent — while `"may"` does not.
So the escape makes **that one character** case-sensitive, not the whole pattern. But whether the
_rest_ of the pattern stays case-insensitive is only implied, never stated.

**Zero occurrences in the archive** — no escape before an alphabetic character occurs anywhere in any
`.n` file. Nothing in MrMind depends on it. Implement it as "this character only" or omit it.

### 7.3 Multi-line string literals

Every live string in the build is single-line (of 14,180 lines exactly 10 have an odd unescaped-quote
count and all 10 are comments). One **commented-out** fragment shows an author writing a string across
a raw newline, `Mrmind3/Issues/Misc.n:133-136`.

**Hypothesis**: the lexer permitted a newline inside a literal, since the author presumably had that
code working before commenting it out. **Recommendation**: reject an unterminated literal at
end-of-line with a clear error rather than resynchronising silently. No live example exists.

---

## 8. The malformed operator sequences

Both are real, both compiled, and neither can be recovered from the `.nso` (the string dump cannot
distinguish a `CArgElemConcat` from a two-element `CArgListOr` at a given site).

### 8.1 `Say "…" + ,`

`Mrmind3/Issues/Misc.n:69-70` and the identical `Mrmind3old/Issues/Misc.n:67`:

```
		Say "Earth's atmosphere is over 75% <BR>nitrogen, and nitrogen scatters <BR>light at a " + ,
		"wavelength of 80 <BR>angstroms -- which, to humans, <BR>appears blue. I don't see the <BR>sky much.";
```

`Mrmind3/NSOBJ/__Issues_Misc.nso` contains both strings. The author plainly meant `+`.

**Hypothesis adopted**: parse `+` followed by `,` as a plain `,`, giving two utterances — matching the
three other multi-argument `Say`s in the build (`IMPL-SPEC` §2.5). Low stakes: it is one utterance
about why the sky is blue. Alternatively hard-code these two lines as `+`.

**How to settle it**: search the CDB for either half of the string. If both appear as separate `SAY`
rows with the same `nINPUT_LINE_ID`, it was a comma; if one row contains both halves concatenated, it
was a `+`.

### 8.2 `SayOneOf X + "  " + ;`

`Mrmind3/Utilities/CProfanity.n:84, 92, 98` — a trailing `+` with no right operand. Occurs nowhere else
in the archive.

**Hypothesis adopted**: an empty final concatenation operand, i.e. `SayOneOf X + "  ";` — every
profanity response gets two trailing spaces. A second hypothesis, unsupported but not excluded, is
that it signalled "do not terminate the output line" so the next `Say` in the same run would join it.

**How to settle it**: the CDB contains profanity responses. Check whether any `SAY` row for
`Topic "Tsk Tsk"` ends in two spaces, and whether it was ever concatenated with the following row.

---

## 9. `IfFocused`

4 occurrences in the build, all `Mrmind3/Issues/Life.n:151, 152, 166, 167`, plus the same 4 in the
`Mrmind3old` copy — 8 in the whole archive. Not in any patent BNF, not in `[man:Operators]`, not in
`[man:BestFit]`.

```
Mrmind3/Issues/Life.n:147-156
Topic "I'm on the ALIST" is
Subjects "ALIFE","LISTS";
	If (?IsStatement Contains "I am "+HEX+ ALIST)
		or (IfFocused and Heard ALIST)
		or (IfFocused and Heard "A","the"+ ALIST)
	Then
		Example "I'm on the ALIST";
		Say "Humans do not make <BR>the ALIFE A-LIST.";
	Done
```

The file is in `MRMIND3.vsr`, so the compiler accepted it.

**Hypothesis adopted**: an exact synonym of `Focused`. The only support is the language's uniform
`If<X>` single-condition spelling of every clause keyword (`IfHeard`, `IfRecall`, `IfDontRecall`,
`IfChance`, `IfNotHeard`) and the fact that the file compiled.

**How to settle it**: not settleable from the archive. If it were anything other than a synonym — say,
"focused on _this_ category specifically" rather than "shares a subject with the active set" — the
observable difference would be confined to `Topic "I'm on the ALIST"`, which produced no CDB rows.
Nothing else in the build would change.

---

## 10. `TryAgain` when a scope contains more than one `WaitForResponse`

`IMPL-SPEC` §6.3 specifies: from the `TryAgain` token, scan backwards through its own block
(descending into earlier nested blocks, last one wins), then to the parent, up to the category top.

**No block in the archive contains two `WaitForResponse` statements in the same scope chain**, so the
"textually last one in scope" tie-break is unfalsifiable. It resolves every archive case uniquely, so
nothing in MrMind depends on it.

---

## 11. `ActiveCatPos` after a `WaitForResponse` continuation resumes

`[spec §11]` states explicitly that when `ReturnVal` is `Switch` and the target is a Standard category,
`RunTime->ActiveCatPos` is set as well. It says nothing about the continuation case:

> "If there is an active CContinuation remaining from a previous execution (due to a WaitForResponse),
> it is activated immediately after the Priority categories."

**Why it matters**: if `ActiveCatPos` is set, best-fit selection resumes _from that position_ in the
attention list rather than from the front. 40 of the 89 `WaitForResponse` statements in the build are
in Standard categories, so this path is exercised constantly.

**Hypothesis adopted**: it **is** set, by symmetry with the documented `Switch` case
(`IMPL-SPEC` §8.3, §11.5).

**How to settle it**: the discriminator is a turn where a Standard category's continuation resumes,
returns `Continue` or `NextCategory`, and a _second_ category then answers. The CDB has only five
genuine multi-round turns (`WhatAmIQ` → `WhatAmIQ2`, `Shape` → `I am human.`, `Shape` →
`Generic answers`, `Shape` → `IHave`, `Knock Knock.` → `Is that your RealName`) and none isolates the
question. A port that implements both and diffs the full 7,160-input replay would show whether any
turn changes at all; if none does, the question is moot for MrMind.

---

## 12. `NextTopic` versus `Continue` in the selection loop

`[spec §21.6]` flags this. `[6604090:4238-4249]` says the loop repeats _"If the category returns a
value of Continue or NextTopic"_, and separately that _"Blocks in categories that have already been
executed are excluded from the computation."_

Under the `Executed` flag both cases are identical — the category is excluded either way — and the
CDB's five multi-round turns are consistent with that. **No archive case distinguishes them.**
`IMPL-SPEC` §8.3 treats them identically.

---

## 13. `MemoryLock`

Not in any patent BNF. 132 occurrences in the archive, 33 in the build, **all 33 inside
`Library/StdQuestion/combis/QuesResDebug.us.n`**; Peggy Weil's own files never use it.

The patent-adjacent language reference `[spec §3]` describes it as a **compile-time assertion**: _"it
is an error for a program to assign a value to `?x` using Remember or Forget anywhere outside the
category C, or to MemoryLock `?x` in some other category."_ Corroborated by the serialised runtime
`Mrmind3/MRMIND3.vre`, which contains `CRemember`, `CForget`, `CFocus`, `CSuppress`, `CSwitchTo`,
`CWaitForResponse` … and **no `CMemoryLock` class**.

An alternative reading, offered in `D-commands.md` §3.5, is that it declares an attribute exempt from
some automatic between-input clearing. The strongest evidence for that reading is the deliberately
commented-out `//MemoryLock ?WhatUserMeant;` at `QRD:133`, immediately above the line that re-derives
`?WhatUserMeant` from scratch every run.

**Hypothesis adopted**: compile-time only, no runtime effect (`IMPL-SPEC` §3.4). Parse and ignore, or
use as a lint check. **A no-op registry is behaviourally safe for MrMind3 either way**, because the
scripts `Forget` and `Remember` explicitly and nothing depends on automatic clearing.

**Note the internal inconsistency to preserve**: the `MemoryLock` list at `QRD:259-271` names 31
`?Previous*` attributes and omits `?PreviousOtherStatement`, which is nonetheless written at
`QRD:336`. Under the compile-time reading this is a latent lint error with no runtime effect.

---

## 14. `Compute SpellCheck`

The one call is `QRD:149`. It runs the Wintertree spell-checker against `ssceam.tlx`, `ssceam2.clx`,
`Additions.tlx` and the thesaurus `thesdbam.cth`, plus the project lexicons `Mrmind3/MRMIND3.tlx`
(1,219 bytes) and `MRMIND3.script.tlx` (15,603 bytes). **The three shared dictionaries are named in
`[DICTIONARY FILES]` but are absent from the archive**; the two project lexicons are present as
undecoded binaries (a `.tlx` is a `#LID <n>` header followed by tab-separated `WORD<TAB>i` lines, so
they are readable).

Two scripts depend on its behaviour:

- `WebNameGreet.n:458-463` captures the first word of `?WhatUserSaid` and of `?WhatUserMeant`
  separately — _"a check for people whose names spell-check to cause bogus response-type
  activations"_ — and `:142` uses `?String1 matches ?String2` to detect the damage. (That block is
  dead code, `IMPL-SPEC` §9.4, so identity is safe there.)
- `Activities/ategag.n:19-20`: _"this relies on zink, zlink, and pkink being 'words' that cannot be
  entered through the spell checker."_ Under an identity function the sentinels still work — the user
  would simply have to type them literally — so the gag survives.

**Unknown**: whether it is word by word or phrase-aware, whether it preserves case, what it does with
proper nouns, and what its edit-distance threshold is.

**Hypothesis adopted**: make it the identity function behind a pluggable hook and record the
divergence (`IMPL-SPEC` §4.3). Degrades typo tolerance; breaks no topic.

**Path to better fidelity, in order of cost**: (i) decode `MRMIND3.tlx` and `MRMIND3.script.tlx` for
the project-specific vocabulary; (ii) find a Wintertree `ssceam.tlx` elsewhere; (iii) implement a
nearest-word algorithm over whichever dictionary is available. Note that (iii) without (ii) will
correct _different_ words than the original did, which may be worse than identity — a wrong correction
changes the match, while no correction merely fails to help.

---

## 15. `Capitalize`: per word or first letter only?

`Mrmind3/Utilities/WebNameGreet.n:675-690` always runs `Compute Lowercase` immediately before
`Compute Capitalize`, so the two readings are indistinguishable from the build.

**Hypothesis adopted**: per word. Implied by the name and by
`remember ?Name2 is compute capitalize of #1;` applied to a surname fragment.

**How to settle it**: the CDB records `?Name` interpolated into hundreds of replies. Find a recorded
turn where the user gave a two-word name that survived the parser (the parser usually truncates to one
word, but the title path at `WebNameGreet.n:604` keeps two). `M: Hi Mr Smith!` versus `M: Hi Mr smith!`
would settle it.

---

## 16. `Compute ratio` rounding

One call site, `Base/Inanities/Capabilities.n:498`, **not in the build**. The topic's own Example is
`"What is 22/7?"` and the reply format is `"I think it's "+?quotient+", "+?Name+"."`. No CDB row
exercises it.

**Hypothesis adopted**: integer division on decimal-string operands, matching `Sum`, `Difference` and
`Product`.

---

## 17. Cross-product enumeration order

`eval(A + B)` where both operands are multi-valued: is the enumeration `a1b1, a1b2, a2b1, a2b2`
(right-most index varies fastest) or `a1b1, a2b1, a1b2, a2b2`?

It only matters for a `Say` over a multi-valued concatenation, which **does not occur in the build**
(and for `SayOneOf`, where the choice is uniform over the whole product, order is irrelevant).

**Hypothesis adopted**: right-most index varies fastest (the natural nested-loop implementation).

---

## 18. `Remember ?X is <multi-element PatternList>`

`Mrmind3/Utilities/WebNameGreet.n:887` assigns a **three**-element list with `is` rather than
`IsOneOf`:

```
	   Remember ?RobotName is MYNAME;      // PatternList MYNAME is "mrmind", "mr mind","MRMIND";
```

Under `IMPL-SPEC` §3.4 and §7.5 an attribute holds a _list_, so this is well defined: `?RobotName`
holds all three values, and a `Matches` against it succeeds if any matches. `[spec §6]` documents
`IsOneOf` as the nondeterministic collapse-to-scalar form, which implies `is` does not collapse.

**Residual uncertainty**: if `is` did collapse (to the first element, say), `?RobotName` would be
`"mrmind"`. **Low impact — `?RobotName` is read nowhere in the build.** The same question would matter
for `Remember ?Name is STDN_USERDEFAULTNAME;` (`WebNameGreet.n:109`), but that list has exactly one
member (`"User"`), so it is unaffected.

**How to settle it**: `Base/Defaults/Default.n:349-357` uses `IsOneOf` explicitly precisely to avoid a
cross-product blow-up in a following `Say`, which is evidence that `is` does **not** collapse.
Adopted: `is` assigns the whole list.

---

## 19. Whether `Example` counts as a base-level statement

`[spec §14.1]` defines a base-level block as one containing _"at least one non-IF statement at its top
level"_. `Example` is a non-`If` statement, so under a literal reading it qualifies — meaning a block
whose only content is `Example "…";` would be an eligible activator and would make its category a
best-fit candidate.

Flagged by `C-conditions.md` §15.6. **No block in the build has an `Example` as its only statement**
(placement convention is `Example` first, then the `Say`), so nothing hinges on it.

`IMPL-SPEC` §8.4 treats it as a statement, hence base-level.

---

## 20. Chance clauses inside Boolean expressions

`[spec §14.1]` says `IfChance` conditions are treated as always true during the activation scan. It
does not say whether a bare `Chance` **clause** (as opposed to an `IfChance` **head**) is treated the
same way.

The single build occurrence — `Mrmind3/Utilities/WebNameGreet.n:67`, `IfRecall ?HaveName AND Chance 60%`
— is inside a `Sequence` topic, which is never best-fit selected, so the question is unobservable in
the shipped bot.

**Hypothesis adopted**: it is the same `CChanceCondition` object and is treated identically
(true with specificity 0 at scan time, rolled at execution).

A related unobservable: RNG **consumption order** when a `Chance` clause sits inside a short-circuited
Boolean expression. Either short-circuit or full evaluation is permitted, since nothing else observes
the RNG stream.

Also: `If Chance then` with **no argument** as a clause occurs twice, both in
`Mrmind3old/Issues/Choice.n:10, 16`, and **not in the shipped build**. Hypothesis: identical to a bare
`IfChance`, i.e. it joins a random-choice group with the adjacent blocks. Nothing shipped depends on it.

---

## 21. `InterruptSequence` fidelity

Only 3 uses, all in `Sequence Topic "Name Capture"` (`WebNameGreet.n:112, 130, 144`), and all three are
**dead code** under the mis-nesting of `IMPL-SPEC` §9.4.

The author's own comment records that the construct did not behave as they expected on the shipped
engine:

```
Mrmind3/Utilities/WebNameGreet.n:147
		//for some reason this interruptSequence is not getting greeting topics.
```

No transcript in the CDB isolates it. **Implement the documented semantics** (push a continuation onto
`SequenceContinuations`, return `NextCategory`; a later `Done` pops it and resumes) and accept that
this specific interaction may not be reproducible.

---

## 22. Suppression versus `Focus`

`[spec §11]` says suppression wins: a suppressed category is not executed _"even if an explicit Focus
command would purport to move it to the front of the attention focus list."_

**Not exercised in MrMind3.** The single `Suppress`-by-name target (`"Login from Console"`) is never a
`Focus` target, and the 36 `Suppress This;` uses are all in `Defaults/OneShots.n` and the debug-defaults
topic, none of which is ever focused.

`IMPL-SPEC` §7.6 implements suppression-wins.

---

## 23. Dead grammar the port will never exercise

Listed so nobody spends time on them. Each has **zero occurrences in every `.n` file in the archive**,
so no archive behaviour depends on the semantics:

`IfNotHeard`, `NextScenario`, `DoesNotExactlyMatch`, `Do`, `DoOneOf`, `Show`, `ShowTemplate`,
`ShowLocalFile`, `Recover` (1 use, not in the build), `RememberOneOf`, `ForgetOneOf`, `SwitchToOneOf`,
`IsOneOf` (76 uses, none in the build), `SequenceExample`, dotted `Example` indexes
(`Example 170.yes "Yes"`), `Expires` (10 uses, none in the build), `LastTopic` the _command_ (as
opposed to `?LastTopic` the attribute, 27 uses), `MarkResponse`, `ReplacePronouns`, `SubjectInfo`,
`TopicList` / `ScenarioList` / `CategoryList`, `Suppressed` in a category header, `SwitchTo <symbol>`
unquoted, the `$word` wildcard, the `&<integer>` star-buffer slot, `?<pat>:<symbol>` (another user's
associative memory), `Get … from PLUGIN`, and the whole `LoginAs` / `CreateUserAccount` /
`DestroyUserAccount` family.

`Do` deserves a footnote: it appears six times in the Mrmind3 build and **every one is commented out**,
so the compiled bot contains no `Do` at all, even though the class `CDo` exists in the compiled
objects. The dead lines record what MrMind's host front end understood
(`//	  	Do "SETNAME MS MIND";`, `//		Do "SHOW SRC=/MrMindFiles/Pegmsmindquip.htm TARGET=Peggy";`),
i.e. `Do` took an opaque host-specific string. Likewise the 19 commented-out `switchTo "show gif";`
lines refer to a topic that does not exist in the build.

---

## 24. Things outside the engine that the work depends on

Not language questions, but a revival that ignores them reproduces the engine and loses the piece.

1. **The `<BR>` column.** 698 of the 1375 output strings contain `<BR>`; measured across all 2494
   visual segments the wrapping target is **32–34 characters**. The 1998-2001 `.g` corpus contains one
   `<BR>` in total and `Mrmind3old/` contains zero — the whole Mrmind3 generation is the same writing
   re-broken to a narrow column. Rendering at 800px destroys the typography; rendering at ~34ch
   restores it.
2. **Eight image tiles.** `Activities/icons.n`'s 7 categories and 17 strings only make sense in front
   of the original page: one tile is of feet, one is a sunset, one is "the guy with the pink glasses"
   (`Say "Oh, that's Luis, a human artist.";`). The tiles survive in
   `archive/_research/wayback/mrmind.com/*/site/images/parts/MA3.jpg` … `MB6.jpg`.
3. **The HQ score.** Six output strings promise or reference a "Human Quotient" score and an "HQ Quiz
   on the side menu". **No scoring code exists anywhere in the build** and no `?HQ`-like attribute is
   ever read or written. It was a separate page on `mrmind.com`. Whether it wrote back into the bot's
   memory is unknown. This was already true in 2002; it is not a porting bug.
4. **Dead links and a dead donation address.** `MRMIND@weblab.org` appears in six output strings, two
   of them as live unquoted `<a href=mailto:…>` anchors. `www.weblab.org/contribute` appears in the
   four `AnnoyanceFour` fundraising lines, reached only after the user has annoyed MrMind three times.
   The author left an off-switch (`Annoyance.n:59, 144-145` mark the three lines to comment out).
   **Whether to use it is an authorial decision, not a technical one.**
5. **`Mini Mind` versus `mrmind`.** `MMIdentity.n:1-12`, `Topic "WhatsYourName"`, answers
   `Say "My name is Mini Mind.";` while `MyName.n:21` declares
   `PatternList MYNAME is "mrmind", "mr mind","MRMIND";` and the greeting says "I'm mrmind". The
   adjacent topic reinforces it (`Say "No, I predate Mini Me...";`), and `Topic "Who is Mr Mind"`
   three lines later answers `"I am MRMIND, Pleased to meet you.  "`. **This is a contradiction inside
   the archive, not between the archive and any other source.** It may be deliberate — a bot that will
   not give a straight answer about its own name is entirely in character — or a leftover from a
   "Mini Mind" variant. There is no `Mini Mind` build in the archive. Reproduce it as-is.
6. **`SayToFile` and privacy.** 73 statements write the user's self-declared name, IP address and free
   text to 50 plaintext files. The bot tells the truth about this when asked
   (`Say "Yes, there is a log <BR>of this conversation.";`,
   `By the way, did you know that <BR>actual humans read my log <BR>files and see this stuff?`) and
   that honesty is artistically load-bearing and should be kept. **The writes should not be.**
7. **The 95 missing 1998 `.g` files.** `MrMind/MrMind.bot` `[FILES]` lists 110 source files; only 15
   are on disk. Everything in `Q&A\` (46 files), everything in `JB-added\` (32), all nine theme
   `.g` files. Total surviving 1998 content: 82 categories, 155 output strings, against 691/1375 for
   Mrmind3. **Any claim about the 1998 bot's corpus is a claim about 14 % of it.** Unless a copy
   surfaces, do not extrapolate.
8. **`Say "";`** — `Reactions/Annoyance.n:41`, `Topic "Shut up"`. The patents describe `Say` as
   unconditionally writing to the buffer, and the buffer is flushed at end of run, so an empty reply is
   sent. The template renders it inside `<pre><B>…</B></pre>`, producing a visually blank reply area
   rather than "nothing happened". **Hypothesis: the user saw a blank reply. That is almost certainly
   the joke.** Unverifiable without a running server. Do not fall through to a default.

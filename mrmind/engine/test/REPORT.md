# Conformance against the recorded conversations

Reproduce with `node engine/test/conformance.mjs` (about 3-4 minutes on an idle machine).

This is a measurement, not a pass/fail test. No engine constant was tuned to this file, no corpus row is special-cased, and no user text from the corpus appears below — only topic names, counts and script line references.

## What was replayed

`corpus/sessions.json`: 57 recorded sessions, 7304 user turns, 6751 of them with a reply the original logged, every reply tagged with the topic, source file and line that produced it.

Connection 1 alone holds 6,880 of the turns: it is the developer console, reset repeatedly inside one connection id. The harness splits a session into a new `Bot` at every recorded `"Robot Greeting"`, because that topic is reachable only from `Utilities/WebNameGreet.n:858` (the "Login over Web" Scenario, one `Web ACCEPT CONNECTION` per connection, which also suppresses the other path) and `:877` (the "Login from Console" Priority Topic, `Suppress This; SwitchTo`), so a second one inside one user record is impossible. That gives 391 user records. `bot.start()` is not called: "Login from Console" is a Priority **Topic** with `Always`, so the greeting is produced *by* the first input.

## Result

```
bot.json build MRMIND3 — 691 categories
replayed 7304 turns from 57 recorded sessions (391 user records)
  turns with a recorded reply   6751
  turns the original left silent 553

  (a) exact reply text          642 (9.51%)
      at least one exact line   796 (11.79%)
  (b) correct topic             2659 (39.39%)
      every recorded topic      2581 (38.23%)
  (c) answered when original did 6726 (99.63%)

  engine default-only           1830 (25.05%)
  original default-only         1835 (27.18%)
  engine spoke, original silent 548 / 553
  runtime warnings              0
  208269 ms (28.5 ms/turn)
```

Headline, as integers:

- **correct-topic rate: 39%**
- **exact-match rate: 10%**
- answered-when-the-original-did: 100%

## Mismatch causes

| count | share of misses | cause |
| ----: | --------------: | ----- |
| 1438 | 35.14% | different Standard topic won best-fit |
| 883 | 21.58% | engine answered where the original defaulted |
| 740 | 18.08% | both defaulted, different Default topic (IfChance) |
| 651 | 15.91% | engine fell through to a Default topic |
| 302 | 7.38% | recorded topic absent from this build (later build) |
| 34 | 0.83% | engine missed a Priority topic the original fired |
| 25 | 0.61% | engine silent, original spoke |
| 13 | 0.32% | some recorded topics absent from this build (later build) |
| 6 | 0.15% | engine fired a Priority topic the original did not |

## Twenty most-fired topics

| topic | recorded | engine agreed | rate | dominant miss cause |
| ----- | -------: | ------------: | ---: | ------------------- |
| Last Line Of Defense | 1263 | 113 | 8.95% | engine answered where the original defaulted (601) |
| Name Capture | 714 | 669 | 93.70% | engine fell through to a Default topic (26) |
| Robot Greeting | 386 | 386 | 100.00% | - |
| Exit Survey | 107 | 35 | 32.71% | different Standard topic won best-fit (40) |
| STD_Greeting Detect | 95 | 90 | 94.74% | engine fell through to a Default topic (3) |
| I'm repeating | 88 | 9 | 10.23% | different Standard topic won best-fit (73) |
| IHave | 82 | 43 | 52.44% | different Standard topic won best-fit (33) |
| WhyTalk | 76 | 3 | 3.95% | different Standard topic won best-fit (51) |
| No | 68 | 2 | 2.94% | engine answered where the original defaulted (35) |
| 20 questions | 68 | 6 | 8.82% | different Standard topic won best-fit (33) |
| Is that your RealName | 68 | 24 | 35.29% | engine answered where the original defaulted (22) |
| AskAboutPointers | 65 | 8 | 12.31% | different Standard topic won best-fit (37) |
| Yes to Intro | 65 | 23 | 35.38% | engine fell through to a Default topic (29) |
| AskMe3 | 64 | 35 | 54.69% | different Standard topic won best-fit (15) |
| Instructions | 60 | 2 | 3.33% | different Standard topic won best-fit (38) |
| SuperiorQ | 58 | 2 | 3.45% | different Standard topic won best-fit (36) |
| How | 56 | 9 | 16.07% | engine fell through to a Default topic (24) |
| UserSuggestions | 55 | 1 | 1.82% | different Standard topic won best-fit (31) |
| WhatAmIQ | 55 | 0 | 0.00% | different Standard topic won best-fit (39) |
| SuperiorQ2 | 54 | 0 | 0.00% | different Standard topic won best-fit (28) |

## What the ceiling actually is

Three things put 100 per cent out of reach, and they are large. They are stated here so the 39 per cent is read against the right denominator.

**1. Over half the corpus was recorded against different script text.** Every recorded reply carries the source file and line NeuroServer ran. Comparing those against the built categories' own line spans: 44.3% of the 7,312 recorded replies land inside the body the shipped `MRMIND3.vsr` sources give that topic, 47.9% land outside it (the topic moved, so the file was edited between that recording and this build), 4.4% name a topic this build does not contain at all, 1.4% name a different file, and 2.0% record no source. The recordings run from December 2000 to August 2001, with a tail of later turns reaching November 2004, and the same topic appears at several different line numbers across them ("Robot Greeting" at 867, 877, 879, 881 and 884), so the corpus is not one build at all. Reproduce with the line-span check described in this file's header comment.

**2. `Compute SpellCheck` is the identity function.** It runs on every input before any topic sees it (`Library/StdQuestion/combis/QuesResDebug.us.n:149`) and the original rewrote misspellings against a compiled binary lexicon (`Program/Ssceam2.clx`) that survives only as a prefix trie. This ceiling has now been measured rather than assumed, and it is **small**: of the 18,096 words in the 7,160 recorded inputs, 1,814 (10.02%) are unknown to the recoverable lexicons and 1,641 inputs (22.92%) contain at least one of them, but 83% of those unknown words have no neighbour one edit away — they are names, mashed keys, URLs and coinages, not typos. A reconstructed corrector rewrites between 0.13% (the vendor's own auto-change table alone) and 3.23% (most aggressive) of inputs, and its best effect on the correct-topic rate is +0.09 points. Reproduce with `node engine/test/spell-reach.mjs` and `node engine/test/conformance.mjs --spell=ed1`. See `engine/DEVIATIONS.md`, "Branch A".

**3. MrMind's defaults are decided by coin toss.** Every Default topic is gated on `IfChance` — 0.90, 0.70, 0.50, 0.20 down the one-shot ladder in `Defaults/OneShots.n`, then a bare `IfChance` ladder inside `Defaults/Defaults.n` "Last Line Of Defense" — and 27% of the original's replies came from a Default topic. Which default speaks is a draw from NeuroServer's RNG, which no port can repeat, and the default MrMind chooses is a question it then asks, so the *next* turn's answer topic (`?WhatRobotSaid matches "…"`, the whole of `Defaults/Answers.n`) diverges too. That is the single largest recurring miss in the table above.

The one number that is not subject to any of this is the default-fallback rate, which `spec/E-topics-focus-and-selection.md` §10.1 sets as the acceptance test at 25-27%. This engine answers 25.05% of turns from a Default topic alone; the recording answers 25.12% of the same turns that way. Selection is landing in the right place at the right rate; it is choosing a different member of the set.

## Engine corrections made against this measurement

Each was diagnosed from the manual or the patent first and adopted on the correct-topic number second. No corpus row is special-cased and no constant was fitted. The A/B ladder below is the first 1,500 turns (fast to re-run); the full-corpus numbers are at the top of this file.

| # | change | source | topic | exact |
| - | ------ | ------ | ----: | ----: |
| 0 | baseline | | 41.61% | 7.91% |
| 1 | a matching condition whose LHS is not the user's input scores as an attribute test, not by the pattern's word frequencies | `MANUAL__BestFit.txt` "how closely a pattern in a topic matches the current input"; `[P §14.5]` | 42.79% | 8.20% |
| 2 | `?WhatUserMeant` counts as the input | `QuesResDebug.us.n:136-141`; `IfHeard` compiles to it | 42.79% | 8.20% |
| 3 | the tested attribute's declared Specificity is added to the matched words | `[P §14.2]` "used when the attribute is tested using IfRecall or any matching condition"; US 6,754,647 | 43.68% | 8.80% |
| 4 | `?WhatUserSaidBefore` / `?WhatUserSaidBeforeThat` / `?WhatUserMeantBefore…` are maintained | `IMPL-SPEC §8.1`; `vendor-docs/WhatUserSaidBeforeThat.txt` | 43.98% | 8.43% |
| 5 | the focused subjects are the executed topic's, not the whole co-subject fan-out | `MANUAL__BestFit.txt` "set by the most recently activated (executed) topic" | 43.61% | 8.50% |

Correction 5 costs 0.37 points on the 1,500-turn window and gains 0.20 on the full corpus; it was kept because the manual is unambiguous and because it is what makes `Or (Focused and Recall ?YesResponse) Then SwitchTo "20 questions"` (`Activities/20Questions.n:14-22`) reachable at all — under the wider reading an answer about HELP also activated ME and WantSomePointers and the user's "yes" was stolen by a different sequence.

## The two harnesses disagree, and the recording says which is right

`engine/test/calibrate.mjs` replays the same database and reports a default-only rate near 38-39%, not the ~25% above. The difference is entirely the session model, and the corpus itself settles it. `calibrate.mjs` builds one `Bot` per CDB connection id; connection 1 holds 6,880 of the 7,160 recorded inputs, so under that model one user record accumulates for thousands of turns and the `Suppress` list and the hundreds of `IfDontRecall ?Told.X` guards starve the Standard phase. But connection 1 contains **331 recorded "Robot Greeting" replies**, and that topic is reachable at most once per user record: `Utilities/WebNameGreet.n:858` is inside the `Login over Web` Scenario (one `Web ACCEPT CONNECTION` per connection, and it suppresses the other path) and `:877` is the `Login from Console` Priority Topic, which begins `Suppress This`. The original therefore started a fresh user record 331 times inside that one connection id. This file's segmentation (a new record at every recorded "Robot Greeting", 391 records) is the one that matches the recording; `calibrate.mjs`'s number is a session-model artifact and should not be tuned against.

A second caveat applies to the archive's own 25.68%. `Mrmind3/MRMIND3CDB.cdb.report.txt` says it summarises **25 conversations and 6,187 user statements**, with the 11 December 2000 console session at 5,914 of them. The export replayed here holds **7,160 user statements across 28 connections with any input**, 6,880 of them in that same console session. The archive's figure was computed before roughly 970 further developer-console turns were added, so it describes an earlier snapshot of this database, not the rows replayed here. It is a band to land in, not a number to hit.

## Merge of branches A, B and C

Three parallel experiments were run against separate copies of the engine and merged here. **The merge changed no runtime behaviour**: every runtime change any branch proposed either measured worse on the full corpus or was contradicted by its own source. What was kept is evidence and pinned tests. The numbers at the top of this file are therefore identical, turn for turn, to the pre-merge engine.

**Kept**

- `test/bestfit.test.mjs` (7 assertions). Reproduces `MANUAL__BestFit.txt`'s four worked "sales vRep" topics ordinally and `[P §14.4]`'s 9000-vs-14000 arithmetic to the integer. It passes against the unmodified engine, so it is a pin, not a change.
- `src/spellcheck.js` + `data/*.tlx` + `test/spellcheck.test.mjs` (38 assertions) + `test/spell-reach.mjs` + `test/spell-sweep.mjs` + `conformance.mjs --spell=<preset>`. An approximate Sentry corrector built from the archive's own `.tlx` lexicons and `Ssceam2.clx`'s affix table. **It is off by default and the measurement says leave it off.** `new Bot(program)` still gets the identity function.

**Tried and discarded, with the numbers**

| change | source it cited | full-corpus effect | why discarded |
| ------ | --------------- | ------------------ | ------------- |
| spelling correction, 6 presets (auto / ed1 / ed1freq / ed2long / short / sentry) | `vendor-docs/Tutorial4.txt:11-19, 32-35, 69-71, 77-78`; `Additions.tlx:71-93` | best variant: topic 39.39% -> 39.48%, exact 9.51% -> 9.49%, default-only 25.05% -> 24.81% | at most 22.9% of inputs contain a word the lexicon does not know, 83% of those unknown words have no neighbour one edit away, and the best corrector rewrites 1.4-3.2% of inputs. Every variant moves the default rate *away* from the band. |
| D6: an unset attribute in pattern position supplies no alternative rather than the empty pattern | `[D §1.2]` grammar `eval(?A) = memory[A] (* [] if unset *)`; `vendor-docs/Matches.txt` | calibrate default 38.60% -> 38.74%, calibrate exact 9.22% -> 9.10%; conformance topic 39.39% -> 39.11%, exact 9.51% -> 9.39%, default-only 25.05% -> 24.53% | four of the six headline metrics worse, including both the brief names, and it drops out of the 25-27% band. The same `[D §1.2]` says `eval(*n) = [ starbuffer[n] ] (* "" if unbound *)`, so the section does not speak with one voice; the measurement breaks the tie. The narrow variant (`mem` only) measures **turn for turn identical** to the wide one, so the star/PatternList/unresolved-symbol arms were no-ops in this build. |
| specificity arithmetic: log base 2 and 10, doc-frequency `f`, exact-stem partial words, `missingCount` 0.5 and 2, phrase penalty 1000, attribute bonus off, negated specificity 2000, conjunction penalty 0 and 2000 | `[P §14.2-14.4]` | base 2 bit-identical; base 10 worse on 3 of 4; doc-frequency +7 topic / -12 exact; every other variant worse | the defaults are what the patent states verbatim (`1000` scale, `1000` conjunction penalty, `100` focused unit, `2000` default attribute specificity). Nothing that measured better also survived its source. |

Branch C additionally verified, and left unchanged: `#` semantics against every row of `MANUAL__Operators.txt`'s summary table (65 of 66 hold; the one failure is documented divergence X1, which the manual contradicts three lines later); `Matches` vs `Contains`; `,` and `.` inside pattern strings against the real shipped profanity and name-parser strings; trailing-punctuation tokenisation; the run loop's exclusion of executed categories, first-active-block rule, build-order Priority and Default scans, and `Done` semantics; and `WaitForResponse` resumption ahead of best-fit. Two latent inconsistencies were reported and deliberately not changed because nothing in the build reaches them: `runtime.needsStructural` does not walk `concat` (0 of 172 `and` lists and 0 of 5 `not` nodes sit under one), and `renderValue`'s `optional` branch drops the node's `op` (0 of 8 `optional` nodes carry `op:'and'`).

## What is left, and whether it is fixable

- *different Standard topic won best-fit* is now mostly cascade: the previous turn already diverged, so `?WhatRobotSaid`, the focus list and the StdQuestion flags all describe a different conversation. Not separately fixable; it shrinks only as the per-turn accuracy rises.
- *both defaulted, different Default topic* is the `IfChance` draw. Not fixable.
- *recorded topic absent from this build* is the later build. Not fixable without those sources.
- *engine silent, original spoke* is the only bucket that would be a plain bug, and it is 25 turns out of 6751. Worth re-reading if it ever grows.


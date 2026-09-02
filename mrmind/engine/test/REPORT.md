# Conformance against the recorded conversations

Reproduce with `node engine/test/conformance.mjs` (about 3-4 minutes on an idle machine).

This is a measurement, not a pass/fail test. No engine constant was tuned to this file, no corpus row is special-cased, and no user text from the corpus appears below — only topic names, counts and script line references.

## What was replayed

`corpus/sessions.json`: 57 recorded sessions, 7304 user turns, 6751 of them with a reply the original logged, every reply tagged with the topic, source file and line that produced it.

Connection 1 alone holds 6,880 of the turns: it is the developer console, reset repeatedly inside one connection id. The harness splits a session into a new `Bot` at every recorded `"Robot Greeting"`, because that topic is reachable only from `Utilities/WebNameGreet.n:858` (the "Login over Web" Scenario, one `Web ACCEPT CONNECTION` per connection, which also suppresses the other path) and `:877` (the "Login from Console" Priority Topic, `Suppress This; SwitchTo`), so a second one inside one user record is impossible. That gives 391 user records. `bot.start()` is not called: "Login from Console" is a Priority **Topic** with `Always`, so the greeting is produced _by_ the first input.

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
  674226 ms (92.3 ms/turn)
```

Headline, as integers:

- **correct-topic rate: 39%**
- **exact-match rate: 10%**
- answered-when-the-original-did: 100%

## Mismatch causes

| count | share of misses | cause                                                     |
| ----: | --------------: | --------------------------------------------------------- |
|  1438 |          35.14% | different Standard topic won best-fit                     |
|   883 |          21.58% | engine answered where the original defaulted              |
|   740 |          18.08% | both defaulted, different Default topic (IfChance)        |
|   651 |          15.91% | engine fell through to a Default topic                    |
|   302 |           7.38% | recorded topic absent from this build (later build)       |
|    34 |           0.83% | engine missed a Priority topic the original fired         |
|    25 |           0.61% | engine silent, original spoke                             |
|    13 |           0.32% | some recorded topics absent from this build (later build) |
|     6 |           0.15% | engine fired a Priority topic the original did not        |

## Twenty most-fired topics

| topic                 | recorded | engine agreed |    rate | dominant miss cause                                |
| --------------------- | -------: | ------------: | ------: | -------------------------------------------------- |
| Last Line Of Defense  |     1263 |           113 |   8.95% | engine answered where the original defaulted (601) |
| Name Capture          |      714 |           669 |  93.70% | engine fell through to a Default topic (26)        |
| Robot Greeting        |      386 |           386 | 100.00% | -                                                  |
| Exit Survey           |      107 |            35 |  32.71% | different Standard topic won best-fit (40)         |
| STD_Greeting Detect   |       95 |            90 |  94.74% | engine fell through to a Default topic (3)         |
| I'm repeating         |       88 |             9 |  10.23% | different Standard topic won best-fit (73)         |
| IHave                 |       82 |            43 |  52.44% | different Standard topic won best-fit (33)         |
| WhyTalk               |       76 |             3 |   3.95% | different Standard topic won best-fit (51)         |
| No                    |       68 |             2 |   2.94% | engine answered where the original defaulted (35)  |
| 20 questions          |       68 |             6 |   8.82% | different Standard topic won best-fit (33)         |
| Is that your RealName |       68 |            24 |  35.29% | engine answered where the original defaulted (22)  |
| AskAboutPointers      |       65 |             8 |  12.31% | different Standard topic won best-fit (37)         |
| Yes to Intro          |       65 |            23 |  35.38% | engine fell through to a Default topic (29)        |
| AskMe3                |       64 |            35 |  54.69% | different Standard topic won best-fit (15)         |
| Instructions          |       60 |             2 |   3.33% | different Standard topic won best-fit (38)         |
| SuperiorQ             |       58 |             2 |   3.45% | different Standard topic won best-fit (36)         |
| How                   |       56 |             9 |  16.07% | engine fell through to a Default topic (24)        |
| UserSuggestions       |       55 |             1 |   1.82% | different Standard topic won best-fit (31)         |
| WhatAmIQ              |       55 |             0 |   0.00% | different Standard topic won best-fit (39)         |
| SuperiorQ2            |       54 |             0 |   0.00% | different Standard topic won best-fit (28)         |

## What the ceiling actually is

Three things put 100 per cent out of reach, and they are large. They are stated here so the 39 per cent is read against the right denominator.

**1. Over half the corpus was recorded against different script text.** Every recorded reply carries the source file and line NeuroServer ran. Comparing those against the built categories' own line spans: 44.3% of the 7,312 recorded replies land inside the body the shipped `MRMIND3.vsr` sources give that topic, 47.9% land outside it (the topic moved, so the file was edited between that recording and this build), 4.4% name a topic this build does not contain at all, 1.4% name a different file, and 2.0% record no source. The recordings run from December 2000 to April 2001 and the same topic appears at several different line numbers across them ("Robot Greeting" at 867, 877, 879, 881 and 884), so the corpus is not one build at all. Reproduce with the line-span check described in this file's header comment.

**2. `Compute SpellCheck` is the identity function.** It runs on every input before any topic sees it (`Library/StdQuestion/combis/QuesResDebug.us.n:149`) and the original rewrote misspellings against a compiled binary lexicon that is not in the archive. The corpus is full of typos and of the developer's own shorthand, and every input the original spell-corrected into a matchable form now falls through. See `engine/DEVIATIONS.md`.

**3. MrMind's defaults are decided by coin toss.** Every Default topic is gated on `IfChance` — 0.90, 0.70, 0.50, 0.20 down the one-shot ladder in `Defaults/OneShots.n`, then a bare `IfChance` ladder inside `Defaults/Defaults.n` "Last Line Of Defense" — and 27% of the original's replies came from a Default topic. Which default speaks is a draw from NeuroServer's RNG, which no port can repeat, and the default MrMind chooses is a question it then asks, so the _next_ turn's answer topic (`?WhatRobotSaid matches "…"`, the whole of `Defaults/Answers.n`) diverges too. That is the single largest recurring miss in the table above.

The one number that is not subject to any of this is the default-fallback rate, which `spec/E-topics-focus-and-selection.md` §10.1 sets as the acceptance test at 25-27%. This engine answers 25.05% of turns from a Default topic alone; the recording answers 25.12% of the same turns that way. Selection is landing in the right place at the right rate; it is choosing a different member of the set.

## Engine corrections made against this measurement

Each was diagnosed from the manual or the patent first and adopted on the correct-topic number second. No corpus row is special-cased and no constant was fitted. The A/B ladder below is the first 1,500 turns (fast to re-run); the full-corpus numbers are at the top of this file.

| #   | change                                                                                                                    | source                                                                                                 |  topic | exact |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -----: | ----: |
| 0   | baseline                                                                                                                  |                                                                                                        | 41.61% | 7.91% |
| 1   | a matching condition whose LHS is not the user's input scores as an attribute test, not by the pattern's word frequencies | `MANUAL__BestFit.txt` "how closely a pattern in a topic matches the current input"; `[P §14.5]`        | 42.79% | 8.20% |
| 2   | `?WhatUserMeant` counts as the input                                                                                      | `QuesResDebug.us.n:136-141`; `IfHeard` compiles to it                                                  | 42.79% | 8.20% |
| 3   | the tested attribute's declared Specificity is added to the matched words                                                 | `[P §14.2]` "used when the attribute is tested using IfRecall or any matching condition"; US 6,754,647 | 43.68% | 8.80% |
| 4   | `?WhatUserSaidBefore` / `?WhatUserSaidBeforeThat` / `?WhatUserMeantBefore…` are maintained                                | `IMPL-SPEC §8.1`; `vendor-docs/WhatUserSaidBeforeThat.txt`                                             | 43.98% | 8.43% |
| 5   | the focused subjects are the executed topic's, not the whole co-subject fan-out                                           | `MANUAL__BestFit.txt` "set by the most recently activated (executed) topic"                            | 43.61% | 8.50% |

Correction 5 costs 0.37 points on the 1,500-turn window and gains 0.20 on the full corpus; it was kept because the manual is unambiguous and because it is what makes `Or (Focused and Recall ?YesResponse) Then SwitchTo "20 questions"` (`Activities/20Questions.n:14-22`) reachable at all — under the wider reading an answer about HELP also activated ME and WantSomePointers and the user's "yes" was stolen by a different sequence.

Full-corpus effect of correction 5, the only one measured end to end on its own: correct topic 39.19% -> 39.39%, exact 9.45% -> 9.51%, engine default-only 23.75% -> 25.05%.

## What is left, and whether it is fixable

- _different Standard topic won best-fit_ is now mostly cascade: the previous turn already diverged, so `?WhatRobotSaid`, the focus list and the StdQuestion flags all describe a different conversation. Not separately fixable; it shrinks only as the per-turn accuracy rises.
- _both defaulted, different Default topic_ is the `IfChance` draw. Not fixable.
- _recorded topic absent from this build_ is the later build. Not fixable without those sources.
- _engine silent, original spoke_ is the only bucket that would be a plain bug, and it is 25 turns out of 6751. Worth re-reading if it ever grows.

# Calibration against the shipped conversation database

Reproduce with `node engine/test/calibrate.mjs` (about 4.5 minutes).
This is a measurement, not a pass/fail test, and nothing in the engine has been
tuned to it. No corpus row is special-cased anywhere.

## What was replayed

`_work/cdb/mrmind3/ConversationData.csv` — 7,160 real user inputs across 28
connections, 11 Dec 2000 to 9 Apr 2001, NeuroServer 2.1.0. One fresh `Bot` per
recorded connection, seeded from the connection id, `bot.start()` first, then
every recorded input in order.

## Result, all 7,160 inputs

```
bot: 691 categories, 1485 blocks, 729 Example statements, 3401 corpus words

replayed 7160 recorded inputs from 28 connections
  produced output          7138 (99.69%)
  default-only answers     2647 (36.97%)   [archive: 26.76%]
  turns with a recorded reply 6747
  same topic fired         2546 (37.74%)
  exact same line          553 (8.20%)
  runtime warnings         0
  262628 ms (36.7 ms/turn)
```

## Reading it honestly

**The default-response rate is 36.97% against the archive's 26.76%**, which is
outside the 25-27% band `spec/E-topics-focus-and-selection.md` section 10.1 sets
as the acceptance test. That is stated as a miss, not explained away. In order
of expected size, the causes are:

1. **`Compute SpellCheck` is the identity function.** It runs on every input
   before any topic sees it (`Library/StdQuestion/combis/QuesResDebug.us.n:149`)
   and the original rewrote misspellings against a compiled binary lexicon that
   is not in the archive. The corpus is full of typos and of the developer's own
   shorthand. Every input the original spell-corrected into a matchable form now
   falls through to a Default topic. See `engine/DEVIATIONS.md`.
2. **The recording is of a later build than `MRMIND3.vsr`.** `Topics.csv` names
   source files that do not exist in the shipped build at all
   (`StdQuestion.us.n`, `StdDebugger.n`, `MMbody&gender.n`, `Switches.n`,
   `NO_FILE.g`). Some topics that answered in Feb 2001 are simply not in this
   bot.
3. The unresolved constants listed in `DEVIATIONS.md` — negated-condition
   specificity, the treatment of run-time conditions, `IfChance` at selection
   time.

**`same topic fired` (37.74%) is the number to watch when changing the engine**,
because it is insensitive to which of a `SayOneOf`'s alternatives came up and to
the default rate moving for the right reasons. Both corrections this engine made
to `src/pattern.js` and to matching-list evaluation were adopted on this metric,
measured over the first 1,500 inputs:

| configuration                                             | same topic |
| --------------------------------------------------------- | ---------- |
| character-level `*`, `and` lists flattened (as inherited) | 37.7%      |
| character-level `*`, `and` lists honoured                 | 38.3%      |
| **word-level `*`, `and` lists honoured** (shipped)        | **40.5%**  |

Note that the second and third rows _raise_ the default rate while _raising_
topic agreement: correct `and` semantics reject matches that the flattened
version accepted, and the topics they wrongly stole were not the topics the
original ran either.

**`exact same line` (8.20%) is a floor, not a fidelity measure.** Most bot
speech in MrMind comes from `SayOneOf` over two to eight alternatives, and the
engine's RNG cannot be the one NeuroServer used. A turn that picks a different
alternative of the correct `SayOneOf` is a hit for the purpose of this revival
and a miss for this counter.

**Zero runtime warnings over 7,160 turns.** No `SwitchTo` cycle, no `SwitchBack`
onto an empty stack, no `TryAgain` without a `WaitForResponse`, no unresolved
category name, no run hitting the 20,000-step cap.

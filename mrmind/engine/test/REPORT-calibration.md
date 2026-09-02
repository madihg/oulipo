# Calibration against the shipped conversation database

Reproduce with `node engine/test/calibrate.mjs` (3-9 minutes depending on load).
This is a measurement, not a pass/fail test, and nothing in the engine has been
tuned to it. No corpus row is special-cased anywhere. This file is maintained by
hand; `calibrate.mjs` prints, it does not write.

## What was replayed

`_work/cdb/mrmind3/ConversationData.csv` — 7,160 real user inputs across 28
connections that carry any input, 11 Dec 2000 to 9 Apr 2001, NeuroServer 2.1.0.
One fresh `Bot` per recorded **connection id**, seeded from that id,
`bot.start()` first, then every recorded input in order.

## Result, all 7,160 inputs (2026-09-02, post-merge)

```
bot: 691 categories, 1485 blocks, 729 Example statements, 3401 corpus words

replayed 7160 recorded inputs from 28 connections
  produced output          7138 (99.69%)
  default-only answers     2764 (38.60%)   [archive: 26.76%]
  turns with a recorded reply 6747
  same topic fired         2680 (39.72%)
  exact same line          622 (9.22%)
  runtime warnings         0
  192739 ms (26.9 ms/turn)
```

The previous version of this file recorded 36.97% / 37.74% / 8.20%. That was
measured before the five selection corrections in `REPORT.md` landed. Those
corrections raised topic agreement from 37.74% to 39.72% and exact lines from
8.20% to 9.22%, and they also raised this harness's default rate — for the
reason the next section gives, which is that this harness's default rate is not
measuring what its name suggests.

## Read the default rate here with great care

**38.60% is a session-model artifact. Do not tune the engine against it.**

This harness builds one `Bot` per CDB connection id. Connection 1 holds **6,880
of the 7,160 inputs** — it is the developer's console. Under one `Bot`, that one
user record accumulates for thousands of turns, so the `Suppress` list and the
several hundred `IfDontRecall ?Told.X` guards progressively starve the Standard
phase and push turns into the Default categories.

The recording says that is not what happened. Connection 1 contains **331
recorded "Robot Greeting" replies**, and "Robot Greeting" is reachable at most
once per user record: `Utilities/WebNameGreet.n:858` sits inside the "Login over
Web" Scenario (one `Web ACCEPT CONNECTION` per connection, and it suppresses the
other path), and `:877` is the "Login from Console" Priority Topic, which opens
with `Suppress This`. The original started a fresh user record 331 times inside
that single connection id.

`engine/test/conformance.mjs` segments on exactly that signal — a new record at
every recorded "Robot Greeting", 391 records over the whole corpus — and
measures the *same engine* at **25.05% default-only**, against the recording's
own 25.12% on the same turns and `spec/E §10.1`'s 25-27% acceptance band. That
is the comparable number.

This harness is kept unchanged anyway. It is a useful independent replay with a
different session model and a different RNG seeding, and changing a harness in
order to move a number is precisely what this project forbids. It is simply not
the harness the archive's 25.68% should be compared against.

## And the target itself is not this corpus

`archive/1_NeuroServer_fromVaio_MrMind/NeuroScript/Mrmind3/MRMIND3CDB.cdb.report.txt`
states its "Percentage of default responses: 25.68%" over **25 conversations and
6,187 user statements**, the 11 December 2000 console session accounting for
5,914 of them. The export replayed here holds **7,160 user statements over 28
connections**, 6,880 of them in that same console session. The archive's figure
was computed before roughly 970 further developer-console turns were appended to
that session. It describes an earlier snapshot of this database, not the rows
replayed here. It is a band to land in, not a number to hit.

## The other two counters

**`same topic fired` (39.72%) is the number to watch when changing the engine**,
because it is insensitive to which of a `SayOneOf`'s alternatives came up and to
the default rate moving for the right reasons. The two early corrections to
`src/pattern.js` and to matching-list evaluation were adopted on this metric,
measured over the first 1,500 inputs:

| configuration                                             | same topic |
| --------------------------------------------------------- | ---------- |
| character-level `*`, `and` lists flattened (as inherited) | 37.7%      |
| character-level `*`, `and` lists honoured                 | 38.3%      |
| **word-level `*`, `and` lists honoured** (shipped)        | **40.5%**  |

Note that the second and third rows *raise* the default rate while *raising*
topic agreement: correct `and` semantics reject matches the flattened version
accepted, and the topics they wrongly stole were not the topics the original ran
either. The same pattern recurs throughout this project, which is why the
default rate alone is never sufficient evidence.

**`exact same line` (9.22%) is a floor, not a fidelity measure.** Most bot
speech in MrMind comes from `SayOneOf` over two to eight alternatives, and the
engine's RNG cannot be the one NeuroServer used. A turn that picks a different
alternative of the correct `SayOneOf` is a hit for the purpose of this revival
and a miss for this counter.

**Zero runtime warnings over 7,160 turns.** No `SwitchTo` cycle, no `SwitchBack`
onto an empty stack, no `TryAgain` without a `WaitForResponse`, no unresolved
category name, no run hitting the 20,000-step cap.

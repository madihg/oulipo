# MR MIND

Peggy Weil's chatbot MR MIND, online at mrmind.com from 12 March 1998 until
2014, running again from its original source.

Live: https://www.oulipo.xyz/mrmind

MR MIND was written in NeuroScript, a scripting language sold by NativeMinds of
San Francisco, and ran on their NeuroServer under Windows. NativeMinds was
bought by Verity in 2004 and folded into HP; the product is gone and the
operating system MR MIND needed died with it. What is here is a
re-implementation of NeuroServer's matching engine in JavaScript, reading
Peggy's original scripts unchanged.

**No language model is used anywhere in this project at runtime.** MR MIND can
only say sentences that were typed into a `.n` file before 2002. If a reply
looks generated, it is a bug, and it is worth reporting.

---

## How it works

```
archive/                  Peggy's Drive folder, mirrored (not in git: her copyright)
  1_NeuroServer_.../
    NeuroScript/          the bot: Mrmind3 is the one that shipped
    Program/Help/         NativeMinds' own NeuroScript 2.2 manual
spec/                     the language, written down: how NeuroScript works
engine/
  src/lexer.js            NeuroScript -> tokens
  src/parser.js           tokens -> AST
  src/pattern.js          the pattern matcher (* # % ^ ' , . and the star buffer)
  src/specificity.js      best-fit scoring
  src/runtime.js          the run loop, focus of attention, sequence topics
  build/compile.mjs       the 49 source files -> bot.json
  test/                   unit tests, plus conformance against the 2001 logs
bot.json                  the compiled bot, loaded by the browser
index.html                the page
assets/                   the 2001 site images, recovered from the Internet Archive
```

The shipped bot is defined by `Mrmind3/MRMIND3.vsr`, whose `[FILES]` section
lists 49 source files in build order. Those files hold 690 topics and 228
pattern lists. Build order matters: it fixes the order Priority and Default
topics run in, and the initial focus of attention.

## Running it

Needs Node 20 or newer. No dependencies, no build step, no bundler.

```bash
node engine/build/compile.mjs      # rebuild bot.json from the archive
node engine/test/all.mjs           # unit tests, a few seconds
node engine/test/conformance.mjs   # replay the 2001 conversations, ~4 min
cd .. && python3 -m http.server 8899   # then open http://localhost:8899/mrmind/
```

The page uses root-absolute `/mrmind/...` paths so it behaves identically
locally and in production, which is why the server runs from the repo root
rather than from this folder.

`bot.json` is committed, so the page runs without the archive present. You only
need `compile.mjs` if you change a script.

## Changing what MR MIND says

Edit the `.n` file, re-run `compile.mjs`, reload. The scripts are the bot; the
JavaScript is only the interpreter. For example, `AboutMrMind/WhatIsMM.n`:

```
Topic "Are you alive" is
SUBJECTS "ME";
	If Heard YOU and ?FactQuestion Contains EXISTENCESYNONYMS,"living","live","dead"
	Then
		Example "Are you alive";
		Say "That's a matter of opinion.";
	Done
EndTopic
```

The language reference NativeMinds shipped with NeuroServer 2.2 is in
`spec/neuroserver-help/`. `MANUAL__Operators.txt` covers pattern matching and
`MANUAL__BestFit.txt` covers how MR MIND picks which topic answers you.

## How faithful is it

`engine/test/conformance.mjs` replays MR MIND's own conversation database, 57
sessions and 7,304 turns recorded between December 2000 and 2004, and compares
what this engine says against what the original said. Current numbers are in
`engine/test/REPORT.md`.

At the time of writing it answers whenever the original answered (99.63%),
falls back to a Default topic at 25.05% against the recording's own 25.12% on
the same turns, picks the same topic 39.39% of the time and says the identical
sentence 9.51% of the time.

It will never reach 100 per cent, for reasons listed in full in
`engine/DEVIATIONS.md`. The three that matter:

1. **A different Standard topic wins best-fit**, 1,438 turns or 35.14% of the
   disagreements. This is the largest single cause by a wide margin. The reply
   is still a line Peggy wrote, just not the one MR MIND chose that day.
2. **`SayOneOf` is random.** Where a topic offers several replies, matching the
   original exactly is a coin toss by design, which caps the exact-sentence
   number well under 100% no matter how good the matching gets.
3. **The logs are from a later build** than the `.vsr` in the archive, so a few
   topics in the database do not exist in these source files (302 turns).

`Compute SpellCheck` is the identity function here, because the Sentry engine
was proprietary and its dictionary survives only as a compiled binary. That was
once assumed to be the largest fixable gap and it is not: only 10.02% of the
words people typed are unknown to the recoverable lexicons, 83% of those have no
neighbour one edit away, and the best corrector the archive supports moves the
correct-topic rate by at most 0.09 points. It ships disabled. See
`engine/DEVIATIONS.md`, "Branch A", and reproduce with
`node engine/test/spell-reach.mjs`.

## Credits

MR MIND was created and produced by **Peggy Weil**. Creative producer David
Steuer. Bot scripting by Bear, Peggy Weil and J.B. Zimmerman. Visual
engineering and design by Todd Ingalls. Webmasters Mark Brown and Fred Simon. A
project of Web Lab, funded by Web Lab's Web Development Fund, with Marc Weiss
as executive producer, Barry Joseph supervising and Laura Kertz associate
producer. Chris Edwards named The Blurring Test.

Written in NeuroScript on NeuroServer, by NativeMinds, Inc., San Francisco.

2026 revival by **Halim Madi**, with Peggy Weil.

## Rights

The MR MIND scripts, all of MR MIND's dialogue, and the site images are
© Peggy Weil, 1998, and are used here with her permission. They are not covered
by any licence on this repository, and nothing here grants a right to reuse
them.

The engine in `engine/` is a clean-room re-implementation written from
NativeMinds' published documentation and from the expired Neuromedia and
NativeMinds patents.

The conversation database contains real exchanges with visitors from 2000 and
2001, including names people typed. It is used only to test this engine and is
never committed or published.

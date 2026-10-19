# scripts-2026: Peggy Weil's edits to the 2001 scripts

The 2001 archive is never edited. Each file here is a copy of one archive
file with a change Peggy asked for in October 2026, and the build reads the
copy instead of the original. `diff` a file here against the one in
`archive/1_NeuroServer_fromVaio_MrMind/NeuroScript/Mrmind3/` to see the
exact change; every changed line carries a `// 2026-10-19` comment.

To build the untouched 2001 bot instead, pass `overlay: null` to
`buildBotJson` in `engine/build/compile.mjs`.

The note numbers refer to Peggy's `2026_MM_Dialogue+Site_Notes`
(Drive, `0_ReadME_2026 Notes`).

| file | change | source |
| --- | --- | --- |
| `Defaults/OneShots.n` | the Default topic Peggy asked to delete is commented out; the Answers.n topic that depended on it can no longer fire | note 1 |
| `Reactions/Questions.n` | new topic: a "Can you ...?" nothing else answers is reflected back as "Can you ...?" | note 2 |
| `Issues/TrustTruth.n` | "Truth" also fires on any question containing a TRUTH word ("are you lying", "is that true", "are you telling the truth") and on "I never lie" | note 5 |
| `Humans&Machines/Convincing.n` | "What is HQ?" now answers with Peggy's line, "I am unable to locate the HQ Quiz." The other HQ line (line 331) is untouched and waits for her rewrite | note 6 |
| `Patterns.n` | GRINNIES also lists seven emoji faces, so a typed emoji reaches the "grinnies" topic | note 8 |
| `Utilities/WebNameGreet.n` | "do you remember / know / recall / forget my name" reaches the user's-name topic instead of MrMind's own name topic | name bug, Oct 2 |

Not script changes, fixed in the engine the same day: 20 Questions
(`engine/src/runtime.js`, the pending SwitchTo chain now survives a
WaitForResponse across turns).

Asked for, not done, waiting on Peggy: holiday to April Fools (no trigger
exists in the 2001 scripts, note 3), "different" to the difference topic
(note 3 of the transcript), transcripts and submissions written to files
(note 4, needs a store and her consent text), the weblab.org address (note 9),
and the 2014 build in `7_Neuroscript_090514` (note 10, needs the folder as a
zip).

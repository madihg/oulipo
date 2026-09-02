# MrMind revival - Context

Living memory for the Mr. Mind / Blurring Test revival with Peggy Weil.
Rules and preferences live in the oulipo repo CLAUDE.md, not here.

## What this is

Peggy Weil's chatbot MrMind (online at mrmind.com and blurringtest.com,
March 12, 1998 to 2014) was written in NeuroScript on NativeMinds'
NeuroServer, a Windows product from ~2000 that no longer exists
(NativeMinds -> Verity 2004 -> HP; squelched). Halim met Peggy at the
Retro AI symposium at USC (Jul 31, 2026, Mark Marino). Jeff's attempt to
revive MrMind by prompting Claude with the old code felt "softer" and
wordier than the original. Halim offered to rebuild the original logic
faithfully.

## Commitments (from the Aug 24 anarlog call and Aug 26 Granola call)

- Rebuild the original matching logic in JavaScript. NO LLM at runtime.
  LLM only to decode how NeuroScript works.
- Preserve the "predictably wrong", clumsy, provocative voice. Every line
  is Peggy's. Do not paper over gaps with generated text.
- Return a repo with instructions so Peggy owns the artifact.
- Keep the original site's look (HTML folders in the archive).
- Add an intro page framing it as a deliberate reprise, not a modern bot.
- Free. Halim called himself a fan. Credit for the revival is the ask.
  Peggy raised a written understanding on contribution and limits of
  use; still open.
- Aug 12 email: Halim offered Peggy the seven rubrics from Singulars
  audience votes. Not sent yet.
- Domains mrmind.com (to 2027-08-21) and blurringtest.com (to
  2027-05-06) live at Network Solutions in Peggy's account. Both
  unreachable (hosting, not registration). They need DNS pointed at the
  new site, from her account.
- Peggy still owes: patent applications, libretto links ("What Is the
  Boundary Between Us" and "I") with timing markers, Dropbox HTML links.

## Source archive

Drive folder 2026_MrMind shared by pweilstudio@gmail.com on 2026-08-27,
id 14V5nyaPzlI6uIwqZPZm91wcCFLsRoCPt. Mirrored to `archive/` (gitignored:
Peggy's copyright, and Speciallogs may hold user conversations).

Peggy's README: NEUROSCRIPT holds the code, BASE is the stock bot she
customized, MrMind and Mrmind3 overlap (she believes she ran Mrmind3 but
Q&A and JB-added only exist under MrMind), include JB-added, ignore
Mrmind3old. Files were moved around so dates are unreliable.

Known file kinds: .cdb / .ltm / .sdb / .gdb are Microsoft Access
databases (content, long-term memory, ...). .tlx and .script.tlx are
scripts. Patterns.n / Patterns.Mind.g are pattern grammars. .vre / .vri /
.vsr are unknown (possibly compiled). .bot is the bot descriptor.
NeuroServer.exe (Dec 2000, Win32) + DLLs + ini files are in Program/.
NEUROSERVER_tutorial.pdf is the manual. mrmind.htm in MrMind/ is
NUL-filled (damaged-disk recovery), expect more of those.

## Format discoveries (2026-09-01)

- NeuroScript source is plain ASCII `.n` files (CRLF), readable, e.g.
  `Topic "Do you exist" is / SUBJECTS "ME"; / If Heard "do" + YOU +
"exist#" and Recall ?FactQuestion / Then / Example "Do you exist"; /
Say "Yes, I do exist."; / Done / EndTopic`. Also `SayOneOf`,
  `Contains (...)`, `?FactQuestion` / `?MethodQuestion` memory attributes
  set by the StdQuestion library (NativeMinds, ver 2.2b, May 2000).
- `.nso` = compiled object ("CObjFile" header + source name + date).
- The tutorial PDF is only the 8-page front matter (TOC + intro) of a
  134-page manual; the real lessons are not in the archive. Program/Help
  may hold the online help.
- README doc images: a NeuroScript screenshot (above) and the site UI:
  black page, two brain scans ("your mind" left, "mr mind" right), an
  "Enter Your Reply:" text field with an Enter button, MrMind's line
  printed beside the right brain. Saved under archive/_research/readme-images.

## The oracle: conversation database (found 2026-09-01)

`Mrmind3/MRMIND3CDB.cdb` (Access, Nov 2004) is the Conversation
DataBase: 26,646 lines, 57 connections, 7,160 USER_SAID lines and
7,312 SAY replies, each SAY tagged with the topic id, and the Topics
table (5,629 rows) maps ids to topic name, source file and line, default
and priority flags, and subjects. Exported to `_work/cdb/mrmind3/*.csv`;
readable pairing in `_work/transcripts/mrmind3-cdb.txt`. This is a
ground-truth differential test set for the JS port: same input, same
state, same reply expected. No emulator needed for that.
Other files: `.ltm` = long-term memory (Users, Memory), `.sdb` =
sequence database (empty for Mrmind3), `.vre` = compiled runtime
(CObjFile with CPatListDef...), `.vri` = runtime ini, `.vsr` = project
file whose [FILES] section is the authoritative list of the 50 sources
in the Mrmind3 build (Patterns.n, Customization/_, Utilities/_,
Activities/_, AboutMrMind/_, AboutUser/_, Humans&Machines/_, Issues/_,
Reactions/_, Defaults/*, plus LIBRARY:StdQuestion/combis/QuesResDebug.us.n).
`.tlx` = spell-check dictionaries (word lists), `.nso` = compiled object.

Site: `HTML/MRMIND3.htm` is a frameset pulling /site/dropdownMenu.html
and /site/intro/opening/openMAIN.html (not in the Drive folder; the
"Internet Connectivity" folder only has SysIcons). `HTML/MRMIND3Say.htm`
is the reply template: black bg, Verdana, #33CCFF/#99FFCC/#CCFFFF, brain
images ../site/images/parts/MA3-6.jpg and MB3-6.jpg, form POST to
/[[RobotHandle]]/TALK with WhatUserSaid + hidden WhoUserIs, reply in
[[EverythingRobotJustSaidHTML]]. The /site assets must come from Peggy's
Dropbox or Wayback.

Some sources referenced by the compiled bot are missing as .n text and
exist only as .nso (e.g. AboutMrMind/MMbody&gender.n); check the .nso
for recoverable strings.

## Research sweep results (2026-09-01/02, archive/_research)

- `patents/GERBIL-LANGUAGE-NOTES.md` (1339 lines): the language reconstructed
  from the 8 Neuromedia/NativeMinds US patents (6,363,301 attention focus;
  6,604,090 best-fit specificity; 6,259,969 Example verification; 6,314,410
  Focused/active subjects; 6,629,087 1999 NeuroScript BNF; 6,754,647
  hierarchical domains; plus continuations). Sections 10-14 give the runtime
  data model, the exact run loop (Priority -> pending WaitForResponse
  continuation -> Standard by best-fit specificity with focus-order
  tie-break, repeat on Continue/NextTopic -> Default -> Refocus), auto-focus
  and Focus Subjects, SwitchTo/SwitchBack stack, Suppress/Recover, and the
  specificity math (1000*log(1/f) per word from Example frequencies, Recall
  = 2000 unless `Attribute ?X Specificity N`, conjunction = sum minus 1000
  per extra child, disjunction = max, Focused = 100 x shared subjects).
- The tutorial PDF IS the full 140-page NeuroServer Tutorial 3.5 (the Read
  tool only rendered 8 pages). Full text in `docs/tutorial-hunt/`.
- `Program/Help/` in the Drive folder holds the NeuroServer 2.2.1 online
  help INCLUDING NeuroScriptManual/, Keywords/ (one page per reserved
  word), Attributes/, Tutorial/, StdQuestionDoc.htm, StdStatementDoc.htm,
  TemplateFiles.htm, LTM.HTM, BotToWebInterface.htm. This is the primary
  language spec for the port. Mirrored by the fill workflow.
- `wayback/SITE-NOTES.md`: hosting timeline (1998 weblab.org + Neuromedia
  server; 1999-2001 www.mrmind.com -> 24.130.28.93/MrMind "Frame II";
  Apr 2001-2014 www.mrmind.com/mrmind3 frameset by Todd Ingalls; 2015-2021
  Asistentes Virtuales ran the engine as MRMIND4), the chat protocol (GET
  /<vrep>/Connect, POST /<vrep>/TALK with WhatUserSaid + WhoUserIs), the
  full mrmind3 site map, design tokens (black, Verdana 9/12/14/28px,
  #33CCFF cyan, #99FFCC mint, #CCFFFF bot speech, #FF0033), recovered
  images (MA1-6, MB1-5, logo, Flash intro; MB6.jpg never captured), the
  results/transcript pages (53 pages, only archived transcripts), credits
  (Bot Scripting: Bear, Peggy Weil, J.B. Zimmerman), disclaimer text, and
  the opening lines seen across captures.
- `docs/EMULATION-OPTIONS.md`: NeuroServer.exe is NSDE 2.2.0 (Dec 2000),
  needs a license key that lived in the registry (HKLM\SOFTWARE\NativeMinds,
  Inc.\NeuroServer\General\LicenseKey) and activated against a dead
  server; Rosetta is not installed on this Mac. Emulation is NOT the
  path: the CDB transcripts are the oracle.

## Token lesson (2026-09-01)

Mirroring Drive through subagents is brutally expensive: base64 flows
through the model twice (tool result in, Write out). 14 agents burned
1.4M tokens and 6 more burned 2.7M, and the session usage cap killed
them twice. Next time ask Halim for a zip export of the folder, or have
Peggy share it to hi@halimmadi.com so Drive for Desktop syncs it.

## Plan

1. Ingest and inventory (archive mirror, manifest, dedupe across versions)
2. Decode the format (tutorial, patterns, scripts, mdbtools dumps, .vre
   analysis; try NeuroServer.exe under an emulator as an oracle)
3. Extract content into one structured corpus with version provenance
4. JavaScript engine (matcher, topic state machine, response selection)
   with replay tests against the 2001 excerpts
5. Site: 1998 look, reprise intro, deploy under oulipo.xyz/mrmind, DNS
   instructions for Peggy
6. Email Peggy with the link (draft, Halim sends)

## Research assets (2026-09-01/02, under archive/_research, gitignored)

- `patents/GERBIL-LANGUAGE-NOTES.md` (154 KB) - the language reconstructed
  from the closed Neuromedia/NativeMinds patent family (8 US grants + WO/EP/CA).
  Three dated grammars: Gerbil 1997 (US 6,363,301), Gerbil 1998
  (US 6,604,090: best-fit specificity, NFA matcher, wildcards * # % &,
  {optional}, + concat), NeuroScript 1999 (US 6,629,087). Plus the exact
  run loop, attention focus, Subjects/Focused, and the specificity formula
  (1000*log(1/f), Recall default 2000, -1000 per extra conjunct, 100 per
  shared subject for Focused, 0 for * and spaces).
- `wayback/` (1,499 files) - mrmind.com and blurringtest.com snapshots.
  The chat protocol: GET /<vrep>/Connect then POST /<vrep>/TALK with
  WhatUserSaid + hidden WhoUserIs. Design tokens: black ground, Verdana,
  #33CCFF cyan, #99FFCC mint, #CCFFFF for MrMind's speech, bot text in
  <pre> and bold. Site images recovered to `site/assets/`: MA1-6, MB1-5,
  MB2alt, Logo/logo (the "i?" mark), WBlogo, tempAnim.swf.
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  

- `docs/` - includes the NeuroStudio vendor documentation off the Wayback
  Machine, extracted to `spec/vendor-docs/` (41 pages: Matches, PatternList,
  Always, Done, plus a 7-lesson tutorial). Official semantics, e.g. Matches
  ignores extra punctuation but forbids extra words.
- `docs/EMULATION-OPTIONS.md` - how to run NeuroServer.exe if ever needed.

## The oracle: conformance corpus

`corpus/sessions.json` (gitignored: real 2000-01 user conversations, some
with names) holds 57 sessions, 7,304 turns, 6,751 with a reply, 540
distinct topics fired, each reply tagged with the topic and source
file:line that produced it. This is the differential test set: same input,
same state, same reply. No Windows emulator needed.
Caveat: `Ssceam2.clx` is the Sentry spell-check lexicon, so exact
`?WhatUserMeant` spell correction cannot be reproduced. Measure the impact
against the corpus and state it plainly rather than faking it.

## The engine (built 2026-09-02)

`engine/` is a clean-room JavaScript re-implementation of NeuroServer's
matching engine. No model at runtime, ever. Modules: lexer, parser, loader,
pattern, specificity, runtime, plus `build/compile.mjs` which turns the 49
`.vsr` sources into `bot.json` (1.16 MB, 185 KB gzipped). 691 categories
parsed, zero parse warnings, zero unknown commands.
`engine/CONTRACT.md` freezes the module interfaces, `engine/DEVIATIONS.md`
records every knowing difference from the original.

Authority order for semantics: `spec/neuroserver-help/` (NativeMinds' OWN
NeuroScript 2.2 manual, found in the archive at Program/Help, the single best
source), then `spec/A..G-*.md` (a 7-dimension census of the real corpus) and
`spec/IMPL-SPEC.md`, then the patent notes.

Settled facts worth not re-deriving: inside a pattern string, `,` means zero or
more spaces/punctuation and `.` means one or more, so they are OPERATORS not
literals; `#` matches zero or more characters and alone matches a whole word;
`'` is an optional apostrophe; `\` escapes an operator and before a letter
forces case-sensitivity; Say with commas prints one line per argument while `+`
joins on one line; SwitchTo may only target Sequence topics.

## The site

`index.html` at the repo root of `mrmind/`, so it deploys to
oulipo.xyz/mrmind. Faithful palette (#33CCFF cyan, #99FFCC mint, #CCFFFF for
MrMind's speech, black ground, Verdana), Peggy's own 1950/2000 framing text
quoted from the 2002 site, a "This is a reprise" note as she asked for, the
original disclaimer, and full credits. `assets/yourmind.png` and
`assets/mrmind.png` are composited from the original tiles MA1-6 and MB1-5
recovered from the Internet Archive (MB6 was never captured, so the mr mind
image is cropped to the two complete rows). Bot output is escaped and then only
`<BR>`, `<B>`, `<I>` and a validated mailto are restored, because a Say can
interpolate `?Name` and therefore visitor text.

## Session State

2026-09-02: archive mirrored (723 files, complete bar a 10.9 MB log the
Drive tool will not serve). Research sweep done. Conformance corpus built.
Census workflow running (7 agents, one per language dimension) to produce
`spec/IMPL-SPEC.md`. Next: build the JS engine against that spec, test it
against the corpus, then the site, then the email to Peggy.

2026-09-02, later: engine built and calibrated. Three parallel fidelity
experiments (spell correction, specificity arithmetic, matching strictness)
were run and merged. **The merge changed no runtime behaviour** — every
proposed change either measured worse on the full corpus or was contradicted
by its own source. Final numbers, `node engine/test/conformance.mjs`:
correct topic **39.39%**, exact reply 9.51%, engine default-only **25.05%**
against the recording's own 25.12% on the same turns and `spec/E §10.1`'s
25-27% band. `node engine/test/calibrate.mjs` reads 38.60% default-only, and
that difference is now explained and documented: calibrate builds one `Bot`
per CDB connection id, but connection 1 alone contains **331 recorded "Robot
Greeting" replies**, a topic reachable once per user record — so the original
reset the record 331 times inside that connection. Calibrate's default rate
is a session-model artifact and must not be tuned against. The archive's own
25.68% is likewise over an earlier 6,187-statement snapshot, not the 7,160 we
replay.

Two standing claims in `engine/DEVIATIONS.md` were retracted on measurement:
`Compute SpellCheck` being the identity function is **not** the largest
fixable contributor to the default rate (the best corrector the archive
supports rewrites 1.4-3.2% of inputs for +0.09 points of topic rate).

Kept from the branches: `engine/src/spellcheck.js` (off by default),
`engine/data/*.tlx`, and 45 new pinned assertions
(`test/spellcheck.test.mjs`, `test/bestfit.test.mjs`). Suite runner is
`node engine/test/all.mjs` — `node --test engine/test` mis-resolves on Node
25; use `node --test engine/test/*.test.mjs`. Next: the site, then the email
to Peggy.

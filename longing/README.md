# I wish you were

Ten small programs after Anne Carson and bpNichol. Halim Madi, 2026.

They start with a lover and a beloved and end with a migrant and a home. Each
part completes the title with one sentence and runs a small program on a
40 x 12 character screen. Black is the one who wants; a pale grey is what is
wanted. Each part has a tip that says what it does and what you can do.

## The ten parts

| #   | Sentence                                                                                            | After                                    |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 01  | I wish you were a neighbor instead of joy and pain wedded and melding                               | Eros the Bittersweet, "Bittersweet"      |
| 02  | I wish you were what I do not have. / "The lover wants what he does not have" (Carson)              | Eros the Bittersweet, "Gone"             |
| 03  | I wish you were the curvature. / "Conjoined they are held apart." (Carson)                          | Eros the Bittersweet, "Ruse"             |
| 04  | I wish you were the space between, but halved, for convenience                                      | Eros the Bittersweet, "The Reach"        |
| 05  | I wish you were the unmoving border of intimacy                                                     | Eros the Bittersweet, "Finding the Edge" |
| 06  | I wish my Arabic wasn’t cryogenic and a frozen version of 1990s Lebanon                             | Eros the Bittersweet, "Alphabetic Edge"  |
| 07  | I wish you were unbroken symbolon, abridged time. How long has it been? A year and change. And change. | Eros the Bittersweet, "Symbolon"      |
| 08  | I wish you were more mortar than bricks.                                                            | Eros the Bittersweet, "Ice-pleasure"     |
| 09  | I wish you were the day known as tomorrow                                                           | Eros the Bittersweet, "Now Then"         |
| 10  | I wish you were home ("home" arrives once the i has crossed the water)                              | Plainwater, "The Anthropology of Water"  |

## Sources

- The sentences are Halim Madi's. Two parts also carry a sentence of Anne
  Carson's, in quotation marks and cited: the eight words part 02 prints,
  from "Gone", and five words from "Ruse". Nothing else of hers is
  reproduced. Each part is built on one passage of hers, cited by book and
  chapter.
- Part 02 is Halim's Python couplet "Gone" (2026). Part 04 is a variation on
  his couplet "The Reach": what halves is the distance from the start of lover
  to the start of beloved, so the words overlap but never become one. The
  code of both is shown below the screen.
- In part 10 the i walks across the water and leaves a poem behind it, line by
  line: "Careful on the road / means I miss you / already I love you / but my
  language can’t / stomach affection and all I have / is room / for home".
- The form follows bpNichol's First Screening (1984), twelve kinetic poems
  written in Apple BASIC.

## How it is made

- One HTML file with no CSS: HTML and JavaScript only. Colour comes from
  `<font color>`, the size of the screen from `<font size>`, the layout from
  plain HTML, everything else from the browser's defaults. No libraries, no
  fonts, no network requests.
- Part 09 reads the reader's clock and the browser's time zone data for
  Beirut.
- Keys: left and right arrows switch parts, Space or Enter acts on the screen,
  `?` opens the about panel. Reduced motion is respected. Each part carries a
  text description for screen readers.
- It can run inside a frame: links open in a new tab, and the bottom right
  corner is left empty for a host page's own controls.

## Run it

Open `index.html`, or serve the folder with any static server.

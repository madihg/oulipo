# I wish you were

Ten small programs after Anne Carson and bpNichol. Halim Madi, 2026.

They start with a lover and a beloved and end with a migrant and a home. Each
part shows one sentence, then runs a small program on a 40 x 12 character
screen. Black text is the one who wants. Blue text is what is wanted. Each
part has a tip that says what it does and what you can do.

## The ten parts

| #   | Sentence                                                                                  | After                                    |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| 01  | Contemplating Whether joy and pain are neighbors Or closer Lovers                         | Eros the Bittersweet, "Bittersweet"      |
| 02  | "the lover wants what he does not have" (Carson)                                          | Eros the Bittersweet, "Gone"             |
| 03  | "Conjoined they are held apart." (Carson)                                                 | Eros the Bittersweet, "Ruse"             |
| 04  | Lover, beloved, and the space between. It halves every line and never reaches zero.       | Eros the Bittersweet, "The Reach"        |
| 05  | The moving frontier of intimacy. / The most dangerous immigrant is the one who loves you. | Eros the Bittersweet, "Finding the Edge" |
| 06  | My Arabic is cryogenic, a frozen version of the 2000s’ Lebanese.                          | Eros the Bittersweet, "Alphabetic Edge"  |
| 07  | How long has it been darling? A year and change. And change                               | Eros the Bittersweet, "Symbolon"         |
| 08  | Didn’t abandon you. Had to leave                                                          | Eros the Bittersweet, "Ice-pleasure"     |
| 09  | The day known as tomorrow                                                                 | Eros the Bittersweet, "Now Then"         |
| 10  | Careful on the road / phrase, Lebanese. I miss you already.                               | Plainwater, "The Anthropology of Water"  |

## Sources

- Eight sentences are Halim Madi's own, most from his notebooks. Two are Anne
  Carson's, shown in quotation marks and cited: the eight words part 02
  prints, from "Gone", and five words from "Ruse". Nothing else of hers is
  reproduced. Each part is built on one passage of hers, cited by book and
  chapter.
- Part 02 is Halim's Python couplet "Gone" (2026). Part 04 is a variation on
  his couplet "The Reach": what halves is the distance from the start of lover
  to the start of beloved, so the words overlap but never become one. The
  code of both is shown above the screen.
- In part 10 the i walks across the water and leaves, line by line, the rest
  of a sentence from Halim's notebook: "It means I miss you already, I love
  you but my language can’t stomach affection anymore and all I have is room
  for fear."
- The form follows bpNichol's First Screening (1984), twelve kinetic poems
  written in Apple BASIC.

## How it is made

- One HTML file with no CSS: HTML and JavaScript only. Colour comes from
  `<font color>`, the size of the screen from `<font size>`, everything else
  from the browser's defaults. No libraries, no fonts, no network requests.
- The Arabic word in part 06 and everything else use the reader's own fonts,
  so it looks a little different on each machine.
- Part 09 reads the time in San Francisco and Beirut from the browser's time
  zone data.
- Keys: left and right arrows switch parts, Space or Enter acts on the screen,
  `?` opens the about panel. Reduced motion is respected. Each part carries a
  text description for screen readers.
- It can run inside a frame: links open in a new tab, and the bottom right
  corner is left empty for a host page's own controls.

## Run it

Open `index.html`, or serve the folder with any static server.

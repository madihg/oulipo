# I wish you were

Ten small programs after Anne Carson and bpNichol. Halim Madi, 2026.

They start with a lover and a beloved and end with a migrant and a home. Each
part shows one sentence, then runs a small program on a 40 x 12 character
screen. Black text is the one who wants. Blue text is what is wanted.

## The ten parts

| #   | Sentence                                                                                                                                           | After                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 01  | Contemplating Whether joy and pain are neighbors Or closer Lovers                                                                                  | Eros the Bittersweet, "Bittersweet"      |
| 02  | Her sentence loses a word a line, then wants again.                                                                                                | Eros the Bittersweet, "Gone"             |
| 03  | In a world of twos, the other is always one doubtful thought away.                                                                                 | Eros the Bittersweet, "Ruse"             |
| 04  | Lover, beloved, and the space between. It halves every line and never reaches zero.                                                                | Eros the Bittersweet, "The Reach"        |
| 05  | The frontier of intimacy. / The most dangerous immigrant is the one who loves you.                                                                 | Eros the Bittersweet, "Finding the Edge" |
| 06  | How my Arabic is frozen in 15 years ago. How it is a cryogenic version of Arabic.                                                                  | Eros the Bittersweet, "Alphabetic Edge"  |
| 07  | How long has it been darling? A year and change. And change                                                                                        | Eros the Bittersweet, "Symbolon"         |
| 08  | I didn’t abandon you I had to leave                                                                                                                | Eros the Bittersweet, "Ice-pleasure"     |
| 09  | The day known as tomorrow                                                                                                                          | Eros the Bittersweet, "Now Then"         |
| 10  | Be careful on the road. / It means I miss you already, I love you but my language can’t stomach affection anymore and all I have is room for fear. | Plainwater, "The Anthropology of Water"  |

## Sources

- The sentences are Halim Madi's own. Eight come from his notebooks. The two
  above parts 02 and 04 are the lines he wrote for two Python couplets in 2026;
  those couplets are ported here and their code is shown under the screen.
- Each part is built on one passage of Anne Carson's, cited by book and
  chapter. One sentence of hers appears in the piece: the eight words that
  part 02 prints, from "Gone". Nothing else of hers is reproduced.
- The form follows bpNichol's First Screening (1984), twelve kinetic poems
  written in Apple BASIC.

## How it is made

- One HTML file. No libraries, no build step, no network requests.
- Two typefaces, VT323 and JetBrains Mono, both under the SIL Open Font
  License 1.1 and bundled in `fonts/` with the licence text.
- The Arabic word in part 06 is drawn with the reader's own Arabic system
  font, so it looks a little different on each machine.
- Part 09 reads the reader's clock and the browser's time zone data for
  Beirut.
- Keys: left and right arrows switch parts, Space or Enter acts on the screen,
  `?` opens the about panel. Reduced motion is respected. Each part carries a
  text description for screen readers.
- It can run inside a frame: links open in a new tab, and the bottom right
  corner is left empty for a host page's own controls.

## Run it

Open `index.html`, or serve the folder with any static server.

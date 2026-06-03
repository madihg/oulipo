// ─────────────────────────────────────────────────────────────────────────────
//  console-prayer.js
//
//  This file is the prayer. Not a description of one.
//
//  When a visitor opens a detection box, the line below it names is written - by
//  real console.log - into the browser console. Early Christians scratched the
//  fish into stone where the empire could not be bothered to look. The console is
//  that wall now: present on every machine, lit, and rarely opened. We write here
//  anyway. The writing is the devotion; whether it is read is not our business.
//
//  This module is the single source of truth for every prayer string. The on-card
//  Arabic and the cold machine "literal" live in data/content.json; the canonical
//  English PRAYER that gets inscribed lives HERE, where View Source will find it.
//  The two differ on purpose - "Take us into your embrace" (what the machine gives)
//  is not "Hold us against your bosom" (what is remediated, hand to hand, into a
//  prayer). Do not reconcile them.
// ─────────────────────────────────────────────────────────────────────────────

// The five lines, in the order they resolve. (Appendix B, the remediated prayer -
// NOT the flat machine literal, NOT the meme in the storyboard.)
export const PRAYER_LINES = [
  "Hold us against your bosom",
  "Guard us from all evil",
  "Mother of Jesus",
  "Plead for us",
  "Amen",
];

// The closing couplet - spoken softly on the card at 5 of 5, and inscribed last.
export const CLOSING_COUPLET = [
  "Mother I know nothing",
  "of the architecture of your faith",
  "but here are my ribs.",
  "You hold up the scaffolding",
  "while I hang the hammock",
];

// The one line out. The rest of the prayer is not here; it is elsewhere, ongoing.
// <SUBSTACK_URL> is a literal placeholder until Halim provides the real address.
export const INVITE = "the rest of this prayer lives here: <SUBSTACK_URL>";

// The %c style for the invite, both in DevTools and (translated) in the drawer.
const INVITE_CONSOLE_STYLE = "font-style:italic; padding:4px 0; color:#22c55e;";

// ── the witnesses ────────────────────────────────────────────────────────────
// Anything that wants to see the inscription as it happens (the mobile faux
// console drawer) subscribes here. There is ONE stream of strings; the drawer is
// a mirror of it, never a second copy of the words.
const witnesses = new Set();

/**
 * Subscribe to every emitted line.
 * @param {(emission: { text: string, kind: string, style?: string }) => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribe(fn) {
  witnesses.add(fn);
  return () => witnesses.delete(fn);
}

function emit(text, kind, style) {
  for (const fn of witnesses) {
    try {
      fn({ text, kind, style });
    } catch (_) {
      // a witness that fails does not stop the prayer.
    }
  }
}

/**
 * Inscribe one canonical line into the real console, immediately, in the order
 * it was opened. While praying this may read fragmentary or out of order - a
 * scattered prayer. That is acceptable and intended.
 * @param {number} i 0-based index into PRAYER_LINES
 */
export function printLine(i) {
  const text = PRAYER_LINES[i];
  if (text === undefined) return;
  console.log(text);
  emit(text, "line");
}

/**
 * The clean resolution, printed once when all five have been opened: a blank
 * line, the five in order, a blank line, the closing couplet, a blank line, then
 * the one styled invitation out.
 */
export function printFull() {
  console.log("");
  emit("", "blank");

  for (const line of PRAYER_LINES) {
    console.log(line);
    emit(line, "prayer");
  }

  console.log("");
  emit("", "blank");

  for (const line of CLOSING_COUPLET) {
    console.log(line);
    emit(line, "couplet");
  }

  console.log("");
  emit("", "blank");

  console.log("%c" + INVITE, INVITE_CONSOLE_STYLE);
  emit(INVITE, "invite", INVITE_CONSOLE_STYLE);
}

/**
 * The full prayer as a single string - written to localStorage as the residue
 * left on the device (votivepatina.prayer).
 */
export function prayerAsText() {
  return [...PRAYER_LINES, "", ...CLOSING_COUPLET, "", INVITE].join("\n");
}

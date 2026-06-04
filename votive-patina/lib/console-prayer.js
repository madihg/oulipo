// ─────────────────────────────────────────────────────────────────────────────
//  console-prayer.js
//
//  This file is the prayer. Not a description of one.
//
//  When a visitor opens a detection box, the line below it names is written - by
//  real console.log - into the browser console, in Arabic and then in English.
//  Early Christians scratched the fish into stone where the empire could not be
//  bothered to look. The console is that wall now: present on every machine, lit,
//  and rarely opened. We write here anyway. The writing is the devotion; whether
//  it is read is not our business.
//
//  The prayer is bilingual. The Arabic is the prayer the mother forwards; the
//  English is what it becomes, remediated, hand to hand. "بحضنك خذينا" / "Hold us
//  against your bosom": the literal would be "take us into your embrace" - the gap
//  between the literal and the prayer is the point. Do not reconcile them.
// ─────────────────────────────────────────────────────────────────────────────

// The five lines, Arabic (as the mother sends them) paired with the remediated
// English. ARABIC_LINES[i] and PRAYER_LINES[i] are the same line in two tongues.
export const ARABIC_LINES = [
  "بحضنك خذينا",
  "وعن كل شر ابعدينا",
  "يا أم يسوع",
  "تشفعي فينا",
  "أمين",
];

export const PRAYER_LINES = [
  "Hold us against your bosom",
  "Guard us from all evil",
  "Mother of Jesus",
  "Plead for us",
  "Amen",
];

// The closing couplet - Halim's own English, spoken softly on the card at 5 of 5
// and inscribed last. It is his poem, not a forwarded prayer, so it stays English.
export const CLOSING_COUPLET = [
  "Mother I know nothing",
  "of the architecture of your faith",
  "but here are my ribs.",
  "You hold up the scaffolding",
  "while I hang the hammock",
];

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

// kinds ending in "-ar" are Arabic (the drawer renders them RTL in the naskh face).

/**
 * Inscribe one line into the real console, immediately, Arabic then English, in
 * the order it was opened. While praying this may read fragmentary or out of
 * order - a scattered prayer. That is acceptable and intended.
 * @param {number} i 0-based index
 */
export function printLine(i) {
  const ar = ARABIC_LINES[i];
  const en = PRAYER_LINES[i];
  if (en === undefined) return;
  console.log(ar);
  emit(ar, "line-ar");
  console.log(en);
  emit(en, "line");
}

/**
 * The clean resolution, printed once when all five have been opened: a blank
 * line, the five lines (each Arabic then English), a blank line, then the closing
 * couplet. No outbound link - the rest of the prayer is not elsewhere now; it is
 * here, and on the device, and in this source.
 */
export function printFull() {
  console.log("");
  emit("", "blank");

  for (let i = 0; i < PRAYER_LINES.length; i++) {
    console.log(ARABIC_LINES[i]);
    emit(ARABIC_LINES[i], "prayer-ar");
    console.log(PRAYER_LINES[i]);
    emit(PRAYER_LINES[i], "prayer");
  }

  console.log("");
  emit("", "blank");

  for (const line of CLOSING_COUPLET) {
    console.log(line);
    emit(line, "couplet");
  }
}

/**
 * Print a found prayer from the constellation to the real console and notify
 * subscribers (the mobile drawer mirror). Called once per unit on first attend.
 * Format: blank, dim "· found · <figure>", the extracted Arabic, the cold literal.
 * @param {{ id: string, figure: string, arabic?: string, literal: string }} unit
 */
export function printFound(unit) {
  console.log("");
  emit("", "blank");

  const header = `· found · ${unit.figure}`;
  console.log(header);
  emit(header, "found-head");

  if (unit.arabic) {
    const ar = String(unit.arabic).replace(/\s*\/\s*/g, " ");
    console.log(ar);
    emit(ar, "found-ar");
  }

  console.log(unit.literal);
  emit(unit.literal, "found");
}

/**
 * The full bilingual prayer as a single string - written to localStorage as the
 * residue left on the device, and copied to the clipboard when the prayer is
 * answered. Arabic and English, line by line, then the closing couplet.
 */
export function fullBilingualPrayer() {
  const lines = [];
  for (let i = 0; i < PRAYER_LINES.length; i++) {
    lines.push(ARABIC_LINES[i]);
    lines.push(PRAYER_LINES[i]);
  }
  lines.push("");
  lines.push(...CLOSING_COUPLET);
  return lines.join("\n");
}

// Back-compat alias: the residue on the device is the same bilingual text.
export function prayerAsText() {
  return fullBilingualPrayer();
}

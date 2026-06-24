/**
 * src/words.js - the live-transcription words component (DOM).
 *
 * The pre-written line is revealed character by character, like live captions
 * being transcribed. For non-English moments a translation line fades in beneath
 * the original once the original is mostly revealed. The original text is always
 * the verbatim string from the poem - nothing is ever mis-heard.
 */

export function createWords(els, { reduced = false } = {}) {
  // els: { tag, caption, translation }
  let raf = 0;

  function clear() {
    cancelAnimationFrame(raf);
    els.caption.textContent = "";
    els.translation.textContent = "";
    els.translation.classList.remove("is-shown");
  }

  /**
   * Reveal a moment's words over `durationMs`. The original finishes typing at
   * ~70% of the moment so it can be read; the translation (if any) fades in at
   * ~55%.
   */
  function start(moment, durationMs) {
    cancelAnimationFrame(raf);
    els.tag.textContent = `[${moment.lang}]`;
    els.translation.classList.remove("is-shown");
    els.translation.textContent = moment.english || "";

    const text = moment.original;
    if (reduced) {
      els.caption.textContent = text;
      if (moment.english) els.translation.classList.add("is-shown");
      return;
    }

    els.caption.textContent = "";
    const typeMs = Math.max(800, durationMs * 0.7);
    const t0 = performance.now();
    let translationShown = false;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / typeMs);
      const n = Math.floor(p * text.length);
      els.caption.textContent = text.slice(0, n);
      if (!translationShown && moment.english && p >= 0.55) {
        els.translation.classList.add("is-shown");
        translationShown = true;
      }
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        els.caption.textContent = text;
        if (moment.english) els.translation.classList.add("is-shown");
      }
    };
    raf = requestAnimationFrame(tick);
  }

  /** Show a moment's words fully, immediately (debug / reduced paths). */
  function showFull(moment) {
    cancelAnimationFrame(raf);
    els.tag.textContent = `[${moment.lang}]`;
    els.caption.textContent = moment.original;
    els.translation.textContent = moment.english || "";
    els.translation.classList.toggle("is-shown", !!moment.english);
  }

  function destroy() {
    cancelAnimationFrame(raf);
  }

  return { start, clear, showFull, destroy };
}

// ─────────────────────────────────────────────────────────────────────────────
//  votivepatina / lib/about.js
//
//  The "?" that opens the essay. A quiet door, top-right.
//
//  This module does nothing sacred on its own - it is housekeeping so that the
//  reader can learn what they are praying to. The prayer is elsewhere. This is
//  the card pinned beside the votive candle explaining the saint.
//
//  Accessibility contract:
//    - Modal is opened and closed via aria-expanded + hidden attribute.
//    - Focus is moved to the close button on open; returned to the toggle on close.
//    - Tab / Shift-Tab cycle inside .about-panel while open (focus trap).
//    - Escape closes, but only if the modal is currently open.
//    - CSS handles all animation. JS only toggles hidden / classes / aria / focus.
//
//  Idempotent: call setupAbout() more than once and nothing breaks.
//  Defensive: if any expected element is absent, we return silently.
//  No em-dashes: hyphens with spaces ( - ) everywhere.
// ─────────────────────────────────────────────────────────────────────────────

// ─── selectors ───────────────────────────────────────────────────────────────

// Elements that can receive focus inside a panel or dialog.
// Matches interactive elements that are neither hidden by tabindex=-1 nor
// the inert/disabled outliers we do not need to trap.
const FOCUSABLE = 'a[href], button, [tabindex]:not([tabindex="-1"])';

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Return the list of focusable nodes inside a given container, in DOM order.
 * Used by the focus trap so Tab and Shift-Tab know which elements are in scope.
 *
 * @param {Element} container
 * @returns {HTMLElement[]}
 */
function getFocusable(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    // Exclude elements that are programmatically invisible.
    // offsetParent is null for display:none and visibility:hidden subtrees.
    // We keep elements that are hidden via the 'hidden' attribute only if
    // they live outside our container (which they do not in normal flow).
    (el) => !el.closest("[hidden]") && el.offsetParent !== null,
  );
}

// ─── main export ─────────────────────────────────────────────────────────────

/**
 * Wire the about modal: toggle, close button, scrim dismiss, Escape, focus trap.
 *
 * Expected DOM (already in index.html - do not edit index.html):
 *   #about-toggle   <button aria-haspopup="dialog" aria-controls="about-modal">
 *   #about-modal    <div role="dialog" aria-modal="true" hidden>
 *                     .about-scrim[data-about-dismiss]
 *                     .about-panel
 *                       #about-close  <button>
 *                       ... essay content ...
 *                   </div>
 *
 * Call once from main.js after DOMContentLoaded (or at module evaluation time
 * if the script tag is deferred / type=module, which guarantees DOM ready).
 */
export function setupAbout() {
  // ── gather elements ────────────────────────────────────────────────────────

  const toggle = document.getElementById("about-toggle");
  const modal = document.getElementById("about-modal");
  const closeBtn = document.getElementById("about-close");

  // The panel is where the focus trap lives - everything readable lives inside it.
  const panel = modal ? modal.querySelector(".about-panel") : null;

  // Dismiss targets: clicking the scrim (or any future [data-about-dismiss] node)
  // closes the modal without requiring the close button.
  // We listen at the modal level and match by attribute so no per-node wiring.

  // Guard: if the skeleton is missing, do nothing. The piece still runs.
  if (!toggle || !modal || !closeBtn || !panel) {
    // Not a throw - the modal is an optional layer. The prayer continues.
    return;
  }

  // ── track open state ───────────────────────────────────────────────────────

  // A single boolean carried in closure so open / close helpers share it
  // without querying the DOM on every keystroke.
  let isOpen = false;

  // ── open ──────────────────────────────────────────────────────────────────

  /**
   * Open the modal:
   *   1. Remove the `hidden` attribute so CSS can animate it in.
   *   2. Add `about-open` to <body> so CSS can lock scroll.
   *   3. Flip aria-expanded on the toggle button.
   *   4. Move focus into the modal (to the close button) so keyboard users
   *      do not end up stranded outside the dialog.
   */
  function open() {
    if (isOpen) return;

    isOpen = true;
    modal.removeAttribute("hidden");
    document.body.classList.add("about-open");
    toggle.setAttribute("aria-expanded", "true");

    // Focus lands on the close button, not the first focusable element,
    // because the first thing a reader needs is the escape hatch.
    closeBtn.focus();
  }

  // ── close ─────────────────────────────────────────────────────────────────

  /**
   * Close the modal:
   *   1. Restore `hidden` so the modal is inert and invisible.
   *   2. Remove `about-open` from <body> to re-enable scroll.
   *   3. Flip aria-expanded back.
   *   4. Return focus to the toggle so the reader lands where they were
   *      before opening the modal - the "return to sender" of focus management.
   */
  function close() {
    if (!isOpen) return;

    isOpen = false;
    modal.setAttribute("hidden", "");
    document.body.classList.remove("about-open");
    toggle.setAttribute("aria-expanded", "false");

    // Return focus to the toggle that opened this - keyboard users expect
    // focus to land back on the element that triggered the dialog.
    toggle.focus();
  }

  // ── focus trap ────────────────────────────────────────────────────────────

  /**
   * Intercept Tab and Shift-Tab while the modal is open.
   * Cycles through focusable elements inside .about-panel only.
   * Wraps at both ends so focus never escapes to the page behind.
   *
   * @param {KeyboardEvent} e
   */
  function trapFocus(e) {
    if (!isOpen) return;

    if (e.key !== "Tab") return;

    const focusable = getFocusable(panel);

    // If there are no focusable elements (should not happen) let the browser
    // do whatever it wants - we cannot trap into nothing.
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      // Shift-Tab: if we are on the first element, wrap to the last.
      if (active === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if we are on the last element, wrap to the first.
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // ── event wiring ──────────────────────────────────────────────────────────

  // The "?" button opens the modal.
  toggle.addEventListener("click", open);

  // The explicit close button inside the panel closes the modal.
  closeBtn.addEventListener("click", close);

  // Clicking the scrim (or any [data-about-dismiss] element) closes the modal.
  // We listen at the modal level so the scrim's full clickable surface is covered
  // even if CSS enlarges it or future markup adds other dismiss targets.
  modal.addEventListener("click", function (e) {
    if (e.target.closest("[data-about-dismiss]")) {
      close();
    }
  });

  // Escape key: closes the modal if it is open, otherwise ignored.
  // Attached to the document so it fires regardless of which element has focus
  // inside the modal at the time - the reader should always be able to escape.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      close();
    }
  });

  // Focus trap: only active while the modal is open (checked inside trapFocus).
  document.addEventListener("keydown", trapFocus);
}

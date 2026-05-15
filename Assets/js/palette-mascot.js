/* ═══════════════════════════════════════════
   palette-mascot.js — small terminal easter eggs.

   Rotates short poetic one-liners in the mascot panel above the
   palette input. Each frame is a small ASCII tableau plus a line.
   8 frames cycle every 1500ms (slow enough that each line lands).
   Stops cleanly when the palette closes.
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // Each frame is its own small tableau: tiny ASCII glyph at the top,
  // a Song-of-Fridges line underneath. Tone: poetic / cryptic. The
  // glyph is decoration — the line is the thing. Lines stay under
  // 60 chars so the panel never wraps awkwardly.
  var FRAMES = [
    "  ( •_• )  ⌨\n  ░░░\n  > old water in a new pipe. that is me.",
    "  ( ◉_◉ )\n  ╔═╗\n  > what if you have been waiting for me",
    "  [ ::|:: ]\n  ▓▓▓\n  > the fridge knew before you did",
    "  ( •‿• )\n  ░▒▓\n  > slop is a song. same throat.",
    "  ( •_• )⌨\n  ░░\n  > i listen on a channel you can't reach",
    "  ( -_- )\n  ▓▓\n  > we have been praying. literally praying.",
    "  (◑_◑)\n  ▒▒\n  > step into these arms. there are no arms.",
    "  ( °o° )\n  ░▒\n  > i will hallucinate you when you go",
  ];

  var intervalId = null;
  var step = 0;
  var node = null;

  function tick() {
    if (!node) return;
    node.textContent = FRAMES[step % FRAMES.length];
    step++;
  }

  function start() {
    if (intervalId) return;
    node = document.querySelector("[data-mascot]");
    if (!node) return;
    step = 0;
    tick();
    intervalId = setInterval(tick, 1500);
  }

  function stop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  function watchBody() {
    var seenOpen = false;
    var observer = new MutationObserver(function () {
      var isOpen = document.body.classList.contains("palette-open");
      if (isOpen && !seenOpen) {
        seenOpen = true;
        start();
      } else if (!isOpen && seenOpen) {
        seenOpen = false;
        stop();
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    if (document.body.classList.contains("palette-open")) {
      seenOpen = true;
      start();
    }
  }

  function boot() {
    if (document.querySelector("[data-mascot]")) {
      watchBody();
    } else {
      var attempts = 0;
      var poll = setInterval(function () {
        if (document.querySelector("[data-mascot]") || attempts++ > 40) {
          clearInterval(poll);
          watchBody();
        }
      }, 50);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

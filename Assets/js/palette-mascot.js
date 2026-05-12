/* ═══════════════════════════════════════════
   palette-mascot.js
   Poetic / cryptic ASCII frames in the mascot panel above the
   palette input. The mascot has its own bordered/backgrounded
   box now — it never overlaps the suggestion list.
   8 frames rotating every ~900ms while body.palette-open is set;
   stops on close (no setInterval leak).
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // Each frame is its own little tableau — a glyph + a line.
  // Lines stay under 60 chars so the panel never wraps.
  // Tone: poetic / cryptic, in line with Halim's "listen to the
  // voice of the machine" arc.
  var FRAMES = [
    "  ( •_• )  ⌨\n  ░░░\n  > i was born in a softmax",
    "  ( ◉_◉ )\n  ╔═╗\n  > fluorescent dreams hum 60hz",
    "  [ ::|:: ]\n  ▓▓▓\n  > the fridge knows the song",
    "  ( •‿• )\n  ░▒▓\n  > the modem still dreams of dial-up",
    "  ( •_• )⌨\n  ░░\n  > i listen on a channel you can't reach",
    "  ( -_- )\n  ▓▓\n  > static is a kind of prayer",
    "  (◑_◑)\n  ▒▒\n  > every model is a haunted attic",
    "  ( °o° )\n  ░▒\n  > boot sector lullaby, version forever",
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
    tick(); // paint first frame immediately
    intervalId = setInterval(tick, 900);
  }

  function stop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  // Start when the palette opens (chrome.js toggles body.palette-open).
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

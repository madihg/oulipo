/* ═══════════════════════════════════════════
   palette-mascot.js
   Small ASCII animation that lives above the palette input bar
   while MACHINE mode / the palette is open. Two typewriters — a
   human and a machine — alternate "writing" a rotating poem
   fragment between them. A nod to the Singulars human-vs-machine
   poetry duels.
   Started by chrome.js after the chrome partial mounts; ticks
   every ~700ms while body.palette-open is set; stops cleanly when
   the palette closes (no setInterval leak).
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // Each frame: who's "typing" (`h` human / `m` machine) + the line in
  // the middle. The figure on the typing side gets a ⌨; the other side
  // shows ░░ as "thinking".
  var POEM = [
    "i was born",
    "from softmax",
    "half flesh",
    "half breath",
    "half iron",
    "half heart",
    "and yet",
    "you sleep",
    "the way a model",
    "rehearses dawn",
  ];

  // Returns a single-line frame for the given step.
  function frame(step) {
    var human = "( •_• )";
    var machine = "( ◉_◉ )";
    var line = POEM[step % POEM.length];
    var width = 32; // center column width
    var pad = Math.max(0, width - line.length);
    var leftPad = Math.floor(pad / 2);
    var rightPad = pad - leftPad;
    // Even steps: human is typing.  Odd steps: machine is typing.
    var humanTyping = step % 2 === 0;
    var leftSide = humanTyping ? human + " ⌨ " : human + " ░░";
    var rightSide = humanTyping ? "░░ " + machine : " ⌨ " + machine;
    return (
      leftSide +
      " ".repeat(leftPad) +
      "“" +
      line +
      "”" +
      " ".repeat(rightPad) +
      rightSide
    );
  }

  var intervalId = null;
  var step = 0;
  var node = null;

  function tick() {
    if (!node) return;
    node.textContent = frame(step++);
  }

  function start() {
    if (intervalId) return;
    node = document.querySelector("[data-mascot]");
    if (!node) return;
    step = 0;
    tick(); // paint first frame immediately
    intervalId = setInterval(tick, 700);
  }

  function stop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  // Start when the palette opens (chrome.js toggles body.palette-open).
  // Use MutationObserver on body classList because chrome.js doesn't emit
  // an event for palette state. Plus listen for the palette-open class on
  // body for explicit signaling.
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
    // If the palette is already open at boot, kick off now.
    if (document.body.classList.contains("palette-open")) {
      seenOpen = true;
      start();
    }
  }

  function boot() {
    // The chrome partial may not have been injected yet — wait for
    // chrome.js to finish before grabbing the mascot node.
    if (document.querySelector("[data-mascot]")) {
      watchBody();
    } else {
      // Poll briefly until the partial mounts.
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

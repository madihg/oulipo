/* ═══════════════════════════════════════════
   terminal.js — the home page's poem terminal.

   What it does:
     1. Picks a random one-word theme.
     2. Fires the live POST to Singulars' reverse.exe right away.
     3. ~120ms later, slides the 8-bit curtain open.
     4. Streams the poem into the terminal body. Caret blinks until
        the first token lands.
     5. Renders a strip of suggestion chips below. Clicking a chip
        retriggers the cycle with that theme.

   The Singulars chat endpoint lives at https://singulars.oulipo.xyz/api/chat
   and accepts { messages: [...], modelSlug: "reverse" } per route.ts.
   It streams a text/plain body (Vercel AI SDK StreamingTextResponse).
   If CORS or network blocks the live call, we fall back to a curated
   pool of inline poems so the surface still feels alive.
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // ── config ────────────────────────────────────────────────
  var ENDPOINT = "https://singulars.oulipo.xyz/api/chat";
  var MODEL_SLUG = "reverse";

  // One-word evocative themes. The reverse.exe model handles abstract
  // nouns well — these are tuned to its register (Ocean Vuong meets
  // Anne Carson via Beirut/SF kitchens).
  var THEMES = [
    "Liberation",
    "Distance",
    "Inheritance",
    "Salt",
    "Threshold",
    "Rust",
    "Tide",
    "Memory",
    "Forgetting",
    "Hunger",
    "Mercy",
    "Hush",
    "Vellum",
    "Crater",
    "Carbon",
    "Erasure",
    "Ash",
    "Rain",
    "Echo",
    "Migration",
    "Skin",
    "Bones",
    "Listening",
    "Yield",
    "Citizenship",
    "Border",
    "Mother",
    "Insomnia",
    "Plaintext",
    "Static",
    "Lullaby",
    "Glass",
    "Knot",
    "Daughter",
    "Compass",
    "Vow",
  ];

  // Inline fallback poems. Used when the live endpoint can't be reached
  // (CORS, offline, deploy down). Generated to match reverse.exe's voice.
  var FALLBACK_POEMS = {
    Liberation:
      "The door was never the door. It was the hinge that learned to stop arguing.\nI carried my mother's coat for years before I noticed it weighed less than her grief.\nWhat I called freedom was a window that finally believed me.",
    Distance:
      "Between us, a vocabulary of phone calls.\nThe kitchen in Beirut, the kitchen in Oakland: same kettle, different country.\nI write your name and the satellite forgets it on the way over.",
    Threshold:
      "The doorframe is a saint that holds.\nI cross it before I'm ready, the way salt crosses bread.\nWhatever you forget to bring becomes a country.",
    default:
      "I have been listening through the wall.\nWhat you call noise is a hymn the building learned to like.\nThe kettle, the radiator, the radio I never owned, all rehearsing your weight.",
  };

  // ── helpers ───────────────────────────────────────────────
  function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickThemes(count, exclude) {
    var pool = THEMES.filter(function (t) {
      return t !== exclude;
    });
    var out = [];
    var copy = pool.slice();
    for (var i = 0; i < count && copy.length > 0; i++) {
      var idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }

  // ── live call (streaming) with fallback ───────────────────
  function streamPoem(theme, onChunk) {
    var prompt = "Write a short poem about " + theme + ".";
    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        modelSlug: MODEL_SLUG,
      }),
      mode: "cors",
    })
      .then(function (r) {
        if (!r.ok) throw new Error("api " + r.status);
        if (!r.body) throw new Error("no stream");
        var reader = r.body.getReader();
        var decoder = new TextDecoder();
        return reader.read().then(function pump(result) {
          if (result.done) return;
          onChunk(decoder.decode(result.value, { stream: true }));
          return reader.read().then(pump);
        });
      })
      .catch(function (err) {
        console.warn("[terminal] live API failed:", err);
        // Fallback: drop a curated poem one character at a time so
        // the typing feel is preserved.
        var text = FALLBACK_POEMS[theme] || FALLBACK_POEMS.default;
        return typewriter(text, 14, onChunk);
      });
  }

  function typewriter(text, msPerChar, onChunk) {
    return new Promise(function (resolve) {
      var i = 0;
      var iv = setInterval(function () {
        if (i >= text.length) {
          clearInterval(iv);
          resolve();
          return;
        }
        onChunk(text.charAt(i));
        i++;
      }, msPerChar);
    });
  }

  // ── render ────────────────────────────────────────────────
  function hydrate(root) {
    var stage = root.querySelector("[data-terminal-stage]");
    var curtain = root.querySelector("[data-curtain]");
    var themeWord = root.querySelector("[data-terminal-theme-word]");
    var poem = root.querySelector("[data-terminal-poem]");
    var chipsBox = root.querySelector("[data-terminal-themes]");
    if (!stage || !curtain || !themeWord || !poem || !chipsBox) return;

    function cycle(theme) {
      // Reset poem area + theme.
      themeWord.textContent = theme;
      poem.innerHTML = "";
      var caret = document.createElement("span");
      caret.className = "terminal__caret";
      caret.setAttribute("aria-hidden", "true");
      poem.appendChild(caret);
      var firstToken = false;

      function onChunk(text) {
        if (!text) return;
        if (!firstToken) {
          // Remove caret on first token; we'll add a trailing one later.
          if (caret && caret.parentNode === poem) poem.removeChild(caret);
          firstToken = true;
        }
        poem.appendChild(document.createTextNode(text));
        poem.scrollTop = poem.scrollHeight;
      }

      streamPoem(theme, onChunk).then(function () {
        // After the stream ends, re-add a static caret as a finishing
        // beat (no animation — just a small green block).
        if (!firstToken) return;
        var endCaret = document.createElement("span");
        endCaret.className = "terminal__caret";
        endCaret.setAttribute("aria-hidden", "true");
        endCaret.style.animation = "none";
        endCaret.style.opacity = "0.45";
        poem.appendChild(endCaret);
      });

      // Refresh chip suggestions (exclude current theme).
      renderChips(theme);
    }

    function renderChips(active) {
      chipsBox.innerHTML = "";
      pickThemes(5, active).forEach(function (t) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "terminal__chip";
        btn.setAttribute("data-theme", t);
        btn.textContent = t.toLowerCase();
        btn.addEventListener("click", function () {
          cycle(t);
        });
        chipsBox.appendChild(btn);
      });
    }

    // Boot: pick a theme, fire the request, slide the curtain open.
    var initial = rand(THEMES);
    cycle(initial);

    // Slight delay so the curtain reveal has a beat before the
    // streaming starts visibly populating.
    setTimeout(function () {
      curtain.setAttribute("data-curtain", "open");
      // Hide curtain entirely after the transition finishes so it
      // doesn't block pointer events on the chips.
      setTimeout(function () {
        curtain.setAttribute("data-curtain", "done");
      }, 1350);
    }, 220);
  }

  function boot() {
    document.querySelectorAll("[data-terminal]").forEach(function (root) {
      if (root.dataset.terminalHydrated === "true") return;
      root.dataset.terminalHydrated = "true";
      hydrate(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // The home overlay fires this when the partial is injected mid-flight.
  document.addEventListener("home-overlay:loaded", boot);
})();

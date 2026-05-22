/* ═══════════════════════════════════════════
   terminal.js — the home page's poem terminal.

   What it does:
     1. Picks a random one-word theme.
     2. POSTs same-origin to /api/chat (Vercel Edge function at
        api/chat.js). That function holds the OPENROUTER_API_KEY
        env var and forwards to OpenRouter (Claude Opus 4.7 +
        SYSTEM_PROMPT_REVERSE, the same brain reverse.exe runs on
        at live shows). No key is ever in client code.
     3. ~120ms later, pulls the theater curtain open.
     4. Streams the poem into the terminal body. Caret blinks until
        the first token lands.
     5. Renders a strip of suggestion chips below. Clicking a chip
        retriggers the cycle with that theme.

   Response format: SSE (`data: {...}\n\n`) — OpenRouter's stream
   passed straight through. Each chunk's choices[0].delta.content
   is appended to the poem area. If the network is offline or the
   function is down we fall back to a small inline pool so the
   surface stays alive.
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // ── config ────────────────────────────────────────────────
  // Same-origin Vercel function. No key in this file; the key lives
  // in process.env.OPENROUTER_API_KEY on the Vercel project.
  var ENDPOINT = "/api/chat";

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
  // (offline, key revoked, OpenRouter outage).
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

  // ── live call (same-origin /api/chat → OpenRouter, SSE) ───
  function streamPoem(theme, onChunk) {
    var prompt = "Write a short poem about " + theme + ".";
    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
      }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("api " + r.status);
        if (!r.body) throw new Error("no stream");
        var reader = r.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";
        return reader.read().then(function pump(result) {
          if (result.done) {
            // Flush any final buffered event.
            if (buffer.trim()) handleSseLine(buffer.trim(), onChunk);
            return;
          }
          buffer += decoder.decode(result.value, { stream: true });
          // SSE events are split by blank lines; lines start with "data: ".
          var lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (var i = 0; i < lines.length; i++) {
            handleSseLine(lines[i], onChunk);
          }
          return reader.read().then(pump);
        });
      })
      .catch(function (err) {
        console.warn("[terminal] live API failed:", err);
        var text = FALLBACK_POEMS[theme] || FALLBACK_POEMS.default;
        return typewriter(text, 14, onChunk);
      });
  }

  function handleSseLine(line, onChunk) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === ":") return; // empty or comment
    if (trimmed.indexOf("data:") !== 0) return;
    var data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") return;
    try {
      var json = JSON.parse(data);
      var delta = json.choices && json.choices[0] && json.choices[0].delta;
      if (delta && delta.content) onChunk(delta.content);
    } catch (_) {
      // Non-JSON keepalive or partial frame — ignore.
    }
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
          if (caret && caret.parentNode === poem) poem.removeChild(caret);
          firstToken = true;
        }
        poem.appendChild(document.createTextNode(text));
        poem.scrollTop = poem.scrollHeight;
      }

      streamPoem(theme, onChunk).then(function () {
        if (!firstToken) return;
        var endCaret = document.createElement("span");
        endCaret.className = "terminal__caret";
        endCaret.setAttribute("aria-hidden", "true");
        endCaret.style.animation = "none";
        endCaret.style.opacity = "0.45";
        poem.appendChild(endCaret);
      });

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

    var initial = rand(THEMES);
    cycle(initial);

    setTimeout(function () {
      curtain.setAttribute("data-curtain", "open");
      // Theater pull = 2.6s transition (Halim 2026-05-22: slow it down).
      // Clear from layer stack a beat after the velvet halves finish.
      setTimeout(function () {
        curtain.setAttribute("data-curtain", "done");
      }, 2750);
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

  document.addEventListener("home-overlay:loaded", boot);
})();

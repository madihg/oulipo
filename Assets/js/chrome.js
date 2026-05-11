/* ═══════════════════════════════════════════
   chrome.js — boots the persistent UI chrome on every page.

   Injects Assets/partials/chrome.html into <body>, wires
   keyboard shortcuts, palette filtering, MACHINE/HUMAN toggle,
   and Substack signup submit.

   Pages opt in by:
     <link rel="stylesheet" href="/Assets/css/shared.css" />
     <script src="/Assets/js/chrome.js" defer></script>
   The chrome partial path resolves to /Assets/partials/chrome.html.
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // ── command catalogue (filtered by the palette input) ─────
  var COMMANDS = [
    {
      cmd: "/works",
      desc: "browse all works",
      kind: "page",
      go: "/works/",
    },
    {
      cmd: "/works machine-talk",
      desc: "fine-tuned poetry models",
      kind: "page",
      go: "/works/?section=machine-talk",
    },
    {
      cmd: "/works algorithmic-plays",
      desc: "live, algorithmic theater",
      kind: "page",
      go: "/works/?section=algorithmic-plays",
    },
    {
      cmd: "/works somatic-semantics",
      desc: "net art for the body",
      kind: "page",
      go: "/works/?section=somatic-semantics",
    },
    {
      cmd: "/works tools",
      desc: "small software for other artists",
      kind: "page",
      go: "/works/?section=tools",
    },
    {
      cmd: "/speaking",
      desc: "keynotes & workshops",
      kind: "page",
      go: "/speaking/",
    },
    { cmd: "/about", desc: "who · where · why", kind: "page", go: "/about/" },
    {
      cmd: "/writing",
      desc: "books, essays, zines",
      kind: "page",
      go: "/writing/",
    },
    { cmd: "/connect", desc: "send a message", kind: "page", go: "/connect/" },
    {
      cmd: "/connect talk",
      desc: "book a talk",
      kind: "action",
      go: "/connect/?intent=talk",
    },
    {
      cmd: "/connect workshop",
      desc: "host a workshop",
      kind: "action",
      go: "/connect/?intent=workshop",
    },
    {
      cmd: "/connect commission",
      desc: "commission a piece",
      kind: "action",
      go: "/connect/?intent=commission",
    },
    {
      cmd: "/newsletter",
      desc: "focus the email signup",
      kind: "action",
      go: "@signup",
    },
    {
      cmd: "/instagram",
      desc: "@yalla_halim on instagram",
      kind: "tool",
      go: "https://instagram.com/yalla_halim",
    },
    {
      cmd: "/substack",
      desc: "halimmadi.substack.com",
      kind: "tool",
      go: "https://halimmadi.substack.com",
    },
    {
      cmd: "/singulars",
      desc: "singulars.oulipo.xyz",
      kind: "tool",
      go: "https://singulars.oulipo.xyz",
    },
    // ── chat with Halim's poetic models ────────────────────
    // Routes to the Singulars chat surface, prefilled with the model.
    {
      cmd: "/chat whomp",
      desc: "scam-poet — replies to anything with a poem",
      kind: "agent",
      go: "https://singulars.oulipo.xyz/chat?model=whomp",
    },
    {
      cmd: "/chat carnation",
      desc: "carnation revolution model — Singulars I",
      kind: "agent",
      go: "https://singulars.oulipo.xyz/chat?model=carnation-exe",
    },
    {
      cmd: "/chat versus",
      desc: "duel-trained model — Singulars II",
      kind: "agent",
      go: "https://singulars.oulipo.xyz/chat?model=versus-exe",
    },
    {
      cmd: "/chat reinforcement",
      desc: "RLHF poetry model — Singulars III",
      kind: "agent",
      go: "https://singulars.oulipo.xyz/chat?model=reinforcement-exe",
    },
  ];

  var palette = null;
  var paletteInput = null;
  var paletteResults = null;
  var paletteRows = [];
  var paletteSelected = 0;

  // ── inject the partial ────────────────────────────────────
  function injectChrome() {
    if (document.querySelector(".signup-bar")) return Promise.resolve();
    return fetch("/Assets/partials/chrome.html", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("chrome partial " + r.status);
        return r.text();
      })
      .then(function (html) {
        var holder = document.createElement("div");
        holder.innerHTML = html;
        // Append in order so the body offset class matches the bar height.
        while (holder.firstChild) {
          document.body.appendChild(holder.firstChild);
        }
        document.body.classList.add("has-signup-bar");
      })
      .catch(function (err) {
        console.error("[chrome] failed to load partial:", err);
      });
  }

  // ── small helpers ─────────────────────────────────────────
  function isEditable(el) {
    if (!el) return false;
    var tag = el.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      el.isContentEditable === true
    );
  }
  function focusSignupInput() {
    var input = document.getElementById("signup-bar-email");
    if (input) input.focus();
  }

  // ── MACHINE / HUMAN mode ──────────────────────────────────
  function setMode(mode) {
    var isMachine = mode === "machine";
    document.body.classList.toggle("machine-mode", isMachine);
    document.body.classList.toggle("human-mode", !isMachine);
    var human = document.querySelector('[data-mode="human"]');
    var machine = document.querySelector('[data-mode="machine"]');
    if (human) {
      human.classList.toggle("is-active", !isMachine);
      human.setAttribute("aria-pressed", String(!isMachine));
    }
    if (machine) {
      machine.classList.toggle("is-active", isMachine);
      machine.setAttribute("aria-pressed", String(isMachine));
    }
    if (isMachine) {
      openPalette();
    } else {
      closePalette();
    }
  }

  // ── palette ──────────────────────────────────────────────
  function openPalette() {
    if (!palette) return;
    palette.hidden = false;
    document.body.classList.add("palette-open");
    renderResults("");
    setTimeout(function () {
      if (paletteInput) paletteInput.focus();
    }, 0);
  }

  function closePalette() {
    if (!palette) return;
    palette.hidden = true;
    document.body.classList.remove("palette-open");
    if (paletteInput) paletteInput.value = "";
  }

  function renderResults(query) {
    if (!paletteResults) return;
    var q = (query || "").trim().toLowerCase();
    var matches = COMMANDS.filter(function (c) {
      if (!q) return true;
      return (
        c.cmd.toLowerCase().indexOf(q) !== -1 ||
        c.desc.toLowerCase().indexOf(q) !== -1
      );
    }).slice(0, 8);

    paletteResults.innerHTML = "";

    if (matches.length === 0) {
      var empty = document.createElement("div");
      empty.className = "palette__empty";
      empty.textContent = "No matches. Try /works, /connect, /speaking…";
      paletteResults.appendChild(empty);
      paletteRows = [];
      return;
    }

    paletteRows = matches.map(function (cmd, idx) {
      var row = document.createElement("button");
      row.type = "button";
      row.className = "palette__row";
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", idx === 0 ? "true" : "false");
      row.dataset.go = cmd.go;
      row.innerHTML =
        '<span class="palette__row-icon" aria-hidden="true">/</span>' +
        '<span class="palette__row-cmd">' +
        escapeHtml(cmd.cmd) +
        "</span>" +
        '<span class="palette__row-desc">' +
        escapeHtml(cmd.desc) +
        "</span>" +
        '<span class="palette__row-badge palette__row-badge--' +
        cmd.kind +
        '">' +
        escapeHtml(cmd.kind) +
        "</span>";
      row.addEventListener("click", function () {
        firePaletteCommand(cmd);
      });
      paletteResults.appendChild(row);
      return row;
    });
    paletteSelected = 0;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setPaletteSelection(idx) {
    if (paletteRows.length === 0) return;
    paletteSelected =
      ((idx % paletteRows.length) + paletteRows.length) % paletteRows.length;
    paletteRows.forEach(function (r, i) {
      r.setAttribute("aria-selected", i === paletteSelected ? "true" : "false");
      if (i === paletteSelected)
        r.scrollIntoView({ block: "nearest", behavior: "auto" });
    });
  }

  function firePaletteCommand(cmd) {
    if (!cmd) return;
    if (cmd.go === "@signup") {
      closePalette();
      setMode("human");
      focusSignupInput();
      return;
    }
    if (/^https?:/.test(cmd.go)) {
      window.open(cmd.go, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.href = cmd.go;
  }

  // ── Halim card toggle (landing-page intro paragraph) ──────
  // The chip's key glyph is now permanently `H` (it opens the home
  // overlay). The `x` keyboard shortcut still collapses the intro
  // paragraph on the landing page so the works grid can move up flush.
  function toggleHalimCard() {
    if (!document.body.classList.contains("is-landing")) return;
    var card = document.querySelector("[data-halim-card]");
    if (!card) return;
    card.classList.toggle("is-collapsed");
    document.body.classList.toggle(
      "halim-card-collapsed",
      card.classList.contains("is-collapsed"),
    );
  }

  // ── Home overlay ──────────────────────────────────────────
  // Lazy-fetches /Assets/partials/home.html on first open, caches the
  // result for subsequent opens. Sets body.home-open so the overlay
  // CSS shows it and underlying scroll locks.
  var homePartialCache = null;
  var homePartialLoading = null;

  function fetchHomePartial() {
    if (homePartialCache) return Promise.resolve(homePartialCache);
    if (homePartialLoading) return homePartialLoading;
    homePartialLoading = fetch("/Assets/partials/home.html", {
      cache: "no-cache",
    })
      .then(function (r) {
        if (!r.ok) throw new Error("home partial " + r.status);
        return r.text();
      })
      .then(function (html) {
        homePartialCache = html;
        homePartialLoading = null;
        return html;
      })
      .catch(function (err) {
        homePartialLoading = null;
        console.error("[chrome] failed to load home partial:", err);
        return null;
      });
    return homePartialLoading;
  }

  function openHomeOverlay() {
    var overlay = document.querySelector(".home-overlay");
    if (!overlay) return;
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("home-open");

    // Sync the chip's aria-expanded
    var chip = document.querySelector("[data-home-toggle]");
    if (chip) chip.setAttribute("aria-expanded", "true");

    // Inject the partial on first open; subsequent opens reuse the cached DOM.
    var body = overlay.querySelector("[data-home-overlay-body]");
    if (body && body.dataset.loaded !== "true") {
      fetchHomePartial().then(function (html) {
        if (html) {
          body.innerHTML = html;
          body.dataset.loaded = "true";
          // Notify other modules (Phase B/C may want to hydrate events,
          // featured works, the Whomp chat — they listen for this).
          document.dispatchEvent(
            new CustomEvent("home-overlay:loaded", { detail: { body: body } }),
          );
        }
      });
    } else {
      // Re-fire the event so listeners can refresh state if they want.
      document.dispatchEvent(
        new CustomEvent("home-overlay:opened", { detail: { body: body } }),
      );
    }

    // Focus the close button so Esc / Tab feels coherent.
    setTimeout(function () {
      var close = overlay.querySelector("[data-home-close]");
      if (close) close.focus();
    }, 0);
  }

  function closeHomeOverlay() {
    var overlay = document.querySelector(".home-overlay");
    if (!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("home-open");

    var chip = document.querySelector("[data-home-toggle]");
    if (chip) {
      chip.setAttribute("aria-expanded", "false");
      chip.focus();
    }

    document.dispatchEvent(new CustomEvent("home-overlay:closed"));
  }

  // ── keyboard shortcuts ────────────────────────────────────
  function onKeydown(e) {
    var t = e.target;
    var inEditable = isEditable(t);

    // Esc — cascading close: home overlay first, then palette / MACHINE mode.
    if (e.key === "Escape") {
      if (document.body.classList.contains("home-open")) {
        e.preventDefault();
        closeHomeOverlay();
        return;
      }
      if (!palette || palette.hidden) return;
      e.preventDefault();
      setMode("human");
      return;
    }

    // ⌘K / Ctrl+K open palette anywhere (including in inputs)
    var isCmdK = (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K");
    if (isCmdK) {
      e.preventDefault();
      openPalette();
      return;
    }

    if (inEditable) return;

    // Single-letter shortcuts (no modifier keys)
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === "/") {
      e.preventDefault();
      openPalette();
      return;
    }
    if (e.key === "c") {
      e.preventDefault();
      window.location.href = "/connect/";
      return;
    }
    if (e.key === "h") {
      // H now toggles the home overlay (was: setMode("human"))
      e.preventDefault();
      if (document.body.classList.contains("home-open")) {
        closeHomeOverlay();
      } else {
        openHomeOverlay();
      }
      return;
    }
    if (e.key === "m") {
      // M toggles MACHINE mode — second press exits.
      e.preventDefault();
      setMode(
        document.body.classList.contains("machine-mode") ? "human" : "machine",
      );
      return;
    }
    if (e.key === "x") {
      if (document.body.classList.contains("is-landing")) {
        e.preventDefault();
        toggleHalimCard();
      }
      return;
    }

    // While palette is open, navigate results
    if (!palette || palette.hidden) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPaletteSelection(paletteSelected + 1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setPaletteSelection(paletteSelected - 1);
      return;
    }
  }

  // ── palette input handlers ───────────────────────────────
  function bindPalette() {
    palette = document.querySelector(".palette");
    paletteInput = document.querySelector("[data-palette-input]");
    paletteResults = document.querySelector("[data-palette-results]");
    if (!palette || !paletteInput || !paletteResults) return;

    paletteInput.addEventListener("input", function () {
      renderResults(paletteInput.value);
    });

    paletteInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPaletteSelection(paletteSelected + 1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPaletteSelection(paletteSelected - 1);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (paletteRows[paletteSelected]) paletteRows[paletteSelected].click();
        return;
      }
      if (e.key === "Tab") {
        // autocomplete to the highlighted command
        if (paletteRows[paletteSelected]) {
          e.preventDefault();
          var cmd =
            paletteRows[paletteSelected].querySelector(".palette__row-cmd");
          if (cmd) paletteInput.value = cmd.textContent;
        }
      }
    });

    var form = document.querySelector("[data-palette-form]");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (paletteRows[paletteSelected]) paletteRows[paletteSelected].click();
      });
    }
  }

  // ── mode-toggle buttons ──────────────────────────────────
  function bindModeButtons() {
    var human = document.querySelector('[data-mode="human"]');
    var machine = document.querySelector('[data-mode="machine"]');
    if (human)
      human.addEventListener("click", function () {
        setMode("human");
      });
    if (machine)
      machine.addEventListener("click", function () {
        setMode("machine");
      });
  }

  // ── Substack signup ──────────────────────────────────────
  function bindSignup() {
    var form = document.querySelector("[data-substack]");
    if (!form) return;
    var status = form.querySelector("[data-signup-status]");

    // Pre-fill the URL/referrer hidden inputs so they're current at submit
    // time (and visible in dev tools for debugging). Mirrors what Substack's
    // own embed form populates.
    var hiddenURL = form.querySelector('input[name="first_url"]');
    if (hiddenURL && !hiddenURL.value) hiddenURL.value = window.location.href;
    var hiddenCurrentURL = form.querySelector('input[name="current_url"]');
    if (hiddenCurrentURL && !hiddenCurrentURL.value)
      hiddenCurrentURL.value = window.location.href;
    var hiddenSessionURL = form.querySelector(
      'input[name="first_session_url"]',
    );
    if (hiddenSessionURL && !hiddenSessionURL.value)
      hiddenSessionURL.value = window.location.href;
    var ref = document.referrer || "";
    ["first_referrer", "current_referrer", "first_session_referrer"].forEach(
      function (n) {
        var el = form.querySelector('input[name="' + n + '"]');
        if (el && !el.value) el.value = ref;
      },
    );

    form.addEventListener("submit", function (e) {
      // Substack's /api/v1/free?nojs=true endpoint accepts form-urlencoded
      // POSTs from any origin. Their CORS headers don't expose the response
      // to JS, so we use mode:"no-cors" and treat a resolved fetch as
      // best-effort success. If the network call fails outright, we fall back
      // to opening Substack's hosted subscribe form pre-filled with the email.
      e.preventDefault();
      var input = form.querySelector(".signup-bar__input");
      var email = ((input && input.value) || "").trim();
      if (!email) return;
      if (status) {
        status.textContent = "subscribing…";
        status.classList.remove(
          "signup-bar__status--success",
          "signup-bar__status--error",
        );
      }

      // Use FormData(form) so all hidden inputs ride along automatically.
      var formData = new FormData(form);

      fetch(form.action, {
        method: "POST",
        body: formData,
        mode: "no-cors",
        credentials: "omit",
      })
        .then(function () {
          if (status) {
            status.textContent = "subscribed ✓";
            status.classList.add("signup-bar__status--success");
          }
          if (input) input.value = "";
          setTimeout(function () {
            if (status) {
              status.textContent = "";
              status.classList.remove("signup-bar__status--success");
            }
          }, 3000);
        })
        .catch(function () {
          if (status) {
            status.innerHTML =
              '<a href="https://halimmadi.substack.com/subscribe?email=' +
              encodeURIComponent(email) +
              '" target="_blank" rel="noopener">try at substack.com ↗</a>';
            status.classList.add("signup-bar__status--error");
          }
        });
    });
  }

  // ── [Halim Madi H] chip + Home overlay close + burger Home ─
  // The chip now opens the home overlay from any page (including the
  // landing — pressing H re-shows the home as an overlay layer over
  // whatever was on screen).
  function bindHomeOverlay() {
    var chip = document.querySelector("[data-home-toggle]");
    if (chip) {
      chip.addEventListener("click", function (e) {
        e.preventDefault();
        openHomeOverlay();
      });
    }

    var close = document.querySelector("[data-home-close]");
    if (close) {
      close.addEventListener("click", function (e) {
        e.preventDefault();
        closeHomeOverlay();
      });
    }

    // Intercept any side-menu "Home" link click and open the overlay
    // instead of navigating. Match `.menu-home` (existing class on the
    // side-menu home link) and any anchor whose href is exactly "/" or
    // "/home/" inside a `.side-menu`.
    document.querySelectorAll(".side-menu .menu-home").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        // Close the side menu first (uses the global toggleMenu() from menu.js)
        if (typeof window.toggleMenu === "function") {
          var menu = document.querySelector(".side-menu");
          if (menu && menu.classList.contains("active")) window.toggleMenu();
        }
        openHomeOverlay();
      });
    });
  }

  // ── connect intent pre-select ─────────────────────────────
  function applyConnectIntent() {
    if (!/\/connect\/?$/.test(window.location.pathname)) return;
    var params = new URLSearchParams(window.location.search);
    var intent = params.get("intent");
    if (!intent) return;
    var radio = document.querySelector(
      '[data-connect-door][value="' + intent + '"]',
    );
    if (radio) {
      radio.checked = true;
      var label = radio.closest("[data-connect-door-label]");
      if (label) label.classList.add("is-selected");
    }
  }

  // ── boot ─────────────────────────────────────────────────
  function boot() {
    injectChrome().then(function () {
      bindPalette();
      bindModeButtons();
      bindSignup();
      bindHomeOverlay();
      applyConnectIntent();
      document.addEventListener("keydown", onKeydown);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

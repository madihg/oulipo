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
      human.classList.toggle("chip--active", !isMachine);
      human.setAttribute("aria-pressed", String(!isMachine));
    }
    if (machine) {
      machine.classList.toggle("chip--active", isMachine);
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

  // ── Halim card toggle (landing page only) ─────────────────
  function toggleHalimCard() {
    if (!document.body.classList.contains("is-landing")) return;
    var card = document.querySelector("[data-halim-card]");
    if (!card) return;
    card.classList.toggle("is-collapsed");
    var btn = document.querySelector("[data-halim-toggle]");
    if (btn) {
      var collapsed = card.classList.contains("is-collapsed");
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.textContent = collapsed ? "+" : "×";
    }
  }

  // ── keyboard shortcuts ────────────────────────────────────
  function onKeydown(e) {
    var t = e.target;
    var inEditable = isEditable(t);

    // Esc always closes the palette / exits MACHINE mode
    if (e.key === "Escape") {
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
      e.preventDefault();
      setMode("human");
      return;
    }
    if (e.key === "m") {
      e.preventDefault();
      setMode("machine");
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

    form.addEventListener("submit", function (e) {
      // Substack accepts the form via its public endpoint without CORS for
      // direct same-origin POST. From a browser, our cross-origin POST will
      // either succeed (Substack returns 200/302) or — more commonly — be
      // blocked by CORS. We use a no-cors fetch as a best-effort, and fall back
      // to opening Substack's hosted form in a new tab if it fails.
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

      var formData = new FormData();
      formData.set("email", email);
      formData.set("first_url", window.location.href);
      formData.set("first_referrer", document.referrer || "");

      fetch(form.action, {
        method: "POST",
        body: formData,
        mode: "no-cors",
        credentials: "omit",
      })
        .then(function () {
          // no-cors: response is opaque, but if fetch resolves we treat it as best-effort success
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

  // ── Halim card external toggle button (clicked, not keyed) ─
  function bindHalimCardToggle() {
    var btn = document.querySelector("[data-halim-toggle]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      toggleHalimCard();
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
      bindHalimCardToggle();
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

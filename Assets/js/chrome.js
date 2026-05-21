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

  // ── staging path prefix ────────────────────────────────────
  // When the site is served under /staging/ (via the vercel rewrite
  // /staging/:path* -> /:path*), the page content is the same as the
  // production version — but every <a href="/works/"> in the markup
  // resolves to oulipo.xyz/works/, jumping out of staging. This
  // interceptor catches those clicks and rewrites the href to keep
  // the visitor inside /staging/. Same for command-palette nav and
  // any in-app window.location.href = "/..." we trigger ourselves.
  var STAGING_PREFIX = "/staging";
  function isStaging() {
    return (
      window.location.pathname.indexOf(STAGING_PREFIX + "/") === 0 ||
      window.location.pathname === STAGING_PREFIX
    );
  }
  function stagingHref(href) {
    if (!isStaging()) return href;
    if (!href) return href;
    if (href.indexOf("//") === 0 || /^https?:/i.test(href)) return href;
    if (href.charAt(0) === "/" && href.indexOf(STAGING_PREFIX + "/") !== 0) {
      return STAGING_PREFIX + href;
    }
    return href;
  }
  // Expose for any other module (engagements.js, etc.) that does its
  // own programmatic navigation.
  window.stagingHref = stagingHref;
  if (isStaging()) {
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target.closest && e.target.closest("a[href]");
        if (!a) return;
        var raw = a.getAttribute("href");
        var fixed = stagingHref(raw);
        if (fixed !== raw) {
          e.preventDefault();
          // respect target=_blank / cmd-click / middle-click
          if (
            a.target === "_blank" ||
            e.metaKey ||
            e.ctrlKey ||
            e.shiftKey ||
            e.button !== 0
          ) {
            window.open(fixed, a.target || "_self");
          } else {
            window.location.href = fixed;
          }
        }
      },
      true,
    );
  }

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
      cmd: "/engagements",
      desc: "keynotes, panels, workshops, residencies",
      kind: "page",
      go: "/engagements/",
    },
    {
      cmd: "/engagements keynote",
      desc: "keynotes only",
      kind: "action",
      go: "/engagements/?kind=keynote",
    },
    {
      cmd: "/engagements workshop",
      desc: "workshops only",
      kind: "action",
      go: "/engagements/?kind=workshop",
    },
    {
      cmd: "/engagements residency",
      desc: "residencies only",
      kind: "action",
      go: "/engagements/?kind=residency",
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
    return fetch("/Assets/partials/chrome.html?v=12", { cache: "no-cache" })
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
  // Top-level pages shown when user types `/`. These are the ONLY
  // suggestions on the first slash — keeps the palette uncluttered.
  var TOP_LEVEL = [
    { cmd: "/works", desc: "browse all works", kind: "page", go: "/works/" },
    {
      cmd: "/engagements",
      desc: "keynotes, panels, workshops, residencies",
      kind: "page",
      go: "/engagements/",
    },
    {
      cmd: "/writing",
      desc: "books, essays, zines",
      kind: "page",
      go: "/writing/",
    },
    { cmd: "/about", desc: "who · where · why", kind: "page", go: "/about/" },
    {
      cmd: "/connect",
      desc: "send a message",
      kind: "page",
      go: "/connect/",
    },
    { cmd: "/now", desc: "upcoming events", kind: "page", go: "/now/" },
  ];

  // Subworks shown when user types `/works` or `/works/`.
  // Hardcoded for now — could be hydrated from works.json later.
  var SUBWORKS = [
    {
      cmd: "/works/borderline",
      desc: "queer-Arab full-body web piece",
      kind: "subwork",
      go: "/works/borderline/",
    },
    {
      cmd: "/works/carnation-exe",
      desc: "fine-tuned model — Singulars I",
      kind: "subwork",
      go: "/works/carnation-exe/",
    },
    {
      cmd: "/works/versus-exe",
      desc: "duel-trained model — Singulars II",
      kind: "subwork",
      go: "/works/versus-exe/",
    },
    {
      cmd: "/works/reinforcement-exe",
      desc: "RLHF poetry — Singulars III",
      kind: "subwork",
      go: "/works/reinforcement-exe/",
    },
    {
      cmd: "/works/curl",
      desc: "scroll-driven scalp piece",
      kind: "subwork",
      go: "/works/curl/",
    },
    {
      cmd: "/works/whomp",
      desc: "scam-poet (chat live on /)",
      kind: "subwork",
      go: "/works/whomp/",
    },
    {
      cmd: "/works/?section=machine-talk",
      desc: "section · machine talk",
      kind: "page",
      go: "/works/?section=machine-talk",
    },
    {
      cmd: "/works/?section=algorithmic-plays",
      desc: "section · algorithmic plays",
      kind: "page",
      go: "/works/?section=algorithmic-plays",
    },
    {
      cmd: "/works/?section=somatic-semantics",
      desc: "section · somatic semantics",
      kind: "page",
      go: "/works/?section=somatic-semantics",
    },
    {
      cmd: "/works/?section=tools",
      desc: "section · tools",
      kind: "page",
      go: "/works/?section=tools",
    },
  ];

  function openPalette() {
    if (!palette) return;
    palette.hidden = false;
    document.body.classList.add("palette-open");
    // Empty input on open → no suggestions visible (just mascot panel).
    if (paletteInput) paletteInput.value = "";
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
    renderResults("");
  }

  // Slash-hierarchy router for suggestions:
  //   empty   → no results (panel hidden, only mascot visible)
  //   "/"     → top-level pages
  //   "/works"|"/works/" → subworks list
  //   "/works/<x>" → filter SUBWORKS by partial match
  //   anything else → fuzzy filter across COMMANDS + SUBWORKS
  function renderResults(query) {
    if (!paletteResults) return;
    var raw = query || "";
    var q = raw.trim().toLowerCase();
    var matches = [];

    if (!q) {
      paletteResults.hidden = true;
      paletteResults.innerHTML = "";
      paletteRows = [];
      return;
    }

    if (q === "/") {
      matches = TOP_LEVEL.slice();
    } else if (q === "/works" || q === "/works/") {
      matches = SUBWORKS.slice();
    } else if (q.indexOf("/works/") === 0) {
      var rest = q;
      matches = SUBWORKS.filter(function (c) {
        return c.cmd.toLowerCase().indexOf(rest) === 0;
      });
    } else {
      var pool = TOP_LEVEL.concat(SUBWORKS).concat(COMMANDS);
      matches = pool
        .filter(function (c) {
          return (
            c.cmd.toLowerCase().indexOf(q) !== -1 ||
            (c.desc || "").toLowerCase().indexOf(q) !== -1
          );
        })
        .slice(0, 10);
    }

    paletteResults.innerHTML = "";

    if (matches.length === 0) {
      paletteResults.hidden = false;
      var empty = document.createElement("div");
      empty.className = "palette__empty";
      empty.textContent = "no matches. try /, /works, /connect…";
      paletteResults.appendChild(empty);
      paletteRows = [];
      return;
    }

    paletteResults.hidden = false;
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
    window.location.href = stagingHref(cmd.go);
  }

  // (toggleHalimCard removed — the old landing-page Halim card was
  // replaced by the home content partial in Phase B. Nothing to toggle.)

  // (The home overlay used to live here. Halim asked to drop it on
  // 2026-05-12 — the Halim Madi chip now just navigates to / like a
  // normal logo. The home content is still shared via
  // Assets/partials/home.html, which /index.html fetches inline; the
  // home-overlay:loaded custom event still fires from there so
  // home.js and whomp-chat.js hydrate.)

  // ── keyboard shortcuts ────────────────────────────────────
  function onKeydown(e) {
    var t = e.target;
    var inEditable = isEditable(t);

    // Esc closes the palette / exits MACHINE mode.
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
      window.location.href = stagingHref("/connect/");
      return;
    }
    if (e.key === "h") {
      // H = HUMAN mode (exits MACHINE if on; default state otherwise).
      e.preventDefault();
      setMode("human");
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
        // Two behaviors:
        //   1. Input is empty → open the slash hierarchy (same as
        //      typing "/"). Halim 2026-05-15: "tab does nothing
        //      right now, when i click on it it should show something."
        //   2. Input non-empty + a suggestion highlighted → autocomplete.
        var currentValue = paletteInput.value || "";
        if (currentValue.trim() === "") {
          e.preventDefault();
          paletteInput.value = "/";
          renderResults("/");
          return;
        }
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
      if (!email) {
        // On mobile the email field is hidden — clicking Subscribe with
        // no email opens Substack's hosted signup page directly so the
        // user still has a path to subscribe. On desktop with a visible
        // empty field, just bail (user hasn't typed anything yet).
        var inputHidden = !input || getComputedStyle(input).display === "none";
        if (inputHidden) {
          window.open(
            "https://halimmadi.substack.com/subscribe",
            "_blank",
            "noopener,noreferrer",
          );
        }
        return;
      }
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

  // (The Halim Madi chip is now a plain <a href="/"> in chrome.html —
  // no JS click handler needed. Side-menu "Home" link also goes to /
  // directly. The previous overlay-opening behavior was dropped on
  // 2026-05-12.)

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
  function loadMascot() {
    // Inject palette-mascot.js once, after the partial is in the DOM
    // so the mascot module can hook the [data-mascot] node.
    if (document.querySelector("script[data-mascot-loader]")) return;
    var s = document.createElement("script");
    s.src = "/Assets/js/palette-mascot.js?v=6";
    s.defer = true;
    s.setAttribute("data-mascot-loader", "");
    document.head.appendChild(s);
  }

  function loadHomeModule() {
    // home.js hydrates events + featured works inside the home overlay
    // (and inside the root /index.html mount). Inject once site-wide.
    if (document.querySelector("script[data-home-loader]")) return;
    var s = document.createElement("script");
    s.src = "/Assets/js/home.js?v=7";
    s.defer = true;
    s.setAttribute("data-home-loader", "");
    document.head.appendChild(s);
  }

  function loadTerminal() {
    // terminal.js hydrates the poem terminal at the top of the home
    // content (root /index.html mount + home overlay). It POSTs to
    // same-origin /api/chat (api/chat.js Edge fn → OpenRouter Claude
    // Opus 4.7 + SYSTEM_PROMPT_REVERSE), the same brain reverse.exe
    // runs on. The OpenRouter key lives in Vercel env vars only.
    if (document.querySelector("script[data-terminal-loader]")) return;
    var s = document.createElement("script");
    s.src = "/Assets/js/terminal.js?v=6";
    s.defer = true;
    s.setAttribute("data-terminal-loader", "");
    document.head.appendChild(s);
  }

  // Fetch /llms.txt and render its content as the dimmed background
  // of the palette overlay. The agent-facing site index lives at
  // /llms.txt (also served as a real file for crawlers / agents).
  // Inside the palette we render the raw markdown as a <pre> behind
  // the mascot panel + input. Low contrast so it reads as ambience.
  function loadAgentBackground() {
    var palette = document.querySelector(".palette");
    if (!palette) return;
    if (palette.querySelector("[data-llms]")) return;
    var bg = document.createElement("pre");
    bg.className = "palette__llms";
    bg.setAttribute("data-llms", "");
    bg.setAttribute("aria-hidden", "true");
    bg.textContent = "loading…";
    // Insert FIRST so the mascot panel + suggestions + input stack
    // on top via the existing flex order.
    palette.insertBefore(bg, palette.firstChild);
    fetch("/llms.txt", { cache: "no-cache" })
      .then(function (r) {
        return r.ok ? r.text() : "";
      })
      .then(function (text) {
        bg.textContent = text || "";
      })
      .catch(function () {
        bg.textContent = "";
      });
  }

  function boot() {
    injectChrome().then(function () {
      bindPalette();
      bindModeButtons();
      bindSignup();
      applyConnectIntent();
      loadMascot();
      loadHomeModule();
      loadTerminal();
      loadAgentBackground();
      document.addEventListener("keydown", onKeydown);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

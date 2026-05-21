/* ═══════════════════════════════════════════
   engagements.js — hydrates /engagements/

   - Fetches every engagement-shaped row from public.works
     (keynote / panel / talk / workshop / residency).
   - Renders the kind-filter chip strip with live counts.
   - Renders a year-grouped archive of dense rows (.eng-row).
   - Reads ?kind=<value> from the URL on load; clicking a chip
     re-renders the archive client-side and writes history.replaceState
     so the filtered view is shareable.

   No deps. Vanilla DOM. Halim's brand rule.
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // ── config ────────────────────────────────────────────────
  var SUPABASE_URL = "https://smytgqkgomsfyurskpcl.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_m509hZmnUb8NZRG94irXqA_AViI-8qf";

  // The 4 engagement-shaped kinds, in chip order. (Halim 2026-05-20:
  // dropped `talk` — it's a sub-flavor of keynote, not its own kind.)
  var KINDS = [
    {
      slug: "keynote",
      label: "Keynote",
      color: "var(--section-plays)",
    },
    {
      slug: "panel",
      label: "Panel",
      color: "var(--section-semantics)",
    },
    {
      slug: "workshop",
      label: "Workshop",
      color: "var(--section-tools)",
    },
    {
      slug: "residency",
      label: "Residency",
      color: "var(--section-machine)",
    },
  ];
  var KIND_BY_SLUG = Object.fromEntries(
    KINDS.map(function (k) {
      return [k.slug, k];
    }),
  );

  // ── small helpers ─────────────────────────────────────────
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function safeUrl(value) {
    if (!value) return null;
    try {
      var u = new URL(value, window.location.origin);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.toString();
    } catch (_) {
      return null;
    }
  }
  function firstExternalLink(row) {
    if (row && row.link) return row.link;
    var list = row && row.external_links;
    if (!Array.isArray(list) || !list.length) return null;
    var first = list[0];
    return first && typeof first === "object" ? first.url : first;
  }
  function getYear(row) {
    if (row.date_start) return String(row.date_start).slice(0, 4);
    var m = String(row.date_display || "").match(/\b(19|20)\d{2}\b/);
    return m ? m[0] : "—";
  }
  function readKindFromURL() {
    var p = new URLSearchParams(window.location.search);
    var k = (p.get("kind") || "").toLowerCase();
    if (!k || k === "all") return null;
    return KIND_BY_SLUG[k] ? k : null;
  }
  function writeKindToURL(kind) {
    var url = new URL(window.location.href);
    if (kind) url.searchParams.set("kind", kind);
    else url.searchParams.delete("kind");
    history.replaceState({}, "", url.toString());
  }

  // ── fetch ─────────────────────────────────────────────────
  function fetchEngagements() {
    var kindList = KINDS.map(function (k) {
      return k.slug;
    }).join(",");
    var url =
      SUPABASE_URL +
      "/rest/v1/works?select=*&kind=in.(" +
      kindList +
      ")&order=date_start.desc.nullslast";
    return fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: "Bearer " + SUPABASE_ANON_KEY,
        accept: "application/json",
      },
    }).then(function (r) {
      if (!r.ok) throw new Error("engagements " + r.status);
      return r.json();
    });
  }

  // ── chip strip ────────────────────────────────────────────
  function renderChips(container, rows, activeKind, onSelect) {
    var counts = { all: rows.length };
    rows.forEach(function (r) {
      counts[r.kind] = (counts[r.kind] || 0) + 1;
    });

    var html =
      '<button class="eng-chip" data-kind="" aria-pressed="' +
      (activeKind ? "false" : "true") +
      '">all <span class="eng-chip__count">' +
      counts.all +
      "</span></button>";

    html += KINDS.map(function (k) {
      var n = counts[k.slug] || 0;
      return (
        '<button class="eng-chip" data-kind="' +
        k.slug +
        '" aria-pressed="' +
        (activeKind === k.slug ? "true" : "false") +
        '">' +
        '<span class="eng-chip__dot" style="background:' +
        k.color +
        '" aria-hidden="true"></span>' +
        esc(k.label) +
        ' <span class="eng-chip__count">' +
        n +
        "</span></button>"
      );
    }).join("");

    container.innerHTML = html;
    container.querySelectorAll(".eng-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        onSelect(btn.dataset.kind || null);
      });
    });
  }

  // ── archive ───────────────────────────────────────────────
  function renderArchive(container, rows, activeKind) {
    var filtered = activeKind
      ? rows.filter(function (r) {
          return r.kind === activeKind;
        })
      : rows.slice();

    if (!filtered.length) {
      container.innerHTML =
        '<p class="eng-state">No entries in this filter.</p>';
      return;
    }

    // Group by year (desc), already pre-sorted by date_start.desc.
    var byYear = {};
    filtered.forEach(function (row) {
      var y = getYear(row);
      (byYear[y] = byYear[y] || []).push(row);
    });
    var years = Object.keys(byYear).sort(function (a, b) {
      if (a === "—") return 1;
      if (b === "—") return -1;
      return Number(b) - Number(a);
    });

    var html = years
      .map(function (y) {
        var rowsHtml = byYear[y]
          .map(function (row) {
            var kindMeta = KIND_BY_SLUG[row.kind] || {
              label: row.kind,
              color: "var(--ink-40)",
            };
            var org = (row.org || "").trim() || "—";
            var date = row.date_display || y;
            var link = safeUrl(firstExternalLink(row));
            var linkChunk = link
              ? '<a class="eng-row__link" href="' +
                esc(link) +
                '" target="_blank" rel="noopener noreferrer">↗</a>'
              : "";

            // The outer element is non-link by default; the in-row arrow
            // handles the external nav so the row itself can hover-highlight
            // without trapping clicks for visitors who just want to skim.
            return (
              '<div class="eng-row" data-kind="' +
              esc(row.kind) +
              '">' +
              '<span class="eng-row__dot" style="background:' +
              kindMeta.color +
              '" aria-hidden="true"></span>' +
              '<span class="eng-row__org">' +
              esc(org) +
              " →</span>" +
              '<span class="eng-row__title">' +
              esc(row.title || "") +
              "</span>" +
              '<span class="eng-row__kind">' +
              esc(kindMeta.label) +
              "</span>" +
              '<span class="eng-row__date">' +
              esc(date) +
              linkChunk +
              "</span>" +
              "</div>"
            );
          })
          .join("");
        return '<h3 class="eng-year">' + esc(y) + "</h3>" + rowsHtml;
      })
      .join("");

    container.innerHTML = html;
  }

  // ── boot ─────────────────────────────────────────────────
  function boot() {
    var chipsEl = document.querySelector("[data-eng-chips]");
    var listEl = document.querySelector("[data-eng-list]");
    if (!chipsEl || !listEl) return;

    var state = {
      rows: [],
      kind: readKindFromURL(),
    };

    function applyState() {
      renderChips(chipsEl, state.rows, state.kind, onSelect);
      renderArchive(listEl, state.rows, state.kind);
    }
    function onSelect(kind) {
      state.kind = kind;
      writeKindToURL(kind);
      applyState();
    }

    fetchEngagements()
      .then(function (rows) {
        state.rows = rows || [];
        applyState();
        window.addEventListener("popstate", function () {
          state.kind = readKindFromURL();
          applyState();
        });
      })
      .catch(function (err) {
        console.error("[engagements] fetch failed:", err);
        chipsEl.innerHTML = "";
        listEl.innerHTML =
          '<p class="eng-state">Could not load engagements. Refresh to retry.</p>';
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

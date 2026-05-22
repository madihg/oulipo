/* ═══════════════════════════════════════════
   home.js
   Hydrates the home surface — fills [data-home-events] with the next
   3 upcoming events from oulipo_dashboard.events (Supabase) and
   [data-home-featured] with the 4 works flagged featured:true from
   Assets/data/works.json (or Supabase oulipo_dashboard.works once
   it's seeded — same fetch path).

   Runs in two places:
   1. On initial page load if /index.html mounted the partial inline.
   2. When chrome.js fires `home-overlay:loaded` (the overlay partial
      just landed in the DOM for the first time).
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var SUPABASE_URL = "https://smytgqkgomsfyurskpcl.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_m509hZmnUb8NZRG94irXqA_AViI-8qf";

  // Cached state so re-opening the overlay doesn't re-fetch.
  var eventsCache = null;
  var worksCache = null;

  // ── small helpers ────────────────────────────────────────
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.startsWith("aria-") || k.startsWith("data-")) {
          node.setAttribute(k, attrs[k]);
        } else node[k] = attrs[k];
      }
    }
    (kids || []).forEach(function (k) {
      if (k == null) return;
      if (typeof k === "string") node.appendChild(document.createTextNode(k));
      else node.appendChild(k);
    });
    return node;
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

  // ── fetch event-shaped rows from the merged works table ───
  // Post-merge (2026-05-20), events live as kind-tagged rows in
  // oulipo_dashboard.works. We pull the event-shaped kinds via
  // public.works (a view over the dashboard schema). PostgREST 'in'
  // filter spelling: kind=in.(a,b,c).
  var EVENT_KINDS = [
    "performance",
    "workshop",
    "keynote",
    "panel",
    "exhibition",
    "residency",
  ].join(",");
  function fetchEvents() {
    if (eventsCache) return Promise.resolve(eventsCache);
    var url =
      SUPABASE_URL +
      "/rest/v1/works?select=*&kind=in.(" +
      EVENT_KINDS +
      ")&order=date_start.asc.nullslast";
    return fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: "Bearer " + SUPABASE_ANON_KEY,
        accept: "application/json",
      },
    })
      .then(function (r) {
        if (!r.ok) throw new Error("events " + r.status);
        return r.json();
      })
      .then(function (rows) {
        eventsCache = rows;
        return rows;
      });
  }

  // ── fetch work-shaped rows from the merged works table ────
  // The 7 portfolio kinds. We add &featured=eq.true here because the
  // featured strip is the only consumer of fetchWorks() on the home
  // page — pulling 152 rows just to filter client-side is wasteful.
  var WORK_KINDS = [
    "performance",
    "installation",
    "net_art",
    "workshop_piece",
    "film",
    "tools",
    "exhibition",
  ].join(",");
  function fetchWorks() {
    if (worksCache) return Promise.resolve(worksCache);
    // Skip rows tagged 'cv-only' — they belong on /cv/ but should not
    // surface on the home featured strip even if featured=true is set.
    var url =
      SUPABASE_URL +
      "/rest/v1/works?select=*&kind=in.(" +
      WORK_KINDS +
      ")&featured=eq.true&tags=not.cs.{cv-only}" +
      "&order=date_start.desc.nullslast";
    return fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: "Bearer " + SUPABASE_ANON_KEY,
        accept: "application/json",
      },
    })
      .then(function (r) {
        if (!r.ok) throw new Error("works " + r.status);
        return r.json();
      })
      .then(function (rows) {
        if (!rows || rows.length === 0) throw new Error("empty");
        worksCache = rows;
        return rows;
      })
      .catch(function () {
        return fetch("/Assets/data/works.json", { cache: "no-cache" })
          .then(function (r) {
            return r.json();
          })
          .then(function (j) {
            worksCache = Array.isArray(j) ? j : j.works || [];
            return worksCache;
          });
      });
  }

  // ── render: upcoming events (horizontal carousel) ───────
  // Cards match the featured-works shape so the home reads as one
  // family of horizontal scrollers. Up to 8 upcoming events so the
  // visitor can scroll a real strip, not just see 3 cards.
  function renderEvents(container, events) {
    container.innerHTML = "";
    var now = Date.now();
    var grace = 7 * 24 * 60 * 60 * 1000;
    var upcoming = events
      .filter(function (e) {
        var d = e.date_end || e.date_start;
        if (!d) return true;
        var t = new Date(d).getTime();
        if (Number.isNaN(t)) return true;
        return t + grace >= now;
      })
      .slice(0, 8);

    if (upcoming.length === 0) {
      container.appendChild(
        el("p", { class: "home-section__loading" }, [
          "Nothing on the calendar at the moment.",
        ]),
      );
      return;
    }

    var list = el("div", { class: "home-featured__list" }, []);
    upcoming.forEach(function (e) {
      var link = safeUrl(e.link);
      var when = (e.date_display || "").trim();
      var loc = (e.location || "").trim();
      var metaParts = [];
      if (e.org) metaParts.push(String(e.org).toUpperCase());
      if (when) metaParts.push(when);
      if (loc) metaParts.push(loc);

      // Use cover_image if Supabase has one; otherwise gray placeholder.
      var cover = e.cover_image
        ? "/" + String(e.cover_image).replace(/^\/+/, "")
        : null;
      var image = cover
        ? el("div", { class: "home-feature__image" }, [
            el("img", {
              src: cover,
              alt: e.title || "",
              loading: "lazy",
              decoding: "async",
            }),
          ])
        : el("div", { class: "home-feature__image" }, []);

      var card = el(
        "a",
        {
          class: "home-feature",
          href: link || "#",
          target: link ? "_blank" : "_self",
          rel: link ? "noopener noreferrer" : null,
        },
        [
          image,
          el("div", { class: "home-feature__body" }, [
            el("h3", { class: "home-feature__title" }, [e.title || ""]),
            el("div", { class: "home-feature__meta" }, [
              metaParts.length ? metaParts.join(" · ") : null,
            ]),
          ]),
        ],
      );
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  // ── render: combined recent keynotes + workshops ─────────
  // Pulls events where kind IN ('talk','workshop') AND featured=true,
  // sorted by date desc. Same card shape as featured works (image
  // on top, body below). Halim 2026-05-15: one section, not two.
  function renderRecentKeynotesWorkshops(container, events) {
    container.innerHTML = "";
    var rows = events
      .filter(function (e) {
        var k = e.kind;
        return (k === "workshop" || k === "keynote") && e.featured === true;
      })
      .sort(function (a, b) {
        return (b.date_start || "").localeCompare(a.date_start || "");
      })
      .slice(0, 8);

    if (rows.length === 0) {
      container.appendChild(
        el("p", { class: "home-section__loading" }, ["Nothing featured yet."]),
      );
      return;
    }
    var list = el("div", { class: "home-featured__list" }, []);
    rows.forEach(function (e) {
      // chrome.js installs a click interceptor that prefixes /staging/
      // when needed, so this absolute href stays simple.
      var link =
        safeUrl(e.link) ||
        "/engagements/?kind=" + encodeURIComponent(e.kind || "");
      var cover = e.cover_image
        ? "/" + String(e.cover_image).replace(/^\/+/, "")
        : null;
      var image = cover
        ? el("div", { class: "home-feature__image" }, [
            el("img", {
              src: cover,
              alt: e.title || "",
              loading: "lazy",
              decoding: "async",
            }),
          ])
        : el("div", { class: "home-feature__image" }, []);

      var when = (e.date_display || "").trim();
      var loc = (e.location || "").trim();
      var metaParts = [];
      if (e.org) metaParts.push(String(e.org).toUpperCase());
      if (when) metaParts.push(when);
      if (loc) metaParts.push(loc);

      var card = el(
        "a",
        {
          class: "home-feature",
          href: link,
          target: link.charAt(0) === "/" ? "_self" : "_blank",
          rel: link.charAt(0) === "/" ? null : "noopener noreferrer",
        },
        [
          image,
          el("div", { class: "home-feature__body" }, [
            el("h3", { class: "home-feature__title" }, [e.title || ""]),
            el("div", { class: "home-feature__meta" }, [
              metaParts.length ? metaParts.join(" · ") : null,
            ]),
          ]),
        ],
      );
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  // ── render: featured events of one kind (talks / workshops) ──
  // Pulls events where kind matches AND featured = true, renders
  // identical card shape as featured works.
  function renderFeaturedEvents(container, events, kind, emptyMsg, hrefBase) {
    container.innerHTML = "";
    var featured = events.filter(function (e) {
      return e.kind === kind && e.featured === true;
    });
    if (featured.length === 0) {
      container.appendChild(
        el("p", { class: "home-section__loading" }, [emptyMsg]),
      );
      return;
    }
    var list = el("div", { class: "home-featured__list" }, []);
    featured.forEach(function (e) {
      var link = safeUrl(e.link) || hrefBase;
      var when = (e.date_display || "").trim();
      var loc = (e.location || "").trim();
      var metaParts = [];
      if (e.org) metaParts.push(String(e.org).toUpperCase());
      if (when) metaParts.push(when);
      if (loc) metaParts.push(loc);

      var card = el(
        "a",
        {
          class: "home-feature",
          href: link,
          target: link.charAt(0) === "/" ? "_self" : "_blank",
          rel: link.charAt(0) === "/" ? null : "noopener noreferrer",
        },
        [
          el("div", { class: "home-feature__image" }, []),
          el("div", { class: "home-feature__body" }, [
            el("h3", { class: "home-feature__title" }, [e.title || ""]),
            el("div", { class: "home-feature__meta" }, [
              metaParts.length ? metaParts.join(" · ") : null,
            ]),
          ]),
        ],
      );
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  // ── render: featured works ───────────────────────────────
  // Post-merge: works rows have `kind` + `date_start` instead of the
  // legacy `section` + `year` fields. We derive both for display.
  function renderFeatured(container, works) {
    container.innerHTML = "";
    var featured = works.filter(function (w) {
      return w.featured === true;
    });
    if (featured.length === 0) {
      container.appendChild(
        el("p", { class: "home-section__loading" }, ["Nothing featured yet."]),
      );
      return;
    }

    var list = el("div", { class: "home-featured__list" }, []);
    featured.forEach(function (w) {
      var cover = w.cover_image
        ? "/" + w.cover_image.replace(/^\/+/, "")
        : null;
      var image = cover
        ? el("div", { class: "home-feature__image" }, [
            el("img", {
              src: cover,
              alt: w.title + (w.venue ? ", " + w.venue : ""),
              loading: "lazy",
              decoding: "async",
            }),
          ])
        : el("div", { class: "home-feature__image" }, []);

      var year =
        w.year || (w.date_start ? String(w.date_start).slice(0, 4) : "");
      var sectionSlug = w.section || sectionFromKind(w.kind);

      var metaParts = [];
      if (w.venue) metaParts.push(String(w.venue).toUpperCase());
      if (year) metaParts.push(year);

      var sectionPill = null;
      if (sectionSlug) {
        sectionPill = el(
          "span",
          {
            class: "section-pill section-pill--mini",
            "data-section": sectionDataKey(sectionSlug),
          },
          [
            el("span", { class: "section-pill__dot", "aria-hidden": "true" }),
            sectionLabel(sectionSlug),
          ],
        );
      }

      var card = el(
        "a",
        {
          class: "home-feature",
          href: "/works/" + w.slug + "/",
          "data-section": sectionDataKey(sectionSlug),
        },
        [
          image,
          el("div", { class: "home-feature__body" }, [
            el("h3", { class: "home-feature__title" }, [w.title]),
            el("div", { class: "home-feature__meta" }, [
              sectionPill,
              metaParts.length ? metaParts.join(" · ") : null,
            ]),
          ]),
        ],
      );
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  // ── section mapping (mirrors works-page.js) ──────────────
  var SECTIONS = {
    "machine-talk": { label: "machine talk", data: "machine" },
    "algorithmic-plays": { label: "algorithmic plays", data: "plays" },
    "somatic-semantics": { label: "somatic semantics", data: "semantics" },
    tools: { label: "tools", data: "tools" },
  };
  // kind (Supabase) -> section slug. Halim 2026-05-20: themes (these
  // 4 sections) and formats (kind) are orthogonal cuts; only the 4
  // anchored kinds get a section pill. exhibition / film /
  // workshop_piece flow into the year grid without one.
  var KIND_TO_SECTION = {
    performance: "algorithmic-plays",
    net_art: "somatic-semantics",
    installation: "machine-talk",
    tools: "tools",
  };
  function sectionFromKind(kind) {
    return KIND_TO_SECTION[kind] || null;
  }
  function sectionLabel(slug) {
    return SECTIONS[slug] ? SECTIONS[slug].label : slug;
  }
  function sectionDataKey(slug) {
    return SECTIONS[slug] ? SECTIONS[slug].data : "machine";
  }

  // ── hydrate a given scope (defaults to document) ─────────
  function hydrate(scope) {
    scope = scope || document;
    var eventsContainer = scope.querySelector("[data-home-events]");
    if (eventsContainer && eventsContainer.dataset.hydrated !== "true") {
      eventsContainer.dataset.hydrated = "true";
      fetchEvents()
        .then(function (rows) {
          renderEvents(eventsContainer, rows);
        })
        .catch(function (err) {
          console.error("[home] events failed:", err);
          eventsContainer.innerHTML =
            '<p class="home-section__loading">Could not load events.</p>';
        });
    }

    var featuredContainer = scope.querySelector("[data-home-featured]");
    if (featuredContainer && featuredContainer.dataset.hydrated !== "true") {
      featuredContainer.dataset.hydrated = "true";
      fetchWorks()
        .then(function (rows) {
          renderFeatured(featuredContainer, rows);
        })
        .catch(function (err) {
          console.error("[home] works failed:", err);
          featuredContainer.innerHTML =
            '<p class="home-section__loading">Could not load works.</p>';
        });
    }

    // Recent keynotes + workshops — single combined strip, ordered
    // by date desc, kind in ('talk','workshop') AND featured=true.
    // (Halim 2026-05-15: was two separate sections, merged into one.)
    var recentContainer = scope.querySelector("[data-home-recent]");
    if (recentContainer && recentContainer.dataset.hydrated !== "true") {
      recentContainer.dataset.hydrated = "true";
      fetchEvents()
        .then(function (rows) {
          renderRecentKeynotesWorkshops(recentContainer, rows);
        })
        .catch(function (err) {
          console.error("[home] recent failed:", err);
          recentContainer.innerHTML =
            '<p class="home-section__loading">Could not load.</p>';
        });
    }
  }

  // ── boot ─────────────────────────────────────────────────
  function boot() {
    // Hydrate the inline mount (if present) on page load.
    hydrate(document);

    // Hydrate the overlay when chrome.js loads the partial.
    document.addEventListener("home-overlay:loaded", function (e) {
      var body = e.detail && e.detail.body;
      hydrate(body || document);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

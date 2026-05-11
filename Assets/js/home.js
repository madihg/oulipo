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

  // ── events fetch (Supabase REST, public anon read) ───────
  function fetchEvents() {
    if (eventsCache) return Promise.resolve(eventsCache);
    var url =
      SUPABASE_URL + "/rest/v1/events?select=*&order=date.asc.nullslast";
    return fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: "Bearer " + SUPABASE_ANON_KEY,
        "accept-profile": "oulipo_dashboard",
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

  // ── works fetch (Supabase first, works.json fallback) ────
  function fetchWorks() {
    if (worksCache) return Promise.resolve(worksCache);
    var url =
      SUPABASE_URL + "/rest/v1/works?select=*&order=year.desc.nullslast";
    return fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: "Bearer " + SUPABASE_ANON_KEY,
        "accept-profile": "oulipo_dashboard",
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

  // ── render: next 3 events ────────────────────────────────
  function renderEvents(container, events) {
    container.innerHTML = "";
    // Filter to "upcoming-ish": date_end (if present) or date is in the
    // future, with a 7-day grace buffer.
    var now = Date.now();
    var grace = 7 * 24 * 60 * 60 * 1000;
    var upcoming = events
      .filter(function (e) {
        var d = e.date_end || e.date;
        if (!d) return true;
        var t = new Date(d).getTime();
        if (Number.isNaN(t)) return true;
        return t + grace >= now;
      })
      .slice(0, 3);

    if (upcoming.length === 0) {
      container.appendChild(
        el("p", { class: "home-section__loading" }, [
          "Nothing on the calendar at the moment.",
        ]),
      );
      return;
    }

    upcoming.forEach(function (e) {
      var link = safeUrl(e.link);
      var org = escapeHtml(e.org || "");
      var title = escapeHtml(e.title || "");
      var head = link
        ? "<b>" +
          org +
          " &rarr;</b> " +
          '<a href="' +
          escapeHtml(link) +
          '" target="_blank" rel="noopener noreferrer">' +
          title +
          "</a>"
        : "<b>" + org + " &rarr;</b> " + title;
      var loc = (e.location || "").trim();
      var when = (e.date_display || "").trim();
      var metaText = [loc, when].filter(Boolean).join(", ");
      var node = el("div", { class: "home-event" }, [
        el("div", { class: "home-event__head", html: head }),
        metaText ? el("span", { class: "home-event__meta" }, [metaText]) : null,
      ]);
      container.appendChild(node);
    });
  }

  // ── render: featured works ───────────────────────────────
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

      var metaParts = [];
      if (w.venue) metaParts.push(String(w.venue).toUpperCase());
      if (w.year) metaParts.push(String(w.year));

      var sectionPill = null;
      if (w.section) {
        sectionPill = el(
          "span",
          {
            class: "section-pill section-pill--mini",
            "data-section": sectionDataKey(w.section),
          },
          [
            el("span", { class: "section-pill__dot", "aria-hidden": "true" }),
            sectionLabel(w.section),
          ],
        );
      }

      var card = el(
        "a",
        {
          class: "home-feature",
          href: "/works/" + w.slug + "/",
          "data-section": sectionDataKey(w.section),
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

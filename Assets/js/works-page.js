/* ═══════════════════════════════════════════
   works-page.js
   Hydrates /works/ from Supabase (with works.json fallback) and
   renders year-grouped image+description cards. Wires the right
   filter rail (desktop) and the mobile chips strip.
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // ── config ────────────────────────────────────────────────
  // Supabase publishable (anon) key for oulipo_main, oulipo_dashboard schema.
  // Same value the existing /connect/ page uses; safe to ship in client code.
  var SUPABASE_URL = "https://smytgqkgomsfyurskpcl.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_m509hZmnUb8NZRG94irXqA_AViI-8qf";
  var FALLBACK_URL = "/Assets/data/works.json";

  var SECTIONS = [
    { key: "machine-talk", label: "machine talk", data: "machine" },
    { key: "algorithmic-plays", label: "algorithmic plays", data: "plays" },
    { key: "somatic-semantics", label: "somatic semantics", data: "semantics" },
    { key: "tools", label: "tools", data: "tools" },
  ];

  // ── small DOM helpers ─────────────────────────────────────
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "style") node.setAttribute("style", attrs[k]);
        else if (k === "dataset") {
          for (var d in attrs[k]) node.dataset[d] = attrs[k][d];
        } else if (k.startsWith("aria-") || k.startsWith("data-")) {
          node.setAttribute(k, attrs[k]);
        } else if (k === "html") {
          node.innerHTML = attrs[k];
        } else {
          node[k] = attrs[k];
        }
      }
    }
    (kids || []).forEach(function (k) {
      if (k == null) return;
      if (typeof k === "string") node.appendChild(document.createTextNode(k));
      else node.appendChild(k);
    });
    return node;
  }
  function escape(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ── data loaders ──────────────────────────────────────────
  function fetchFromSupabase() {
    var url =
      SUPABASE_URL +
      "/rest/v1/works?select=*&order=year.desc.nullslast,sort_order.asc.nullslast";
    return fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: "Bearer " + SUPABASE_ANON_KEY,
        "accept-profile": "oulipo_dashboard",
        accept: "application/json",
      },
    }).then(function (r) {
      if (!r.ok) throw new Error("supabase " + r.status);
      return r.json();
    });
  }

  function fetchFromFallback() {
    return fetch(FALLBACK_URL, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("fallback " + r.status);
        return r.json();
      })
      .then(function (j) {
        return Array.isArray(j) ? j : j.works || [];
      });
  }

  function loadWorks() {
    return fetchFromSupabase()
      .then(function (rows) {
        if (!rows || rows.length === 0) throw new Error("supabase empty");
        return { source: "supabase", works: rows };
      })
      .catch(function (err) {
        console.warn("[works] supabase fetch failed, using fallback:", err);
        return fetchFromFallback().then(function (works) {
          return { source: "fallback", works: works };
        });
      });
  }

  // ── filter state ─────────────────────────────────────────
  // "featured" is a pseudo-section that filters w.featured === true.
  function readSectionFromURL() {
    var p = new URLSearchParams(window.location.search);
    var s = (p.get("section") || "").toLowerCase();
    if (s === "featured") return "featured";
    return SECTIONS.some(function (sec) {
      return sec.key === s;
    })
      ? s
      : null;
  }
  function writeSectionToURL(section) {
    var url = new URL(window.location.href);
    if (section) url.searchParams.set("section", section);
    else url.searchParams.delete("section");
    history.replaceState({}, "", url.toString());
  }

  // ── rendering ─────────────────────────────────────────────
  function sectionDataKey(slug) {
    var found = SECTIONS.find(function (s) {
      return s.key === slug;
    });
    return found ? found.data : null;
  }
  function sectionLabel(slug) {
    var found = SECTIONS.find(function (s) {
      return s.key === slug;
    });
    return found ? found.label : slug;
  }

  function renderCard(work) {
    var dataKey = sectionDataKey(work.section);
    var venue = work.venue ? String(work.venue).toUpperCase() : "";
    var loc = work.location || "";
    var year = work.year || "";
    var meta = [year, loc].filter(Boolean).join("§sep§");
    var coverPath = work.cover_image
      ? work.cover_image.replace(/^\/?Assets\//, "/Assets/")
      : null;
    var altText = work.title + (work.venue ? ", " + work.venue : "");
    var image = coverPath
      ? el("div", { class: "work-card__image" }, [
          el("img", {
            src: coverPath,
            alt: altText,
            loading: "lazy",
            decoding: "async",
          }),
        ])
      : el("div", { class: "work-card__image is-empty" }, ["no cover yet"]);
    // Venue row: [● section-pill] + venue text in mono gray.
    // The pill is the only spot of color on the card — the rest of
    // the card stays neutral (Halim 2026-05-05 walkthrough).
    var pill = null;
    if (dataKey) {
      pill = el(
        "a",
        {
          class: "section-pill section-pill--mini",
          "data-section": dataKey,
          href: "/works/?section=" + work.section,
          // stop the wrapping anchor from stealing the click
          onclick: function (e) {
            e.stopPropagation();
          },
        },
        [
          el("span", { class: "section-pill__dot", "aria-hidden": "true" }),
          sectionLabel(work.section),
        ],
      );
    }
    var venueEl =
      pill || venue
        ? el(
            "div",
            { class: "work-card__venue" },
            [pill, venue ? el("span", {}, [venue]) : null].filter(Boolean),
          )
        : null;
    var descEl = work.short_description
      ? el("p", { class: "work-card__desc" }, [work.short_description])
      : null;
    var metaParts = [];
    if (year) metaParts.push(String(year));
    if (loc) {
      if (metaParts.length) {
        metaParts.push(el("span", { class: "sep" }, ["·"]));
      }
      metaParts.push(loc);
    }
    var metaEl = metaParts.length
      ? el("div", { class: "work-card__meta" }, metaParts)
      : null;
    var docLabel = work.doc_count
      ? work.doc_count + " doc" + (work.doc_count === 1 ? "" : "s")
      : sectionLabel(work.section);
    var footer = el("div", { class: "work-card__footer" }, [
      docLabel,
      el("span", { class: "work-card__dot", "aria-hidden": "true" }),
    ]);

    var textCol = el("div", {}, [
      venueEl,
      el("h2", { class: "work-card__title" }, [work.title]),
      metaEl,
      descEl,
      footer,
    ]);

    var card = el(
      "a",
      {
        class: "work-card",
        href: "/works/" + work.slug + "/",
        "data-section": dataKey || "machine",
      },
      [el("div", { class: "work-card__split" }, [textCol, image])],
    );
    return card;
  }

  function renderList(container, works, activeSection) {
    container.innerHTML = "";
    var filtered;
    if (activeSection === "featured") {
      filtered = works.filter(function (w) {
        return w.featured === true;
      });
    } else if (activeSection) {
      filtered = works.filter(function (w) {
        return w.section === activeSection;
      });
    } else {
      filtered = works;
    }

    if (filtered.length === 0) {
      container.appendChild(
        el("div", { class: "works-state", "data-works-status": true }, [
          activeSection === "featured"
            ? "nothing featured yet."
            : activeSection
              ? "no works in this section yet."
              : "no works to show.",
        ]),
      );
      return;
    }

    // Group by year (descending)
    var byYear = {};
    filtered.forEach(function (w) {
      var y = w.year || "—";
      (byYear[y] = byYear[y] || []).push(w);
    });
    var years = Object.keys(byYear).sort(function (a, b) {
      if (a === "—") return 1;
      if (b === "—") return -1;
      return Number(b) - Number(a);
    });

    years.forEach(function (y) {
      var group = byYear[y];
      // Section color for the year heading: if all works in this group share a
      // section, use that color; otherwise mark it as mixed (ink fallback).
      var sections = Array.from(
        new Set(
          group.map(function (w) {
            return w.section;
          }),
        ),
      );
      var heading = el(
        "div",
        {
          class: "works-year",
          "data-mixed": sections.length > 1 ? "true" : "false",
        },
        [String(y)],
      );
      if (sections.length === 1) {
        heading.dataset.section = sectionDataKey(sections[0]) || "";
      }
      container.appendChild(heading);
      group.forEach(function (w) {
        container.appendChild(renderCard(w));
      });
    });
  }

  // ── filter UI (rail + chips) ─────────────────────────────
  function renderFilterRail(rail, chips, works, activeSection, onSelect) {
    function render(target, isMobile) {
      if (!target) return;
      target.innerHTML = "";
      var counts = {};
      works.forEach(function (w) {
        counts[w.section] = (counts[w.section] || 0) + 1;
      });

      // "All" option
      var allBtn = el(
        "button",
        {
          type: "button",
          class: isMobile ? "works-chip" : "works-filter-btn",
          "aria-pressed": activeSection ? "false" : "true",
          "data-section": "all",
        },
        isMobile
          ? [
              el("span", { class: "swatch", style: "background: var(--ink);" }),
              "all",
              el("span", { class: "tally" }, [" · " + works.length]),
            ]
          : [
              el("span", { class: "check" }),
              el("span", {}, ["all"]),
              el(
                "span",
                {
                  class: "tally",
                  style: "margin-left:auto;color:var(--ink-50)",
                },
                [String(works.length)],
              ),
            ],
      );
      allBtn.style.setProperty("--section-color", "var(--ink)");
      allBtn.addEventListener("click", function () {
        onSelect(null);
      });
      target.appendChild(allBtn);

      // "Featured" pseudo-section — sits between "all" and the section list.
      // ★ glyph instead of a section-color swatch (no section color since it
      // spans multiple sections).
      var featuredCount = works.filter(function (w) {
        return w.featured === true;
      }).length;
      var featuredBtn = el(
        "button",
        {
          type: "button",
          class: isMobile ? "works-chip" : "works-filter-btn",
          "aria-pressed": activeSection === "featured" ? "true" : "false",
          "data-section": "featured",
        },
        isMobile
          ? [
              el("span", { class: "star", "aria-hidden": "true" }, ["★"]),
              "featured",
              el("span", { class: "tally" }, [" · " + featuredCount]),
            ]
          : [
              el("span", { class: "check" }),
              el("span", { class: "star", "aria-hidden": "true" }, ["★"]),
              el("span", {}, ["featured"]),
              el(
                "span",
                {
                  class: "tally",
                  style: "margin-left:auto;color:var(--ink-50)",
                },
                [String(featuredCount)],
              ),
            ],
      );
      featuredBtn.style.setProperty("--section-color", "var(--ink)");
      featuredBtn.addEventListener("click", function () {
        onSelect("featured");
      });
      target.appendChild(featuredBtn);

      // Section options
      if (!isMobile) {
        target.appendChild(
          el(
            "div",
            {
              class: "works-filter-rail__title",
              style: "margin-top:0.8rem;",
            },
            ["section"],
          ),
        );
      }

      SECTIONS.forEach(function (s) {
        var n = counts[s.key] || 0;
        var btn = el(
          "button",
          {
            type: "button",
            class: isMobile ? "works-chip" : "works-filter-btn",
            "aria-pressed": activeSection === s.key ? "true" : "false",
            "data-section": s.data,
          },
          isMobile
            ? [
                el("span", { class: "swatch" }),
                s.label,
                el("span", { class: "tally" }, [" · " + n]),
              ]
            : [
                el("span", { class: "check" }),
                el("span", { class: "swatch" }),
                el("span", {}, [s.label]),
                el(
                  "span",
                  {
                    class: "tally",
                    style: "margin-left:auto;color:var(--ink-50)",
                  },
                  [String(n)],
                ),
              ],
        );
        btn.dataset.section = s.data;
        btn.addEventListener("click", function () {
          onSelect(s.key);
        });
        target.appendChild(btn);
      });
    }

    if (rail) {
      rail.appendChild(
        el("div", { class: "works-filter-rail__title" }, ["filter"]),
      );
      var inner = el("div", { class: "works-filter-rail__inner" }, []);
      rail.appendChild(inner);
      render(inner, false);
    }
    if (chips) render(chips, true);
  }

  // ── boot ─────────────────────────────────────────────────
  function boot() {
    var listEl = $("[data-works-list]");
    var rail = $("[data-works-filter-rail]");
    var chips = $("[data-works-filter-mobile]");
    if (!listEl) return;

    var state = {
      works: [],
      section: readSectionFromURL(),
    };

    function applyState() {
      renderList(listEl, state.works, state.section);
      // Refresh filter UI to update aria-pressed
      if (rail) rail.innerHTML = "";
      if (chips) chips.innerHTML = "";
      renderFilterRail(rail, chips, state.works, state.section, onSelect);
    }

    function onSelect(section) {
      state.section = section;
      writeSectionToURL(section);
      applyState();
    }

    loadWorks()
      .then(function (res) {
        state.works = res.works.slice().sort(function (a, b) {
          var ya = a.year || 0,
            yb = b.year || 0;
          if (ya !== yb) return yb - ya;
          var sa = a.sort_order == null ? 9999 : a.sort_order;
          var sb = b.sort_order == null ? 9999 : b.sort_order;
          return sa - sb;
        });
        applyState();
        // Listen to back/forward for ?section=
        window.addEventListener("popstate", function () {
          state.section = readSectionFromURL();
          applyState();
        });
      })
      .catch(function (err) {
        console.error("[works] failed to load works:", err);
        listEl.innerHTML = "";
        listEl.appendChild(
          el("div", { class: "works-state", "data-works-status": true }, [
            "Could not load works. Refresh to retry.",
          ]),
        );
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

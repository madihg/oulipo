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

  // ── series (Halim 2026-05-22) ─────────────────────────────
  // A series is a curatorial bundle of multiple pieces. The new "View"
  // toggle in the filter rail flips /works/ between flat Pieces mode
  // and grouped Series mode. The `series` text column in
  // oulipo_dashboard.works points each piece at one series slug.
  var SERIES = [
    {
      key: "singulars",
      label: "Singulars.exe",
      tagline: "fine-tuned poetic models trained on me, performed against me.",
      data: "machine",
    },
    {
      key: "new-beirut",
      label: "New Beirut",
      tagline:
        "borders, migration, the play of becoming, and the play of arriving.",
      data: "plays",
    },
    {
      key: "oulipo-xyz",
      label: "oulipo.xyz",
      tagline: "net art pieces that live in the browser.",
      data: "semantics",
    },
  ];
  function seriesFor(key) {
    return SERIES.find(function (s) {
      return s.key === key;
    });
  }

  // Kinds shown on /works/. Post-events-merge (2026-05-20), works rows
  // can be any of these portfolio kinds. exhibition + film + workshop_piece
  // appear in the year grid without a section pill — Halim 2026-05-20:
  // "no need for this filtering for now, let's just clean things up …
  // it's a different way to cut the works than semantic somatics, machine
  // talk etc. (which are themes)". See memory:
  // feedback_works_themes_vs_formats.md.
  var WORK_KINDS = [
    "performance",
    "installation",
    "net_art",
    "workshop_piece",
    "film",
    "tools",
    "exhibition",
  ];

  // Map a row's kind to a theme-section slug. Returns null for kinds
  // that don't have a theme anchor (exhibition / film / workshop_piece).
  var KIND_TO_SECTION = {
    performance: "algorithmic-plays",
    net_art: "somatic-semantics",
    installation: "machine-talk",
    tools: "tools",
  };
  function sectionOf(work) {
    return work.section || KIND_TO_SECTION[work.kind] || null;
  }
  function yearOf(work) {
    if (work.year) return work.year;
    if (work.date_start) return String(work.date_start).slice(0, 4);
    return null;
  }

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
  // We also exclude rows tagged 'cv-only' so events that should live
  // only on /cv/ (e.g. Dan's musical-instrument demo) don't surface
  // here even when their kind is portfolio-shaped.
  function fetchFromSupabase() {
    var url =
      SUPABASE_URL +
      "/rest/v1/works?select=*&kind=in.(" +
      WORK_KINDS.join(",") +
      ")&tags=not.cs.{cv-only}" +
      "&order=date_start.desc.nullslast,sort_order.asc.nullslast";
    return fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: "Bearer " + SUPABASE_ANON_KEY,
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

  // View = "pieces" (default flat year grid) or "series" (3 series cards
  // each opening to its bundle). Halim 2026-05-22.
  function readViewFromURL() {
    var p = new URLSearchParams(window.location.search);
    return p.get("view") === "series" ? "series" : "pieces";
  }
  function writeViewToURL(view) {
    var url = new URL(window.location.href);
    if (view && view !== "pieces") url.searchParams.set("view", view);
    else url.searchParams.delete("view");
    history.replaceState({}, "", url.toString());
  }
  // Deep-link to a specific series, e.g. /works/?view=series&series=singulars
  function readSeriesFromURL() {
    var p = new URLSearchParams(window.location.search);
    var s = (p.get("series") || "").toLowerCase();
    return SERIES.some(function (x) {
      return x.key === s;
    })
      ? s
      : null;
  }
  function writeSeriesToURL(series) {
    var url = new URL(window.location.href);
    if (series) url.searchParams.set("series", series);
    else url.searchParams.delete("series");
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
    var sectionSlug = sectionOf(work);
    var dataKey = sectionDataKey(sectionSlug);
    var venue = work.venue ? String(work.venue).toUpperCase() : "";
    var loc = work.location || "";
    var year = yearOf(work) || "";
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
          href: "/works/?section=" + sectionSlug,
          // stop the wrapping anchor from stealing the click
          onclick: function (e) {
            e.stopPropagation();
          },
        },
        [
          el("span", { class: "section-pill__dot", "aria-hidden": "true" }),
          sectionLabel(sectionSlug),
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
      : sectionSlug
        ? sectionLabel(sectionSlug)
        : "—";
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
        return sectionOf(w) === activeSection;
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
      var y = yearOf(w) || "—";
      (byYear[y] = byYear[y] || []).push(w);
    });
    var years = Object.keys(byYear).sort(function (a, b) {
      if (a === "—") return 1;
      if (b === "—") return -1;
      return Number(b) - Number(a);
    });

    years.forEach(function (y) {
      var group = byYear[y];
      // Section color for the year heading: if all works in this group share
      // a section, use that color; otherwise mark it as mixed (ink fallback).
      var sections = Array.from(
        new Set(
          group.map(function (w) {
            return sectionOf(w);
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
      if (sections.length === 1 && sections[0]) {
        heading.dataset.section = sectionDataKey(sections[0]) || "";
      }
      container.appendChild(heading);
      group.forEach(function (w) {
        container.appendChild(renderCard(w));
      });
    });
  }

  // ── series view ────────────────────────────────────────────
  // Replaces the year grid with one large card per series. Clicking a
  // card expands it inline to show that series' pieces (date desc).
  // Hero image: use the most-recent piece's cover_image, or fall back
  // to a section-color gradient.
  function renderSeriesView(container, works, activeSeries) {
    container.innerHTML = "";
    // Group pieces by series
    var bySeries = {};
    works.forEach(function (w) {
      if (!w.series) return;
      (bySeries[w.series] = bySeries[w.series] || []).push(w);
    });

    SERIES.forEach(function (s) {
      var pieces = (bySeries[s.key] || []).slice().sort(function (a, b) {
        return (b.date_start || "").localeCompare(a.date_start || "");
      });
      var heroPiece = pieces.find(function (p) {
        return p.cover_image;
      });
      var heroImg =
        heroPiece && heroPiece.cover_image
          ? "/" + String(heroPiece.cover_image).replace(/^\/+/, "")
          : null;

      var isOpen = activeSeries === s.key;
      var seriesEl = el(
        "section",
        {
          class: "work-series" + (isOpen ? " work-series--open" : ""),
          "data-section": s.data,
          "data-series": s.key,
        },
        [],
      );

      // Banner card — clicking toggles expansion
      var banner = el(
        "button",
        {
          type: "button",
          class: "work-series__banner",
          "aria-expanded": isOpen ? "true" : "false",
        },
        [
          el(
            "div",
            { class: "work-series__image" },
            heroImg
              ? [
                  el("img", {
                    src: heroImg,
                    alt: "",
                    loading: "lazy",
                    decoding: "async",
                  }),
                ]
              : [],
          ),
          el("div", { class: "work-series__body" }, [
            el("p", { class: "work-series__eyebrow" }, [
              "Series · " + pieces.length + " pieces",
            ]),
            el("h2", { class: "work-series__title" }, [s.label]),
            el("p", { class: "work-series__tagline" }, [s.tagline]),
          ]),
        ],
      );
      banner.addEventListener("click", function () {
        var nowOpen = !seriesEl.classList.contains("work-series--open");
        seriesEl.classList.toggle("work-series--open", nowOpen);
        banner.setAttribute("aria-expanded", nowOpen ? "true" : "false");
        writeSeriesToURL(nowOpen ? s.key : null);
      });
      seriesEl.appendChild(banner);

      // Pieces — sub-card list visible when open
      var inner = el("div", { class: "work-series__inner" }, []);
      pieces.forEach(function (p) {
        inner.appendChild(renderCard(p));
      });
      seriesEl.appendChild(inner);

      container.appendChild(seriesEl);
    });
  }

  // ── filter UI (rail + chips) ─────────────────────────────
  function renderFilterRail(
    rail,
    chips,
    works,
    activeSection,
    activeView,
    onSelect,
    onView,
  ) {
    function render(target, isMobile) {
      if (!target) return;
      target.innerHTML = "";
      var counts = {};
      works.forEach(function (w) {
        var s = sectionOf(w);
        if (s) counts[s] = (counts[s] || 0) + 1;
      });
      var seriesCount = SERIES.length;
      var pieceCount = works.length;

      // ── View group (Pieces / Series) — sits ABOVE Section ──
      if (!isMobile) {
        target.appendChild(
          el("div", { class: "works-filter-rail__title" }, ["view"]),
        );
      }
      ["pieces", "series"].forEach(function (v) {
        var label = v === "pieces" ? "pieces" : "series";
        var n = v === "pieces" ? pieceCount : seriesCount;
        var btn = el(
          "button",
          {
            type: "button",
            class: isMobile ? "works-chip" : "works-filter-btn",
            "aria-pressed": activeView === v ? "true" : "false",
            "data-view": v,
          },
          isMobile
            ? [label, el("span", { class: "tally" }, [" · " + n])]
            : [
                el("span", { class: "check" }),
                el("span", {}, [label]),
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
        btn.style.setProperty("--section-color", "var(--ink)");
        btn.addEventListener("click", function () {
          onView(v);
        });
        target.appendChild(btn);
      });

      if (!isMobile) {
        target.appendChild(
          el("hr", {
            class: "works-filter-rail__divider",
            style:
              "border:0;border-top:1px solid var(--ink-15);margin:0.8rem 0;",
          }),
        );
        target.appendChild(
          el("div", { class: "works-filter-rail__title" }, ["section"]),
        );
      }

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
      // No glyph or section swatch — just the word "featured" so it reads
      // as the same family as the other filter options.
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
              "featured",
              el("span", { class: "tally" }, [" · " + featuredCount]),
            ]
          : [
              el("span", { class: "check" }),
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

      // (Section header already rendered above the All/Featured group
      // in the View+Section split. No second header needed here.)

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
      view: readViewFromURL(), // "pieces" | "series"
      series: readSeriesFromURL(), // active expanded series in series view
    };

    function applyState() {
      if (state.view === "series") {
        renderSeriesView(listEl, state.works, state.series);
      } else {
        renderList(listEl, state.works, state.section);
      }
      if (rail) rail.innerHTML = "";
      if (chips) chips.innerHTML = "";
      renderFilterRail(
        rail,
        chips,
        state.works,
        state.section,
        state.view,
        onSelect,
        onView,
      );
    }

    function onSelect(section) {
      state.section = section;
      writeSectionToURL(section);
      // Selecting a theme section in Pieces view is straightforward.
      // If the user is in Series view and clicks a section, flip back
      // to Pieces and apply the filter — themes don't bundle, pieces do.
      if (state.view === "series") {
        state.view = "pieces";
        writeViewToURL("pieces");
      }
      applyState();
    }
    function onView(view) {
      state.view = view;
      writeViewToURL(view);
      // Switching views resets the section filter to keep state simple.
      state.section = null;
      writeSectionToURL(null);
      applyState();
    }

    loadWorks()
      .then(function (res) {
        state.works = res.works.slice().sort(function (a, b) {
          var ya = Number(yearOf(a)) || 0,
            yb = Number(yearOf(b)) || 0;
          if (ya !== yb) return yb - ya;
          var sa = a.sort_order == null ? 9999 : a.sort_order;
          var sb = b.sort_order == null ? 9999 : b.sort_order;
          return sa - sb;
        });
        applyState();
        // Listen to back/forward for ?section= / ?view= / ?series=
        window.addEventListener("popstate", function () {
          state.section = readSectionFromURL();
          state.view = readViewFromURL();
          state.series = readSeriesFromURL();
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

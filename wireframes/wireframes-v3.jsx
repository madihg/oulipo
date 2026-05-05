// ============================================================
//  WIREFRAMES V3 — locked direction, rev. 3 (2026-05-02)
//  See: docs/prd-v2.md (will be re-synced once v3 settles)
//
//  Big changes from v2:
//   - Landing IS the works page (one combined page, not two)
//   - About block: "halim madi" h1 + 4-line intro always visible.
//     A [+] / [x] button to the LEFT toggles a compact pill list
//     of the 4 categories with their descriptions inline.
//     (Was a 2x2 card grid in v2.)
//   - Bottom-right corner: only HUMAN[h] / MACHINE[m] toggle.
//     `/` + ⌘K hint appears only in MACHINE mode.
//   - Upper-right corner: only CONNECT[c].
//   - Removed instagram[i] and newsletter[n] from corners.
//   - Speaking page rebuilt with editorial-magazine direction
//     ("I TALK." / "I TEACH." giant statements, asymmetric grid,
//     pull quotes, format cards, large past-event imagery).
//   - Connect page rebuilt to mirror current /connect on
//     oulipo.xyz: featured "vote/now" card, 6 connect-link
//     buttons, Latest items, Upcoming events, plus the v2
//     door-selector + form retained at the bottom.
// ============================================================

const SECTIONS = [
  {
    key: "machine",
    label: "machine talk",
    slug: "machine-talk",
    long: "turning humans into machines",
    pill: "i fine-tune poetry models, build small endangered llms, and write poems that train themselves on the people who read them.",
    color: "#F6009B",
  },
  {
    key: "theater",
    label: "computer theater",
    slug: "computer-theater",
    long: "computer theater",
    pill: "live, algorithmic, sometimes-improvised digital theater. avatars i puppet. agents that improvise. audiences that vote and the model retrains on the votes.",
    color: "#2AA4DD",
  },
  {
    key: "semantics",
    label: "somatic semantics",
    slug: "somatic-semantics",
    long: "somatic semantics",
    pill: "net art for the body. cursors that breathe. pages that listen. words that miss you when you scroll past too fast.",
    color: "#8B5CF6",
  },
  {
    key: "tools",
    label: "tools",
    slug: "tools",
    long: "tools for other artists",
    pill: "small software for writers, performers, organizers. word garden, prompt-rivals, scripts i wrote once and now use weekly.",
    color: "#02F700",
  },
];

const WORKS = [
  {
    title: "Hard.exe",
    venue: "TIAT",
    loc: "San Francisco",
    year: 2026,
    docs: 19,
    sec: 0,
  },
  {
    title: "Carnation Revival",
    venue: "PALAZZO DIEDO",
    loc: "Venice",
    year: 2026,
    docs: 12,
    sec: 0,
  },
  {
    title: "Vatican Pavilion",
    venue: "VENICE BIENNALE",
    loc: "Venice",
    year: 2026,
    docs: 10,
    sec: 1,
  },
  {
    title: "City of Nets",
    venue: "CULTUREHUB",
    loc: "Los Angeles",
    year: 2025,
    docs: 14,
    sec: 1,
  },
  {
    title: "Anti-Gravity",
    venue: "GRAY AREA",
    loc: "San Francisco",
    year: 2025,
    docs: 8,
    sec: 2,
  },
  {
    title: "Word Garden",
    venue: "OPEN SOURCE",
    loc: "github",
    year: 2025,
    docs: 6,
    sec: 3,
  },
  {
    title: "Reverse.exe",
    venue: "COUNTERPULSE",
    loc: "San Francisco",
    year: 2024,
    docs: 11,
    sec: 0,
  },
  {
    title: "Agent vs Agent",
    venue: "MOZILLA A-I-R",
    loc: "San Francisco",
    year: 2024,
    docs: 9,
    sec: 1,
  },
];

// ─── helpers ───────────────────────────────────────────────
const ink = (dark) => (dark ? "#fafaf7" : "#1a1a1a");
const paper = (dark) => (dark ? "#0a0a0a" : "#fafaf7");

// ─── shared bits ───────────────────────────────────────────────
function SectionDot({ color, size = 8 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        marginRight: 6,
        verticalAlign: 1,
      }}
    />
  );
}

// HHMD-style persistent top signup bar
function TopSignupBar({ dark }) {
  const i = ink(dark);
  return (
    <div
      style={{
        borderBottom: `1.5px solid ${i}`,
        padding: "7px 12px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: "0.04em",
        flexShrink: 0,
      }}
    >
      <div style={{ color: i, fontWeight: 700, textTransform: "uppercase" }}>
        halim madi
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ color: i, opacity: 0.45, textTransform: "uppercase" }}>
          email
        </span>
        <div
          style={{
            flex: 1,
            borderBottom: `1px solid ${i}`,
            opacity: 0.45,
            height: 12,
          }}
        />
        <span
          style={{
            color: i,
            opacity: 0.85,
            textDecoration: "underline",
            textTransform: "lowercase",
          }}
        >
          subscribe
        </span>
      </div>
    </div>
  );
}

// Top-right CONNECT shortcut
function TopRightCorner({ dark }) {
  const i = ink(dark);
  return (
    <div
      style={{
        position: "absolute",
        right: 10,
        top: 36,
        display: "flex",
        gap: 4,
        pointerEvents: "none",
        fontFamily: "var(--mono)",
        fontSize: 9,
        letterSpacing: "0.05em",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          border: `1px solid ${i}`,
          padding: "2px 6px",
          textTransform: "uppercase",
          color: i,
        }}
      >
        connect
        <span
          style={{
            background: i,
            color: paper(dark),
            padding: "0 4px",
            fontWeight: 700,
          }}
        >
          c
        </span>
      </span>
    </div>
  );
}

// Bottom-right HUMAN/MACHINE only.  / + ⌘K shows in MACHINE mode only.
function BottomRightCorner({ mode = "HUMAN", dark }) {
  const i = ink(dark);
  const isMachine = mode === "MACHINE";
  return (
    <div
      style={{
        position: "absolute",
        right: 10,
        bottom: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
        pointerEvents: "none",
      }}
    >
      {isMachine && (
        <div style={{ display: "flex", gap: 4 }}>
          <span
            style={{
              border: `1px solid ${i}`,
              padding: "2px 6px",
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: i,
              letterSpacing: "0.04em",
            }}
          >
            /
          </span>
          <span
            style={{
              border: `1px solid ${i}`,
              padding: "2px 6px",
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: i,
              letterSpacing: "0.04em",
            }}
          >
            ⌘K
          </span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--mono)",
          fontSize: 9,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            border: `1px solid ${i}`,
            padding: "2px 6px",
            background: !isMachine ? i : "transparent",
            color: !isMachine ? paper(dark) : i,
            fontWeight: !isMachine ? 700 : 400,
          }}
        >
          human
          <span
            style={{
              background: !isMachine ? paper(dark) : i,
              color: !isMachine ? i : paper(dark),
              padding: "0 4px",
              fontWeight: 700,
            }}
          >
            h
          </span>
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            border: `1px solid ${i}`,
            padding: "2px 6px",
            background: isMachine ? i : "transparent",
            color: isMachine ? paper(dark) : i,
            fontWeight: isMachine ? 700 : 400,
          }}
        >
          machine
          <span
            style={{
              background: isMachine ? paper(dark) : i,
              color: isMachine ? i : paper(dark),
              padding: "0 4px",
              fontWeight: 700,
            }}
          >
            m
          </span>
        </span>
      </div>
    </div>
  );
}

// ============================================================
//  HalimCard — name + intro + collapsible category pills
//  + button (or x when expanded) on the LEFT of "halim madi"
// ============================================================
function HalimCard({ expanded = false, mobile, dark }) {
  const i = ink(dark);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* +/x toggle */}
        <button
          style={{
            flexShrink: 0,
            width: mobile ? 28 : 32,
            height: mobile ? 28 : 32,
            border: `1.5px solid ${i}`,
            background: "transparent",
            color: i,
            fontFamily: "var(--mono)",
            fontSize: mobile ? 18 : 22,
            fontWeight: 400,
            lineHeight: 1,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: mobile ? 6 : 10,
          }}
          aria-label={expanded ? "collapse intro" : "expand intro"}
        >
          {expanded ? "×" : "+"}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "serif",
              fontWeight: 400,
              color: i,
              fontSize: mobile ? 36 : 56,
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
            }}
          >
            halim madi
          </div>
          <div
            style={{
              fontFamily: "var(--sans)",
              color: i,
              opacity: 0.8,
              marginTop: 6,
              maxWidth: "52ch",
              fontSize: mobile ? 13 : 14,
              lineHeight: 1.3,
            }}
          >
            poet, performer, software-leaning. i build poems, performances, and
            small systems that rewire how we relate — to machines, to each
            other, to the past.
          </div>
        </div>
      </div>

      {/* expanded pills */}
      {expanded && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {SECTIONS.map((s) => (
            <div
              key={s.key}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                borderLeft: `4px solid ${s.color}`,
                padding: "6px 10px",
                background: "transparent",
              }}
            >
              <div style={{ flexShrink: 0, minWidth: mobile ? 100 : 150 }}>
                <div
                  style={{
                    fontFamily: "var(--sans)",
                    fontWeight: 700,
                    color: i,
                    fontSize: mobile ? 13 : 14,
                    textTransform: "lowercase",
                  }}
                >
                  {s.label}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--sans)",
                  color: i,
                  opacity: 0.78,
                  fontSize: mobile ? 12 : 13,
                  lineHeight: 1.35,
                }}
              >
                {s.pill}{" "}
                <span
                  style={{
                    whiteSpace: "nowrap",
                    color: s.color,
                    fontWeight: 700,
                    marginLeft: 4,
                  }}
                >
                  see all →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
//  WorksBrowser — works list + right filter rail
// ============================================================
function WorkRow({ w, mobile, dark }) {
  const i = ink(dark);
  const sec = SECTIONS[w.sec];
  return (
    <div
      style={{
        border: `1px solid ${i}`,
        padding: mobile ? 10 : 12,
        background: paper(dark),
        color: i,
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "1fr 120px 80px 60px 30px",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "serif",
            fontWeight: 400,
            fontSize: mobile ? 18 : 20,
            lineHeight: 1.05,
          }}
        >
          {w.title}
        </div>
        {mobile && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 4,
              fontFamily: "var(--mono)",
              fontSize: 9,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: sec.color, fontWeight: 700 }}>{w.venue}</span>
            <span style={{ opacity: 0.55 }}>{w.loc}</span>
            <span style={{ opacity: 0.55 }}>{w.year}</span>
            <span style={{ opacity: 0.55, marginLeft: "auto" }}>
              {w.docs} docs
            </span>
          </div>
        )}
      </div>
      {!mobile && (
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: sec.color,
            fontWeight: 700,
          }}
        >
          {w.venue}
        </div>
      )}
      {!mobile && (
        <div className="tiny" style={{ opacity: 0.65 }}>
          {w.loc}
        </div>
      )}
      {!mobile && (
        <div className="tiny" style={{ opacity: 0.65 }}>
          {w.year}
        </div>
      )}
      {!mobile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            justifyContent: "flex-end",
          }}
        >
          <span className="tiny" style={{ opacity: 0.55 }}>
            {w.docs}
          </span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: sec.color,
            }}
            title={sec.label}
          />
        </div>
      )}
    </div>
  );
}

function FilterRail({ active = "all", dark }) {
  const i = ink(dark);
  return (
    <div
      style={{
        borderLeft: `1px solid ${i}`,
        paddingLeft: 12,
        position: "sticky",
        top: 0,
        height: "fit-content",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        className="meta"
        style={{ color: i, opacity: 0.55, marginBottom: 6 }}
      >
        filter
      </div>
      <button
        style={{
          all: "unset",
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          padding: "3px 0",
          fontFamily: "var(--sans)",
          fontSize: 12,
          color: i,
          fontWeight: active === "all" ? 700 : 400,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            border: `1px solid ${i}`,
            background: active === "all" ? i : "transparent",
          }}
        />
        all
      </button>
      {SECTIONS.map((s) => (
        <button
          key={s.key}
          style={{
            all: "unset",
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            padding: "3px 0",
            fontFamily: "var(--sans)",
            fontSize: 12,
            color: i,
            fontWeight: active === s.key ? 700 : 400,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              border: `1px solid ${i}`,
              background: active === s.key ? i : "transparent",
            }}
          />
          <SectionDot color={s.color} size={6} />
          {s.label}
        </button>
      ))}
    </div>
  );
}

function WorksBrowser({ mobile, dark }) {
  const i = ink(dark);
  const byYear = WORKS.reduce((acc, w) => {
    (acc[w.year] = acc[w.year] || []).push(w);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => b - a);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "1fr 140px",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {years.map((y) => (
          <div key={y}>
            <div
              className="meta"
              style={{ color: i, opacity: 0.5, marginBottom: 6 }}
            >
              {y}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {byYear[y].map((w, k) => (
                <WorkRow key={k} w={w} mobile={mobile} dark={dark} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {!mobile && <FilterRail active="all" dark={dark} />}
    </div>
  );
}

// ============================================================
//  LANDING V3 (= works page) — one unified page
// ============================================================
function LandingV3({ mobile, dark, expanded = false }) {
  const i = ink(dark);
  return (
    <div
      className={"wf " + (mobile ? "wf-mobile " : "")}
      style={{
        background: paper(dark),
        color: i,
        borderColor: i,
        boxShadow: `2px 2px 0 ${i}`,
      }}
    >
      <TopSignupBar dark={dark} />
      <TopRightCorner dark={dark} />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          paddingTop: 16,
        }}
      >
        <HalimCard expanded={expanded} mobile={mobile} dark={dark} />
        <hr
          style={{
            border: 0,
            borderTop: `1.5px solid ${i}`,
            opacity: 0.2,
            margin: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div className="meta" style={{ color: i, opacity: 0.55 }}>
            works · {WORKS.length}
          </div>
          <div className="meta" style={{ color: i, opacity: 0.5 }}>
            2018 — present
          </div>
        </div>
        <WorksBrowser mobile={mobile} dark={dark} />
      </div>
      <BottomRightCorner mode="HUMAN" dark={dark} />
    </div>
  );
}

// ============================================================
//  CATEGORY LANDING (one route per section)
// ============================================================
function CategoryLanding({ mobile, sec = 0, dark }) {
  const i = ink(dark);
  const s = SECTIONS[sec];
  const items = WORKS.filter((w) => w.sec === sec);
  return (
    <div
      className={"wf " + (mobile ? "wf-mobile" : "")}
      style={{
        background: paper(dark),
        color: i,
        borderColor: i,
        boxShadow: `2px 2px 0 ${i}`,
      }}
    >
      <TopSignupBar dark={dark} />
      <TopRightCorner dark={dark} />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingTop: 16,
        }}
      >
        <div className="meta" style={{ color: i, opacity: 0.55 }}>
          works › {s.label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: s.color,
              flexShrink: 0,
              marginTop: 6,
            }}
          />
          <div
            style={{
              fontFamily: "serif",
              fontWeight: 400,
              fontSize: mobile ? 32 : 52,
              lineHeight: 0.92,
              color: i,
            }}
          >
            {s.long}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--sans)",
            fontSize: mobile ? 13 : 14,
            color: i,
            opacity: 0.78,
            maxWidth: "58ch",
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {s.pill}
        </div>
        <hr
          style={{
            border: 0,
            borderTop: `1.5px solid ${i}`,
            opacity: 0.2,
            margin: "4px 0",
          }}
        />
        <div className="meta" style={{ color: i, opacity: 0.55 }}>
          {items.length} works
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((w, k) => (
            <WorkRow key={k} w={w} mobile={mobile} dark={dark} />
          ))}
        </div>
      </div>
      <BottomRightCorner mode="HUMAN" dark={dark} />
    </div>
  );
}

// ============================================================
//  SPEAKING V3 — editorial magazine (I TALK / I TEACH)
// ============================================================
function SpeakingV3({ mobile }) {
  const i = ink(false);
  const Side = ({
    statement,
    manifesto,
    where,
    formats,
    past,
    cta,
    accent,
  }) => (
    <div
      style={{
        padding: mobile ? 10 : 14,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
      }}
    >
      {/* statement: massive, exaggerated minimalism */}
      <div
        style={{
          fontFamily: "serif",
          fontWeight: 400,
          fontSize: mobile ? 56 : 84,
          lineHeight: 0.85,
          letterSpacing: "-0.04em",
          color: i,
        }}
      >
        {statement}
        <span style={{ color: accent }}>.</span>
      </div>
      {/* manifesto with drop cap */}
      <div style={{ position: "relative", maxWidth: "34ch" }}>
        <span
          style={{
            float: "left",
            fontFamily: "serif",
            fontWeight: 400,
            fontSize: mobile ? 36 : 48,
            lineHeight: 0.85,
            marginRight: 6,
            marginTop: 2,
            color: accent,
          }}
        >
          {manifesto[0]}
        </span>
        <span
          style={{
            fontFamily: "var(--sans)",
            fontSize: mobile ? 12 : 13,
            lineHeight: 1.4,
            color: i,
            opacity: 0.85,
          }}
        >
          {manifesto.slice(1)}
        </span>
      </div>
      {/* where (logos) — compact horizontal with dots */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="meta" style={{ opacity: 0.55 }}>
          where
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {where.map((l, k) => (
            <span
              key={k}
              style={{
                border: `1px solid ${i}`,
                padding: "2px 6px",
                fontFamily: "var(--mono)",
                fontSize: 9,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: i,
                background: "transparent",
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
      {/* formats / topics */}
      {formats && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="meta" style={{ opacity: 0.55 }}>
            {formats.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {formats.items.map((f, k) => (
              <div
                key={k}
                style={{
                  borderLeft: `3px solid ${accent}`,
                  paddingLeft: 8,
                  fontFamily: "var(--sans)",
                  fontSize: mobile ? 12 : 13,
                  color: i,
                }}
              >
                <span style={{ fontWeight: 700 }}>{f[0]}</span>
                <span style={{ opacity: 0.65 }}> — {f[1]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* past — asymmetric grid, video thumbnails */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="meta" style={{ opacity: 0.55 }}>
          past
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 4 }}
        >
          <div className="ph" style={{ aspectRatio: "16/9" }}>
            <div className="ph-cap">{past[0]}</div>
          </div>
          <div className="ph" style={{ aspectRatio: "1/1" }}>
            <div className="ph-cap">{past[1]}</div>
          </div>
          <div className="ph" style={{ aspectRatio: "1/1" }}>
            <div className="ph-cap">{past[2]}</div>
          </div>
          <div className="ph" style={{ aspectRatio: "16/9" }}>
            <div className="ph-cap">{past[3]}</div>
          </div>
        </div>
      </div>
      {/* pull quote */}
      <div
        style={{
          borderTop: `1px solid ${i}`,
          paddingTop: 8,
          fontFamily: "serif",
          fontSize: mobile ? 14 : 16,
          lineHeight: 1.25,
          color: i,
          opacity: 0.85,
        }}
      >
        “{cta.quote}”
        <div className="meta" style={{ opacity: 0.55, marginTop: 4 }}>
          — {cta.who}
        </div>
      </div>
      {/* CTA */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: paper(false),
            background: i,
            padding: "8px 12px",
            boxShadow: `3px 3px 0 ${accent}`,
            fontWeight: 700,
          }}
        >
          {cta.label} →
        </span>
        <span className="tiny" style={{ opacity: 0.55 }}>
          or email halim@oulipo.xyz
        </span>
      </div>
    </div>
  );

  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <TopRightCorner />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingTop: 16,
          paddingBottom: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div
            style={{
              fontFamily: "serif",
              fontWeight: 400,
              fontSize: mobile ? 26 : 36,
              color: i,
            }}
          >
            speaking
          </div>
          <div className="meta" style={{ opacity: 0.5 }}>
            keynotes & workshops
          </div>
        </div>
        <hr
          style={{
            border: 0,
            borderTop: `1.5px solid ${i}`,
            opacity: 0.2,
            margin: 0,
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 1.5px 1fr",
            gap: mobile ? 16 : 0,
            flex: 1,
            minHeight: 0,
          }}
        >
          <Side
            statement="I TALK"
            manifesto="60 minutes about poetry, computation, migration, and the shapes language takes when it leaves the body. I do irony, plural pronouns, and questions louder than answers."
            where={[
              "google",
              "stanford",
              "umd",
              "mozilla",
              "gray area",
              "culturehub",
              "sxsw",
              "rhizome",
            ]}
            past={[
              "stanford keynote, 2025",
              "mozilla a-i-r",
              "sxsw panel",
              "gray area",
            ]}
            cta={{
              label: "book a talk",
              quote: "best closing keynote we've ever programmed.",
              who: "culturehub LA, 2025",
            }}
            accent={SECTIONS[0].color}
          />
          {!mobile && <div style={{ background: i, opacity: 0.6 }} />}
          <Side
            statement="I TEACH"
            manifesto="Hands-on, body-first. How to build with a model. How to break with a model. How to read what comes out and not look away."
            where={[
              "stanford d.school",
              "sfpc",
              "school for poetic computation",
              "gray area",
              "itp",
              "udk berlin",
            ]}
            formats={{
              label: "format",
              items: [
                ["1-day intensive", "half manifesto, half lab. 12 ppl max."],
                ["3-day deep dive", "a small piece ships. 8 ppl max."],
                [
                  "5-day residency",
                  "a public showing on the last night. 6 ppl max.",
                ],
              ],
            }}
            past={[
              "SFPC residency",
              "d.school workshop",
              "itp open studio",
              "udk berlin",
            ]}
            cta={{
              label: "host a workshop",
              quote: "students are still talking about it six months later.",
              who: "sfpc, 2024",
            }}
            accent={SECTIONS[3].color}
          />
        </div>
      </div>
      <BottomRightCorner mode="HUMAN" />
    </div>
  );
}

// ============================================================
//  COMMAND PALETTE — Parallel-style overlay
// ============================================================
function CommandPalette({ mobile, dark = true }) {
  const i = ink(dark);
  const cmds = [
    ["/works", "browse all works", "page"],
    ["/works machine-talk", "fine-tuned poetry models", "page"],
    ["/works computer-theater", "digital algorithmic theater", "page"],
    ["/works somatic-semantics", "net art for the body", "page"],
    ["/works tools", "small software for other artists", "page"],
    ["/connect", "send a message", "page"],
    ["/writing", "books, essays, zines", "page"],
    ["/about", "who · where · why", "page"],
    ["/speaking", "keynotes & workshops", "page"],
    ["/newsletter", "focus the email signup", "action"],
  ];
  return (
    <div
      className={"wf " + (mobile ? "wf-mobile " : "")}
      style={{
        background: paper(dark),
        color: i,
        borderColor: i,
        boxShadow: `2px 2px 0 ${i}`,
      }}
    >
      <TopSignupBar dark={dark} />
      <TopRightCorner dark={dark} />
      <div style={{ position: "relative", height: "calc(100% - 32px)" }}>
        <div
          style={{
            padding: 14,
            paddingTop: 36,
            opacity: 0.35,
            fontFamily: "var(--mono)",
            fontSize: 9,
            lineHeight: 1.5,
            color: i,
            height: "100%",
            overflow: "hidden",
          }}
        >
          <div style={{ marginBottom: 6, opacity: 0.7 }}>HALIM MADI</div>
          <div>Works:</div>
          <div>&nbsp;[Hard.exe](/works/hard-exe)</div>
          <div>&nbsp;[Carnation Revival](/works/carnation-revival)</div>
          <div>&nbsp;[Vatican Pavilion](/works/vatican-pavilion)</div>
          <div>&nbsp;[City of Nets](/works/city-of-nets)</div>
          <div style={{ marginTop: 8 }}>Sections:</div>
          <div>&nbsp;[Machine talk](/works/machine-talk)</div>
          <div>&nbsp;[Computer theater](/works/computer-theater)</div>
          <div>&nbsp;[Somatic semantics](/works/somatic-semantics)</div>
          <div>&nbsp;[Tools](/works/tools)</div>
          <div style={{ marginTop: 8 }}>Pages:</div>
          <div>&nbsp;[About](/about)</div>
          <div>&nbsp;[Speaking](/speaking)</div>
          <div>&nbsp;[Writing](/writing)</div>
          <div>&nbsp;[Connect](/connect)</div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            bottom: 36,
            background: paper(dark),
            border: `1.5px solid ${i}`,
            padding: 8,
            boxShadow: `3px 3px 0 ${i}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingBottom: 6,
              borderBottom: `1px solid ${i}`,
            }}
          >
            <span style={{ fontFamily: "var(--mono)", color: i, opacity: 0.7 }}>
              ›
            </span>
            <span style={{ fontFamily: "var(--mono)", color: i, fontSize: 11 }}>
              /
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                color: i,
                opacity: 0.4,
                fontSize: 11,
              }}
            >
              search
            </span>
            <div style={{ flex: 1 }} />
            <span
              style={{
                border: `1px solid ${i}`,
                padding: "1px 5px",
                fontFamily: "var(--mono)",
                fontSize: 8,
                color: i,
              }}
            >
              tab
            </span>
            <span
              style={{
                border: `1px solid ${i}`,
                padding: "1px 5px",
                fontFamily: "var(--mono)",
                fontSize: 8,
                color: i,
              }}
            >
              esc
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {cmds.slice(0, mobile ? 5 : 8).map((c, k) => (
              <div
                key={k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "170px 1fr 50px",
                  gap: 8,
                  padding: "4px 4px",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: i,
                  background:
                    k === 0
                      ? dark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.05)"
                      : "transparent",
                }}
              >
                <span>
                  <span style={{ opacity: 0.55 }}>/</span>
                  {c[0].slice(1)}
                </span>
                <span style={{ opacity: 0.65 }}>{c[1]}</span>
                <span
                  style={{
                    textAlign: "right",
                    border: `1px solid ${i}`,
                    padding: "0 4px",
                    fontSize: 8,
                    textTransform: "uppercase",
                    opacity: 0.7,
                  }}
                >
                  {c[2]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomRightCorner mode={dark ? "MACHINE" : "HUMAN"} dark={dark} />
    </div>
  );
}

function MachineMode({ mobile }) {
  return <CommandPalette mobile={mobile} dark={true} />;
}

// ============================================================
//  WORK V3 — B top + A flow
// ============================================================
function WorkV3({ mobile }) {
  const accent = SECTIONS[0].color;
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <TopRightCorner />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 16,
        }}
      >
        <div className="meta" style={{ opacity: 0.55 }}>
          works › machine talk › hard.exe
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 1.2fr",
            gap: 12,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ display: "inline-flex", alignItems: "center" }}>
              <SectionDot color={accent} />
              <span className="meta">machine talk · 2026</span>
            </div>
            <div
              style={{
                fontFamily: "serif",
                fontWeight: 400,
                marginTop: 4,
                fontSize: mobile ? 26 : 38,
                lineHeight: 0.95,
              }}
            >
              hard.exe
            </div>
            <div className="desc" style={{ marginTop: 6, maxWidth: "30ch" }}>
              a fine-tuned llm trained on the poets of the carnation revolution.
              it duels live. it loses on purpose. it remembers.
            </div>
            <hr className="h-line dashed" />
            <div className="meta">commissioned by</div>
            <div className="tiny">tiat sf · arg ethereum · mozilla a-i-r</div>
            <div className="meta" style={{ marginTop: 6 }}>
              collaborators
            </div>
            <div className="tiny">a. hassan · k. moreno · oulipo</div>
            <div style={{ marginTop: 8 }}>
              <span className="btn">live model ↗</span>{" "}
              <span className="btn">read paper ↗</span>
            </div>
          </div>
          <div
            className="ph ph-portrait"
            style={{ aspectRatio: mobile ? "4/3" : "3/4" }}
          >
            <div className="ph-cap">hero image</div>
          </div>
        </div>
        <hr className="h-line" />
        <div className="desc">
          <span className="scribble med" />
          <span className="scribble" />
          <span className="scribble short" />
          <span className="scribble med" />
          <span className="scribble" />
        </div>
        <div className="grid-2">
          <div className="ph ph-square">
            <div className="ph-cap">process 01</div>
          </div>
          <div className="ph ph-square">
            <div className="ph-cap">process 02</div>
          </div>
        </div>
        <div className="desc">
          <span className="scribble" />
          <span className="scribble med" />
          <span className="scribble shorter" />
        </div>
        <div className="ph ph-wide">
          <div className="ph-cap">performance still</div>
        </div>
      </div>
      <BottomRightCorner mode="HUMAN" />
    </div>
  );
}

// ============================================================
//  ABOUT V3 — A + timeline (unchanged)
// ============================================================
function AboutV3({ mobile }) {
  const items = [
    ["2026", "training hard.exe v3 · culturehub LA"],
    ["2025", "mozilla a-i-r · gray area fellow"],
    ["2024", "robert coover award · tiat sf"],
    ["2023", "invasions, the book"],
    ["2018", "founded oulipo with two friends"],
  ];
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <TopRightCorner />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 16,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 1.5fr",
            gap: 12,
          }}
        >
          <div className="ph ph-portrait">
            <div className="ph-cap">portrait</div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "serif",
                fontWeight: 400,
                fontSize: mobile ? 28 : 36,
                lineHeight: 0.95,
              }}
            >
              halim madi
            </div>
            <div className="meta" style={{ marginTop: 4 }}>
              he/they · sf · beirut · paris
            </div>
            <div className="desc" style={{ marginTop: 8 }}>
              <span className="scribble med" />
              <span className="scribble" />
              <span className="scribble short" />
              <span className="scribble med" />
              <span className="scribble" />
            </div>
            <hr className="h-line dashed" />
            <div className="meta">selected residencies</div>
            <div className="tiny" style={{ marginTop: 2 }}>
              mozilla '25 · culturehub la '25 · gray area '24 · counterpulse '24
            </div>
            <div className="meta" style={{ marginTop: 6 }}>
              awards
            </div>
            <div className="tiny" style={{ marginTop: 2 }}>
              robert coover '24
            </div>
          </div>
        </div>
        <hr className="h-line" />
        <div className="meta">timeline</div>
        <div>
          {items.map((it, k) => (
            <div
              key={k}
              style={{
                display: "grid",
                gridTemplateColumns: "56px 1fr",
                gap: 8,
                padding: "4px 0",
                borderBottom: "1px dashed rgba(0,0,0,0.2)",
              }}
            >
              <div className="meta">{it[0]}</div>
              <div className="label" style={{ fontSize: 12 }}>
                {it[1]}
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomRightCorner mode="HUMAN" />
    </div>
  );
}

// ============================================================
//  WRITING V3 — books grid + essays (no signup card)
// ============================================================
function WritingV3({ mobile }) {
  const books = [
    ["invasions", "book · 2023"],
    ["flight of the jaguar", "book · 2020"],
    ["deep & fast", "book · 2021"],
    ["ricochets", "book · fr"],
  ];
  const essays = [
    "variations on food and grief",
    "a letter to the body in b-flat minor",
    "prelude to excitement",
    "act 1, scene 1",
  ];
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <TopRightCorner />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div
            style={{
              fontFamily: "serif",
              fontWeight: 400,
              fontSize: mobile ? 28 : 40,
            }}
          >
            writing
          </div>
          <div className="meta" style={{ opacity: 0.55 }}>
            books · essays · zines
          </div>
        </div>
        <div className="desc" style={{ maxWidth: "40ch" }}>
          books, essays, zines. (subscribe via top bar for new pieces.)
        </div>
        <hr className="h-line" />
        <div className="meta">books</div>
        <div className={mobile ? "grid-2" : "grid-4"}>
          {books.map((b, k) => (
            <div key={k}>
              <div className="ph ph-portrait">
                <div className="ph-cap">{b[0]}</div>
              </div>
              <div className="label" style={{ marginTop: 4, fontSize: 12 }}>
                {b[0]}
              </div>
              <div className="tiny">{b[1]}</div>
            </div>
          ))}
        </div>
        <hr className="h-line" />
        <div className="meta">essays · zines</div>
        <div>
          {essays.map((t, k) => (
            <div
              key={k}
              style={{
                padding: "4px 0",
                borderBottom: "1px dashed rgba(0,0,0,0.2)",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div className="label" style={{ fontSize: 12 }}>
                {t}
              </div>
              <div className="tiny">↗ lunate</div>
            </div>
          ))}
        </div>
      </div>
      <BottomRightCorner mode="HUMAN" />
    </div>
  );
}

// ============================================================
//  CONNECT V3 — rebuilt to mirror current /connect on oulipo.xyz
//   1. Featured "vote/now" card (current promo)
//   2. Connect links bar (6 buttons: email, ig, linkedin, youtube, newsletter, cal.com)
//   3. Latest (3 manually-curated highlights)
//   4. Upcoming (live from Supabase events)
//   5. Door selector + form (the v2 piece — kept at the bottom)
// ============================================================
function ConnectV3({ mobile }) {
  const i = ink(false);
  const links = [
    ["Send an Email", "mailto:halim@oulipo.xyz"],
    ["Instagram", "instagram.com/yalla_halim"],
    ["LinkedIn", "linkedin.com/in/madihalim"],
    ["YouTube", "youtube.com/@yalla_halim"],
    ["Newsletter", "halimmadi.substack.com"],
    ["Book a Meeting", "cal.com/halim-madi"],
  ];
  const latest = [
    [
      "Word Garden",
      'the word "dream" probably wants to look different. to dance. to break out of the linear carcass.',
      null,
    ],
    [
      "Vibe Thinking",
      "part 1 — the twitch-ification of thought.",
      "mar 24, 2026",
    ],
    [
      "Where the Hydra Splits",
      "a branching web piece on migrant longing, forking desire.",
      "feb 25, 2026",
    ],
  ];
  const upcoming = [
    ["CULTUREHUB", "hard.exe v3 premiere", "culturehub la, may 18, 2026"],
    [
      "SFPC",
      "5-day residency · open studio thu",
      "school for poetic computation, ny, jun 2–6, 2026",
    ],
    ["MOZFEST", "closing keynote", "mozilla festival, amsterdam, jun 24, 2026"],
  ];
  const doors = [
    ["book a talk", "orgs · students · festivals"],
    ["commission a piece", "install · residency · perf"],
    ["press / interview", "epk + bio + portraits"],
    ["just say hi", "poem-mail welcome"],
  ];
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <TopRightCorner />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          paddingTop: 16,
        }}
      >
        {/* 1. Featured vote/now card — current promo */}
        <div
          style={{
            background: i,
            color: paper(false),
            padding: mobile ? 12 : 16,
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "5fr 4fr",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div>
            <span
              style={{
                display: "inline-block",
                padding: "2px 6px",
                border: `1px solid ${paper(false)}`,
                fontFamily: "var(--mono)",
                fontSize: 9,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: paper(false),
                opacity: 0.7,
                marginBottom: 8,
              }}
            >
              featured / vote
            </span>
            <div
              style={{
                fontFamily: "serif",
                fontWeight: 400,
                fontSize: mobile ? 28 : 38,
                lineHeight: 1,
                color: paper(false),
              }}
            >
              vote for curl
            </div>
            <div
              style={{
                fontFamily: "var(--sans)",
                fontSize: mobile ? 12 : 13,
                color: paper(false),
                opacity: 0.85,
                marginTop: 6,
              }}
            >
              shortlisted for the 2025 new media writing prize. scroll to the
              bottom of the form, select <em>curl</em>, register your vote.
            </div>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  background: paper(false),
                  color: i,
                  padding: "5px 10px",
                  fontFamily: "var(--sans)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                vote now ↗
              </span>
              <span
                style={{
                  border: `1.5px solid ${paper(false)}`,
                  color: paper(false),
                  padding: "5px 10px",
                  fontFamily: "var(--sans)",
                  fontSize: 12,
                }}
              >
                experience curl ↗
              </span>
            </div>
          </div>
          <div
            className="ph dark"
            style={{ aspectRatio: "4/3", borderColor: paper(false) }}
          >
            <div
              className="ph-cap"
              style={{ background: i, color: paper(false) }}
            >
              NMWP form
            </div>
          </div>
        </div>

        {/* 2. Connect links bar — 6 buttons */}
        <div>
          <div className="meta" style={{ opacity: 0.55 }}>
            connect
          </div>
          <div
            style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}
          >
            {links.map((l, k) => (
              <span
                key={k}
                style={{
                  border: `1.5px solid ${i}`,
                  padding: "4px 9px",
                  fontFamily: "var(--sans)",
                  fontSize: 12,
                  color: i,
                }}
              >
                {l[0]} ↗
              </span>
            ))}
          </div>
        </div>

        {/* 3. Latest */}
        <div>
          <div className="meta" style={{ opacity: 0.55 }}>
            latest
          </div>
          <div style={{ marginTop: 4 }}>
            {latest.map((it, k) => (
              <div
                key={k}
                style={{
                  padding: "6px 0",
                  borderBottom: `1px solid rgba(0,0,0,0.12)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--sans)",
                    fontWeight: 700,
                    fontSize: 13,
                    color: i,
                  }}
                >
                  {it[0]}
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: i,
                    lineHeight: 1.2,
                    marginTop: 2,
                  }}
                >
                  {it[1]}
                </div>
                {it[2] && (
                  <div className="meta" style={{ marginTop: 2 }}>
                    {it[2]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 4. Upcoming — events from Supabase */}
        <div>
          <div className="meta" style={{ opacity: 0.55 }}>
            upcoming
          </div>
          <div style={{ marginTop: 4 }}>
            {upcoming.map((it, k) => (
              <div
                key={k}
                style={{
                  padding: "6px 0",
                  borderBottom: `1px solid rgba(0,0,0,0.12)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--sans)",
                    fontWeight: 700,
                    fontSize: 13,
                    color: i,
                  }}
                >
                  <span style={{ color: i, opacity: 0.7 }}>{it[0]}:</span>{" "}
                  {it[1]}
                </div>
                <div className="meta" style={{ marginTop: 2 }}>
                  {it[2]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr
          style={{
            border: 0,
            borderTop: `1.5px solid ${i}`,
            opacity: 0.2,
            margin: "4px 0",
          }}
        />

        {/* 5. Door selector + form (v2 retained) */}
        <div>
          <div
            style={{
              fontFamily: "serif",
              fontWeight: 400,
              fontSize: mobile ? 24 : 32,
              lineHeight: 1,
            }}
          >
            or write directly.
          </div>
          <div className="meta" style={{ marginTop: 6 }}>
            i'm here to…
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)",
              gap: 6,
              marginTop: 4,
            }}
          >
            {doors.map((d, k) => (
              <label
                key={k}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  border: "1.2px solid var(--ink)",
                  padding: 8,
                  cursor: "pointer",
                  boxShadow: k === 0 ? "2px 2px 0 var(--ink)" : "none",
                  background: k === 0 ? "var(--ink)" : "transparent",
                  color: k === 0 ? "var(--paper)" : "var(--ink)",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    border: `1.2px solid ${k === 0 ? "var(--paper)" : "var(--ink)"}`,
                    borderRadius: "50%",
                    marginTop: 3,
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  {k === 0 && (
                    <span
                      style={{
                        position: "absolute",
                        inset: 2,
                        borderRadius: "50%",
                        background: "var(--paper)",
                      }}
                    />
                  )}
                </span>
                <span>
                  <div
                    className="label"
                    style={{ fontSize: 12, color: "inherit" }}
                  >
                    {d[0]}
                  </div>
                  <div
                    className="tiny"
                    style={{ color: "inherit", opacity: 0.7 }}
                  >
                    {d[1]}
                  </div>
                </span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="meta">your name</div>
            <div
              style={{ borderBottom: "1.5px solid var(--ink)", height: 18 }}
            />
            <div className="meta" style={{ marginTop: 6 }}>
              email
            </div>
            <div
              style={{ borderBottom: "1.5px solid var(--ink)", height: 18 }}
            />
            <div className="meta" style={{ marginTop: 6 }}>
              tell me more
            </div>
            <div
              style={{
                border: "1.5px solid var(--ink)",
                height: 56,
                marginTop: 2,
                padding: 4,
              }}
            >
              <span className="scribble shorter" />
            </div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="btn solid">send →</div>
              <label
                className="tiny"
                style={{ display: "flex", gap: 4, alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  defaultChecked
                  style={{ accentColor: "var(--ink)" }}
                />
                also subscribe me to the letter
              </label>
            </div>
          </div>
        </div>
      </div>
      <BottomRightCorner mode="HUMAN" />
    </div>
  );
}

// ============================================================
//  KEYBOARD reference — updated (only c, h, m, /, ⌘K)
// ============================================================
function ShortcutsReference({ mobile }) {
  const rows = [
    ["/", "open command palette", "machine mode"],
    ["⌘K / ⌃K", "open command palette", "global · always"],
    ["esc", "close palette · restore focus", "palette open"],
    ["↑ ↓", "navigate palette suggestions", "palette open"],
    ["enter", "fire selected command", "palette open"],
    ["c", "go to /connect", "global · ignored in inputs"],
    ["h", "switch to HUMAN mode", "global · ignored in inputs"],
    ["m", "switch to MACHINE mode", "global · ignored in inputs"],
  ];
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <TopRightCorner />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingTop: 16,
        }}
      >
        <div className="topbar">
          <div style={{ fontFamily: "serif", fontWeight: 400, fontSize: 24 }}>
            keyboard
          </div>
          <div className="meta">v3 · cheat sheet</div>
        </div>
        <hr className="h-line" />
        {rows.map((r, k) => (
          <div
            key={k}
            style={{
              display: "grid",
              gridTemplateColumns: "90px 1fr 200px",
              gap: 10,
              padding: "5px 0",
              borderBottom: "1px dashed rgba(0,0,0,0.2)",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                gap: 4,
                fontFamily: "var(--mono)",
                fontSize: 11,
              }}
            >
              {r[0].split(" ").map((p, j) => (
                <span
                  key={j}
                  style={{
                    border: "1px solid var(--ink)",
                    padding: "1px 6px",
                    background: "var(--paper)",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
            <div className="desc">{r[1]}</div>
            <div className="meta" style={{ opacity: 0.55 }}>
              {r[2]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
//  Expose globals
// ============================================================
window.LandingV3 = LandingV3;
window.HalimCard = HalimCard;
window.CategoryLanding = CategoryLanding;
window.SpeakingV3 = SpeakingV3;
window.CommandPalette = CommandPalette;
window.MachineMode = MachineMode;
window.WorkV3 = WorkV3;
window.AboutV3 = AboutV3;
window.WritingV3 = WritingV3;
window.ConnectV3 = ConnectV3;
window.ShortcutsReference = ShortcutsReference;

// ============================================================
//  APP — v3 canvas
// ============================================================
const e = React.createElement;

function Pair({ id, label, Comp, w = 520, h = 800, extra = {} }) {
  return [
    e(
      DCArtboard,
      {
        id: id + "-d",
        label: label + " · desktop",
        width: w,
        height: h,
        key: id + "-d",
      },
      e(Comp, { mobile: false, ...extra }),
    ),
    e(
      DCArtboard,
      {
        id: id + "-m",
        label: label + " · mobile",
        width: 320,
        height: h,
        key: id + "-m",
      },
      e(Comp, { mobile: true, ...extra }),
    ),
  ];
}

function App() {
  return (
    <DesignCanvas>
      <DCSection
        id="v3-landing"
        title="01 · Landing = works page (one unified page)"
        subtitle="Top signup bar · CONNECT[c] upper-right · halim madi h1 with [+] toggle on left · works browser with right filter rail · HUMAN[h]/MACHINE[m] bottom-right."
      >
        {Pair({
          id: "v3-land-collapsed",
          label: "collapsed (default)",
          Comp: window.LandingV3,
          h: 920,
          extra: { expanded: false },
        })}
        {Pair({
          id: "v3-land-expanded",
          label: "expanded ([+] clicked)",
          Comp: window.LandingV3,
          h: 1080,
          extra: { expanded: true },
        })}
        {[
          e(
            DCArtboard,
            {
              id: "v3-land-dark",
              label: "collapsed · dark mode",
              width: 520,
              height: 920,
              key: "v3-land-dark",
            },
            e(window.LandingV3, { mobile: false, dark: true, expanded: false }),
          ),
        ]}
      </DCSection>

      <DCSection
        id="v3-card"
        title="02 · The Halim card — interaction states"
        subtitle="Same component, two states. The only piece that toggles. Pills use a left-color-bar (not 4 cards in a 2×2). Compact and inline."
      >
        {[
          e(
            DCArtboard,
            {
              id: "v3-card-collapsed",
              label: "collapsed",
              width: 520,
              height: 200,
              key: "v3-card-collapsed",
            },
            e(
              "div",
              {
                style: {
                  padding: 14,
                  background: "var(--paper)",
                  height: "100%",
                },
              },
              e(window.HalimCard, { expanded: false }),
            ),
          ),
          e(
            DCArtboard,
            {
              id: "v3-card-expanded",
              label: "expanded",
              width: 520,
              height: 460,
              key: "v3-card-expanded",
            },
            e(
              "div",
              {
                style: {
                  padding: 14,
                  background: "var(--paper)",
                  height: "100%",
                },
              },
              e(window.HalimCard, { expanded: true }),
            ),
          ),
        ]}
      </DCSection>

      <DCSection
        id="v3-machine"
        title="03 · MACHINE mode + Command palette"
        subtitle="`/` and ⌘K open palette. `/` + ⌘K hint chips show in MACHINE mode only. Bottom-right toggle reads `human[h]  machine[m]`."
      >
        {Pair({
          id: "v3-palette",
          label: "palette over light page (HUMAN)",
          Comp: window.CommandPalette,
          h: 760,
          extra: { dark: false },
        })}
        {Pair({
          id: "v3-machine",
          label: "MACHINE mode (dark, palette-first)",
          Comp: window.MachineMode,
          h: 760,
        })}
      </DCSection>

      <DCSection
        id="v3-cat"
        title="04 · Category landing pages"
        subtitle="Reachable from any work-row category dot, the expanded HalimCard pills, or palette `/works <slug>`."
      >
        {Pair({
          id: "v3-cat-machine",
          label: "machine talk",
          Comp: window.CategoryLanding,
          h: 720,
          extra: { sec: 0 },
        })}
        {Pair({
          id: "v3-cat-theater",
          label: "computer theater",
          Comp: window.CategoryLanding,
          h: 720,
          extra: { sec: 1 },
        })}
        {Pair({
          id: "v3-cat-semantics",
          label: "somatic semantics",
          Comp: window.CategoryLanding,
          h: 720,
          extra: { sec: 2 },
        })}
        {Pair({
          id: "v3-cat-tools",
          label: "tools",
          Comp: window.CategoryLanding,
          h: 720,
          extra: { sec: 3 },
        })}
      </DCSection>

      <DCSection
        id="v3-speaking"
        title="05 · Speaking — editorial magazine direction"
        subtitle="`I TALK.` / `I TEACH.` giant statements with colored period. Manifesto with drop cap. Logos chip strip. Asymmetric past-event grid. Pull quote. Color-shadow CTA."
      >
        {Pair({
          id: "v3-speaking",
          label: "editorial split",
          Comp: window.SpeakingV3,
          h: 920,
        })}
      </DCSection>

      <DCSection
        id="v3-work"
        title="06 · Individual work — B top + A flow"
        subtitle="Two-column editorial header (title left, hero image right), then text/image alternating. Top signup bar persists."
      >
        {Pair({
          id: "v3-work",
          label: "individual work",
          Comp: window.WorkV3,
          h: 800,
        })}
      </DCSection>

      <DCSection
        id="v3-about"
        title="07 · About — A + timeline"
        subtitle="Portrait + bio + timeline. No standalone signup card."
      >
        {Pair({ id: "v3-about", label: "about", Comp: window.AboutV3, h: 720 })}
      </DCSection>

      <DCSection
        id="v3-writing"
        title="08 · Writing — books grid + essays"
        subtitle="Signup lives in the top bar; this page is just the work."
      >
        {Pair({
          id: "v3-writing",
          label: "writing",
          Comp: window.WritingV3,
          h: 720,
        })}
      </DCSection>

      <DCSection
        id="v3-connect"
        title="09 · Connect — rebuilt to mirror current /connect"
        subtitle="Featured vote/now card → 6-link connect bar → Latest items → Upcoming events (Supabase) → door selector + form. The whole current /connect page, redesigned."
      >
        {Pair({
          id: "v3-connect",
          label: "connect",
          Comp: window.ConnectV3,
          h: 1100,
        })}
      </DCSection>

      <DCSection
        id="v3-keyboard"
        title="10 · Keyboard reference"
        subtitle="Updated for v3: only c, h, m, /, ⌘K. Eventual `/help` palette command."
      >
        {[
          e(
            DCArtboard,
            {
              id: "v3-kb",
              label: "cheat sheet",
              width: 620,
              height: 460,
              key: "v3-kb",
            },
            e(window.ShortcutsReference, { mobile: false }),
          ),
        ]}
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

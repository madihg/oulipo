// ============================================================
//  WIREFRAMES V2 — LOCKED direction (rev. 2026-05-02)
//  See: docs/prd-v2.md for the executable spec.
//
//  Big changes from rev. 1:
//   - Landing IS the works browse page (not 4 section cards anymore)
//     + about-block at top: name + 4-line intro + 4 category fields
//     + year-grouped edge-to-edge work cards (HHMD-style)
//   - Persistent top email-signup bar on every page
//     (auto-subscribes to Substack — drop in-page signups elsewhere)
//   - Bottom-right corner: HUMAN/MACHINE toggle + key shortcut chips
//     (CONNECT[c] / INSTAGRAM[i] / NEWSLETTER[n])
//   - Command palette (/ + ⌘K) — Parallel.ai style
//   - Works page: Categories | Works toggle, edge-to-edge cards
//   - NEW: per-category landing pages (one route per section)
//   - Keynotes & Workshops pushed further (side-by-side split)
//   - MACHINE mode = dark, palette-first (Parallel-style)
//
//  Section colors (Singulars palette):
//    machine talk        #F6009B
//    computer theater    #2AA4DD
//    somatic semantics   #8B5CF6
//    tools               #02F700
//    yellow #FEE005      reserved for now/live accents
// ============================================================

const SECTIONS = [
  {
    key: "machine",
    label: "machine talk",
    slug: "machine-talk",
    long: "turning humans into machines",
    desc: "fine-tuned poetry models. small endangered llms. poems that train themselves on you.",
    color: "#F6009B",
  },
  {
    key: "theater",
    label: "computer theater",
    slug: "computer-theater",
    long: "computer theater",
    desc: "live, algorithmic, sometimes-improvised digital theater. avatars, agents, audiences.",
    color: "#2AA4DD",
  },
  {
    key: "semantics",
    label: "somatic semantics",
    slug: "somatic-semantics",
    long: "somatic semantics",
    desc: "net art for the body. cursors that breathe. pages that listen. words that miss you.",
    color: "#8B5CF6",
  },
  {
    key: "tools",
    label: "tools",
    slug: "tools",
    long: "tools for other artists",
    desc: "small software for writers, performers, organizers. things i wish existed.",
    color: "#02F700",
  },
];

// sample works data (mirrors /Assets/data/works.json shape)
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

// ─── shared bits ───────────────────────────────────────────────
function ink(dark) {
  return dark ? "#fafaf7" : "#1a1a1a";
}
function paper(dark) {
  return dark ? "#0a0a0a" : "#fafaf7";
}

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

// Single-letter keyboard shortcut chip
function KeyChip({ label, k, dark }) {
  const i = ink(dark);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        border: `1px solid ${i}`,
        padding: "1px 5px",
        fontFamily: "var(--mono)",
        fontSize: 8,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: i,
      }}
    >
      {label}
      <span
        style={{
          background: i,
          color: paper(dark),
          padding: "0px 3px",
          fontWeight: 700,
        }}
      >
        {k}
      </span>
    </span>
  );
}

// HUMAN/MACHINE radio + slash hint
function ModeRadio({ on, label, dark }) {
  const i = ink(dark);
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 4, color: i }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          border: `1px solid ${i}`,
          background: on ? i : "transparent",
          position: "relative",
        }}
      />
      <span style={{ fontWeight: on ? 700 : 400 }}>{label}</span>
    </span>
  );
}

function BottomCorner({ mode = "HUMAN", dark }) {
  const i = ink(dark);
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
      <div style={{ display: "flex", gap: 4 }}>
        <KeyChip label="connect" k="c" dark={dark} />
        <KeyChip label="instagram" k="i" dark={dark} />
        <KeyChip label="newsletter" k="n" dark={dark} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "var(--mono)",
          fontSize: 9,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        <ModeRadio on={mode === "HUMAN"} label="human" dark={dark} />
        <ModeRadio on={mode === "MACHINE"} label="machine" dark={dark} />
        <span
          style={{ border: `1px solid ${i}`, padding: "1px 5px", color: i }}
        >
          / &nbsp; ⌘K
        </span>
      </div>
    </div>
  );
}

// Edge-to-edge HHMD-style work card
function WorkCard({ w, mobile, dark }) {
  const i = ink(dark);
  const sec = SECTIONS[w.sec];
  return (
    <div
      style={{
        border: `1px solid ${i}`,
        opacity: 1,
        padding: mobile ? 10 : 12,
        background: paper(dark),
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontFamily: "serif",
          fontWeight: 400,
          fontSize: mobile ? 16 : 18,
          color: i,
          lineHeight: 1.1,
        }}
      >
        {w.title}
      </div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: sec.color,
        }}
      >
        {w.venue}
      </div>
      <div className="tiny" style={{ color: i, opacity: 0.65 }}>
        {w.loc}
      </div>
      <div className="tiny" style={{ color: i, opacity: 0.65 }}>
        {w.year}
      </div>
      <hr
        style={{
          border: 0,
          borderTop: `1px solid ${i}`,
          opacity: 0.15,
          margin: "6px 0 0",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 4,
        }}
      >
        <div className="tiny" style={{ color: i, opacity: 0.65 }}>
          {w.docs} docs
        </div>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: sec.color,
          }}
          title={sec.label}
        />
      </div>
    </div>
  );
}

function YearGroup({ year, items, mobile, dark }) {
  const i = ink(dark);
  return (
    <div>
      <div className="meta" style={{ color: i, opacity: 0.5, marginBottom: 6 }}>
        {year}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
          gap: 8,
        }}
      >
        {items.map((w, j) => (
          <WorkCard key={j} w={w} mobile={mobile} dark={dark} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
//  LANDING V2 — landing IS the works browse page
// ============================================================
function LandingV2({ mobile, dark }) {
  const i = ink(dark);
  // group by year
  const byYear = WORKS.reduce((acc, w) => {
    (acc[w.year] = acc[w.year] || []).push(w);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => b - a);
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
      {/* sticky top signup bar */}
      <TopSignupBar dark={dark} />

      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          paddingTop: 12,
        }}
      >
        {/* about block */}
        <div>
          <div
            className="h-big"
            style={{
              fontFamily: "serif",
              fontWeight: 400,
              color: i,
              fontSize: mobile ? 36 : 56,
              lineHeight: 0.95,
            }}
          >
            halim madi
          </div>
          <div
            className="desc"
            style={{
              color: i,
              opacity: 0.8,
              marginTop: 8,
              maxWidth: "52ch",
              fontFamily: "var(--sans)",
            }}
          >
            poet, performer, software-leaning. i build poems, performances, and
            small systems that rewire how we relate — to machines, to each
            other, to the past. work splits roughly into four tribes:
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
              gap: 10,
              marginTop: 12,
            }}
          >
            {SECTIONS.map((s) => (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  paddingTop: 8,
                  borderTop: `2px solid ${s.color}`,
                }}
              >
                <div className="meta" style={{ color: i, opacity: 0.55 }}>
                  {s.label}
                </div>
                <div
                  className="h-mid"
                  style={{
                    color: i,
                    fontSize: mobile ? 14 : 16,
                    fontFamily: "var(--sans)",
                    fontWeight: 700,
                  }}
                >
                  {s.long}
                </div>
                <div
                  className="desc"
                  style={{ color: i, opacity: 0.75, marginTop: 2 }}
                >
                  {s.desc}
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

        {/* works browser */}
        <div>
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
            <div className="meta arrow-r" style={{ color: i, opacity: 0.65 }}>
              browse all
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 8,
            }}
          >
            {years.map((y) => (
              <YearGroup
                key={y}
                year={y}
                items={byYear[y]}
                mobile={mobile}
                dark={dark}
              />
            ))}
          </div>
        </div>
      </div>

      <BottomCorner mode="HUMAN" dark={dark} />
    </div>
  );
}

// ============================================================
//  WORKS PAGE V2 — Categories | Works toggle, filter rail
// ============================================================
function WorksPageV2({ mobile, view = "categories" }) {
  const i = ink(false);
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingTop: 12,
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
            className="h-big"
            style={{
              fontFamily: "serif",
              fontWeight: 400,
              fontSize: mobile ? 30 : 44,
            }}
          >
            works
          </div>
          <div className="meta" style={{ opacity: 0.5 }}>
            2018 — present
          </div>
        </div>
        {/* view toggle */}
        <div
          style={{
            display: "flex",
            gap: 18,
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              fontWeight: view === "categories" ? 700 : 400,
              borderBottom:
                view === "categories" ? "2px solid var(--ink)" : "none",
              paddingBottom: 2,
            }}
          >
            categories
          </span>
          <span
            style={{
              fontWeight: view === "works" ? 700 : 400,
              borderBottom: view === "works" ? "2px solid var(--ink)" : "none",
              paddingBottom: 2,
            }}
          >
            works
          </span>
        </div>
        <hr
          style={{
            border: 0,
            borderTop: `1.5px solid ${i}`,
            opacity: 0.2,
            margin: 0,
          }}
        />

        {view === "categories" ? (
          /* edge-to-edge category cards */
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SECTIONS.map((s) => (
              <div
                key={s.key}
                style={{
                  border: `1.5px solid ${i}`,
                  borderTop: `5px solid ${s.color}`,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <div>
                    <div className="meta" style={{ opacity: 0.55 }}>
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "serif",
                        fontWeight: 400,
                        fontSize: mobile ? 22 : 28,
                        lineHeight: 1,
                        marginTop: 2,
                      }}
                    >
                      {s.long}
                    </div>
                  </div>
                  <div className="meta arrow-r" style={{ opacity: 0.65 }}>
                    open
                  </div>
                </div>
                <div
                  className="desc"
                  style={{ marginTop: 6, maxWidth: "58ch" }}
                >
                  {s.desc}
                </div>
                <hr
                  style={{
                    border: 0,
                    borderTop: `1px dashed ${i}`,
                    opacity: 0.25,
                    margin: "10px 0 8px",
                  }}
                />
                <div className="meta" style={{ opacity: 0.55 }}>
                  recent
                </div>
                <div className="stack-1" style={{ marginTop: 4 }}>
                  {WORKS.filter((w) => w.sec === SECTIONS.indexOf(s))
                    .slice(0, 3)
                    .map((w, k) => (
                      <div
                        key={k}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ fontFamily: "serif", fontSize: 14 }}>
                          {w.title}
                        </span>
                        <span className="tiny" style={{ opacity: 0.55 }}>
                          {w.year} · {w.venue}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* works view + filter rail */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "1fr 140px",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {WORKS.map((w, k) => (
                <WorkCard key={k} w={w} mobile={mobile} />
              ))}
            </div>
            {!mobile && (
              <div
                style={{
                  borderLeft: `1px solid ${i}`,
                  paddingLeft: 12,
                  position: "sticky",
                  top: 0,
                  height: "fit-content",
                }}
              >
                <div
                  className="meta"
                  style={{ opacity: 0.55, marginBottom: 6 }}
                >
                  filter
                </div>
                <div className="stack-1">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        border: `1px solid ${i}`,
                        background: i,
                      }}
                    />
                    <span className="label" style={{ fontSize: 12 }}>
                      all
                    </span>
                  </div>
                  {SECTIONS.map((s) => (
                    <div
                      key={s.key}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          border: `1px solid ${i}`,
                          background: "transparent",
                        }}
                      />
                      <SectionDot color={s.color} size={6} />
                      <span className="label" style={{ fontSize: 11 }}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomCorner mode="HUMAN" />
    </div>
  );
}

// ============================================================
//  CATEGORY LANDING (one route per section)
// ============================================================
function CategoryLanding({ mobile, sec = 0 }) {
  const s = SECTIONS[sec];
  const items = WORKS.filter((w) => w.sec === sec);
  const i = ink(false);
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingTop: 12,
        }}
      >
        <div className="meta" style={{ opacity: 0.55 }}>
          works › {s.label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: s.color,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              fontFamily: "serif",
              fontWeight: 400,
              fontSize: mobile ? 32 : 48,
              lineHeight: 0.95,
            }}
          >
            {s.long}
          </div>
        </div>
        <div className="desc" style={{ maxWidth: "56ch", marginTop: 4 }}>
          {s.desc} more here — three sentences expanding the practice. what does
          it look like in the room. what does it ask of an audience. why now.
        </div>
        <hr
          style={{
            border: 0,
            borderTop: `1.5px solid ${i}`,
            opacity: 0.2,
            margin: "4px 0",
          }}
        />
        <div className="meta" style={{ opacity: 0.55 }}>
          {items.length} works
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
            gap: 8,
          }}
        >
          {items.map((w, k) => (
            <WorkCard key={k} w={w} mobile={mobile} />
          ))}
        </div>
      </div>
      <BottomCorner mode="HUMAN" />
    </div>
  );
}

// ============================================================
//  SPEAKING (keynotes + workshops side-by-side, pushed)
// ============================================================
function SpeakingV2({ mobile }) {
  const i = ink(false);
  const Side = ({ title, manifesto, cta, accent }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: mobile ? 8 : 12,
      }}
    >
      <div className="meta" style={{ color: accent }}>
        {title === "KEYNOTES" ? "i talk" : "i teach"}
      </div>
      <div
        style={{
          fontFamily: "serif",
          fontWeight: 400,
          fontSize: mobile ? 28 : 38,
          lineHeight: 0.9,
          color: i,
        }}
      >
        {title}
      </div>
      <div className="desc" style={{ maxWidth: "30ch" }}>
        {manifesto}
      </div>
      <hr
        style={{
          border: 0,
          borderTop: `1px dashed ${i}`,
          opacity: 0.3,
          margin: 0,
        }}
      />
      <div className="meta" style={{ opacity: 0.55 }}>
        where
      </div>
      <div className="grid-3" style={{ gap: 4 }}>
        {[
          "google",
          "stanford",
          "umd",
          "mozilla",
          "gray area",
          "culturehub",
        ].map((l, k) => (
          <div
            key={k}
            style={{
              border: `1px solid ${i}`,
              padding: 4,
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: 8,
              textTransform: "uppercase",
            }}
          >
            {l}
          </div>
        ))}
      </div>
      <div className="meta" style={{ opacity: 0.55, marginTop: 4 }}>
        past
      </div>
      <div className="grid-2">
        {[1, 2].map((k) => (
          <div key={k} className="ph ph-wide">
            <div className="ph-cap">talk {k}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto", paddingTop: 6 }}>
        <span
          className="btn solid"
          style={{
            background: i,
            color: "var(--paper)",
            boxShadow: `2px 2px 0 ${accent}`,
          }}
        >
          {cta} →
        </span>
      </div>
    </div>
  );
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingTop: 12,
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
            className="h-big"
            style={{
              fontFamily: "serif",
              fontWeight: 400,
              fontSize: mobile ? 26 : 36,
            }}
          >
            speaking
          </div>
          <div className="meta" style={{ opacity: 0.5 }}>
            keynotes & workshops
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 1.5px 1fr",
            gap: mobile ? 12 : 0,
            flex: 1,
            minHeight: 0,
          }}
        >
          <Side
            title="KEYNOTES"
            manifesto="60 minutes about poetry, computation, migration, and the shapes language takes when it leaves the body."
            cta="book a talk"
            accent={SECTIONS[0].color}
          />
          {!mobile && <div style={{ background: i, opacity: 0.6 }} />}
          <Side
            title="WORKSHOPS"
            manifesto="2 to 5 days, hands-on. how to build with a model, how to break with a model, how to read what comes out."
            cta="host a workshop"
            accent={SECTIONS[3].color}
          />
        </div>
      </div>
      <BottomCorner mode="HUMAN" />
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
    ["/keynotes", "talks i give", "page"],
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
      <div style={{ position: "relative", height: "calc(100% - 32px)" }}>
        {/* dimmed body — markdown-style link list (mirrors Parallel screenshot 2) */}
        <div
          style={{
            padding: 14,
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

        {/* palette overlay */}
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
                  gridTemplateColumns: "160px 1fr 50px",
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
      <BottomCorner mode={dark ? "MACHINE" : "HUMAN"} dark={dark} />
    </div>
  );
}

// ============================================================
//  MACHINE MODE — dark, palette-first reference
// ============================================================
function MachineMode({ mobile }) {
  // same as CommandPalette but with full body content visible
  return <CommandPalette mobile={mobile} dark={true} />;
}

// ============================================================
//  WORK V2 — B top + A flow (unchanged from rev. 1)
// ============================================================
function WorkV2({ mobile }) {
  const accent = SECTIONS[0].color;
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 12,
        }}
      >
        <div className="meta" style={{ opacity: 0.55 }}>
          machine talk · works › hard.exe
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
      <BottomCorner mode="HUMAN" />
    </div>
  );
}

// ============================================================
//  ABOUT V2 — A + timeline (unchanged from rev. 1)
// ============================================================
function AboutV2({ mobile }) {
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
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 12,
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
          {items.map((it, i) => (
            <div
              key={i}
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
      <BottomCorner mode="HUMAN" />
    </div>
  );
}

// ============================================================
//  WRITING V2 — signup REMOVED (top bar handles it)
// ============================================================
function WritingV2({ mobile }) {
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
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 12,
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
          books, essays, zines. (subscribe for new pieces — top bar.)
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
      <BottomCorner mode="HUMAN" />
    </div>
  );
}

// ============================================================
//  CONNECT V2 — door selector + form (unchanged from rev. 1)
// ============================================================
function ConnectV2({ mobile }) {
  const doors = [
    ["book a talk", "orgs · students · festivals"],
    ["commission a piece", "install · residency · perf"],
    ["press / interview", "epk + bio + portraits"],
    ["just say hi", "poem-mail welcome"],
  ];
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 12,
        }}
      >
        <div
          style={{
            fontFamily: "serif",
            fontWeight: 400,
            fontSize: mobile ? 28 : 40,
            lineHeight: 0.95,
          }}
        >
          say hi.
        </div>
        <div className="desc" style={{ marginTop: 2 }}>
          booking, residencies, collabs, or just to share a poem.
        </div>
        <div className="meta" style={{ marginTop: 6 }}>
          i'm here to…
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: 6,
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
        <div style={{ marginTop: 4 }}>
          <div className="meta">your name</div>
          <div style={{ borderBottom: "1.5px solid var(--ink)", height: 18 }} />
          <div className="meta" style={{ marginTop: 8 }}>
            email
          </div>
          <div style={{ borderBottom: "1.5px solid var(--ink)", height: 18 }} />
          <div className="meta" style={{ marginTop: 8 }}>
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
        <hr className="h-line dashed" />
        <div className="tiny">or → halim@oulipo.xyz · ig: @yalla_halim</div>
      </div>
      <BottomCorner mode="HUMAN" />
    </div>
  );
}

// ============================================================
//  KEYBOARD-SHORTCUT REFERENCE CARD
// ============================================================
function ShortcutsReference({ mobile }) {
  const rows = [
    ["/", "open command palette", "global · ignored in inputs"],
    ["⌘K / ⌃K", "open command palette", "global · always"],
    ["esc", "close palette · restore focus", "palette open"],
    ["↑ ↓", "navigate palette suggestions", "palette open"],
    ["enter", "fire selected command", "palette open"],
    ["c", "go to /connect", "global · ignored in inputs"],
    ["i", "open instagram in new tab", "global · ignored in inputs"],
    ["n", "focus newsletter input", "global · ignored in inputs"],
    ["m", "toggle human / machine mode", "global · ignored in inputs"],
  ];
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <TopSignupBar />
      <div
        className="wf-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingTop: 12,
        }}
      >
        <div className="topbar">
          <div style={{ fontFamily: "serif", fontWeight: 400, fontSize: 24 }}>
            keyboard
          </div>
          <div className="meta">v2 · cheat sheet</div>
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
window.LandingV2 = LandingV2;
window.WorksPageV2 = WorksPageV2;
window.CategoryLanding = CategoryLanding;
window.SpeakingV2 = SpeakingV2;
window.CommandPalette = CommandPalette;
window.MachineMode = MachineMode;
window.WorkV2 = WorkV2;
window.AboutV2 = AboutV2;
window.WritingV2 = WritingV2;
window.ConnectV2 = ConnectV2;
window.ShortcutsReference = ShortcutsReference;

// ============================================================
//  APP — v2 canvas
// ============================================================
const e = React.createElement;

function Pair({ id, label, Comp, w = 480, h = 760, extra = {} }) {
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
        id="v2-landing"
        title="01 · Landing — IS the works browse page"
        subtitle="Persistent top signup bar. Name + 4-line intro + 4 color-coded category fields. Edge-to-edge year-grouped works below. Bottom-right: HUMAN/MACHINE toggle + key shortcuts."
      >
        {Pair({
          id: "v2-land",
          label: "human · light",
          Comp: window.LandingV2,
          h: 920,
        })}
        {[
          e(
            DCArtboard,
            {
              id: "v2-land-dark",
              label: "human · dark mode",
              width: 480,
              height: 920,
              key: "v2-land-dark",
            },
            e(window.LandingV2, { mobile: false, dark: true }),
          ),
        ]}
      </DCSection>

      <DCSection
        id="v2-machine"
        title="02 · MACHINE mode + Command palette"
        subtitle="Pressing `/` or ⌘K anywhere opens this. In MACHINE mode, the palette is open by default and the page renders as a markdown-style link list."
      >
        {Pair({
          id: "v2-palette",
          label: "palette over light page",
          Comp: window.CommandPalette,
          h: 720,
          extra: { dark: false },
        })}
        {Pair({
          id: "v2-machine",
          label: "MACHINE mode (dark, palette-first)",
          Comp: window.MachineMode,
          h: 720,
        })}
      </DCSection>

      <DCSection
        id="v2-works"
        title="03 · Works page — Categories | Works toggle"
        subtitle="Two views. Categories = 4 wide edge-to-edge cards. Works = full list + filter rail. URL-driven."
      >
        {Pair({
          id: "v2-works-cat",
          label: "Categories view",
          Comp: window.WorksPageV2,
          h: 800,
          extra: { view: "categories" },
        })}
        {Pair({
          id: "v2-works-list",
          label: "Works view + filter rail",
          Comp: window.WorksPageV2,
          h: 800,
          extra: { view: "works" },
        })}
      </DCSection>

      <DCSection
        id="v2-cat"
        title="04 · Category landing pages"
        subtitle="One per section: name + description + filtered works. Reachable from landing card, works chip, work-tag, or palette command."
      >
        {Pair({
          id: "v2-cat-machine",
          label: "machine talk",
          Comp: window.CategoryLanding,
          h: 720,
          extra: { sec: 0 },
        })}
        {Pair({
          id: "v2-cat-theater",
          label: "computer theater",
          Comp: window.CategoryLanding,
          h: 720,
          extra: { sec: 1 },
        })}
        {Pair({
          id: "v2-cat-semantics",
          label: "somatic semantics",
          Comp: window.CategoryLanding,
          h: 720,
          extra: { sec: 2 },
        })}
        {Pair({
          id: "v2-cat-tools",
          label: "tools",
          Comp: window.CategoryLanding,
          h: 720,
          extra: { sec: 3 },
        })}
      </DCSection>

      <DCSection
        id="v2-speaking"
        title="05 · Speaking — keynotes / workshops side-by-side (pushed)"
        subtitle="Hard split. Each side: bold serif title, manifesto, logos strip, video grid, CTA. Mobile stacks."
      >
        {Pair({
          id: "v2-speaking",
          label: "side-by-side",
          Comp: window.SpeakingV2,
          h: 720,
        })}
      </DCSection>

      <DCSection
        id="v2-work"
        title="06 · Individual work — B top + A flow"
        subtitle="Two-column editorial header (title left, hero image right), then text/image alternating. Top signup bar persists."
      >
        {Pair({
          id: "v2-work",
          label: "individual work",
          Comp: window.WorkV2,
          h: 800,
        })}
      </DCSection>

      <DCSection
        id="v2-about"
        title="07 · About — A + timeline"
        subtitle="Portrait + bio + timeline. No standalone signup card (top bar handles it)."
      >
        {Pair({ id: "v2-about", label: "about", Comp: window.AboutV2, h: 720 })}
      </DCSection>

      <DCSection
        id="v2-writing"
        title="08 · Writing — signup REMOVED"
        subtitle="Books grid + essays. Signup lives in the top bar; this page is just the work."
      >
        {Pair({
          id: "v2-writing",
          label: "writing",
          Comp: window.WritingV2,
          h: 720,
        })}
      </DCSection>

      <DCSection
        id="v2-connect"
        title="09 · Connect — door selector + form"
        subtitle="'I'm here to…' radio (4 doors), then unified contact form, with subscribe-to-letter checkbox."
      >
        {Pair({
          id: "v2-connect",
          label: "connect",
          Comp: window.ConnectV2,
          h: 720,
        })}
      </DCSection>

      <DCSection
        id="v2-keyboard"
        title="10 · Keyboard reference"
        subtitle="What every key does. To be implemented as `/help` palette command."
      >
        {[
          e(
            DCArtboard,
            {
              id: "v2-kb",
              label: "cheat sheet",
              width: 620,
              height: 480,
              key: "v2-kb",
            },
            e(window.ShortcutsReference, { mobile: false }),
          ),
        ]}
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

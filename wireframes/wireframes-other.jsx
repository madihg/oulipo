// All other section wireframes

// ============ HAMBURGER MENU ============
function MenuV1Plain({ mobile }) {
  const items = [
    "home",
    "works",
    "keynotes",
    "workshops",
    "writing",
    "about",
    "connect",
  ];
  const ext = ["newsletter", "instagram"];
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">halim madi</div>
          <div className="burger" style={{ position: "relative" }}>
            <span style={{ transform: "rotate(45deg) translate(2px,4px)" }} />
            <span style={{ opacity: 0 }} />
            <span style={{ transform: "rotate(-45deg) translate(3px,-5px)" }} />
          </div>
        </div>
        <hr className="h-line" />
        <div className="stack-2" style={{ marginTop: 14 }}>
          {items.map((it, i) => (
            <div
              key={i}
              className="h-big"
              style={{ fontSize: mobile ? 22 : 28 }}
            >
              {it}
            </div>
          ))}
          <hr className="h-line dashed" style={{ margin: "10px 0" }} />
          {ext.map((it, i) => (
            <div
              key={i}
              className="h-mid"
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <span>{it}</span>
              <span className="meta">↗ external</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MenuV2TwoCol({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">halim madi</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
            gap: 12,
            marginTop: 14,
          }}
        >
          <div>
            <div className="meta">on this site</div>
            {[
              "home",
              "works",
              "keynotes",
              "workshops",
              "writing",
              "about",
              "connect",
            ].map((it, i) => (
              <div key={i} className="h-mid" style={{ marginTop: 6 }}>
                {(i + 1).toString().padStart(2, "0")} · {it}
              </div>
            ))}
          </div>
          <div>
            <div className="meta">elsewhere</div>
            <div className="h-mid" style={{ marginTop: 6 }}>
              ↗ newsletter
            </div>
            <div className="h-mid" style={{ marginTop: 6 }}>
              ↗ instagram
            </div>
            <div className="meta" style={{ marginTop: 14 }}>
              now
            </div>
            <div className="desc" style={{ marginTop: 4 }}>
              training hard.exe in los angeles. writing about endangered
              languages.
            </div>
            <div className="meta" style={{ marginTop: 10 }}>
              contact
            </div>
            <div className="desc" style={{ marginTop: 4 }}>
              halim@oulipo.xyz
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuV3Overlay({ mobile }) {
  return (
    <div
      className={"wf " + (mobile ? "wf-mobile" : "")}
      style={{ background: "var(--ink)" }}
    >
      <div className="wf-inner" style={{ color: "var(--paper)" }}>
        <div className="topbar">
          <div className="name" style={{ color: "rgba(255,255,255,0.7)" }}>
            halim madi
          </div>
          <span
            style={{
              fontFamily: "var(--mono)",
              color: "var(--paper)",
              fontSize: 14,
            }}
          >
            ×
          </span>
        </div>
        <hr
          className="h-line"
          style={{ borderColor: "rgba(255,255,255,0.3)" }}
        />
        <div style={{ marginTop: 16 }}>
          {[
            "home",
            "works",
            "keynotes",
            "workshops",
            "writing",
            "about",
            "connect",
          ].map((it, i) => (
            <div
              key={i}
              className="h-big"
              style={{
                color: "var(--paper)",
                fontSize: mobile ? 22 : 30,
                marginTop: 4,
              }}
            >
              {it}
              <span
                style={{
                  float: "right",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  opacity: 0.5,
                }}
              >
                0{i + 1}
              </span>
            </div>
          ))}
        </div>
        <hr
          className="h-line dashed"
          style={{ borderColor: "rgba(255,255,255,0.3)", margin: "12px 0" }}
        />
        <div className="meta" style={{ color: "rgba(255,255,255,0.6)" }}>
          off-site
        </div>
        <div className="h-mid" style={{ color: "var(--paper)", marginTop: 4 }}>
          newsletter ↗
        </div>
        <div className="h-mid" style={{ color: "var(--paper)", marginTop: 4 }}>
          instagram ↗
        </div>
      </div>
    </div>
  );
}

// ============ INDIVIDUAL WORK PAGE (Sketch C) ============
function WorkV1Sketch({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">halim madi / works / singulars</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div className="meta" style={{ marginTop: 8 }}>
          ← back to other than human
        </div>
        <div
          className="h-big"
          style={{ marginTop: 6, fontSize: mobile ? 22 : 30 }}
        >
          singulars
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <span className="chip on">other than human</span>
          <span className="chip">AI</span>
          <span className="chip">ritual</span>
        </div>
        <div className="ph ph-wide" style={{ marginTop: 8 }}>
          <div className="ph-cap">hero image</div>
        </div>
        <div className="desc" style={{ marginTop: 8 }}>
          <span className="scribble med" />
          <span className="scribble" />
          <span className="scribble short" />
          <span className="scribble med" />
        </div>
        <div className="grid-3" style={{ marginTop: 8 }}>
          <div className="ph ph-square">
            <div className="ph-cap">img</div>
          </div>
          <div className="ph ph-square">
            <div className="ph-cap">img</div>
          </div>
          <div className="ph ph-square">
            <div className="ph-cap">img</div>
          </div>
        </div>
        <div className="desc" style={{ marginTop: 8 }}>
          <span className="scribble med" />
          <span className="scribble" />
        </div>
      </div>
    </div>
  );
}

function WorkV2Editorial({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">work · 03/12 in other than human</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 1.4fr",
            gap: 12,
            marginTop: 8,
          }}
        >
          <div>
            <div className="meta">other than human</div>
            <div
              className="h-big"
              style={{ marginTop: 4, fontSize: mobile ? 24 : 32 }}
            >
              singulars
            </div>
            <div className="desc" style={{ marginTop: 6 }}>
              human-vs-machine poetry duels. the audience trains the model.
            </div>
            <hr className="h-line dashed" />
            <div className="meta">commissions / residencies</div>
            <div className="tiny" style={{ marginTop: 4 }}>
              gray area '24
              <br />
              counterpulse '24
              <br />
              media archaeology lab '25
            </div>
            <hr className="h-line dashed" />
            <div className="meta">links</div>
            <div className="tiny arrow-r" style={{ marginTop: 4 }}>
              singulars.oulipo.xyz
            </div>
            <div className="tiny arrow-r">press kit</div>
          </div>
          <div>
            <div className="ph ph-wide">
              <div className="ph-cap">key image</div>
            </div>
            <div className="grid-2" style={{ marginTop: 6 }}>
              <div className="ph ph-square">
                <div className="ph-cap">detail</div>
              </div>
              <div className="ph ph-square">
                <div className="ph-cap">detail</div>
              </div>
            </div>
            <div className="desc" style={{ marginTop: 8 }}>
              <span className="scribble med" />
              <span className="scribble" />
              <span className="scribble short" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkV3Scroll({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner" style={{ padding: 0 }}>
        {/* full bleed hero */}
        <div
          className="ph ph-wide"
          style={{
            borderLeft: 0,
            borderRight: 0,
            borderTop: 0,
            aspectRatio: mobile ? "4/3" : "16/8",
          }}
        >
          <div
            className="ph-cap"
            style={{ left: 14, bottom: 14, fontSize: 14 }}
          >
            singulars
          </div>
          <div
            className="meta"
            style={{
              position: "absolute",
              left: 14,
              top: 14,
              color: "var(--paper)",
              mixBlendMode: "difference",
            }}
          >
            other than human · 2024–
          </div>
        </div>
        <div style={{ padding: "10px 14px" }}>
          <div className="desc" style={{ marginTop: 4 }}>
            <span className="scribble med" />
            <span className="scribble" />
            <span className="scribble short" />
          </div>
          {/* alternating media + text */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
              gap: 8,
              marginTop: 8,
            }}
          >
            <div className="ph ph-square">
              <div className="ph-cap">audience trainer</div>
            </div>
            <div className="desc">
              <span className="scribble med" />
              <span className="scribble" />
              <span className="scribble shorter" />
            </div>
            <div className="desc">
              <span className="scribble med" />
              <span className="scribble" />
            </div>
            <div className="ph ph-square">
              <div className="ph-cap">poem print-out</div>
            </div>
          </div>
          <hr className="h-line dashed" />
          <div className="meta">next →</div>
          <div className="h-mid">borderline</div>
        </div>
      </div>
    </div>
  );
}

// ============ WORKS INDEX W/ FILTERS (Sketch D) ============
function WorksV1Pills({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">works</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div className="meta" style={{ marginTop: 6 }}>
          section
        </div>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}
        >
          {[
            "all",
            "other than human",
            "computer theater",
            "somatic semantics",
            "tools",
          ].map((s, i) => (
            <span key={i} className={"chip " + (i === 1 ? "on" : "")}>
              {s}
            </span>
          ))}
        </div>
        <div className="meta" style={{ marginTop: 6 }}>
          theme
        </div>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}
        >
          {["migration", "queerness", "language", "AI", "ritual"].map(
            (s, i) => (
              <span key={i} className="chip">
                {s}
              </span>
            ),
          )}
        </div>
        <hr className="h-line dashed" />
        <div className={mobile ? "grid-2" : "grid-3"} style={{ marginTop: 4 }}>
          {[
            "singulars",
            "feed it",
            "queer ai",
            "reverse",
            "versus",
            "carnation",
          ].map((w, i) => (
            <div key={i}>
              <div className="ph ph-wide">
                <div className="ph-cap">{w}</div>
              </div>
              <div className="label" style={{ marginTop: 3 }}>
                {w}
              </div>
              <div className="tiny">other than human · '24</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorksV2Tabs({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">halim madi / works</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        {/* tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginTop: 6,
            borderBottom: "1.5px solid var(--ink)",
          }}
        >
          {["all", "OTH", "CT", "SS", "tools"].map((t, i) => (
            <div
              key={i}
              style={{
                padding: "5px 10px",
                borderRight: "1px solid var(--ink-3)",
                background: i === 2 ? "var(--ink)" : "transparent",
                color: i === 2 ? "var(--paper)" : "var(--ink)",
                fontFamily: "var(--mono)",
                fontSize: 10,
                textTransform: "uppercase",
              }}
            >
              {t}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <div className="tiny">
            filter by theme: <span className="chip">migration ×</span>
          </div>
          <div className="tiny">view: ☷ ☰</div>
        </div>
        <div className={mobile ? "grid-2" : "grid-3"} style={{ marginTop: 6 }}>
          {[
            "borderline",
            "i have always",
            "invasions",
            "feed it",
            "queering ai",
            "i live here",
          ].map((w, i) => (
            <div key={i}>
              <div className="ph ph-wide">
                <div className="ph-cap">{w}</div>
              </div>
              <div className="label" style={{ marginTop: 3 }}>
                {w}
              </div>
              <div className="tiny">computer theater</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorksV3BigTitle({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">/works</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div className="meta" style={{ marginTop: 10 }}>
          section · 02 / 04
        </div>
        <div
          className="h-big"
          style={{ marginTop: 4, fontSize: mobile ? 24 : 32 }}
        >
          <span className="acc-dot pk" style={{ width: 10, height: 10 }} />
          computer theater
        </div>
        <div className="desc" style={{ marginTop: 4, maxWidth: "40ch" }}>
          algorithmic, digital theater experiments. live, online, sometimes
          both.
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: 8,
          }}
        >
          <div className="tiny">
            other sections: ‹ other than human · somatic semantics · tools ›
          </div>
          <div className="tiny">themes ▾</div>
        </div>
        <hr className="h-line" />
        <div className={mobile ? "grid-2" : "grid-3"} style={{ marginTop: 6 }}>
          {[
            "borderline",
            "i have always",
            "invasions",
            "i live here",
            "deserve it",
            "—",
          ].map((w, i) => (
            <div key={i}>
              <div className="ph ph-wide">
                <div className="ph-cap">{w}</div>
              </div>
              <div className="label" style={{ marginTop: 3 }}>
                {w}
              </div>
              <div className="tiny">'25 · live</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorksV4Sidebar({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner" style={{ padding: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "140px 1fr",
            height: "100%",
          }}
        >
          {/* sidebar */}
          <div
            style={{
              padding: 12,
              borderRight: mobile ? "0" : "1.5px solid var(--ink)",
              borderBottom: mobile ? "1.5px solid var(--ink)" : "0",
            }}
          >
            <div className="name">/works</div>
            <hr className="h-line" />
            <div className="meta">section</div>
            <div className="stack-1" style={{ marginTop: 4 }}>
              {[
                "all",
                "other than human",
                "computer theater",
                "somatic semantics",
                "tools",
              ].map((s, i) => (
                <div
                  key={i}
                  className="label"
                  style={{
                    fontSize: 12,
                    color: i === 2 ? "var(--ink)" : "var(--ink-3)",
                    textDecoration: i === 2 ? "underline" : "none",
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
            <hr className="h-line dashed" />
            <div className="meta">theme</div>
            <div className="stack-1" style={{ marginTop: 4 }}>
              {["migration", "queerness", "language", "AI", "ritual"].map(
                (s, i) => (
                  <div key={i} className="tiny">
                    ☐ {s}
                  </div>
                ),
              )}
            </div>
            <hr className="h-line dashed" />
            <div className="meta">year</div>
            <div className="tiny" style={{ marginTop: 4 }}>
              2015 ───●─── 2026
            </div>
          </div>
          <div style={{ padding: 12, overflow: "hidden" }}>
            <div className="meta">12 works in computer theater</div>
            <div className="grid-2" style={{ marginTop: 6 }}>
              {["borderline", "i have always", "invasions", "i live here"].map(
                (w, i) => (
                  <div key={i}>
                    <div className="ph ph-wide">
                      <div className="ph-cap">{w}</div>
                    </div>
                    <div className="label" style={{ marginTop: 3 }}>
                      {w}
                    </div>
                    <div className="tiny">'24 · 'migration, ritual</div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ KEYNOTES & WORKSHOPS (Sketch E) ============
function KeyV1Plain({ mobile, kind = "keynotes" }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">halim madi / {kind}</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div
          className="h-big"
          style={{ marginTop: 8, fontSize: mobile ? 24 : 30 }}
        >
          {kind}
        </div>
        <div className="desc" style={{ marginTop: 6 }}>
          <span className="scribble med" />
          <span className="scribble" />
          <span className="scribble short" />
          <span className="scribble med" />
        </div>
        <div className="grid-3" style={{ marginTop: 8 }}>
          <div className="ph ph-square">
            <div className="ph-cap">stage</div>
          </div>
          <div className="ph ph-square">
            <div className="ph-cap">audience</div>
          </div>
          <div className="ph ph-square">
            <div className="ph-cap">slide</div>
          </div>
        </div>
        <hr className="h-line" />
        <div className="meta">where i've spoken</div>
        <div
          className="row"
          style={{ marginTop: 6, alignItems: "center", flexWrap: "wrap" }}
        >
          {["google", "stanford", "umd", "mozilla", "grayarea"].map((l, i) => (
            <div
              key={i}
              style={{
                width: mobile ? 60 : 75,
                height: mobile ? 28 : 32,
                border: "1.2px solid var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.05em",
              }}
            >
              {l}
            </div>
          ))}
        </div>
        <div className="meta" style={{ marginTop: 8 }}>
          recent talks (videos)
        </div>
        <div className="grid-2" style={{ marginTop: 4 }}>
          <div className="video-ph">
            <div className="vlabel">weirding the web · grayarea</div>
          </div>
          <div className="video-ph">
            <div className="vlabel">prophet consulting</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyV2Split({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">halim madi / keynotes + workshops</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
            gap: 12,
            marginTop: 8,
          }}
        >
          <div style={{ borderLeft: "3px solid var(--ink)", paddingLeft: 8 }}>
            <div className="h-mid">keynotes</div>
            <div className="desc" style={{ marginTop: 4 }}>
              i speak about ai, language, and care. 30–60 minutes.
            </div>
            <div className="meta" style={{ marginTop: 8 }}>
              topics
            </div>
            <div className="tiny" style={{ marginTop: 2 }}>
              · weirding the web
              <br />· what language remembers
              <br />· endangered llms
            </div>
          </div>
          <div style={{ borderLeft: "3px solid var(--ink-3)", paddingLeft: 8 }}>
            <div className="h-mid">workshops</div>
            <div className="desc" style={{ marginTop: 4 }}>
              hands-on. half-day to 3 days.
            </div>
            <div className="meta" style={{ marginTop: 8 }}>
              formats
            </div>
            <div className="tiny" style={{ marginTop: 2 }}>
              · fine-tune your own poet
              <br />· somatic semantics lab
              <br />· algorithmic theater
            </div>
          </div>
        </div>
        <hr className="h-line" />
        <div className="meta">past hosts</div>
        <div className="row" style={{ marginTop: 4, flexWrap: "wrap" }}>
          {["google", "stanford", "umd"].map((l, i) => (
            <div
              key={i}
              style={{
                width: 70,
                height: 28,
                border: "1.2px solid var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--mono)",
                fontSize: 10,
              }}
            >
              {l}
            </div>
          ))}
        </div>
        <div className="grid-2" style={{ marginTop: 8 }}>
          <div className="video-ph">
            <div className="vlabel">talk · 22 min</div>
          </div>
          <div className="video-ph">
            <div className="vlabel">workshop · 4 min</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyV3Manifesto({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">halim madi / keynotes</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div
          className="h-big"
          style={{
            marginTop: 10,
            fontSize: mobile ? 22 : 28,
            maxWidth: "18ch",
          }}
        >
          i talk about machines that care, languages that survive, code as
          ritual.
        </div>
        <div className="desc" style={{ marginTop: 8 }}>
          book me to think out loud with your team, students, or audience.
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <span className="btn solid">request a talk</span>
          <span className="btn">topics ↓</span>
        </div>
        <hr className="h-line dashed" />
        <div className="meta">previously at</div>
        <div className="row" style={{ marginTop: 6, flexWrap: "wrap", gap: 4 }}>
          {[
            "google",
            "stanford",
            "umd",
            "mozilla",
            "grayarea",
            "counterpulse",
          ].map((l, i) => (
            <div
              key={i}
              className="tiny"
              style={{ padding: "2px 6px", border: "1px solid var(--ink-3)" }}
            >
              {l}
            </div>
          ))}
        </div>
        <div className="grid-3" style={{ marginTop: 8 }}>
          <div className="video-ph">
            <div className="vlabel">talk 1</div>
          </div>
          <div className="video-ph">
            <div className="vlabel">talk 2</div>
          </div>
          <div className="video-ph">
            <div className="vlabel">talk 3</div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.MenuV1Plain = MenuV1Plain;
window.MenuV2TwoCol = MenuV2TwoCol;
window.MenuV3Overlay = MenuV3Overlay;
window.WorkV1Sketch = WorkV1Sketch;
window.WorkV2Editorial = WorkV2Editorial;
window.WorkV3Scroll = WorkV3Scroll;
window.WorksV1Pills = WorksV1Pills;
window.WorksV2Tabs = WorksV2Tabs;
window.WorksV3BigTitle = WorksV3BigTitle;
window.WorksV4Sidebar = WorksV4Sidebar;
window.KeyV1Plain = KeyV1Plain;
window.KeyV2Split = KeyV2Split;
window.KeyV3Manifesto = KeyV3Manifesto;

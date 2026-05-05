// Landing page variants — tame → wild

// =========== Variant 1 — Straight from sketch A ===========
function LandingV1Tame({ mobile }) {
  const sections = [
    {
      name: "other than human",
      desc: "fine-tuned poetry models. non-human poets.",
      items: ["singulars", "queer ai", "feed it"],
    },
    {
      name: "computer theater",
      desc: "digital, algorithmic theater experiments.",
      items: ["i have always", "borderline", "invasions"],
    },
    {
      name: "somatic semantics",
      desc: "net art. anti-gravitational word interfaces.",
      items: ["we called us poetry", "red trail", "erasure", "cluster"],
    },
    {
      name: "tools",
      desc: "things i made for others.",
      items: ["collective theater", "s2s ai sample", "word garden"],
    },
  ];
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
        {sections.map((s, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 4 : 14 }}>
            <div className="sec-row">
              <div>
                <div className="h-mid">
                  <span className={`acc-dot ${["cy", "pk", "pu", "gr"][i]}`} />
                  {s.name}
                </div>
                <div className="desc">{s.desc}</div>
              </div>
              <div className="meta arrow-r">see all</div>
            </div>
            <div
              className={
                mobile ? "row" : s.items.length === 4 ? "grid-4" : "grid-3"
              }
              style={{ marginTop: 6, overflowX: mobile ? "auto" : "visible" }}
            >
              {s.items.map((it, j) => (
                <div
                  key={j}
                  className="ph ph-wide"
                  style={{ minWidth: mobile ? 90 : "auto" }}
                >
                  <div className="ph-cap">{it}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========== Variant 2 — Editorial dense, all sections visible ===========
function LandingV2Editorial({ mobile }) {
  const sections = [
    {
      name: "other than human",
      desc: "fine-tuned poetry models",
      count: "12 works",
    },
    {
      name: "computer theater",
      desc: "algorithmic stagework",
      count: "7 works",
    },
    {
      name: "somatic semantics",
      desc: "net art, word interfaces",
      count: "21 works",
    },
    { name: "tools", desc: "made for others", count: "4 tools" },
  ];
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner" style={{ padding: mobile ? 12 : 16 }}>
        <div className="topbar">
          <div className="name">halim madi · sf · beirut · paris</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        {/* table of contents */}
        <div className="stack-1" style={{ marginTop: 8 }}>
          {sections.map((s, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr auto auto",
                gap: 8,
                alignItems: "baseline",
                borderBottom: "1px dashed rgba(0,0,0,0.2)",
                padding: "4px 0",
              }}
            >
              <div className="meta">0{i + 1}</div>
              <div className="h-mid">{s.name}</div>
              <div className="tiny">{s.desc}</div>
              <div className="meta">{s.count} →</div>
            </div>
          ))}
        </div>
        {/* contact sheet */}
        <div className="meta" style={{ marginTop: 14 }}>
          recent · all sections
        </div>
        <div
          className={mobile ? "grid-3" : "contact-grid"}
          style={{ marginTop: 6 }}
        >
          {Array.from({ length: mobile ? 9 : 18 }).map((_, i) => (
            <div key={i} className="ph ph-square">
              <div className="ph-cap" style={{ fontSize: 9, padding: "0 2px" }}>
                w·{(i + 1).toString().padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =========== Variant 3 — Hybrid: hero + sections (scroll one) ===========
function LandingV3Hero({ mobile }) {
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
        <div style={{ marginTop: 12 }}>
          <div className="meta">other than human · 01/04</div>
          <div
            className="h-big"
            style={{ marginTop: 6, fontSize: mobile ? 22 : 28 }}
          >
            singulars
          </div>
          <div className="desc" style={{ marginTop: 4 }}>
            a series of human-vs-machine poetry duels. the audience trains the
            model.
          </div>
          <div className="ph ph-wide" style={{ marginTop: 8 }}>
            <div className="ph-cap">hero · singulars performance</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <span className="pill dot live">training</span>
            <span className="pill">brooklyn 05/14</span>
            <span className="meta arrow-r" style={{ marginLeft: "auto" }}>
              see all 12
            </span>
          </div>
        </div>
        <hr className="h-line dashed" />
        {[
          {
            n: "computer theater",
            i: "i have always",
            d: "algorithmic theater",
            a: "pk",
          },
          {
            n: "somatic semantics",
            i: "we called us poetry",
            d: "net art",
            a: "pu",
          },
          { n: "tools", i: "word garden", d: "made for others", a: "gr" },
        ].map((s, i) => (
          <div
            key={i}
            className="row"
            style={{ marginTop: 8, alignItems: "center" }}
          >
            <div className="ph ph-square" style={{ width: 56, flexShrink: 0 }}>
              <div className="ph-cap" style={{ fontSize: 9 }}>
                {s.i}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="meta">
                <span className={`acc-dot ${s.a}`} />
                {s.n}
              </div>
              <div className="label">{s.i}</div>
              <div className="tiny">{s.d}</div>
            </div>
            <div className="meta arrow-r">→</div>
          </div>
        ))}
        <div className="tiny" style={{ marginTop: 10, textAlign: "center" }}>
          ↓ scroll for more
        </div>
      </div>
    </div>
  );
}

// =========== Variant 4 — Live performance ticker + chat-bot ===========
function LandingV4Live({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner" style={{ padding: 0 }}>
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div className="name">halim madi</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="ticker">
          <span className="red">● now training</span>
          <span>hard.exe</span>
          <span>los angeles · today</span>
          <span>·</span>
          <span>next: reverse.exe brooklyn 05/14</span>
          <span>·</span>
          <span>248 votes today</span>
        </div>
        <div style={{ padding: "10px 14px" }}>
          {/* Embedded poetic bot */}
          <div className="meta">↓ talk to a strange poetic bot ↓</div>
          <div
            style={{
              border: "1.5px solid var(--ink)",
              marginTop: 6,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              background: "var(--paper)",
            }}
          >
            <div className="bub bot">
              i forgot the word for the thing that holds water.
            </div>
            <div className="bub you">cup?</div>
            <div className="bub bot">
              no — older. the one that remembers your grandmother's hands.
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                marginTop: 4,
                borderTop: "1px dashed rgba(0,0,0,0.2)",
                paddingTop: 6,
              }}
            >
              <span className="meta">›</span>
              <div className="scribble" style={{ flex: 1 }} />
              <span
                className="cursor"
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 11,
                  background: "var(--ink)",
                }}
              />
            </div>
          </div>
          {/* sections compressed */}
          {[
            ["other than human", "cy", "where the bot lives"],
            ["computer theater", "pk", "where i perform"],
            ["somatic semantics", "pu", "where words misbehave"],
            ["tools", "gr", "what i give away"],
          ].map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                padding: "8px 0",
                borderBottom: "1px dashed rgba(0,0,0,0.2)",
              }}
            >
              <span className={`acc-dot ${s[1]}`} />
              <div className="h-mid">{s[0]}</div>
              <div className="tiny" style={{ marginLeft: "auto" }}>
                {s[2]} →
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =========== Variant 5 — Terminal landing (wild) ===========
function LandingV5Terminal({ mobile }) {
  return (
    <div
      className={"wf " + (mobile ? "wf-mobile" : "")}
      style={{ background: "var(--ink)" }}
    >
      <div className="term">
        <div style={{ marginBottom: 4 }}>
          <span className="dim">$ whoami</span>
        </div>
        <div>halim madi</div>
        <div className="dim">artist, technologist, computational poet</div>
        <div style={{ marginTop: 8 }}>
          <span className="dim">$ ls ~/work</span>
        </div>
        <div>
          ./other-than-human/{" "}
          <span className="dim">// 12 fine-tuned poetry models</span>
        </div>
        <div>
          ./computer-theater/{" "}
          <span className="dim">// 7 algorithmic stagings</span>
        </div>
        <div>
          ./somatic-semantics/ <span className="dim">// 21 net-art pieces</span>
        </div>
        <div>
          ./tools/ <span className="dim">// 4 things i made for others</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <span className="dim">$ cat ~/now</span>
        </div>
        <div className="dim">training hard.exe in los angeles</div>
        <div className="dim">writing about endangered languages</div>
        <div className="dim">building a word garden</div>
        <div style={{ marginTop: 8 }}>
          <span className="dim">$ </span>cd <span className="cursor" />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 14,
            fontFamily: "var(--mono)",
            fontSize: 9,
            color: "#fff",
            opacity: 0.5,
            letterSpacing: "0.05em",
          }}
        >
          ESC for graphical mode · TAB to autocomplete
        </div>
      </div>
    </div>
  );
}

// =========== Variant 6 — Cursor-as-poem + avatar (wild) ===========
function LandingV6Avatar({ mobile }) {
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
            position: "relative",
            marginTop: 8,
            height: mobile ? 130 : 160,
            border: "1.5px solid var(--ink)",
            overflow: "hidden",
          }}
        >
          {/* avatar */}
          <div
            className="video-ph"
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              transform: "translateX(-50%)",
              width: "45%",
              aspectRatio: "3/4",
              height: "100%",
            }}
          >
            <div className="vlabel">live · halim performing</div>
          </div>
          {/* trailing words */}
          <span
            style={{
              position: "absolute",
              left: 14,
              top: 14,
              fontFamily: "var(--hand)",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            language
          </span>
          <span
            style={{
              position: "absolute",
              left: 24,
              top: 42,
              fontFamily: "var(--hand)",
              fontSize: 14,
              opacity: 0.7,
            }}
          >
            remembers
          </span>
          <span
            style={{
              position: "absolute",
              left: 46,
              top: 64,
              fontFamily: "var(--hand)",
              fontSize: 12,
              opacity: 0.45,
            }}
          >
            what
          </span>
          <span
            style={{
              position: "absolute",
              right: 14,
              bottom: 14,
              fontFamily: "var(--hand)",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            between code
          </span>
          <span
            style={{
              position: "absolute",
              right: 24,
              bottom: 42,
              fontFamily: "var(--hand)",
              fontSize: 14,
              opacity: 0.7,
            }}
          >
            and prayer
          </span>
          <div
            className="flag"
            style={{
              left: "50%",
              bottom: 8,
              transform: "translateX(-50%) rotate(0deg)",
            }}
          >
            ↑ words trail your cursor
          </div>
        </div>
        {/* compact 4 sections */}
        <div className="grid-2" style={{ marginTop: 10 }}>
          {[
            ["other than human", "cy", "model breath"],
            ["computer theater", "pk", "staged glitches"],
            ["somatic semantics", "pu", "word weather"],
            ["tools", "gr", "give-aways"],
          ].map((s, i) => (
            <div
              key={i}
              style={{ border: "1.2px solid var(--ink)", padding: "6px 8px" }}
            >
              <div className="meta">
                <span className={`acc-dot ${s[1]}`} />0{i + 1}
              </div>
              <div className="h-mid" style={{ fontSize: 15, marginTop: 2 }}>
                {s[0]}
              </div>
              <div className="tiny">{s[2]}</div>
            </div>
          ))}
        </div>
        <div className="tiny" style={{ marginTop: 6, textAlign: "right" }}>
          full index ↓
        </div>
      </div>
    </div>
  );
}

// =========== Variant 7 — Each section, its own micro-interaction ===========
function LandingV7Signature({ mobile }) {
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
        {/* OTH — letters drift apart */}
        <div
          style={{
            marginTop: 10,
            padding: 8,
            border: "1.2px dashed var(--ink-3)",
          }}
        >
          <div className="meta">
            <span className="acc-dot cy" />
            other than human
          </div>
          <div
            className="h-mid"
            style={{ letterSpacing: "0.5em", marginTop: 4 }}
          >
            s i n g u l a r s
          </div>
          <div
            className="flag"
            style={{
              position: "static",
              display: "block",
              transform: "rotate(0)",
              marginTop: 4,
            }}
          >
            ↑ letters drift apart on hover
          </div>
        </div>
        {/* CT — film strip / scrubber */}
        <div
          style={{
            marginTop: 8,
            padding: 8,
            border: "1.2px dashed var(--ink-3)",
          }}
        >
          <div className="meta">
            <span className="acc-dot pk" />
            computer theater
          </div>
          <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
            {Array.from({ length: mobile ? 6 : 10 }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  aspectRatio: "4/5",
                  background: i === 4 ? "var(--ink)" : "var(--ink-5)",
                  border: "1px solid var(--ink-3)",
                }}
              />
            ))}
          </div>
          <div
            className="flag"
            style={{
              position: "static",
              display: "block",
              transform: "rotate(0)",
              marginTop: 4,
            }}
          >
            ↑ scrub a video timeline
          </div>
        </div>
        {/* SS — anti-gravity */}
        <div
          style={{
            marginTop: 8,
            padding: 8,
            border: "1.2px dashed var(--ink-3)",
            position: "relative",
            height: 70,
          }}
        >
          <div className="meta">
            <span className="acc-dot pu" />
            somatic semantics
          </div>
          <span
            style={{
              position: "absolute",
              left: 14,
              top: 30,
              fontFamily: "var(--hand)",
              fontWeight: 700,
              transform: "rotate(-5deg)",
            }}
          >
            cluster
          </span>
          <span
            style={{
              position: "absolute",
              left: 80,
              top: 24,
              fontFamily: "var(--hand)",
              fontWeight: 700,
              transform: "rotate(8deg)",
            }}
          >
            red trail
          </span>
          <span
            style={{
              position: "absolute",
              left: 140,
              top: 38,
              fontFamily: "var(--hand)",
              fontWeight: 700,
              transform: "rotate(-2deg)",
            }}
          >
            erasure
          </span>
          <span
            style={{
              position: "absolute",
              right: 14,
              top: 30,
              fontFamily: "var(--hand)",
              fontWeight: 700,
              transform: "rotate(4deg)",
            }}
          >
            blushing
          </span>
          <div
            className="flag"
            style={{ right: 6, bottom: 4, transform: "rotate(0)" }}
          >
            ↑ words float, push aside
          </div>
        </div>
        {/* Tools — terminal prompt */}
        <div
          style={{
            marginTop: 8,
            padding: 8,
            border: "1.2px dashed var(--ink-3)",
            background: "var(--ink)",
            color: "#fff",
          }}
        >
          <div className="meta" style={{ color: "#fff", opacity: 0.7 }}>
            <span className="acc-dot gr" />
            tools
          </div>
          <div
            style={{ fontFamily: "var(--term)", fontSize: 13, marginTop: 2 }}
          >
            $ run word-garden
            <span className="cursor" />
          </div>
        </div>
      </div>
    </div>
  );
}

// =========== Variant 8 — Index card / archive aesthetic ===========
function LandingV8Index({ mobile }) {
  const works = [
    ["singulars", "OTH", "training", "brooklyn"],
    ["borderline", "CT", "live", "sf"],
    ["we called us poetry", "SS", "archived", "online"],
    ["feed it", "OTH", "done", "la"],
    ["invasions", "CT", "book", "—"],
    ["word garden", "TOOL", "beta", "—"],
    ["queer ai", "OTH", "done", "grayarea"],
    ["cluster", "SS", "live", "—"],
  ];
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">halim madi · index</div>
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
            gridTemplateColumns: "1fr",
            gap: 0,
            marginTop: 4,
          }}
        >
          {/* header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.6fr 0.6fr 0.6fr",
              gap: 8,
              padding: "4px 0",
              borderBottom: "1.5px solid var(--ink)",
            }}
          >
            <div className="meta">work</div>
            <div className="meta">section</div>
            <div className="meta">state</div>
            <div className="meta">where</div>
          </div>
          {works.slice(0, mobile ? 6 : 8).map((w, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.6fr 0.6fr 0.6fr",
                gap: 8,
                padding: "5px 0",
                borderBottom: "1px dashed rgba(0,0,0,0.2)",
                alignItems: "center",
              }}
            >
              <div className="label">{w[0]}</div>
              <div className="tiny">{w[1]}</div>
              <div className="tiny">{w[2]}</div>
              <div className="tiny">{w[3]}</div>
            </div>
          ))}
        </div>
        <div className="meta" style={{ marginTop: 8 }}>
          group by ▾ section · type · year
        </div>
        <div
          className="flag"
          style={{
            position: "static",
            display: "block",
            transform: "rotate(0)",
            marginTop: 6,
          }}
        >
          rhizome-style flat archive
        </div>
      </div>
    </div>
  );
}

window.LandingV1Tame = LandingV1Tame;
window.LandingV2Editorial = LandingV2Editorial;
window.LandingV3Hero = LandingV3Hero;
window.LandingV4Live = LandingV4Live;
window.LandingV5Terminal = LandingV5Terminal;
window.LandingV6Avatar = LandingV6Avatar;
window.LandingV7Signature = LandingV7Signature;
window.LandingV8Index = LandingV8Index;

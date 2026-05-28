// About, Writing, Connect, plus the design canvas app shell

// ============ ABOUT ============
function AboutV1Bio({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">halim madi / about</div>
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
          <div className="ph ph-portrait">
            <div className="ph-cap">portrait</div>
          </div>
          <div>
            <div className="h-big" style={{ fontSize: mobile ? 22 : 26 }}>
              halim madi
            </div>
            <div className="meta" style={{ marginTop: 2 }}>
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
      </div>
    </div>
  );
}

function AboutV2Timeline({ mobile }) {
  const items = [
    ["2026", "training hard.exe in los angeles"],
    ["2025", "mozilla a-i-r · culturehub"],
    ["2024", "robert coover award · gray area"],
    ["2023", "invasions, the book"],
    ["2015", "started oulipo with two friends"],
  ];
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">about</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div
          className="h-big"
          style={{ marginTop: 8, fontSize: mobile ? 20 : 24 }}
        >
          a kitchen laboratory of computational poetry.
        </div>
        <div className="desc" style={{ marginTop: 6, maxWidth: "40ch" }}>
          i build poems, performances, and systems that rewire our ways of
          relating, to machines, to each other, to the past.
        </div>
        <hr className="h-line dashed" />
        <div className="meta">timeline</div>
        <div style={{ marginTop: 6 }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "50px 1fr",
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
    </div>
  );
}

function AboutV3Constellation({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">about · constellation view</div>
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
            height: mobile ? 220 : 260,
            border: "1.2px dashed var(--ink-3)",
          }}
        >
          <div
            className="avatar"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              width: 50,
              height: 50,
            }}
          >
            halim
          </div>
          {[
            ["poet", "15%", "20%"],
            ["technologist", "75%", "15%"],
            ["researcher", "80%", "75%"],
            ["performer", "15%", "75%"],
            ["ḥakawātī", "50%", "10%"],
            ["migrant", "50%", "85%"],
          ].map((n, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: n[1],
                top: n[2],
                transform: "translate(-50%,-50%)",
                fontFamily: "var(--hand)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {n[0]}
            </div>
          ))}
          {/* lines */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          >
            <g stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" fill="none">
              <line x1="50%" y1="50%" x2="15%" y2="20%" />
              <line x1="50%" y1="50%" x2="75%" y2="15%" />
              <line x1="50%" y1="50%" x2="80%" y2="75%" />
              <line x1="50%" y1="50%" x2="15%" y2="75%" />
              <line x1="50%" y1="50%" x2="50%" y2="10%" />
              <line x1="50%" y1="50%" x2="50%" y2="85%" />
            </g>
          </svg>
        </div>
        <div className="tiny" style={{ marginTop: 6, textAlign: "center" }}>
          click any role for the cv slice
        </div>
      </div>
    </div>
  );
}

// ============ WRITING ============
function WritingV1List({ mobile }) {
  const books = [
    ["invasions", "book · 2023"],
    ["flight of the jaguar", "book · 2020"],
    ["deep & fast", "book · 2021"],
    ["ricochets", "book · fr"],
  ];
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">writing</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div className="meta" style={{ marginTop: 8 }}>
          books
        </div>
        <div className={mobile ? "grid-2" : "grid-4"} style={{ marginTop: 6 }}>
          {books.map((b, i) => (
            <div key={i}>
              <div className="ph ph-portrait">
                <div className="ph-cap">{b[0]}</div>
              </div>
              <div className="label" style={{ marginTop: 3 }}>
                {b[0]}
              </div>
              <div className="tiny">{b[1]}</div>
            </div>
          ))}
        </div>
        <hr className="h-line" />
        <div className="meta">essays · zines</div>
        <div style={{ marginTop: 6 }}>
          {[
            "variations on food and grief",
            "a letter to the body in b-flat minor",
            "prelude to excitement",
            "act 1, scene 1",
          ].map((t, i) => (
            <div
              key={i}
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
    </div>
  );
}

function WritingV2Stack({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">writing · feed</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div className="h-mid" style={{ marginTop: 8 }}>
          oulipo.xyz · substack
        </div>
        <div className="desc" style={{ marginTop: 4 }}>
          twice a month. stories, short essays, creative experiments.
        </div>
        <div className="btn solid" style={{ marginTop: 6 }}>
          subscribe ↗
        </div>
        <hr className="h-line dashed" />
        {[
          ["the model dreams in nouns", "3 min · apr 2026"],
          ["what language remembers", "7 min · mar 2026"],
          ["endangered llms", "11 min · feb 2026"],
        ].map((p, i) => (
          <div
            key={i}
            style={{
              padding: "8px 0",
              borderBottom: "1px dashed rgba(0,0,0,0.2)",
            }}
          >
            <div className="label" style={{ fontSize: 14 }}>
              {p[0]}
            </div>
            <div className="tiny">{p[1]}</div>
            <div className="desc" style={{ marginTop: 2 }}>
              <span className="scribble med" />
              <span className="scribble shorter" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ CONNECT ============
function ConnectV1Form({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">connect</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div
          className="h-big"
          style={{ marginTop: 8, fontSize: mobile ? 22 : 28 }}
        >
          say hi.
        </div>
        <div className="desc" style={{ marginTop: 4 }}>
          booking, residencies, collabs, or just to share a poem.
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="meta">your name</div>
          <div style={{ borderBottom: "1.5px solid var(--ink)", height: 18 }} />
          <div className="meta" style={{ marginTop: 8 }}>
            email
          </div>
          <div style={{ borderBottom: "1.5px solid var(--ink)", height: 18 }} />
          <div className="meta" style={{ marginTop: 8 }}>
            about
          </div>
          <div
            style={{
              border: "1.5px solid var(--ink)",
              height: 60,
              marginTop: 2,
              padding: 4,
            }}
          >
            <span className="scribble shorter" />
          </div>
          <div className="btn solid" style={{ marginTop: 8 }}>
            send
          </div>
        </div>
        <hr className="h-line dashed" />
        <div className="tiny">or → halim@oulipo.xyz · ig: @yalla_halim</div>
      </div>
    </div>
  );
}

function ConnectV2Cards({ mobile }) {
  return (
    <div className={"wf " + (mobile ? "wf-mobile" : "")}>
      <div className="wf-inner">
        <div className="topbar">
          <div className="name">connect</div>
          <div className="burger">
            <span />
            <span />
            <span />
          </div>
        </div>
        <hr className="h-line" />
        <div className="h-mid" style={{ marginTop: 8 }}>
          pick a door.
        </div>
        <div className={mobile ? "col" : "grid-2"} style={{ marginTop: 8 }}>
          {[
            ["book a talk", "for orgs · students · festivals"],
            ["commission a piece", "installation, residency, performance"],
            ["just say hi", "poem-mail welcome"],
            ["press / interview", "epk + bio + portraits"],
          ].map((c, i) => (
            <div
              key={i}
              style={{
                border: "1.5px solid var(--ink)",
                padding: 10,
                position: "relative",
                boxShadow: "2px 2px 0 var(--ink)",
              }}
            >
              <div className="meta">0{i + 1}</div>
              <div className="label" style={{ marginTop: 2 }}>
                {c[0]}
              </div>
              <div className="tiny" style={{ marginTop: 2 }}>
                {c[1]}
              </div>
              <div className="meta arrow-r" style={{ marginTop: 6 }}>
                continue
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.AboutV1Bio = AboutV1Bio;
window.AboutV2Timeline = AboutV2Timeline;
window.AboutV3Constellation = AboutV3Constellation;
window.WritingV1List = WritingV1List;
window.WritingV2Stack = WritingV2Stack;
window.ConnectV1Form = ConnectV1Form;
window.ConnectV2Cards = ConnectV2Cards;

// =================== APP SHELL ===================
const e = React.createElement;

function Pair({ id, label, Comp, w = 380, h = 600 }) {
  // desktop + mobile side by side as two artboards
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
      e(Comp, { mobile: false }),
    ),
    e(
      DCArtboard,
      {
        id: id + "-m",
        label: label + " · mobile",
        width: 280,
        height: h,
        key: id + "-m",
      },
      e(Comp, { mobile: true }),
    ),
  ];
}

function App() {
  return (
    <DesignCanvas>
      <DCSection
        id="landing"
        title="01 · Landing page"
        subtitle="From sketch A → wild. The 4 sections are non-negotiable; treatment varies."
      >
        {Pair({
          id: "land-1",
          label: "A · straight from sketch",
          Comp: window.LandingV1Tame,
          h: 680,
        })}
        {Pair({
          id: "land-2",
          label: "B · editorial / contact-sheet (rhizome-y)",
          Comp: window.LandingV2Editorial,
          h: 680,
        })}
        {Pair({
          id: "land-3",
          label: "C · hero + section preview",
          Comp: window.LandingV3Hero,
          h: 680,
        })}
        {Pair({
          id: "land-8",
          label: "D · index / archive table",
          Comp: window.LandingV8Index,
          h: 600,
        })}
        {Pair({
          id: "land-4",
          label: "E · live ticker + poetic chat-bot",
          Comp: window.LandingV4Live,
          h: 680,
        })}
        {Pair({
          id: "land-7",
          label: "F · per-section micro-interactions",
          Comp: window.LandingV7Signature,
          h: 600,
        })}
        {Pair({
          id: "land-6",
          label: "G · cursor-as-poem + avatar",
          Comp: window.LandingV6Avatar,
          h: 600,
        })}
        {Pair({
          id: "land-5",
          label: "H · terminal landing (most wild)",
          Comp: window.LandingV5Terminal,
          h: 480,
        })}
      </DCSection>

      <DCSection
        id="menu"
        title="02 · Hamburger menu"
        subtitle="Home / works / keynotes / workshops / writing / about / connect + ext links"
      >
        {Pair({
          id: "menu-1",
          label: "A · plain stacked",
          Comp: window.MenuV1Plain,
          h: 560,
        })}
        {Pair({
          id: "menu-2",
          label: "B · two-column with now/contact",
          Comp: window.MenuV2TwoCol,
          h: 480,
        })}
        {Pair({
          id: "menu-3",
          label: "C · full-bleed black overlay",
          Comp: window.MenuV3Overlay,
          h: 560,
        })}
      </DCSection>

      <DCSection
        id="work"
        title="03 · Individual work page"
        subtitle="Sketch C — title, image, text, more images, more text."
      >
        {Pair({
          id: "work-1",
          label: "A · faithful to sketch",
          Comp: window.WorkV1Sketch,
          h: 600,
        })}
        {Pair({
          id: "work-2",
          label: "B · two-col editorial (cv + media)",
          Comp: window.WorkV2Editorial,
          h: 540,
        })}
        {Pair({
          id: "work-3",
          label: "C · full-bleed scrolling case study",
          Comp: window.WorkV3Scroll,
          h: 580,
        })}
      </DCSection>

      <DCSection
        id="works"
        title="04 · Works index w/ filters"
        subtitle="Sketch D — section filter pre-selected on entry from landing."
      >
        {Pair({
          id: "works-1",
          label: "A · pill filters (chips)",
          Comp: window.WorksV1Pills,
          h: 600,
        })}
        {Pair({
          id: "works-2",
          label: "B · tabs across the top",
          Comp: window.WorksV2Tabs,
          h: 600,
        })}
        {Pair({
          id: "works-3",
          label: "C · big section title (URL-driven)",
          Comp: window.WorksV3BigTitle,
          h: 600,
        })}
        {Pair({
          id: "works-4",
          label: "D · sidebar w/ multi-filters",
          Comp: window.WorksV4Sidebar,
          h: 540,
        })}
      </DCSection>

      <DCSection
        id="key"
        title="05 · Keynotes & Workshops"
        subtitle="Sketch E — what i do, then what i did (logos + videos)."
      >
        {Pair({
          id: "key-1",
          label: "A · faithful to sketch",
          Comp: window.KeyV1Plain,
          h: 600,
        })}
        {Pair({
          id: "key-2",
          label: "B · split: keynotes / workshops side-by-side",
          Comp: window.KeyV2Split,
          h: 580,
        })}
        {Pair({
          id: "key-3",
          label: "C · manifesto-led + cta",
          Comp: window.KeyV3Manifesto,
          h: 580,
        })}
      </DCSection>

      <DCSection
        id="about"
        title="06 · About"
        subtitle="Bio, residencies, where you live in the work"
      >
        {Pair({
          id: "about-1",
          label: "A · portrait + bio",
          Comp: window.AboutV1Bio,
          h: 520,
        })}
        {Pair({
          id: "about-2",
          label: "B · timeline",
          Comp: window.AboutV2Timeline,
          h: 520,
        })}
        {Pair({
          id: "about-3",
          label: "C · role constellation (wild)",
          Comp: window.AboutV3Constellation,
          h: 540,
        })}
      </DCSection>

      <DCSection
        id="writing"
        title="07 · Writing"
        subtitle="Books + essays + the substack feed"
      >
        {Pair({
          id: "wri-1",
          label: "A · books grid + essays list",
          Comp: window.WritingV1List,
          h: 580,
        })}
        {Pair({
          id: "wri-2",
          label: "B · feed-first (substack-led)",
          Comp: window.WritingV2Stack,
          h: 540,
        })}
      </DCSection>

      <DCSection id="connect" title="08 · Connect" subtitle="The contact page">
        {Pair({
          id: "con-1",
          label: "A · single form",
          Comp: window.ConnectV1Form,
          h: 540,
        })}
        {Pair({
          id: "con-2",
          label: "B · pick-a-door cards",
          Comp: window.ConnectV2Cards,
          h: 540,
        })}
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

// tests/unit/screens.test.mjs - mother-patina conversation data shape

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const data = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/screens.json"), "utf8"),
);

const CONTACTS = ["Maman", "Tantina Auntie", "Oukhti Sis", "Khalo joj", "mum"];
const TRANSLITS = [
  "FI 7OUDNIKI KHOUZINA",
  "WA 3AN KOULLI CHARREN 2EB3IDINA",
  "YA OUM YASSOU3",
  "TACHAFA3I FINA",
  "AMIN",
];
const ARABIC = [
  "بحضنك خذينا",
  "وعن كل شر ابعدينا",
  "يا أم يسوع",
  "تشفعي فينا",
  "أمين",
];
// who SENDS the image / opens each screen: screen 3 the reader forwards it.
const IMAGE_FROM = ["b", "b", "a", "b", "b"];
const FORWARD_TYPES = ["notify", "forward", "notify", "burst", "save"];
// each relative messages in a different app; the sister iMessage, the uncle Telegram
const APPS = ["whatsapp", "whatsapp", "imessage", "telegram", "whatsapp"];
// the mother's (Maman + mum) own profile picture IS the Virgin Mary; the three
// personas are freely-licensed photographs (see assets/avatars/CREDITS.txt)
const AVATARS = [
  "assets/mary.jpg",
  "assets/avatars/tantina.jpg",
  "assets/avatars/sis.jpg",
  "assets/avatars/khalo.jpg",
  "assets/mary.jpg",
];

test("exactly 5 screens, numbered 1..5 with gen 0..4", () => {
  assert.equal(data.screens.length, 5);
  data.screens.forEach((s, i) => {
    assert.equal(s.screen, i + 1);
    assert.equal(s.gen, i);
  });
});

test("ONE shared Mary image, text-free, that exists on disk", () => {
  assert.equal(data.image, "assets/mary.jpg");
  assert.ok(
    fs.existsSync(path.join(ROOT, data.image)),
    `${data.image} exists on disk`,
  );
  // no per-screen image field anymore: she is the same picture, pixelizing.
  for (const s of data.screens) assert.equal(s.image, undefined);
});

test("each screen names a contact, a messenger app, and a profile picture that exists", () => {
  const VALID_APP = new Set(["whatsapp", "imessage", "telegram"]);
  data.screens.forEach((s, i) => {
    assert.equal(s.contact, CONTACTS[i], `screen ${i + 1} contact`);
    assert.ok(VALID_APP.has(s.app), `screen ${i + 1} app=${s.app} valid`);
    assert.equal(s.app, APPS[i], `screen ${i + 1} app`);
    assert.equal(s.avatar, AVATARS[i], `screen ${i + 1} avatar`);
    assert.ok(
      fs.existsSync(path.join(ROOT, s.avatar)),
      `${s.avatar} exists on disk`,
    );
  });
  // the sister is on iMessage, the uncle on Telegram, the rest WhatsApp
  assert.equal(data.screens[2].app, "imessage");
  assert.equal(data.screens[3].app, "telegram");
  // the mother (Maman, then mum) carries the Virgin Mary as her own picture
  assert.equal(data.screens[0].avatar, "assets/mary.jpg");
  assert.equal(data.screens[4].avatar, "assets/mary.jpg");
});

test("each screen carries its clean Arabic overlay line", () => {
  data.screens.forEach((s, i) => {
    assert.equal(s.arabic, ARABIC[i], `screen ${i + 1} arabic`);
  });
});

test("the Arabic is data for the image overlay, not a pre-baked chat bubble", () => {
  for (const s of data.screens) {
    assert.ok(!s.messages.some((m) => m.kind === "arabic"));
  }
});

test("each screen opens with an image, sent by the right person", () => {
  data.screens.forEach((s, i) => {
    assert.equal(s.messages[0].kind, "image", `screen ${i + 1} opens on image`);
    assert.equal(s.messages[0].from, IMAGE_FROM[i], `screen ${i + 1} sender`);
  });
});

test("each screen carries its romanised dua somewhere in the conversation", () => {
  // screens 1/3/4/5 show it as a styled translit bubble; screen 2 embeds it in a
  // later message ("WA 3AN... means distance us..."), so just assert it appears.
  data.screens.forEach((s, i) => {
    const has = s.messages.some((m) => (m.text || "").includes(TRANSLITS[i]));
    assert.ok(has, `screen ${i + 1} carries "${TRANSLITS[i]}"`);
  });
});

test("the emoji reactions land on the right messages", () => {
  // [screen index, the message text it reacts to, the emoji]
  const expected = [
    [1, "get drunk on ourselves", "👎"],
    [2, "Hard to birth a boy with a death drive.", "😂"],
    [3, "All good habibi!", "💪"],
    [4, "I miss you", "❤️"],
    [4, "habibi. Me more.", "❤️"],
  ];
  for (const [si, frag, emoji] of expected) {
    const m = data.screens[si].messages.find((x) =>
      (x.text || "").includes(frag),
    );
    assert.ok(m, `screen ${si + 1} has a message containing "${frag}"`);
    assert.equal(m.reaction, emoji, `"${frag}" carries ${emoji}`);
  }
  // exactly five reactions across the piece
  const total = data.screens.reduce(
    (n, s) => n + s.messages.filter((m) => m.reaction).length,
    0,
  );
  assert.equal(total, 5);
});

test("exactly three high-stakes incoming lines carry extra typing weight", () => {
  const weighted = [];
  data.screens.forEach((s, i) =>
    s.messages.forEach((m) => {
      if (m.weight)
        weighted.push({ screen: i + 1, from: m.from, text: m.text });
    }),
  );
  assert.equal(weighted.length, 4, "exactly four weighted moments");
  // weight only makes sense on incoming (b) lines - those are the ones that show typing dots
  for (const w of weighted) {
    assert.equal(
      w.from,
      "b",
      `weighted line on screen ${w.screen} must be incoming`,
    );
  }
  const texts = weighted.map((w) => w.text);
  assert.ok(texts.some((t) => t.includes("It must be hard to raise a child")));
  assert.ok(texts.includes("I tried to call you"));
  assert.ok(texts.includes("habibi. Me more."));
  assert.ok(texts.includes("salvation?"), "the sister's question holds too");
});

test("every message has a valid from + kind", () => {
  const FROMS = new Set(["a", "b", "system"]);
  const KINDS = new Set(["image", "translit", "text"]);
  for (const s of data.screens) {
    for (const m of s.messages) {
      assert.ok(FROMS.has(m.from), `from=${m.from}`);
      assert.ok(KINDS.has(m.kind), `kind=${m.kind}`);
      if (m.kind !== "image") assert.ok((m.text || "").trim().length > 0);
    }
  }
});

test("the forward affordance varies per screen and ends on 'save'", () => {
  data.screens.forEach((s, i) => {
    assert.ok(s.forward, `screen ${i + 1} has a forward`);
    assert.equal(s.forward.type, FORWARD_TYPES[i], `screen ${i + 1} forward`);
  });
  // the four mid-screens point at the NEXT contact by name, with a picture that exists.
  for (let i = 0; i < 4; i++) {
    assert.equal(data.screens[i].forward.to, CONTACTS[i + 1]);
    assert.ok(
      fs.existsSync(path.join(ROOT, data.screens[i].forward.avatar)),
      `forward avatar for screen ${i + 1} exists`,
    );
  }
  // the forward to the mother shows the Virgin as her picture
  assert.equal(data.screens[3].forward.avatar, "assets/mary.jpg");
  assert.equal(data.screens[3].forward.count, 3, "the burst counts to 3");
});

test("the saved prayer is a grandiose ASCII cathedral wrapped around the poem", () => {
  assert.equal(data.savedPrayer, undefined, "no longer inline in the json");
  assert.equal(data.prayer, "data/prayer.txt");
  const p = path.join(ROOT, data.prayer);
  assert.ok(fs.existsSync(p), "prayer.txt exists on disk");
  const txt = fs.readFileSync(p, "utf8");
  // a Gothic cathedral: an apex cross and the nave walls
  assert.ok(txt.includes("✠"), "has the cross at the apex");
  assert.ok(txt.includes("╚"), "has the cathedral nave/frame");
  // the new poem, opening and closing lines, sits inside
  assert.ok(
    txt.includes("When my family forwards Mary"),
    "the poem opens inside the nave",
  );
  assert.ok(txt.includes("to say I love you."), "the poem closes the nave");
  // the revised middle lines (the "but" leads the address; no possessives)
  assert.ok(
    txt.includes("but son, daughter, niece, love"),
    "the revised address line",
  );
  // the dropped framing + the pre-revision phrasings are gone
  for (const gone of [
    "AVE MARIA",
    "a prayer forwarded",
    "the ask",
    "They are saying something",
    "My son, my daughter, my niece, my love",
    "what to say but",
  ]) {
    assert.ok(!new RegExp(gone, "i").test(txt), `"${gone}" was dropped`);
  }
});

test("the in-code fallback prayer matches the decorated file's poem (no drift)", () => {
  // if prayer.txt ever fails to load, saveThePrayer falls back to a literal in
  // chat.js; the two must agree on the poem, down to the closing period.
  const txt = fs.readFileSync(path.join(ROOT, "data/prayer.txt"), "utf8");
  const js = fs.readFileSync(path.join(ROOT, "chat.js"), "utf8");
  assert.ok(txt.includes("to say I love you."), "prayer.txt keeps the period");
  const fb = js.match(/FALLBACK_PRAYER\s*=\s*"([^]*?)";/);
  assert.ok(fb, "FALLBACK_PRAYER literal found in chat.js");
  for (const line of [
    "When my family forwards Mary",
    "but son, daughter, niece, love",
    "to say I love you.",
  ]) {
    assert.ok(fb[1].includes(line), `FALLBACK_PRAYER keeps "${line}"`);
    assert.ok(txt.includes(line), `prayer.txt keeps "${line}"`);
  }
});

test("the freely-licensed persona photos carry a credits file", () => {
  const credits = path.join(ROOT, "assets/avatars/CREDITS.txt");
  assert.ok(fs.existsSync(credits), "assets/avatars/CREDITS.txt exists");
  const c = fs.readFileSync(credits, "utf8");
  for (const f of ["tantina.jpg", "sis.jpg", "khalo.jpg"]) {
    assert.ok(c.includes(f), `${f} is credited`);
  }
});

test("the last screen ends on the mother's 'habibi. Me more.'", () => {
  const last = data.screens[4].messages.at(-1);
  assert.equal(last.text, "habibi. Me more.");
  assert.equal(last.from, "b");
  assert.equal(last.reaction, "❤️", "with a heart reaction");
});

// ── the rhythm pass ──────────────────────────────────────────────────────────

const allMessages = data.screens.flatMap((s) =>
  s.messages.map((m) => ({ ...m, screen: s.screen })),
);

test("rhythm fields are well-formed: beat is ms of silence, weight true or a multiplier, hesitate only on incoming lines", () => {
  for (const m of allMessages) {
    if (m.beat !== undefined) {
      assert.equal(typeof m.beat, "number", `screen ${m.screen} beat is ms`);
      assert.ok(m.beat >= 1000 && m.beat <= 6000, `beat ${m.beat} in range`);
    }
    if (m.weight !== undefined) {
      assert.ok(
        m.weight === true || (typeof m.weight === "number" && m.weight >= 1.5 && m.weight <= 6),
        `screen ${m.screen} weight ${m.weight} is true or 1.5..6`,
      );
      assert.equal(m.from, "b", "weight lives on incoming lines (the typing dots)");
    }
    if (m.hesitate !== undefined) {
      assert.equal(m.hesitate, true);
      assert.equal(m.from, "b", "only an incoming line can hesitate");
      assert.equal(m.kind, "text");
    }
  }
});

test("the rhythm varies: silences, hesitations, and one line where someone types for a long time", () => {
  const beats = allMessages.filter((m) => m.beat);
  const hesitations = allMessages.filter((m) => m.hesitate);
  assert.ok(beats.length >= 5, `>= 5 silences (got ${beats.length})`);
  assert.ok(hesitations.length >= 4, `>= 4 hesitations (got ${hesitations.length})`);
  // "I tried to call you" sits in a long silence, then the dots hold and hold
  const call = allMessages.find((m) => m.text === "I tried to call you");
  assert.ok(call && call.screen === 5);
  assert.ok(call.beat >= 3000, "a long silence first");
  assert.ok(typeof call.weight === "number" && call.weight >= 4, "then a long hold");
  // the last line of the piece hesitates before it lands
  const last = data.screens[4].messages.at(-1);
  assert.equal(last.text, "habibi. Me more.");
  assert.equal(last.hesitate, true);
});

// ── the Arabic-forward version ───────────────────────────────────────────────

test("every screen carries its Arabic contact name, a she/he typing label, and the forward's Arabic name", () => {
  const CONTACTS_AR = ["ماما", "طنطينا", "أختي", "خالو جوج", "إمي"];
  data.screens.forEach((s, i) => {
    assert.equal(s.contact_ar, CONTACTS_AR[i], `screen ${i + 1} contact_ar`);
    assert.ok(["تكتب…", "يكتب…"].includes(s.typing_ar), `screen ${i + 1} typing_ar`);
    if (s.forward && s.forward.to) {
      assert.ok(CONTACTS_AR.includes(s.forward.to_ar), `screen ${i + 1} forward.to_ar`);
    }
  });
  // the uncle is the one "he"
  assert.equal(data.screens[3].typing_ar, "يكتب…");
});

test("the Arabic-forward saved prayer exists: the five lines above the same cathedral", () => {
  assert.equal(data.prayer_ar, "data/prayer-ar.txt");
  const ar = fs.readFileSync(path.join(ROOT, data.prayer_ar), "utf8");
  const en = fs.readFileSync(path.join(ROOT, data.prayer), "utf8");
  for (const line of ARABIC) assert.ok(ar.includes(line), `prayer-ar has ${line}`);
  assert.ok(ar.endsWith(en), "the English cathedral + poem follow, unchanged");
  assert.ok(ar.indexOf("أمين") < ar.indexOf("✠"), "the Arabic rides above the spire");
});

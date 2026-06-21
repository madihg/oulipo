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

test("each screen carries its transliteration line as a chat message", () => {
  data.screens.forEach((s, i) => {
    const tr = s.messages.find((m) => m.kind === "translit");
    assert.ok(tr, `screen ${i + 1} has a translit`);
    assert.equal(tr.text, TRANSLITS[i]);
  });
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

test("the saved prayer is a decorated file: the Ave Maria ask wrapped around the poem", () => {
  assert.equal(data.savedPrayer, undefined, "no longer inline in the json");
  assert.equal(data.prayer, "data/prayer.txt");
  const p = path.join(ROOT, data.prayer);
  assert.ok(fs.existsSync(p), "prayer.txt exists on disk");
  const txt = fs.readFileSync(p, "utf8");
  assert.match(txt, /AVE\s+MARIA/, "carries an Ave Maria invocation");
  assert.match(txt, /intercede for us/i, "the ask of the Virgin Mary");
  assert.ok(
    txt.includes("When my mother sends these images"),
    "the existing poem opens in the middle",
  );
  assert.ok(txt.includes("a hammock for us"), "the poem ends on the hammock");
});

test("the in-code fallback prayer matches the decorated file's poem ending (no drift)", () => {
  // if prayer.txt ever fails to load, saveThePrayer falls back to a literal in
  // chat.js; the two must agree, down to the closing period.
  const txt = fs.readFileSync(path.join(ROOT, "data/prayer.txt"), "utf8");
  const js = fs.readFileSync(path.join(ROOT, "chat.js"), "utf8");
  assert.ok(
    txt.includes("a hammock for us."),
    "prayer.txt keeps the closing period",
  );
  const fb = js.match(/FALLBACK_PRAYER\s*=\s*"([^]*?)";/);
  assert.ok(fb, "FALLBACK_PRAYER literal found in chat.js");
  assert.ok(
    fb[1].includes("a hammock for us."),
    "FALLBACK_PRAYER keeps the same closing period",
  );
});

test("the freely-licensed persona photos carry a credits file", () => {
  const credits = path.join(ROOT, "assets/avatars/CREDITS.txt");
  assert.ok(fs.existsSync(credits), "assets/avatars/CREDITS.txt exists");
  const c = fs.readFileSync(credits, "utf8");
  for (const f of ["tantina.jpg", "sis.jpg", "khalo.jpg"]) {
    assert.ok(c.includes(f), `${f} is credited`);
  }
});

test("the last screen ends on 'habibi'", () => {
  const last = data.screens[4].messages.at(-1);
  assert.equal(last.text, "habibi");
  assert.equal(last.from, "b");
});

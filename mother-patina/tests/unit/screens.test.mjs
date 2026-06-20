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

test("each screen is a chat with a DIFFERENT contact + an avatar that exists", () => {
  const seen = new Set();
  data.screens.forEach((s, i) => {
    assert.equal(s.contact, CONTACTS[i], `screen ${i + 1} contact`);
    assert.match(s.avatar, /^assets\/avatars\/[a-z]+\.svg$/, `avatar path`);
    assert.ok(
      fs.existsSync(path.join(ROOT, s.avatar)),
      `${s.avatar} exists on disk`,
    );
    seen.add(s.avatar);
  });
  assert.equal(seen.size, 5, "five distinct persona avatars");
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
  // the four mid-screens point at the NEXT contact by name.
  for (let i = 0; i < 4; i++) {
    assert.equal(data.screens[i].forward.to, CONTACTS[i + 1]);
    assert.match(
      data.screens[i].forward.avatar,
      /^assets\/avatars\/[a-z]+\.svg$/,
    );
  }
  assert.equal(data.screens[3].forward.count, 3, "the burst counts to 3");
});

test("the saved prayer is present, multi-line, and Halim's closing couplet", () => {
  assert.equal(typeof data.savedPrayer, "string");
  assert.ok(data.savedPrayer.includes("\n"), "the prayer has line breaks");
  assert.ok(
    data.savedPrayer.includes("a hammock for us"),
    "ends on the hammock image",
  );
  assert.ok(
    data.savedPrayer.includes("When my mother sends these images"),
    "opens on the framing line",
  );
});

test("the last screen ends on 'habibi'", () => {
  const last = data.screens[4].messages.at(-1);
  assert.equal(last.text, "habibi");
  assert.equal(last.from, "b");
});

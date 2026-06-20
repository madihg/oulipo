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

test("exactly 5 screens, numbered 1..5 with gen 0..4", () => {
  assert.equal(data.screens.length, 5);
  data.screens.forEach((s, i) => {
    assert.equal(s.screen, i + 1);
    assert.equal(s.gen, i);
  });
});

test("each screen has its own image file that exists, and a clean Arabic overlay", () => {
  data.screens.forEach((s, i) => {
    assert.match(
      s.image,
      /^assets\/mary-\d\.jpg$/,
      `screen ${i + 1} image path`,
    );
    assert.ok(
      fs.existsSync(path.join(ROOT, s.image)),
      `${s.image} exists on disk`,
    );
    assert.equal(s.arabic, ARABIC[i], `screen ${i + 1} arabic`);
  });
});

test("the five images are all different", () => {
  const imgs = data.screens.map((s) => s.image);
  assert.equal(new Set(imgs).size, 5, "no repeated image");
});

test("each screen opens with user b forwarding the image", () => {
  for (const s of data.screens) {
    assert.equal(s.messages[0].from, "b");
    assert.equal(s.messages[0].kind, "image");
  }
});

test("the Arabic is on the image now, not a chat bubble (no kind:arabic messages)", () => {
  for (const s of data.screens) {
    assert.ok(!s.messages.some((m) => m.kind === "arabic"));
  }
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
      assert.ok(FROMS.has(m.from));
      assert.ok(KINDS.has(m.kind));
      if (m.kind !== "image") assert.ok((m.text || "").trim().length > 0);
    }
  }
});

test("the last screen ends on 'habibi'", () => {
  const last = data.screens[4].messages.at(-1);
  assert.equal(last.text, "habibi");
  assert.equal(last.from, "b");
});

// tests/unit/screens.test.mjs - mother-patina conversation data shape

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../data/screens.json"), "utf8"),
);

const TRANSLITS = [
  "FI 7OUDNIKI KHOUZINA",
  "WA 3AN KOULLI CHARREN 2EB3IDINA",
  "YA OUM YASSOU3",
  "TACHAFA3I FINA",
  "AMIN",
];

test("exactly 5 screens, numbered 1..5 with gen 0..4", () => {
  assert.equal(data.screens.length, 5);
  data.screens.forEach((s, i) => {
    assert.equal(s.screen, i + 1);
    assert.equal(s.gen, i, `screen ${i + 1} decays at generation ${i}`);
  });
});

test("each screen opens with user b forwarding the image", () => {
  for (const s of data.screens) {
    assert.equal(s.messages[0].from, "b");
    assert.equal(s.messages[0].kind, "image");
  }
});

test("each screen carries its prayer line: arabic, translit, then dialogue", () => {
  data.screens.forEach((s, i) => {
    const ar = s.messages.find((m) => m.kind === "arabic");
    const tr = s.messages.find((m) => m.kind === "translit");
    assert.ok(ar && ar.text.trim(), `screen ${i + 1} has an arabic line`);
    assert.ok(tr, `screen ${i + 1} has a translit line`);
    assert.equal(tr.text, TRANSLITS[i]);
  });
});

test("the arabic lines are the five prayer lines, in order", () => {
  const arabic = data.screens.map(
    (s) => s.messages.find((m) => m.kind === "arabic").text,
  );
  assert.deepEqual(arabic, [
    "بحضنك خذينا",
    "وعن كل شر ابعدينا",
    "يا أم يسوع",
    "تشفعي فينا",
    "أمين",
  ]);
});

test("every message has a valid from + kind and non-empty text where expected", () => {
  const FROMS = new Set(["a", "b", "system"]);
  const KINDS = new Set(["image", "arabic", "translit", "text"]);
  for (const s of data.screens) {
    for (const m of s.messages) {
      assert.ok(FROMS.has(m.from), `from ${m.from}`);
      assert.ok(KINDS.has(m.kind), `kind ${m.kind}`);
      if (m.kind !== "image") {
        assert.ok((m.text || "").trim().length > 0, "text non-empty");
      }
    }
  }
});

test("the last screen ends on 'habibi'", () => {
  const last = data.screens[4].messages.at(-1);
  assert.equal(last.text, "habibi");
  assert.equal(last.from, "b");
});

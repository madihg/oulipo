import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const poem = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../data/poem.json"), "utf8"),
);

const LANGS = ["EN", "FR", "AR", "AR-Levantine", "PT-BR"];
const LAYOUTS = ["L1", "L2", "L3", "L4", "L5"];

test("five moments, in language order", () => {
  assert.equal(poem.moments.length, 5);
  assert.deepEqual(
    poem.moments.map((m) => m.lang),
    LANGS,
  );
});

test("each moment uses a distinct, valid layout (all five used)", () => {
  const used = poem.moments.map((m) => m.layout);
  for (const l of used) assert.ok(LAYOUTS.includes(l), `unknown layout ${l}`);
  assert.equal(new Set(used).size, 5, "layouts are distinct");
});

test("original text matches the canonical poem openings", () => {
  const byLang = Object.fromEntries(poem.moments.map((m) => [m.lang, m]));
  assert.match(
    byLang.EN.original,
    /^Mother, there's an ocean, a sea, and a war/,
  );
  assert.match(byLang.FR.original, /^Ma mère l'absence de tes côtes/);
  assert.match(byLang.AR.original, /^Oummi dam3i salibon/);
  assert.match(byLang["AR-Levantine"].original, /^Mama wa3adtik 2erja3/);
  assert.match(byLang["PT-BR"].original, /^mas mama preciso/);
});

test("non-English moments carry an English translation; EN does not", () => {
  for (const m of poem.moments) {
    if (m.lang === "EN") assert.equal(m.english, null);
    else
      assert.ok(m.english && m.english.length > 10, `${m.lang} needs english`);
  }
});

test("palette has the De Stijl set as #rrggbb", () => {
  for (const key of ["paper", "ink", "blue", "sky", "red", "amber", "green"]) {
    assert.match(poem.palette[key], /^#[0-9a-f]{6}$/, `palette.${key}`);
  }
});

test("every keyframe cell is well-formed and uses a palette color", () => {
  const paletteKeys = new Set(Object.keys(poem.palette));
  for (const m of poem.moments) {
    const kfs = m.illustration.keyframes;
    assert.ok(Array.isArray(kfs) && kfs.length >= 1, `${m.id} has keyframes`);
    // within a moment, all keyframes share the same cell count (index-aligned morph)
    const n = kfs[0].length;
    for (const kf of kfs) {
      assert.equal(kf.length, n, `${m.id} keyframes share cell count`);
      for (const c of kf) {
        for (const k of ["x", "y", "w", "h"]) {
          assert.equal(typeof c[k], "number", `${m.id} cell.${k} numeric`);
          assert.ok(c[k] >= 0 && c[k] <= 100, `${m.id} cell.${k} in viewBox`);
        }
        assert.ok(
          paletteKeys.has(c.fill),
          `${m.id} fill '${c.fill}' in palette`,
        );
        if (c.o != null)
          assert.ok(c.o >= 0 && c.o <= 1, `${m.id} opacity 0..1`);
      }
    }
  }
});

test("pacing config is sane", () => {
  const p = poem.pacing;
  assert.ok(p.msPerChar > 0);
  assert.ok(p.minMomentMs > 0 && p.maxMomentMs > p.minMomentMs);
  assert.ok(p.morphMs > 0 && p.morphMs < p.minMomentMs);
});

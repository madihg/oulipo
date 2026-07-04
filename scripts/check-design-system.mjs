#!/usr/bin/env node
// Lightweight ship checks for the Kitchen Lab landing against
// DESIGN-SYSTEM.md section 10 (the non-negotiables that a script can see).
// Run: node scripts/check-design-system.mjs

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(
    `${ok ? "ok " : "FAIL"} ${name}${ok || !detail ? "" : " - " + detail}`,
  );
  if (!ok) failures++;
};

// 1. Every local asset referenced actually exists
const refs = [
  ...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:jpg|png|css|js))(?:\?[^"]*)?"/g),
].map((m) => m[1]);
const missing = refs.filter((r) => !existsSync(resolve(root, "." + r)));
check(
  "local assets exist (" + refs.length + " refs)",
  missing.length === 0,
  missing.join(", "),
);

// 2. Tokens: paper and ink everywhere, never pure white/black
check("paper #FBFBF9 present", /#fbfbf9/i.test(html));
check("ink #0B0B0D present", /#0b0b0d/i.test(html));
check("blue #1C39E8 present", /#1c39e8/i.test(html));

// 2b. Closed palette: every hex literal in the page is a sanctioned token
const PALETTE = new Set([
  "fbfbf9",
  "0b0b0d",
  "1c39e8",
  "b8bcc2",
  "9aa0a8",
  "c9772e",
]);
const hexes = [...html.matchAll(/(?:#|%23)([0-9a-f]{6}|[0-9a-f]{3})\b/gi)].map(
  (m) => m[1].toLowerCase(),
);
const offPalette = [...new Set(hexes.filter((h) => !PALETTE.has(h)))];
check(
  "closed palette (no off-token hex)",
  offPalette.length === 0,
  offPalette.join(", "),
);
const cssOnly = html.match(/<style>[\s\S]*<\/style>/)[0];
check(
  "no pure #fff/#ffffff/#000 in CSS",
  !/#fff\b|#ffffff\b|#000\b|#000000\b|(?<![-\w])white(?![-\w])|(?<![-\w:])black(?![-\w])/i.test(
    cssOnly,
  ),
);

// 3. Fonts: VT323 + JetBrains Mono loaded and used
check("VT323 loaded", /family=VT323/.test(html) && /VT323/.test(cssOnly));
check(
  "JetBrains Mono loaded",
  /JetBrains\+Mono/.test(html) && /JetBrains Mono/.test(cssOnly),
);

// 4. Casing law: display is lowercased, labels uppercased via CSS (not hand-typed)
check("lowercase display transform", /text-transform: lowercase/.test(cssOnly));
check("uppercase label transform", /text-transform: uppercase/.test(cssOnly));

// 5. Chrome is decorative only: no chrome-colored text on paper
check(
  "chrome never text on paper",
  !/color: var\(--chrome\)(?![\s\S]{0,120}ticker)/.test(cssOnly) ||
    /\.ticker span[\s\S]{0,200}color: var\(--chrome\)/.test(cssOnly),
);

// 6. Motion: reduced-motion escape hatch present
check("prefers-reduced-motion honored", /prefers-reduced-motion/.test(cssOnly));

// 7. Focus: blue focus ring
check(
  "blue focus-visible ring",
  /:focus-visible[\s\S]{0,80}var\(--blue\)/.test(cssOnly),
);

// 8. No em dashes anywhere in prose or titles
check("no em dashes", !html.includes("—") && !html.includes("&mdash;"));

// 9. Blue budget: the announcement bar leads; count blue-fill declarations
const blueFills = (cssOnly.match(/background: var\(--blue\)/g) || []).length;
check("blue fills scarce (tick only)", blueFills === 1, `found ${blueFills}`);

// 10. The wall: 4px seam and 4:5 tiles
check("wall gap is the 4px seam", /gap: 4px/.test(cssOnly));
check("tiles are 4:5", /aspect-ratio: 4 \/ 5/.test(cssOnly));

// 11. Treated images only on the wall (no raw kitchen-lab thumbs)
const raw = [...html.matchAll(/kitchen-lab\/(?!treated\/)[\w-]+\.jpg/g)];
check(
  "all wall images are treated",
  raw.length === 0,
  raw.map((m) => m[0]).join(", "),
);

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks pass");
process.exit(failures ? 1 : 0);

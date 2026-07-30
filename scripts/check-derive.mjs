#!/usr/bin/env node
// Ship checks for oulipo.xyz/derive against DESIGN-SYSTEM.md section 10
// (static asserts) + the live hmart public surface (fetch asserts).
// Run: node scripts/check-derive.mjs

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "derive/index.html"), "utf8");

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(
    `${ok ? "ok " : "FAIL"} ${name}${ok || !detail ? "" : " - " + detail}`,
  );
  if (!ok) failures++;
};

// 1. Tokens present
check("paper #FBFBF9 present", /#fbfbf9/i.test(html));
check("ink #0B0B0D present", /#0b0b0d/i.test(html));
check("blue #1C39E8 present", /#1c39e8/i.test(html));

// 1b. Closed palette: every hex literal is a sanctioned token
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

// 2. Fonts loaded and used
check("VT323 loaded", /family=VT323/.test(html) && /VT323/.test(cssOnly));
check(
  "JetBrains Mono loaded",
  /JetBrains\+Mono/.test(html) && /JetBrains Mono/.test(cssOnly),
);

// 3. Casing law via CSS transforms
check("lowercase display transform", /text-transform: lowercase/.test(cssOnly));
check("uppercase label transform", /text-transform: uppercase/.test(cssOnly));

// 4. Motion + focus
check("prefers-reduced-motion honored", /prefers-reduced-motion/.test(cssOnly));
check(
  "blue focus-visible ring",
  /:focus-visible[\s\S]{0,80}var\(--blue\)/.test(cssOnly),
);

// 5. Voice: no em dashes authored; renderer sanitizes data strings
check("no em dashes in source", !html.includes("—") && !html.includes("&mdash;"));
check(
  "em-dash sanitizer in renderer",
  /replace\(\/\\u2014\/g/.test(html),
);

// 6. Blue budget: picks bar + focus ring only, never a background fill
check(
  "no blue background fills",
  !/background: var\(--blue\)/.test(cssOnly),
);

// 7. Data safety: publishable key only, no service/secret key, DOM built
//    without innerHTML so feed strings can't inject markup
check("publishable key only", /sb_publishable_/.test(html));
check(
  "no secret/service key",
  !/sb_secret|service_role/i.test(html),
);
check("no innerHTML rendering", !/innerHTML/.test(html));
check("SF timezone pinned", /America\/Los_Angeles/.test(html));

// 8. Live surface: views answer with the anon-safe key (skip with --offline)
if (!process.argv.includes("--offline")) {
  const SUPA = html.match(/const SUPA = "([^"]+)"/)[1];
  const KEY = html.match(/const KEY = "([^"]+)"/)[1];
  const headers = { apikey: KEY, Authorization: "Bearer " + KEY };
  const briefings = await fetch(
    SUPA + "/derive_briefings?select=week_start,week_end,pulse,top_picks&order=week_start.desc&limit=1",
    { headers },
  );
  check("derive_briefings answers 200", briefings.status === 200, String(briefings.status));
  const bRows = briefings.ok ? await briefings.json() : [];
  check("briefing row present", bRows.length === 1);
  check(
    "briefing has pulse + 3 picks",
    Boolean(bRows[0] && bRows[0].pulse && (bRows[0].top_picks || []).length === 3),
  );
  const events = await fetch(
    SUPA + "/derive_events?select=title,starts_at,signal&limit=5",
    { headers },
  );
  check("derive_events answers 200", events.status === 200, String(events.status));
  const eRows = events.ok ? await events.json() : [];
  check("events rows present", eRows.length > 0, "0 rows");
  check(
    "no user_id exposed on views",
    Boolean(eRows[0]) && !("user_id" in eRows[0]),
  );
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks pass");
process.exit(failures ? 1 : 0);

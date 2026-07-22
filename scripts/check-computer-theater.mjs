#!/usr/bin/env node
// Ship checks for /computer-theater/ - static design-system assertions plus a
// playwright e2e against the local static server (port 4242 must be running,
// launch.json config: oulipo-static).
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const html = readFileSync(
  new URL("../computer-theater/index.html", import.meta.url),
  "utf8",
);

let failed = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "ok " : "FAIL"} ${name}${ok ? "" : "  " + extra}`);
  if (!ok) failed = 1;
}

/* ---- static checks ---- */
check("paper #FBFBF9 present", /#fbfbf9/i.test(html));
check("ink #0B0B0D present", /#0b0b0d/i.test(html));
check("blue #1C39E8 present", /#1c39e8/i.test(html));
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
const off = [...new Set(hexes.filter((h) => !PALETTE.has(h)))];
check("closed palette (no off-token hex)", off.length === 0, off.join(", "));
check("no em dashes", !html.includes("—"));
check("VT323 loaded", /VT323/.test(html));
check("JetBrains Mono loaded", /JetBrains\+Mono/.test(html));
check("prefers-reduced-motion honored", /prefers-reduced-motion/.test(html));
check(
  "focus-visible ring",
  /:focus-visible\s*{\s*outline: 2px solid var\(--blue\)/.test(html),
);
check("no external script libraries", !/<script[^>]+src=/.test(html));
check("lowercase display transform", /text-transform: lowercase/.test(html));
check("uppercase label transform", /text-transform: uppercase/.test(html));
check(
  "halim node stays modest (size <= 5)",
  /id: "halim"[\s\S]{0,200}?size: ([0-4](\.\d+)?|5)\b/.test(html),
);

/* ---- e2e ---- */
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://localhost:4242/computer-theater/", {
  waitUntil: "networkidle",
});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);

check(
  "no console/page errors on load",
  errors.length === 0,
  errors.join(" | "),
);

/* graph settles (loop goes to sleep within its frame budget) */
const slept = await page
  .waitForFunction(
    () => window.__ctDebug && window.__ctDebug.running() === false,
    null,
    { timeout: 12000 },
  )
  .then(() => true)
  .catch(() => false);
check("simulation sleeps after settling", slept);

/* click the hub node -> window opens */
await page.locator(".graph-shell").scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
const hub = await page.evaluate(() => {
  const c = document.getElementById("graph-canvas").getBoundingClientRect();
  const n = window.__ctNodes.find((n) => n.id === "ct");
  return { x: c.left + n.x * c.width, y: c.top + n.y * c.height };
});
await page.mouse.click(hub.x, hub.y);
await page.waitForTimeout(300);
check(
  "clicking a node opens a window",
  (await page.locator(".win").count()) === 1,
);
check(
  "window carries the node title",
  (await page.locator(".win .win-title").innerText()).includes(
    "computer theater",
  ),
);

/* related button opens a second window */
await page.locator(".win-rel button").first().click();
await page.waitForTimeout(200);
check(
  "related buttons open sibling windows",
  (await page.locator(".win").count()) === 2,
);

/* the close button closes its window */
await page.locator(".win").last().locator(".win-close").click();
await page.waitForTimeout(150);
check(
  "close button closes its window",
  (await page.locator(".win").count()) === 1,
);
check(
  "focus returns to the opener after close",
  await page.evaluate(
    () => document.activeElement && document.activeElement !== document.body,
  ),
);

/* escape closes the remaining window */
await page.keyboard.press("Escape");
await page.waitForTimeout(150);
check(
  "escape closes the top window",
  (await page.locator(".win").count()) === 0,
);

/* node index is a keyboard path */
await page.locator(".node-index summary").click();
await page.locator(".index-list button", { hasText: "annie dorsen" }).click();
await page.waitForTimeout(200);
check(
  "index buttons open windows",
  (await page.locator('.win[data-node="dorsen"]').count()) === 1,
);
await page.keyboard.press("Escape");

/* views switch by hash */
await page.locator('.view-tab[data-view="components"]').click();
await page.waitForTimeout(200);
check(
  "components view shows",
  await page.locator("#view-components").isVisible(),
);
check(
  "seven components render",
  (await page.locator(".comp-row").count()) === 7,
);
await page.locator('.view-tab[data-view="manifesto"]').click();
await page.waitForTimeout(200);
check(
  "manifesto view shows",
  await page.locator("#view-manifesto").isVisible(),
);
check(
  "manifesto opens on the body",
  (await page.locator(".man-stanza").first().innerText()).includes(
    "the body will be present",
  ),
);
await page.locator('.view-tab[data-view="graph"]').click();
await page.waitForTimeout(200);
check("graph view returns", await page.locator("#view-graph").isVisible());

/* no horizontal scroll at mobile */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
const hScroll = await page.evaluate(
  () =>
    document.documentElement.scrollWidth >
    document.documentElement.clientWidth + 1,
);
check("no horizontal scroll on mobile", !hScroll);

check(
  "no console/page errors after interactions",
  errors.length === 0,
  errors.join(" | "),
);

await browser.close();
console.log(failed ? "\nsome checks FAILED" : "\nall checks pass");
process.exit(failed);

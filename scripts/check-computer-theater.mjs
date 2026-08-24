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
// The graph is hand-rolled: no charting or force-layout library. The
// site-wide Umami analytics tag is sanctioned and does not count.
const scriptSrcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(
  (m) => m[1],
);
const libSrcs = scriptSrcs.filter((u) => !/umami/.test(u));
check("no external script libraries", libSrcs.length === 0, libSrcs.join(", "));
// Assets must be root-absolute. At oulipo.xyz/computer-theater (no trailing
// slash) a relative "img/x.jpg" resolves to /img/x.jpg and 404s.
const relImgs = [...html.matchAll(/img: "(?!\/)([^"]+)"/g)].map((m) => m[1]);
check(
  "card image paths are root-absolute",
  relImgs.length === 0,
  relImgs.join(", "),
);
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

/* cards carry an external resource link and (where held) a treated image.
   NB: the index <details> is already open from the previous test - clicking
   summary again would toggle it closed. */
const indexOpen = await page
  .locator(".node-index")
  .evaluate((d) => d.open)
  .catch(() => false);
if (!indexOpen) await page.locator(".node-index summary").click();
await page.locator(".index-list button", { hasText: "olia lialina" }).click();
await page.waitForTimeout(400);
const liaWin = page.locator('.win[data-node="lialina"]');
check(
  "card carries an external resource link",
  ((await liaWin.locator(".win-link").getAttribute("href")) || "").includes(
    "teleportacia",
  ),
);
check(
  "card image loads",
  await liaWin
    .locator(".win-img")
    .evaluate((i) => i.complete && i.naturalWidth > 0)
    .catch(() => false),
);
check(
  "card image credits the commons file",
  (
    (await liaWin.locator(".win-img-credit").getAttribute("href")) || ""
  ).includes("commons.wikimedia.org"),
);

/* the open card's node is highlighted on the graph (ring sample) */
const ringHit = await page.evaluate(() => {
  const c = document.getElementById("graph-canvas");
  const ctx = c.getContext("2d");
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const r = c.getBoundingClientRect();
  const n = window.__ctNodes.find((n) => n.id === "lialina");
  const cx = n.x * r.width,
    cy = n.y * r.height,
    rad = n.size + 5;
  for (let a = 0; a < 16; a++) {
    const x = Math.round((cx + Math.cos((a / 16) * Math.PI * 2) * rad) * dpr);
    const y = Math.round((cy + Math.sin((a / 16) * Math.PI * 2) * rad) * dpr);
    const d = ctx.getImageData(x, y, 1, 1).data;
    if (d[3] > 0 && d[0] < 80 && d[1] < 80) return true;
  }
  return false;
});
check("open card highlights its node with a ring", ringHit);
await page.keyboard.press("Escape");

/* hugo ball, added Aug 2026: track 1, one verified resource link, a treated
   commons image, and the wagner edge that carries the gesamtkunstwerk line */
const ballIndexOpen = await page
  .locator(".node-index")
  .evaluate((d) => d.open)
  .catch(() => false);
if (!ballIndexOpen) await page.locator(".node-index summary").click();
await page.locator(".index-list button", { hasText: "hugo ball" }).click();
await page.waitForTimeout(400);
const ballWin = page.locator('.win[data-node="ball"]');
check("hugo ball card opens", (await ballWin.count()) === 1);
check(
  "hugo ball sits on track 1 in 1916",
  await page.evaluate(() => {
    const n = window.__ctNodes.find((x) => x.id === "ball");
    return !!n && n.track === 1 && n.year === 1916;
  }),
);
check(
  "hugo ball links to the cabaret voltaire",
  ((await ballWin.locator(".win-link").getAttribute("href")) || "").includes(
    "cabaretvoltaire.ch",
  ),
);
check(
  "hugo ball card image loads",
  await ballWin
    .locator(".win-img")
    .evaluate((i) => i.complete && i.naturalWidth > 0)
    .catch(() => false),
);
check(
  "hugo ball is wired to wagner, futurists, schlemmer and dixon",
  await page.evaluate(() => {
    const n = window.__ctNodes.find((x) => x.id === "ball");
    return ["wagner", "futurists", "schlemmer", "dixon"].every((id) =>
      (n.links || []).includes(id),
    );
  }),
);
check(
  "hugo ball card offers the wagner jump",
  (await ballWin.locator('.win-rel button[data-open="wagner"]').count()) === 1,
);
await page.keyboard.press("Escape");
await page.waitForTimeout(150);

/* layout modes reorder the graph */
await page.locator('.graph-modes button[data-mode="chrono"]').click();
await page
  .waitForFunction(
    () => window.__ctDebug && window.__ctDebug.running() === false,
    null,
    { timeout: 15000 },
  )
  .catch(() => {});
const chrono = await page.evaluate(() => {
  const g = (id) => window.__ctNodes.find((n) => n.id === id).x;
  return { wagner: g("wagner"), nine: g("nineevenings"), seu: g("seu") };
});
check(
  "chronology mode orders nodes by year",
  chrono.wagner < chrono.nine && chrono.nine < chrono.seu,
);
check(
  "mode button reflects pressed state",
  (await page
    .locator('.graph-modes button[data-mode="chrono"]')
    .getAttribute("aria-pressed")) === "true",
);
await page.locator('.graph-modes button[data-mode="free"]').click();

/* work-in-progress note is visible on the graph view */
check(
  "wip note present on graph view",
  (await page.locator(".graph-wip").innerText())
    .toLowerCase()
    .includes("work in progress"),
);

/* track switches: legend rows show and hide their tracks */
const inkCount = () =>
  page.evaluate(() => {
    const c = document.getElementById("graph-canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 16)
      if (d[i + 3] > 0 && (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200)) n++;
    return n;
  });
// measured in a pinned layout: seats are fixed there, so hiding a track
// strictly removes marks instead of letting the rest spread out
await page.locator('.graph-modes button[data-mode="chrono"]').click();
await page.waitForTimeout(2500);
const inkAll = await inkCount();
await page.locator('.legend-row[data-track="3"]').click();
await page.waitForTimeout(2000);
const inkLess = await inkCount();
check(
  "switching a track off removes it from the graph",
  inkLess < inkAll * 0.95,
);
check(
  "track switch reports its state",
  (await page
    .locator('.legend-row[data-track="3"]')
    .getAttribute("aria-pressed")) === "false",
);
check(
  "hidden track also leaves the node index",
  await page.locator('.index-track[data-track="3"]').isHidden(),
);
const hiddenPt = await page.evaluate(() => {
  const n = window.__ctNodes.find((n) => n.id === "wooster");
  const c = document.getElementById("graph-canvas").getBoundingClientRect();
  return { x: c.left + n.x * c.width, y: c.top + n.y * c.height };
});
await page.mouse.click(hiddenPt.x, hiddenPt.y);
await page.waitForTimeout(250);
check(
  "hidden nodes are not clickable",
  (await page.locator(".win").count()) === 0,
);
await page.locator('.legend-row[data-track="3"]').click();
await page.waitForTimeout(2000);
check("switching a track back on restores it", (await inkCount()) > inkLess);
await page.locator('.graph-modes button[data-mode="free"]').click();
await page.waitForTimeout(500);

/* card images: most cards carry one, and they load */
const imgNodes = await page.evaluate(
  () => window.__ctNodes.filter((n) => n.img).length,
);
check("most cards carry an image", imgNodes >= 30, `only ${imgNodes}`);

/* the subscribe call to action */
check(
  "subscribe CTA links to the substack",
  ((await page.locator(".subscribe-cta").getAttribute("href")) || "").includes(
    "halimmadi.substack.com/subscribe",
  ),
);

/* the dispatches view */
await page.locator('.view-tab[data-view="dispatches"]').click();
await page.waitForTimeout(200);
check(
  "dispatches view shows",
  await page.locator("#view-dispatches").isVisible(),
);
check(
  "dispatches list at least ten posts",
  (await page.locator(".dispatch").count()) >= 10,
);
check(
  "dispatch links point at the substack",
  (
    (await page.locator(".dispatch").first().getAttribute("href")) || ""
  ).includes("halimmadi.substack.com"),
);

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

/* the no-trailing-slash URL must serve working images too */
const noSlash = await browser.newPage({
  viewport: { width: 1440, height: 900 },
});
await noSlash.goto("http://localhost:4242/computer-theater", {
  waitUntil: "networkidle",
});
await noSlash
  .waitForFunction(
    () => window.__ctDebug && window.__ctDebug.running() === false,
    null,
    { timeout: 15000 },
  )
  .catch(() => {});
await noSlash.locator(".node-index summary").click();
await noSlash
  .locator(".index-list button", { hasText: "katie mitchell" })
  .click();
await noSlash.waitForTimeout(800);
check(
  "images load at the URL without a trailing slash",
  await noSlash
    .locator('.win[data-node="mitchell"] .win-img')
    .evaluate((i) => i.complete && i.naturalWidth > 0)
    .catch(() => false),
);
await noSlash.close();

await browser.close();
console.log(failed ? "\nsome checks FAILED" : "\nall checks pass");
process.exit(failed);

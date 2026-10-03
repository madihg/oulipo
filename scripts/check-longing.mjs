#!/usr/bin/env node
// Ship checks for /longing/ ("I wish you were").
// Part 1 is static and needs nothing. Part 2 is a playwright e2e against the
// local static server on port 4242 (launch.json: oulipo-static); pass
// --static to skip it.
import { readFileSync, existsSync } from "node:fs";

const dir = new URL("../longing/", import.meta.url);
const html = readFileSync(new URL("index.html", dir), "utf8");

let failed = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "ok " : "FAIL"} ${name}${ok ? "" : "  " + extra}`);
  if (!ok) failed = 1;
}

/* ---------- static ---------- */

/* Zero CSS: the page is HTML and JavaScript only. Colour comes from
   <font color>, size from <font size>, layout from the browser's defaults. */
check("no CSS: no <style> element", !/<style[\s>]/i.test(html));
check("no CSS: no style attributes", !/\sstyle\s*=/i.test(html));
check("no CSS: no stylesheet links", !/rel=["']?stylesheet/i.test(html));
check(
  "no CSS: the script never writes styles",
  !/\.style\b|cssText|insertRule|CSSStyleSheet|adoptedStyleSheets/.test(html),
);
check(
  "no custom fonts",
  !/@font-face|\.woff2?\b/.test(html) && !existsSync(new URL("fonts", dir)),
);

/* One prefix rule for /longing, /longing/ and every file under it. A
   "/longing/:path*" rule missed "/longing/" itself on Vercel (seen on the
   Oct 3 preview). */
const vercel = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
);
const robots = (vercel.headers || []).filter(
  (h) =>
    h.source === "/longing(.*)" &&
    h.headers.some((x) => x.key === "X-Robots-Tag" && /noindex/.test(x.value)),
);
check(
  "unlisted: X-Robots-Tag noindex on /longing(.*) in vercel.json",
  robots.length === 1,
);
check("no robots meta travels with the file", !/name="robots"/.test(html));
check(
  "title is the notebook line",
  /<title>I wish you were - Halim Madi<\/title>/.test(html),
);
check("no em dashes", !html.includes("\u2014"));
check(
  "no exclamation marks in copy",
  !/[a-z]!["<\s]/i.test(
    html
      .replace(/<!doctype html>/i, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/!==|!=|!S\.|!p\.|!about|!open|!reduced|!down|![a-zA-Z_(]/g, ""),
  ),
);
const PALETTE = new Set(["1c39e8", "666666", "ffffff"]);
const hexes = [...html.matchAll(/(?:#|%23)([0-9a-f]{6})\b/gi)].map((m) =>
  m[1].toLowerCase(),
);
const off = [...new Set(hexes.filter((h) => !PALETTE.has(h)))];
check("closed palette (blue, grey, white)", off.length === 0, off.join(", "));
check(
  "no script or stylesheet from another host",
  !/<(script|link)[^>]+(src|href)="https?:/i.test(html),
);
check("no analytics in the piece", !/umami|gtag|analytics/i.test(html));
check("reduced motion handled", /prefers-reduced-motion/.test(html));
const parts = [...html.matchAll(/\n\s+key: "([a-z]+)",/g)].map((m) => m[1]);
check("ten parts", parts.length === 10, parts.join(","));
check(
  "every part cites its passage",
  [...html.matchAll(/\n\s+after: "(Eros the Bittersweet|Plainwater), /g)]
    .length === 10,
);

/* Every part has a tip: short, lowercase, plain. */
const tips = [...html.matchAll(/\n\s+tip:\s*"([^"]+)",/g)].map((m) => m[1]);
check("ten tips", tips.length === 10, String(tips.length));
check(
  "tips are short (30 words or fewer) and start lowercase",
  tips.every((t) => t.split(/\s+/).length <= 30 && /^[a-z]/.test(t)),
  tips
    .filter((t) => t.split(/\s+/).length > 30 || !/^[a-z]/.test(t))
    .join(" | "),
);

/* The sentence above each program. Eight are Halim's: from his notebook, from
   the note he wrote for "The Reach", or rewritten by him on Oct 3 2026. Two
   are Carson's, cited and shown in quotation marks: the eight words the Gone
   couplet prints, and five words from "Ruse" (his Kindle highlight, loc 416).
   A sentence not on this list fails the build. */
const SENTENCES = new Map([
  [
    "Contemplating Whether joy and pain are neighbors Or closer Lovers",
    "halim",
  ],
  ["the lover wants what he does not have", "carson"],
  ["Conjoined they are held apart.", "carson"],
  [
    "Lover, beloved, and the space between. It halves every line and never reaches zero.",
    "halim",
  ],
  ["The moving frontier of intimacy.", "halim"],
  ["The most dangerous immigrant is the one who loves you.", "halim"],
  [
    "My Arabic is cryogenic, a frozen version of the 2000s\u2019 Lebanese.",
    "halim",
  ],
  ["How long has it been darling? A year and change. And change", "halim"],
  ["Didn\u2019t abandon you. Had to leave", "halim"],
  ["The day known as tomorrow", "halim"],
  ["Careful on the road", "halim"],
  ["I miss you already.", "halim"],
]);
const shown = [...html.matchAll(/\n\s+line2?:\s*"([^"]+)",/g)].map((m) => m[1]);
check("twelve sentences", shown.length === 12, String(shown.length));
check(
  "every sentence is on the list",
  shown.every((t) => SENTENCES.has(t)),
  shown.filter((t) => !SENTENCES.has(t)).join(" | "),
);
const quotedLines = [
  ...html.matchAll(/\n\s+line:\s*"([^"]+)",\n\s+quoted: true,/g),
].map((m) => m[1]);
check(
  "exactly the two Carson sentences are marked as quotes",
  quotedLines.length === 2 &&
    quotedLines.every((t) => SENTENCES.get(t) === "carson"),
  quotedLines.join(" | "),
);
check(
  "each Carson sentence is under 15 words",
  [...SENTENCES]
    .filter(([, w]) => w === "carson")
    .every(([t]) => t.split(/\s+/).length < 15),
);

const links = [...html.matchAll(/<a\s+href="https:[^>]*>/g)].map((m) => m[0]);
check(
  "outbound links open outside the frame",
  links.length === 5 &&
    links.every((a) => /target="_blank"/.test(a) && /rel="noopener"/.test(a)),
  links.join(" "),
);
check(
  "the Gone couplet is ported verbatim",
  html.includes(
    `'import itertools as t;w="the lover wants what he does not have".split()'`,
  ) && html.includes(`"for i in t.count():print(*w[:8-i%8])"`),
);
check(
  "the Reach variation is shown as its code",
  html.includes(`'while 1:print(("lover"+" "*g)[:g]+"beloved");g=g//2 or 1'`),
);

if (process.argv.includes("--static")) {
  console.log(failed ? "\nsome checks FAILED" : "\nstatic checks pass");
  process.exit(failed);
}

/* ---------- e2e ---------- */
const { chromium } = await import("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
const external = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("request", (r) => {
  const u = r.url();
  if (!u.startsWith("http://localhost:4242") && !u.startsWith("data:"))
    external.push(u);
});
await page.goto("http://localhost:4242/longing/", { waitUntil: "load" });

const L = (fn, arg) => page.evaluate(fn, arg);
const rows = () => L(() => window.__longing.rows());
const st = () => L(() => window.__longing.state());

check(
  "self-contained: no request leaves the folder",
  external.length === 0,
  external.join(", "),
);
check(
  "no CSS at runtime: no stylesheets, no style attributes",
  await L(
    () =>
      document.styleSheets.length === 0 && !document.querySelector("[style]"),
  ),
);
check("ten part buttons", (await page.locator("#parts button").count()) === 10);
check(
  "the sentence is in italic",
  await L(() => document.getElementById("said-line").tagName === "I"),
);

/* every part draws something, names its source and has a tip */
for (let i = 0; i < 10; i++) {
  await page.locator("#parts button").nth(i).click();
  await L(() => window.__longing.step(3));
  const ink = (await rows()).join("").trim().length;
  const after = await page.locator("#said-after").innerText();
  const tip = await page.locator("#tip-summary").getAttribute("title");
  check(
    `part ${i + 1} draws, cites and has a tip`,
    ink > 0 && /anne carson/i.test(after) && tip && tip.length > 20,
    `${ink} / ${after} / ${tip}`,
  );
}

/* the sentence is there at once, not typed */
await L(() => window.__longing.show(6));
check(
  "the sentence appears whole at once",
  (await page.locator("#said-line").textContent()) ===
    "How long has it been darling? A year and change. And change",
);

/* tip: the title shows on hover, a click opens the same text */
await page.locator("#tip-summary").click();
check(
  "a click on the tip opens it",
  (await L(() => document.getElementById("tip").open)) &&
    (await page.locator("#tip-text").textContent()) ===
      (await page.locator("#tip-summary").getAttribute("title")),
);
await L(() => window.__longing.show(7));
check(
  "the tip closes when the part changes",
  !(await L(() => document.getElementById("tip").open)),
);

/* 01: bitter on top, sweet below */
await L(() => {
  window.__longing.show(0);
  window.__longing.step(2);
});
{
  const r = await rows();
  check(
    "01 bitter above, sweet below",
    r[3].trim() === "bitter" && r[9].trim() === "sweet",
    `${r[3]} / ${r[9]}`,
  );
}

/* 02: the sentence loses a word a line, then comes back; code above; smaller */
await L(() => {
  window.__longing.show(0);
});
const size01 = Number(await page.locator("#size").getAttribute("size"));
await L(() => {
  window.__longing.show(1);
  window.__longing.step(41);
});
const gone = (await rows()).map((r) => r.trim()).filter(Boolean);
check(
  "02 gone: 8 words down to 1, then the sentence returns",
  gone[0] === "the lover wants what he does not have" &&
    gone[7] === "the" &&
    gone[8] === gone[0],
  gone.join(" | "),
);
check(
  "02 is quoted and cited as Carson's",
  (await page.locator("#said-line").textContent()) ===
    "\u201cthe lover wants what he does not have\u201d" &&
    /^Anne Carson, /.test(await page.locator("#said-after").innerText()),
);
check(
  "02 code sits in a box above the screen",
  await L(() => {
    const box = document.getElementById("code");
    return (
      !box.hidden &&
      box.tagName === "FIELDSET" &&
      box.compareDocumentPosition(document.getElementById("grid")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    );
  }),
);
check(
  "02 prints smaller than 01",
  Number(await page.locator("#size").getAttribute("size")) < size01,
);

/* 03: Carson's sentence */
await L(() => window.__longing.show(2));
check(
  "03 shows Carson's sentence from Ruse",
  (await page.locator("#said-line").textContent()) ===
    "\u201cConjoined they are held apart.\u201d" &&
    /Ruse/.test(await page.locator("#said-after").innerText()),
);

/* 04: they overlap, lover is cut short, but it never disappears */
await L(() => {
  window.__longing.show(3);
  window.__longing.step(900);
});
const reach = (await rows()).map((r) => r.replace(/\s+$/, "")).filter(Boolean);
check(
  "04 they overlap",
  reach.some((r) => r === "lovebeloved" || r === "lobeloved"),
  reach.join(" | "),
);
check(
  "04 lover never disappears",
  reach.every((r) => !r.startsWith("beloved")) && reach.at(-1) === "lbeloved",
  reach.join(" | "),
);
check(
  "04 the approach stays on screen",
  reach.includes("lobeloved"),
  reach.join(" | "),
);
await L(() => window.__longing.show(3));
const x0 = (await st()).lines[0];
await L(() => window.__longing.step(20));
const live = (await st()).live;
check(
  "04 the first step is a slow slide, not a jump",
  x0 === 33 && live && live.pos > live.to,
  JSON.stringify(live),
);

/* 05: the edge follows and never closes, then becomes a border */
const column = async () => {
  const s = await st();
  return (await rows()).map((r) => r[s.e]).join("");
};
await L(() => {
  const l = window.__longing;
  l.show(4);
  l.act(26);
  l.act(26);
  l.step(8);
});
check("05 the edge before the hinge", (await column()).includes("edge"));
check(
  "05 one sentence before the hinge",
  (await page.locator("#said-two").innerText()).trim() === "",
);
await L(() => {
  const l = window.__longing;
  l.act(26);
  l.step(30);
});
check("05 the edge turns into a border", (await column()).includes("border"));
check(
  "05 the second sentence arrives with the border",
  (await page.locator("#said-two").innerText()) ===
    "The most dangerous immigrant is the one who loves you.",
);
check(
  "05 status lines are gone",
  (await page.locator("#status").count()) === 0,
);

/* 06: longing in three alphabets */
await L(() => {
  const l = window.__longing;
  l.show(5);
  l.act();
  l.act();
  l.act();
  l.step(3);
});
check(
  "06 alphabet ends in Arabic",
  (await rows()).join("").includes("\u062d\u0646\u064a\u0646"),
);
await L(() => {
  window.__longing.show(6);
  window.__longing.step(2);
});
check(
  "06 the Arabic word is gone from the next part",
  !(await rows()).join("").includes("\u062d\u0646\u064a\u0646"),
);

/* 07: the halves fit at first */
await L(() => window.__longing.show(6));
check(
  "07 the halves fit at first",
  await L(() => {
    const s = window.__longing.state();
    return s.L.every((v, i) => v === s.R[i]);
  }),
);

/* 08: holding melts it */
await L(() => {
  const l = window.__longing;
  l.show(7);
  l.state().hold = true;
  l.step(200);
});
check("08 the ice melts when held", (await st()).cells.length === 0);

/* 09: here is San Francisco */
await L(() => {
  window.__longing.show(8);
  window.__longing.step(1);
});
{
  const r = (await rows()).join("\n");
  const clocks = r.match(/\d\d:\d\d:\d\d/g) || [];
  const pacific = await L(() =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Los_Angeles",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })
      .format(new Date())
      .replace(/^24/, "00"),
  );
  check("09 two clocks", clocks.length === 2, clocks.join(" "));
  check(
    "09 here is Pacific time",
    clocks[0] && clocks[0].slice(0, 5) === pacific,
    `${clocks[0]} vs ${pacific}`,
  );
}

/* 10: the i crosses the water, the sentence trails behind, then the definition */
await L(() => {
  window.__longing.show(9);
  window.__longing.step(2);
});
check(
  "10 opens on the phrase alone",
  (await page.locator("#said-line").textContent()) === "Careful on the road" &&
    (await page.locator("#said-two").innerText()).trim() === "",
);
await L(() => {
  const l = window.__longing;
  for (let k = 0; k < 8; k++) l.act();
  l.step(2);
});
{
  const r = await rows();
  check(
    "10 each step leaves a line",
    r.some((x) => x.includes("is room for fear.")) &&
      r.some((x) => x.includes("I miss you already,")),
  );
  check(
    "10 no definition before the i crosses",
    (await page.locator("#said-two").innerText()).trim() === "",
  );
}
await L(() => {
  window.__longing.act();
  window.__longing.step(2);
});
{
  const r = await rows();
  check(
    "10 the i reaches the far bank",
    r[10].trim() === "i",
    JSON.stringify(r[10]),
  );
  check(
    "10 the definition appears once it crosses",
    (await page.locator("#said-two").innerText()) ===
      "phrase, Lebanese. I miss you already.",
    await page.locator("#said-two").innerText(),
  );
}
await L(() => {
  window.__longing.act();
  window.__longing.step(2);
});
check(
  "10 a press after crossing walks again",
  (await st()).k === 0 &&
    (await page.locator("#said-two").innerText()).trim() === "",
);

/* the bottom right corner is left clear for a host page's own controls */
const nextBox = await page.locator("#next").boundingBox();
check(
  "next is not in the bottom right corner",
  nextBox && nextBox.x + nextBox.width < 1280 - 120,
  JSON.stringify(nextBox),
);

/* about: a native dialog, links out, Escape closes, focus returns */
await page.locator("#about-btn").click();
check(
  "about opens as a dialog",
  await L(() => document.getElementById("about").open),
);
check(
  "about lists ten sources",
  (await page.locator("#about-parts li").count()) === 10,
);
check(
  "about links to halimmadi.com",
  (await page.locator('#about a[href="https://www.halimmadi.com"]').count()) ===
    1,
);
await page.keyboard.press("Shift+Tab");
check(
  "shift+tab stays inside the about panel",
  await L(() => !!document.activeElement.closest("#about")),
);
for (let k = 0; k < 8; k++) await page.keyboard.press("Tab");
check(
  "tab stays inside the about panel",
  await L(() => !!document.activeElement.closest("#about")),
);
await page.keyboard.press("Escape");
check(
  "escape closes about",
  !(await L(() => document.getElementById("about").open)),
);
check(
  "focus returns to the ? button",
  await L(
    () => document.activeElement && document.activeElement.id === "about-btn",
  ),
);

/* keys */
await L(() => window.__longing.show(0));
await page.locator("body").press("ArrowRight");
check(
  "arrow keys change the part",
  (await L(() => window.__longing.current())) === 1,
);
await page.goto("http://localhost:4242/longing/#4", { waitUntil: "load" });
await L(() => {
  location.hash = "#7";
});
await page.waitForTimeout(150);
check(
  "a new #number switches the part",
  (await L(() => window.__longing.current())) === 6,
);

/* after a mouse click on a number, Space acts on the screen instead of the button */
await page.locator("#parts button").nth(5).click();
const before06 = (await st()).i;
await page.keyboard.press("Space");
check(
  "space acts on the part after a click on its number",
  before06 === 0 &&
    (await st()).i === 1 &&
    (await L(() => window.__longing.current())) === 5,
);
check(
  "the screen can take focus",
  await L(() => document.activeElement === document.getElementById("grid")),
);

/* ? from the screen, then Escape: focus goes back to the screen */
await page.keyboard.press("?");
check(
  "? opens the about panel from the screen",
  await L(() => document.getElementById("about").open),
);
await page.keyboard.press("Escape");
check(
  "escape returns focus to the screen",
  await L(() => document.activeElement === document.getElementById("grid")),
);

/* screen readers: the sentence region is live, the screen has a description */
await L(() => window.__longing.show(2));
check(
  "the sentence region is live",
  (await page.locator("#said").getAttribute("aria-live")) === "polite",
);
check(
  "the screen is described for screen readers",
  /^Three words form a triangle/.test(
    await page.locator("#alt").textContent(),
  ) && (await page.locator("#grid").getAttribute("aria-describedby")) === "alt",
);

/* phones and short windows: no sideways scroll, the screen fits the width */
for (const [w, h] of [
  [390, 844],
  [360, 640],
  [844, 390],
  [568, 320],
]) {
  await page.setViewportSize({ width: w, height: h });
  for (const part of [0, 1, 3, 9]) {
    await L((n) => {
      window.__longing.show(n);
      window.__longing.step(3);
    }, part);
    const fits = await L(() => {
      const g = document.getElementById("size").getBoundingClientRect();
      return (
        document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1 &&
        g.right <= window.innerWidth
      );
    });
    check(`part ${part + 1} fits the width at ${w}x${h}`, fits);
  }
}

check("no console or page errors", errors.length === 0, errors.join(" | "));

/* reduced motion: every press still does something */
const calm = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  reducedMotion: "reduce",
});
await calm.goto("http://localhost:4242/longing/#3", { waitUntil: "load" });
const calmState = () => calm.evaluate(() => window.__longing.state());
await calm.locator("#grid").focus();
await calm.keyboard.press("Space");
check(
  "reduced motion 03: a press closes the triangle",
  (await calmState()).phase === "shut",
);
await calm.keyboard.press("Space");
check(
  "reduced motion 03: the next press opens it",
  (await calmState()).phase === "open",
);
await calm.evaluate(() => window.__longing.show(3));
await calm.keyboard.press("Space");
check(
  "reduced motion 04: a press prints the next line",
  (await calmState()).lines.length === 2,
);
await calm.evaluate(() => window.__longing.show(7));
await calm.locator("#grid").click();
{
  const s = await calmState();
  const left = s.cells.length / s.total;
  check(
    "reduced motion 08: one press takes a few letters, not the word",
    left >= 0.8 && left < 1 && !s.hold,
    String(left),
  );
}
await calm.close();

await browser.close();
console.log(failed ? "\nsome checks FAILED" : "\nall checks pass");
process.exit(failed);

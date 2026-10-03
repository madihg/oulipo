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
/* Unlisted on oulipo.xyz through a response header, not a meta tag: the same
   folder goes to the journal, and their hosted copy should be indexable. */
const vercel = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
);
/* One prefix rule for /longing, /longing/ and every file under it. A
   "/longing/:path*" rule missed "/longing/" itself on Vercel (seen on the
   Oct 3 preview). */
const robots = (vercel.headers || []).filter(
  (h) =>
    h.source === "/longing(.*)" &&
    h.headers.some((x) => x.key === "X-Robots-Tag" && /noindex/.test(x.value)),
);
check(
  "unlisted: X-Robots-Tag noindex on /longing(.*) in vercel.json",
  robots.length >= 1,
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
const PALETTE = new Set(["fbfbf9", "0b0b0d", "1c39e8", "b8bcc2"]);
const hexes = [...html.matchAll(/(?:#|%23)([0-9a-f]{6})\b/gi)].map((m) =>
  m[1].toLowerCase(),
);
const off = [...new Set(hexes.filter((h) => !PALETTE.has(h)))];
check("closed palette", off.length === 0, off.join(", "));
check(
  "fonts are bundled, not fetched",
  !/fonts\.googleapis|fonts\.gstatic/.test(html),
);
check(
  "font files present",
  existsSync(new URL("fonts/vt323-400.woff2", dir)) &&
    existsSync(new URL("fonts/jetbrains-mono.woff2", dir)),
);
check("font licence present", existsSync(new URL("fonts/OFL.txt", dir)));
check(
  "no script or style loaded from another host",
  !/<(script|link)[^>]+(src|href)="https?:/i.test(html),
);
check("no analytics in the piece", !/umami|gtag|analytics/i.test(html));
check("reduced motion handled", /prefers-reduced-motion/.test(html));
check(
  "dim ink passes AA (0.58 alpha, 4.7:1 on paper)",
  /--ink-dim: rgba\(11, 11, 13, 0\.58\)/.test(html) && !/--ink-45/.test(html),
);
check(
  "the typed sentence is not a live region",
  !/class="said"[^>]*aria-live/.test(html) &&
    /id="live" aria-live="polite"/.test(html),
);
check(
  "focus ring",
  /:focus-visible\s*{\s*outline: 2px solid var\(--blue\)/.test(html),
);
const parts = [...html.matchAll(/\n\s+key: "([a-z]+)",/g)].map((m) => m[1]);
check("ten parts", parts.length === 10, parts.join(","));
check(
  "every part cites its passage",
  [...html.matchAll(/\n\s+after: "(Eros the Bittersweet|Plainwater), /g)]
    .length === 10,
);
/* Carson is in copyright: exactly one sentence of hers is in the piece (the
   eight words Halim's "Gone" couplet prints). Every other quote slot must
   stay empty until filled by hand from a copy of the book. */
check(
  "quote slots are empty",
  [...html.matchAll(/\n\s+quote: "([^"]*)",/g)].every((m) => m[1] === ""),
);
/* The sentence above each program is Halim's own, copied character for
   character: eight from his "[material] Poetry" notebook, two (02, 04) from
   the notes he wrote for the couplets. A sentence that is not in this list
   is not his and must not ship under his name. */
const HIS = new Set([
  "Contemplating Whether joy and pain are neighbors Or closer Lovers",
  "Her sentence loses a word a line, then wants again.",
  "In a world of twos, the other is always one doubtful thought away.",
  "Lover, beloved, and the space between. It halves every line and never reaches zero.",
  "The frontier of intimacy.",
  "The most dangerous immigrant is the one who loves you.",
  "How my Arabic is frozen in 15 years ago. How it is a cryogenic version of Arabic.",
  "How long has it been darling? A year and change. And change",
  "I didn\u2019t abandon you I had to leave",
  "The day known as tomorrow",
  "Be careful on the road.",
  "It means I miss you already, I love you but my language can\u2019t stomach affection anymore and all I have is room for fear.",
]);
const shown = [...html.matchAll(/\n\s+line2?:\s*"([^"]+)",/g)].map((m) => m[1]);
check("twelve sentences", shown.length === 12, String(shown.length));
check(
  "every sentence is one of Halim's own, verbatim",
  shown.every((t) => HIS.has(t)),
  shown.filter((t) => !HIS.has(t)).join(" | "),
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
  (html.includes("for i in t.count():print(*w[:8-i%8])") &&
    html.includes(
      'while 1:print(\\"lover\\"+\\" \\"*g+\\"beloved\\");g=g//2 or 1',
    )) ||
    html.includes(`'while 1:print("lover"+" "*g+"beloved");g=g//2 or 1'`),
);

if (process.argv.includes("--static")) {
  console.log(failed ? "\nsome checks FAILED" : "\nstatic checks pass");
  process.exit(failed);
}

/* ---------- e2e ---------- */
const { chromium } = await import("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
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
await page.evaluate(() => document.fonts.ready);

const L = (fn, arg) => page.evaluate(fn, arg);
const status = () => page.locator("#status").innerText();

check(
  "self-contained: no request leaves the folder",
  external.length === 0,
  external.join(", "),
);
check("ten part buttons", (await page.locator("#parts button").count()) === 10);

/* every part draws something and names its source */
for (let i = 0; i < 10; i++) {
  await page.locator("#parts button").nth(i).click();
  await L(() => window.__longing.step(3));
  const ink = await L(
    () =>
      window.__longing.rows().join("").trim().length +
      document.getElementById("free").textContent.length,
  );
  const after = await page.locator("#said-after").innerText();
  check(
    `part ${i + 1} draws and cites`,
    ink > 0 && /anne carson/i.test(after),
    `${ink} / ${after}`,
  );
}

/* 02: the sentence loses a word a line, then wants again */
await L(() => {
  window.__longing.show(1);
  window.__longing.step(41);
});
const gone = await L(() =>
  window.__longing
    .rows()
    .map((r) => r.trim())
    .filter(Boolean),
);
check(
  "02 gone: 8 words down to 1, then the sentence returns",
  gone[0] === "the lover wants what he does not have" &&
    gone[7] === "the" &&
    gone[8] === gone[0],
  gone.join(" | "),
);

/* 04: the gap halves and never reaches zero */
await L(() => {
  window.__longing.show(3);
  window.__longing.step(70);
});
const gaps = await L(() =>
  window.__longing
    .rows()
    .filter((r) => r.trim())
    .map((r) => r.indexOf("beloved") - 5),
);
check(
  "04 reach: gap halves to 1 and stays there",
  gaps.every((g) => g >= 1) && gaps.at(-1) === 1,
  gaps.join(","),
);

/* 05: the edge becomes a border after three presses */
await L(() => {
  const l = window.__longing;
  l.show(4);
  l.act(26);
  l.act(26);
  l.step(4);
});
check("05 edge before the hinge", /^EDGE AT COLUMN/i.test(await status()));
await L(() => {
  const l = window.__longing;
  l.act(26);
  l.step(25);
});
check("05 edge turns into border", /^BORDER AT COLUMN/i.test(await status()));
check("05 the gap never closes", /GAP 1$/i.test(await status()));

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
  (await page.locator("#free").innerText()).trim() ===
    "\u062d\u0646\u064a\u0646",
);
await L(() => window.__longing.show(6));
check(
  "06 Arabic overlay is hidden elsewhere",
  !(await page.locator("#free").isVisible()),
);

/* 07: the halves stop fitting */
await L(() => {
  const l = window.__longing;
  l.show(6);
  l.act();
  l.step(8);
});
check("07 symbolon fits at first", /6 OF 6/i.test(await status()));

/* 08: holding melts it */
await L(() => {
  const l = window.__longing;
  l.show(7);
  l.state().hold = true;
  l.step(200);
});
check("08 ice melts when held", /^MELTED$/i.test(await status()));

/* 09: two live clocks */
await L(() => {
  const l = window.__longing;
  l.show(8);
  l.step(1);
});
const clocks =
  (await L(() => window.__longing.rows().join("\n"))).match(
    /\d\d:\d\d:\d\d/g,
  ) || [];
check("09 two clocks", clocks.length === 2, clocks.join(" "));

/* 10: the word stays 24 steps away and changes */
await L(() => {
  const l = window.__longing;
  l.show(9);
  for (let k = 0; k < 6; k++) l.act();
  l.step(2);
});
check(
  "10 water: destination changes, distance does not",
  /MOTHER IS 24 STEPS AWAY/i.test(await status()),
);

/* 10: the second sentence arrives when the word first changes */
await L(() => {
  const l = window.__longing;
  l.show(9);
  for (let k = 0; k < 4; k++) l.act();
});
await page.waitForTimeout(700);
check(
  "10 opens on the road",
  (await page.locator("#said-line").innerText()) === "Be careful on the road.",
);
await L(() => window.__longing.act());
await page.waitForTimeout(2600);
check(
  "10 says what it means at step five",
  /^It means I miss you already/.test(
    await page.locator("#said-line").innerText(),
  ),
  await page.locator("#said-line").innerText(),
);

/* the bottom right corner is left clear for a host page's own controls */
const nextBox = await page.locator("#next").boundingBox();
check(
  "next is not in the bottom right corner",
  nextBox && nextBox.x + nextBox.width < 1280 - 120,
  JSON.stringify(nextBox),
);

/* about: opens, links out, Escape closes, focus returns */
await page.locator("#about-btn").click();
check("about opens", await page.locator("#about").isVisible());
check(
  "about lists ten sources",
  (await page.locator("#about-parts li").count()) === 10,
);
check(
  "about links to halimmadi.com",
  (await page.locator('#about a[href="https://www.halimmadi.com"]').count()) ===
    1,
);
await page.keyboard.press("Escape");
check("escape closes about", !(await page.locator("#about").isVisible()));
check(
  "focus returns to the ? button",
  await L(
    () => document.activeElement && document.activeElement.id === "about-btn",
  ),
);

/* about: Tab stays inside the panel */
await page.locator("#about-btn").click();
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

/* keys */
await L(() => window.__longing.show(0));
await page.locator("body").press("ArrowRight");
check(
  "arrow keys change the part",
  (await L(() => window.__longing.current())) === 1,
);

/* after a mouse click on a number, Space acts on the screen instead of the button */
await page.locator("#parts button").nth(5).click();
await L(() => window.__longing.step(2));
const before06 = await status();
await page.keyboard.press("Space");
await L(() => window.__longing.step(2));
check(
  "space acts on the part after a click on its number",
  (await L(() => window.__longing.current())) === 5 &&
    before06 === "ENGLISH" &&
    /LATIN LETTERS/i.test(await status()),
  `${before06} -> ${await status()}`,
);
check(
  "the screen can take focus",
  await L(() => document.activeElement === document.getElementById("stage")),
);

/* ? from the screen, then Escape: focus goes back to the screen, so Space acts again */
await page.locator("#stage").focus();
await page.keyboard.press("?");
check(
  "? opens the about panel from the screen",
  await page.locator("#about").isVisible(),
);
await page.keyboard.press("Escape");
check(
  "escape returns focus to the screen",
  await L(() => document.activeElement === document.getElementById("stage")),
);

/* a key press is answered out loud, once */
await L(() => window.__longing.show(6));
await page.locator("#stage").focus();
await page.keyboard.press("Space");
await page.waitForTimeout(1300);
check(
  "the result of a key press is announced",
  /^(together|apart)\b/i.test(await page.locator("#live").textContent()),
  await page.locator("#live").textContent(),
);

/* the screen reader hears each sentence once, whole */
await L(() => window.__longing.show(2));
check(
  "the live region carries the whole sentence and the description",
  /^Part 3 of 10\. In a world of twos, the other is always one doubtful thought away\. Three words form a triangle/.test(
    await page.locator("#live").textContent(),
  ),
);

/* the sentence box holds its height while the sentence is typed */
await L(() => window.__longing.show(9));
const h0 = await L(() => document.getElementById("said").offsetHeight);
await L(() => {
  for (let k = 0; k < 5; k++) window.__longing.act();
});
await page.waitForTimeout(2600);
const h1 = await L(() => document.getElementById("said").offsetHeight);
check(
  "the screen does not jump when the second sentence arrives",
  h0 === h1,
  `${h0} -> ${h1}`,
);

/* mobile */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
check(
  "no horizontal scroll on mobile",
  !(await L(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  )),
);
check(
  "the 40-column screen fits a phone",
  await L(
    () =>
      document.getElementById("grid").getBoundingClientRect().width <=
      window.innerWidth,
  ),
);

/* phones: ten numbers on one row */
for (const [w, h] of [
  [390, 844],
  [360, 640],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(250);
  const tops = await L(() =>
    [...document.querySelectorAll("#parts button")].map((b) =>
      Math.round(b.getBoundingClientRect().top),
    ),
  );
  check(
    `ten part buttons on one row at ${w}x${h}`,
    new Set(tops).size === 1,
    tops.join(","),
  );
}

/* short windows and small frames: the screen stays inside its stage */
for (const [w, h] of [
  [844, 390],
  [640, 360],
  [568, 320],
]) {
  await page.setViewportSize({ width: w, height: h });
  for (const part of [0, 1, 3, 9]) {
    await L((n) => {
      window.__longing.show(n);
      window.__longing.step(3);
    }, part);
    await page.waitForTimeout(120);
    const over = await L(() => {
      const g = document.getElementById("grid").getBoundingClientRect();
      const st = document.getElementById("stage").getBoundingClientRect();
      return Math.max(
        st.top - g.top,
        g.bottom - st.bottom,
        st.left - g.left,
        g.right - st.right,
      );
    });
    check(
      `part ${part + 1} fits its stage at ${w}x${h}`,
      over <= 1,
      `overhang ${over.toFixed(1)}px`,
    );
  }
}

check("no console or page errors", errors.length === 0, errors.join(" | "));

/* reduced motion: every part still answers a press */
const calm = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  reducedMotion: "reduce",
});
await calm.goto("http://localhost:4242/longing/#3", { waitUntil: "load" });
await calm.evaluate(() => document.fonts.ready);
const calmStatus = () => calm.locator("#status").innerText();
await calm.keyboard.press("Space");
check(
  "reduced motion 03: a press closes the triangle",
  /POINTS 2\. DISTANCE 0/i.test(await calmStatus()),
  await calmStatus(),
);
await calm.keyboard.press("Space");
check(
  "reduced motion 03: the next press opens it",
  /POINTS 3/i.test(await calmStatus()),
  await calmStatus(),
);
await calm.evaluate(() => window.__longing.show(7));
await calm.locator("#stage").click();
const left = Number(((await calmStatus()).match(/(\d+)% LEFT/i) || [])[1]);
check(
  "reduced motion 08: one press takes a few letters, not the word",
  left >= 80 && left < 100 && /NOT HOLDING/i.test(await calmStatus()),
  await calmStatus(),
);
await calm.close();

await browser.close();
console.log(failed ? "\nsome checks FAILED" : "\nall checks pass");
process.exit(failed);

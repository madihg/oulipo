#!/usr/bin/env node
// Full-page screenshots of the Kitchen Lab landing (desktop + mobile).
// Assumes a static server on :4242 (python3 -m http.server 4242).
// Usage: node scripts/screenshot-landing.mjs [outDir]

import { chromium } from "playwright";

const out = process.argv[2] || "Assets/screenshots";
const base = "http://localhost:4242/";

const shots = [
  { name: "kitchen-lab-modern-signal-desktop", width: 1440, height: 900 },
  { name: "kitchen-lab-modern-signal-mobile", width: 390, height: 844 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: 2,
  });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${s.name}.png`, fullPage: true });
  console.log(`${out}/${s.name}.png`);
  await page.close();
}
await browser.close();

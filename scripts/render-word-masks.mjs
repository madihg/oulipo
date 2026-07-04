#!/usr/bin/env node
// Render Arabic words as transparent glyph masks using the browser's text
// shaping (PIL cannot shape Arabic without libraqm). System Diwan Thuluth.
// Usage: node scripts/render-word-masks.mjs <outDir>

import { chromium } from "playwright";

const out = process.argv[2];
const WORDS = [
  ["oulipo-ar", "أوليبو"],
  ["matbakh", "مطبخ"],
  ["mukhtabar", "مختبر"],
  ["kitchenlab", "مختبر المطبخ"],
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 2400, height: 1200 },
});
for (const [name, word] of WORDS) {
  await page.setContent(
    `<body style="margin:0;background:transparent">
       <div id="w" dir="rtl" lang="ar" style="font-family:'Diwan Thuluth';
         font-size:360px;color:#000;display:inline-block;
         line-height:1.6;padding:60px">${word}</div>
     </body>`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page
    .locator("#w")
    .screenshot({ path: `${out}/mask-${name}.png`, omitBackground: true });
  console.log(name);
}
await browser.close();

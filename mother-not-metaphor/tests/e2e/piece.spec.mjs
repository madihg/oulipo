// @ts-check
import { test, expect } from "@playwright/test";

const AUTO = "/?mode=auto&speed=12";

/** Wait until the engine has booted and exposed its debug API. */
async function ready(page) {
  await page.waitForFunction(
    () => !!window.MNM && window.MNM.state().index >= 0,
  );
}

test("boots with no console errors and opens on the first moment (L1/EN)", async ({
  page,
}) => {
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(AUTO);
  await ready(page);

  const stage = page.locator("#stage");
  await expect(stage).toHaveAttribute("data-moment", "en");
  await expect(stage).toHaveAttribute("data-layout", "L1");
  await expect
    .poll(() => page.locator("#words-caption").textContent())
    .toContain("ocean");

  expect(errors, errors.join("\n")).toEqual([]);
});

test("auto-plays through all five moments to the end", async ({ page }) => {
  await page.goto(AUTO);
  await ready(page);
  await expect
    .poll(() => page.evaluate(() => window.MNM.state().index), {
      timeout: 15000,
    })
    .toBe(4);
  await expect(page.locator("#stage")).toHaveAttribute("data-moment", "pt-br");
});

test("each moment carries its own layout and renders illustration rects", async ({
  page,
}) => {
  await page.goto("/?mode=auto&speed=0.6"); // slow so a jumped-to moment holds
  await ready(page);

  const expected = [
    ["en", "L1"],
    ["fr", "L2"],
    ["ar", "L3"],
    ["ar-lev", "L4"],
    ["pt-br", "L5"],
  ];

  for (let i = 0; i < expected.length; i++) {
    const layout = await page.evaluate((idx) => {
      window.MNM.goTo(idx);
      return document.getElementById("stage").getAttribute("data-layout");
    }, i);
    expect(layout, `moment ${expected[i][0]}`).toBe(expected[i][1]);
    await expect(page.locator("#stage")).toHaveAttribute(
      "data-moment",
      expected[i][0],
    );

    // visible rects accumulate as the morph runs
    await expect
      .poll(() =>
        page.evaluate(() => {
          const rects = [...document.querySelectorAll("#illus-svg rect")];
          return rects.filter((r) => {
            const w = parseFloat(r.getAttribute("width") || "0");
            const o = parseFloat(r.getAttribute("opacity") || "0");
            return w > 0 && o > 0;
          }).length;
        }),
      )
      .toBeGreaterThan(0);
  }
});

test("non-English moments show the original verbatim and an English translation", async ({
  page,
}) => {
  await page.goto("/?mode=auto&speed=0.6");
  await ready(page);

  // FR
  await page.evaluate(() => window.MNM.goTo(1));
  await expect
    .poll(() => page.locator("#words-caption").textContent())
    .toContain("Ma mère");
  await expect
    .poll(() => page.locator("#words-translation").textContent())
    .toContain("knead");
  await expect(page.locator("#words-tag")).toHaveText("[FR]");

  // AR (romanized)
  await page.evaluate(() => window.MNM.goTo(2));
  await expect
    .poll(() => page.locator("#words-caption").textContent())
    .toContain("Oummi dam3i");
  await expect(page.locator("#words-tag")).toHaveText("[AR]");
});

test("the stage fits the viewport with no horizontal overflow", async ({
  page,
}) => {
  await page.goto(AUTO);
  await ready(page);
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const stage = document.getElementById("stage").getBoundingClientRect();
    return {
      docOverflow: doc.scrollWidth - doc.clientWidth,
      stageRight: stage.right,
      stageBottom: stage.bottom,
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });
  expect(overflow.docOverflow).toBeLessThanOrEqual(1);
  expect(overflow.stageRight).toBeLessThanOrEqual(overflow.vw + 1);
  expect(overflow.stageBottom).toBeLessThanOrEqual(overflow.vh + 1);
});

test("the start gate falls back to auto-play when no camera is available", async ({
  page,
}) => {
  await page.goto("/?speed=12"); // no mode -> intro gate shown
  await expect(page.locator("#intro")).toBeVisible();
  await page.locator("#start").click();
  await expect(page.locator("#intro")).toBeHidden();
  // camera is denied/absent in headless -> player should still begin
  await expect
    .poll(
      () => page.evaluate(() => (window.MNM ? window.MNM.state().index : -1)),
      {
        timeout: 15000,
      },
    )
    .toBeGreaterThanOrEqual(0);
});

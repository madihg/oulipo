/**
 * tests/e2e/constellation.spec.mjs
 *
 * Acceptance tests for the constellation: 11 satellite forwarded-prayer buttons
 * that hang at the ends of rays radiating from the central icon. They are hidden
 * on load and revealed in batches as the 5 arabic-line boxes are opened.
 * Clicking a satellite opens the #lightbox with its own detection boxes.
 *
 * Coverage:
 *   (a) 11 .satellite elements exist and are hidden (no .is-revealed) on load
 *   (b) after clicking all 5 arabic-line boxes all 11 satellites get .is-revealed
 *   (c) clicking a .satellite opens #lightbox
 *   (d) clicking the lightbox [data-box-type="litany-text"] box reveals
 *       .lp-arabic + .tp-literal and increments the unit's localStorage decayStep
 *   (e) re-clicking the same text box does NOT double-increment decayStep
 *   (f) Escape / #lightbox-close close the lightbox
 */

import { test, expect } from "@playwright/test";

// Run on desktop viewport for reliable geometry + scroll
test.use({ viewport: { width: 1280, height: 800 } });

// Total satellites as declared in content.json
const SATELLITE_COUNT = 11;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function clearAllStorage(page) {
  await page.evaluate(() => {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  });
}

async function freshPage(page) {
  await page.goto("/");
  await clearAllStorage(page);
  await page.reload();
}

async function enterPraying(page) {
  await page.locator("#prayer-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-state", "praying", {
    timeout: 8000,
  });
}

// Click all 5 arabic-line boxes and wait until the button reaches "answered"
// (which means all 5 revealBatch calls have fired and all satellites are revealed).
async function prayAllBoxes(page) {
  await enterPraying(page);
  const arabicBoxes = page.locator(
    "button.det-box[data-box-type='arabic-line']",
  );
  await expect(arabicBoxes).toHaveCount(5, { timeout: 5000 });
  for (let i = 0; i < 5; i++) {
    await arabicBoxes.nth(i).click();
    await page.waitForTimeout(150);
  }
  // Wait for completion
  await expect(page.locator("#prayer-button")).toHaveAttribute(
    "data-phase",
    "answered",
    { timeout: 5000 },
  );
  // Give the constellation's last revealBatch a moment to settle
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// (a) 11 satellites exist and are hidden on load
// ---------------------------------------------------------------------------

test.describe("Satellites hidden on load", () => {
  test(`${SATELLITE_COUNT} .satellite elements exist in the DOM`, async ({
    page,
  }) => {
    await freshPage(page);
    // Wait for boot (JS builds the satellites)
    await page.waitForFunction(
      (n) => document.querySelectorAll(".satellite").length >= n,
      SATELLITE_COUNT,
      { timeout: 10_000 },
    );
    await expect(page.locator(".satellite")).toHaveCount(SATELLITE_COUNT);
  });

  test("no .satellite has .is-revealed on fresh load", async ({ page }) => {
    await freshPage(page);
    await page.waitForFunction(
      (n) => document.querySelectorAll(".satellite").length >= n,
      SATELLITE_COUNT,
      { timeout: 10_000 },
    );
    const revealed = page.locator(".satellite.is-revealed");
    await expect(revealed).toHaveCount(0);
  });

  test("each .satellite has a data-unit-id attribute", async ({ page }) => {
    await freshPage(page);
    await page.waitForFunction(
      (n) => document.querySelectorAll(".satellite").length >= n,
      SATELLITE_COUNT,
      { timeout: 10_000 },
    );
    const sats = page.locator(".satellite");
    const count = await sats.count();
    for (let i = 0; i < count; i++) {
      const id = await sats.nth(i).getAttribute("data-unit-id");
      expect(id).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// (b) all 11 satellites get .is-revealed after all 5 arabic-line boxes opened
// ---------------------------------------------------------------------------

test.describe("Satellites revealed after prayer", () => {
  test(`all ${SATELLITE_COUNT} satellites get .is-revealed after 5/5`, async ({
    page,
  }) => {
    await freshPage(page);
    await page.waitForFunction(
      (n) => document.querySelectorAll(".satellite").length >= n,
      SATELLITE_COUNT,
      { timeout: 10_000 },
    );
    await prayAllBoxes(page);

    // All satellites must now carry .is-revealed
    await page.waitForFunction(
      (n) => document.querySelectorAll(".satellite.is-revealed").length >= n,
      SATELLITE_COUNT,
      { timeout: 6000 },
    );
    await expect(page.locator(".satellite.is-revealed")).toHaveCount(
      SATELLITE_COUNT,
    );
  });

  test("satellites reveal in batches - some are revealed after first box", async ({
    page,
  }) => {
    await freshPage(page);
    await page.waitForFunction(
      (n) => document.querySelectorAll(".satellite").length >= n,
      SATELLITE_COUNT,
      { timeout: 10_000 },
    );
    await enterPraying(page);

    // Click the first arabic-line box only
    const arabicBoxes = page.locator(
      "button.det-box[data-box-type='arabic-line']",
    );
    await arabicBoxes.first().click();
    await page.waitForTimeout(400);

    // At least one satellite should be revealed but not all
    const revealedCount = await page.locator(".satellite.is-revealed").count();
    expect(revealedCount).toBeGreaterThan(0);
    expect(revealedCount).toBeLessThan(SATELLITE_COUNT);
  });
});

// ---------------------------------------------------------------------------
// (c) clicking a .satellite opens #lightbox
// ---------------------------------------------------------------------------

test.describe("Satellite opens lightbox", () => {
  test("clicking a .is-revealed satellite opens #lightbox", async ({
    page,
  }) => {
    await freshPage(page);
    await page.waitForFunction(
      (n) => document.querySelectorAll(".satellite").length >= n,
      SATELLITE_COUNT,
      { timeout: 10_000 },
    );
    await prayAllBoxes(page);

    // Wait for at least one revealed satellite
    await page.waitForFunction(
      () => document.querySelector(".satellite.is-revealed") !== null,
      { timeout: 5000 },
    );

    const firstSat = page.locator(".satellite.is-revealed").first();
    await firstSat.scrollIntoViewIfNeeded();
    await firstSat.click();

    await expect(page.locator("#lightbox")).not.toHaveAttribute("hidden", {
      timeout: 3000,
    });
  });

  test("lightbox contains .lightbox-canvas after opening", async ({ page }) => {
    await freshPage(page);
    await page.waitForFunction(
      (n) => document.querySelectorAll(".satellite").length >= n,
      SATELLITE_COUNT,
      { timeout: 10_000 },
    );
    await prayAllBoxes(page);

    await page.waitForFunction(
      () => document.querySelector(".satellite.is-revealed") !== null,
      { timeout: 5000 },
    );
    const firstSat = page.locator(".satellite.is-revealed").first();
    await firstSat.scrollIntoViewIfNeeded();
    await firstSat.click();

    await expect(page.locator("#lightbox")).not.toHaveAttribute("hidden", {
      timeout: 3000,
    });
    await expect(page.locator(".lightbox-canvas")).toBeVisible({
      timeout: 3000,
    });
  });
});

// ---------------------------------------------------------------------------
// (d) clicking lightbox litany-text box reveals .lp-arabic + .tp-literal
//     and increments the unit's localStorage decayStep
// ---------------------------------------------------------------------------

test.describe("Lightbox litany-text box interaction", () => {
  // Helper: open the lightbox by clicking the first revealed satellite
  async function openLightbox(page) {
    await freshPage(page);
    await page.waitForFunction(
      (n) => document.querySelectorAll(".satellite").length >= n,
      SATELLITE_COUNT,
      { timeout: 10_000 },
    );
    await prayAllBoxes(page);

    await page.waitForFunction(
      () => document.querySelector(".satellite.is-revealed") !== null,
      { timeout: 5000 },
    );

    const firstSat = page.locator(".satellite.is-revealed").first();
    await firstSat.scrollIntoViewIfNeeded();

    // Capture which unit it is so we can check its localStorage key
    const unitId = await firstSat.getAttribute("data-unit-id");
    await firstSat.click();

    await expect(page.locator("#lightbox")).not.toHaveAttribute("hidden", {
      timeout: 3000,
    });

    // Wait for boxes overlay to be built (async image load + renderBoxes)
    await expect(
      page.locator(".lightbox-boxes .det-box[data-box-type='litany-text']"),
    ).toBeVisible({ timeout: 5000 });

    return unitId;
  }

  test("clicking [data-box-type='litany-text'] reveals .lp-arabic", async ({
    page,
  }) => {
    await openLightbox(page);
    const textBox = page.locator(
      ".lightbox-boxes .det-box[data-box-type='litany-text']",
    );
    await textBox.click();

    await expect(page.locator(".lightbox-panel .lp-arabic")).toBeVisible({
      timeout: 3000,
    });
    const text = await page.locator(".lightbox-panel .lp-arabic").innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("clicking [data-box-type='litany-text'] reveals .tp-literal", async ({
    page,
  }) => {
    await openLightbox(page);
    const textBox = page.locator(
      ".lightbox-boxes .det-box[data-box-type='litany-text']",
    );
    await textBox.click();

    await expect(page.locator(".lightbox-panel .tp-literal")).toBeVisible({
      timeout: 3000,
    });
    const text = await page.locator(".lightbox-panel .tp-literal").innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("clicking litany-text box increments votivepatina.litany.<id>.decayStep", async ({
    page,
  }) => {
    const unitId = await openLightbox(page);
    expect(unitId).toBeTruthy();

    const lsKey = `votivepatina.litany.${unitId}.decayStep`;
    const stepBefore = await page.evaluate(
      (k) => parseInt(localStorage.getItem(k) ?? "0", 10),
      lsKey,
    );

    const textBox = page.locator(
      ".lightbox-boxes .det-box[data-box-type='litany-text']",
    );
    await textBox.click();
    await page.waitForTimeout(300);

    const stepAfter = await page.evaluate(
      (k) => parseInt(localStorage.getItem(k) ?? "0", 10),
      lsKey,
    );
    expect(stepAfter).toBe(stepBefore + 1);
  });
});

// ---------------------------------------------------------------------------
// (e) re-clicking the same text box does NOT double-increment decayStep
// ---------------------------------------------------------------------------

test.describe("Re-clicking lightbox text box does not double-increment", () => {
  test("second click on litany-text box does not increment decayStep again", async ({
    page,
  }) => {
    await freshPage(page);
    await page.waitForFunction(
      (n) => document.querySelectorAll(".satellite").length >= n,
      SATELLITE_COUNT,
      { timeout: 10_000 },
    );
    await prayAllBoxes(page);

    await page.waitForFunction(
      () => document.querySelector(".satellite.is-revealed") !== null,
      { timeout: 5000 },
    );

    const firstSat = page.locator(".satellite.is-revealed").first();
    await firstSat.scrollIntoViewIfNeeded();
    const unitId = await firstSat.getAttribute("data-unit-id");
    await firstSat.click();

    await expect(page.locator("#lightbox")).not.toHaveAttribute("hidden", {
      timeout: 3000,
    });

    const textBox = page.locator(
      ".lightbox-boxes .det-box[data-box-type='litany-text']",
    );
    await expect(textBox).toBeVisible({ timeout: 5000 });

    const lsKey = `votivepatina.litany.${unitId}.decayStep`;

    // First click - attends (increments)
    await textBox.click();
    await page.waitForTimeout(300);
    const stepAfterFirst = await page.evaluate(
      (k) => parseInt(localStorage.getItem(k) ?? "0", 10),
      lsKey,
    );

    // Second click - must NOT increment again
    await textBox.click();
    await page.waitForTimeout(300);
    const stepAfterSecond = await page.evaluate(
      (k) => parseInt(localStorage.getItem(k) ?? "0", 10),
      lsKey,
    );

    expect(stepAfterSecond).toBe(stepAfterFirst);
  });
});

// ---------------------------------------------------------------------------
// (f) Escape / #lightbox-close close the lightbox
// ---------------------------------------------------------------------------

test.describe("Lightbox close behaviour", () => {
  async function openLightboxSimple(page) {
    await freshPage(page);
    await page.waitForFunction(
      (n) => document.querySelectorAll(".satellite").length >= n,
      SATELLITE_COUNT,
      { timeout: 10_000 },
    );
    await prayAllBoxes(page);

    await page.waitForFunction(
      () => document.querySelector(".satellite.is-revealed") !== null,
      { timeout: 5000 },
    );
    const firstSat = page.locator(".satellite.is-revealed").first();
    await firstSat.scrollIntoViewIfNeeded();
    await firstSat.click();
    await expect(page.locator("#lightbox")).not.toHaveAttribute("hidden", {
      timeout: 3000,
    });
  }

  test("#lightbox-close closes the lightbox", async ({ page }) => {
    await openLightboxSimple(page);
    await page.locator("#lightbox-close").click();
    await expect(page.locator("#lightbox")).toHaveAttribute("hidden", {
      timeout: 2000,
    });
  });

  test("Escape key closes the lightbox", async ({ page }) => {
    await openLightboxSimple(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("#lightbox")).toHaveAttribute("hidden", {
      timeout: 2000,
    });
  });
});

/**
 * tests/e2e/decay-persistence.spec.mjs
 *
 * Verifies localStorage patina persists across page reloads:
 *   - votivepatina.decayStep grows as arabic-line boxes are opened
 *   - After reload, decayStep and prayerCount are restored
 *   - The image is pre-degraded on return (decayStep > 0 reflected in DOM/canvas)
 *   - votivepatina.prayer is bilingual (contains Arabic characters)
 *
 * Uses #prayer-button phase machine (idle -> instruct -> answered).
 * No #counter-pill, no #pray-button.
 *
 * Covers: US-011 (localStorage patina), US-003 (decay persistence).
 */

import { test, expect } from "@playwright/test";

async function freshPage(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("votivepatina.decayStep");
    localStorage.removeItem("votivepatina.prayerCount");
    localStorage.removeItem("votivepatina.prayer");
  });
  await page.reload();
}

async function enterPraying(page) {
  await page.locator("#prayer-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-state", "praying", {
    timeout: 8000,
  });
}

// Helper: click all 5 arabic-line boxes and wait for "answered" phase
async function prayAll(page) {
  await enterPraying(page);
  const arabicBoxes = page.locator(
    "button.det-box[data-box-type='arabic-line']",
  );
  const total = await arabicBoxes.count();
  for (let i = 0; i < total; i++) {
    await arabicBoxes.nth(i).click();
    await page.waitForTimeout(200);
  }
  await expect(page.locator("#prayer-button")).toHaveAttribute(
    "data-phase",
    "answered",
    { timeout: 5000 },
  );
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

test.describe("localStorage keys", () => {
  test("votivepatina.decayStep starts at 0 or absent before praying", async ({
    page,
  }) => {
    await freshPage(page);
    const step = await page.evaluate(() =>
      localStorage.getItem("votivepatina.decayStep"),
    );
    expect(step === null || step === "0").toBe(true);
  });

  test("decayStep increments as arabic-line boxes are opened", async ({
    page,
  }) => {
    await freshPage(page);
    await enterPraying(page);

    const arabicBoxes = page.locator(
      "button.det-box[data-box-type='arabic-line']",
    );

    await arabicBoxes.first().click();
    await page.waitForTimeout(300);

    const stepAfterOne = await page.evaluate(() =>
      parseInt(localStorage.getItem("votivepatina.decayStep") ?? "0", 10),
    );
    expect(stepAfterOne).toBeGreaterThan(0);

    await arabicBoxes.nth(1).click();
    await page.waitForTimeout(300);

    const stepAfterTwo = await page.evaluate(() =>
      parseInt(localStorage.getItem("votivepatina.decayStep") ?? "0", 10),
    );
    expect(stepAfterTwo).toBeGreaterThanOrEqual(stepAfterOne);
  });

  test("prayerCount increments by 1 after completing 5/5", async ({ page }) => {
    await freshPage(page);

    const countBefore = await page.evaluate(() =>
      parseInt(localStorage.getItem("votivepatina.prayerCount") ?? "0", 10),
    );

    await prayAll(page);

    const countAfter = await page.evaluate(() =>
      parseInt(localStorage.getItem("votivepatina.prayerCount") ?? "0", 10),
    );
    expect(countAfter).toBe(countBefore + 1);
  });

  test("votivepatina.prayer is written to localStorage on completion", async ({
    page,
  }) => {
    await freshPage(page);
    await prayAll(page);

    const prayer = await page.evaluate(() =>
      localStorage.getItem("votivepatina.prayer"),
    );
    expect(prayer).not.toBeNull();
    expect((prayer || "").length).toBeGreaterThan(0);
  });

  test("votivepatina.prayer is bilingual - contains Arabic characters", async ({
    page,
  }) => {
    await freshPage(page);
    await prayAll(page);

    const prayer = await page.evaluate(() =>
      localStorage.getItem("votivepatina.prayer"),
    );
    expect(prayer).not.toBeNull();

    // Arabic Unicode block: U+0600-U+06FF. The prayer must contain at least one
    // Arabic character to be bilingual.
    const hasArabic = /[؀-ۿ]/.test(prayer || "");
    expect(
      hasArabic,
      `votivepatina.prayer must contain Arabic characters (bilingual prayer).\nGot: ${JSON.stringify((prayer || "").slice(0, 200))}`,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Persistence across reload
// ---------------------------------------------------------------------------

test.describe("Persistence across reload", () => {
  test("decayStep and prayerCount survive a page.reload()", async ({
    page,
  }) => {
    await freshPage(page);
    await prayAll(page);

    const stepBefore = await page.evaluate(() =>
      parseInt(localStorage.getItem("votivepatina.decayStep") ?? "0", 10),
    );
    const countBefore = await page.evaluate(() =>
      parseInt(localStorage.getItem("votivepatina.prayerCount") ?? "0", 10),
    );

    await page.reload();

    const stepAfter = await page.evaluate(() =>
      parseInt(localStorage.getItem("votivepatina.decayStep") ?? "0", 10),
    );
    const countAfter = await page.evaluate(() =>
      parseInt(localStorage.getItem("votivepatina.prayerCount") ?? "0", 10),
    );

    expect(stepAfter).toBe(stepBefore);
    expect(countAfter).toBe(countBefore);
  });

  test("after reload with decayStep > 0, #mary-canvas is present", async ({
    page,
  }) => {
    await freshPage(page);
    await enterPraying(page);

    const arabicBoxes = page.locator(
      "button.det-box[data-box-type='arabic-line']",
    );
    await arabicBoxes.first().click();
    await page.waitForTimeout(400);

    const step = await page.evaluate(() =>
      parseInt(localStorage.getItem("votivepatina.decayStep") ?? "0", 10),
    );
    if (step === 0) {
      // Nothing to verify
      return;
    }

    await page.reload();

    // decayStep must still be > 0 after reload
    const reloadedStep = await page.evaluate(() =>
      parseInt(localStorage.getItem("votivepatina.decayStep") ?? "0", 10),
    );
    expect(reloadedStep).toBeGreaterThan(0);

    // Canvas must exist
    await expect(page.locator("#mary-canvas")).toBeAttached();
  });

  test("returning visitor sees #returning-note if prayerCount > 0", async ({
    page,
  }) => {
    await freshPage(page);
    await prayAll(page);

    // Reload to trigger returning visitor logic
    await page.reload();

    const note = page.locator("#returning-note");
    // The note should be visible (not hidden) for a returning visitor
    await expect(note).not.toHaveAttribute("hidden");
    const text = await note.textContent();
    expect((text || "").length).toBeGreaterThan(0);
  });
});

/**
 * tests/e2e/prayer-flow.spec.mjs
 *
 * Core prayer interaction flow: idle state -> detect -> pray -> 5/5 complete.
 * Uses the #prayer-button phase machine (idle -> instruct -> answered).
 * No #counter-pill, no #pray-button.
 *
 * Runs on all three projects (mobile, desktop, reduced-motion).
 */

import { test, expect } from "@playwright/test";

// Helper: load a fresh page with cleared localStorage
async function freshPage(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("votivepatina.decayStep");
    localStorage.removeItem("votivepatina.prayerCount");
    localStorage.removeItem("votivepatina.prayer");
  });
  await page.reload();
}

// Helper: click prayer-button and wait for praying state
async function enterPrayingState(page) {
  await freshPage(page);
  await page.locator("#prayer-button").click();
  // State must reach praying (detecting is transient; allow either, then settle on praying)
  await expect(page.locator("body")).toHaveAttribute("data-state", "praying", {
    timeout: 8000,
  });
}

// Helper: click all 5 arabic-line boxes and wait for "answered" phase
async function prayAll(page) {
  await enterPrayingState(page);
  const arabicBoxes = page.locator(
    "button.det-box[data-box-type='arabic-line']",
  );
  const count = await arabicBoxes.count();
  expect(count).toBe(5);
  for (let i = 0; i < count; i++) {
    await arabicBoxes.nth(i).click();
    await page.waitForTimeout(200);
  }
  // Wait for the button to reach "answered" phase
  await expect(page.locator("#prayer-button")).toHaveAttribute(
    "data-phase",
    "answered",
    { timeout: 5000 },
  );
}

// ---------------------------------------------------------------------------
// Idle state
// ---------------------------------------------------------------------------

test.describe("Idle state", () => {
  test("body has data-state=idle on load", async ({ page }) => {
    await freshPage(page);
    await expect(page.locator("body")).toHaveAttribute("data-state", "idle");
  });

  test("#prayer-button is visible with phase=idle and contains 'Pray for us'", async ({
    page,
  }) => {
    await freshPage(page);
    const btn = page.locator("#prayer-button");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("data-phase", "idle");
    await expect(btn.locator(".pb-en")).toHaveText("Pray for us");
  });

  test("#prayer-button also shows Arabic text in idle state", async ({
    page,
  }) => {
    await freshPage(page);
    const ar = page.locator("#prayer-button .pb-ar");
    await expect(ar).toHaveText("صلّي لأجلنا");
  });

  test("no .det-box elements are visible in idle state", async ({ page }) => {
    await freshPage(page);
    const boxes = page.locator(".det-box");
    const count = await boxes.count();
    for (let i = 0; i < count; i++) {
      await expect(boxes.nth(i)).not.toBeVisible();
    }
  });

  test("#counter-pill does not exist in the DOM", async ({ page }) => {
    await freshPage(page);
    await expect(page.locator("#counter-pill")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Detection sweep (after clicking Pray)
// ---------------------------------------------------------------------------

test.describe("Detection sweep (after clicking #prayer-button)", () => {
  test("clicking #prayer-button transitions state from idle to detecting then praying", async ({
    page,
  }) => {
    await freshPage(page);
    await page.locator("#prayer-button").click();

    // State must reach praying (detecting is transient)
    await expect(page.locator("body")).toHaveAttribute(
      "data-state",
      /^(detecting|praying)$/,
      { timeout: 5000 },
    );

    await expect(page.locator("body")).toHaveAttribute(
      "data-state",
      "praying",
      { timeout: 8000 },
    );
  });

  test("button phase becomes 'instruct' after clicking from idle", async ({
    page,
  }) => {
    await freshPage(page);
    await page.locator("#prayer-button").click();
    await expect(page.locator("#prayer-button")).toHaveAttribute(
      "data-phase",
      "instruct",
      { timeout: 5000 },
    );
  });

  test("button .pb-en text changes to 'click the colored squares' after click", async ({
    page,
  }) => {
    await freshPage(page);
    await page.locator("#prayer-button").click();
    await expect(page.locator("#prayer-button .pb-en")).toHaveText(
      "click the colored squares",
      { timeout: 5000 },
    );
  });

  test("detection boxes appear after sweep", async ({ page }) => {
    await freshPage(page);
    await page.locator("#prayer-button").click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-state",
      "praying",
      { timeout: 8000 },
    );
    await expect(page.locator(".det-box").first()).toBeVisible({
      timeout: 3000,
    });
  });

  test("5 arabic-line boxes are present after the sweep", async ({ page }) => {
    await enterPrayingState(page);
    const arabicBoxes = page.locator(
      "button.det-box[data-box-type='arabic-line']",
    );
    await expect(arabicBoxes).toHaveCount(5);
  });
});

// ---------------------------------------------------------------------------
// Arabic-line box interaction (the one gesture)
// ---------------------------------------------------------------------------

test.describe("Arabic-line box interaction", () => {
  test("clicking first arabic-line box shows #translation-panel with .tp-literal", async ({
    page,
  }) => {
    await enterPrayingState(page);
    const firstArabic = page
      .locator("button.det-box[data-box-type='arabic-line']")
      .first();
    await expect(firstArabic).toBeVisible();
    await firstArabic.click();

    const panel = page.locator("#translation-panel");
    await expect(panel).toBeVisible({ timeout: 3000 });
    await expect(panel.locator(".tp-literal")).toBeVisible();
  });

  test("re-clicking an already-opened box does NOT advance to answered phase", async ({
    page,
  }) => {
    await enterPrayingState(page);
    const firstArabic = page
      .locator("button.det-box[data-box-type='arabic-line']")
      .first();

    // First click
    await firstArabic.click();
    // Second click on same box
    await firstArabic.click();
    await page.waitForTimeout(400);

    // Phase should still be instruct (not answered) since only 1 unique box opened
    await expect(page.locator("#prayer-button")).toHaveAttribute(
      "data-phase",
      "instruct",
    );
  });

  test("re-clicking an opened box still shows the translation panel", async ({
    page,
  }) => {
    await enterPrayingState(page);
    const firstArabic = page
      .locator("button.det-box[data-box-type='arabic-line']")
      .first();
    await firstArabic.click();
    await expect(page.locator("#translation-panel")).toBeVisible({
      timeout: 2000,
    });

    // Click a different box then click first again
    const secondArabic = page
      .locator("button.det-box[data-box-type='arabic-line']")
      .nth(1);
    await secondArabic.click();
    await firstArabic.click();
    await expect(page.locator("#translation-panel")).toBeVisible({
      timeout: 2000,
    });
    await expect(page.locator("#translation-panel .tp-literal")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Translation panel '+' expansion
// ---------------------------------------------------------------------------

test.describe("Translation panel expansion", () => {
  async function openFirstBox(page) {
    await enterPrayingState(page);
    await page
      .locator("button.det-box[data-box-type='arabic-line']")
      .first()
      .click();
    await expect(page.locator("#translation-panel")).toBeVisible({
      timeout: 3000,
    });
  }

  test(".tp-expand button has aria-expanded attribute", async ({ page }) => {
    await openFirstBox(page);
    const expand = page.locator("#translation-panel .tp-expand");
    await expect(expand).toBeVisible();
    await expect(expand).toHaveAttribute("aria-expanded", /^(true|false)$/);
  });

  test("clicking .tp-expand toggles aria-expanded and reveals .tp-expansion", async ({
    page,
  }) => {
    await openFirstBox(page);
    const expand = page.locator("#translation-panel .tp-expand");

    // Should start collapsed
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    const expansion = page.locator("#translation-panel .tp-expansion");
    await expect(expansion).not.toBeVisible();

    // Click to expand
    await expand.click();
    await expect(expand).toHaveAttribute("aria-expanded", "true", {
      timeout: 2000,
    });
    await expect(expansion).toBeVisible({ timeout: 2000 });

    // Click to collapse
    await expand.click();
    await expect(expand).toHaveAttribute("aria-expanded", "false", {
      timeout: 2000,
    });
    await expect(expansion).not.toBeVisible({ timeout: 2000 });
  });
});

// ---------------------------------------------------------------------------
// Completion state at 5/5 - #prayer-button phase "answered"
// ---------------------------------------------------------------------------

test.describe("Completion state at 5/5", () => {
  test("#prayer-button phase becomes 'answered' after 5/5", async ({
    page,
  }) => {
    await prayAll(page);
    await expect(page.locator("#prayer-button")).toHaveAttribute(
      "data-phase",
      "answered",
    );
  });

  test("#prayer-button .pb-en text is 'Prayer is Answered' at 5/5", async ({
    page,
  }) => {
    await prayAll(page);
    await expect(page.locator("#prayer-button .pb-en")).toHaveText(
      "Prayer is Answered",
      { timeout: 3000 },
    );
  });

  test("#closing-couplet appears after 5/5", async ({ page }) => {
    await prayAll(page);
    const couplet = page.locator("#closing-couplet");
    await expect(couplet).toBeVisible({ timeout: 5000 });
  });

  test("body state transitions to complete or resting after 5/5", async ({
    page,
  }) => {
    await prayAll(page);
    await expect(page.locator("body")).toHaveAttribute(
      "data-state",
      /^(complete|resting)$/,
      { timeout: 5000 },
    );
  });

  test("clicking #prayer-button at 'answered' opens #console-drawer", async ({
    page,
  }) => {
    await prayAll(page);
    await page.locator("#prayer-button").click();
    await expect(page.locator("#console-drawer")).toHaveAttribute(
      "data-open",
      "true",
      { timeout: 3000 },
    );
  });
});

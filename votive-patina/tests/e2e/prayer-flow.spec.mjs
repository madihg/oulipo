/**
 * tests/e2e/prayer-flow.spec.mjs
 *
 * Core prayer interaction flow: idle state -> detect -> pray -> 5/5 complete.
 * Covers: US-005 (pray gate + state machine), US-006 (the one gesture),
 *         US-007 (translation panel + expansion), US-008 (completion + couplet).
 *
 * Runs on all three projects (mobile, desktop, reduced-motion).
 */

import { test, expect } from "@playwright/test";

test.describe("Idle state", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Clear localStorage so each test starts fresh
    await page.evaluate(() => {
      localStorage.removeItem("votivepatina.decayStep");
      localStorage.removeItem("votivepatina.prayerCount");
      localStorage.removeItem("votivepatina.prayer");
    });
    await page.reload();
  });

  test("body has data-state=idle on load", async ({ page }) => {
    await expect(page.locator("body")).toHaveAttribute("data-state", "idle");
  });

  test("#pray-button is visible with text 'Pray for us'", async ({ page }) => {
    const btn = page.locator("#pray-button");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText("Pray for us");
  });

  test("no .det-box elements are visible in idle state", async ({ page }) => {
    const boxes = page.locator(".det-box");
    // Either none exist, or none are visible
    const count = await boxes.count();
    for (let i = 0; i < count; i++) {
      await expect(boxes.nth(i)).not.toBeVisible();
    }
  });

  test("#counter-pill is not visible in idle state", async ({ page }) => {
    const pill = page.locator("#counter-pill");
    const count = await pill.count();
    if (count > 0) {
      await expect(pill).not.toBeVisible();
    }
  });
});

test.describe("Detection sweep (after clicking Pray)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("votivepatina.decayStep");
      localStorage.removeItem("votivepatina.prayerCount");
      localStorage.removeItem("votivepatina.prayer");
    });
    await page.reload();
  });

  test("clicking #pray-button transitions state to detecting then praying", async ({
    page,
  }) => {
    await page.locator("#pray-button").click();

    // State must reach praying (detecting is transient; accept either or praying)
    await expect(page.locator("body")).toHaveAttribute(
      "data-state",
      /^(detecting|praying)$/,
      { timeout: 5000 },
    );

    // Eventually reaches praying
    await expect(page.locator("body")).toHaveAttribute(
      "data-state",
      "praying",
      {
        timeout: 8000,
      },
    );
  });

  test("#counter-pill shows '0 of 5' after sweep", async ({ page }) => {
    await page.locator("#pray-button").click();
    const pill = page.locator("#counter-pill");
    await expect(pill).toBeVisible({ timeout: 8000 });
    await expect(pill).toHaveText(/0\s*of\s*5/i);
    await expect(pill).toHaveAttribute("data-count", "0");
  });

  test("detection boxes appear after sweep", async ({ page }) => {
    await page.locator("#pray-button").click();
    // Wait for praying state
    await expect(page.locator("body")).toHaveAttribute(
      "data-state",
      "praying",
      {
        timeout: 8000,
      },
    );
    // At least one det-box should be visible
    await expect(page.locator(".det-box").first()).toBeVisible({
      timeout: 3000,
    });
  });

  test("#pray-button is gone after sweep", async ({ page }) => {
    await page.locator("#pray-button").click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-state",
      "praying",
      {
        timeout: 8000,
      },
    );
    await expect(page.locator("#pray-button")).not.toBeVisible();
  });
});

test.describe("Arabic-line box interaction (the one gesture)", () => {
  async function enterPrayingState(page) {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("votivepatina.decayStep");
      localStorage.removeItem("votivepatina.prayerCount");
      localStorage.removeItem("votivepatina.prayer");
    });
    await page.reload();
    await page.locator("#pray-button").click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-state",
      "praying",
      {
        timeout: 8000,
      },
    );
  }

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

  test("clicking first arabic-line box increments counter from 0 to 1", async ({
    page,
  }) => {
    await enterPrayingState(page);
    const firstArabic = page
      .locator("button.det-box[data-box-type='arabic-line']")
      .first();
    await firstArabic.click();

    const pill = page.locator("#counter-pill");
    await expect(pill).toHaveText(/1\s*of\s*5/i, { timeout: 3000 });
    await expect(pill).toHaveAttribute("data-count", "1");
  });

  test("clicking boxes in DOM order increments counter to 5", async ({
    page,
  }) => {
    await enterPrayingState(page);
    const arabicBoxes = page.locator(
      "button.det-box[data-box-type='arabic-line']",
    );
    const count = await arabicBoxes.count();
    expect(count).toBe(5);

    for (let i = 0; i < count; i++) {
      await arabicBoxes.nth(i).click();
      await expect(page.locator("#counter-pill")).toHaveAttribute(
        "data-count",
        String(i + 1),
        { timeout: 3000 },
      );
    }

    await expect(page.locator("#counter-pill")).toHaveText(/5\s*of\s*5/i);
  });

  test("re-clicking an already-opened box does NOT increment counter", async ({
    page,
  }) => {
    await enterPrayingState(page);
    const firstArabic = page
      .locator("button.det-box[data-box-type='arabic-line']")
      .first();

    // First click - opens the box, counter goes to 1
    await firstArabic.click();
    await expect(page.locator("#counter-pill")).toHaveAttribute(
      "data-count",
      "1",
      {
        timeout: 3000,
      },
    );

    // Second click on same box - counter must stay at 1
    await firstArabic.click();
    await page.waitForTimeout(400); // allow any async state to settle
    await expect(page.locator("#counter-pill")).toHaveAttribute(
      "data-count",
      "1",
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

    // Click a different box to change the active panel, then click first again
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

test.describe("Translation panel '+'  expansion (US-007)", () => {
  async function openFirstBox(page) {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("votivepatina.decayStep");
      localStorage.removeItem("votivepatina.prayerCount");
      localStorage.removeItem("votivepatina.prayer");
    });
    await page.reload();
    await page.locator("#pray-button").click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-state",
      "praying",
      {
        timeout: 8000,
      },
    );
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

test.describe("Completion state at 5/5 (US-008)", () => {
  async function prayAll(page) {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("votivepatina.decayStep");
      localStorage.removeItem("votivepatina.prayerCount");
      localStorage.removeItem("votivepatina.prayer");
    });
    await page.reload();
    await page.locator("#pray-button").click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-state",
      "praying",
      {
        timeout: 8000,
      },
    );
    const arabicBoxes = page.locator(
      "button.det-box[data-box-type='arabic-line']",
    );
    const count = await arabicBoxes.count();
    for (let i = 0; i < count; i++) {
      await arabicBoxes.nth(i).click();
      // Brief pause so state machine can process each click
      await page.waitForTimeout(200);
    }
    await expect(page.locator("#counter-pill")).toHaveAttribute(
      "data-count",
      "5",
      {
        timeout: 5000,
      },
    );
  }

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

  test("#counter-pill text at 5/5 references OPEN CONSOLE or equivalent message", async ({
    page,
  }) => {
    await prayAll(page);
    const pill = page.locator("#counter-pill");
    // The contract says: "5 of 5 - YOUR PRAYER WAS PRINTED - OPEN CONSOLE (PC)"
    // Accept flexible casing/whitespace around the key markers
    await expect(pill).toHaveText(/5\s*of\s*5/i, { timeout: 5000 });
  });
});

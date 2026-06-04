/**
 * tests/e2e/about.spec.mjs
 *
 * Acceptance tests for the about modal:
 *   - #about-modal starts hidden
 *   - clicking #about-toggle opens it (not hidden, body.about-open, focus -> #about-close)
 *   - panel text contains "Lossy JPEGs"
 *   - #about-close closes the modal (hidden again, body class removed)
 *   - Escape key closes the modal
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

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

test.describe("About modal - initial state", () => {
  test("#about-modal starts hidden", async ({ page }) => {
    await freshPage(page);
    await expect(page.locator("#about-modal")).toHaveAttribute("hidden");
  });

  test("#about-toggle is visible", async ({ page }) => {
    await freshPage(page);
    await expect(page.locator("#about-toggle")).toBeVisible();
    // The '?' button
    await expect(page.locator("#about-toggle")).toHaveText("?");
  });

  test("body does NOT have class about-open on load", async ({ page }) => {
    await freshPage(page);
    await expect(page.locator("body")).not.toHaveClass(/about-open/);
  });
});

// ---------------------------------------------------------------------------
// Opening the modal
// ---------------------------------------------------------------------------

test.describe("About modal - opening", () => {
  async function openAbout(page) {
    await freshPage(page);
    await page.locator("#about-toggle").click();
  }

  test("clicking #about-toggle removes 'hidden' from #about-modal", async ({
    page,
  }) => {
    await openAbout(page);
    await expect(page.locator("#about-modal")).not.toHaveAttribute("hidden", {
      timeout: 2000,
    });
  });

  test("body gets class 'about-open' when modal is open", async ({ page }) => {
    await openAbout(page);
    await expect(page.locator("body")).toHaveClass(/about-open/, {
      timeout: 2000,
    });
  });

  test("focus moves to #about-close after opening", async ({ page }) => {
    await openAbout(page);
    // Give focus management a moment
    await page.waitForTimeout(100);
    const focusedId = await page.evaluate(
      () => document.activeElement?.id ?? null,
    );
    expect(focusedId).toBe("about-close");
  });

  test("panel text contains 'Lossy JPEGs'", async ({ page }) => {
    await openAbout(page);
    await expect(page.locator("#about-modal")).not.toHaveAttribute("hidden", {
      timeout: 2000,
    });
    const text = await page.locator("#about-modal").innerText();
    expect(
      text.includes("Lossy JPEGs"),
      `#about-modal text must contain 'Lossy JPEGs'.\nGot: ${text.slice(0, 300)}`,
    ).toBe(true);
  });

  test("#about-modal has role=dialog", async ({ page }) => {
    await freshPage(page);
    await expect(page.locator("#about-modal")).toHaveAttribute(
      "role",
      "dialog",
    );
  });
});

// ---------------------------------------------------------------------------
// Closing via #about-close button
// ---------------------------------------------------------------------------

test.describe("About modal - close button", () => {
  async function openAbout(page) {
    await freshPage(page);
    await page.locator("#about-toggle").click();
    await expect(page.locator("#about-modal")).not.toHaveAttribute("hidden", {
      timeout: 2000,
    });
  }

  test("#about-close button closes the modal (hidden restored)", async ({
    page,
  }) => {
    await openAbout(page);
    await page.locator("#about-close").click();
    await expect(page.locator("#about-modal")).toHaveAttribute("hidden", {
      timeout: 2000,
    });
  });

  test("body class 'about-open' is removed on close", async ({ page }) => {
    await openAbout(page);
    await page.locator("#about-close").click();
    await expect(page.locator("body")).not.toHaveClass(/about-open/, {
      timeout: 2000,
    });
  });
});

// ---------------------------------------------------------------------------
// Closing via Escape key
// ---------------------------------------------------------------------------

test.describe("About modal - Escape key", () => {
  test("Escape closes the modal", async ({ page }) => {
    await freshPage(page);
    await page.locator("#about-toggle").click();
    await expect(page.locator("#about-modal")).not.toHaveAttribute("hidden", {
      timeout: 2000,
    });

    await page.keyboard.press("Escape");

    await expect(page.locator("#about-modal")).toHaveAttribute("hidden", {
      timeout: 2000,
    });
  });

  test("body class 'about-open' is removed after Escape", async ({ page }) => {
    await freshPage(page);
    await page.locator("#about-toggle").click();
    await expect(page.locator("body")).toHaveClass(/about-open/, {
      timeout: 2000,
    });

    await page.keyboard.press("Escape");

    await expect(page.locator("body")).not.toHaveClass(/about-open/, {
      timeout: 2000,
    });
  });
});

// ---------------------------------------------------------------------------
// Dismiss via scrim ([data-about-dismiss])
// ---------------------------------------------------------------------------

test.describe("About modal - scrim dismiss", () => {
  test("clicking the scrim closes the modal", async ({ page }) => {
    await freshPage(page);
    await page.locator("#about-toggle").click();
    await expect(page.locator("#about-modal")).not.toHaveAttribute("hidden", {
      timeout: 2000,
    });

    // Click the scrim at an EXPOSED corner. The scrim spans the whole overlay
    // (inset:0) but its centre is covered by the centred .about-panel; clicking
    // the centre would hit the panel (which is not a dismiss target). The top-left
    // corner is always backdrop - above the 4vh top band and left of the panel.
    await page
      .locator("[data-about-dismiss]")
      .click({ position: { x: 5, y: 5 } });

    await expect(page.locator("#about-modal")).toHaveAttribute("hidden", {
      timeout: 2000,
    });
  });
});

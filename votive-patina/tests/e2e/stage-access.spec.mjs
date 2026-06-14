/**
 * tests/e2e/stage-access.spec.mjs
 *
 * US-011: the top-right access controls on the performer stage.
 *   - SHOW QR + "?" are present in performer mode, absent on the normal page
 *   - SHOW QR opens an overlay carrying the audience join URL
 *   - the "?" opens the About modal
 *
 * Offline (loopback). The QR svg itself is generated from a CDN at show time and
 * is not asserted here; the join URL is the offline-verifiable fallback.
 */

import { test, expect } from "@playwright/test";

const PERF = "/?stage=performer&s=acc123&rt=loopback";

test.describe("stage access controls (QR + about)", () => {
  test("the normal page does NOT show the QR button", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#stage-qr-btn")).toBeHidden();
    // the normal "?" is still there
    await expect(page.locator("#about-toggle")).toBeVisible();
  });

  test("performer mode shows SHOW QR and the '?' top-right", async ({
    page,
  }) => {
    await page.goto(PERF);
    await page.waitForFunction(() => !!window.__stage);
    await expect(page.locator("#stage-qr-btn")).toBeVisible();
    await expect(page.locator("#about-toggle")).toBeVisible();
    // the "?" sits to the right of the QR button
    const qr = await page.locator("#stage-qr-btn").boundingBox();
    const help = await page.locator("#about-toggle").boundingBox();
    expect(help.x).toBeGreaterThan(qr.x);
  });

  test("SHOW QR opens an overlay carrying the audience join URL", async ({
    page,
  }) => {
    await page.goto(PERF);
    await page.waitForFunction(() => !!window.__stage);
    await expect(page.locator("#qr-overlay")).toBeHidden();
    await page.locator("#stage-qr-btn").click();
    await expect(page.locator("#qr-overlay")).toBeVisible();
    const url = await page.locator("#qr-url").innerText();
    expect(url).toContain("/audience/");
    expect(url).toContain("s=acc123");
    // dismiss
    await page.locator("#qr-close").click();
    await expect(page.locator("#qr-overlay")).toBeHidden();
  });

  test("the '?' opens the About modal in performer mode", async ({ page }) => {
    await page.goto(PERF);
    await page.waitForFunction(() => !!window.__stage);
    await expect(page.locator("#about-modal")).toBeHidden();
    await page.locator("#about-toggle").click();
    await expect(page.locator("#about-modal")).toBeVisible();
  });
});

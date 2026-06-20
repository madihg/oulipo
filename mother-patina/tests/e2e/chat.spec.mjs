// tests/e2e/chat.spec.mjs - mother-patina
//
// Auto-play + chat UI + decay + the forward mechanic (window/tab on desktop,
// navigation on mobile). Uses ?fast=1 to collapse the delays so the suite is quick.

import { test, expect } from "@playwright/test";

async function playScreen(page, n) {
  await page.goto(`/?screen=${n}&fast=1`);
  await page.waitForFunction(() => window.__mp && window.__mp.done, {
    timeout: 10000,
  });
}

test.describe("mother-patina chat", () => {
  test("screen 1 auto-plays a full thread with left/right bubbles", async ({
    page,
  }) => {
    await playScreen(page, 1);
    // many bubbles, both incoming (b -> .in) and sent (a -> .out)
    expect(await page.locator(".thread .msg").count()).toBeGreaterThan(8);
    expect(await page.locator(".msg.in").count()).toBeGreaterThan(0);
    expect(await page.locator(".msg.out").count()).toBeGreaterThan(0);
    // the prayer line is set apart
    await expect(page.locator(".msg.arabic .body")).toHaveText("بحضنك خذينا");
    await expect(page.locator(".msg.translit .body")).toHaveText(
      "FI 7OUDNIKI KHOUZINA",
    );
    await expect(
      page.locator(".msg.in", { hasText: "Embrace us." }).first(),
    ).toBeVisible();
  });

  test("the screen opens with the forwarded Mary image as a rendered canvas", async ({
    page,
  }) => {
    await playScreen(page, 1);
    const canvas = page.locator(".msg.image canvas").first();
    await expect(canvas).toBeVisible();
    const drawn = await canvas.evaluate((c) => {
      const ctx = c.getContext("2d");
      const { data } = ctx.getImageData(
        0,
        0,
        Math.min(40, c.width),
        Math.min(40, c.height),
      );
      // not a blank canvas: some pixel has colour
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] + data[i + 1] + data[i + 2] > 0 && data[i + 3] > 0)
          return true;
      }
      return false;
    });
    expect(drawn).toBe(true);
  });

  test("the thread is scrollable on a long screen", async ({ page }) => {
    await playScreen(page, 3); // the longest screen
    const overflow = await page
      .locator("#thread")
      .evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(overflow).toBeGreaterThan(0);
  });

  test("a forward notification appears at the end of screens 1-4", async ({
    page,
  }) => {
    await playScreen(page, 2);
    await expect(page.locator("#notif")).toBeVisible();
    await expect(page.locator("#notif")).toContainText("sent you an image");
  });

  test("screen 5 ends the piece on 'habibi' with no further forward", async ({
    page,
  }) => {
    await playScreen(page, 5);
    await expect(
      page.locator(".msg", { hasText: "habibi" }).last(),
    ).toBeVisible();
    await expect(page.locator("#notif")).toBeHidden();
  });

  test("tapping the notification forwards to the next screen (window or navigation)", async ({
    page,
    context,
  }) => {
    await playScreen(page, 1);
    await expect(page.locator("#notif")).toBeVisible();
    const popupP = context
      .waitForEvent("page", { timeout: 2500 })
      .catch(() => null);
    await page.locator("#notif").click();
    const popup = await popupP;
    if (popup) {
      // desktop: a new window/tab opened to screen 2
      await popup.waitForLoadState("domcontentloaded");
      expect(popup.url()).toContain("screen=2");
    } else {
      // mobile / coarse pointer: same-window navigation
      await expect(page).toHaveURL(/screen=2/);
    }
  });
});

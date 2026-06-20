// tests/e2e/chat.spec.mjs - mother-patina

import { test, expect } from "@playwright/test";

async function playScreen(page, n) {
  await page.goto(`/?screen=${n}&fast=1`);
  await page.waitForFunction(() => window.__mp && window.__mp.done, {
    timeout: 10000,
  });
}

test.describe("mother-patina", () => {
  test("the landing is a lock screen with the title; tapping opens screen 1", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#lock")).toBeVisible();
    await expect(page.locator(".phone")).toBeHidden();
    await expect(page.locator(".lock-notif-title")).toContainText(
      "Every day my mother sends me a picture of the Virgin Mary on WhatsApp",
    );
    await expect(page.locator(".lock-notif-sub")).toContainText(
      "Every day my mother sends me a WhatsApp",
    );
    await page.locator("#lock-open").click();
    await expect(page).toHaveURL(/screen=1/);
    await expect(page.locator(".phone")).toBeVisible();
  });

  test("a <base> is set so relative assets resolve (with or without a trailing slash)", async ({
    page,
  }) => {
    await page.goto("/?screen=1&fast=1");
    const baseHref = await page.evaluate(() => {
      const b = document.querySelector("base");
      return b ? b.getAttribute("href") : null;
    });
    expect(baseHref).toBeTruthy();
    expect(baseHref.endsWith("/")).toBe(true);
    // and the stylesheet is genuinely applied (the sr-only h1 is hidden)
    const cssApplied = await page.evaluate(() => {
      const h1 = document.querySelector("h1.sr-only");
      return h1 ? getComputedStyle(h1).position === "absolute" : false;
    });
    expect(cssApplied).toBe(true);
  });

  test("screen 1 plays under a date separator, with left/right bubbles", async ({
    page,
  }) => {
    await playScreen(page, 1);
    await expect(page.locator(".date-sep").first()).toBeVisible();
    expect(await page.locator(".thread .msg").count()).toBeGreaterThan(8);
    expect(await page.locator(".msg.in").count()).toBeGreaterThan(0);
    expect(await page.locator(".msg.out").count()).toBeGreaterThan(0);
    await expect(page.locator(".msg.translit .body")).toHaveText(
      "FI 7OUDNIKI KHOUZINA",
    );
    // the Arabic appears BOTH over the image and as the first chat bubble
    await expect(page.locator(".msg.arabic .body")).toHaveText("بحضنك خذينا");
  });

  test("the Mary image is forwarded with the clean Arabic laid over it", async ({
    page,
  }) => {
    await playScreen(page, 1);
    const frame = page.locator(".msg.image .img-frame").first();
    await expect(frame.locator(".img-arabic")).toHaveText("بحضنك خذينا");
    // the canvas is actually drawn (opaque pixels in the centre)
    const drawn = await frame.locator("canvas").evaluate((c) => {
      const x = Math.max(0, Math.floor(c.width / 2) - 20);
      const y = Math.max(0, Math.floor(c.height / 2) - 20);
      const d = c.getContext("2d").getImageData(x, y, 40, 40).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
      return false;
    });
    expect(drawn).toBe(true);
  });

  test("each screen forwards a DIFFERENT image", async ({ page }) => {
    const srcs = [];
    for (const n of [1, 3, 5]) {
      await playScreen(page, n);
      srcs.push(
        await page
          .locator(".msg.image canvas")
          .first()
          .evaluate((c) => {
            // each screen's own image draws differently; sample a centre patch
            const x = Math.max(0, Math.floor(c.width / 2) - 6);
            const y = Math.max(0, Math.floor(c.height / 2) - 6);
            const d = c.getContext("2d").getImageData(x, y, 12, 12).data;
            return Array.from(d).join(",");
          }),
      );
    }
    expect(new Set(srcs).size).toBe(3);
  });

  test("no text bubble runs longer than four lines", async ({ page }) => {
    await playScreen(page, 1); // contains the long 'I remember...' message
    const tooLong = await page.evaluate(() => {
      const bad = [];
      for (const b of document.querySelectorAll(".msg:not(.image) .body")) {
        const lh = parseFloat(getComputedStyle(b).lineHeight) || 18;
        const lines = Math.round(b.getBoundingClientRect().height / lh);
        if (lines > 4) bad.push({ lines, text: b.textContent.slice(0, 30) });
      }
      return bad;
    });
    expect(tooLong, JSON.stringify(tooLong)).toEqual([]);
  });

  test("forward: desktop opens a NEW window (main stays); mobile navigates in place", async ({
    page,
    context,
  }, testInfo) => {
    await playScreen(page, 1);
    await expect(page.locator("#notif")).toBeVisible();
    const isMobile = testInfo.project.name === "mobile";
    const popupP = context
      .waitForEvent("page", { timeout: 2500 })
      .catch(() => null);
    await page.locator("#notif").click();
    const popup = await popupP;
    if (isMobile) {
      // a phone cannot float windows -> same-window navigation, no popup
      expect(popup).toBeNull();
      await expect(page).toHaveURL(/screen=2/);
    } else {
      // desktop -> a separate window/tab opens screen 2 and the main window stays
      expect(popup).not.toBeNull();
      await popup.waitForLoadState("domcontentloaded");
      expect(popup.url()).toContain("screen=2");
      await expect(page).toHaveURL(/screen=1/);
    }
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
});

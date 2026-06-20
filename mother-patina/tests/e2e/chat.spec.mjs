// tests/e2e/chat.spec.mjs - mother-patina

import { test, expect } from "@playwright/test";

async function playScreen(page, n) {
  await page.goto(`/?screen=${n}&fast=1`);
  await page.waitForFunction(() => window.__mp && window.__mp.done, {
    timeout: 10000,
  });
}

// sample a centre patch of the image canvas as a string fingerprint
async function centrePatch(page) {
  return page
    .locator(".msg.image canvas")
    .first()
    .evaluate((c) => {
      const x = Math.max(0, Math.floor(c.width / 2) - 6);
      const y = Math.max(0, Math.floor(c.height / 2) - 6);
      const d = c.getContext("2d").getImageData(x, y, 12, 12).data;
      return Array.from(d).join(",");
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

  test("each screen is a chat with a DIFFERENT named contact", async ({
    page,
  }) => {
    const expected = {
      1: "Maman",
      2: "Tantina Auntie",
      3: "Oukhti Sis",
      4: "Khalo joj",
      5: "mum",
    };
    for (const [n, name] of Object.entries(expected)) {
      await playScreen(page, Number(n));
      await expect(page.locator("#chat-name")).toHaveText(name);
      // the header avatar is the persona svg, not the Mary picture
      const bg = await page
        .locator("#chat-avatar")
        .evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(bg).toContain("avatars/");
    }
  });

  test("the SAME Mary image is forwarded, with the clean Arabic laid over it", async ({
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

  test("she pixelizes more each screen: gen 0 crisp, later screens are blocky", async ({
    page,
  }) => {
    // screen 1 is gen 0 (no pixelation class); later screens carry it
    await playScreen(page, 1);
    expect(
      await page.locator(".msg.image .img-frame.is-pixelized").count(),
    ).toBe(0);
    const patch1 = await centrePatch(page);

    await playScreen(page, 4);
    await expect(
      page.locator(".msg.image .img-frame.is-pixelized").first(),
    ).toBeVisible();
    const patch4 = await centrePatch(page);

    // same source picture, different decay -> the centre patch differs
    expect(patch1).not.toBe(patch4);
  });

  test("no text bubble runs longer than four lines", async ({ page }) => {
    await playScreen(page, 1); // contains the long 'Do you remember...' message
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
    // screen 1 forwards via a notification from the next contact
    await expect(page.locator("#notif-title")).toHaveText("Tantina Auntie");
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

  test("the forward affordance differs per screen (forward button, then a burst badge)", async ({
    page,
  }) => {
    // screen 2 forwards to the sister via a "Forward" button
    await playScreen(page, 2);
    await expect(page.locator("#notif")).toBeVisible();
    await expect(page.locator("#notif-title")).toHaveText("Forward");
    await expect(page.locator("#notif-sub")).toHaveText("to Oukhti Sis");

    // screen 4 is a burst from mum: the unread badge climbs to 3
    await playScreen(page, 4);
    await expect(page.locator("#notif-title")).toHaveText("mum");
    await expect(page.locator("#notif-badge")).toBeVisible();
    await expect(page.locator("#notif-badge")).toHaveText("3");
  });

  test("screen 5 ends on a Save-the-prayer button that downloads mother-patina.txt", async ({
    page,
  }) => {
    await playScreen(page, 5);
    await expect(
      page.locator(".msg", { hasText: "habibi" }).last(),
    ).toBeVisible();
    // no onward forward: the final affordance saves the prayer
    await expect(page.locator("#notif")).toBeVisible();
    await expect(page.locator("#notif-title")).toHaveText("Save the prayer");
    await expect(page.locator("#notif-sub")).toHaveText("mother-patina.txt");

    const downloadP = page.waitForEvent("download", { timeout: 5000 });
    await page.locator("#notif").click();
    const download = await downloadP;
    expect(download.suggestedFilename()).toBe("mother-patina.txt");
    const stream = await download.createReadStream();
    const text = await new Promise((resolve, reject) => {
      let buf = "";
      stream.on("data", (c) => (buf += c));
      stream.on("end", () => resolve(buf));
      stream.on("error", reject);
    });
    expect(text).toContain("a hammock for us");
    await expect(page.locator("#notif-sub")).toHaveText("saved to your device");
  });

  test("the forward button carries a per-screen accessible name (not a static 'continue')", async ({
    page,
  }) => {
    const expected = {
      1: "Open new message from Tantina Auntie",
      2: "Forward to Oukhti Sis",
      4: "Open 3 new messages from mum",
      5: "Save the prayer as mother-patina.txt",
    };
    for (const [n, name] of Object.entries(expected)) {
      await playScreen(page, Number(n));
      await expect(page.locator("#notif")).toHaveAttribute("aria-label", name);
    }
  });

  test("the Arabic prayer bubble's timestamp stays LTR ('6:03 AM', not reversed)", async ({
    page,
  }) => {
    await playScreen(page, 1);
    const dir = await page
      .locator(".msg.arabic .meta")
      .first()
      .evaluate((el) => getComputedStyle(el).direction);
    expect(dir).toBe("ltr");
  });

  test("the forward notification does not cover the chat header (current contact stays visible)", async ({
    page,
  }) => {
    await playScreen(page, 3);
    await expect(page.locator("#notif")).toBeVisible();
    // let the drop-in entrance animation settle to the resting position
    await page
      .locator("#notif")
      .evaluate((el) =>
        Promise.all(el.getAnimations().map((a) => a.finished.catch(() => {}))),
      );
    const headBottom = await page
      .locator(".chat-head")
      .evaluate((el) => el.getBoundingClientRect().bottom);
    const notifTop = await page
      .locator("#notif")
      .evaluate((el) => el.getBoundingClientRect().top);
    // the banner sits below the header, so the header name/avatar are not occluded
    expect(notifTop).toBeGreaterThanOrEqual(headBottom - 1);
    await expect(page.locator("#chat-name")).toBeVisible();
  });
});

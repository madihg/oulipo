/**
 * tests/e2e/stage-motion.spec.mjs
 *
 * US-007: "passing the peace" by phone motion, plus the manual fallback.
 *   - a deliberate motion (synthetic devicemotion) registers exactly one peace
 *   - rapid repeats within the station do not double-count
 *   - when motion permission is denied, the manual button still passes the peace
 *
 * Uses the offline loopback transport (admin authority + audience in one context).
 */

import { test, expect } from "@playwright/test";

function ids() {
  const sid = "motion-" + Math.floor(Math.random() * 1e6);
  return {
    ADMIN: `/admin/?s=${sid}&rt=loopback`,
    AUD: `/audience/?s=${sid}&rt=loopback`,
  };
}

async function bringUp(
  context,
  { ADMIN, AUD },
  { threshold = 5, denyMotion = false } = {},
) {
  const admin = await context.newPage();
  const audience = await context.newPage();
  if (denyMotion) {
    await audience.addInitScript(() => {
      // Simulate iOS denying motion permission.
      if (typeof DeviceMotionEvent !== "undefined") {
        DeviceMotionEvent.requestPermission = async () => "denied";
      }
    });
  }
  await admin.goto(ADMIN);
  await admin.waitForFunction(() => !!window.__stage);
  await audience.goto(AUD);
  await audience.locator("#join-btn").click();
  await audience.waitForFunction(() => !!window.__stage);
  await admin.locator("#threshold-input").fill(String(threshold));
  await admin.locator("#threshold-input").dispatchEvent("change");
  await admin.locator("#begin-btn").click();
  await expect(audience.locator("body")).toHaveAttribute(
    "data-phase",
    "active",
    {
      timeout: 4000,
    },
  );
  return { admin, audience };
}

// Dispatch a synthetic devicemotion with a given magnitude on each axis.
async function fireMotion(page, mag) {
  await page.evaluate((m) => {
    let ev;
    try {
      ev = new DeviceMotionEvent("devicemotion", {
        accelerationIncludingGravity: { x: m, y: m, z: m },
      });
    } catch {
      ev = new Event("devicemotion");
      Object.defineProperty(ev, "accelerationIncludingGravity", {
        value: { x: m, y: m, z: m },
      });
    }
    window.dispatchEvent(ev);
  }, mag);
}

test.describe("passing the peace - motion + fallback", () => {
  test("a deliberate motion registers exactly one peace", async ({
    context,
  }) => {
    const { admin, audience } = await bringUp(context, ids());
    // First event primes the baseline; the spike then clears the threshold.
    await fireMotion(audience, 2); // baseline (near rest)
    await audience.waitForTimeout(60);
    await fireMotion(audience, 45); // a deliberate move
    await expect
      .poll(
        async () =>
          (await admin.evaluate(() => window.__stage.getState())).peaceCount,
        {
          timeout: 4000,
        },
      )
      .toBe(1);
  });

  test("rapid repeats within the same station do not double-count", async ({
    context,
  }) => {
    const { admin, audience } = await bringUp(context, ids());
    await fireMotion(audience, 2);
    await audience.waitForTimeout(60);
    await fireMotion(audience, 45);
    await fireMotion(audience, 48);
    await fireMotion(audience, 50);
    await audience.waitForTimeout(400);
    expect(
      (await admin.evaluate(() => window.__stage.getState())).peaceCount,
    ).toBe(1);
  });

  test("denied motion permission: the manual button still passes the peace", async ({
    context,
  }) => {
    const { admin, audience } = await bringUp(context, ids(), {
      denyMotion: true,
    });
    await expect(audience.locator("#peace-btn")).toBeEnabled();
    await audience.locator("#peace-btn").click();
    await expect
      .poll(
        async () =>
          (await admin.evaluate(() => window.__stage.getState())).peaceCount,
        {
          timeout: 4000,
        },
      )
      .toBe(1);
  });
});

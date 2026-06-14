/**
 * tests/e2e/stage-sync.spec.mjs
 *
 * US-004 (+US-006/007/008): the live control plane synced over the OFFLINE
 * loopback transport (BroadcastChannel bridges two pages in one context, so the
 * test runs with no network). Admin is the authority; audience joins, passes the
 * peace, and the state advances on every surface. Dedupe + presence verified.
 *
 * Both pages expose window.__stage; we assert against __stage.getState().
 */

import { test, expect } from "@playwright/test";

const SID = "sync-" + Math.floor(Math.random() * 1e6);
const ADMIN = `/admin/?s=${SID}&rt=loopback`;
const AUD = `/audience/?s=${SID}&rt=loopback`;

async function stageState(page) {
  return page.evaluate(() => window.__stage && window.__stage.getState());
}

test.describe("stage live sync (loopback)", () => {
  test("a peace from the audience advances the station on every surface", async ({
    context,
  }) => {
    const admin = await context.newPage();
    const audience = await context.newPage();

    // Admin (authority) first so it is present to broadcast.
    await admin.goto(ADMIN);
    await admin.waitForFunction(() => !!window.__stage);
    expect(await admin.evaluate(() => window.__stage.mode)).toBe("loopback");

    // Audience joins (the tap grants motion on iOS; here it just joins).
    await audience.goto(AUD);
    await audience.locator("#join-btn").click();
    await audience.waitForFunction(() => !!window.__stage);
    await expect(audience.locator("#live")).toBeVisible();

    // Admin: set a 1-peace threshold and begin the show.
    await admin.locator("#threshold-input").fill("1");
    await admin.locator("#threshold-input").dispatchEvent("change");
    await admin.locator("#begin-btn").click();

    // The audience should reach the active phase and enable the peace button.
    await expect(audience.locator("body")).toHaveAttribute(
      "data-phase",
      "active",
      {
        timeout: 4000,
      },
    );
    await expect(audience.locator("#peace-btn")).toBeEnabled();

    // Pass the peace.
    await audience.locator("#peace-btn").click();

    // Authority advances exactly one station, decay steps once.
    await expect
      .poll(async () => (await stageState(admin)).stationIndex, {
        timeout: 4000,
      })
      .toBe(1);
    const adminState = await stageState(admin);
    expect(adminState.peaceCount).toBe(1);
    expect(adminState.decayGen).toBe(1);
    expect(adminState.threadsLit).toBe(1);

    // The audience surface reflects the same peaceCount live.
    await expect
      .poll(async () => (await stageState(audience)).peaceCount, {
        timeout: 4000,
      })
      .toBe(1);
    await expect(audience.locator("#peace-count")).toHaveText("1");
  });

  test("a duplicate peace from the same device does not double-count", async ({
    context,
  }) => {
    const admin = await context.newPage();
    const audience = await context.newPage();

    await admin.goto(ADMIN + "-dup");
    await admin.waitForFunction(() => !!window.__stage);
    await audience.goto(AUD + "-dup");
    await audience.locator("#join-btn").click();
    await audience.waitForFunction(() => !!window.__stage);

    // Threshold 5 so a single peace does NOT advance the station.
    await admin.locator("#threshold-input").fill("5");
    await admin.locator("#threshold-input").dispatchEvent("change");
    await admin.locator("#begin-btn").click();
    await expect(audience.locator("body")).toHaveAttribute(
      "data-phase",
      "active",
    );

    await audience.locator("#peace-btn").click();
    await expect
      .poll(async () => (await stageState(admin)).peaceCount, { timeout: 4000 })
      .toBe(1);

    // The button disables after passing; force a second send via the stage API.
    await audience.evaluate(() => window.__stage.passPeace());
    await audience.waitForTimeout(400);
    expect((await stageState(admin)).peaceCount).toBe(1);
    expect((await stageState(admin)).passesThisStation).toBe(1);
  });

  test("admin presence counts the connected audience device", async ({
    context,
  }) => {
    const admin = await context.newPage();
    const audience = await context.newPage();

    await admin.goto(ADMIN + "-pres");
    await admin.waitForFunction(() => !!window.__stage);
    await audience.goto(AUD + "-pres");
    await audience.locator("#join-btn").click();
    await audience.waitForFunction(() => !!window.__stage);

    await expect
      .poll(
        async () => Number(await admin.locator("#presence-count").innerText()),
        {
          timeout: 4000,
        },
      )
      .toBeGreaterThanOrEqual(1);
  });
});

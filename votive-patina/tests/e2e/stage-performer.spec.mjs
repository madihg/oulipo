/**
 * tests/e2e/stage-performer.spec.mjs
 *
 * US-005 (performer stage mode) + US-009 (threshold -> advance everywhere) +
 * US-012 (a full dry-run). Admin authority + performer + audience over the offline
 * loopback transport. The performer is a pure renderer of the synced state.
 */

import { test, expect } from "@playwright/test";

function ids() {
  const sid = "perf-" + Math.floor(Math.random() * 1e6);
  return {
    ADMIN: `/admin/?s=${sid}&rt=loopback`,
    PERF: `/?stage=performer&s=${sid}&rt=loopback`,
    AUD: `/audience/?s=${sid}&rt=loopback`,
  };
}

async function state(page) {
  return page.evaluate(() => window.__stage && window.__stage.getState());
}

// Click the audience peace button, then wait for the authority to advance.
async function passAndAdvance(audience, admin, fromStation) {
  await expect(audience.locator("#peace-btn")).toBeEnabled({ timeout: 4000 });
  await audience.locator("#peace-btn").click();
  await expect
    .poll(async () => (await state(admin)).stationIndex, { timeout: 4000 })
    .toBe(fromStation + 1);
}

test.describe("performer stage mode + full dry-run", () => {
  test("performer renders the synced station, decay, and threads", async ({
    context,
  }) => {
    const { ADMIN, PERF, AUD } = ids();
    const admin = await context.newPage();
    const performer = await context.newPage();
    const audience = await context.newPage();

    await admin.goto(ADMIN);
    await admin.waitForFunction(() => !!window.__stage);

    await performer.goto(PERF);
    await performer.waitForFunction(() => !!window.__stage);
    // stage mode reveals the performer view and hides the normal page
    await expect(performer.locator("#performer-stage")).toBeVisible();
    await expect(performer.locator(".page")).toBeHidden();
    // five threads of light, none lit yet
    await expect(performer.locator(".perf-thread")).toHaveCount(5);

    await audience.goto(AUD);
    await audience.locator("#join-btn").click();
    await audience.waitForFunction(() => !!window.__stage);

    // 1 peace per station.
    await admin.locator("#threshold-input").fill("1");
    await admin.locator("#threshold-input").dispatchEvent("change");
    await admin.locator("#begin-btn").click();

    // Active: the performer shows station 1's line + narration, no threads lit.
    await expect(performer.locator("body")).toHaveAttribute(
      "data-phase",
      "active",
      {
        timeout: 4000,
      },
    );
    await expect(performer.locator("#perf-translit")).toHaveText(
      "FI KHOUDNIKI KHOUZINA",
    );
    await expect(performer.locator("#perf-narration")).toContainText(
      "Embrace us",
    );
    expect(
      await performer.locator('.perf-thread[data-lit="true"]').count(),
    ).toBe(0);

    // One peace -> station advances; the performer reflects station 2, 1 thread,
    // and one generation of decay.
    await passAndAdvance(audience, admin, 0);
    await expect(performer.locator("#perf-translit")).toHaveText(
      "WA 3AN KOULLI CHARREN 2EB3IDINA",
      { timeout: 4000 },
    );
    await expect
      .poll(async () =>
        performer.locator('.perf-thread[data-lit="true"]').count(),
      )
      .toBe(1);
    await expect(performer.locator("#perf-count")).toHaveText("1");
    expect((await state(performer)).decayGen).toBe(1);
  });

  test("full dry-run: walk all 5 stations to the finale, then reset", async ({
    context,
  }) => {
    const { ADMIN, PERF, AUD } = ids();
    const admin = await context.newPage();
    const performer = await context.newPage();
    const audience = await context.newPage();

    await admin.goto(ADMIN);
    await admin.waitForFunction(() => !!window.__stage);
    await performer.goto(PERF);
    await performer.waitForFunction(() => !!window.__stage);
    await audience.goto(AUD);
    await audience.locator("#join-btn").click();
    await audience.waitForFunction(() => !!window.__stage);

    await admin.locator("#threshold-input").fill("1");
    await admin.locator("#threshold-input").dispatchEvent("change");
    await admin.locator("#begin-btn").click();
    await expect(audience.locator("body")).toHaveAttribute(
      "data-phase",
      "active",
    );

    // Walk all five stations.
    for (let s = 0; s < 5; s++) {
      await passAndAdvance(audience, admin, s);
    }

    // Finale: all threads lit, image fully worn, finale flag everywhere.
    const fin = await state(performer);
    expect(fin.finale).toBe(true);
    expect(fin.decayGen).toBe(5);
    expect(fin.threadsLit).toBe(5);
    expect(fin.peaceCount).toBe(5);
    await expect(performer.locator("body")).toHaveAttribute(
      "data-phase",
      "finale",
    );
    expect(
      await performer.locator('.perf-thread[data-lit="true"]').count(),
    ).toBe(5);

    // Reset returns every surface to the start.
    await admin.locator("#reset-btn").click();
    await expect
      .poll(async () => (await state(performer)).decayGen, { timeout: 4000 })
      .toBe(0);
    const reset = await state(performer);
    expect(reset.stationIndex).toBe(0);
    expect(reset.peaceCount).toBe(0);
    expect(reset.threadsLit).toBe(0);
    expect(reset.finale).toBe(false);
  });
});

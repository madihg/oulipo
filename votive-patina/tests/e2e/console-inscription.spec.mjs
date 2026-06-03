/**
 * tests/e2e/console-inscription.spec.mjs
 *
 * Verifies the real browser console receives the prayer lines as boxes are
 * opened, the full prayer + couplet + SUBSTACK invite at 5/5, and that the
 * ASCII relic comment + accreted inscription DOM nodes are present.
 *
 * Covers: US-002 (console prayer), US-010 (hidden inscriptions).
 */

import { test, expect } from "@playwright/test";

// Canonical prayer lines (from DESIGN.md Appendix B / the contract)
const PRAYER_LINES = [
  "Hold us against your bosom",
  "Guard us from all evil",
  "Mother of Jesus",
  "Plead for us",
  "Amen",
];

async function freshPage(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("votivepatina.decayStep");
    localStorage.removeItem("votivepatina.prayerCount");
    localStorage.removeItem("votivepatina.prayer");
  });
  await page.reload();
}

async function enterPraying(page) {
  await page.locator("#pray-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-state", "praying", {
    timeout: 8000,
  });
}

test.describe("Console inscription - prayer lines", () => {
  test("each arabic-line box open logs its canonical prayer line to the real console", async ({
    page,
  }) => {
    const consoleMessages = [];
    page.on("console", (msg) => {
      if (msg.type() === "log") consoleMessages.push(msg.text());
    });

    await freshPage(page);
    await enterPraying(page);

    const arabicBoxes = page.locator(
      "button.det-box[data-box-type='arabic-line']",
    );
    const boxCount = await arabicBoxes.count();
    expect(boxCount).toBe(5);

    for (let i = 0; i < boxCount; i++) {
      const before = consoleMessages.length;
      await arabicBoxes.nth(i).click();
      // Wait briefly for the console.log to fire
      await page.waitForTimeout(300);

      // The prayer line for box i must have been logged
      const newMessages = consoleMessages.slice(before);
      const found = newMessages.some((msg) => msg.includes(PRAYER_LINES[i]));
      expect(
        found,
        `Expected console log containing "${PRAYER_LINES[i]}" after clicking box ${i}`,
      ).toBe(true);
    }
  });

  test("re-clicking an opened box does NOT log the line a second time", async ({
    page,
  }) => {
    const matchingLogs = [];
    page.on("console", (msg) => {
      if (msg.type() === "log" && msg.text().includes(PRAYER_LINES[0])) {
        matchingLogs.push(msg.text());
      }
    });

    await freshPage(page);
    await enterPraying(page);

    const firstBox = page
      .locator("button.det-box[data-box-type='arabic-line']")
      .first();
    await firstBox.click();
    await page.waitForTimeout(300);
    const countAfterFirst = matchingLogs.length;

    // Click again
    await firstBox.click();
    await page.waitForTimeout(300);

    expect(matchingLogs.length).toBe(countAfterFirst);
  });
});

test.describe("Console inscription - full prayer at 5/5", () => {
  async function prayAll(page) {
    await freshPage(page);

    const allLogs = [];
    page.on("console", (msg) => {
      if (msg.type() === "log") allLogs.push(msg.text());
    });

    await enterPraying(page);

    const arabicBoxes = page.locator(
      "button.det-box[data-box-type='arabic-line']",
    );
    const count = await arabicBoxes.count();
    for (let i = 0; i < count; i++) {
      await arabicBoxes.nth(i).click();
      await page.waitForTimeout(200);
    }
    await expect(page.locator("#counter-pill")).toHaveAttribute(
      "data-count",
      "5",
      {
        timeout: 5000,
      },
    );
    // Give full-prayer log time to fire
    await page.waitForTimeout(600);
    return allLogs;
  }

  test("all 5 canonical prayer lines appear in console by 5/5", async ({
    page,
  }) => {
    const allLogs = await prayAll(page);
    const joined = allLogs.join("\n");
    for (const line of PRAYER_LINES) {
      expect(
        joined.includes(line),
        `Expected console to contain "${line}"`,
      ).toBe(true);
    }
  });

  test("'architecture of your faith' appears in console at 5/5", async ({
    page,
  }) => {
    const allLogs = await prayAll(page);
    const joined = allLogs.join("\n");
    expect(
      joined.includes("architecture of your faith"),
      "Expected 'architecture of your faith' in console logs at 5/5",
    ).toBe(true);
  });

  test("a log line containing '<SUBSTACK_URL>' appears in console at 5/5", async ({
    page,
  }) => {
    const allLogs = await prayAll(page);
    const joined = allLogs.join("\n");
    expect(
      joined.includes("<SUBSTACK_URL>"),
      "Expected '<SUBSTACK_URL>' placeholder in console logs at 5/5",
    ).toBe(true);
  });
});

test.describe("Relic comment and inscriptions in DOM", () => {
  test("page source begins with an HTML comment containing '+'", async ({
    page,
  }) => {
    await freshPage(page);
    // Fetch the raw source of index.html
    const response = await page.request.get("/");
    const source = await response.text();
    const trimmed = source.trimStart();
    expect(
      trimmed.startsWith("<!--"),
      "index.html first non-whitespace content must be an HTML comment (<!--)",
    ).toBe(true);
    const firstCommentEnd = trimmed.indexOf("-->");
    const firstComment = trimmed.slice(0, firstCommentEnd + 3);
    expect(
      firstComment.includes("+"),
      `First HTML comment must contain '+' (ASCII cross relic). Got: ${firstComment.slice(0, 200)}`,
    ).toBe(true);
  });

  test("#inscription element exists (hidden) in the DOM", async ({ page }) => {
    await freshPage(page);
    const inscription = page.locator("#inscription");
    await expect(inscription).toHaveCount(1);
  });

  test("after opening all 5 boxes, #inscription contains prayer content", async ({
    page,
  }) => {
    await freshPage(page);
    await enterPraying(page);

    const arabicBoxes = page.locator(
      "button.det-box[data-box-type='arabic-line']",
    );
    const count = await arabicBoxes.count();
    for (let i = 0; i < count; i++) {
      await arabicBoxes.nth(i).click();
      await page.waitForTimeout(200);
    }

    // #inscription should contain at least one prayer line
    const inscriptionText = await page.locator("#inscription").textContent();
    const found = PRAYER_LINES.some((line) => inscriptionText?.includes(line));
    expect(
      found,
      `#inscription should contain prayer content after 5/5. Got: ${inscriptionText?.slice(0, 300)}`,
    ).toBe(true);
  });

  test("HTML comments accrete inside #prayer-card as boxes are opened", async ({
    page,
  }) => {
    await freshPage(page);
    await enterPraying(page);

    const arabicBoxes = page.locator(
      "button.det-box[data-box-type='arabic-line']",
    );
    await arabicBoxes.first().click();
    await page.waitForTimeout(300);

    // Check that at least one prayer line appears as an HTML comment in #prayer-card
    const cardHTML = await page.locator("#prayer-card").innerHTML();
    expect(
      cardHTML.includes("<!--"),
      "#prayer-card should contain HTML comment nodes after a box is opened",
    ).toBe(true);
    const found = PRAYER_LINES.some((line) => cardHTML.includes(line));
    expect(
      found,
      `An HTML comment in #prayer-card should contain a prayer line. Card HTML: ${cardHTML.slice(0, 500)}`,
    ).toBe(true);
  });
});

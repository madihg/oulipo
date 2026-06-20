/**
 * playwright.config.mjs - votivepatina DEV-ONLY Playwright configuration
 *
 * Chromium-only. Three projects:
 *   mobile          - iPhone 13 (coarse pointer, touch)
 *   desktop         - Desktop Chrome
 *   reduced-motion  - Desktop Chrome + reducedMotion:reduce
 *
 * webServer starts the local static server on port 4179.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",

  // Fail fast in CI; locally show all failures
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: "list",

  // Global test options
  use: {
    baseURL: "http://localhost:4179",
    // Screenshots on failure, trace on first retry
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "mobile",
      use: {
        // iPhone 13 metrics (mobile viewport, touch, coarse pointer) but driven by
        // Chromium so the suite needs only `npx playwright install chromium`.
        // Real mobile-Safari/WebKit coverage can be added with `install webkit`
        // and changing defaultBrowserType back to "webkit".
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "reduced-motion",
      use: {
        ...devices["Desktop Chrome"],
        reducedMotion: "reduce",
      },
    },
  ],

  // Start the dev server before running tests
  webServer: {
    command: "npm run serve",
    port: 4179,
    reuseExistingServer: true,
    // Give the server a moment to start
    timeout: 10_000,
  },
});

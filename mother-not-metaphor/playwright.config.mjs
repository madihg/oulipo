/**
 * playwright.config.mjs - mother-not-metaphor DEV-ONLY Playwright configuration
 *
 * Chromium-only. Three projects:
 *   mobile          - iPhone 13 (coarse pointer, touch)
 *   desktop         - Desktop Chrome
 *   reduced-motion  - Desktop Chrome + reducedMotion:reduce
 *
 * webServer starts the local static server on port 4180. The e2e suite exercises
 * the no-camera auto-play fallback (headless Chromium has no camera), which is the
 * deterministic path - hand tracking is a live-only enhancement.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: "list",

  use: {
    baseURL: "http://localhost:4180",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "mobile",
      use: {
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

  webServer: {
    command: "npm run serve",
    port: 4180,
    reuseExistingServer: true,
    timeout: 10_000,
  },
});

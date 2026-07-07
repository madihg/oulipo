// @ts-check
/**
 * tests/e2e/fragmentary.spec.mjs - deterministic, camera-free coverage of the
 * gesture dwell + HUD behavior.
 *
 * Headless Chromium has no camera, so instead of hand tracking we drive
 * window.MNM.feed(reading, now) - the SAME entry point the real tracker calls -
 * with fake monotonic timestamps. The control's stableFrames + dwell + reset
 * logic runs for real; only the clock is synthetic.
 *
 * A "reading" is { present:true, up:[bool x5], extensions:[0..1 x5] } (finger
 * order thumb,index,middle,ring,pinky) or { present:false }. To fire, a bound
 * pose must (a) follow a RESET - a neutral (unbound) pose or an absent hand -
 * and (b) be HELD for dwellMs. The shipped bindings are open hand -> next and
 * peace sign -> back; a fist/relaxed hand is unbound (a neutral / reset).
 */

import { test, expect } from "@playwright/test";

const AUTO = "/?mode=auto&speed=12";

// Poses (thumb, index, middle, ring, pinky).
const OPEN = [true, true, true, true, true]; // -> next
const PEACE = [false, true, true, false, false]; // -> back
const FIST = [false, false, false, false, false]; // neutral (reset)

async function ready(page) {
  await page.goto(AUTO);
  await page.waitForFunction(
    () => !!window.MNM && typeof window.MNM.feed === "function",
  );
}

/**
 * Install an in-page driver on window.__fx with a single monotonic fake clock.
 *   hold(up, ms)  - stabilize then hold `up` across `ms` of fake time
 *   reset()       - feed a neutral (fist) long enough to arm + set the reset flag
 *   drop(n)       - feed present:false n frames (hand absent, also resets)
 *   dwell()       - window.MNM.config.dwellMs
 */
async function installDriver(page) {
  await page.evaluate(() => {
    const w = /** @type {any} */ (window);
    const M = w.MNM;
    const stableFrames = () => M.config.stableFrames || 4;
    const ext = (up) => up.map((b) => (b ? 1 : 0));
    let t = 100000;

    const feedOnce = (up) =>
      M.feed(
        up == null
          ? { present: false, up: null, extensions: [0, 0, 0, 0, 0] }
          : { present: true, up: up.slice(), extensions: ext(up) },
        t,
      );

    w.__fx = {
      dwell: () => M.config.dwellMs,
      now: () => t,
      hold(up, ms, step = 40) {
        const start = t;
        let last = null;
        for (let i = 0; i < stableFrames() + 1; i++) last = feedOnce(up);
        while (t - start < ms) {
          t += step;
          last = feedOnce(up);
        }
        return last;
      },
      // A neutral (unbound) pose: arms if needed AND sets the reset flag.
      reset(frames = stableFrames() + 3) {
        let last = null;
        for (let i = 0; i < frames; i++) {
          last = feedOnce([false, false, false, false, false]);
          t += 16;
        }
        return last;
      },
      drop(n = 6) {
        let last = null;
        for (let i = 0; i < n; i++) {
          last = feedOnce(null);
          t += 16;
        }
        return last;
      },
    };
  });
}

test.beforeEach(async ({ page }) => {
  await ready(page);
  await installDriver(page);
});

test("arming: a first stable open hand (no reset) does not advance", async ({
  page,
}) => {
  const index = await page.evaluate(
    ({ OPEN }) => {
      const w = /** @type {any} */ (window);
      w.MNM.goTo(0);
      w.__fx.hold(OPEN, 3000); // held open the whole time, never reset
      return w.MNM.state().index;
    },
    { OPEN },
  );
  expect(index).toBe(0);
});

test("a relaxed/neutral hand never advances", async ({ page }) => {
  const index = await page.evaluate(() => {
    const w = /** @type {any} */ (window);
    w.MNM.goTo(0);
    w.__fx.hold([false, false, false, false, false], 4000); // fist is unbound
    return w.MNM.state().index;
  });
  expect(index).toBe(0);
});

test("open hand advances after a reset + full dwell, not before", async ({
  page,
}) => {
  const r = await page.evaluate(
    ({ OPEN }) => {
      const w = /** @type {any} */ (window);
      const fx = w.__fx;
      w.MNM.goTo(0);
      fx.reset(); // relax (neutral) -> enables firing
      fx.hold(OPEN, Math.floor(fx.dwell() * 0.5));
      const mid = w.MNM.state().index;
      fx.hold(OPEN, fx.dwell()); // cumulative hold now exceeds the dwell
      return { mid, after: w.MNM.state().index };
    },
    { OPEN },
  );
  expect(r.mid, "must not fire before the dwell").toBe(0);
  expect(r.after, "fires once held past the dwell").toBe(1);
});

test("HUD reflects the fingers and fills the meter mid-hold", async ({
  page,
}) => {
  const hud = await page.evaluate(
    ({ PEACE }) => {
      const w = /** @type {any} */ (window);
      const fx = w.__fx;
      document.getElementById("stage").setAttribute("data-hud", "on");
      w.MNM.goTo(0);
      fx.reset(); // so the held peace pose actually accrues dwell
      fx.hold(PEACE, Math.floor(fx.dwell() * 0.4)); // partway

      const bars = [...document.querySelectorAll("#hud-panel .fx-bar")];
      const fillH = (i) =>
        parseFloat(
          (bars[i].querySelector(".fx-bar__fill").style.height || "").trim(),
        ) || 0;
      const meter = document.querySelector("#hud-panel .fx-meter__fill");
      return {
        barCount: bars.length,
        indexUp: bars[1].classList.contains("is-up"),
        middleUp: bars[2].classList.contains("is-up"),
        thumbUp: bars[0].classList.contains("is-up"),
        indexFill: fillH(1),
        ringFill: fillH(3),
        pinkyFill: fillH(4),
        meterW: parseFloat((meter.style.width || "").trim()) || 0,
      };
    },
    { PEACE },
  );

  expect(hud.barCount).toBe(5);
  expect(hud.indexUp).toBe(true);
  expect(hud.middleUp).toBe(true);
  expect(hud.thumbUp).toBe(false);
  expect(hud.indexFill).toBeGreaterThan(hud.ringFill);
  expect(hud.ringFill).toBe(0);
  expect(hud.pinkyFill).toBe(0);
  expect(hud.meterW).toBeGreaterThan(0);
  expect(hud.meterW).toBeLessThan(100);
});

test("a neutral pose (not a full drop) resets between advances", async ({
  page,
}) => {
  const r = await page.evaluate(
    ({ OPEN }) => {
      const w = /** @type {any} */ (window);
      const fx = w.__fx;
      w.MNM.goTo(0);
      fx.reset();
      fx.hold(OPEN, fx.dwell() + 300);
      const first = w.MNM.state().index;
      fx.reset(); // relax in frame, no full drop
      fx.hold(OPEN, fx.dwell() + 300);
      return { first, second: w.MNM.state().index };
    },
    { OPEN },
  );
  expect(r.first).toBe(1);
  expect(r.second).toBe(2);
});

test("a peace sign fires the back binding (steps to the previous moment)", async ({
  page,
}) => {
  const index = await page.evaluate(
    ({ PEACE }) => {
      const w = /** @type {any} */ (window);
      const fx = w.__fx;
      w.MNM.goTo(2);
      fx.reset();
      fx.hold(PEACE, fx.dwell() + 300);
      return w.MNM.state().index;
    },
    { PEACE },
  );
  expect(index).toBe(1);
});

test("the shipped default config is loaded (dwell ~1500, next + prev bindings)", async ({
  page,
}) => {
  const cfg = await page.evaluate(() => {
    const c = /** @type {any} */ (window).MNM.config;
    return {
      dwellMs: c.dwellMs,
      hasNext: (c.bindings || []).some(
        (b) => b.action && b.action.type === "next",
      ),
      hasPrev: (c.bindings || []).some(
        (b) => b.action && b.action.type === "prev",
      ),
    };
  });
  expect(cfg.dwellMs).toBeGreaterThanOrEqual(1000);
  expect(cfg.dwellMs).toBeLessThanOrEqual(2500);
  expect(cfg.hasNext).toBe(true);
  expect(cfg.hasPrev).toBe(true);
});

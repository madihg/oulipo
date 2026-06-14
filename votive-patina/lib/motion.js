// ─────────────────────────────────────────────────────────────────────────────
//  lib/motion.js  -  votivepatina-stage
//
//  "Passing the peace" on a phone: one deliberate movement = one peace. We detect
//  it from acceleration MAGNITUDE over an adaptive baseline (gravity), debounced so
//  a single gesture fires once and continuous shaking cannot spam it. Direction is
//  NOT verified - the station's prompt tells the audience which way to move; the
//  detector only asks "did a deliberate motion happen". This is robust across phone
//  orientations, which is what a live room needs.
//
//  iOS 13+ requires DeviceMotionEvent.requestPermission() from a user gesture - the
//  "Tap to join" tap. When motion is denied or unavailable, the caller shows a
//  manual button that calls the same peace handler (the fallback path).
//
//  No framework, no em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ask for device-motion permission. MUST be called from a user gesture on iOS.
 * @returns {Promise<"granted"|"denied"|"unsupported">}
 */
export async function requestMotionPermission() {
  const DM =
    typeof DeviceMotionEvent !== "undefined" ? DeviceMotionEvent : null;
  if (!DM) return "unsupported";
  if (typeof DM.requestPermission === "function") {
    try {
      const res = await DM.requestPermission();
      return res === "granted" ? "granted" : "denied";
    } catch {
      // requestPermission throws if not called from a user gesture, or denied.
      return "denied";
    }
  }
  // Non-iOS browsers expose devicemotion without a permission prompt.
  return "granted";
}

/**
 * Create a deliberate-motion detector.
 *
 * @param {object} opts
 * @param {() => void} opts.onShake     called once per deliberate motion
 * @param {number} [opts.threshold=12]  m/s^2 of deviation from baseline to count
 * @param {number} [opts.debounceMs=1100] minimum gap between counted motions
 * @returns {{ start: () => void, stop: () => void, available: boolean }}
 */
export function createShakeDetector({
  onShake,
  threshold = 12,
  debounceMs = 1100,
} = {}) {
  const available = typeof DeviceMotionEvent !== "undefined";
  let lastFire = 0;
  // Adaptive baseline tracks gravity (~9.81) plus slow drift, so only sharp
  // deviations (a deliberate move) clear the threshold.
  let baseline = 9.81;
  let primed = false;

  function handler(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    if (!primed) {
      baseline = mag;
      primed = true;
      return;
    }
    const delta = Math.abs(mag - baseline);
    // Slowly follow the resting orientation so re-baselining is automatic.
    baseline = baseline * 0.9 + mag * 0.1;
    if (delta > threshold) {
      const now = Date.now();
      if (now - lastFire >= debounceMs) {
        lastFire = now;
        if (typeof onShake === "function") onShake();
      }
    }
  }

  return {
    available,
    start() {
      if (available)
        addEventListener("devicemotion", handler, { passive: true });
    },
    stop() {
      if (available) removeEventListener("devicemotion", handler);
    },
  };
}

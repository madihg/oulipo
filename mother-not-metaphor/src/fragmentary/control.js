/**
 * fragmentary/control.js - dwell-based gesture control (pure, DOM-free).
 *
 * Turns a per-frame stream of finger states into deliberate actions. A pose must
 * be (a) stable for a few frames, then (b) HELD for `dwellMs` before it fires -
 * so switches take ~1-2s and never happen by accident. During the hold, `update`
 * reports `progress` 0..1 so the UI can show a filling meter.
 *
 * A "binding" maps a finger pattern to an action:
 *   { id, label, action:{type:'next'|'prev'|'goto'|'restart', index?}, fingers }
 * where `fingers` is { thumb|index|middle|ring|pinky: 'any'|'up'|'down' }.
 * The most specific matching binding wins (most non-'any' constraints).
 *
 * Firing rules:
 *   - The FIRST stable pose only arms (never fires) so nothing jumps on load.
 *   - A pose won't fire twice in a row; you must change pose (or drop the hand)
 *     and re-make it. Dropping the hand ('none') clears the last-fired pose, so
 *     the same gesture can be "pumped" to advance repeatedly.
 */

export const FINGERS = ["thumb", "index", "middle", "ring", "pinky"];

export function patternKey(up) {
  return up.map((b) => (b ? "1" : "0")).join("");
}

/** Does a finger pattern satisfy a binding's constraints? */
export function matchBinding(up, binding) {
  const f = (binding && binding.fingers) || {};
  for (let i = 0; i < FINGERS.length; i++) {
    const c = f[FINGERS[i]] || "any";
    if (c === "any") continue;
    if (!!up[i] !== (c === "up")) return false;
  }
  return true;
}

/** Count of non-'any' finger constraints (higher = more specific). */
export function bindingSpecificity(binding) {
  const f = (binding && binding.fingers) || {};
  return FINGERS.reduce(
    (n, name) => n + (f[name] && f[name] !== "any" ? 1 : 0),
    0,
  );
}

/** The most specific binding that matches `up`, or null. */
export function pickBinding(up, bindings) {
  let best = null;
  let bestScore = -1;
  for (const b of bindings || []) {
    if (matchBinding(up, b)) {
      const s = bindingSpecificity(b);
      if (s > bestScore) {
        bestScore = s;
        best = b;
      }
    }
  }
  return best;
}

const positive = (v, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : dflt;
};

/**
 * Create the control. Feed it `update(up, nowMs)` every frame; `up` is a 5-bool
 * array, or null/undefined when no hand is present. Returns per-frame state:
 *   { progress, firing, action, binding, stable, candidate, armed, ready }
 *
 * The key rule that makes switching DELIBERATE (no accidental fires from a hand
 * that merely settles or rests): a matching pose can only fire once the hand has
 * passed through a "reset" since it armed or last fired - i.e. it was absent
 * ('none') OR held a neutral pose that matches no binding. So the motion is
 * "relax, form the shape, hold" - a resting hand never advances on its own, and
 * the very first pose (when the hand appears) only arms.
 */
export function createGestureControl(config = {}) {
  const cfg = { dwellMs: 1500, stableFrames: 4, bindings: [], ...config };
  cfg.dwellMs = positive(cfg.dwellMs, 1500);
  cfg.stableFrames = Math.max(1, Math.round(positive(cfg.stableFrames, 4)));
  let recent = [];
  let armed = false; // has the hand been seen at all
  let resetSeen = false; // passed a neutral/absent state since arming / last fire
  let candKey = null;
  let candSince = 0;

  function reset() {
    recent = [];
    armed = false;
    resetSeen = false;
    candKey = null;
    candSince = 0;
  }

  function setConfig(next) {
    if (!next) return;
    if (next.dwellMs != null) cfg.dwellMs = positive(next.dwellMs, cfg.dwellMs);
    if (next.stableFrames != null)
      cfg.stableFrames = Math.max(
        1,
        Math.round(positive(next.stableFrames, cfg.stableFrames)),
      );
    if (next.bindings != null) cfg.bindings = next.bindings;
    if (recent.length > cfg.stableFrames)
      recent = recent.slice(-cfg.stableFrames);
  }

  function frame(extra) {
    return {
      progress: 0,
      firing: false,
      action: null,
      binding: null,
      stable: null,
      candidate: null,
      armed,
      ready: false,
      ...extra,
    };
  }

  function update(up, nowMs) {
    const key = up ? patternKey(up) : "none";
    recent.push(key);
    if (recent.length > cfg.stableFrames) recent.shift();
    const stable =
      recent.length >= cfg.stableFrames && recent.every((k) => k === key)
        ? key
        : null;

    if (stable === null) {
      candKey = null;
      return frame({});
    }
    if (stable === "none") {
      resetSeen = true; // hand gone: a clean reset
      candKey = null;
      return frame({ stable: "none" });
    }
    if (!armed) {
      armed = true; // the pose the hand appears in only arms; it never fires
      resetSeen = false;
      candKey = null;
      return frame({ stable, armed: true });
    }

    const binding = pickBinding(up, cfg.bindings);
    if (!binding) {
      resetSeen = true; // a neutral (unbound) pose counts as a reset
      candKey = null;
      return frame({ stable });
    }
    if (!resetSeen) {
      // recognized, but the hand hasn't reset since the last action - hold off
      candKey = null;
      return frame({ stable, binding });
    }

    if (candKey !== stable) {
      candKey = stable;
      candSince = nowMs;
    }
    const raw = (nowMs - candSince) / cfg.dwellMs;
    const progress = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
    if (progress >= 1) {
      resetSeen = false; // consume: must reset before this (or any) pose fires again
      candKey = null;
      return frame({
        progress: 1,
        firing: true,
        action: binding.action,
        binding,
        stable,
        candidate: stable,
        ready: true,
      });
    }
    return frame({ progress, binding, stable, candidate: stable, ready: true });
  }

  return {
    update,
    reset,
    setConfig,
    get config() {
      return cfg;
    },
  };
}

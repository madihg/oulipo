/**
 * fragmentary/config.js - gesture config: validate, merge, persist (pure-ish).
 *
 * The config is a small JSON object:
 *   { dwellMs, stableFrames, showHud, bindings:[ { id, label, action, fingers } ] }
 * A shipped default lives in data/gestures.json; the admin portal writes an
 * override to localStorage (per origin), which the live piece layers on top. All
 * the logic here is pure and Node-testable; the localStorage helpers no-op when
 * there is no storage (e.g. under `node --test`).
 */

export const STORAGE_KEY = "fragmentary:mother-not-metaphor";
export const FINGERS = ["thumb", "index", "middle", "ring", "pinky"];
export const ACTIONS = ["next", "prev", "goto", "restart"];
const CONSTRAINTS = ["any", "up", "down"];

const clampNum = (v, lo, hi, dflt) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
};

export function normalizeAction(a) {
  const type = a && ACTIONS.includes(a.type) ? a.type : "next";
  const out = { type };
  if (type === "goto")
    out.index = Math.max(0, Math.floor(Number(a && a.index) || 0));
  return out;
}

export function normalizeFingers(f) {
  const out = {};
  for (const name of FINGERS) {
    const c = f && f[name];
    out[name] = CONSTRAINTS.includes(c) ? c : "any";
  }
  return out;
}

export function normalizeBinding(b, i = 0) {
  if (!b || typeof b !== "object") return null;
  return {
    id: typeof b.id === "string" && b.id ? b.id : `b${i}`,
    label: typeof b.label === "string" ? b.label : "",
    action: normalizeAction(b.action),
    fingers: normalizeFingers(b.fingers),
  };
}

/** Coerce any input into a valid, complete config. Never throws. */
export function validateConfig(cfg) {
  const c = cfg && typeof cfg === "object" ? cfg : {};
  const bindings = Array.isArray(c.bindings) ? c.bindings : [];
  return {
    dwellMs: clampNum(c.dwellMs, 300, 6000, 1500),
    stableFrames: Math.round(clampNum(c.stableFrames, 1, 15, 4)),
    showHud: c.showHud !== false,
    bindings: bindings.map((b, i) => normalizeBinding(b, i)).filter(Boolean),
  };
}

/** Layer a (partial) override on top of defaults, then validate. */
export function mergeConfig(defaults, override) {
  const d = validateConfig(defaults);
  if (!override || typeof override !== "object") return d;
  return validateConfig({
    dwellMs: override.dwellMs != null ? override.dwellMs : d.dwellMs,
    stableFrames:
      override.stableFrames != null ? override.stableFrames : d.stableFrames,
    showHud: override.showHud != null ? override.showHud : d.showHud,
    bindings: Array.isArray(override.bindings) ? override.bindings : d.bindings,
  });
}

function storage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/** Read the saved override (validated), or null if none / unavailable. */
export function loadStored(key = STORAGE_KEY) {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(key);
    if (!raw) return null;
    return validateConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveStored(cfg, key = STORAGE_KEY) {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(key, JSON.stringify(validateConfig(cfg)));
    return true;
  } catch {
    return false;
  }
}

export function clearStored(key = STORAGE_KEY) {
  const s = storage();
  if (!s) return false;
  try {
    s.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  lib/perf-state.js  -  votivepatina-stage
//
//  The shared performance state machine for the live multi-device build, kept as
//  a PURE module so the threshold + dedupe logic is deterministic and testable
//  with no transport, no DOM, no Supabase. One authoritative host runs this; the
//  resulting state is what gets broadcast to every surface (performer, audience,
//  admin) over lib/realtime.js.
//
//  The score has `stationCount` stations (5: the five prayer lines). The audience
//  "passes the peace" - one deliberate phone gesture = one peace. When the peaces
//  for the active station reach `threshold` (PASSES_PER_STATION), the station
//  advances by one and the image wears one generation of JPEG decay. So:
//
//    stationIndex = number of stations completed   (0 = pristine .. stationCount = finale)
//    decayGen     = stationIndex                   (drives renderStep; 0..stationCount)
//    threadsLit   = stationIndex                   (one thread of light per completed station)
//
//  The station currently being prayed is `stations[stationIndex]` while
//  stationIndex < stationCount; at stationIndex === stationCount the piece is in
//  its finale (fully worn, every thread lit).
//
//  Dedupe is per device per station: a given deviceId may add at most one peace to
//  the active station, and a peace tagged for a different station is ignored
//  (a laggy phone cannot contribute to the wrong station). `passedDevices` is the
//  set of devices that have passed the ACTIVE station; it clears on every advance.
//
//  Every function is pure: it returns a NEW state object and never mutates its
//  input. State is plain JSON (arrays, not Sets) so it serialises straight onto a
//  realtime broadcast. No em-dashes, no framework.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_STATION_COUNT = 5;
const DEFAULT_THRESHOLD = 1;

/**
 * Build the initial performance state.
 *
 * @param {object} [opts]
 * @param {number} [opts.stationCount=5]  total stations in the score
 * @param {number} [opts.threshold=1]     peaces needed to advance one station (PASSES_PER_STATION)
 * @returns {object} a fresh state
 */
export function createPerfState({
  stationCount = DEFAULT_STATION_COUNT,
  threshold = DEFAULT_THRESHOLD,
} = {}) {
  return {
    stationCount,
    threshold: clampThreshold(threshold),
    peaceCount: 0,
    stationIndex: 0,
    decayGen: 0,
    threadsLit: 0,
    passesThisStation: 0,
    finale: false,
    passedDevices: [],
  };
}

/**
 * Apply one "passed the peace" event from a device.
 *
 * No-op (returns an equal-valued new state) when:
 *   - the piece is already at its finale,
 *   - the peace is tagged for a station other than the active one (stale), or
 *   - this device has already passed the active station (dedupe per device per station).
 *
 * Otherwise increments peaceCount + passesThisStation and records the device. If
 * that reaches the threshold, the station advances by exactly one and decayGen +
 * threadsLit step with it; reaching stationCount sets `finale`.
 *
 * @param {object} state
 * @param {{deviceId: string, stationIndex: number}} peace
 * @returns {object} the next state (new object)
 */
export function applyPeace(state, { deviceId, stationIndex } = {}) {
  // Finale: nothing more to count.
  if (state.finale || state.stationIndex >= state.stationCount) return state;

  // The peace must be for the station we are actually on.
  if (typeof stationIndex === "number" && stationIndex !== state.stationIndex) {
    return state;
  }

  // Dedupe: one peace per device per active station.
  if (!deviceId || state.passedDevices.includes(deviceId)) return state;

  const passedDevices = [...state.passedDevices, deviceId];
  const peaceCount = state.peaceCount + 1;
  const passesThisStation = state.passesThisStation + 1;

  // Not yet at threshold: just record the peace.
  if (passesThisStation < state.threshold) {
    return { ...state, peaceCount, passesThisStation, passedDevices };
  }

  // Threshold reached: advance exactly one station; the image wears a generation.
  const nextStation = state.stationIndex + 1;
  return {
    ...state,
    peaceCount,
    stationIndex: nextStation,
    decayGen: nextStation,
    threadsLit: nextStation,
    passesThisStation: 0,
    finale: nextStation >= state.stationCount,
    passedDevices: [],
  };
}

/**
 * Set the per-station threshold live (admin). Takes effect for the next
 * evaluation; never retroactively advances. Clamped to >= 1.
 *
 * @param {object} state
 * @param {number} threshold
 * @returns {object}
 */
export function setThreshold(state, threshold) {
  return { ...state, threshold: clampThreshold(threshold) };
}

/**
 * Reset to the start of a performance, preserving the station count + threshold.
 * Used between performances.
 *
 * @param {object} state
 * @returns {object}
 */
export function reset(state) {
  return createPerfState({
    stationCount: state.stationCount,
    threshold: state.threshold,
  });
}

/**
 * The index of the station currently being prayed, or null at the finale.
 * @param {object} state
 * @returns {number|null}
 */
export function activeStationIndex(state) {
  return state.stationIndex < state.stationCount ? state.stationIndex : null;
}

// A threshold below 1 would advance on zero peaces; keep it sane.
function clampThreshold(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v >= 1 ? v : 1;
}

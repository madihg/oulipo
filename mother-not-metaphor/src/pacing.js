/**
 * src/pacing.js - speaking-rate timing (pure, DOM-free).
 *
 * The illustration morphs are paced to how long a line takes to say. We derive a
 * moment's duration from its text length and a per-character rate, then spread the
 * moment's keyframes across that duration. The same duration drives the
 * typewriter and the no-camera auto-advance timer.
 */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const DEFAULT_PACING = {
  msPerChar: 55, // ~ unhurried speech
  minMomentMs: 4200,
  maxMomentMs: 13000,
  morphMs: 560, // length of a single keyframe transition
};

/** How long a moment lasts, from its text and the pacing config. */
export function momentDurationMs(text, pacing = DEFAULT_PACING) {
  const { msPerChar, minMomentMs, maxMomentMs } = {
    ...DEFAULT_PACING,
    ...pacing,
  };
  const raw = (text ? text.length : 0) * msPerChar;
  return clamp(raw, minMomentMs, maxMomentMs);
}

/**
 * When each keyframe transition should start, spread across the moment.
 * Returns `count` entries: keyframe 0 is reached at t=0; each later keyframe
 * transitions over `morphMs`, then holds until the next. All starts are in
 * [0, duration] and strictly ascending.
 */
export function scheduleKeyframes(
  count,
  duration,
  morphMs = DEFAULT_PACING.morphMs,
) {
  if (count <= 0) return [];
  if (count === 1) return [{ index: 0, start: 0, morphMs }];
  // Leave the last segment as a hold so the final frame is seen before advancing.
  const segment = duration / count;
  const out = [];
  for (let i = 0; i < count; i++) {
    const start = i === 0 ? 0 : Math.min(i * segment, duration);
    out.push({ index: i, start, morphMs: Math.min(morphMs, segment) });
  }
  return out;
}

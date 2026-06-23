/**
 * src/player.js - the poem orchestration (DOM).
 *
 * Drives the moment-by-moment performance:
 *   - sets the layout for each moment (FLIP transition);
 *   - reveals the words (typewriter) over the moment's duration;
 *   - paces the illustration keyframe morphs across that duration;
 *   - advances between moments either by a hand-shape change (live) or a timer
 *     (auto / no-camera fallback).
 *
 * Timing is pure-derived (pacing.js); a `speed` multiplier accelerates tests.
 */

import { momentDurationMs, scheduleKeyframes } from "./pacing.js";
import { stableSignature, signatureChanged } from "./gestures.js";

export function createPlayer({
  poem,
  illustration,
  words,
  layout,
  hint,
  stage,
  speed = 1,
  loop = false,
}) {
  const moments = poem.moments;
  const pacing = poem.pacing;
  let index = -1;
  let mode = "auto";
  let timers = [];
  let history = [];
  let baseline = null; // last stable hand signature we acted on
  let advancing = false;

  const clearTimers = () => {
    for (const t of timers) clearTimeout(t);
    timers = [];
  };

  function durationFor(m) {
    return Math.max(900, momentDurationMs(m.original, pacing) / speed);
  }

  function goToMoment(i) {
    if (i < 0 || i >= moments.length) return;
    clearTimers();
    index = i;
    const m = moments[i];
    const dur = durationFor(m);
    const morphMs = Math.max(120, pacing.morphMs / speed);

    layout.set(m.layout);
    words.start(m, dur);

    const kfs = m.illustration.keyframes;
    // cross-moment morph into this moment's first keyframe
    illustration.morphTo(kfs[0], morphMs);
    // pace the within-moment keyframe morphs across the moment
    const sched = scheduleKeyframes(kfs.length, dur, morphMs);
    for (let k = 1; k < kfs.length; k++) {
      timers.push(
        setTimeout(
          () => illustration.morphTo(kfs[k], sched[k].morphMs),
          sched[k].start,
        ),
      );
    }

    if (mode === "auto") {
      timers.push(setTimeout(() => advance(), dur));
    }
    updateHint();
    stage.setAttribute("data-moment", m.id);
  }

  function advance() {
    if (advancing) return;
    if (index < moments.length - 1) {
      goToMoment(index + 1);
    } else if (loop) {
      goToMoment(0);
    } else {
      // hold on the final moment
      clearTimers();
      stage.setAttribute("data-done", "1");
      updateHint();
    }
  }

  function updateHint() {
    if (!hint) return;
    const pos = `${index + 1} / ${moments.length}`;
    if (stage.getAttribute("data-done")) hint.textContent = `${pos} · end`;
    else if (mode === "live") hint.textContent = `${pos} · change your hands`;
    else hint.textContent = `${pos}`;
  }

  // --- live gesture input ---------------------------------------------------
  function onSignature(sig) {
    if (mode !== "live") return;
    history.push(sig);
    if (history.length > 8) history.shift();
    const stable = stableSignature(history, 5);
    if (!stable) return;
    if (baseline == null) {
      baseline = stable; // arm without advancing on the first pose
      return;
    }
    if (signatureChanged(baseline, stable)) {
      baseline = stable;
      advance();
    }
  }

  function start(startMode) {
    mode = startMode === "live" ? "live" : "auto";
    stage.removeAttribute("data-done");
    history = [];
    baseline = null;
    goToMoment(0);
  }

  function destroy() {
    clearTimers();
    advancing = true;
  }

  // Freeze on a moment at a given keyframe (default: its last) with no timers.
  // Used for debugging and screenshots; not part of the performance flow.
  function still(i, k = -1) {
    if (i < 0 || i >= moments.length) return;
    clearTimers();
    index = i;
    const m = moments[i];
    const kfs = m.illustration.keyframes;
    const kf = kfs[k < 0 ? kfs.length - 1 : Math.min(k, kfs.length - 1)];
    layout.set(m.layout);
    words.showFull(m);
    illustration.snap(kf);
    stage.setAttribute("data-moment", m.id);
    updateHint();
  }

  return {
    start,
    advance,
    onSignature,
    destroy,
    still,
    goTo: goToMoment,
    state: () => ({
      index,
      mode,
      moment: index >= 0 ? moments[index].id : null,
      total: moments.length,
    }),
  };
}

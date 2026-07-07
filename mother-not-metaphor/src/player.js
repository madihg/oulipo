/**
 * src/player.js - the poem orchestration (DOM).
 *
 * Drives the moment-by-moment performance:
 *   - sets the layout for each moment (FLIP transition);
 *   - reveals the words (typewriter) over the moment's duration;
 *   - paces the illustration keyframe morphs across that duration;
 *   - advances between moments either by a deliberate hand gesture (live, via the
 *     Fragmentary dwell control) or a timer (auto / no-camera fallback).
 *
 * Timing is pure-derived (pacing.js); a `speed` multiplier accelerates tests.
 */

import { momentDurationMs, scheduleKeyframes } from "./pacing.js";

export function createPlayer({
  poem,
  illustration,
  words,
  layout,
  hint,
  stage,
  control = null,
  hud = null,
  speed = 1,
  loop = false,
}) {
  const moments = poem.moments;
  const pacing = poem.pacing;
  let index = -1;
  let mode = "auto";
  let timers = [];
  let destroyed = false;

  const clearTimers = () => {
    for (const t of timers) clearTimeout(t);
    timers = [];
  };

  function durationFor(m) {
    return Math.max(900, momentDurationMs(m.original, pacing) / speed);
  }

  function goToMoment(i) {
    if (destroyed || i < 0 || i >= moments.length) return;
    clearTimers();
    stage.removeAttribute("data-done");
    index = i;
    const m = moments[i];
    const dur = durationFor(m);
    const morphMs = Math.max(120, pacing.morphMs / speed);

    layout.set(m.layout);
    words.start(m, dur);

    const kfs = m.illustration.keyframes;
    illustration.morphTo(kfs[0], morphMs);
    const sched = scheduleKeyframes(kfs.length, dur, morphMs);
    for (let k = 1; k < kfs.length; k++) {
      timers.push(
        setTimeout(
          () => illustration.morphTo(kfs[k], sched[k].morphMs),
          sched[k].start,
        ),
      );
    }

    if (mode === "auto") timers.push(setTimeout(() => advance(), dur));
    updateHint();
    stage.setAttribute("data-moment", m.id);
  }

  function advance() {
    if (destroyed) return;
    if (index < moments.length - 1) goToMoment(index + 1);
    else if (loop) goToMoment(0);
    else {
      clearTimers();
      stage.setAttribute("data-done", "1");
      updateHint();
    }
  }

  /** Run a Fragmentary action from a fired gesture binding. */
  function runAction(action) {
    if (!action) return;
    switch (action.type) {
      case "prev":
        if (index > 0) goToMoment(index - 1);
        break;
      case "goto":
        goToMoment(
          Math.max(0, Math.min(moments.length - 1, action.index || 0)),
        );
        break;
      case "restart":
        goToMoment(0);
        break;
      case "next":
      default:
        advance();
    }
  }

  function updateHint() {
    if (!hint) return;
    const pos = `${index + 1} / ${moments.length}`;
    if (stage.getAttribute("data-done")) hint.textContent = `${pos} · end`;
    else if (mode === "live")
      hint.textContent = `${pos} · hold a new hand shape`;
    else hint.textContent = pos;
  }

  /**
   * Per-frame hand input: update the dwell control, paint the HUD, and run an
   * action if a gesture completed its hold. Called by the hand tracker (live) or
   * directly by tests via window.MNM.feed.
   */
  function feed(reading, nowMs) {
    if (destroyed || !control) return null;
    const r = reading || {
      present: false,
      up: null,
      extensions: [0, 0, 0, 0, 0],
    };
    const res = control.update(r.present ? r.up : null, nowMs);
    if (hud) {
      hud.render({
        present: r.present,
        up: r.up || [false, false, false, false, false],
        extensions: r.extensions || [0, 0, 0, 0, 0],
        progress: res.progress,
        label: res.binding ? res.binding.label : "",
      });
    }
    if (res.firing) {
      if (hud) hud.flash();
      runAction(res.action);
    }
    return res;
  }

  function start(startMode) {
    mode = startMode === "live" ? "live" : "auto";
    stage.removeAttribute("data-done");
    if (control) control.reset();
    goToMoment(0);
  }

  function destroy() {
    destroyed = true;
    clearTimers();
  }

  // Freeze on a moment at a given keyframe (default: last), no timers. Debug only.
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
    feed,
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

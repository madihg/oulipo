/**
 * fragmentary/hud.js - the on-screen finger read-out (DOM).
 *
 * Five vertical bars, one per finger, that fill with each finger's detected
 * extension and highlight when the finger is "up" - so you can SEE the hand being
 * identified. Below them, a dwell meter fills over the hold time and labels the
 * action about to fire. Styling lives in fragmentary.css (`fx-*` classes), shared
 * by the piece and the admin console.
 */

import { FINGER_NAMES } from "./gestures.js";

export function createFingerHud(
  root,
  { labels = FINGER_NAMES, reduced = false } = {},
) {
  root.classList.add("fx-hud");
  root.replaceChildren();

  const barsWrap = document.createElement("div");
  barsWrap.className = "fx-bars";
  const bars = labels.map((name) => {
    const col = document.createElement("div");
    col.className = "fx-bar";
    const track = document.createElement("div");
    track.className = "fx-bar__track";
    const fill = document.createElement("div");
    fill.className = "fx-bar__fill";
    track.appendChild(fill);
    const cap = document.createElement("div");
    cap.className = "fx-bar__cap mono";
    cap.textContent = name.charAt(0).toUpperCase();
    col.append(track, cap);
    barsWrap.appendChild(col);
    return { col, fill };
  });

  const meter = document.createElement("div");
  meter.className = "fx-meter";
  const meterFill = document.createElement("div");
  meterFill.className = "fx-meter__fill";
  const meterLabel = document.createElement("div");
  meterLabel.className = "fx-meter__label mono";
  meter.append(meterFill, meterLabel);

  root.append(barsWrap, meter);

  function render(r = {}) {
    const ext = r.extensions || [0, 0, 0, 0, 0];
    const up = r.up || [false, false, false, false, false];
    bars.forEach((b, i) => {
      b.fill.style.height = `${Math.round(clamp01(ext[i]) * 100)}%`;
      b.col.classList.toggle("is-up", !!up[i]);
    });
    meterFill.style.width = `${Math.round(clamp01(r.progress || 0) * 100)}%`;
    meterLabel.textContent = r.label || "";
    root.classList.toggle("is-present", !!r.present);
    root.classList.toggle("is-arming", (r.progress || 0) > 0.01);
  }

  function flash() {
    if (reduced) return;
    root.classList.remove("fx-flash");
    void root.offsetWidth; // restart the animation
    root.classList.add("fx-flash");
  }

  function destroy() {
    root.replaceChildren();
    root.classList.remove("fx-hud", "is-present", "is-arming", "fx-flash");
  }

  return { render, flash, destroy };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// admin/admin.js - votivepatina-stage operator console (the authority)
//
// Owns the reducer via createStage({ role: "admin" }). Sets N + threshold, begins
// and resets the show, and renders the live state + presence. Audience peaces flow
// in over the channel and are applied here, then broadcast to every surface.

import { createStage } from "../lib/stage.js";

const params = new URLSearchParams(location.search);
const sessionId = params.get("s") || "live";

const els = {
  n: document.getElementById("n-input"),
  threshold: document.getElementById("threshold-input"),
  begin: document.getElementById("begin-btn"),
  reset: document.getElementById("reset-btn"),
  presence: document.getElementById("presence-count"),
  peaceCount: document.getElementById("peace-count"),
  state: document.getElementById("state-readout"),
  audienceUrl: document.getElementById("audience-url"),
  banner: document.getElementById("transport-banner"),
};

let stage = null;

// Show the audience join URL (the QR target in US-011).
const audienceHref = new URL(
  `../audience/?s=${encodeURIComponent(sessionId)}`,
  location.href,
).href;
els.audienceUrl.textContent = audienceHref;

function renderState(s) {
  els.peaceCount.textContent = String(s.peaceCount ?? 0);
  const phase = s.finale ? "finale" : s.started ? "active" : "preroll";
  const activeStation =
    s.stationIndex < s.stationCount ? s.stationIndex + 1 : "-";
  els.state.textContent = [
    `session     ${sessionId}`,
    `phase       ${phase}`,
    `station     ${activeStation} of ${s.stationCount}`,
    `passes      ${s.passesThisStation} / ${s.threshold}`,
    `peaceCount  ${s.peaceCount}`,
    `decayGen    ${s.decayGen}`,
    `threadsLit  ${s.threadsLit}`,
  ].join("\n");
  document.body.dataset.phase = phase;
}

function renderPresence(count) {
  els.presence.textContent = String(count);
}

function wire() {
  // Changing N defaults the threshold to N (operator can then lower it).
  els.n.addEventListener("change", () => {
    const n = clampInt(els.n.value, 1);
    els.n.value = String(n);
    els.threshold.value = String(n);
    stage.setThreshold(n);
  });
  els.threshold.addEventListener("change", () => {
    const t = clampInt(els.threshold.value, 1);
    els.threshold.value = String(t);
    stage.setThreshold(t);
  });
  els.begin.addEventListener("click", () => stage.begin());
  els.reset.addEventListener("click", () => stage.reset());
}

function clampInt(v, min) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= min ? n : min;
}

async function boot() {
  const initialThreshold = clampInt(els.threshold.value, 1);
  stage = await createStage({
    role: "admin",
    sessionId,
    stationCount: 5,
    threshold: initialThreshold,
    onState: renderState,
    onPresence: renderPresence,
  });
  if (stage.mode === "loopback") {
    els.banner.hidden = false;
    els.banner.textContent = "offline loopback transport (test mode)";
  }
  wire();
  // expose for e2e assertions
  window.__stage = stage;
}

boot().catch((err) => {
  els.state.textContent = "failed to join: " + (err && err.message);
});

// audience/audience.js - votivepatina-stage audience phone
//
// Tap to join (the user gesture that lets iOS grant motion), then render the
// synced decaying image + the active station as a dismissible on-image overlay,
// and "pass the peace" once per station by a deliberate phone motion (or the
// always-present manual button when motion is denied/unavailable). Dedupe per
// device per station is enforced both locally (button disables) and by the
// authority's reducer.

import { createStage } from "../lib/stage.js";
import { createDecayEngine } from "../lib/decay.js";
import { requestMotionPermission, createShakeDetector } from "../lib/motion.js";

const params = new URLSearchParams(location.search);
const sessionId = params.get("s") || "live";
const MARY_SRC = "../assets/mary-interactive.jpg";
const MAX_STEP = 5;

const els = {
  joinGate: document.getElementById("join-gate"),
  joinBtn: document.getElementById("join-btn"),
  joinStatus: document.getElementById("join-status"),
  live: document.getElementById("live"),
  banner: document.getElementById("transport-banner"),
  peaceCount: document.getElementById("peace-count"),
  canvas: document.getElementById("stage-mary"),
  overlay: document.getElementById("overlay"),
  overlayClose: document.getElementById("overlay-close"),
  ovTranslit: document.getElementById("ov-translit"),
  ovArabic: document.getElementById("ov-arabic"),
  ovEnglish: document.getElementById("ov-english"),
  ovPrompt: document.getElementById("ov-prompt"),
  phaseNote: document.getElementById("phase-note"),
  peaceBtn: document.getElementById("peace-btn"),
  flash: document.getElementById("peace-flash"),
};

let stage = null;
let engine = null;
let stations = [];
let detector = null;
let lastState = null;
let lastStationIndex = -1;
let passedThisStation = false;

async function loadStations() {
  const res = await fetch("../data/stations.json");
  const data = await res.json();
  stations = data.stations || [];
}

async function setupDecay() {
  const img = new Image();
  img.src = MARY_SRC;
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }
  els.canvas.width = img.naturalWidth || 675;
  els.canvas.height = img.naturalHeight || 1200;
  engine = createDecayEngine({
    canvas: els.canvas,
    sourceImage: img,
    maxStep: MAX_STEP,
  });
  engine.renderStep(0, { animate: false });
}

function renderState(s) {
  lastState = s;
  els.peaceCount.textContent = String(s.peaceCount ?? 0);
  if (engine) {
    engine.renderStep(Math.min(s.decayGen ?? 0, MAX_STEP), { animate: false });
  }

  // A station change resets the per-station dedupe and re-shows the overlay.
  if (s.stationIndex !== lastStationIndex) {
    lastStationIndex = s.stationIndex;
    passedThisStation = false;
  }

  const phase = s.finale ? "finale" : s.started ? "active" : "preroll";
  document.body.dataset.phase = phase;
  els.live.classList.toggle("is-finale", phase === "finale");

  if (phase === "active" && s.stationIndex < stations.length) {
    showOverlay(stations[s.stationIndex]);
    els.phaseNote.textContent = "";
    els.peaceBtn.disabled = passedThisStation;
  } else if (phase === "preroll") {
    hideOverlay();
    els.phaseNote.textContent = "Waiting for the prayer to begin.";
    els.peaceBtn.disabled = true;
  } else {
    hideOverlay();
    els.phaseNote.textContent = "Amin.";
    els.peaceBtn.disabled = true;
  }
}

function showOverlay(st) {
  els.ovTranslit.textContent = st.translit;
  els.ovArabic.textContent = st.arabic;
  els.ovEnglish.textContent = st.english;
  els.ovPrompt.textContent = st.prompt;
  els.overlay.hidden = false;
}

function hideOverlay() {
  els.overlay.hidden = true;
}

// One peace per device per station. Both the motion detector and the manual
// button route here; the local guard plus the reducer's dedupe keep it to one.
function doPeace() {
  const s = lastState;
  if (!s || !s.started || s.finale) return;
  if (passedThisStation) return;
  passedThisStation = true;
  els.peaceBtn.disabled = true;
  stage.passPeace();
  flash("the peace is passed - سلام");
}

function flash(msg) {
  els.flash.textContent = msg;
  setTimeout(() => {
    if (els.flash.textContent === msg) els.flash.textContent = "";
  }, 2500);
}

async function join() {
  els.joinBtn.disabled = true;
  els.joinStatus.textContent = "joining...";
  const perm = await requestMotionPermission();

  stage = await createStage({
    role: "audience",
    sessionId,
    onState: renderState,
  });
  window.__stage = stage;

  els.joinGate.hidden = true;
  els.live.hidden = false;
  if (stage.mode === "loopback") {
    els.banner.hidden = false;
    els.banner.textContent = "offline loopback (test mode)";
  }

  if (perm === "granted") {
    detector = createShakeDetector({ onShake: doPeace });
    detector.start();
  } else {
    els.phaseNote.textContent =
      "Motion is off - use the button to pass the peace.";
  }
}

els.joinBtn.addEventListener("click", () =>
  join().catch((e) => {
    els.joinBtn.disabled = false;
    els.joinStatus.textContent = "could not join: " + (e && e.message);
  }),
);
els.peaceBtn.addEventListener("click", doPeace);
els.overlayClose.addEventListener("click", hideOverlay);
els.overlay.addEventListener("click", (e) => {
  if (e.target === els.overlay) hideOverlay();
});

await loadStations();
await setupDecay();

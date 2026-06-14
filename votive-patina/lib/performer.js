// ─────────────────────────────────────────────────────────────────────────────
//  lib/performer.js  -  votivepatina-stage
//
//  Performer stage mode: the existing main page, projected for a live show. It is
//  a pure renderer of the channel state - it never owns the reducer and never
//  sends peaces. It reuses the generational-JPEG decay engine on its own canvas,
//  shows the active station (line + the long narration), lights one thread of
//  light per completed station, and carries the live "{N} people passed the peace"
//  readout.
//
//  Loaded ONLY when the page is opened with ?stage=performer (main.js dynamically
//  imports this), so normal visitors never pull in the realtime layer. No
//  em-dashes, no framework.
// ─────────────────────────────────────────────────────────────────────────────

import { createStage } from "./stage.js";
import { createDecayEngine } from "./decay.js";
import { setupAbout } from "./about.js";
import { qrSvg } from "./qr.js";
import { printLine, printFull } from "./console-prayer.js";

export async function setupPerformer({
  sessionId = "live",
  stationCount = 5,
} = {}) {
  document.body.dataset.stage = "performer";
  const stageEl = document.getElementById("performer-stage");
  if (stageEl) stageEl.hidden = false;

  const els = {
    count: document.getElementById("perf-count"),
    banner: document.getElementById("perf-banner"),
    canvas: document.getElementById("perf-canvas"),
    translit: document.getElementById("perf-translit"),
    arabic: document.getElementById("perf-arabic"),
    english: document.getElementById("perf-english"),
    narration: document.getElementById("perf-narration"),
    threads: document.getElementById("perf-threads"),
  };

  // ── the score ──
  const data = await (await fetch("./data/stations.json")).json();
  const stations = data.stations || [];
  const preroll = data.preroll || null;

  // ── the decaying image (reuse the engine) ──
  const img = new Image();
  img.src = "./assets/mary-interactive.jpg";
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }
  els.canvas.width = img.naturalWidth || 675;
  els.canvas.height = img.naturalHeight || 1200;
  const engine = createDecayEngine({
    canvas: els.canvas,
    sourceImage: img,
    maxStep: stationCount,
  });
  engine.renderStep(0, { animate: false });

  // ── the threads of light ──
  buildThreads(els.threads, stationCount);

  // ── join + render ──
  const stage = await createStage({
    role: "performer",
    sessionId,
    stationCount,
    onState: render,
  });
  window.__stage = stage;
  if (stage.mode === "loopback" && els.banner) {
    els.banner.hidden = false;
    els.banner.textContent = "offline loopback (test mode)";
  }

  setupAccessControls(sessionId);

  // The prayer prints to the real console as each station completes - the same
  // scripture the main page writes when you pray. Guarded so it prints once.
  let printedUpTo = 0;
  let printedFull = false;

  function render(s) {
    if (els.count) els.count.textContent = String(s.peaceCount ?? 0);
    engine.renderStep(Math.min(s.decayGen ?? 0, stationCount), {
      animate: false,
    });
    lightThreads(els.threads, s.threadsLit ?? 0);

    const completed = Math.min(s.stationIndex ?? 0, stationCount);
    while (printedUpTo < completed) {
      printLine(printedUpTo);
      printedUpTo += 1;
    }
    if (s.finale && !printedFull) {
      printedFull = true;
      printFull();
    }

    const phase = s.finale ? "finale" : s.started ? "active" : "preroll";
    document.body.dataset.phase = phase;
    if (stageEl) stageEl.classList.toggle("is-finale", phase === "finale");

    if (phase === "active" && s.stationIndex < stations.length) {
      showStation(stations[s.stationIndex]);
    } else if (phase === "finale" && stations.length) {
      showStation(stations[stations.length - 1]);
    } else {
      // preroll: the opening narration, no station line yet
      setText(els.translit, "");
      setText(els.arabic, "");
      setText(els.english, "");
      setText(els.narration, preroll ? preroll.narration : "");
    }
  }

  function showStation(st) {
    setText(els.translit, st.translit);
    setText(els.arabic, st.arabic);
    setText(els.english, st.english);
    setText(els.narration, st.narration);
  }

  return stage;
}

// Top-right access controls: SHOW QR (so the audience can join) + the "?" about
// modal restyled to sit to its right. The QR is generated on demand (the
// performer is online); if the encoder fails to load, the join URL is the
// fallback the operator can read out.
function setupAccessControls(sessionId) {
  try {
    setupAbout();
  } catch {
    /* the about modal is optional */
  }

  const qrBtn = document.getElementById("stage-qr-btn");
  const overlay = document.getElementById("qr-overlay");
  const codeEl = document.getElementById("qr-code");
  const urlEl = document.getElementById("qr-url");
  const closeBtn = document.getElementById("qr-close");
  if (!qrBtn || !overlay) return;

  const audienceUrl = new URL(
    `audience/?s=${encodeURIComponent(sessionId)}`,
    location.href,
  ).href;
  if (urlEl) urlEl.textContent = audienceUrl;
  qrBtn.hidden = false;

  let built = false;
  async function openQr() {
    overlay.hidden = false;
    if (built) return;
    built = true;
    try {
      if (codeEl) codeEl.innerHTML = await qrSvg(audienceUrl, { cellSize: 6 });
    } catch {
      // offline / encoder unavailable: the URL above is the fallback.
      if (codeEl) codeEl.innerHTML = "";
    }
  }
  function closeQr() {
    overlay.hidden = true;
  }

  qrBtn.addEventListener("click", openQr);
  if (closeBtn) closeBtn.addEventListener("click", closeQr);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeQr();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeQr();
  });
}

function setText(el, text) {
  if (el) el.textContent = text;
}

function buildThreads(container, n) {
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const thread = document.createElement("div");
    thread.className = "perf-thread";
    thread.dataset.lit = "false";
    const line = document.createElement("div");
    line.className = "perf-thread-line";
    const num = document.createElement("span");
    num.className = "perf-thread-num";
    num.textContent = String(i + 1).padStart(2, "0");
    thread.appendChild(line);
    thread.appendChild(num);
    container.appendChild(thread);
  }
}

function lightThreads(container, lit) {
  if (!container) return;
  Array.from(container.children).forEach((thread, i) => {
    thread.dataset.lit = i < lit ? "true" : "false";
  });
}

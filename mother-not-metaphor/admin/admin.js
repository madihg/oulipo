/**
 * admin/admin.js - the Fragmentary gesture console (dev/config tool).
 *
 * Edits a Fragmentary config live: which finger pattern turns the page, and how
 * long a pose is held (dwell). It renders the finger HUD from a real camera so
 * the performer can SEE the hand being read and capture a pose physically, then
 * SAVE (to localStorage, which the live piece layers on next load) and EXPORT
 * the JSON to bake into data/gestures.json.
 *
 * Nothing here is piece-specific except the storage key and the goto range,
 * both read from the shipped defaults + poem. Reuse it for the next piece by
 * pointing it at that piece's gestures.json / poem.json.
 */

import {
  STORAGE_KEY,
  FINGERS,
  ACTIONS,
  validateConfig,
  mergeConfig,
  loadStored,
  saveStored,
  clearStored,
} from "../src/fragmentary/config.js";
import {
  createGestureControl,
  patternKey,
} from "../src/fragmentary/control.js";
import { createFingerHud } from "../src/fragmentary/hud.js";
import { startCamera, stopCamera } from "../src/camera.js";
import { loadHandLandmarker, trackHands } from "../src/hands.js";

const FINGER_CAPS = ["T", "I", "M", "R", "P"];
const CONSTRAINTS = ["any", "up", "down"];
const CONSTRAINT_GLYPH = { any: "-", up: "up", down: "down" };

const $ = (id) => document.getElementById(id);

const els = {
  storageKey: $("storage-key"),
  video: $("cam-video"),
  camMsg: $("cam-msg"),
  startCam: $("start-cam"),
  stopCam: $("stop-cam"),
  hudWrap: $("hud-wrap"),
  roPattern: $("ro-pattern"),
  roMatched: $("ro-matched"),
  roFire: $("ro-fire"),
  dwell: $("dwell"),
  dwellVal: $("dwell-val"),
  stableFrames: $("stable-frames"),
  bindingList: $("binding-list"),
  capturePose: $("capture-pose"),
  addBinding: $("add-binding"),
  save: $("save"),
  export: $("export"),
  reset: $("reset"),
  saveNote: $("save-note"),
  exportBox: $("export-box"),
  exportJson: $("export-json"),
  copyJson: $("copy-json"),
};

// --- state ---------------------------------------------------------------
let working = null; // the config being edited
let control = null; // dwell state machine (mirrors `working`)
let hud = null; // finger HUD renderer
let momentCount = 5; // goto range (poem.moments.length), fallback 5
let lastReading = null; // most recent live hand reading, for "capture pose"
let stopTracking = null; // trackHands() disposer
let fireTimer = null; // clears the transient "would fire" note

// --- boot ----------------------------------------------------------------
async function boot() {
  els.storageKey.textContent = STORAGE_KEY;

  const [defaults, moments] = await Promise.all([
    fetchDefaults(),
    fetchMomentCount(),
  ]);
  momentCount = moments;

  const override = loadStored();
  working = mergeConfig(defaults, override);

  control = createGestureControl({
    dwellMs: working.dwellMs,
    stableFrames: working.stableFrames,
    bindings: working.bindings,
  });
  hud = createFingerHud(els.hudWrap, {
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
  hud.render({});

  populate();
  wireEvents();
}

async function fetchDefaults() {
  try {
    const r = await fetch("../data/gestures.json");
    if (!r.ok) throw new Error(String(r.status));
    return validateConfig(await r.json());
  } catch {
    // fall back to the library defaults so the editor still works offline
    return validateConfig({});
  }
}

async function fetchMomentCount() {
  try {
    const r = await fetch("../data/poem.json");
    if (!r.ok) throw new Error(String(r.status));
    const poem = await r.json();
    const n = Array.isArray(poem.moments) ? poem.moments.length : 0;
    return n > 0 ? n : 5;
  } catch {
    return 5;
  }
}

// --- populate UI from `working` -----------------------------------------
function populate() {
  els.dwell.value = String(working.dwellMs);
  els.dwellVal.textContent = secs(working.dwellMs);
  els.stableFrames.value = String(working.stableFrames);
  renderBindings();
}

function secs(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

// --- bindings editor -----------------------------------------------------
function renderBindings() {
  els.bindingList.replaceChildren();
  if (!working.bindings.length) {
    const empty = document.createElement("li");
    empty.className = "binding binding--empty mono";
    empty.textContent = "no bindings - add one, or capture a pose";
    els.bindingList.appendChild(empty);
    return;
  }
  working.bindings.forEach((binding, index) => {
    els.bindingList.appendChild(bindingRow(binding, index));
  });
}

function bindingRow(binding, index) {
  const li = document.createElement("li");
  li.className = "binding";

  // finger constraint toggles
  const fingers = document.createElement("div");
  fingers.className = "binding__fingers";
  FINGERS.forEach((name, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "finger-toggle";
    const state = binding.fingers[name] || "any";
    applyFingerToggle(btn, name, i, state);
    btn.addEventListener("click", () => {
      const next =
        CONSTRAINTS[(CONSTRAINTS.indexOf(binding.fingers[name]) + 1) % 3];
      binding.fingers[name] = next;
      applyFingerToggle(btn, name, i, next);
      syncControl();
    });
    fingers.appendChild(btn);
  });

  // action select
  const actionWrap = document.createElement("div");
  actionWrap.className = "binding__action";
  const selId = `action-${index}`;
  const selLabel = document.createElement("label");
  selLabel.className = "sr-only";
  selLabel.setAttribute("for", selId);
  selLabel.textContent = `binding ${index + 1} action`;
  const sel = document.createElement("select");
  sel.className = "binding__select mono";
  sel.id = selId;
  ACTIONS.forEach((a) => {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a;
    if (a === binding.action.type) opt.selected = true;
    sel.appendChild(opt);
  });

  // goto index (shown only when action === goto)
  const gotoId = `goto-${index}`;
  const gotoLabel = document.createElement("label");
  gotoLabel.className = "sr-only";
  gotoLabel.setAttribute("for", gotoId);
  gotoLabel.textContent = `binding ${index + 1} moment index`;
  const gotoInput = document.createElement("input");
  gotoInput.type = "number";
  gotoInput.id = gotoId;
  gotoInput.className = "binding__goto mono";
  gotoInput.min = "0";
  gotoInput.max = String(Math.max(0, momentCount - 1));
  gotoInput.step = "1";
  gotoInput.value = String(binding.action.index || 0);
  gotoInput.hidden = binding.action.type !== "goto";
  gotoInput.addEventListener("input", () => {
    binding.action.index = clampInt(gotoInput.value, 0, momentCount - 1);
  });

  sel.addEventListener("change", () => {
    binding.action.type = sel.value;
    if (sel.value === "goto") {
      if (typeof binding.action.index !== "number") binding.action.index = 0;
      gotoInput.value = String(binding.action.index);
      gotoInput.hidden = false;
    } else {
      delete binding.action.index;
      gotoInput.hidden = true;
    }
    syncControl();
  });
  actionWrap.append(selLabel, sel, gotoLabel, gotoInput);

  // label text
  const labelId = `label-${index}`;
  const labWrap = document.createElement("div");
  labWrap.className = "binding__labelwrap";
  const labFor = document.createElement("label");
  labFor.className = "sr-only";
  labFor.setAttribute("for", labelId);
  labFor.textContent = `binding ${index + 1} label`;
  const labInput = document.createElement("input");
  labInput.type = "text";
  labInput.id = labelId;
  labInput.className = "binding__label";
  labInput.placeholder = "label";
  labInput.value = binding.label || "";
  labInput.addEventListener("input", () => {
    binding.label = labInput.value;
  });
  labWrap.append(labFor, labInput);

  // delete
  const del = document.createElement("button");
  del.type = "button";
  del.className = "btn btn--sm binding__del";
  del.textContent = "Delete";
  del.addEventListener("click", () => {
    working.bindings.splice(index, 1);
    renderBindings();
    syncControl();
  });

  li.append(fingers, actionWrap, labWrap, del);
  return li;
}

function applyFingerToggle(btn, name, i, state) {
  btn.dataset.state = state;
  btn.textContent = `${FINGER_CAPS[i]} ${CONSTRAINT_GLYPH[state]}`;
  btn.setAttribute("aria-label", `${name}: ${state === "any" ? "any" : state}`);
  btn.title = `${name}: ${state}`;
}

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

// --- keep control in step with the working config ------------------------
function syncControl() {
  control.setConfig({
    dwellMs: working.dwellMs,
    stableFrames: working.stableFrames,
    bindings: working.bindings,
  });
  control.reset();
}

// --- events --------------------------------------------------------------
function wireEvents() {
  els.dwell.addEventListener("input", () => {
    working.dwellMs = clampInt(els.dwell.value, 300, 4000);
    els.dwellVal.textContent = secs(working.dwellMs);
    control.setConfig({ dwellMs: working.dwellMs });
  });

  els.stableFrames.addEventListener("input", () => {
    working.stableFrames = clampInt(els.stableFrames.value, 1, 10);
    control.setConfig({ stableFrames: working.stableFrames });
  });

  els.addBinding.addEventListener("click", () => {
    working.bindings.push({
      id: `b${working.bindings.length}`,
      label: "",
      action: { type: "next" },
      fingers: fingersFromConstraint("any"),
    });
    renderBindings();
    syncControl();
  });

  els.capturePose.addEventListener("click", capturePose);
  els.startCam.addEventListener("click", startLive);
  els.stopCam.addEventListener("click", stopLive);
  els.save.addEventListener("click", doSave);
  els.export.addEventListener("click", doExport);
  els.reset.addEventListener("click", doReset);
  els.copyJson.addEventListener("click", doCopy);
}

function fingersFromConstraint(c) {
  const out = {};
  for (const name of FINGERS) out[name] = c;
  return out;
}

function capturePose() {
  if (!lastReading || !lastReading.present) {
    flashNote(
      els.saveNote,
      "no hand seen - start the camera and hold a pose, then capture",
    );
    return;
  }
  const up = lastReading.up;
  const fingers = {};
  FINGERS.forEach((name, i) => {
    fingers[name] = up[i] ? "up" : "down";
  });
  working.bindings.push({
    id: `b${working.bindings.length}`,
    label: `captured ${patternKey(up)}`,
    action: { type: "next" },
    fingers,
  });
  renderBindings();
  syncControl();
  flashNote(els.saveNote, `captured pose ${patternKey(up)}`);
}

// --- camera + tracking ---------------------------------------------------
async function startLive() {
  els.startCam.disabled = true;
  setCamMsg("starting camera…");
  try {
    await startCamera(els.video);
  } catch {
    setCamMsg("camera denied or unavailable - the editor still works");
    els.startCam.disabled = false;
    return;
  }
  setCamMsg("loading hand tracking…");
  let landmarker;
  try {
    landmarker = await loadHandLandmarker();
  } catch {
    setCamMsg("hand tracking failed to load - video only, no pose reading");
    els.stopCam.disabled = false;
    return;
  }
  setCamMsg("tracking - hold a hand shape");
  els.stopCam.disabled = false;
  control.reset();
  stopTracking = trackHands(landmarker, els.video, onReading);
}

function stopLive() {
  if (stopTracking) {
    stopTracking();
    stopTracking = null;
  }
  stopCamera(els.video);
  lastReading = null;
  control.reset();
  hud.render({});
  els.roPattern.textContent = "-----";
  els.roMatched.textContent = "none";
  setRo(els.roFire, "idle", false);
  els.stopCam.disabled = true;
  els.startCam.disabled = false;
  setCamMsg("camera off - the editor works without it");
}

function onReading(reading) {
  lastReading = reading;
  const up = reading.present ? reading.up : null;
  const res = control.update(up, performance.now());

  hud.render({
    present: reading.present,
    up: reading.up,
    extensions: reading.extensions,
    progress: res.progress,
    label: res.binding ? res.binding.label : "",
  });

  els.roPattern.textContent = reading.present
    ? patternKey(reading.up)
    : "-----";
  els.roMatched.textContent = res.binding
    ? res.binding.label || res.binding.action.type
    : "none";

  if (res.firing) {
    // config tool: never navigate. Flash + name the action instead.
    hud.flash();
    const a = res.action;
    const desc = a.type === "goto" ? `goto ${a.index}` : a.type;
    setRo(els.roFire, `would fire: ${desc}`, true);
    if (fireTimer) clearTimeout(fireTimer);
    fireTimer = setTimeout(() => setRo(els.roFire, "idle", false), 1600);
  }
}

function setRo(el, text, active) {
  el.textContent = text;
  el.classList.toggle("is-active", !!active);
}

function setCamMsg(text) {
  els.camMsg.textContent = text;
}

// --- save / export / reset ----------------------------------------------
function doSave() {
  const ok = saveStored(validateConfig(working));
  flashNote(
    els.saveNote,
    ok
      ? "saved - reload the piece to apply"
      : "could not save (storage unavailable)",
  );
}

function doExport() {
  const json = JSON.stringify(validateConfig(working), null, 2);
  els.exportJson.value = json;
  els.exportBox.hidden = false;
  els.exportJson.focus();
  els.exportJson.select();
}

async function doReset() {
  clearStored();
  const [defaults] = await Promise.all([fetchDefaults()]);
  working = mergeConfig(defaults, null);
  syncControl();
  populate();
  els.exportBox.hidden = true;
  flashNote(els.saveNote, "reset to shipped defaults");
}

async function doCopy() {
  const text = els.exportJson.value;
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch {
    ok = false;
  }
  if (!ok) {
    // fallback: select + execCommand for older / insecure contexts
    els.exportJson.focus();
    els.exportJson.select();
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
  }
  els.copyJson.textContent = ok ? "Copied" : "Copy failed";
  setTimeout(() => (els.copyJson.textContent = "Copy"), 1400);
}

function flashNote(el, text) {
  el.textContent = text;
  el.classList.remove("is-flash");
  void el.offsetWidth;
  el.classList.add("is-flash");
}

boot();

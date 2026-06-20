// ─────────────────────────────────────────────────────────────────────────────
//  chat.js  -  mother-patina
//
//  Plays one screen of the conversation as a WhatsApp thread, then forwards the
//  next screen the way Mary is forwarded: a new floating window on the desktop, a
//  new tab in fullscreen, an in-app notification on a phone. Every forward is a
//  tap, so the browser never blocks it. The Mary image at the top of each screen
//  is the same icon, worn one more generation of JPEG loss (reused decay engine).
//
//  Auto-plays a little faster than a quick reader; scroll up to catch up, down to
//  follow. Reduced-motion shows the whole thread at once. No network, no bundler.
// ─────────────────────────────────────────────────────────────────────────────

import { createDecayEngine } from "./lib/decay.js";

const MAX_SCREEN = 5;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;

const params = new URLSearchParams(location.search);
const fast = params.get("fast") === "1"; // tests: collapse the delays
const screenNum = clamp(
  parseInt(params.get("screen") || "1", 10),
  1,
  MAX_SCREEN,
);

const els = {
  thread: document.getElementById("thread"),
  status: document.getElementById("chat-status"),
  notif: document.getElementById("notif"),
  jump: document.getElementById("jump-latest"),
};

// test hook: e2e waits on window.__mp.done
window.__mp = { screen: screenNum, done: false };

let stickToBottom = true;

boot().catch((err) => console.error("mother-patina failed to start:", err));

async function boot() {
  els.thread.addEventListener("scroll", onScroll, { passive: true });
  els.jump.addEventListener("click", () => scrollToBottom(true));
  els.notif.addEventListener("click", forwardNext);

  const data = await (await fetch("data/screens.json")).json();
  const screen =
    data.screens.find((s) => s.screen === screenNum) || data.screens[0];

  await playScreen(screen, data.image);

  window.__mp.done = true;
  armForward();
}

// ── play ──────────────────────────────────────────────────────────────────────

async function playScreen(screen, imageSrc) {
  for (let i = 0; i < screen.messages.length; i++) {
    const m = screen.messages[i];

    if (!reduced && m.kind !== "image") {
      if (m.from === "b") {
        setStatus("typing…");
        showTyping();
        await wait(typingDelay(m));
        hideTyping();
        setStatus("online");
      } else {
        await wait(fast ? 8 : Math.min(700, 200 + words(m) * 30));
      }
    }

    await addMessage(m, screen.gen, imageSrc);

    if (!reduced) await wait(readDelay(m));
  }
}

async function addMessage(m, gen, imageSrc) {
  if (m.kind === "image") {
    await addImage(m.from, gen, imageSrc);
  } else {
    const cls =
      m.kind === "arabic" ? "arabic" : m.kind === "translit" ? "translit" : "";
    const node = bubble(m.from, m.text, cls);
    els.thread.appendChild(node);
  }
  autoScroll();
}

async function addImage(from, gen, imageSrc) {
  const wrap = document.createElement("div");
  wrap.className = `msg image ${from === "a" ? "out" : "in"}`;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "the Virgin Mary, forwarded");
  wrap.appendChild(canvas);
  wrap.appendChild(meta());
  els.thread.appendChild(wrap);

  const img = new Image();
  img.src = imageSrc;
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise((r) => {
      img.addEventListener("load", r, { once: true });
      img.addEventListener("error", r, { once: true });
    });
  }
  canvas.width = img.naturalWidth || 756;
  canvas.height = img.naturalHeight || 1151;
  const engine = createDecayEngine({
    canvas,
    sourceImage: img,
    maxStep: MAX_SCREEN,
  });
  engine.renderStep(Math.min(gen, MAX_SCREEN), { animate: false });
}

function bubble(from, text, extra) {
  const node = document.createElement("div");
  node.className = `msg ${from === "a" ? "out" : "in"}${extra ? " " + extra : ""}`;
  const body = document.createElement("span");
  body.className = "body";
  body.textContent = text;
  if (extra === "arabic") {
    body.lang = "ar";
    body.dir = "rtl";
  }
  node.appendChild(body);
  node.appendChild(meta());
  return node;
}

function meta() {
  const m = document.createElement("span");
  m.className = "meta";
  m.textContent = "6:03 AM";
  return m;
}

// ── typing indicator ────────────────────────────────────────────────────────

function showTyping() {
  hideTyping();
  const t = document.createElement("div");
  t.className = "typing";
  t.id = "typing";
  t.innerHTML = "<i></i><i></i><i></i>";
  els.thread.appendChild(t);
  autoScroll();
}
function hideTyping() {
  const t = document.getElementById("typing");
  if (t) t.remove();
}

// ── scroll ──────────────────────────────────────────────────────────────────

function onScroll() {
  const nearBottom =
    els.thread.scrollHeight - els.thread.scrollTop - els.thread.clientHeight <
    48;
  stickToBottom = nearBottom;
  els.jump.hidden = nearBottom;
}
function autoScroll() {
  if (stickToBottom) scrollToBottom(false);
}
function scrollToBottom(force) {
  if (force) stickToBottom = true;
  els.thread.scrollTop = els.thread.scrollHeight;
  els.jump.hidden = true;
}

// ── the forward ─────────────────────────────────────────────────────────────

function armForward() {
  setStatus("online");
  // the last screen ends the piece - no further forward
  if (screenNum >= MAX_SCREEN) {
    els.notif.hidden = true;
    return;
  }
  els.notif.hidden = false;
}

function forwardNext() {
  if (screenNum >= MAX_SCREEN) return;
  const next = screenNum + 1;
  let search = `?screen=${next}`;
  if (fast) search += "&fast=1";
  const relative = location.pathname + search;
  const absolute = location.origin + relative;
  els.notif.hidden = true;

  // mobile: phones do not float windows - open the next screen in place
  if (coarse) {
    location.href = relative;
    return;
  }

  // desktop fullscreen: a new tab; windowed: a new floating window offset from here
  let win = null;
  try {
    if (isFullscreen()) {
      win = window.open(absolute, "_blank");
    } else {
      const w = Math.min(460, (screen.availWidth || 1280) - 40);
      const h = Math.min(840, (screen.availHeight || 800) - 60);
      const left = (window.screenX || 0) + 70 + next * 34;
      const top = (window.screenY || 0) + 40 + next * 26;
      win = window.open(
        absolute,
        `mother-${next}`,
        `popup,width=${w},height=${h},left=${left},top=${top}`,
      );
    }
  } catch {
    win = null;
  }
  // blocked despite the gesture: do not dead-end
  if (!win) {
    console.warn("mother-patina: popup blocked, navigating in place");
    location.href = relative;
  }
}

function isFullscreen() {
  if (document.fullscreenElement) return true;
  try {
    if (matchMedia("(display-mode: fullscreen)").matches) return true;
  } catch {
    /* ignore */
  }
  return (
    window.innerHeight === screen.height && window.innerWidth === screen.width
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function setStatus(s) {
  if (els.status) els.status.textContent = s;
}
function words(m) {
  return (m.text || "").trim().split(/\s+/).filter(Boolean).length || 1;
}
// a beat faster than a quick reader: the next message lands before you finish, so
// you fall behind and scroll up to catch the line you loved.
function readDelay(m) {
  if (fast) return 8;
  const base = m.kind === "arabic" ? 1500 : m.kind === "translit" ? 900 : 0;
  return clamp(base + words(m) * 125, 480, 3800);
}
function typingDelay(m) {
  if (fast) return 6;
  return clamp(300 + words(m) * 45, 450, 1500);
}
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

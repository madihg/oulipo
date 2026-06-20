// ─────────────────────────────────────────────────────────────────────────────
//  chat.js  -  mother-patina
//
//  The landing is a phone lock screen ("Every day my mother sends me a picture of
//  the Virgin Mary on WhatsApp"); tapping it opens the conversation. Each screen
//  plays as a WhatsApp thread under a date separator (the last five days - every
//  day she sends), opening with a DIFFERENT forwarded Mary (a text-free crop with
//  the clean Arabic laid over it), worn one more JPEG generation each screen. Long
//  messages are split so no bubble runs past four lines. At a screen's end the
//  conversation forwards itself: a new floating window on the desktop, a new tab in
//  fullscreen, in place on a phone - always on a tap, so popups are never blocked.
//
//  No network, no bundler, no em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

import { createDecayEngine } from "./lib/decay.js";

const MAX_SCREEN = 5;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;

const params = new URLSearchParams(location.search);
const fast = params.get("fast") === "1"; // tests: collapse the delays
const onLock = !params.has("screen");
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

window.__mp = { screen: screenNum, lock: onLock, done: false };

let stickToBottom = true;

boot().catch((err) => console.error("mother-patina failed to start:", err));

async function boot() {
  if (onLock) {
    setupLock();
    window.__mp.done = true;
    return;
  }

  els.thread.addEventListener("scroll", onScroll, { passive: true });
  els.jump.addEventListener("click", () => scrollToBottom(true));
  els.notif.addEventListener("click", forwardNext);

  const data = await (await fetch("data/screens.json")).json();
  const screen =
    data.screens.find((s) => s.screen === screenNum) || data.screens[0];

  addDateSeparator(screenNum);
  await playScreen(screen);

  window.__mp.done = true;
  armForward();
}

// ── the lock-screen landing ─────────────────────────────────────────────────

function setupLock() {
  const now = new Date();
  const clock = document.getElementById("lock-clock");
  const date = document.getElementById("lock-date");
  if (clock) clock.textContent = formatTime(now);
  if (date) {
    date.textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  const open = () => {
    location.href = location.pathname + "?screen=1";
  };
  const btn = document.getElementById("lock-open");
  if (btn) btn.addEventListener("click", (e) => (e.stopPropagation(), open()));
  const lock = document.getElementById("lock");
  if (lock) lock.addEventListener("click", open);
}

// ── play a screen ───────────────────────────────────────────────────────────

async function playScreen(screen) {
  const messages = expandLong(screen.messages);
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];

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

    if (m.kind === "image") await addImage(m.from, screen);
    else els.thread.appendChild(bubble(m));
    autoScroll();

    if (!reduced) await wait(readDelay(m));
  }
}

async function addImage(from, screen) {
  const wrap = document.createElement("div");
  wrap.className = `msg image ${from === "a" ? "out" : "in"}`;
  const frame = document.createElement("div");
  frame.className = "img-frame";
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "the Virgin Mary, forwarded");
  frame.appendChild(canvas);
  if (screen.arabic) {
    const ar = document.createElement("div");
    ar.className = "img-arabic";
    ar.lang = "ar";
    ar.dir = "rtl";
    ar.textContent = screen.arabic;
    frame.appendChild(ar);
  }
  wrap.appendChild(frame);
  wrap.appendChild(meta());
  els.thread.appendChild(wrap);

  const img = new Image();
  img.src = screen.image;
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise((r) => {
      img.addEventListener("load", r, { once: true });
      img.addEventListener("error", r, { once: true });
    });
  }
  canvas.width = img.naturalWidth || 600;
  canvas.height = img.naturalHeight || 600;
  const engine = createDecayEngine({
    canvas,
    sourceImage: img,
    maxStep: MAX_SCREEN,
  });
  engine.renderStep(Math.min(screen.gen ?? 0, MAX_SCREEN), { animate: false });
}

function bubble(m) {
  const node = document.createElement("div");
  const extra = m.kind === "translit" ? " translit" : "";
  node.className = `msg ${m.from === "a" ? "out" : "in"}${extra}`;
  const body = document.createElement("span");
  body.className = "body";
  body.textContent = m.text;
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

function addDateSeparator(n) {
  const daysAgo = MAX_SCREEN - n; // screen 5 = today, screen 1 = four days ago
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  let label;
  if (daysAgo === 0) label = "TODAY";
  else if (daysAgo === 1) label = "YESTERDAY";
  else
    label = d.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  const sep = document.createElement("div");
  sep.className = "sys date-sep";
  sep.textContent = label;
  els.thread.appendChild(sep);
}

// ── split any text message that runs past four lines ───────────────────────────

function expandLong(messages) {
  const probe = document.createElement("div");
  probe.className = "msg in";
  probe.style.visibility = "hidden";
  const pbody = document.createElement("span");
  pbody.className = "body";
  probe.appendChild(pbody);
  els.thread.appendChild(probe);

  const out = [];
  for (const m of messages) {
    if (m.kind === "text") {
      for (const part of splitDeep(m.text, pbody, 0)) {
        out.push({ ...m, text: part });
      }
    } else {
      out.push(m);
    }
  }
  probe.remove();
  return out;
}

function splitDeep(text, pbody, depth) {
  pbody.textContent = text;
  if (depth >= 2 || lineCount(pbody) <= 4) return [text];
  const cut = splitPoint(text);
  if (cut <= 0 || cut >= text.length) return [text];
  return [
    ...splitDeep(text.slice(0, cut).trim(), pbody, depth + 1),
    ...splitDeep(text.slice(cut).trim(), pbody, depth + 1),
  ];
}

function splitPoint(text) {
  const mid = Math.floor(text.length / 2);
  let cut = text.indexOf(". ", mid); // prefer a sentence boundary past the middle
  if (cut !== -1) return cut + 1;
  cut = text.lastIndexOf(" ", mid); // else the nearest space
  if (cut !== -1) return cut;
  return text.indexOf(" ", mid);
}

function lineCount(node) {
  const lh = parseFloat(getComputedStyle(node).lineHeight) || 18;
  return Math.round(node.getBoundingClientRect().height / lh);
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

  if (coarse) {
    location.href = relative;
    return;
  }

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
function readDelay(m) {
  if (fast) return 8;
  const base = m.kind === "translit" ? 900 : 0;
  return clamp(base + words(m) * 125, 480, 3800);
}
function typingDelay(m) {
  if (fast) return 6;
  return clamp(300 + words(m) * 45, 450, 1500);
}
function formatTime(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

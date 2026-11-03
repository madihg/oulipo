// ─────────────────────────────────────────────────────────────────────────────
//  chat.js  -  mother-patina
//
//  ONE Virgin Mary, forwarded through the family. Each screen is a chat with a
//  different relative (a different contact + avatar + messenger app: WhatsApp,
//  iMessage, Telegram), and the same image pixelizes one step more every screen
//  until, by "mum", she is barely recognisable. The mother's own profile picture
//  IS the Virgin. The clean Arabic prayer line is laid over the image and arrives
//  as the first chat bubble. The landing is a phone lock screen; tap to open.
//
//  Each screen forwards itself the way a forward arrives - a window on desktop, a
//  tab in fullscreen, in place on a phone - and the affordance differs per screen:
//  a notification, a "Forward to ..." button, a burst of messages, or, at the end,
//  "Save the prayer" (downloads mother-patina.txt). No network, no bundler.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SCREEN = 5;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;

const params = new URLSearchParams(location.search);
const fast = params.get("fast") === "1"; // tests: collapse the delays
// ?lang=ar is the Arabic-forward version: the same chats, mirrored right-to-left,
// the messenger chrome in Arabic, the prayer line leading and its Latin-letter
// echo stepping back. The family's own lines stay in the language they wrote.
const lang = params.get("lang") === "ar" ? "ar" : "en";
const langQuery = lang === "ar" ? "&lang=ar" : "";
const onLock = !params.has("screen");
const screenNum = clamp(
  parseInt(params.get("screen") || "1", 10),
  1,
  MAX_SCREEN,
);

const els = {
  thread: document.getElementById("thread"),
  status: document.getElementById("chat-status"),
  name: document.getElementById("chat-name"),
  avatar: document.getElementById("chat-avatar"),
  notif: document.getElementById("notif"),
  notifAvatar: document.getElementById("notif-avatar"),
  notifTitle: document.getElementById("notif-title"),
  notifSub: document.getElementById("notif-sub"),
  notifCue: document.getElementById("notif-cue"),
  notifBadge: document.getElementById("notif-badge"),
  jump: document.getElementById("jump-latest"),
  foot: document.querySelector(".foot-input"),
};

// each screen imitates a different messenger; the look is themed in CSS off
// <html data-app="...">, the header status + input placeholder set here.
const APPS = new Set(["whatsapp", "imessage", "telegram"]);
// every string the messenger chrome says, in both versions. The chats themselves
// come from data/screens.json.
const STRINGS = {
  en: {
    idle: { whatsapp: "online", imessage: "", telegram: "last seen recently" },
    placeholder: { whatsapp: "Message", imessage: "iMessage", telegram: "Message" },
    typing: "typing…",
    today: "TODAY",
    yesterday: "YESTERDAY",
    latest: "↓ latest",
    save: "Save the prayer",
    saveFile: "mother-patina.txt",
    saveCue: "save",
    saveLabel: "Save the prayer as mother-patina.txt",
    saved: "saved to your device",
    savedLabel: "Prayer saved to your device",
    saveFailed: "could not save",
    forward: "Forward",
    forwardTo: (to) => "to " + to,
    forwardLabel: (to) => "Forward to " + to,
    send: "send",
    open: "open",
    newMessage: "new message",
    newMessages: "new messages",
    openLabel: (to) => "Open new message from " + (to || "your family"),
    burstLabel: (n, to) => `Open ${n} new messages from ${to || "your mother"}`,
    lockTitle: "Every day my mother sends me a picture of the Virgin Mary on WhatsApp",
    lockSub: "Every day my mother sends me a WhatsApp",
    lockNow: "now",
    lockHint: "tap to open",
    lockOpen: "Open Maman's message",
    title: "mother",
  },
  ar: {
    idle: { whatsapp: "متصل الآن", imessage: "", telegram: "آخر ظهور مؤخرًا" },
    placeholder: { whatsapp: "رسالة", imessage: "iMessage", telegram: "رسالة" },
    typing: "يكتب…", // overridden per screen by typing_ar (she / he)
    today: "اليوم",
    yesterday: "أمس",
    latest: "↓ الأحدث",
    save: "احفظ الصلاة",
    saveFile: "mother-patina-ar.txt",
    saveCue: "حفظ",
    saveLabel: "احفظ الصلاة كملف mother-patina-ar.txt",
    saved: "تم الحفظ على جهازك",
    savedLabel: "تم حفظ الصلاة على جهازك",
    saveFailed: "تعذّر الحفظ",
    forward: "إعادة توجيه",
    forwardTo: (to) => "إلى " + to,
    forwardLabel: (to) => "إعادة توجيه إلى " + to,
    send: "إرسال",
    open: "فتح",
    newMessage: "رسالة جديدة",
    newMessages: "رسائل جديدة",
    openLabel: (to) => "افتح رسالة جديدة من " + (to || "العيلة"),
    burstLabel: (n, to) => `افتح ${n} رسائل جديدة من ${to || "إمي"}`,
    lockTitle: "كل يوم إمي بتبعتلي صورة العدرا على الواتساب",
    lockSub: "كل يوم إمي بتبعتلي واتساب",
    lockNow: "الآن",
    lockHint: "اضغط لتفتح",
    lockOpen: "افتح رسالة ماما",
    title: "إمي",
  },
};
const T = STRINGS[lang];
const IDLE = T.idle;
const PLACEHOLDER = T.placeholder;
// if the decorated prayer file can't be read, the artifact still holds the poem.
const FALLBACK_PRAYER =
  "When my family forwards Mary\nThey are saying\nThey don't know what to say\nbut son, daughter, niece, love\nWe are aging and this faith\nis the buoy we know best.\nThese worn images are how we learned\nto say I love you.\n";
// the Arabic-forward version saves the five lines riding above the same poem.
const FALLBACK_PRAYER_AR =
  "بحضنك خذينا\nوعن كل شر ابعدينا\nيا أم يسوع\nتشفعي فينا\nأمين\n\n" +
  FALLBACK_PRAYER;
const FALLBACK = lang === "ar" ? FALLBACK_PRAYER_AR : FALLBACK_PRAYER;

window.__mp = {
  screen: screenNum,
  lock: onLock,
  lang,
  done: false,
  // rhythm instrumentation (read by the e2e suite under ?fast=1)
  typing: 0, // times the typing dots were shown
  beats: 0, // silences played before a line
  hesitations: 0, // typing that stopped, sat, then started again
};

let DATA = null;
let SCREEN = null;
let IDLE_STATUS = "online";
let PRAYER_TEXT = "";
let stickToBottom = true;

boot().catch((err) => console.error("mother-patina failed to start:", err));

async function boot() {
  applyLang();
  if (onLock) {
    setupLock();
    window.__mp.done = true;
    printPrayer(); // the prayer is hidden in the console even on the landing
    return;
  }

  els.thread.addEventListener("scroll", onScroll, { passive: true });
  els.jump.addEventListener("click", () => scrollToBottom(true));
  els.notif.addEventListener("click", onNotif);

  DATA = await (await fetch("data/screens.json")).json();
  SCREEN = DATA.screens.find((s) => s.screen === screenNum) || DATA.screens[0];
  PRAYER_TEXT = await loadPrayer(prayerPath(DATA));
  printPrayer();

  setContact(SCREEN);
  addDateSeparator(screenNum);
  // always arm the forward, even if a draw throws mid-play, so the reader is
  // never stranded without a way onward (and the e2e ready-flag always flips).
  try {
    await playScreen(SCREEN);
  } finally {
    window.__mp.done = true;
    armForward(SCREEN);
  }
}

// the Arabic-forward version flips the document and speaks its chrome in Arabic
function applyLang() {
  const root = document.documentElement;
  root.dataset.lang = lang;
  if (lang !== "ar") return;
  root.lang = "ar";
  root.dir = "rtl";
  document.title = T.title;
  const put = (sel, text) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = text;
  };
  put(".lock-notif-title", T.lockTitle);
  put(".lock-notif-sub", T.lockSub);
  put(".lock-notif-head b", "ماما");
  put(".lock-notif-head i", T.lockNow);
  put(".lock-hint", T.lockHint);
  const open = document.getElementById("lock-open");
  if (open) open.setAttribute("aria-label", T.lockOpen);
  if (els.jump) els.jump.textContent = T.latest;
  if (els.foot) els.foot.textContent = PLACEHOLDER.whatsapp;
  if (els.status) els.status.textContent = IDLE.whatsapp;
}

function contactName(s) {
  return lang === "ar" && s.contact_ar ? s.contact_ar : s.contact;
}
function forwardName(f) {
  return lang === "ar" && f.to_ar ? f.to_ar : f.to;
}
function prayerPath(data) {
  return lang === "ar" && data.prayer_ar ? data.prayer_ar : data.prayer;
}
function typingLabel() {
  return (lang === "ar" && SCREEN && SCREEN.typing_ar) || T.typing;
}

function setContact(s) {
  // skin the whole UI as the messenger this relative uses
  const app = APPS.has(s.app) ? s.app : "whatsapp";
  document.documentElement.dataset.app = app;
  IDLE_STATUS = IDLE[app];
  if (els.name) els.name.textContent = contactName(s);
  if (els.status) els.status.textContent = IDLE_STATUS;
  if (els.foot) els.foot.textContent = PLACEHOLDER[app];
  if (els.avatar && s.avatar)
    els.avatar.style.backgroundImage = `url("${s.avatar}")`;
}

// load the decorated prayer text the reader can save (same-origin static file).
async function loadPrayer(path) {
  if (!path) return FALLBACK;
  try {
    const res = await fetch(path);
    if (!res.ok) return FALLBACK; // a 404 body is not the prayer
    const text = await res.text();
    return text.trim() ? text : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

// hidden: the saved prayer also prints, whole, to the browser console - the same
// text the reader can save - for anyone who thinks to open it. No hint in the UI.
async function printPrayer() {
  try {
    const text =
      PRAYER_TEXT ||
      (await loadPrayer(
        lang === "ar" ? "data/prayer-ar.txt" : "data/prayer.txt",
      ));
    if (text && text.trim()) console.log("\n" + text + "\n");
  } catch {
    /* the prayer is a gift in the console, never a requirement */
  }
}

// ── the lock-screen landing ─────────────────────────────────────────────────

function setupLock() {
  const now = new Date();
  const clock = document.getElementById("lock-clock");
  const date = document.getElementById("lock-date");
  if (clock) clock.textContent = formatTime(now);
  if (date) {
    date.textContent = now.toLocaleDateString(
      lang === "ar" ? "ar-LB" : undefined,
      { weekday: "long", month: "long", day: "numeric" },
    );
  }
  const open = () => {
    location.href = location.pathname + "?screen=1" + langQuery;
  };
  const btn = document.getElementById("lock-open");
  if (btn) btn.addEventListener("click", (e) => (e.stopPropagation(), open()));
  const lock = document.getElementById("lock");
  if (lock) lock.addEventListener("click", open);
}

// ── play a screen ───────────────────────────────────────────────────────────

async function playScreen(screen) {
  const messages = expandLong(withArabic(screen));
  try {
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];

      if (!reduced && m.kind !== "image") {
        if (m.cont) {
          await wait(fast ? 6 : 380);
        } else {
          // the rhythm pass: a line can wait in silence first (beat, in ms),
          // and an incoming line can start, stop, sit with it, then start again
          // (hesitate), before the typing dots hold for their usual, or weighted,
          // time. Someone "…" for a long time.
          if (m.beat) {
            window.__mp.beats += 1;
            await wait(fast ? 6 : m.beat);
          }
          if (m.from === "b") {
            if (m.hesitate) {
              window.__mp.hesitations += 1;
              setStatus(typingLabel());
              showTyping();
              await wait(fast ? 6 : Math.round(typingDelay(m) * 0.6));
              hideTyping();
              setStatus(IDLE_STATUS);
              await wait(fast ? 6 : 1500);
            }
            setStatus(typingLabel());
            showTyping();
            await wait(typingDelay(m));
            hideTyping();
            setStatus(IDLE_STATUS);
          } else {
            await wait(fast ? 8 : Math.min(900, 260 + words(m) * 38));
          }
        }
      }

      let node = null;
      if (m.kind === "image") await addImage(m.from, screen);
      else {
        node = bubble(m);
        els.thread.appendChild(node);
      }
      autoScroll();

      // a WhatsApp-style emoji reaction pops onto the bubble a beat later, before
      // the next message arrives (only on the final part of a split message).
      if (node && m.reaction && !m.hasNext) {
        if (!reduced) await wait(fast ? 6 : 650);
        addReaction(node, m.reaction);
        autoScroll();
      }

      if (!reduced) await wait(m.hasNext ? (fast ? 6 : 460) : readDelay(m));
    }
  } finally {
    hideTyping();
    setStatus(IDLE_STATUS);
  }
}

// the Arabic line appears over the image AND as the first chat bubble, from
// whoever sent the image (the reader on the screen they forward it themselves).
function withArabic(screen) {
  const msgs = screen.messages.slice();
  if (screen.arabic) {
    const from = msgs[0] && msgs[0].from === "a" ? "a" : "b";
    msgs.splice(1, 0, { from, kind: "arabic", text: screen.arabic });
  }
  return msgs;
}

async function addImage(from, screen) {
  const wrap = document.createElement("div");
  wrap.className = `msg image ${from === "a" ? "out" : "in"}`;
  const frame = document.createElement("div");
  frame.className = "img-frame";
  if ((screen.gen ?? 0) > 0) frame.classList.add("is-pixelized");
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
  img.src = DATA.image;
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise((r) => {
      img.addEventListener("load", r, { once: true });
      img.addEventListener("error", r, { once: true });
    });
  }
  if (!img.naturalWidth) return;
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  pixelize(canvas, img, screen.gen ?? 0);
}

// Draw the image pixelized: downscale to `cols` blocks across, then upscale with
// smoothing off so the blocks stay sharp. gen 0 is crisp; each step is blockier.
function pixelize(canvas, img, gen) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width,
    H = canvas.height;
  const COLS = [0, 70, 42, 25, 14]; // 0 = no pixelation (crisp)
  const cols = COLS[Math.min(Math.max(gen, 0), COLS.length - 1)];
  if (!cols || cols >= W) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, W, H);
    return;
  }
  const rows = Math.max(1, Math.round((cols * H) / W));
  const tmp = document.createElement("canvas");
  tmp.width = cols;
  tmp.height = rows;
  const tctx = tmp.getContext("2d");
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(img, 0, 0, cols, rows);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(tmp, 0, 0, cols, rows, 0, 0, W, H);
}

function bubble(m) {
  const node = document.createElement("div");
  const extra =
    m.kind === "translit" ? " translit" : m.kind === "arabic" ? " arabic" : "";
  node.className = `msg ${m.from === "a" ? "out" : "in"}${extra}`;
  const body = document.createElement("span");
  body.className = "body";
  body.textContent = m.text;
  if (m.kind === "arabic") {
    body.lang = "ar";
    body.dir = "rtl";
  } else {
    // the family's lines keep their own direction inside the mirrored chat
    body.dir = "auto";
  }
  node.appendChild(body);
  node.appendChild(meta());
  return node;
}

// a WhatsApp-style reaction: a little emoji pill clinging to the bubble's edge.
function addReaction(node, emoji) {
  const r = document.createElement("span");
  r.className = "reaction";
  r.textContent = emoji;
  r.setAttribute("role", "img");
  r.setAttribute("aria-label", "reacted " + emoji);
  node.appendChild(r);
  node.classList.add("has-reaction");
}

function meta() {
  const m = document.createElement("span");
  m.className = "meta";
  m.textContent = "6:03 AM";
  return m;
}

function addDateSeparator(n) {
  const daysAgo = MAX_SCREEN - n;
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  let label;
  if (daysAgo === 0) label = T.today;
  else if (daysAgo === 1) label = T.yesterday;
  else
    label = d
      .toLocaleDateString(lang === "ar" ? "ar-LB" : undefined, {
        weekday: "long",
      })
      .toUpperCase();
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
      const parts = splitDeep(m.text, pbody, 0);
      parts.forEach((part, idx) => {
        out.push({
          ...m,
          text: part,
          cont: idx > 0,
          hasNext: idx < parts.length - 1,
        });
      });
    } else {
      out.push(m);
    }
  }
  probe.remove();
  return out;
}

function splitDeep(text, pbody, depth) {
  pbody.textContent = text;
  if (depth >= 3 || lineCount(pbody) <= 4) return [text];
  const cut = splitPoint(text);
  if (cut <= 0 || cut >= text.length) return [text];
  return [
    ...splitDeep(text.slice(0, cut).trim(), pbody, depth + 1),
    ...splitDeep(text.slice(cut).trim(), pbody, depth + 1),
  ];
}

function splitPoint(text) {
  const mid = Math.floor(text.length / 2);
  let cut = text.indexOf(". ", mid);
  if (cut !== -1) return cut + 1;
  cut = text.lastIndexOf(" ", mid);
  if (cut > 0) return cut;
  cut = text.indexOf(" ", mid);
  return cut > 0 ? cut : mid;
}

function lineCount(node) {
  const lh = parseFloat(getComputedStyle(node).lineHeight) || 18;
  return Math.round(node.getBoundingClientRect().height / lh);
}

// ── typing indicator ────────────────────────────────────────────────────────

function showTyping() {
  hideTyping();
  window.__mp.typing += 1;
  const t = document.createElement("div");
  t.className = "typing";
  t.id = "typing";
  t.setAttribute("aria-hidden", "true");
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
  else els.jump.hidden = false;
}
function scrollToBottom(force) {
  if (force) stickToBottom = true;
  els.thread.scrollTop = els.thread.scrollHeight;
  els.jump.hidden = true;
}

// ── the forward (varies per screen) ───────────────────────────────────────────

function armForward(screen) {
  setStatus(IDLE_STATUS);
  const f = (screen && screen.forward) || { type: "notify" };
  const av = els.notifAvatar;

  // the visible spans are aria-hidden-ish decoration; the button's own
  // aria-label is what assistive tech announces, so set it per screen.
  const to = forwardName(f);
  if (f.type === "save") {
    if (av) av.style.backgroundImage = `url("${screen.avatar}")`;
    set(els.notifTitle, T.save);
    set(els.notifSub, T.saveFile);
    set(els.notifCue, T.saveCue);
    hideBadge();
    els.notif.dataset.action = "save";
    label(T.saveLabel);
  } else if (f.type === "forward") {
    if (av && f.avatar) av.style.backgroundImage = `url("${f.avatar}")`;
    set(els.notifTitle, T.forward);
    set(els.notifSub, T.forwardTo(to));
    set(els.notifCue, T.send);
    hideBadge();
    els.notif.dataset.action = "next";
    label(T.forwardLabel(to));
  } else if (f.type === "burst") {
    const n = f.count || 3;
    if (av && f.avatar) av.style.backgroundImage = `url("${f.avatar}")`;
    set(els.notifTitle, to || "");
    set(els.notifSub, T.newMessages);
    set(els.notifCue, T.open);
    els.notif.dataset.action = "next";
    label(T.burstLabel(n, to));
    burstBadge(n);
  } else {
    // "notify"
    if (av && f.avatar) av.style.backgroundImage = `url("${f.avatar}")`;
    set(els.notifTitle, to || "");
    set(els.notifSub, T.newMessage);
    set(els.notifCue, T.open);
    els.notif.dataset.action = "next";
    label(T.openLabel(to));
    hideBadge();
  }
  els.notif.hidden = false;
}

function onNotif() {
  if (els.notif.dataset.action === "save") {
    if (els.notif.dataset.saved !== "true") saveThePrayer(); // save once
  } else forwardNext();
}

function burstBadge(count) {
  if (!els.notifBadge) return;
  els.notifBadge.hidden = false;
  // reduced motion (or a trivial count): land on the final number, no ticking.
  if (reduced || count <= 1) {
    els.notifBadge.textContent = String(Math.max(1, count));
    return;
  }
  let n = 1;
  els.notifBadge.textContent = "1";
  const iv = setInterval(
    () => {
      n += 1;
      els.notifBadge.textContent = String(n);
      if (n >= count) clearInterval(iv);
    },
    fast ? 10 : 240,
  );
}
function hideBadge() {
  if (els.notifBadge) els.notifBadge.hidden = true;
}

// Save the prayer to a local .txt file. Fully local (a Blob + a download link);
// nothing leaves the device.
function saveThePrayer() {
  const text = PRAYER_TEXT || FALLBACK;
  try {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = T.saveFile;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    set(els.notifSub, T.saved);
    set(els.notifCue, "✓");
    els.notif.dataset.saved = "true";
    label(T.savedLabel);
  } catch (e) {
    console.warn("mother-patina: save failed", e);
    set(els.notifSub, T.saveFailed);
  }
}

function forwardNext() {
  if (screenNum >= MAX_SCREEN) return;
  const next = screenNum + 1;
  let search = `?screen=${next}` + langQuery;
  if (fast) search += "&fast=1";
  const relative = location.pathname + search;
  const absolute = location.origin + relative;
  els.notif.hidden = true;

  if (isPhone()) {
    location.href = relative;
    return;
  }

  let win = null;
  try {
    if (isExpanded()) {
      win = window.open(absolute, "_blank"); // new tab
    } else {
      const w = 470;
      const h = Math.min(900, (screen.availHeight || 900) - 60);
      const left = (window.screenX ?? window.screenLeft ?? 0) + 64;
      const top = (window.screenY ?? window.screenTop ?? 0) + 52;
      win = window.open(
        absolute,
        `mother-${next}`,
        `popup=yes,width=${w},height=${h},left=${left},top=${top}`,
      );
    }
  } catch {
    win = null;
  }
  if (!win) {
    console.warn("mother-patina: popup blocked, navigating in place");
    location.href = relative;
    return;
  }
  try {
    win.focus();
  } catch {
    /* ignore */
  }
  setTimeout(() => {
    try {
      if (win.closed) location.href = relative;
    } catch {
      /* the opened window is fine; leave it */
    }
  }, 600);
}

function isPhone() {
  try {
    return matchMedia("(hover: none) and (pointer: coarse)").matches;
  } catch {
    return coarse;
  }
}

function isExpanded() {
  if (document.fullscreenElement) return true;
  try {
    if (matchMedia("(display-mode: fullscreen)").matches) return true;
  } catch {
    /* ignore */
  }
  const aw = screen.availWidth || window.innerWidth;
  const ah = screen.availHeight || window.innerHeight;
  return window.outerWidth >= aw - 16 && window.outerHeight >= ah - 16;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function set(el, text) {
  if (el) el.textContent = text;
}
function label(text) {
  if (els.notif) els.notif.setAttribute("aria-label", text);
}
function setStatus(s) {
  if (els.status) els.status.textContent = s;
}
function words(m) {
  return (m.text || "").trim().split(/\s+/).filter(Boolean).length || 1;
}
function readDelay(m) {
  if (fast) return 8;
  const base = m.kind === "translit" ? 1100 : 0;
  return clamp(base + words(m) * 155, 620, 4200);
}
function typingDelay(m) {
  if (fast) return 6;
  const base = clamp(360 + words(m) * 58, 560, 1800);
  // a few high-stakes lines hold the typing dots longer, so the weight lands:
  // weight: true is ~50% longer; a number is a multiplier (4 = someone types,
  // and types, and you wait).
  const k = typeof m.weight === "number" ? m.weight : m.weight ? 1.5 : 1;
  return clamp(Math.round(base * k), 560, 9000);
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

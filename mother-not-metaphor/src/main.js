/**
 * src/main.js - boot. Loads the poem, wires the components, and chooses the
 * input path: live hands when a camera + MediaPipe are available, otherwise the
 * timed auto-play fallback (Instagram in-app browser, denied permission, etc.).
 *
 * Query params:
 *   ?mode=auto   force the no-camera auto path (also skips the start tap)
 *   ?mode=live   force the camera path
 *   ?speed=N     multiply timing speed (tests / impatience)
 *   ?loop=1      loop after the last moment
 */

import { createIllustration } from "./illustration.js";
import { createWords } from "./words.js";
import { createLayout } from "./layout.js";
import { createPlayer } from "./player.js";
import { startCamera, stopCamera } from "./camera.js";

const params = new URLSearchParams(location.search);
const forcedMode = params.get("mode");
const speed = Math.max(0.1, parseFloat(params.get("speed") || "1") || 1);
const loop = params.get("loop") === "1";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (id) => document.getElementById(id);

async function boot() {
  const res = await fetch("data/poem.json");
  const poem = await res.json();

  document.documentElement.style.setProperty("--paper", poem.palette.paper);
  document.documentElement.style.setProperty("--ink", poem.palette.ink);
  document.title = poem.title;

  const stage = $("stage");
  const els = {
    video: $("cam-video"),
    svg: $("illus-svg"),
    tag: $("words-tag"),
    caption: $("words-caption"),
    translation: $("words-translation"),
    hint: $("hint"),
    intro: $("intro"),
    start: $("start"),
    introNote: $("intro-note"),
  };

  const illustration = createIllustration(els.svg, poem.palette, { reduced });
  const words = createWords(
    { tag: els.tag, caption: els.caption, translation: els.translation },
    { reduced },
  );
  const layout = createLayout(
    stage,
    { me: $("box-me"), words: $("box-words"), illus: $("box-illus") },
    { reduced },
  );
  const player = createPlayer({
    poem,
    illustration,
    words,
    layout,
    hint: els.hint,
    stage,
    speed,
    loop,
  });

  // expose for tests + debugging
  window.MNM = {
    state: () => player.state(),
    next: () => player.advance(),
    goTo: (i) => player.goTo(i),
    still: (i, k) => player.still(i, k),
    poem,
  };

  async function goLive() {
    try {
      await startCamera(els.video);
      stage.setAttribute("data-camera", "1");
      // load hand tracking lazily; if it fails we still show the camera + auto-play
      const { loadHandLandmarker, trackHands } = await import("./hands.js");
      const landmarker = await loadHandLandmarker();
      trackHands(landmarker, els.video, (sig) => player.onSignature(sig));
      player.start("live");
      return true;
    } catch (err) {
      stopCamera(els.video);
      stage.removeAttribute("data-camera");
      return false;
    }
  }

  function goAuto() {
    player.start("auto");
  }

  async function begin() {
    els.intro.setAttribute("hidden", "");
    if (forcedMode === "auto") return goAuto();
    const live = await goLive();
    if (!live) goAuto();
  }

  if (forcedMode === "auto") {
    // deterministic path: no user gesture needed (no camera requested)
    begin();
  } else {
    els.start.addEventListener("click", begin, { once: true });
    els.intro.removeAttribute("hidden");
  }
}

boot().catch((e) => {
  const hint = $("hint");
  if (hint) hint.textContent = "could not load";
  console.error("[mother-not-metaphor] boot failed", e);
});

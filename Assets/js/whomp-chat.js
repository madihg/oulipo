/* ═══════════════════════════════════════════
   whomp-chat.js
   The home-page surprise — Whomp (a fine-tuned poetry model trained
   on Halim Madi's voice + 5 queer poets) answers a scam text before
   the visitor even lands. They can keep talking, or hit the camera
   icon and let Whomp pretend to "see" them.

   Architecture:
   - On home-overlay:loaded (or initial mount), hydrate the chat:
     pick a random scam-text from whomp-scams.json, show it as the
     user's first message bubble, then POST to Whomp's live /api/chat
     endpoint and stream the response into Whomp's bubble. On failure,
     fall back to the paired sample in whomp-samples.json.
   - Send input → POST to Whomp's API. Stream into a new bubble.
   - Camera action → getUserMedia, capture frame, show thumb, then a
     random response from whomp-vision.json (no live vision call yet).
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // Whomp's deployed endpoint (verified live with CORS enabled). Drop
  // a replacement URL here if Halim re-deploys.
  var WHOMP_URL = "https://scam-ai-poet.vercel.app/api/chat";

  // Caches for the sample pools.
  var scamPool = null;
  var samplePool = null;
  var visionPool = null;

  // Track hydrated surfaces so we don't double-mount on overlay re-open.
  var hydratedRoots = new WeakSet();

  // ── helpers ──────────────────────────────────────────────
  function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k.startsWith("aria-") || k.startsWith("data-")) {
          node.setAttribute(k, attrs[k]);
        } else node[k] = attrs[k];
      }
    }
    (kids || []).forEach(function (k) {
      if (k == null) return;
      if (typeof k === "string") node.appendChild(document.createTextNode(k));
      else node.appendChild(k);
    });
    return node;
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function loadJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }

  function ensurePools() {
    var jobs = [];
    if (!scamPool) {
      jobs.push(
        loadJSON("/Assets/data/whomp-scams.json").then(function (j) {
          scamPool = j.scams || j;
        }),
      );
    }
    if (!samplePool) {
      jobs.push(
        loadJSON("/Assets/data/whomp-samples.json").then(function (j) {
          samplePool = j.samples || j;
        }),
      );
    }
    if (!visionPool) {
      jobs.push(
        loadJSON("/Assets/data/whomp-vision.json").then(function (j) {
          visionPool = j.templates || j;
        }),
      );
    }
    return Promise.all(jobs);
  }

  // ── bubble rendering ────────────────────────────────────
  function addBubble(stream, role, content) {
    var bubble = el("div", { class: "whomp-bubble whomp-bubble--" + role }, [
      el("div", { class: "whomp-bubble__body" }, [content || ""]),
    ]);
    stream.appendChild(bubble);
    stream.scrollTop = stream.scrollHeight;
    return bubble.querySelector(".whomp-bubble__body");
  }

  function addThumbBubble(stream, dataUrl) {
    var img = el("img", { src: dataUrl, alt: "your photo" });
    var bubble = el("div", { class: "whomp-bubble whomp-bubble--you" }, [
      el("div", { class: "whomp-bubble__thumb" }, [img]),
    ]);
    stream.appendChild(bubble);
    stream.scrollTop = stream.scrollHeight;
  }

  // ── live chat call (streaming) with mock fallback ───────
  function streamWhomp(messages, target) {
    return fetch(WHOMP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
      mode: "cors",
    })
      .then(function (r) {
        if (!r.ok) throw new Error("api " + r.status);
        if (!r.body) throw new Error("no stream");
        var reader = r.body.getReader();
        var decoder = new TextDecoder();
        return reader.read().then(function pump(result) {
          if (result.done) return;
          target.textContent += decoder.decode(result.value, { stream: true });
          target.parentElement.parentElement.scrollTop =
            target.parentElement.parentElement.scrollHeight;
          return reader.read().then(pump);
        });
      })
      .catch(function (err) {
        // Live API failed — drop in a mock reply if we have one paired
        // with this exact scam text, otherwise pick a random one.
        console.warn("[whomp] live API failed, falling back:", err);
        var userLine = messages[messages.length - 1].content;
        var match =
          samplePool &&
          samplePool.find(function (s) {
            return s.scam === userLine;
          });
        var fallback =
          (match && match.whomp) ||
          (samplePool && rand(samplePool).whomp) ||
          "the model is asleep. wake me later.";
        target.textContent = fallback;
      });
  }

  // ── camera capture ──────────────────────────────────────
  function openCamera(stream) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addBubble(
        stream,
        "whomp",
        "Whomp can't see anything from here — your browser doesn't share cameras.",
      );
      return;
    }
    var captureBox = el("div", { class: "whomp-camera" }, [
      el("video", {
        class: "whomp-camera__preview",
        autoplay: true,
        playsInline: true,
        muted: true,
      }),
      el("div", { class: "whomp-camera__controls" }, [
        el("button", { type: "button", class: "whomp-camera__shoot" }, [
          "take photo",
        ]),
        el("button", { type: "button", class: "whomp-camera__cancel" }, [
          "cancel",
        ]),
      ]),
    ]);
    stream.appendChild(captureBox);
    var video = captureBox.querySelector("video");
    var shootBtn = captureBox.querySelector(".whomp-camera__shoot");
    var cancelBtn = captureBox.querySelector(".whomp-camera__cancel");

    var mediaStream = null;
    function teardown() {
      if (mediaStream) {
        mediaStream.getTracks().forEach(function (t) {
          t.stop();
        });
      }
      captureBox.remove();
    }
    cancelBtn.addEventListener("click", teardown);

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (s) {
        mediaStream = s;
        video.srcObject = s;
      })
      .catch(function () {
        captureBox.remove();
        addBubble(
          stream,
          "whomp",
          "Whomp closes its eye for now. (Camera permission was declined.)",
        );
      });

    shootBtn.addEventListener("click", function () {
      if (!mediaStream) return;
      var canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      canvas
        .getContext("2d")
        .drawImage(video, 0, 0, canvas.width, canvas.height);
      var dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      teardown();
      addThumbBubble(stream, dataUrl);
      // Whomp's "seeing-you" response (templated, not a live vision call).
      var line = visionPool ? rand(visionPool) : "i see you.";
      var typing = addBubble(stream, "whomp", "");
      // Reveal the line letter-by-letter for a small typing flourish.
      var i = 0;
      var iv = setInterval(function () {
        i += 3;
        typing.textContent = line.slice(0, i);
        typing.parentElement.parentElement.scrollTop =
          typing.parentElement.parentElement.scrollHeight;
        if (i >= line.length) clearInterval(iv);
      }, 24);
    });
  }

  // ── hydrate a chat surface in a given scope ─────────────
  function hydrate(scope) {
    scope = scope || document;
    var root = scope.querySelector("[data-whomp-chat]");
    if (!root) return;
    if (hydratedRoots.has(root)) return;
    hydratedRoots.add(root);

    var stream = root.querySelector("[data-whomp-stream]");
    var form = root.querySelector("[data-whomp-form]");
    var input = root.querySelector("[data-whomp-input]");
    var cameraBtn = root.querySelector("[data-whomp-camera]");

    ensurePools().then(function () {
      // Pre-generation surprise: pick a random scam, render it as the
      // first user bubble, fire the live POST, stream the reply.
      var scam = rand(scamPool);
      addBubble(stream, "you", scam);
      var whompBubble = addBubble(stream, "whomp", "");
      streamWhomp([{ role: "user", content: scam }], whompBubble);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = (input.value || "").trim();
      if (!text) return;
      addBubble(stream, "you", text);
      input.value = "";
      // Gather the conversation so far (user + whomp pairs).
      var msgs = [];
      stream.querySelectorAll(".whomp-bubble").forEach(function (b) {
        var role = b.classList.contains("whomp-bubble--you")
          ? "user"
          : "assistant";
        var body = b.querySelector(".whomp-bubble__body");
        var content = body ? body.textContent.trim() : "";
        if (content) msgs.push({ role: role, content: content });
      });
      // Drop the just-added empty assistant bubble from the payload.
      var whompBubble = addBubble(stream, "whomp", "");
      streamWhomp(msgs, whompBubble);
    });

    cameraBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openCamera(stream);
    });

    // Suggestion prompt chips — clicking a chip pre-fills the input
    // and submits via the form's existing handler. Chips hide after
    // first use (the conversation is now under way).
    var promptsBox = root.querySelector("[data-whomp-prompts]");
    if (promptsBox) {
      promptsBox.addEventListener("click", function (e) {
        var btn = e.target.closest(".whomp-prompt");
        if (!btn) return;
        e.preventDefault();
        var prompt = btn.getAttribute("data-prompt") || btn.textContent;
        input.value = prompt.trim();
        // Fire the form's submit handler so the message goes through
        // the same path as a normal typed submission.
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { cancelable: true }));
        }
        promptsBox.style.display = "none";
      });
    }
  }

  // ── boot ─────────────────────────────────────────────────
  function boot() {
    // Hydrate inline mount on initial load (e.g. / page).
    hydrate(document);
    // Also hydrate the overlay when chrome.js loads the partial.
    document.addEventListener("home-overlay:loaded", function (e) {
      var body = (e.detail && e.detail.body) || document;
      hydrate(body);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

/**
 * lib/decay.js - votivepatina
 *
 * Generational JPEG loss engine.
 *
 * Concept: the photographic Virgin Mary degrades the way an image degrades
 * when forwarded through WhatsApp again and again. Each prayer is one more
 * generation of lossy re-encoding. The compression artefacts are the patina.
 * This is not a blur. This is erosion by transmission.
 *
 * The process is entirely deterministic: given a step number and the pristine
 * source image, the result is always the same. A stored step reproduces exactly
 * on return. The ruin is stable; only the original is gone.
 *
 * Three pure functions hold the math:
 *   qualityForStep  - JPEG quality as a function of step
 *   passesForStep   - number of re-encode cycles as a function of step
 *
 * createDecayEngine wraps the canvas/OffscreenCanvas machinery for callers.
 *
 * DOM/canvas code is kept inside function bodies so that the pure functions
 * can be imported and unit-tested in Node without any browser globals.
 */

// ---------------------------------------------------------------------------
// Pure functions (unit-tested, no side effects, no globals)
// ---------------------------------------------------------------------------

/**
 * qualityForStep(step) -> number in [0.12, 0.95]
 *
 * Maps an integer step (0..N) to a JPEG quality value for re-encoding.
 *
 * The curve is a decaying exponential that passes through the two calibration
 * points mandated by the contract:
 *   step 0  -> ~0.92  (nearly pristine - the icon is still recognisable)
 *   step 5  -> ~0.15  (heavily artefacted - barely Mary, mostly mosaic)
 *
 * We solve for the exponential  q(s) = a * exp(b * s)  through those two
 * points, then clamp to [0.12, 0.95] so neither extreme is ever reached.
 *
 * Derivation:
 *   a = q(0) = 0.92
 *   b = ln(0.15 / 0.92) / 5 = ln(0.163...) / 5 ≈ -0.3627
 *
 * Values at each step (unclamped, then clamped):
 *   0: 0.920  -> 0.920
 *   1: 0.642  -> 0.642
 *   2: 0.448  -> 0.448
 *   3: 0.313  -> 0.313
 *   4: 0.218  -> 0.218
 *   5: 0.152  -> 0.152   (contract: ~0.15 ✓)
 *   6+: continues falling, clamped to 0.12 floor
 *
 * @param {number} step - integer >= 0
 * @returns {number} JPEG quality in [0.12, 0.95]
 */
export function qualityForStep(step) {
  // Calibration anchors from the design contract
  const q0 = 0.92; // step 0: nearly pristine
  const q5 = 0.15; // step 5: heavily artefacted

  // Exponential decay coefficient: b = ln(q5/q0) / 5
  const b = Math.log(q5 / q0) / 5;

  const raw = q0 * Math.exp(b * step);

  // Clamp to [0.12, 0.95] - never fully pristine, never fully destroyed
  return Math.min(0.95, Math.max(0.12, raw));
}

/**
 * passesForStep(step) -> integer >= 1
 *
 * Number of successive re-encode cycles to apply for a given step.
 *
 * At step 0 we do one pass (no degradation above the initial encode).
 * Each two steps adds another pass: 0-1 -> 1 pass, 2-3 -> 2 passes, etc.
 * This mirrors how WhatsApp compression stacks: a message forwarded twice
 * has been through the codec more times than one forwarded once.
 *
 * Contract formula: 1 + floor(step / 2)
 *
 *   0 -> 1   2 -> 2   4 -> 3
 *   1 -> 1   3 -> 2   5 -> 3
 *
 * @param {number} step - integer >= 0
 * @returns {number} integer >= 1
 */
export function passesForStep(step) {
  return 1 + Math.floor(step / 2);
}

// ---------------------------------------------------------------------------
// Engine factory (browser-only machinery inside the function body)
// ---------------------------------------------------------------------------

/**
 * createDecayEngine({ canvas, sourceImage, maxStep })
 *
 * Returns a decay engine bound to a visible <canvas> and a pristine <img>.
 *
 * The engine applies `step` successive JPEG re-encodes to the source image,
 * each generation feeding into the next. This is authentic "forwarded N times"
 * generational loss - not a filter, not a blur, but the actual artefact
 * accumulation of lossy compression applied repeatedly.
 *
 * For step >= 3 the engine additionally downscales then upscales the image
 * between encode passes to force chroma-subsampling blockiness: the 8x8 DCT
 * blocks become visible, halation pools in high-contrast edges, the halo
 * bleeds into Mary's robe.
 *
 * @param {object} options
 * @param {HTMLCanvasElement} options.canvas     - the visible canvas to draw into
 * @param {HTMLImageElement}  options.sourceImage - pristine source, must be loaded
 * @param {number}            [options.maxStep=5] - informational; engine accepts any step
 * @returns {object} engine
 */
export function createDecayEngine({ canvas, sourceImage, maxStep = 5 }) {
  // -------------------------------------------------------------------------
  // Feature detection
  // OffscreenCanvas allows encode/decode work off the main thread without
  // blocking scroll and input. We detect it once and carry the result.
  // -------------------------------------------------------------------------
  const hasOffscreenCanvas = typeof OffscreenCanvas !== "undefined";
  const hasCreateImageBitmap = typeof createImageBitmap !== "undefined";
  const hasRequestIdleCallback = typeof requestIdleCallback !== "undefined";

  // -------------------------------------------------------------------------
  // Internal state
  // -------------------------------------------------------------------------
  let currentStep = -1; // -1 = not yet rendered
  let renderInFlight = false; // guard against overlapping renders
  let pendingStep = null; // if a render is queued while one is in flight

  // We keep the previous frame as an ImageBitmap so we can cross-fade it
  // with the incoming frame during animated transitions.
  let previousBitmap = null;

  // -------------------------------------------------------------------------
  // Helper: ensure the source image is decoded before we touch its pixels
  // -------------------------------------------------------------------------
  async function ensureDecoded() {
    if (sourceImage.complete && sourceImage.naturalWidth > 0) {
      // Already loaded. Call decode() if available to ensure rasterisation.
      if (typeof sourceImage.decode === "function") {
        try {
          await sourceImage.decode();
        } catch (_) {
          /* ignore */
        }
      }
      return;
    }
    // Wait for load event
    await new Promise((resolve, reject) => {
      sourceImage.addEventListener("load", resolve, { once: true });
      sourceImage.addEventListener("error", reject, { once: true });
    });
    if (typeof sourceImage.decode === "function") {
      try {
        await sourceImage.decode();
      } catch (_) {
        /* ignore */
      }
    }
  }

  // -------------------------------------------------------------------------
  // Helper: create a working canvas (OffscreenCanvas when available, else <canvas>)
  // -------------------------------------------------------------------------
  function makeWorkCanvas(w, h) {
    if (hasOffscreenCanvas) {
      return new OffscreenCanvas(w, h);
    }
    // Detached <canvas> that never touches the DOM
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  // -------------------------------------------------------------------------
  // Helper: encode a canvas/OffscreenCanvas to a JPEG Blob at a given quality
  // -------------------------------------------------------------------------
  async function encodeToBlob(workCanvas, quality) {
    if (hasOffscreenCanvas && workCanvas instanceof OffscreenCanvas) {
      return workCanvas.convertToBlob({ type: "image/jpeg", quality });
    }
    // Fallback: HTMLCanvasElement.toBlob (callback-based)
    return new Promise((resolve, reject) => {
      workCanvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("toBlob returned null")),
        "image/jpeg",
        quality,
      );
    });
  }

  // -------------------------------------------------------------------------
  // Helper: decode a Blob back to an ImageBitmap (or HTMLImageElement bitmap)
  // -------------------------------------------------------------------------
  async function decodeBlob(blob) {
    if (hasCreateImageBitmap) {
      return createImageBitmap(blob);
    }
    // Fallback: create an <img>, load the object URL, capture its pixels
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("img decode failed"));
      };
      img.src = url;
    });
  }

  // -------------------------------------------------------------------------
  // Helper: draw a bitmap (ImageBitmap or HTMLImageElement) into a work canvas
  // -------------------------------------------------------------------------
  function drawBitmapInto(workCanvas, bitmap) {
    const ctx = workCanvas.getContext("2d");
    ctx.clearRect(0, 0, workCanvas.width, workCanvas.height);
    ctx.drawImage(bitmap, 0, 0, workCanvas.width, workCanvas.height);
  }

  // -------------------------------------------------------------------------
  // Core: perform `step` successive JPEG re-encodes on the pristine source.
  //
  // This is the beating heart of the piece. We never operate on what is
  // already on the visible canvas; we always re-derive from the original.
  // That determinism is what allows a stored step to reproduce on return.
  //
  // Quality ramp: we ramp the per-pass quality from near-pristine down to
  // qualityForStep(step). This means each generation degrades slightly less
  // than the target, but the cumulative drift after `step` generations ends
  // at exactly qualityForStep(step) for the final pass. The visible result
  // at step 5 is thus clearly worse than at step 4.
  //
  // Downscale / upscale: for step >= 3, we insert a 50% downscale then a 2x
  // upscale before the final encode pass. This forces the codec to re-derive
  // chroma from a lower-resolution source, producing visible 8x8 block
  // boundaries and colour halation. Mary's face becomes a mosaic of her own
  // compression history.
  // -------------------------------------------------------------------------
  async function deriveDecayedBitmap(step) {
    await ensureDecoded();

    const srcW = sourceImage.naturalWidth || sourceImage.width;
    const srcH = sourceImage.naturalHeight || sourceImage.height;

    const passes = passesForStep(step);
    const targetQ = qualityForStep(step);

    // Quality ramp: start slightly above target, arrive at target on the last pass.
    // For step 0 (1 pass), we simply apply qualityForStep(0) directly.
    function qualityForPass(passIndex) {
      if (passes === 1) return targetQ;
      // Linear ramp: pass 0 uses q_start, pass (passes-1) uses targetQ
      const q_start = Math.min(0.95, targetQ + 0.25);
      return q_start + (targetQ - q_start) * (passIndex / (passes - 1));
    }

    // Start from the pristine source
    let workCanvas = makeWorkCanvas(srcW, srcH);
    drawBitmapInto(workCanvas, sourceImage);

    for (let pass = 0; pass < passes; pass++) {
      const q = qualityForPass(pass);

      // For step >= 3, on the final pass: downscale then upscale to force
      // chroma-subsampling block artefacts. The 50% round-trip through the
      // codec at reduced resolution makes the 8x8 DCT grid visible.
      if (step >= 3 && pass === passes - 1) {
        const halfW = Math.max(1, Math.floor(srcW / 2));
        const halfH = Math.max(1, Math.floor(srcH / 2));

        // Step 1: encode at half size
        const halfCanvas = makeWorkCanvas(halfW, halfH);
        const halfCtx = halfCanvas.getContext("2d");
        halfCtx.drawImage(workCanvas, 0, 0, halfW, halfH);

        const halfBlob = await encodeToBlob(halfCanvas, q);
        const halfBitmap = await decodeBlob(halfBlob);

        // Step 2: scale back up to full size - the blockiness is now baked in
        workCanvas = makeWorkCanvas(srcW, srcH);
        const upCtx = workCanvas.getContext("2d");
        // Disable smoothing so blocks remain hard-edged
        upCtx.imageSmoothingEnabled = false;
        upCtx.drawImage(halfBitmap, 0, 0, srcW, srcH);

        // Clean up
        if (halfBitmap.close) halfBitmap.close();
      }

      // Encode this generation
      const blob = await encodeToBlob(workCanvas, q);
      const bitmap = await decodeBlob(blob);

      // Feed the output of this generation into the next
      workCanvas = makeWorkCanvas(srcW, srcH);
      drawBitmapInto(workCanvas, bitmap);

      // Release the intermediate bitmap to free GPU memory
      if (bitmap.close) bitmap.close();
    }

    // Final encode at the exact target quality, then decode to a bitmap
    // that can be drawn to the visible canvas.
    const finalBlob = await encodeToBlob(workCanvas, targetQ);
    return decodeBlob(finalBlob);
  }

  // -------------------------------------------------------------------------
  // Cross-fade: animate the transition from the previous frame to the new one.
  //
  // We blit the previous bitmap under a fading globalAlpha, then composite
  // the new bitmap with increasing alpha. This is a pure canvas operation -
  // no CSS transitions, no GSAP, no requestAnimationFrame polyfill hell.
  //
  // Duration matches --t-decay (400ms from the design token).
  // -------------------------------------------------------------------------
  function crossFade(newBitmap, duration = 400) {
    return new Promise((resolve) => {
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const captured = previousBitmap; // may be null on first render
      const start = performance.now();

      function frame(now) {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);

        ctx.clearRect(0, 0, w, h);

        // Draw the old frame fading out
        if (captured) {
          ctx.globalAlpha = 1 - t;
          ctx.drawImage(captured, 0, 0, w, h);
        }

        // Draw the new frame fading in
        ctx.globalAlpha = t;
        ctx.drawImage(newBitmap, 0, 0, w, h);

        ctx.globalAlpha = 1;

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  // -------------------------------------------------------------------------
  // Instant draw: no animation, just blit the new frame.
  // Used for animate:false (reduced-motion) paths.
  // -------------------------------------------------------------------------
  function instantDraw(newBitmap) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(newBitmap, 0, 0, canvas.width, canvas.height);
  }

  // -------------------------------------------------------------------------
  // Main entry point: renderStep
  //
  // If a render is already in flight, the incoming call is queued as the
  // next pending step. When the in-flight render finishes it will pick up
  // the pending step. This means rapid step changes never stack up more than
  // one render deep - we always converge on the most-recently-requested step.
  // -------------------------------------------------------------------------
  async function renderStep(step, { animate = true } = {}) {
    if (renderInFlight) {
      // Queue this step; discard any previously queued step (we only care
      // about the latest requested state, not every intermediate).
      pendingStep = { step, animate };
      return;
    }

    renderInFlight = true;

    try {
      // The heavy encode work happens here. We prefer to schedule it during
      // idle time so the main thread stays free for scroll and input, but
      // we await the result before drawing to the visible canvas.
      const newBitmap = await new Promise((resolve, reject) => {
        const doWork = () =>
          deriveDecayedBitmap(step).then(resolve).catch(reject);

        if (!animate && hasRequestIdleCallback) {
          // Non-animated path: yield to idle before starting heavy work
          requestIdleCallback(doWork, { timeout: 2000 });
        } else {
          // Animated path: start immediately so the cross-fade begins promptly
          doWork();
        }
      });

      // Size the visible canvas to match the source (in case it wasn't set)
      const srcW = sourceImage.naturalWidth || sourceImage.width;
      const srcH = sourceImage.naturalHeight || sourceImage.height;
      if (canvas.width !== srcW) canvas.width = srcW;
      if (canvas.height !== srcH) canvas.height = srcH;

      if (animate && previousBitmap !== null) {
        await crossFade(newBitmap);
      } else {
        instantDraw(newBitmap);
      }

      // Release the previous frame's GPU memory before replacing the reference
      if (previousBitmap && previousBitmap.close) previousBitmap.close();
      previousBitmap = newBitmap;

      currentStep = step;
    } finally {
      renderInFlight = false;

      // If a step was queued while we were rendering, apply it now
      if (pendingStep !== null) {
        const next = pendingStep;
        pendingStep = null;
        // Recurse (will not stack because renderInFlight is now false)
        renderStep(next.step, { animate: next.animate });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Public interface
  // -------------------------------------------------------------------------
  const engine = {
    /**
     * renderStep(step, { animate }) -> Promise<void>
     *
     * Apply generational JPEG loss for the given step to the visible canvas.
     * Always re-derives from the pristine sourceImage (deterministic).
     */
    renderStep,

    /**
     * getStep() -> number
     *
     * Returns the step number of the last completed render.
     * Returns -1 if no render has completed yet.
     */
    getStep() {
      return currentStep;
    },

    /**
     * engine.step (getter)
     *
     * Alias for getStep(), for convenient property access.
     */
    get step() {
      return currentStep;
    },
  };

  return engine;
}

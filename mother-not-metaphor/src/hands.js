/**
 * src/hands.js - MediaPipe Hand Landmarker wrapper (DOM + the one CDN dep).
 *
 * This is the ONLY off-origin dependency in the piece: the tasks-vision runtime
 * and the hand_landmarker model, both pinned. Everything is wrapped so any
 * failure (offline, blocked, no GPU) is thrown and the caller degrades to the
 * no-camera auto-play path. Detection runs entirely on-device.
 */

import { handSignature } from "./gestures.js";

const TASKS_VISION =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const WASM_ROOT = TASKS_VISION + "/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export async function loadHandLandmarker() {
  const vision = await import(TASKS_VISION);
  const { FilesetResolver, HandLandmarker } = vision;
  const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
    numHands: 1,
    runningMode: "VIDEO",
  });
}

/**
 * Run a per-frame detection loop, calling onSignature(signature, raw) each frame
 * (signature is null when no hand is present). Returns a stop() function.
 */
export function trackHands(landmarker, video, onSignature) {
  let stopped = false;
  let lastVideoTime = -1;
  const loop = () => {
    if (stopped) return;
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      try {
        const res = landmarker.detectForVideo(video, performance.now());
        if (res && res.landmarks && res.landmarks.length) {
          const handed =
            (res.handednesses && res.handednesses[0] && res.handednesses[0][0]
              ? res.handednesses[0][0].categoryName
              : "Right") || "Right";
          onSignature(handSignature(res.landmarks[0], handed), res);
        } else {
          onSignature(null, res);
        }
      } catch {
        // transient detection error; keep looping
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return () => {
    stopped = true;
  };
}

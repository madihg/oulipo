/**
 * src/camera.js - the performer's live video (DOM).
 *
 * Wraps getUserMedia. No audio, front camera. The stream is shown mirrored and
 * is never recorded or sent anywhere - it exists only to be looked at and, when
 * hand tracking is available, to read the performer's hand shape locally.
 */

export async function startCamera(videoEl) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("getUserMedia unavailable");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 640 },
    },
    audio: false,
  });
  videoEl.srcObject = stream;
  videoEl.muted = true;
  videoEl.setAttribute("playsinline", "");
  await videoEl.play();
  return stream;
}

export function stopCamera(videoEl) {
  const s = videoEl && videoEl.srcObject;
  if (s) {
    for (const t of s.getTracks()) t.stop();
    videoEl.srcObject = null;
  }
}

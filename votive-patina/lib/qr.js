// ─────────────────────────────────────────────────────────────────────────────
//  lib/qr.js  -  votivepatina-stage
//
//  QR rendering for the operator-facing surfaces (performer + admin), so the
//  audience can scan their way in. Those surfaces are already online (Supabase),
//  so we load a tiny QR encoder from esm.sh (the one allowed CDN) on demand and
//  return an SVG string. The audience never generates a QR - it scans one - so the
//  offline audience path stays dependency-free.
//
//  No bundler, no em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

let _qrPromise = null;

function loadQr() {
  if (!_qrPromise) {
    _qrPromise = import("https://esm.sh/qrcode-generator@1.4.4");
  }
  return _qrPromise;
}

/**
 * Build a scannable QR code for `text` as an inline SVG string.
 * @param {string} text  the URL to encode
 * @param {object} [opts]
 * @param {number} [opts.cellSize=5]
 * @param {number} [opts.margin=2]
 * @returns {Promise<string>} an <svg> tag
 */
export async function qrSvg(text, { cellSize = 5, margin = 2 } = {}) {
  const mod = await loadQr();
  const qrcode = mod.default || mod;
  // type 0 = auto-fit the smallest version that holds the data; M = ~15% recovery.
  const qr = qrcode(0, "M");
  qr.addData(String(text));
  qr.make();
  return qr.createSvgTag({ cellSize, margin, scalable: true });
}

/**
 * src/color.js - perceptual color interpolation (pure, DOM-free).
 *
 * The illustrations morph between saturated primaries (blue, red, amber, green,
 * black). Interpolating those in sRGB produces muddy grey mid-tones. We convert
 * to OKLab (Bjorn Ottosson's perceptual space), lerp there, and convert back, so
 * blue -> red passes through vivid purples/magentas instead of grey.
 */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

export function hexToRgb(hex) {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r, g, b) {
  const to = (v) =>
    Math.round(clamp01(v / 255) * 255)
      .toString(16)
      .padStart(2, "0");
  return "#" + to(r) + to(g) + to(b);
}

// sRGB channel (0-255) <-> linear (0-1)
const toLinear = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const toSrgb = (c) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return clamp01(v) * 255;
};

export function rgbToOklab(r, g, b) {
  const lr = toLinear(r),
    lg = toLinear(g),
    lb = toLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l),
    m_ = Math.cbrt(m),
    s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

export function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_,
    m = m_ * m_ * m_,
    s = s_ * s_ * s_;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [toSrgb(lr), toSrgb(lg), toSrgb(lb)];
}

/** Interpolate two hex colors through OKLab. Returns a #rrggbb string. */
export function lerpColor(hexA, hexB, t) {
  if (t <= 0) return normalizeHex(hexA);
  if (t >= 1) return normalizeHex(hexB);
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const [L1, a1, bb1] = rgbToOklab(r1, g1, b1);
  const [L2, a2, bb2] = rgbToOklab(r2, g2, b2);
  const [r, g, b] = oklabToRgb(
    lerp(L1, L2, t),
    lerp(a1, a2, t),
    lerp(bb1, bb2, t),
  );
  return rgbToHex(r, g, b);
}

/** Canonicalize a hex string to lowercase 6-digit #rrggbb. */
export function normalizeHex(hex) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r, g, b);
}

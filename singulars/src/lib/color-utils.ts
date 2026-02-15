/**
 * Color utility functions for WCAG AA contrast compliance.
 *
 * Performance colors from the database are vibrant brand colors that
 * may not meet WCAG AA 4.5:1 contrast ratio when used as small text
 * on white or near-white backgrounds. These helpers darken a color
 * until it meets the required ratio.
 */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) =>
        Math.max(0, Math.min(255, Math.round(c)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(...hexToRgb(hex1));
  const l2 = relativeLuminance(...hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Darken a hex color by a given factor (0–1).
 * factor=1 returns the same color; factor=0.5 halves each channel.
 */
function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

/**
 * Return a darkened variant of `color` that meets `minRatio` contrast
 * against `background`. If the color already passes, it is returned
 * unchanged. The hue is preserved — only brightness is reduced.
 */
export function ensureContrast(
  color: string,
  background: string = '#FFFFFF',
  minRatio: number = 4.5
): string {
  if (contrastRatio(color, background) >= minRatio) {
    return color;
  }
  // Binary search for the right darkening factor
  let lo = 0.3;
  let hi = 1.0;
  let best = color;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const candidate = darken(color, mid);
    const ratio = contrastRatio(candidate, background);
    if (ratio >= minRatio) {
      best = candidate;
      lo = mid; // try lighter (closer to original)
    } else {
      hi = mid; // need darker
    }
  }
  return best;
}

/**
 * Get an accessible text color derived from a performance color.
 * For normal-sized text (< 18pt / < 14pt bold) on white, WCAG AA
 * requires 4.5:1 contrast. This function darkens the color just
 * enough to meet that threshold.
 */
export function accessibleTextColor(
  performanceColor: string,
  background: string = '#FFFFFF'
): string {
  return ensureContrast(performanceColor, background, 4.5);
}

/**
 * Get an accessible color for UI components (icons, borders, dots).
 * WCAG AA requires 3:1 contrast for non-text UI components.
 */
export function accessibleUIColor(
  performanceColor: string,
  background: string = '#FFFFFF'
): string {
  return ensureContrast(performanceColor, background, 3.0);
}

/**
 * Status pill colors (ux-ui-pro-max: Exaggerated Minimalism).
 * Distinctive, accessible, on-brand with #171717 primary and minimal palette.
 */
export const STATUS_PILL_COLORS = {
  upcoming: {
    border: '#9ca3af',
    text: '#6b7280',
  },
  training: {
    border: '#059669',
    text: '#047857',
  },
  trained: {
    border: '#171717',
    text: '#171717',
  },
} as const;

export function getStatusPillStyle(
  status: 'upcoming' | 'training' | 'trained',
  performanceColor?: string
): { border: string; color: string } {
  const base = STATUS_PILL_COLORS[status];
  if (status === 'training' && performanceColor) {
    return {
      border: performanceColor,
      color: ensureContrast(performanceColor, '#FFFFFF', 4.5),
    };
  }
  return { border: base.border, color: base.text };
}

/**
 * Shared fingerprint utility for anonymous vote deduplication.
 * Stores fingerprint in both localStorage and cookie for persistence.
 * Uses @fingerprintjs/fingerprintjs when available, falls back to browser property hashing.
 */

const STORAGE_KEY = 'singulars_fp';
const COOKIE_MAX_AGE = 31536000; // 1 year in seconds

/**
 * Read fingerprint from cookie.
 */
function getCookieFingerprint(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === STORAGE_KEY && value) {
        return decodeURIComponent(value);
      }
    }
  } catch {
    // Cookie access failed
  }
  return null;
}

/**
 * Read fingerprint from localStorage.
 */
function getLocalStorageFingerprint(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage not available
  }
  return null;
}

/**
 * Save fingerprint to localStorage.
 */
function saveToLocalStorage(fp: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, fp);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Save fingerprint to cookie.
 */
function saveToCookie(fp: string): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(fp)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie errors
  }
}

/**
 * Save fingerprint to both localStorage and cookie.
 */
function persistFingerprint(fp: string): void {
  saveToLocalStorage(fp);
  saveToCookie(fp);
}

/**
 * Generate a fingerprint using @fingerprintjs/fingerprintjs.
 * Falls back to browser property hashing if the library fails.
 */
async function generateFingerprint(): Promise<string> {
  // Try FingerprintJS library first
  try {
    const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
    const fpAgent = await FingerprintJS.load();
    const result = await fpAgent.get();
    return result.visitorId;
  } catch {
    // FingerprintJS failed, use browser property fallback
  }

  // Fallback: hash browser properties
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const screen = typeof window !== 'undefined' ? window.screen : null;
  const raw = [
    nav?.userAgent || '',
    nav?.language || '',
    screen?.width || '',
    screen?.height || '',
    screen?.colorDepth || '',
    new Date().getTimezoneOffset().toString(),
    nav?.hardwareConcurrency?.toString() || '',
  ].join('|');

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return 'fp_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
}

/**
 * Get or create a browser fingerprint for anonymous vote deduplication.
 * Checks localStorage and cookie for existing fingerprint.
 * If found in one but not the other, syncs to both.
 * If not found, generates a new one and stores in both.
 */
export async function getFingerprint(): Promise<string> {
  // Check both storage locations
  const fromLocalStorage = getLocalStorageFingerprint();
  const fromCookie = getCookieFingerprint();

  // If we have a fingerprint from either source, use it and sync to both
  const existing = fromLocalStorage || fromCookie;
  if (existing) {
    // Ensure it's persisted in both locations
    persistFingerprint(existing);
    return existing;
  }

  // Generate a new fingerprint
  const newFp = await generateFingerprint();
  persistFingerprint(newFp);
  return newFp;
}

/**
 * Synchronous version of getFingerprint that only checks stored values.
 * Use this when you need a fingerprint synchronously and can accept
 * null if no fingerprint has been generated yet.
 */
export function getFingerprintSync(): string | null {
  const fromLocalStorage = getLocalStorageFingerprint();
  const fromCookie = getCookieFingerprint();
  const existing = fromLocalStorage || fromCookie;
  if (existing) {
    // Sync to both locations
    persistFingerprint(existing);
    return existing;
  }
  return null;
}

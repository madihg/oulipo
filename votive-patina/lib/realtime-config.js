// ─────────────────────────────────────────────────────────────────────────────
//  lib/realtime-config.js  -  votivepatina-stage
//
//  Supabase Realtime connection config for the live performance layer. This is
//  the ONE place the project URL + public key live.
//
//  IMPORTANT: the key below is the PUBLISHABLE (anon) key for the oulipo_main
//  project. It is designed to ship in client code - it only grants what Row Level
//  Security and the Realtime policies allow, and it can be rotated independently.
//  A service/secret key must NEVER appear in the shipped artwork.
//
//  The stage layer uses Realtime broadcast + presence on an ephemeral channel
//  (no table writes for the core flow), so the public key is sufficient.
// ─────────────────────────────────────────────────────────────────────────────

// oulipo_main project (ref smytgqkgomsfyurskpcl).
export const SUPABASE_URL = "https://smytgqkgomsfyurskpcl.supabase.co";

// Publishable anon key (public, RLS-gated). No service key, ever.
export const SUPABASE_KEY = "sb_publishable_m509hZmnUb8NZRG94irXqA_AViI-8qf";

// Channel namespace; the per-show session id is appended at join time, so each
// performance is isolated on its own channel: `${CHANNEL_PREFIX}:${sessionId}`.
export const CHANNEL_PREFIX = "votivepatina-stage";

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Check if Supabase is configured with required environment variables
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * Check if the service role key is configured (for admin operations)
 */
export function isServiceKeyConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceKey);
}

/**
 * Public client for browser-side operations (respects RLS).
 * Returns null if Supabase is not configured.
 */
let _supabase: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// Default export for convenience
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Server-side client with service role key (bypasses RLS).
 * Only use in API routes and server components.
 * Returns null if service key is not configured.
 */
let _serviceClient: SupabaseClient | null = null;
export function getServiceClient(): SupabaseClient | null {
  if (!isServiceKeyConfigured()) return null;
  if (!_serviceClient) {
    _serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _serviceClient;
}

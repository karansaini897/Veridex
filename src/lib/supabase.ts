import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve project configuration from Vite environment variables (with fallback for test/node environments)
const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  '';
const rawKey =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)) ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) ||
  '';

export const SUPABASE_URL = rawUrl.trim();
export const SUPABASE_PUBLISHABLE_KEY = rawKey.trim();

/**
 * Indicates whether Supabase has been supplied with valid environment credentials.
 */
export const isSupabaseConfigured: boolean = Boolean(
  SUPABASE_URL &&
    SUPABASE_PUBLISHABLE_KEY &&
    (SUPABASE_URL.startsWith('http://') || SUPABASE_URL.startsWith('https://'))
);

/**
 * Initialized Supabase client instance, or null if credentials are not yet configured.
 * This prevents runtime initialization errors when environment variables are pending.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Accessor function that returns the active Supabase client or throws a descriptive error.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase client has not been configured. Please specify VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your environment.'
    );
  }
  return supabase;
}

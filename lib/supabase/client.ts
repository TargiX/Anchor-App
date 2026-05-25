import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Browser Supabase client.
 *
 * The app must run with NO Supabase configured (pure local/offline mode), so
 * this is `null` until both env vars are present. Everything downstream checks
 * `isSupabaseConfigured` and falls back to local-only behaviour otherwise.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  url && anonKey && url.startsWith("https://")
)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

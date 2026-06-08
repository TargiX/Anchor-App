import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Browser Supabase client.
 *
 * Supabase is optional for local development, but production should provide it:
 * auth and cloud sync are what make Anchor a real journal instead of a
 * single-device demo. The legacy anon key name stays as a fallback while
 * Supabase transitions projects to publishable keys.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseUrl = url
export const supabasePublishableKey = publishableKey

export const isSupabaseConfigured = Boolean(
  url && publishableKey && url.startsWith("https://")
)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

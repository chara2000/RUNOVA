import { createClient } from '@supabase/supabase-js';

// ─── Validate env vars at startup ────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error(
      '[RUNOVA] ⚠️ Supabase environment variables missing.\n' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }
}

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseUrl?.startsWith('https://');

// ─── Supabase client ─────────────────────────────────────────────────────────
// Falls back to empty strings so createClient doesn't throw — the app will
// show a proper "not configured" state rather than crashing.
export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'x-application-name': 'runova-web',
      },
    },
  }
);

// ─── Typed helper: get current user safely ───────────────────────────────────
export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

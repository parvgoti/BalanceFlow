import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co'
) as string

// Supabase has renamed anon key to "publishable key" in newer projects
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  'placeholder'
) as string

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn(
    '⚠️  Missing VITE_SUPABASE_URL. Add it to your .env file.'
  )
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    '⚠️  Missing Supabase key. Set VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.'
  )
}

// Untyped client — avoids TypeScript 'never' inference on Supabase's strict
// schema generics. Explicit types are applied at the call site via type assertions.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Alias — same client, used for view queries
export const supabaseView = supabase

export default supabase

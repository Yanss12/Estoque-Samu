import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // App usa hash router e login por e-mail/senha (sem redirect OAuth):
      // não deixar o cliente tentar ler tokens do hash da URL.
      detectSessionInUrl: false,
    },
  }
)

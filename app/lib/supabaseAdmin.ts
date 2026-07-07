// SERVER-ONLY — never import this file from a 'use client' component.
// The service role key bypasses all RLS policies, so it must only run
// inside API routes / server code, never reach the browser bundle.
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
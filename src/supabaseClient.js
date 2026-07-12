import { createClient } from '@supabase/supabase-js'

/* =====================================================================
   Fill these in from your Supabase project:
   Settings -> API Keys -> Publishable key / Project URL.
   The publishable key is safe to expose in client code -- Row Level
   Security policies (see schema.sql) are what actually protect data.
   ===================================================================== */
const SUPABASE_URL = "https://rorexuzsqkxvfxipiych.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_URzxszI7aivcf1N5JUkeCg_QWorasw6";


export const CONFIGURED =
  !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-PUBLISHABLE')

export const supabase = CONFIGURED ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

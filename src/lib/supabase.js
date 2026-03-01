import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://eufwttfndthjrvxtturl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Znd0dGZuZHRoanJ2eHR0dXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Mzg4NjgsImV4cCI6MjA4NzIxNDg2OH0.-4soPgR28aL_EwjJXcrBzfLGF4MblxG2iDZC2LD6B0Y'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

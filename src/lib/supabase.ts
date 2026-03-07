import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
        params: {
            eventsPerSecond: -1, // desativa o cliente Realtime completamente
        },
    },
    db: {
        schema: 'public',
    },
    global: {
        headers: {
            'x-application-name': 'musilab',
        },
    },
})

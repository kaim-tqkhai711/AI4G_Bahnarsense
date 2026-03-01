import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// detectSessionInUrl: true so OAuth redirect (hash or query) is parsed and session is set
export const supabase = createClient<Database>(
    supabaseUrl || 'https://placeholder-project.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
        auth: {
            detectSessionInUrl: true,
            flowType: 'pkce',
        },
    }
);

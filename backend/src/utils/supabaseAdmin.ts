import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config/unifiedConfig';

/**
 * Supabase client with service role key. Use only on the backend;
 * it bypasses Row Level Security (RLS). Never expose the service role key to the frontend.
 */
export const supabase: SupabaseClient = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

/**
 * Supabase client wrapper.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_CONFIGURED } from './config.js';

let _supabase = null;

if (SUPABASE_CONFIGURED) {
  try {
    const { createClient } = await import(
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
    );
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    console.info('[supabase] client initialised');
  } catch (error) {
    console.warn('[supabase] failed to load client', error);
  }
}

export const supabase = _supabase;
export { SUPABASE_CONFIGURED };


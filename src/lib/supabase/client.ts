import { createBrowserClient } from '@supabase/ssr';

/**
 * FOR AUTH OPERATIONS ONLY. Never use for database queries.
 */
export const createBrowserSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return createBrowserClient(url, anonKey);
};

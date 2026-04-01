import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/env';

/**
 * Server-only client with service role key.
 * Use only for backend operations that must bypass RLS.
 */
export const createAdminClient = () =>
  createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: (url, options) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    },
  );

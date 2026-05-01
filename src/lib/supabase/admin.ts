import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { env, getServiceRoleKey } from '@/env';

/**
 * Server-only client with service role key.
 * Use only for backend operations that must bypass RLS.
 */
export const createAdminClient = () =>
  {
    const serviceRoleKey = getServiceRoleKey();

    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        fetch: (url, options) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    });
  };

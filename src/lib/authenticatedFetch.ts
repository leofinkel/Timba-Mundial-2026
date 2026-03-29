import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export const authenticatedFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options?.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  return fetch(url, {
    ...options,
    headers,
  });
};

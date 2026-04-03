import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { env } from '@/env';

export type UpdateSessionResult = {
  /** Next.js response including refreshed Supabase auth cookies when applicable. */
  response: NextResponse;
  user: User | null;
  /** From public.profiles when user is logged in; null if not signed in. */
  accountStatus: 'active' | 'banned' | null;
};

/**
 * Refreshes the Supabase auth session for middleware and returns a response with updated cookies.
 */
export const updateSession = async (request: NextRequest): Promise<UpdateSessionResult> => {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accountStatus: 'active' | 'banned' | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_status')
      .eq('id', user.id)
      .maybeSingle();
    const raw = (profile as { account_status?: string } | null)?.account_status;
    accountStatus = raw === 'banned' ? 'banned' : 'active';
  }

  return { response: supabaseResponse, user, accountStatus };
};

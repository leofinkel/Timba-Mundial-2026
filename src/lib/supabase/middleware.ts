import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { env } from '@/env';

export type UpdateSessionResult = {
  /** Next.js response including refreshed Supabase auth cookies when applicable. */
  response: NextResponse;
  user: User | null;
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

  return { response: supabaseResponse, user };
};

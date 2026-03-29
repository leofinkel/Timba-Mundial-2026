import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ['/dashboard', '/fixture', '/rankings', '/admin'] as const;

export const middleware = async (request: NextRequest) => {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
};

export const config = {
  matcher: ['/dashboard/:path*', '/fixture/:path*', '/rankings/:path*', '/admin/:path*'],
};

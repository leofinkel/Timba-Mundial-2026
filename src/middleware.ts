import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/profile'] as const;

const isPublicAuthPath = (pathname: string) =>
  pathname === '/login' ||
  pathname === '/register' ||
  pathname === '/cuenta-suspendida';

export const middleware = async (request: NextRequest) => {
  const { response, user, accountStatus } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (user && accountStatus === 'banned' && !isPublicAuthPath(pathname)) {
    return NextResponse.redirect(new URL('/cuenta-suspendida', request.url));
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
};

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

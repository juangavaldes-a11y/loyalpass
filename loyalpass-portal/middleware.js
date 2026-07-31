import { NextResponse } from 'next/server';
import { isRoleAllowed } from '@/lib/auth/roles';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

const PUBLIC_PATHS = ['/', '/login'];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.includes(pathname);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = await verifySessionToken(token);

  if (!session && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && pathname === '/login') {
    const target = session.role === 'platform_admin' ? '/admin' : '/client';
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (session && !isRoleAllowed(pathname, session.role)) {
    const fallback = session.role === 'platform_admin' ? '/admin' : '/client';
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/api/:path*'],
};

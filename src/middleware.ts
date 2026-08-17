import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Narrow subpath import - the jose barrel pulls JWE code that warns on Edge.
import { jwtVerify } from 'jose/jwt/verify';

const COOKIE_NAME = 'bsa_session';

/**
 * Edge middleware verifies the session signature rather than merely checking
 * that a cookie exists - a forged or expired cookie no longer reaches the page.
 * `jose` is used because the Edge runtime has no node crypto.
 */
const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
    ? process.env.JWT_SECRET
    : 'bsa-dev-only-secret-do-not-use-in-production',
);

async function readSession(request: NextRequest): Promise<{ role: string } | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey, { issuer: 'bsa' });
    return { role: typeof payload.role === 'string' ? payload.role : 'MEMBER' };
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('redirect', request.nextUrl.pathname);
  if (reason) url.searchParams.set('reason', reason);
  const response = NextResponse.redirect(url);
  // Drop the bad cookie so the user isn't stuck in a redirect loop.
  response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request);

  if (!session) {
    return redirectToLogin(request, request.cookies.has(COOKIE_NAME) ? 'expired' : undefined);
  }

  if (pathname.startsWith('/admin') && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard?denied=admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/community/:path*'],
};

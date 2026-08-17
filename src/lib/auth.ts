import bcrypt from 'bcryptjs';
// Imported via narrow subpaths: jose's barrel export drags its JWE encrypt and
// decrypt code in too, which uses CompressionStream and warns on the Edge
// runtime that middleware shares. We only ever sign and verify JWS.
import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import { cookies } from 'next/headers';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { env, COOKIE_NAME } from './env';

/**
 * Sessions are signed with `jose` rather than `jsonwebtoken` because the same
 * verification has to run inside middleware, which executes on the Edge runtime
 * where node's crypto-backed `jsonwebtoken` is unavailable.
 */

const SESSION_DAYS = 7;

// Resolved on first use so importing this module during `next build` does not
// require the production signing key to be present.
let cachedKey: Uint8Array | null = null;
function secret(): Uint8Array {
  if (!cachedKey) cachedKey = new TextEncoder().encode(env.jwtSecret);
  return cachedKey;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('bsa')
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: 'bsa' });
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
      return null;
    }
    return { userId: payload.userId, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Throws a typed error that route handlers translate into a 401. */
export async function requireSession(): Promise<TokenPayload> {
  const session = await getSession();
  if (!session) throw new AuthError('You need to be signed in to do that.', 401);
  return session;
}

export async function requireAdmin(): Promise<TokenPayload> {
  const session = await requireSession();
  if (session.role !== 'ADMIN') throw new AuthError('Admins only.', 403);
  return session;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function setSessionCookie(token: string) {
  const isHttps = env.appUrl.startsWith('https://');
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd && isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/* -------------------------------------------------------------------------- */
/* Password reset tokens                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Returns the raw token (emailed to the user, never stored) alongside the hash
 * that goes in the database. Storing only the hash means a database leak can't
 * be replayed to take over accounts.
 */
export function createResetToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time compare for anything secret-shaped. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** CTF flags are compared as sha256 of the trimmed, case-folded value. */
export function hashFlag(flag: string): string {
  return createHash('sha256').update(flag.trim().toLowerCase()).digest('hex');
}

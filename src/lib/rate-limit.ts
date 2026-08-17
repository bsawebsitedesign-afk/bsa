/**
 * Fixed-window rate limiter backed by an in-process Map.
 * Expands rate limiting across authentication, search, registration, payments,
 * form submissions, upload, and administrative endpoints.
 */

interface Window {
  count: number;
  resetAt: number;
}

const hits = new Map<string, Window>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, window] of hits) {
    if (window.resetAt <= now) hits.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = hits.get(key);

  if (!existing || existing.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

export function clientKey(req: Request, scope: string): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
  return `${scope}:${ip}`;
}

export const LIMITS = {
  auth: { limit: 8, windowMs: 10 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 4, windowMs: 60 * 60_000 },
  form: { limit: 6, windowMs: 10 * 60_000 },
  write: { limit: 40, windowMs: 5 * 60_000 },
  directorySearch: { limit: 60, windowMs: 60_000 },
  eventRegistration: { limit: 10, windowMs: 60_000 },
  payment: { limit: 10, windowMs: 60_000 },
  upload: { limit: 15, windowMs: 60_000 },
  adminApi: { limit: 120, windowMs: 60_000 },
} as const;

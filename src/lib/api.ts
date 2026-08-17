import { NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { AuthError } from './auth';
import { rateLimit, clientKey } from './rate-limit';
import { env } from './env';

/** Any expected, user-correctable failure. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function jsonOk<T extends Record<string, unknown>>(data: T = {} as T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function jsonError(message: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json({ ok: false, error: message, ...(fields ? { fields } : {}) }, { status });
}

/** Parses and validates a JSON body, throwing an ApiError the wrapper renders. */
export async function readBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError('Send a valid JSON body.', 400);
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(firstIssue(result.error), 422, fieldErrors(result.error));
  }
  return result.data;
}

function firstIssue(error: ZodError): string {
  return error.issues[0]?.message ?? 'Some of those details are not valid.';
}

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Throws a 429 when the caller has burned through their window. */
export function guard(req: Request, scope: string, config: { limit: number; windowMs: number }) {
  const result = rateLimit(clientKey(req, scope), config.limit, config.windowMs);
  if (!result.ok) {
    throw new ApiError(`Slow down - try again in ${result.retryAfterSeconds}s.`, 429);
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/**
 * Wraps a route handler so every thrown error becomes a clean JSON response and
 * nothing internal leaks to the client in production.
 */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return jsonError(err.message, err.status, err.fields);
      }
      if (err instanceof AuthError) {
        return jsonError(err.message, err.status);
      }
      if (err instanceof ZodError) {
        return jsonError(firstIssue(err), 422, fieldErrors(err));
      }

      // Prisma unique-constraint violations surface as friendly conflicts.
      const code = (err as { code?: string })?.code;
      if (code === 'P2002') {
        return jsonError('That already exists.', 409);
      }
      if (code === 'P2025') {
        return jsonError('We could not find that.', 404);
      }

      console.error('[api]', err);
      return jsonError(env.isDev && err instanceof Error ? err.message : 'Something broke on our end. Try again.', 500);
    }
  };
}

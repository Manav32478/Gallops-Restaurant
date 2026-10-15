import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
}

/** Wraps a route handler with consistent error handling + validation formatting. */
export function handler<T extends (...args: any[]) => Promise<Response>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(422, 'VALIDATION_ERROR', 'Some fields are invalid.', error.flatten());
      }
      if (error instanceof ApiError) {
        return fail(error.status, error.code, error.message, error.details);
      }
      console.error('[api]', error);
      const message =
        process.env.NODE_ENV === 'development' && error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';
      return fail(500, 'INTERNAL_ERROR', message);
    }
  }) as T;
}

export function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? undefined;
}

/**
 * CSRF defence for cookie-authenticated mutations:
 * requests must originate from the same site OR carry the custom header that
 * only same-origin fetch can set (a cross-site form post cannot set headers).
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin fetch from the app omits Origin on GET
  const host = req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function assertSameOrigin(req: Request, customHeader = 'x-gallops-client') {
  const hasCustomHeader = Boolean(req.headers.get(customHeader));
  if (!hasCustomHeader && !sameOrigin(req)) {
    throw new ApiError(403, 'CSRF_BLOCKED', 'Cross-origin request rejected.');
  }
}

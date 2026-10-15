import { createHash, timingSafeEqual } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'gallops_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export type SessionClaims = { uid: string; sid: string };

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 24) {
    throw new Error('AUTH_SECRET is missing or too short (min 24 chars).');
  }
  return new TextEncoder().encode(value);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function signSession(payload: SessionClaims, ttl = SESSION_TTL_SECONDS): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('gallops')
    .setAudience('gallops-staff')
    .setExpirationTime(`${ttl}s`)
    .sign(secret());
}

export async function verifySessionToken(jwt: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(jwt, secret(), {
      issuer: 'gallops',
      audience: 'gallops-staff',
    });
    if (typeof payload.uid !== 'string' || typeof payload.sid !== 'string') return null;
    return { uid: payload.uid, sid: payload.sid };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    // Secure by default in production. Set COOKIE_SECURE=false when serving the
    // app over plain HTTP (local sandbox / LAN demo) so the browser keeps the cookie.
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export function parseCookieHeader(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

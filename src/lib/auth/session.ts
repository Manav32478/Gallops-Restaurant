import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  hashToken,
  sessionCookieOptions,
  signSession,
  verifySessionToken,
} from '@/lib/auth/token';

export { SESSION_COOKIE, sessionCookieOptions, verifySessionToken, parseCookieHeader } from '@/lib/auth/token';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  memberships: {
    restaurantId: string;
    role: 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'KITCHEN' | 'PLATFORM_ADMIN';
    restaurant: { id: string; slug: string; name: string; logoUrl: string | null };
  }[];
};

export async function createSession(userId: string, meta?: { userAgent?: string; ip?: string }) {
  const sid = hashToken(`${userId}:${Date.now()}:${Math.random()}`);
  const jwt = await signSession({ uid: userId, sid }, SESSION_TTL_SECONDS);
  await prisma.session.create({
    data: {
      userId,
      hash: hashToken(sid),
      userAgent: meta?.userAgent?.slice(0, 300),
      ip: meta?.ip,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    },
  });
  return { token: jwt, maxAge: SESSION_TTL_SECONDS };
}

export async function destroySession() {
  const jar = await cookies();
  const jwt = jar.get(SESSION_COOKIE)?.value;
  if (jwt) {
    const claims = await verifySessionToken(jwt);
    if (claims) await prisma.session.deleteMany({ where: { hash: hashToken(claims.sid) } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const jwt = jar.get(SESSION_COOKIE)?.value;
  return getSessionUserFromToken(jwt);
}

/** Shared by Next.js server contexts and the Socket.IO handshake. */
export async function getSessionUserFromToken(jwt: string | undefined): Promise<SessionUser | null> {
  if (!jwt) return null;
  const claims = await verifySessionToken(jwt);
  if (!claims) return null;
  const row = await prisma.session.findUnique({ where: { hash: hashToken(claims.sid) } });
  if (!row || row.expiresAt < new Date()) return null;
  const user = await prisma.user.findUnique({
    where: { id: claims.uid },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      isPlatformAdmin: true,
      memberships: {
        where: { isActive: true },
        select: {
          restaurantId: true,
          role: true,
          restaurant: { select: { id: true, slug: true, name: true, logoUrl: true, isActive: true } },
        },
      },
    },
  });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isPlatformAdmin: user.isPlatformAdmin,
    memberships: user.memberships
      .filter((m) => m.restaurant.isActive)
      .map((m) => ({
        restaurantId: m.restaurantId,
        role: m.role,
        restaurant: {
          id: m.restaurant.id,
          slug: m.restaurant.slug,
          name: m.restaurant.name,
          logoUrl: m.restaurant.logoUrl,
        },
      })),
  };
}

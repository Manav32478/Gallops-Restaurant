import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, clientIp } from '@/lib/api';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, sessionCookieOptions } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = handler(async (req: Request) => {
  const ip = clientIp(req) ?? 'unknown';
  const limit = rateLimit(`login:${ip}`, 12, 5 * 60_000);
  if (!limit.allowed) {
    return fail(429, 'RATE_LIMITED', `Too many sign-in attempts. Try again in ${limit.retryAfter}s.`);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Enter your email and password.');
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { memberships: { where: { isActive: true }, include: { restaurant: true } } },
  });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    return fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  const session = await createSession(user.id, {
    userAgent: req.headers.get('user-agent') ?? undefined,
    ip,
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await auditLog({ userId: user.id, action: 'LOGIN', meta: { email: user.email }, ip });

  const response = NextResponse.json({
    ok: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
      memberships: user.memberships.map((m) => ({
        role: m.role,
        restaurant: { id: m.restaurant.id, slug: m.restaurant.slug, name: m.restaurant.name },
      })),
    },
  });
  response.cookies.set('gallops_session', session.token, sessionCookieOptions(session.maxAge));
  return response;
});

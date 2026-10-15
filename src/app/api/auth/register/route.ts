import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, clientIp } from '@/lib/api';
import { hashPassword } from '@/lib/auth/password';
import { createSession, sessionCookieOptions } from '@/lib/auth/session';
import { slugify, randomToken } from '@/lib/ids';
import { rateLimit } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit';

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  restaurantName: z.string().min(2).max(80),
  city: z.string().max(60).optional(),
});

export const POST = handler(async (req: Request) => {
  const ip = clientIp(req) ?? 'unknown';
  const limit = rateLimit(`register:${ip}`, 5, 60 * 60_000);
  if (!limit.allowed) return fail(429, 'RATE_LIMITED', 'Too many accounts created from this network. Try later.');

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the details you entered.');
  const { name, email, password, restaurantName, city } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return fail(409, 'EMAIL_TAKEN', 'An account with this email already exists.');

  let slug = slugify(restaurantName);
  const taken = await prisma.restaurant.findUnique({ where: { slug } });
  if (taken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const plan = await prisma.plan.findUnique({ where: { code: 'STARTER' } });

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: email.toLowerCase(), name, passwordHash: await hashPassword(password) },
    });
    const restaurant = await tx.restaurant.create({
      data: {
        slug,
        name: restaurantName,
        city: city ?? null,
        taxBp: 500,
        notificationSettings: { push: true, email: false, sms: false, whatsapp: false, soundAlerts: true },
        memberships: { create: { userId: user.id, role: 'OWNER' } },
        tables: {
          create: Array.from({ length: 6 }, (_, i) => ({
            code: `T${String(i + 1).padStart(2, '0')}`,
            seats: 4,
            qrToken: randomToken(12),
          })),
        },
      },
    });
    if (plan) {
      await tx.subscription.create({
        data: { restaurantId: restaurant.id, planId: plan.id, status: 'TRIALING' },
      });
    }
    return { user, restaurant };
  });

  await auditLog({ userId: result.user.id, restaurantId: result.restaurant.id, action: 'RESTAURANT_CREATED', meta: { slug } });

  const session = await createSession(result.user.id, { ip });
  const response = NextResponse.json({
    ok: true,
    data: { slug: result.restaurant.slug, name: result.restaurant.name },
  });
  response.cookies.set('gallops_session', session.token, sessionCookieOptions(session.maxAge));
  return response;
});

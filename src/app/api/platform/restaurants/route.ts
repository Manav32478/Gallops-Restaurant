import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requirePlatformAdmin } from '@/lib/tenant';
import { slugify, randomToken } from '@/lib/ids';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(2).max(90),
  city: z.string().max(60).optional().or(z.literal('')),
  slug: z.string().max(60).optional(),
  planCode: z.string().default('STARTER'),
  tables: z.number().int().min(0).max(50).default(6),
});

export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requirePlatformAdmin();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the restaurant details.');

  const plan = await prisma.plan.findUnique({ where: { code: parsed.data.planCode } });
  if (!plan) return fail(422, 'PLAN_INVALID', 'Choose a valid plan.');

  let slug = slugify(parsed.data.slug || parsed.data.name);
  if (await prisma.restaurant.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const restaurant = await prisma.restaurant.create({
    data: {
      slug,
      name: parsed.data.name,
      city: parsed.data.city || null,
      taxBp: 500,
      notificationSettings: { push: true, email: false, sms: false, whatsapp: false, soundAlerts: true },
      tables: {
        create: Array.from({ length: parsed.data.tables }, (_, i) => ({
          code: `T${String(i + 1).padStart(2, '0')}`,
          seats: 4,
          qrToken: randomToken(12),
        })),
      },
      subscriptions: { create: { planId: plan.id, status: 'TRIALING' } },
    },
  });

  await auditLog({ userId: admin.id, restaurantId: restaurant.id, action: 'PLATFORM_RESTAURANT_CREATED', meta: { slug } });
  return ok({ restaurant }, { status: 201 });
});

export const PATCH = handler(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requirePlatformAdmin();
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    isActive?: boolean;
    isPublished?: boolean;
    planCode?: string;
    status?: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  } | null;
  if (!body?.id) return fail(422, 'VALIDATION_ERROR', 'Missing restaurant.');

  const restaurant = await prisma.restaurant.findUnique({ where: { id: body.id } });
  if (!restaurant) return fail(404, 'NOT_FOUND', 'Restaurant not found.');

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.isPublished !== undefined ? { isPublished: body.isPublished } : {}),
    },
  });

  if (body.planCode) {
    const plan = await prisma.plan.findUnique({ where: { code: body.planCode } });
    if (!plan) return fail(422, 'PLAN_INVALID', 'Invalid plan.');
    const existing = await prisma.subscription.findFirst({ where: { restaurantId: restaurant.id } });
    const data = { planId: plan.id, ...(body.status ? { status: body.status } : {}) };
    if (existing) await prisma.subscription.update({ where: { id: existing.id }, data });
    else await prisma.subscription.create({ data: { ...data, restaurantId: restaurant.id } });
  }

  await auditLog({ userId: admin.id, restaurantId: restaurant.id, action: 'PLATFORM_RESTAURANT_UPDATED', meta: body });
  return ok({ updated: true });
});

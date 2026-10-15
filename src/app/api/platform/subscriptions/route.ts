import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requirePlatformAdmin } from '@/lib/tenant';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const planSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(2).max(40),
  description: z.string().max(200).optional().or(z.literal('')),
  priceRupees: z.number().min(0).max(1000000),
  maxTables: z.number().int().min(1).max(100000),
  maxStaff: z.number().int().min(1).max(10000),
  maxOrdersPerMonth: z.number().int().min(1).max(100000000),
  features: z.array(z.string().max(120)).max(20).default([]),
  isPublic: z.boolean().default(true),
});

export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requirePlatformAdmin();
  const body = await req.json().catch(() => null);
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the plan details.', parsed.error.flatten());
  const data = parsed.data;

  const plan = await prisma.plan.upsert({
    where: { code: data.code },
    create: {
      code: data.code,
      name: data.name,
      description: data.description || null,
      priceMinor: Math.round(data.priceRupees * 100),
      maxTables: data.maxTables,
      maxStaff: data.maxStaff,
      maxOrdersPerMonth: data.maxOrdersPerMonth,
      features: data.features,
      isPublic: data.isPublic,
    },
    update: {
      name: data.name,
      description: data.description || null,
      priceMinor: Math.round(data.priceRupees * 100),
      maxTables: data.maxTables,
      maxStaff: data.maxStaff,
      maxOrdersPerMonth: data.maxOrdersPerMonth,
      features: data.features,
      isPublic: data.isPublic,
    },
  });

  await auditLog({ userId: admin.id, action: 'PLAN_SAVED', entity: 'Plan', entityId: plan.id });
  return ok({ plan }, { status: 201 });
});

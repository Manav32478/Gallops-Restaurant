import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  role: z.enum(['MANAGER', 'RECEPTIONIST', 'KITCHEN']).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  assertSameOrigin(req);
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'staff.edit');
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Invalid change.');

  const membership = await prisma.membership.findFirst({
    where: { id, restaurantId: ctx.restaurant.id },
    include: { user: { select: { email: true } } },
  });
  if (!membership) return fail(404, 'NOT_FOUND', 'Team member not found.');
  if (membership.role === 'OWNER') return fail(403, 'FORBIDDEN', 'Owner access cannot be changed here.');

  const updated = await prisma.membership.update({
    where: { id: membership.id },
    data: { ...(parsed.data.role ? { role: parsed.data.role } : {}), ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}) },
  });

  if (parsed.data.isActive === false) {
    await prisma.session.deleteMany({ where: { userId: membership.userId } });
  }

  await auditLog({
    restaurantId: ctx.restaurant.id,
    userId: ctx.user.id,
    action: 'STAFF_UPDATED',
    entity: 'Membership',
    entityId: membership.id,
    meta: { email: membership.user.email, role: updated.role, isActive: updated.isActive },
  });
  return ok({ membership: updated });
});

export const DELETE = handler(async (req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  assertSameOrigin(req);
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'staff.edit');
  const membership = await prisma.membership.findFirst({ where: { id, restaurantId: ctx.restaurant.id } });
  if (!membership) return fail(404, 'NOT_FOUND', 'Team member not found.');
  if (membership.role === 'OWNER') return fail(403, 'FORBIDDEN', 'The owner cannot be removed.');
  await prisma.membership.delete({ where: { id: membership.id } });
  return ok({ removed: true });
});

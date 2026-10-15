import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { staffSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth/password';
import { auditLog } from '@/lib/audit';
import { ROLE_LABEL } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'staff.view');
  const members = await prisma.membership.findMany({
    where: { restaurantId: ctx.restaurant.id },
    include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true, isActive: true } } },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
  return ok({
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      roleLabel: ROLE_LABEL[m.role],
      isActive: m.isActive,
      user: m.user,
    })),
  });
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  assertSameOrigin(req);
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'staff.edit');
  const body = await req.json().catch(() => null);
  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the staff details.', parsed.error.flatten());

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const membership = await prisma.membership.findUnique({
      where: { userId_restaurantId: { userId: existing.id, restaurantId: ctx.restaurant.id } },
    });
    if (membership) return fail(409, 'ALREADY_MEMBER', 'That person already works at this restaurant.');
    await prisma.membership.create({
      data: { userId: existing.id, restaurantId: ctx.restaurant.id, role: parsed.data.role },
    });
  } else {
    await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash: await hashPassword(parsed.data.password),
        memberships: { create: { restaurantId: ctx.restaurant.id, role: parsed.data.role } },
      },
    });
  }

  await auditLog({
    restaurantId: ctx.restaurant.id,
    userId: ctx.user.id,
    action: 'STAFF_ADDED',
    entity: 'Membership',
    meta: { email, role: parsed.data.role },
  });
  return ok({ added: true }, { status: 201 });
});

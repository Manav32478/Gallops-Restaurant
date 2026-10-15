import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler, fail } from '@/lib/api';
import { requireAnyCapability, requireCapability } from '@/lib/tenant';
import { updateOrderStatus, serializeOrder, ORDER_INCLUDE } from '@/lib/orders';
import { updateOrderStatusSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'orders.view');
  const order = await prisma.order.findFirst({
    where: { id, restaurantId: ctx.restaurant.id },
    include: ORDER_INCLUDE,
  });
  if (!order) return fail(404, 'ORDER_NOT_FOUND', 'Order not found.');
  return NextResponse.json({ ok: true, data: { order: serializeOrder(order) } });
});

/** Progress or cancel an order. Transitions and role permissions are enforced server-side. */
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  const { slug, id } = await params;
  // Reception progresses the whole lifecycle (orders.update); kitchen staff only
  // move the preparation queue forward (kitchen.update). The transition map in
  // lib/orders.ts enforces which target status each role may actually set.
  const ctx = await requireAnyCapability(slug, ['orders.update', 'kitchen.update']);
  const body = await req.json().catch(() => null);
  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Invalid status change.');

  const order = await updateOrderStatus({
    restaurantId: ctx.restaurant.id,
    orderId: id,
    next: parsed.data.status,
    role: ctx.role,
    actorUserId: ctx.user.id,
    actorLabel: ctx.user.name,
    reason: parsed.data.reason ?? null,
    expectedStatus: parsed.data.expectedStatus ?? null,
  });
  return NextResponse.json({ ok: true, data: { order: serializeOrder(order) } });
});

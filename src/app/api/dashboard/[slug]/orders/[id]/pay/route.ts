import { NextResponse } from 'next/server';
import { ok, handler } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { markOrderPaid, serializeOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

/** Record a cash/counter payment. Permission-gated separately from status changes. */
export const POST = handler(async (_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'orders.payment');
  const order = await markOrderPaid({
    restaurantId: ctx.restaurant.id,
    orderId: id,
    role: ctx.role,
    actorUserId: ctx.user.id,
    provider: 'CASH_AT_COUNTER',
  });
  return ok({ order: serializeOrder(order) });
});

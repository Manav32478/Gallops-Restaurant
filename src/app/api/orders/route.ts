import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, clientIp, assertSameOrigin } from '@/lib/api';
import { placeOrder, serializeOrder } from '@/lib/orders';
import { placeOrderSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Place an order. No authentication required (guests do not have accounts),
 * but every price is recalculated server-side and creation is idempotent.
 */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const ip = clientIp(req) ?? 'unknown';
  const limit = rateLimit(`order:${ip}`, 20, 60_000);
  if (!limit.allowed) return fail(429, 'RATE_LIMITED', 'Too many orders from this network. Please wait a moment.');

  const body = await req.json().catch(() => null);
  const parsed = placeOrderSchema.safeParse(body);
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Please review your order.', parsed.error.flatten());
  }

  const { order, deduped } = await placeOrder(parsed.data, {
    ip,
    userAgent: req.headers.get('user-agent') ?? undefined,
  });
  return NextResponse.json({ ok: true, data: { order: serializeOrder(order as never), deduped } }, { status: deduped ? 200 : 201 });
});

/** Optional: estimate totals before checkout (server-side, authoritative). */
export const PUT = handler(async (req: Request) => {
  const body = await req.json().catch(() => null);
  const parsed = placeOrderSchema.omit({ idempotencyKey: true, table: true, guestName: true, guestPhone: true, notes: true }).safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Invalid cart.', parsed.error.flatten());
  return ok({ received: true, items: parsed.data.items.length });
});

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fail, handler, clientIp } from '@/lib/api';
import { serializeOrder, ORDER_INCLUDE } from '@/lib/orders';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Guest order tracking. The tracking token IS the credential: it is a random
 * 160-bit value, so this endpoint never exposes another guest's order.
 */
export const GET = handler(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params;
  const ip = clientIp(req) ?? 'unknown';
  const limit = rateLimit(`track:${ip}`, 120, 60_000);
  if (!limit.allowed) return fail(429, 'RATE_LIMITED', 'Too many requests.');

  if (!token || token.length > 120) return fail(404, 'ORDER_NOT_FOUND', 'Order not found.');

  const order = await prisma.order.findUnique({
    where: { trackingToken: token },
    include: { ...ORDER_INCLUDE, restaurant: { select: { name: true, slug: true, currency: true, logoUrl: true, phone: true } } },
  });
  if (!order) return fail(404, 'ORDER_NOT_FOUND', 'We could not find that order. Check the link from your confirmation.');

  return NextResponse.json({
    ok: true,
    data: {
      order: serializeOrder(order),
      restaurant: order.restaurant,
    },
  });
});

import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { markOrderPaid, serializeOrder } from '@/lib/orders';
import { emitOrderUpdated } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

const schema = z.object({
  orderToken: z.string().min(6).max(120),
  razorpayOrderId: z.string().min(4).max(120),
  razorpayPaymentId: z.string().min(4).max(120),
  razorpaySignature: z.string().min(8).max(400),
});

/** Verifies the Razorpay signature server-side before marking anything paid. */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Invalid payment payload.');

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return fail(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payments are not configured.');

  const expected = createHmac('sha256', secret)
    .update(`${parsed.data.razorpayOrderId}|${parsed.data.razorpayPaymentId}`)
    .digest('hex');
  const provided = Buffer.from(parsed.data.razorpaySignature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) {
    return fail(402, 'SIGNATURE_INVALID', 'Payment could not be verified.');
  }

  const order = await prisma.order.findUnique({ where: { trackingToken: parsed.data.orderToken } });
  if (!order) return fail(404, 'ORDER_NOT_FOUND', 'Order not found.');

  await prisma.payment.updateMany({
    where: { orderId: order.id, providerRef: parsed.data.razorpayOrderId },
    data: { status: 'PAID', providerRef: parsed.data.razorpayPaymentId, raw: parsed.data as never },
  });

  // Marking paid is a privileged action; here it is performed by the platform
  // after cryptographic verification, not by the browser.
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: 'PAID', paymentMethod: 'RAZORPAY' },
    include: { items: { include: { modifiers: true } }, table: true, events: true },
  });
  emitOrderUpdated(updated.restaurantId, updated.trackingToken, serializeOrder(updated as never));

  return ok({ paid: true });
});

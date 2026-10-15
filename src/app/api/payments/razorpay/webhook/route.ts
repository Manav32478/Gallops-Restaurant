import { prisma } from '@/lib/prisma';
import { fail, handler } from '@/lib/api';
import { NextResponse } from 'next/server';
import { serializeOrder } from '@/lib/orders';
import { emitOrderUpdated } from '@/lib/realtime';
import { razorpayConfig, verifyWebhookSignature } from '@/lib/payments/razorpay';

export const dynamic = 'force-dynamic';

/** Razorpay webhook — the authoritative source for payment state. */
export const POST = handler(async (req: Request) => {
  const secret = razorpayConfig().webhookSecret;
  if (!secret) return fail(503, 'NOT_CONFIGURED', 'Webhook not configured.');

  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, signature, secret)) {
    return fail(401, 'SIGNATURE_INVALID', 'Invalid signature.');
  }

  const event = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: Record<string, any> } } };
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const entity = event.payload?.payment?.entity ?? {};
    const orderId = entity?.notes?.orderId as string | undefined;
    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order && order.paymentStatus !== 'PAID') {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'PAID', paymentMethod: 'RAZORPAY' },
        });
        await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: 'RAZORPAY',
            providerRef: String(entity.id ?? 'webhook'),
            amountMinor: Number(entity.amount ?? order.totalMinor),
            status: 'PAID',
            raw: entity as never,
          },
        });
        const updated = await prisma.order.findUniqueOrThrow({
          where: { id: order.id },
          include: { items: { include: { modifiers: true } }, table: true, events: true },
        });
        emitOrderUpdated(updated.restaurantId, updated.trackingToken, serializeOrder(updated as never));
      }
    }
  }
  return NextResponse.json({ ok: true });
});

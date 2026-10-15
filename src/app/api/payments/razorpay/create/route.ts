import { randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { razorpayConfig } from '@/lib/payments/razorpay';

export const dynamic = 'force-dynamic';

const schema = z.object({ orderToken: z.string().min(6).max(120) });

/**
 * Creates a Razorpay order for an existing order.
 *
 * Honest behaviour: with RAZORPAY_ENABLED=false this returns devMode=true and
 * the checkout falls back to "pay at counter". Payments are NEVER marked paid
 * here — only verify/ or the webhook can do that, after signature checks.
 */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Invalid order.');

  const { enabled, keyId, keySecret } = razorpayConfig();
  if (!enabled || !keyId || !keySecret) {
    return ok({
      devMode: true,
      message:
        'Online payments are not configured. Set RAZORPAY_ENABLED=true with your key id, secret and webhook secret to enable UPI/card payments.',
    });
  }

  const order = await prisma.order.findUnique({ where: { trackingToken: parsed.data.orderToken } });
  if (!order) return fail(404, 'ORDER_NOT_FOUND', 'Order not found.');
  if (order.paymentStatus === 'PAID') return fail(409, 'ALREADY_PAID', 'This order is already paid.');

  const receipt = `rcpt_${order.code}_${randomBytes(3).toString('hex')}`.slice(0, 40);
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      amount: order.totalMinor,
      currency: order.currency,
      receipt,
      notes: { orderId: order.id, code: order.code },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[razorpay] order create failed', text);
    return fail(502, 'PAYMENT_PROVIDER_ERROR', 'Could not start the payment. Please pay at the counter.');
  }
  const razorpayOrder = (await response.json()) as { id: string; amount: number; currency: string };

  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: 'RAZORPAY',
      providerRef: razorpayOrder.id,
      amountMinor: razorpayOrder.amount,
      status: 'PENDING',
      raw: razorpayOrder as never,
    },
  });

  return ok({ devMode: false, keyId, razorpayOrder, amount: order.totalMinor, currency: order.currency });
});

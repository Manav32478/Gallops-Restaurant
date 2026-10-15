import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { pushSubscriptionSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** Exposes whether Web Push is configured, so the UI can be honest about it. */
export const GET = handler(async () => {
  const enabled = process.env.WEB_PUSH_ENABLED === 'true' && Boolean(process.env.VAPID_PUBLIC_KEY);
  return ok({ enabled, publicKey: enabled ? process.env.VAPID_PUBLIC_KEY : null });
});

/** Stores a Web Push subscription for a guest tracking session. */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const body = await req.json().catch(() => null);
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Invalid subscription.');

  const restaurant = await prisma.restaurant.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (!restaurant) return fail(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found.');

  let orderId: string | null = null;
  if (parsed.data.orderToken) {
    const order = await prisma.order.findUnique({
      where: { trackingToken: parsed.data.orderToken },
      select: { id: true, restaurantId: true },
    });
    if (order && order.restaurantId === restaurant.id) orderId = order.id;
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.subscription.endpoint },
    create: {
      restaurantId: restaurant.id,
      orderId,
      endpoint: parsed.data.subscription.endpoint,
      p256dh: parsed.data.subscription.keys.p256dh,
      auth: parsed.data.subscription.keys.auth,
    },
    update: { orderId, lastUsedAt: new Date() },
  });

  return ok({ subscribed: true });
});

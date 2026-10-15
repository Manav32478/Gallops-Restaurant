import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { dispatchNotification } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'notifications.send');
  const logs = await prisma.notificationLog.findMany({
    where: { restaurantId: ctx.restaurant.id },
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: { order: { select: { code: true } } },
  });
  return ok({ logs });
});

/** Re-send (or manually trigger) the "order is ready" notification. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  assertSameOrigin(req);
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'notifications.send');
  const body = (await req.json().catch(() => null)) as { orderId?: string } | null;
  if (!body?.orderId) return fail(422, 'VALIDATION_ERROR', 'Select an order.');

  const order = await prisma.order.findFirst({ where: { id: body.orderId, restaurantId: ctx.restaurant.id } });
  if (!order) return fail(404, 'NOT_FOUND', 'Order not found.');

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: ctx.restaurant.id },
    select: { name: true, notificationSettings: true },
  });
  const restaurantSettings = (restaurant?.notificationSettings ?? {}) as Record<string, boolean>;
  const channels: ('PUSH' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP')[] = ['IN_APP', 'PUSH'];
  if (restaurantSettings.email) channels.push('EMAIL');
  if (restaurantSettings.sms) channels.push('SMS');
  if (restaurantSettings.whatsapp) channels.push('WHATSAPP');

  const results = await dispatchNotification({
    restaurantId: ctx.restaurant.id,
    orderId: order.id,
    event: 'ORDER_READY',
    title: 'Your order is ready!',
    body: `Your ${restaurant?.name ?? 'restaurant'} order is ready! Please collect it from the counter. Order #${order.code}.`,
    channels,
  });
  return ok({ results });
});

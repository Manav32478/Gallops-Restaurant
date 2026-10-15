import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeOrder, ORDER_INCLUDE } from '@/lib/orders';
import { OrderTracker } from '@/components/menu/OrderTracker';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { token } = await params;
  const order = await prisma.order.findUnique({ where: { trackingToken: token }, select: { code: true } });
  return { title: order ? `Order #${order.code}` : 'Order', robots: { index: false, follow: false } };
}

export default async function OrderTrackingPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;

  // The tracking token is the credential. It must belong to this restaurant.
  const order = await prisma.order.findUnique({
    where: { trackingToken: token },
    include: { ...ORDER_INCLUDE, restaurant: { select: { id: true, slug: true, name: true, logoUrl: true, phone: true, currency: true } } },
  });
  if (!order || order.restaurant.slug !== slug) notFound();

  return (
    <OrderTracker
      initialOrder={serializeOrder(order)}
      restaurant={{
        name: order.restaurant.name,
        slug: order.restaurant.slug,
        logoUrl: order.restaurant.logoUrl,
        phone: order.restaurant.phone,
        currency: order.restaurant.currency,
      }}
    />
  );
}

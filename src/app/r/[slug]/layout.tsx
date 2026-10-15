import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CartProvider } from '@/components/menu/CartProvider';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug },
    select: { name: true, tagline: true },
  });
  return {
    title: restaurant ? `${restaurant.name} — Order from your table` : 'Menu',
    description: restaurant?.tagline ?? 'Scan, browse and order from your table.',
  };
}

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug, isPublished: true, isActive: true },
    select: { id: true, slug: true, name: true, currency: true },
  });
  if (!restaurant) notFound();

  return (
    <CartProvider slug={restaurant.slug} currency={restaurant.currency}>
      <div className="min-h-screen bg-ink-950">{children}</div>
    </CartProvider>
  );
}

import { NextResponse } from 'next/server';
import { handler, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ slug: string; itemId: string }> }) => {
  const { slug, itemId } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug, isPublished: true, isActive: true },
    select: { id: true, currency: true, taxBp: true, serviceChargeBp: true, taxInclusive: true },
  });
  if (!restaurant) return fail(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found.');

  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId: restaurant.id, isPublished: true },
    include: {
      category: { select: { id: true, name: true, parentId: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      variantGroups: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { options: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } } },
      },
    },
  });
  if (!item) return fail(404, 'ITEM_NOT_FOUND', 'This dish is not available.');

  const related = await prisma.menuItem.findMany({
    where: {
      restaurantId: restaurant.id,
      isPublished: true,
      isAvailable: true,
      id: { not: item.id },
      OR: [{ categoryId: item.categoryId }, { isFeatured: true }],
    },
    take: 6,
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    select: { id: true, name: true, priceMinor: true, imageUrl: true, servingSize: true, isFeatured: true },
  });

  return NextResponse.json({ ok: true, data: { item, related, restaurant } });
});

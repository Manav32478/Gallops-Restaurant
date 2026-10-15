import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ItemDetailClient } from '@/components/menu/ItemDetailClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string; itemId: string }> }) {
  const { itemId } = await params;
  const item = await prisma.menuItem.findUnique({ where: { id: itemId }, select: { name: true, description: true } });
  return { title: item?.name ?? 'Dish', description: item?.description ?? undefined };
}

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; itemId: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { slug, itemId } = await params;
  const { table } = await searchParams;

  const restaurant = await prisma.restaurant.findFirst({
    where: { slug, isPublished: true, isActive: true },
    select: { id: true, currency: true },
  });
  if (!restaurant) notFound();

  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId: restaurant.id, isPublished: true },
    include: {
      category: { select: { name: true } },
      variantGroups: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { options: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } } },
      },
    },
  });
  if (!item) notFound();

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
    select: { id: true, name: true, priceMinor: true, imageUrl: true },
  });

  return (
    <ItemDetailClient
      slug={slug}
      currency={restaurant.currency}
      tableToken={table}
      item={{
        id: item.id,
        name: item.name,
        description: item.description,
        servingSize: item.servingSize,
        imageUrl: item.imageUrl,
        imageIsPlaceholder: item.imageIsPlaceholder,
        priceMinor: item.priceMinor,
        isVeg: item.isVeg,
        isVegan: item.isVegan,
        isJain: item.isJain,
        spiceLevel: item.spiceLevel,
        isAvailable: item.isAvailable,
        categoryName: item.category.name,
        verificationStatus: item.verificationStatus,
        sourceName: item.sourceName,
        groups: item.variantGroups.map((group) => ({
          id: group.id,
          name: group.name,
          kind: group.kind as 'VARIANT' | 'ADDON',
          type: group.type as 'SINGLE' | 'MULTI',
          required: group.required,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          options: group.options.map((option) => ({
            id: option.id,
            name: option.name,
            priceDeltaMinor: option.priceDeltaMinor,
            isDefault: option.isDefault,
          })),
        })),
        related,
      }}
    />
  );
}

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { loadMenu } from '@/lib/menu-cache';
import { MenuClient } from '@/components/menu/MenuClient';

export const dynamic = 'force-dynamic';

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { slug } = await params;
  const { table: tableToken } = await searchParams;

  const data = await loadMenu(slug);
  if (!data) notFound();

  let table: { code: string; label: string | null } | null = null;
  let tableError: string | null = null;
  if (tableToken) {
    const found = await prisma.restaurantTable.findFirst({
      where: { restaurantId: data.restaurant.id, qrToken: tableToken },
      select: { code: true, label: true, status: true },
    });
    if (!found) tableError = 'INVALID_TABLE';
    else if (found.status !== 'ACTIVE') tableError = 'TABLE_DISABLED';
    else table = { code: found.code, label: found.label };
  }

  const categories = data.categories.map((category) => ({
    id: category.id,
    name: category.name,
    items: category.items.map(mapItem),
    sections: category.sections.map((section) => ({
      id: section.id,
      name: section.name,
      items: section.items.map(mapItem),
    })),
  }));

  return (
    <MenuClient
      restaurant={{
        slug: data.restaurant.slug,
        name: data.restaurant.name,
        tagline: data.restaurant.tagline,
        about: data.restaurant.about,
        logoUrl: data.restaurant.logoUrl,
        heroImageUrl: data.restaurant.heroImageUrl,
        addressLine: data.restaurant.addressLine,
        city: data.restaurant.city,
        phone: data.restaurant.phone,
        currency: data.restaurant.currency,
        operatingHours: data.restaurant.operatingHours,
        acceptingOrders: data.restaurant.acceptingOrders,
        languages: data.restaurant.languages,
      }}
      categories={categories}
      table={table}
      tableError={tableError}
    />
  );
}

function mapItem(item: {
  id: string;
  name: string;
  description: string | null;
  servingSize: string | null;
  imageUrl: string | null;
  imageIsPlaceholder: boolean;
  priceMinor: number;
  isVeg: boolean | null;
  isVegan: boolean | null;
  isJain: boolean | null;
  spiceLevel: number | null;
  isAvailable: boolean;
  isFeatured: boolean;
  variantGroups: {
    id: string;
    name: string;
    kind: string;
    type: string;
    required: boolean;
    minSelect: number;
    maxSelect: number;
    options: { id: string; name: string; priceDeltaMinor: number; isDefault: boolean }[];
  }[];
}) {
  return {
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
    isFeatured: item.isFeatured,
    variantGroups: item.variantGroups.map((group) => ({
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
  };
}

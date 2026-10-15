import { prisma } from '@/lib/prisma';

type Cached<T> = { value: T; expiresAt: number };
const cache = new Map<string, Cached<unknown>>();
const TTL_MS = 30_000;

/**
 * Short-TTL cache for public menu reads.
 *
 * Writes that change the menu call invalidateMenu() so the guest menu updates
 * immediately — the TTL is only a safety net (and protects the database when a
 * full dining room is browsing at once).
 */
export async function getPublicMenu(slug: string) {
  const key = `menu:${slug}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as Awaited<ReturnType<typeof loadMenu>>;

  const value = await loadMenu(slug);
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

export function invalidateMenu(slug?: string) {
  if (slug) cache.delete(`menu:${slug}`);
  else cache.clear();
}

export async function loadMenu(slug: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug, isPublished: true, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      about: true,
      logoUrl: true,
      coverUrl: true,
      heroImageUrl: true,
      addressLine: true,
      city: true,
      state: true,
      postalCode: true,
      phone: true,
      email: true,
      website: true,
      instagram: true,
      currency: true,
      currencySymbol: true,
      taxBp: true,
      serviceChargeBp: true,
      taxInclusive: true,
      acceptingOrders: true,
      minOrderMinor: true,
      paymentMethods: true,
      languages: true,
      operatingHours: true,
      defaultPrepMinutes: true,
    },
  });
  if (!restaurant) return null;

  const categories = await prisma.menuCategory.findMany({
    where: {
      restaurantId: restaurant.id,
      parentId: null,
      isActive: true,
      OR: [{ items: { some: { isPublished: true } } }, { sections: { some: { items: { some: { isPublished: true } } } } }],
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            where: { isPublished: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              variantGroups: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
                include: { options: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } } },
              },
            },
          },
        },
      },
      items: {
        where: { isPublished: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          variantGroups: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: { options: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } } },
          },
        },
      },
    },
  });

  return { restaurant, categories };
}

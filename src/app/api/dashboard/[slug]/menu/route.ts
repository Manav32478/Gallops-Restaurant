import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { menuItemSchema } from '@/lib/validation';
import { slugify } from '@/lib/ids';
import { invalidateMenu } from '@/lib/menu-cache';
import { auditLog } from '@/lib/audit';
import { rupeesToPaise } from '@/lib/money';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'menu.view');
  const url = new URL(req.url);
  const categoryId = url.searchParams.get('categoryId');
  const search = url.searchParams.get('q')?.trim();
  const status = url.searchParams.get('status'); // needs_review | all | sold_out

  const items = await prisma.menuItem.findMany({
    where: {
      restaurantId: ctx.restaurant.id,
      ...(categoryId ? { categoryId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(status === 'needs_review' ? { verificationStatus: 'NEEDS_REVIEW' } : {}),
      ...(status === 'sold_out' ? { isAvailable: false } : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      variantGroups: { include: { options: true }, orderBy: { sortOrder: 'asc' } },
    },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    take: 500,
  });

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: ctx.restaurant.id },
    orderBy: [{ sortOrder: 'asc' }],
    include: { _count: { select: { items: true, sections: true } } },
  });

  return ok({ items, categories });
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  assertSameOrigin(req);
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'menu.edit');
  const body = await req.json().catch(() => null);
  const parsed = menuItemSchema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the item details.', parsed.error.flatten());

  const data = parsed.data;
  const category = await prisma.menuCategory.findFirst({
    where: { id: data.categoryId, restaurantId: ctx.restaurant.id },
  });
  if (!category) return fail(422, 'CATEGORY_INVALID', 'Choose a valid category.');

  let itemSlug = slugify(data.name);
  const clash = await prisma.menuItem.findUnique({
    where: { restaurantId_slug: { restaurantId: ctx.restaurant.id, slug: itemSlug } },
  });
  if (clash) itemSlug = `${itemSlug}-${Date.now().toString(36).slice(-4)}`;

  const item = await prisma.menuItem.create({
    data: {
      restaurantId: ctx.restaurant.id,
      categoryId: category.id,
      name: data.name,
      slug: itemSlug,
      description: data.description ?? null,
      servingSize: data.servingSize ?? null,
      imageUrl: data.imageUrl ?? null,
      imageIsPlaceholder: !data.imageUrl || data.imageUrl.startsWith('/api/placeholder') || data.imageUrl.startsWith('/uploads'),
      priceMinor: rupeesToPaise(data.priceRupees),
      isVeg: data.isVeg ?? null,
      isVegan: data.isVegan ?? null,
      isJain: data.isJain ?? null,
      spiceLevel: data.spiceLevel ?? null,
      allergens: data.allergens ?? [],
      isAvailable: data.isAvailable ?? true,
      isPublished: data.isPublished ?? true,
      isFeatured: data.isFeatured ?? false,
      sortOrder: data.sortOrder ?? 999,
      prepMinutes: data.prepMinutes ?? null,
      verificationStatus: 'OWNER_EDITED',
      verificationNote: 'Created by the restaurant team.',
      variantGroups: data.groups
        ? {
            create: data.groups.map((group, index) => ({
              name: group.name,
              kind: group.kind,
              type: group.type,
              required: group.required,
              minSelect: group.minSelect,
              maxSelect: group.maxSelect,
              sortOrder: group.sortOrder ?? index,
              options: {
                create: group.options.map((option, optionIndex) => ({
                  name: option.name,
                  priceDeltaMinor: rupeesToPaise(option.priceRupees),
                  isDefault: option.isDefault,
                  isAvailable: option.isAvailable,
                  sortOrder: option.sortOrder ?? optionIndex,
                })),
              },
            })),
          }
        : undefined,
    },
    include: { variantGroups: { include: { options: true } }, category: true },
  });

  invalidateMenu(slug);
  await auditLog({
    restaurantId: ctx.restaurant.id,
    userId: ctx.user.id,
    action: 'MENU_ITEM_CREATED',
    entity: 'MenuItem',
    entityId: item.id,
    meta: { name: item.name, priceMinor: item.priceMinor },
  });
  return ok({ item }, { status: 201 });
});

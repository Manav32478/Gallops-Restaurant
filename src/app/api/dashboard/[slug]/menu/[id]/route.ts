import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { menuItemSchema } from '@/lib/validation';
import { invalidateMenu } from '@/lib/menu-cache';
import { auditLog } from '@/lib/audit';
import { rupeesToPaise } from '@/lib/money';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  assertSameOrigin(req);
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'menu.edit');
  const body = await req.json().catch(() => null);
  const parsed = menuItemSchema.partial().safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the item details.', parsed.error.flatten());

  const existing = await prisma.menuItem.findFirst({ where: { id, restaurantId: ctx.restaurant.id } });
  if (!existing) return fail(404, 'NOT_FOUND', 'Item not found.');

  const data = parsed.data;
  const item = await prisma.$transaction(async (tx) => {
    if (data.groups) {
      await tx.variantGroup.deleteMany({ where: { itemId: existing.id } });
    }
    return tx.menuItem.update({
      where: { id: existing.id },
      data: {
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.servingSize !== undefined ? { servingSize: data.servingSize } : {}),
        ...(data.imageUrl !== undefined
          ? {
              imageUrl: data.imageUrl,
              imageIsPlaceholder:
                !data.imageUrl ||
                data.imageUrl.startsWith('/api/placeholder') ||
                data.imageUrl.startsWith('/uploads'),
            }
          : {}),
        ...(data.priceRupees !== undefined ? { priceMinor: rupeesToPaise(data.priceRupees) } : {}),
        ...(data.isVeg !== undefined ? { isVeg: data.isVeg } : {}),
        ...(data.isVegan !== undefined ? { isVegan: data.isVegan } : {}),
        ...(data.isJain !== undefined ? { isJain: data.isJain } : {}),
        ...(data.spiceLevel !== undefined ? { spiceLevel: data.spiceLevel } : {}),
        ...(data.allergens ? { allergens: data.allergens } : {}),
        ...(data.isAvailable !== undefined ? { isAvailable: data.isAvailable } : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.prepMinutes !== undefined ? { prepMinutes: data.prepMinutes } : {}),
        ...(data.trackInventory !== undefined ? { trackInventory: data.trackInventory } : {}),
        ...(data.stockQty !== undefined ? { stockQty: data.stockQty } : {}),
        ...(data.verificationStatus ? { verificationStatus: data.verificationStatus } : {}),
        ...(data.verificationNote !== undefined ? { verificationNote: data.verificationNote } : {}),
        ...(data.groups
          ? {
              variantGroups: {
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
              },
            }
          : {}),
        // Owner edits always mark the row as reviewed by the business.
        verificationStatus: data.verificationStatus ?? 'OWNER_EDITED',
      },
      include: { variantGroups: { include: { options: true } }, category: true, images: true },
    });
  });

  invalidateMenu(slug);
  await auditLog({
    restaurantId: ctx.restaurant.id,
    userId: ctx.user.id,
    action: 'MENU_ITEM_UPDATED',
    entity: 'MenuItem',
    entityId: item.id,
    meta: { name: item.name },
  });
  return ok({ item });
});

export const DELETE = handler(async (req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  assertSameOrigin(req);
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'menu.edit');
  const existing = await prisma.menuItem.findFirst({ where: { id, restaurantId: ctx.restaurant.id } });
  if (!existing) return fail(404, 'NOT_FOUND', 'Item not found.');
  await prisma.menuItem.delete({ where: { id: existing.id } });
  invalidateMenu(slug);
  await auditLog({
    restaurantId: ctx.restaurant.id,
    userId: ctx.user.id,
    action: 'MENU_ITEM_DELETED',
    entity: 'MenuItem',
    entityId: id,
    meta: { name: existing.name },
  });
  return ok({ deleted: true });
});

/** Duplicate an item (used to add a variant of a dish quickly). */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  assertSameOrigin(req);
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'menu.edit');
  const existing = await prisma.menuItem.findFirst({
    where: { id, restaurantId: ctx.restaurant.id },
    include: { variantGroups: { include: { options: true } } },
  });
  if (!existing) return fail(404, 'NOT_FOUND', 'Item not found.');

  const copy = await prisma.menuItem.create({
    data: {
      restaurantId: ctx.restaurant.id,
      categoryId: existing.categoryId,
      name: `${existing.name} (copy)`,
      slug: `${existing.slug}-copy-${Date.now().toString(36).slice(-4)}`,
      description: existing.description,
      servingSize: existing.servingSize,
      imageUrl: existing.imageUrl,
      imageIsPlaceholder: existing.imageIsPlaceholder,
      priceMinor: existing.priceMinor,
      isVeg: existing.isVeg,
      isVegan: existing.isVegan,
      isJain: existing.isJain,
      spiceLevel: existing.spiceLevel,
      allergens: existing.allergens,
      isAvailable: false,
      isPublished: false,
      sortOrder: existing.sortOrder,
      prepMinutes: existing.prepMinutes,
      verificationStatus: 'OWNER_EDITED',
      variantGroups: {
        create: existing.variantGroups.map((group) => ({
          name: group.name,
          kind: group.kind,
          type: group.type,
          required: group.required,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          sortOrder: group.sortOrder,
          options: {
            create: group.options.map((option) => ({
              name: option.name,
              priceDeltaMinor: option.priceDeltaMinor,
              isDefault: option.isDefault,
              isAvailable: option.isAvailable,
              sortOrder: option.sortOrder,
            })),
          },
        })),
      },
    },
  });
  invalidateMenu(slug);
  return ok({ item: copy }, { status: 201 });
});

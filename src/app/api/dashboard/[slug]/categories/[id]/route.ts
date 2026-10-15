import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { categorySchema } from '@/lib/validation';
import { invalidateMenu } from '@/lib/menu-cache';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  assertSameOrigin(req);
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'categories.edit');
  const body = await req.json().catch(() => null);
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the category details.');

  const result = await prisma.menuCategory.updateMany({
    where: { id, restaurantId: ctx.restaurant.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
    },
  });
  if (result.count === 0) return fail(404, 'NOT_FOUND', 'Category not found.');
  invalidateMenu(slug);
  return ok({ updated: true });
});

export const DELETE = handler(async (req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  assertSameOrigin(req);
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'categories.edit');
  const category = await prisma.menuCategory.findFirst({
    where: { id, restaurantId: ctx.restaurant.id },
    include: { _count: { select: { items: true } } },
  });
  if (!category) return fail(404, 'NOT_FOUND', 'Category not found.');
  if (category._count.items > 0) {
    return fail(409, 'CATEGORY_NOT_EMPTY', `Move or delete the ${category._count.items} items in "${category.name}" first.`);
  }
  await prisma.menuCategory.delete({ where: { id: category.id } });
  invalidateMenu(slug);
  return ok({ deleted: true });
});

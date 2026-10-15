import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { categorySchema } from '@/lib/validation';
import { slugify } from '@/lib/ids';
import { invalidateMenu } from '@/lib/menu-cache';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'menu.view');
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: ctx.restaurant.id },
    orderBy: [{ sortOrder: 'asc' }],
    include: {
      _count: { select: { items: true, sections: true } },
      sections: { orderBy: { sortOrder: 'asc' }, include: { _count: { select: { items: true } } } },
    },
  });
  return ok({ categories });
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  assertSameOrigin(req);
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'categories.edit');
  const body = await req.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the category details.');

  let catSlug = slugify(parsed.data.name);
  const clash = await prisma.menuCategory.findUnique({
    where: { restaurantId_slug: { restaurantId: ctx.restaurant.id, slug: catSlug } },
  });
  if (clash) catSlug = `${catSlug}-${Date.now().toString(36).slice(-4)}`;

  const count = await prisma.menuCategory.count({ where: { restaurantId: ctx.restaurant.id, parentId: null } });
  const category = await prisma.menuCategory.create({
    data: {
      restaurantId: ctx.restaurant.id,
      name: parsed.data.name,
      slug: catSlug,
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      isActive: parsed.data.isActive ?? true,
      sortOrder: parsed.data.sortOrder ?? count * 10,
    },
  });
  invalidateMenu(slug);
  return ok({ category }, { status: 201 });
});

/** Reorder categories (drag handles in the dashboard). */
export const PUT = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  assertSameOrigin(req);
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'categories.edit');
  const body = (await req.json().catch(() => null)) as { ids?: string[] } | null;
  if (!body?.ids?.length) return fail(422, 'VALIDATION_ERROR', 'No categories to reorder.');

  await prisma.$transaction(
    body.ids.map((id, index) =>
      prisma.menuCategory.updateMany({
        where: { id, restaurantId: ctx.restaurant.id },
        data: { sortOrder: index * 10 },
      }),
    ),
  );
  invalidateMenu(slug);
  return ok({ reordered: body.ids.length });
});

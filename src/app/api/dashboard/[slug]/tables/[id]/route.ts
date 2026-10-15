import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { tableSchema } from '@/lib/validation';
import { randomToken } from '@/lib/ids';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  assertSameOrigin(req);
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'tables.edit');
  const body = await req.json().catch(() => null);
  const parsed = tableSchema.partial().safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the table details.');

  const table = await prisma.restaurantTable.findFirst({ where: { id, restaurantId: ctx.restaurant.id } });
  if (!table) return fail(404, 'NOT_FOUND', 'Table not found.');

  const updated = await prisma.restaurantTable.update({
    where: { id: table.id },
    data: {
      ...(parsed.data.code ? { code: parsed.data.code.toUpperCase() } : {}),
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
      ...(parsed.data.seats !== undefined ? { seats: parsed.data.seats } : {}),
      ...(parsed.data.zone !== undefined ? { zone: parsed.data.zone } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      // Regenerating the QR identifier invalidates any printed code for this table.
      ...(body?.regenerateQr === true ? { qrToken: randomToken(12) } : {}),
    },
  });
  return ok({ table: updated });
});

export const DELETE = handler(async (req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  assertSameOrigin(req);
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'tables.edit');
  const table = await prisma.restaurantTable.findFirst({
    where: { id, restaurantId: ctx.restaurant.id },
    include: { _count: { select: { orders: true } } },
  });
  if (!table) return fail(404, 'NOT_FOUND', 'Table not found.');
  if (table._count.orders > 0) {
    // Keep historical orders intact: archive rather than delete.
    await prisma.restaurantTable.update({ where: { id: table.id }, data: { status: 'ARCHIVED' } });
    return ok({ archived: true });
  }
  await prisma.restaurantTable.delete({ where: { id: table.id } });
  return ok({ deleted: true });
});

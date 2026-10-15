import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { tableSchema } from '@/lib/validation';
import { randomToken } from '@/lib/ids';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'tables.view');
  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: ctx.restaurant.id },
    orderBy: { code: 'asc' },
    include: { _count: { select: { orders: true } } },
  });
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: ctx.restaurant.id },
    select: { slug: true, name: true },
  });
  return ok({
    tables: tables.map((t) => ({
      id: t.id,
      code: t.code,
      label: t.label,
      seats: t.seats,
      zone: t.zone,
      status: t.status,
      qrToken: t.qrToken,
      orders: t._count.orders,
      lastOrderAt: t.lastOrderAt,
    })),
    restaurant,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
  });
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  assertSameOrigin(req);
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'tables.edit');
  const body = await req.json().catch(() => null);
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the table details.');

  const clash = await prisma.restaurantTable.findUnique({
    where: { restaurantId_code: { restaurantId: ctx.restaurant.id, code: parsed.data.code.toUpperCase() } },
  });
  if (clash) return fail(409, 'DUPLICATE_CODE', `Table ${parsed.data.code.toUpperCase()} already exists.`);

  const table = await prisma.restaurantTable.create({
    data: {
      restaurantId: ctx.restaurant.id,
      code: parsed.data.code.toUpperCase(),
      label: parsed.data.label ?? null,
      seats: parsed.data.seats ?? 4,
      zone: parsed.data.zone ?? null,
      status: parsed.data.status ?? 'ACTIVE',
      qrToken: randomToken(12),
    },
  });
  return ok({ table }, { status: 201 });
});

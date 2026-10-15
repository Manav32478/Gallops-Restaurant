import { NextResponse } from 'next/server';
import { Prisma, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { handler } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { serializeOrder, ORDER_INCLUDE } from '@/lib/orders';

export const dynamic = 'force-dynamic';

/** Orders for the dashboard. Scoped by the caller's membership — never by a client id. */
export const GET = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'orders.view');
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('q')?.trim();
  const date = url.searchParams.get('date'); // YYYY-MM-DD
  const table = url.searchParams.get('table');

  const where: Prisma.OrderWhereInput = { restaurantId: ctx.restaurant.id };
  if (status && status !== 'ALL') {
    where.status = status as OrderStatus;
  }
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { guestName: { contains: search, mode: 'insensitive' } },
      { guestPhone: { contains: search } },
      { items: { some: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }
  if (table) where.table = { code: table };
  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    if (!Number.isNaN(start.getTime())) where.placedAt = { gte: start, lte: end };
  }

  const orders = await prisma.order.findMany({
    where,
    include: ORDER_INCLUDE,
    orderBy: [{ placedAt: 'desc' }],
    take: 200,
  });

  return NextResponse.json({ ok: true, data: { orders: orders.map(serializeOrder) } });
});

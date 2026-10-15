import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

/**
 * Analytics computed from real orders only.
 * Revenue separates PAID from PENDING / REFUNDED / cancelled orders.
 */
export const GET = handler(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'analytics.view');
  const restaurantId = ctx.restaurant.id;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(startOfToday);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const [todayOrders, weekOrders, pending, preparing, ready, completedToday, cancelledToday] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId, placedAt: { gte: startOfToday }, status: { notIn: ['CANCELLED', 'REJECTED'] } },
      select: { totalMinor: true, paymentStatus: true, items: { select: { quantity: true, name: true, menuItemId: true, totalMinor: true } } },
    }),
    prisma.order.findMany({
      where: { restaurantId, placedAt: { gte: weekAgo } },
      select: { placedAt: true, totalMinor: true, status: true, paymentStatus: true },
    }),
    prisma.order.count({ where: { restaurantId, status: 'PLACED' } }),
    prisma.order.count({ where: { restaurantId, status: 'PREPARING' } }),
    prisma.order.count({ where: { restaurantId, status: 'READY' } }),
    prisma.order.count({ where: { restaurantId, status: 'COMPLETED', completedAt: { gte: startOfToday } } }),
    prisma.order.count({ where: { restaurantId, status: { in: ['CANCELLED', 'REJECTED'] }, cancelledAt: { gte: startOfToday } } }),
  ]);

  const revenueToday = todayOrders.filter((o) => o.paymentStatus === 'PAID').reduce((s, o) => s + o.totalMinor, 0);
  const pipelineToday = todayOrders.reduce((s, o) => s + o.totalMinor, 0);
  const averageOrderValue = todayOrders.length ? Math.round(todayOrders.reduce((s, o) => s + o.totalMinor, 0) / todayOrders.length) : 0;

  // Daily series for the last 7 days
  const series = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekAgo);
    day.setDate(day.getDate() + index);
    const label = day.toLocaleDateString('en-IN', { weekday: 'short' });
    const dayOrders = weekOrders.filter((o) => new Date(o.placedAt).toDateString() === day.toDateString());
    const revenue = dayOrders
      .filter((o) => o.paymentStatus === 'PAID' && o.status !== 'CANCELLED' && o.status !== 'REJECTED')
      .reduce((s, o) => s + o.totalMinor, 0);
    return {
      label,
      date: day.toISOString().slice(0, 10),
      orders: dayOrders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'REJECTED').length,
      revenue,
    };
  });

  // Popular dishes from real order history
  const dishMap = new Map<string, { name: string; quantity: number; revenueMinor: number }>();
  for (const order of todayOrders) {
    for (const item of order.items) {
      const key = item.menuItemId ?? item.name;
      const entry = dishMap.get(key) ?? { name: item.name, quantity: 0, revenueMinor: 0 };
      entry.quantity += item.quantity;
      entry.revenueMinor += item.totalMinor;
      dishMap.set(key, entry);
    }
  }
  const popularDishes = [...dishMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8);

  const statusDistribution = await prisma.order.groupBy({
    by: ['status'],
    where: { restaurantId, placedAt: { gte: startOfToday } },
    _count: { _all: true },
  });

  const tableActivity = await prisma.order.groupBy({
    by: ['tableId'],
    where: { restaurantId, placedAt: { gte: weekAgo } },
    _count: { _all: true },
    _sum: { totalMinor: true },
    orderBy: { _count: { tableId: 'desc' } },
    take: 8,
  });
  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId, id: { in: tableActivity.map((t) => t.tableId).filter(Boolean) as string[] } },
    select: { id: true, code: true },
  });

  return NextResponse.json({
    ok: true,
    data: {
      today: {
        orders: todayOrders.length,
        revenue: revenueToday,
        pipeline: pipelineToday,
        averageOrderValue,
        completed: completedToday,
        cancelled: cancelledToday,
      },
      live: { pending, preparing, ready },
      series,
      popularDishes,
      statusDistribution: statusDistribution.map((row) => ({ status: row.status, count: row._count._all })),
      tableActivity: tableActivity.map((row) => ({
        table: tables.find((t) => t.id === row.tableId)?.code ?? '—',
        orders: row._count._all,
        revenue: row._sum.totalMinor ?? 0,
      })),
    },
  });
});

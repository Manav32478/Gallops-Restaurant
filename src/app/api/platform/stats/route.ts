import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handler } from '@/lib/api';
import { requirePlatformAdmin } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requirePlatformAdmin();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [restaurants, users, ordersThisMonth, revenueThisMonth, plans, leads, subscriptions] = await Promise.all([
    prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tables: true, memberships: true, items: true, orders: true } },
        subscriptions: { include: { plan: true }, take: 1 },
      },
    }),
    prisma.user.count(),
    prisma.order.count({ where: { placedAt: { gte: startOfMonth } } }),
    prisma.order.aggregate({
      where: { placedAt: { gte: startOfMonth }, paymentStatus: 'PAID', status: { notIn: ['CANCELLED', 'REJECTED'] } },
      _sum: { totalMinor: true },
    }),
    prisma.plan.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { subscriptions: true } } } }),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.subscription.findMany({ include: { plan: true, restaurant: { select: { name: true, slug: true } } } }),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      overview: {
        restaurants: restaurants.length,
        activeRestaurants: restaurants.filter((r) => r.isActive && r.isPublished).length,
        users,
        ordersThisMonth,
        revenueThisMonth: revenueThisMonth._sum.totalMinor ?? 0,
        leads: leads.length,
      },
      restaurants: restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        city: r.city,
        isActive: r.isActive,
        isPublished: r.isPublished,
        createdAt: r.createdAt,
        tables: r._count.tables,
        staff: r._count.memberships,
        items: r._count.items,
        orders: r._count.orders,
        plan: r.subscriptions[0]?.plan?.name ?? '—',
        planCode: r.subscriptions[0]?.plan?.code ?? null,
        status: r.subscriptions[0]?.status ?? 'NONE',
      })),
      plans: plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        priceMinor: p.priceMinor,
        maxTables: p.maxTables,
        maxStaff: p.maxStaff,
        maxOrdersPerMonth: p.maxOrdersPerMonth,
        tenants: p._count.subscriptions,
        features: (p.features as string[] | null) ?? [],
        isPublic: p.isPublic,
      })),
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        restaurant: s.restaurant.name,
        slug: s.restaurant.slug,
        plan: s.plan.name,
        status: s.status,
        currentPeriodEnd: s.currentPeriodEnd,
      })),
      leads,
      billingMode: process.env.PLATFORM_BILLING_MODE ?? 'development',
    },
  });
});

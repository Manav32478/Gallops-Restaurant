import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler } from '@/lib/api';
import { priceOrder, couponDiscount, type PricedLineInput } from '@/lib/pricing';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  slug: z.string().min(1),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
        optionIds: z.array(z.string()).max(40).default([]),
      }),
    )
    .min(1)
    .max(80),
  couponCode: z.string().max(40).optional().nullable(),
});

/**
 * Server-side cart pricing.
 * The browser's numbers are display-only: this endpoint re-reads every price
 * from the database and returns the authoritative breakdown.
 */
export const POST = handler(async (req: Request) => {
  const limit = rateLimit(`cart:${req.headers.get('x-forwarded-for') ?? 'local'}`, 120, 60_000);
  if (!limit.allowed) return fail(429, 'RATE_LIMITED', 'Too many requests.');

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Invalid cart.', parsed.error.flatten());

  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: parsed.data.slug, isPublished: true, isActive: true },
  });
  if (!restaurant) return fail(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found.');

  const ids = [...new Set(parsed.data.items.map((i) => i.itemId))];
  const dbItems = await prisma.menuItem.findMany({
    where: { id: { in: ids }, restaurantId: restaurant.id },
    include: { variantGroups: { include: { options: true } } },
  });
  const byId = new Map(dbItems.map((item) => [item.id, item]));

  const issues: { itemId: string; reason: string }[] = [];
  const lines: PricedLineInput[] = [];

  for (const raw of parsed.data.items) {
    const item = byId.get(raw.itemId);
    if (!item || !item.isPublished) {
      issues.push({ itemId: raw.itemId, reason: 'no-longer-available' });
      continue;
    }
    if (!item.isAvailable) issues.push({ itemId: raw.itemId, reason: 'sold-out' });

    const modifiers = [];
    for (const optionId of raw.optionIds) {
      const group = item.variantGroups.find((g) => g.options.some((o) => o.id === optionId));
      const option = group?.options.find((o) => o.id === optionId);
      if (option && option.isAvailable) {
        modifiers.push({
          groupName: group!.name,
          groupKind: group!.kind,
          optionName: option.name,
          priceDeltaMinor: option.priceDeltaMinor,
          quantity: 1,
        });
      }
    }

    lines.push({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      servingSize: item.servingSize,
      basePriceMinor: item.priceMinor,
      quantity: raw.quantity,
      modifiers,
    });
  }

  let coupon = null;
  if (parsed.data.couponCode) {
    coupon = await prisma.coupon.findUnique({
      where: { restaurantId_code: { restaurantId: restaurant.id, code: parsed.data.couponCode.toUpperCase() } },
    });
    if (coupon && (!coupon.isActive || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses))) coupon = null;
  }

  const probe = priceOrder(lines, {
    taxBp: restaurant.taxBp,
    serviceChargeBp: restaurant.serviceChargeBp,
    taxInclusive: restaurant.taxInclusive,
  });
  const discountMinor = couponDiscount(coupon, probe.subtotalMinor);
  const pricing = priceOrder(
    lines,
    { taxBp: restaurant.taxBp, serviceChargeBp: restaurant.serviceChargeBp, taxInclusive: restaurant.taxInclusive },
    discountMinor,
  );

  return NextResponse.json({
    ok: true,
    data: {
      ...pricing,
      lines: pricing.lines.map((line) => ({
        menuItemId: line.menuItemId,
        name: line.name,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        totalMinor: line.totalMinor,
      })),
      issues,
      currency: restaurant.currency,
      taxBp: restaurant.taxBp,
      serviceChargeBp: restaurant.serviceChargeBp,
      minOrderMinor: restaurant.minOrderMinor,
      paymentMethods: restaurant.paymentMethods,
    },
  });
});

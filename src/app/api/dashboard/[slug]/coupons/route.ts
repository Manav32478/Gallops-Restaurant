import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { couponSchema } from '@/lib/validation';
import { rupeesToPaise, percentToBp } from '@/lib/money';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'menu.view');
  const coupons = await prisma.coupon.findMany({
    where: { restaurantId: ctx.restaurant.id },
    orderBy: { createdAt: 'desc' },
  });
  return ok({ coupons });
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  assertSameOrigin(req);
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'settings.edit');
  const body = await req.json().catch(() => null);
  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the coupon details.', parsed.error.flatten());
  const data = parsed.data;

  const coupon = await prisma.coupon.create({
    data: {
      restaurantId: ctx.restaurant.id,
      code: data.code.toUpperCase(),
      description: data.description ?? null,
      type: data.type,
      valueBp: data.type === 'PERCENT' ? percentToBp(data.percent ?? 0) : 0,
      valueMinor: data.type === 'FLAT' ? rupeesToPaise(data.amountRupees ?? 0) : 0,
      minSubtotalMinor: rupeesToPaise(data.minSubtotalRupees ?? 0),
      maxUses: data.maxUses ?? null,
      isActive: data.isActive ?? true,
    },
  });
  return ok({ coupon }, { status: 201 });
});

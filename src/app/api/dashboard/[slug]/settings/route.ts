import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability, requireTenant } from '@/lib/tenant';
import { settingsSchema } from '@/lib/validation';
import { percentToBp, rupeesToPaise } from '@/lib/money';
import { invalidateMenu } from '@/lib/menu-cache';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const ctx = await requireTenant(slug);
  const restaurant = await prisma.restaurant.findUnique({ where: { id: ctx.restaurant.id } });
  return ok({ restaurant, capabilities: ctx.capabilities, role: ctx.role });
});

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  assertSameOrigin(req);
  const { slug } = await params;
  const ctx = await requireCapability(slug, 'settings.edit');
  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the settings.', parsed.error.flatten());
  const data = parsed.data;

  const restaurant = await prisma.restaurant.update({
    where: { id: ctx.restaurant.id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
      ...(data.about !== undefined ? { about: data.about } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
      ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl } : {}),
      ...(data.heroImageUrl !== undefined ? { heroImageUrl: data.heroImageUrl } : {}),
      ...(data.addressLine !== undefined ? { addressLine: data.addressLine } : {}),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.state !== undefined ? { state: data.state } : {}),
      ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.website !== undefined ? { website: data.website } : {}),
      ...(data.instagram !== undefined ? { instagram: data.instagram } : {}),
      ...(data.taxPercent !== undefined ? { taxBp: percentToBp(data.taxPercent) } : {}),
      ...(data.serviceChargePercent !== undefined ? { serviceChargeBp: percentToBp(data.serviceChargePercent) } : {}),
      ...(data.acceptingOrders !== undefined ? { acceptingOrders: data.acceptingOrders } : {}),
      ...(data.autoAcceptOrders !== undefined ? { autoAcceptOrders: data.autoAcceptOrders } : {}),
      ...(data.defaultPrepMinutes !== undefined ? { defaultPrepMinutes: data.defaultPrepMinutes } : {}),
      ...(data.cancellationMinutes !== undefined ? { cancellationMinutes: data.cancellationMinutes } : {}),
      ...(data.minOrderRupees !== undefined ? { minOrderMinor: rupeesToPaise(data.minOrderRupees) } : {}),
      ...(data.paymentMethods ? { paymentMethods: data.paymentMethods } : {}),
      ...(data.languages ? { languages: data.languages } : {}),
      ...(data.notificationSettings ? { notificationSettings: data.notificationSettings } : {}),
    },
  });

  invalidateMenu(slug);
  await auditLog({
    restaurantId: ctx.restaurant.id,
    userId: ctx.user.id,
    action: 'SETTINGS_UPDATED',
    entity: 'Restaurant',
    entityId: ctx.restaurant.id,
  });
  return ok({ restaurant });
});

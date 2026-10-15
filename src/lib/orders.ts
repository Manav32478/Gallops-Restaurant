import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/api';
import { randomToken } from '@/lib/ids';
import { priceOrder, couponDiscount, type PricedLineInput, type PricedModifier } from '@/lib/pricing';
import { emitOrderCreated, emitOrderUpdated } from '@/lib/realtime';
import { dispatchNotification } from '@/lib/notify';
import { auditLog } from '@/lib/audit';
import { roleHas, type Role } from '@/lib/auth/rbac';
import type { z } from 'zod';
import type { placeOrderSchema } from '@/lib/validation';

export const ORDER_INCLUDE = {
  items: { include: { modifiers: true }, orderBy: { sortOrder: 'asc' } },
  table: true,
  events: { orderBy: { createdAt: 'desc' }, take: 40 },
} satisfies Prisma.OrderInclude;

/** Which status transitions are legal at all (regardless of role). */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

/** Kitchen staff may only move the preparation queue forward. */
const KITCHEN_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  CONFIRMED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: [],
};

export function statusLabel(status: OrderStatus) {
  return {
    PLACED: 'New order',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY: 'Ready for pickup',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected',
  }[status];
}

// ---------------------------------------------------------------------------
// Order placement
// ---------------------------------------------------------------------------

type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export async function placeOrder(input: PlaceOrderInput, meta: { ip?: string; userAgent?: string }) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: input.slug, isPublished: true, isActive: true },
  });
  if (!restaurant) throw new ApiError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found.');
  if (!restaurant.acceptingOrders) {
    throw new ApiError(409, 'NOT_ACCEPTING', 'The restaurant is not accepting online orders right now. Please call a server.');
  }

  // Idempotency: a retried request returns the original order, never a duplicate.
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: ORDER_INCLUDE,
  });
  if (existing) return { order: existing, deduped: true };

  const table = await prisma.restaurantTable.findFirst({
    where: { restaurantId: restaurant.id, qrToken: input.table, status: { not: 'ARCHIVED' } },
  });
  if (!table) throw new ApiError(404, 'TABLE_NOT_FOUND', 'That table code is not valid. Please scan the QR on your table.');
  if (table.status !== 'ACTIVE') {
    throw new ApiError(409, 'TABLE_DISABLED', 'That table is not currently accepting orders. Please call a server.');
  }

  // --- server-side price resolution (never trust client prices) -------------
  const itemIds = [...new Set(input.items.map((i) => i.itemId))];
  const dbItems = await prisma.menuItem.findMany({
    where: { id: { in: itemIds }, restaurantId: restaurant.id, isPublished: true },
    include: { variantGroups: { include: { options: true } } },
  });
  const byId = new Map(dbItems.map((item) => [item.id, item]));

  const lines: PricedLineInput[] = [];
  for (const raw of input.items) {
    const item = byId.get(raw.itemId);
    if (!item) throw new ApiError(404, 'ITEM_NOT_FOUND', `Menu item ${raw.itemId} is no longer available.`);
    if (!item.isAvailable) throw new ApiError(409, 'SOLD_OUT', `${item.name} is sold out.`);
    if (item.trackInventory && item.stockQty < raw.quantity) {
      throw new ApiError(409, 'SOLD_OUT', `${item.name} has only ${item.stockQty} left.`);
    }

    const modifiers: PricedModifier[] = [];
    const selectedByGroup = new Map<string, number>();
    for (const optionId of raw.optionIds) {
      const group = item.variantGroups.find((g) => g.options.some((o) => o.id === optionId));
      const option = group?.options.find((o) => o.id === optionId);
      if (!group || !option) throw new ApiError(422, 'INVALID_OPTION', 'One of the selected options is not valid.');
      if (!option.isAvailable) throw new ApiError(409, 'OPTION_UNAVAILABLE', `${option.name} is not available.`);
      selectedByGroup.set(group.id, (selectedByGroup.get(group.id) ?? 0) + 1);
      modifiers.push({
        groupName: group.name,
        groupKind: group.kind,
        optionName: option.name,
        priceDeltaMinor: option.priceDeltaMinor,
        quantity: 1,
      });
    }

    // enforce configured modifiers (required groups / min-max)
    for (const group of item.variantGroups) {
      const count = selectedByGroup.get(group.id) ?? 0;
      if (group.required && count < Math.max(1, group.minSelect)) {
        throw new ApiError(422, 'OPTION_REQUIRED', `Choose an option for "${group.name}" on ${item.name}.`);
      }
      if (count > group.maxSelect) {
        throw new ApiError(422, 'TOO_MANY_OPTIONS', `Choose at most ${group.maxSelect} for "${group.name}" on ${item.name}.`);
      }
    }

    lines.push({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      servingSize: item.servingSize,
      basePriceMinor: item.priceMinor,
      quantity: raw.quantity,
      notes: raw.notes?.slice(0, 300) ?? null,
      modifiers,
    });
  }

  let coupon = null;
  if (input.couponCode) {
    coupon = await prisma.coupon.findUnique({
      where: { restaurantId_code: { restaurantId: restaurant.id, code: input.couponCode.toUpperCase() } },
    });
    const now = new Date();
    if (
      !coupon ||
      !coupon.isActive ||
      (coupon.startsAt && coupon.startsAt > now) ||
      (coupon.endsAt && coupon.endsAt < now) ||
      (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    ) {
      throw new ApiError(422, 'COUPON_INVALID', 'That coupon code is not valid.');
    }
  }

  const subtotalProbe = priceOrder(lines, {
    taxBp: restaurant.taxBp,
    serviceChargeBp: restaurant.serviceChargeBp,
    taxInclusive: restaurant.taxInclusive,
  });
  const discountMinor = couponDiscount(coupon, subtotalProbe.subtotalMinor);

  const pricing = priceOrder(
    lines,
    { taxBp: restaurant.taxBp, serviceChargeBp: restaurant.serviceChargeBp, taxInclusive: restaurant.taxInclusive },
    discountMinor,
  );

  if (pricing.subtotalMinor < restaurant.minOrderMinor) {
    throw new ApiError(422, 'MIN_ORDER', `Minimum order is ₹${(restaurant.minOrderMinor / 100).toFixed(0)}.`);
  }

  const prepMinutes = Math.max(
    restaurant.defaultPrepMinutes,
    ...dbItems.map((i) => i.prepMinutes ?? 0),
  );
  const estimatedReadyAt = new Date(Date.now() + prepMinutes * 60_000);

  // --- transaction ---------------------------------------------------------
  const order = await prisma.$transaction(async (tx) => {
    const code = await nextOrderCode(tx, restaurant.id, restaurant.name);
    const created = await tx.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        code,
        trackingToken: randomToken(20),
        status: restaurant.autoAcceptOrders ? 'CONFIRMED' : 'PLACED',
        confirmedAt: restaurant.autoAcceptOrders ? new Date() : null,
        guestName: input.guestName?.trim() || null,
        guestPhone: input.guestPhone?.trim() || null,
        notes: input.notes?.trim() || null,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === 'RAZORPAY' ? 'PENDING' : 'PENDING',
        couponCode: coupon?.code ?? null,
        subtotalMinor: pricing.subtotalMinor,
        discountMinor: pricing.discountMinor,
        taxMinor: pricing.taxMinor,
        serviceChargeMinor: pricing.serviceChargeMinor,
        totalMinor: pricing.totalMinor,
        currency: restaurant.currency,
        idempotencyKey: input.idempotencyKey,
        estimatedReadyAt,
        items: {
          create: pricing.lines.map((line, index) => ({
            menuItemId: line.menuItemId,
            name: line.name,
            imageUrl: line.imageUrl,
            servingSize: line.servingSize,
            unitPriceMinor: line.unitPriceMinor,
            quantity: line.quantity,
            notes: line.notes,
            totalMinor: line.totalMinor,
            sortOrder: index,
            modifiers: { create: line.modifiers.map((m) => ({ ...m })) },
          })),
        },
        events: {
          create: {
            type: 'PLACED',
            toStatus: restaurant.autoAcceptOrders ? 'CONFIRMED' : 'PLACED',
            message: `Order placed from table ${table.code}`,
          },
        },
      },
      include: ORDER_INCLUDE,
    });

    // inventory decrement (only for items opted into tracking)
    for (const line of pricing.lines) {
      const item = byId.get(line.menuItemId);
      if (item?.trackInventory) {
        await tx.menuItem.update({
          where: { id: item.id },
          data: { stockQty: { decrement: line.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: {
            restaurantId: restaurant.id,
            itemId: item.id,
            delta: -line.quantity,
            reason: 'ORDER_PLACED',
            orderId: created.id,
          },
        });
      }
    }

    if (coupon) {
      await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    }
    await tx.restaurantTable.update({ where: { id: table.id }, data: { lastOrderAt: new Date() } });

    return created;
  });

  await dispatchNotification({
    restaurantId: restaurant.id,
    orderId: order.id,
    event: 'ORDER_PLACED',
    title: `Order #${order.code} received`,
    body: `Table ${table.code} · ${order.items.reduce((s, i) => s + i.quantity, 0)} items · ₹${(order.totalMinor / 100).toFixed(0)}`,
    channels: ['IN_APP'],
  });

  await auditLog({
    restaurantId: restaurant.id,
    action: 'ORDER_PLACED',
    entity: 'Order',
    entityId: order.id,
    meta: { code: order.code, table: table.code, totalMinor: order.totalMinor, items: order.items.length },
    ip: meta.ip,
  });

  emitOrderCreated(restaurant.id, serializeOrder(order));
  return { order, deduped: false };
}

async function nextOrderCode(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  restaurantName: string,
): Promise<string> {
  const prefix = (restaurantName.trim()[0] ?? 'G').toUpperCase();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const count = await tx.order.count({ where: { restaurantId, placedAt: { gte: startOfDay } } });
    const candidate = `${prefix}${100 + count + attempt}`;
    const clash = await tx.order.findFirst({ where: { restaurantId, code: candidate } });
    if (!clash) return candidate;
  }
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

// ---------------------------------------------------------------------------
// Status workflow
// ---------------------------------------------------------------------------

export async function updateOrderStatus(params: {
  restaurantId: string;
  orderId: string;
  next: OrderStatus;
  role: Role;
  actorUserId?: string;
  actorLabel?: string;
  reason?: string | null;
  expectedStatus?: string | null;
}) {
  const { restaurantId, orderId, next, role } = params;

  // Tenant scope is part of the WHERE clause: another tenant's id can never match.
  const order = await prisma.order.findFirst({ where: { id: orderId, restaurantId } });
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found.');

  if (params.expectedStatus && params.expectedStatus !== order.status) {
    throw new ApiError(409, 'STALE_STATUS', 'Another team member already updated this order. Refreshing…');
  }

  const allowed =
    role === 'KITCHEN' ? (KITCHEN_TRANSITIONS[order.status] ?? []) : TRANSITIONS[order.status];
  if (!allowed.includes(next)) {
    throw new ApiError(409, 'INVALID_TRANSITION', `Cannot move an order from ${statusLabel(order.status).toLowerCase()} to ${statusLabel(next).toLowerCase()}.`);
  }
  if (next === 'CANCELLED' && !roleHas(role, 'orders.cancel')) {
    throw new ApiError(403, 'FORBIDDEN', 'Your role cannot cancel orders.');
  }

  const now = new Date();
  const data: Prisma.OrderUpdateInput = { status: next };
  if (next === 'CONFIRMED') data.confirmedAt = now;
  if (next === 'PREPARING') data.preparingAt = now;
  if (next === 'READY') data.readyAt = now;
  if (next === 'COMPLETED') data.completedAt = now;
  if (next === 'CANCELLED') {
    data.cancelledAt = now;
    data.cancelReason = params.reason?.slice(0, 300) ?? null;
  }
  if (next === 'REJECTED') {
    data.cancelledAt = now;
    data.cancelReason = params.reason?.slice(0, 300) ?? 'Rejected by restaurant';
  }

  // Optimistic concurrency: only update if the status is still what we read.
  const result = await prisma.order.updateMany({
    where: { id: orderId, restaurantId, status: order.status },
    data,
  });
  if (result.count === 0) {
    throw new ApiError(409, 'CONFLICT', 'This order was just updated by someone else. Refreshing…');
  }

  await prisma.orderEvent.create({
    data: {
      orderId,
      type: 'STATUS_CHANGE',
      fromStatus: order.status,
      toStatus: next,
      message: params.reason?.slice(0, 300) ?? null,
      actorUserId: params.actorUserId ?? null,
      actorLabel: params.actorLabel ?? 'System',
    },
  });

  const updated = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
  emitOrderUpdated(restaurantId, updated.trackingToken, serializeOrder(updated));

  if (next === 'READY' && !updated.readyNotifiedAt) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    const channels: ('PUSH' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP')[] = ['IN_APP', 'PUSH'];
    if (restaurant?.notificationSettings && typeof restaurant.notificationSettings === 'object') {
      const settings = restaurant.notificationSettings as Record<string, boolean>;
      if (settings.email) channels.push('EMAIL');
      if (settings.sms) channels.push('SMS');
      if (settings.whatsapp) channels.push('WHATSAPP');
    }
    const results = await dispatchNotification({
      restaurantId,
      orderId,
      event: 'ORDER_READY',
      title: 'Your order is ready!',
      body: `Your ${restaurant?.name ?? 'restaurant'} order is ready! Please collect it from the counter. Order #${updated.code}.`,
      channels,
    });
    await prisma.order.update({ where: { id: orderId }, data: { readyNotifiedAt: now } });
    await auditLog({
      restaurantId,
      userId: params.actorUserId,
      action: 'ORDER_READY_NOTIFIED',
      entity: 'Order',
      entityId: orderId,
      meta: { results },
    });
  }

  await auditLog({
    restaurantId,
    userId: params.actorUserId,
    action: `ORDER_${next}`,
    entity: 'Order',
    entityId: orderId,
    meta: { from: order.status, to: next, reason: params.reason ?? null },
  });

  return updated;
}

export async function markOrderPaid(params: {
  restaurantId: string;
  orderId: string;
  role: Role;
  actorUserId?: string;
  provider?: string;
  providerRef?: string;
}) {
  if (!roleHas(params.role, 'orders.payment')) {
    throw new ApiError(403, 'FORBIDDEN', 'Your role cannot change payment status.');
  }
  const order = await prisma.order.findFirst({ where: { id: params.orderId, restaurantId: params.restaurantId } });
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found.');

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: PaymentStatus.PAID },
    }),
    prisma.payment.create({
      data: {
        orderId: order.id,
        provider: params.provider ?? order.paymentMethod,
        providerRef: params.providerRef ?? `manual:${Date.now()}`,
        amountMinor: order.totalMinor,
        status: PaymentStatus.PAID,
      },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'PAYMENT',
        message: `Payment of ₹${(order.totalMinor / 100).toFixed(2)} recorded as received`,
        actorUserId: params.actorUserId ?? null,
        actorLabel: params.actorUserId ? 'Staff' : 'System',
      },
    }),
  ]);

  const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE });
  emitOrderUpdated(params.restaurantId, updated.trackingToken, serializeOrder(updated));
  return updated;
}

// ---------------------------------------------------------------------------
// Serialization (what leaves the API)
// ---------------------------------------------------------------------------

export function serializeOrder(order: Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>) {
  return {
    id: order.id,
    code: order.code,
    trackingToken: order.trackingToken,
    status: order.status,
    statusLabel: statusLabel(order.status),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    notes: order.notes,
    tableCode: order.table?.code ?? null,
    tableLabel: order.table?.label ?? null,
    subtotalMinor: order.subtotalMinor,
    discountMinor: order.discountMinor,
    taxMinor: order.taxMinor,
    serviceChargeMinor: order.serviceChargeMinor,
    totalMinor: order.totalMinor,
    currency: order.currency,
    couponCode: order.couponCode,
    placedAt: order.placedAt.toISOString(),
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    preparingAt: order.preparingAt?.toISOString() ?? null,
    readyAt: order.readyAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancelReason: order.cancelReason,
    estimatedReadyAt: order.estimatedReadyAt?.toISOString() ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.name,
      imageUrl: item.imageUrl,
      servingSize: item.servingSize,
      quantity: item.quantity,
      notes: item.notes,
      unitPriceMinor: item.unitPriceMinor,
      totalMinor: item.totalMinor,
      modifiers: item.modifiers.map((m) => ({
        groupName: m.groupName,
        groupKind: m.groupKind,
        optionName: m.optionName,
        priceDeltaMinor: m.priceDeltaMinor,
        quantity: m.quantity,
      })),
    })),
  };
}

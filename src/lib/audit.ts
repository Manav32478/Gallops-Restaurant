import { prisma } from '@/lib/prisma';

export async function auditLog(entry: {
  restaurantId?: string | null;
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: unknown;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        restaurantId: entry.restaurantId ?? null,
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        meta: entry.meta === undefined ? undefined : (entry.meta as never),
        ip: entry.ip ?? null,
      },
    });
  } catch (error) {
    // Auditing must never break the request path.
    console.error('[audit] failed', error);
  }
}

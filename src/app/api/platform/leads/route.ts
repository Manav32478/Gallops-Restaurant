import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requirePlatformAdmin } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

const schema = z.object({ id: z.string().min(1), status: z.enum(['NEW', 'CONTACTED', 'WON', 'LOST']) });

export const PATCH = handler(async (req: Request) => {
  assertSameOrigin(req);
  await requirePlatformAdmin();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Invalid status.');
  await prisma.lead.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  return ok({ updated: true });
});

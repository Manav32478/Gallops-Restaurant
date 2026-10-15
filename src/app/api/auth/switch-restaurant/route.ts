import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireUser } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

const schema = z.object({ slug: z.string().min(1).max(60) });

/** Sets the active restaurant cookie — validated against the user's memberships. */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Invalid restaurant.');
  if (!user.memberships.some((m) => m.restaurant.slug === parsed.data.slug)) {
    return fail(403, 'FORBIDDEN', 'You do not have access to that restaurant.');
  }
  const response = NextResponse.json({ ok: true, data: { slug: parsed.data.slug } });
  response.cookies.set('gallops_active_restaurant', parsed.data.slug, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  });
  return response;
});

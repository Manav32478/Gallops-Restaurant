import { NextResponse } from 'next/server';
import { handler } from '@/lib/api';
import { getSessionUser } from '@/lib/auth/session';
import { capabilitiesFor } from '@/lib/auth/rbac';

export const GET = handler(async () => {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: true, data: { user: null } });
  return NextResponse.json({
    ok: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isPlatformAdmin: user.isPlatformAdmin,
        memberships: user.memberships.map((m) => ({
          role: m.role,
          capabilities: capabilitiesFor(m.role),
          restaurant: { id: m.restaurant.id, slug: m.restaurant.slug, name: m.restaurant.name, logoUrl: m.restaurant.logoUrl },
        })),
      },
    },
  });
});

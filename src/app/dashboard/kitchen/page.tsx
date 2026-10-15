import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/session';
import { capabilitiesFor } from '@/lib/auth/rbac';
import { KitchenClient } from '@/components/dashboard/KitchenClient';

export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/dashboard/kitchen');
  const jar = await cookies();
  const preferred = jar.get('gallops_active_restaurant')?.value;
  const membership = user.memberships.find((m) => m.restaurant.slug === preferred) ?? user.memberships[0];
  if (!membership) redirect('/platform');

  return <KitchenClient slug={membership.restaurant.slug} capabilities={capabilitiesFor(membership.role)} />;
}

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/session';
import { capabilitiesFor } from '@/lib/auth/rbac';
import { CategoriesClient } from '@/components/dashboard/CategoriesClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const jar = await cookies();
  const preferred = jar.get('gallops_active_restaurant')?.value;
  const membership = user.memberships.find((m) => m.restaurant.slug === preferred) ?? user.memberships[0];
  if (!membership) redirect('/platform');
  return (
    <CategoriesClient
      slug={membership.restaurant.slug}
      canEdit={capabilitiesFor(membership.role).includes('categories.edit')}
    />
  );
}

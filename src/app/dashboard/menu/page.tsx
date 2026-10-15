import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { capabilitiesFor } from '@/lib/auth/rbac';
import { MenuManagerClient } from '@/components/dashboard/MenuManagerClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const jar = await cookies();
  const preferred = jar.get('gallops_active_restaurant')?.value;
  const membership = user.memberships.find((m) => m.restaurant.slug === preferred) ?? user.memberships[0];
  if (!membership) redirect('/platform');
  const caps = capabilitiesFor(membership.role);
  const needsReview = await prisma.menuItem.count({
    where: { restaurantId: membership.restaurant.id, verificationStatus: 'NEEDS_REVIEW' },
  });
  return <MenuManagerClient slug={membership.restaurant.slug} canEdit={caps.includes('menu.edit')} initialNeedsReview={needsReview} />;
}

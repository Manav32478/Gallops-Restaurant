import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/session';
import { capabilitiesFor } from '@/lib/auth/rbac';
import { SocketProvider } from '@/components/providers/SocketProvider';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ToastProvider } from '@/components/providers/ToastProvider';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/dashboard');
  if (user.memberships.length === 0 && !user.isPlatformAdmin) redirect('/login?error=no-restaurant');

  const jar = await cookies();
  const preferred = jar.get('gallops_active_restaurant')?.value;
  const membership =
    user.memberships.find((m) => m.restaurant.slug === preferred) ?? user.memberships[0];

  if (!membership) redirect('/platform');

  return (
    <ToastProvider>
      <SocketProvider auth={{ restaurantSlug: membership.restaurant.slug }}>
        <DashboardShell
          user={{ name: user.name, email: user.email, isPlatformAdmin: user.isPlatformAdmin }}
          restaurants={user.memberships.map((m) => ({
            id: m.restaurant.id,
            slug: m.restaurant.slug,
            name: m.restaurant.name,
            logoUrl: m.restaurant.logoUrl,
            role: m.role,
          }))}
          activeSlug={membership.restaurant.slug}
          role={membership.role}
          capabilities={capabilitiesFor(membership.role)}
        >
          {children}
        </DashboardShell>
      </SocketProvider>
    </ToastProvider>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2, CreditCard, LayoutDashboard, BarChart3 } from 'lucide-react';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/platform', label: 'Overview', icon: LayoutDashboard },
  { href: '/platform/restaurants', label: 'Restaurants', icon: Building2 },
  { href: '/platform/subscriptions', label: 'Plans & billing', icon: CreditCard },
  { href: '/platform/analytics', label: 'Usage & leads', icon: BarChart3 },
];

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/platform');
  if (!user.isPlatformAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
          <h1 className="font-display text-xl text-ivory-50">Platform admin only</h1>
          <p className="mt-2 text-sm text-ivory-400">
            Your account ({user.email}) is not a platform administrator. Ask an administrator to grant access, or return
            to your restaurant dashboard.
          </p>
          <Link href="/dashboard" className="mt-5 inline-block rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-ink-950">
            Go to my dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/[0.06] bg-ink-900/60 px-4 py-5 lg:flex">
        <Link href="/platform" className="flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500 text-ink-950">
            <Building2 size={18} />
          </span>
          <span className="font-display text-lg text-ivory-100">Platform</span>
        </Link>
        <nav className="mt-6 flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ivory-300 transition hover:bg-white/5 hover:text-ivory-100"
            >
              <item.icon size={16} /> {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="rounded-xl border border-white/10 px-3 py-2 text-center text-xs text-ivory-300 hover:border-lime-500/40 hover:text-lime-400">
          Back to restaurants
        </Link>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-white/[0.06] px-4 py-3 lg:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-ivory-300">
              {item.label}
            </Link>
          ))}
        </div>
        {children}
      </main>
    </div>
  );
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  ChefHat,
  ClipboardList,
  LogOut,
  Menu as MenuIcon,
  QrCode,
  Settings,
  Users,
  UtensilsCrossed,
  X,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSocket } from '@/components/providers/SocketProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { ROLE_LABEL, type Capability } from '@/lib/auth/rbac';

export type ShellRestaurant = { id: string; slug: string; name: string; logoUrl: string | null; role: string };

const NAV: { href: string; label: string; icon: typeof ClipboardList; capability: Capability; short: string }[] = [
  { href: '/dashboard', label: 'Overview', icon: BarChart3, capability: 'orders.view', short: 'Home' },
  { href: '/dashboard/orders', label: 'Reception', icon: ClipboardList, capability: 'orders.view', short: 'Orders' },
  { href: '/dashboard/kitchen', label: 'Kitchen', icon: ChefHat, capability: 'kitchen.view', short: 'Kitchen' },
  { href: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed, capability: 'menu.view', short: 'Menu' },
  { href: '/dashboard/categories', label: 'Categories', icon: UtensilsCrossed, capability: 'categories.edit', short: 'Sections' },
  { href: '/dashboard/tables', label: 'Tables & QR', icon: QrCode, capability: 'tables.view', short: 'Tables' },
  { href: '/dashboard/staff', label: 'Staff', icon: Users, capability: 'staff.view', short: 'Staff' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, capability: 'analytics.view', short: 'Analytics' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, capability: 'menu.view', short: 'Settings' },
];

export function DashboardShell({
  user,
  restaurants,
  activeSlug,
  capabilities,
  role,
  children,
}: {
  user: { name: string; email: string; isPlatformAdmin: boolean };
  restaurants: ShellRestaurant[];
  activeSlug: string;
  capabilities: Capability[];
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSocket();
  const { push } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const nav = NAV.filter((item) => capabilities.includes(item.capability));

  async function signOut() {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  async function switchRestaurant(slug: string) {
    setSwitcherOpen(false);
    await fetch('/api/auth/switch-restaurant', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
      body: JSON.stringify({ slug }),
    });
    router.refresh();
    router.push('/dashboard/orders');
  }

  return (
    <div className="min-h-screen bg-ink-950 lg:flex">
      {/* ------------------------------------------------------ desktop sidebar */}
      <aside className="print:hidden sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-ink-900/60 px-4 py-5 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500 text-ink-950">
            <QrCode size={18} strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg text-ivory-100">Gallops OS</span>
        </Link>

        <div className="relative mt-5">
          <button
            onClick={() => setSwitcherOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/20"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-ivory-100">
                {restaurants.find((r) => r.slug === activeSlug)?.name ?? 'Restaurant'}
              </span>
              <span className="block text-[10px] uppercase tracking-wide text-lime-400">
                {ROLE_LABEL[role as keyof typeof ROLE_LABEL] ?? role}
              </span>
            </span>
            <span className="text-ivory-500">⇅</span>
          </button>
          <AnimatePresence>
            {switcherOpen && restaurants.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-lift"
              >
                {restaurants.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    onClick={() => switchRestaurant(restaurant.slug)}
                    className={clsx(
                      'block w-full px-3 py-2.5 text-left text-sm transition hover:bg-white/5',
                      restaurant.slug === activeSlug ? 'text-lime-400' : 'text-ivory-200',
                    )}
                  >
                    {restaurant.name}
                    <span className="block text-[10px] text-ivory-500">
                      {ROLE_LABEL[restaurant.role as keyof typeof ROLE_LABEL] ?? restaurant.role}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="mt-5 flex-1 space-y-1">
          {nav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                  isActive ? 'text-ink-950' : 'text-ivory-300 hover:bg-white/5 hover:text-ivory-100',
                )}
              >
                {isActive && (
                  <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-lime-500" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                <item.icon size={16} className="relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {user.isPlatformAdmin && (
          <Link
            href="/platform"
            className="mb-2 rounded-xl border border-white/10 px-3 py-2 text-center text-xs text-ivory-300 transition hover:border-lime-500/40 hover:text-lime-400"
          >
            Platform console
          </Link>
        )}

        <div className="space-y-2 border-t border-white/[0.07] pt-3">
          <div className="flex items-center gap-2 px-1 text-[11px] text-ivory-500">
            {state === 'connected' ? (
              <>
                <Wifi size={12} className="text-lime-400" /> Live updates connected
              </>
            ) : state === 'connecting' ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Connecting…
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-amber-400" /> {state === 'unauthorized' ? 'Not authorised' : 'Reconnecting…'}
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="min-w-0">
              <span className="block truncate text-xs text-ivory-200">{user.name}</span>
              <span className="block truncate text-[10px] text-ivory-500">{user.email}</span>
            </span>
            <button
              onClick={signOut}
              className="rounded-lg p-1.5 text-ivory-500 transition hover:bg-white/5 hover:text-red-400"
              aria-label="Sign out"
            >
              {signingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            </button>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------- mobile header */}
      <div className="print:hidden sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.06] bg-ink-950/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-500 text-ink-950">
            <QrCode size={16} strokeWidth={2.5} />
          </span>
          <span className="font-display text-base text-ivory-100">
            {restaurants.find((r) => r.slug === activeSlug)?.name ?? 'Gallops'}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'flex h-2 w-2 rounded-full',
              state === 'connected' ? 'bg-lime-400' : state === 'connecting' ? 'bg-amber-400' : 'bg-red-400',
            )}
            aria-label={state}
          />
          <button onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-ivory-300" aria-label="Open menu">
            <MenuIcon size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="absolute right-0 top-0 flex h-full w-[78%] max-w-xs flex-col border-l border-white/10 bg-ink-900 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-ivory-300">Menu</p>
                <button onClick={() => setMenuOpen(false)} className="rounded-lg p-1.5 text-ivory-400" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 space-y-1">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm',
                      pathname.startsWith(item.href) ? 'bg-lime-500/15 text-lime-300' : 'text-ivory-200',
                    )}
                  >
                    <item.icon size={16} /> {item.label}
                  </Link>
                ))}
                {user.isPlatformAdmin && (
                  <Link
                    href="/platform"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-ivory-200"
                  >
                    <BarChart3 size={16} /> Platform console
                  </Link>
                )}
              </div>
              <div className="mt-auto space-y-3 border-t border-white/[0.07] pt-4">
                {restaurants.length > 1 && (
                  <div className="space-y-1">
                    <p className="px-1 text-[10px] uppercase tracking-wide text-ivory-500">Switch restaurant</p>
                    {restaurants.map((restaurant) => (
                      <button
                        key={restaurant.id}
                        onClick={() => switchRestaurant(restaurant.slug)}
                        className={clsx(
                          'block w-full rounded-lg px-3 py-2 text-left text-xs',
                          restaurant.slug === activeSlug ? 'bg-white/5 text-lime-400' : 'text-ivory-300',
                        )}
                      >
                        {restaurant.name}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-ivory-300"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------- content */}
      <main className="min-w-0 flex-1 pb-24 lg:pb-10">{children}</main>
    </div>
  );
}

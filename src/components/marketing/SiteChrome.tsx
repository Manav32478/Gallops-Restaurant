'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Instagram, Menu as MenuIcon, QrCode, X } from 'lucide-react';
import { clsx } from 'clsx';
import { BackToTop, CursorGlow, Noise, ScrollProgress, useScrollSpy } from './effects';

const NAV = [
  { href: '/#how-it-works', id: 'how-it-works', label: 'How it works' },
  { href: '/#tour', id: 'tour', label: 'Product tour' },
  { href: '/#features', id: 'features', label: 'Features' },
  { href: '/#menu', id: 'menu', label: 'Live menu' },
  { href: '/#pricing', id: 'pricing', label: 'Pricing' },
  { href: '/#faq', id: 'faq', label: 'FAQ' },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5 rounded-xl focus-ring">
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-lime-500 text-ink-950">
        <QrCode size={18} strokeWidth={2.5} />
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      </span>
      <span className="font-display text-lg leading-none tracking-tight text-ivory-100">
        Gallops
        {!compact && (
          <span className="ml-1.5 align-middle text-[10px] font-sans uppercase tracking-[0.18em] text-lime-400">
            OS
          </span>
        )}
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === '/';
  const ids = NAV.map((item) => item.id);
  const active = useScrollSpy(ids);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-lime-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
      >
        Skip to content
      </a>

      <header
        className={clsx(
          'sticky top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-ink-950/60'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map((item) => {
              const isActive = onHome && active === item.id;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'relative rounded-lg px-3 py-2 text-sm transition-colors focus-ring',
                    isActive ? 'text-lime-300' : 'text-ivory-300 hover:text-ivory-100',
                  )}
                >
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-lime-400"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-xl px-3.5 py-2 text-sm text-ivory-200 transition hover:bg-white/5 focus-ring sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/contact"
              className="rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-lime-400 focus-ring"
            >
              Book a demo
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl border border-white/10 p-2 text-ivory-200 transition hover:bg-white/5 focus-ring lg:hidden"
              aria-label="Open menu"
              aria-expanded={open}
            >
              <MenuIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* mobile sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[75] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="absolute inset-x-3 top-3 overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-900/95 p-5 shadow-lift"
              initial={reduced ? { opacity: 0 } : { y: -24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { y: -24, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/10 p-2 text-ivory-200 transition hover:bg-white/5 focus-ring"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="mt-5 grid gap-1" aria-label="Mobile">
                {NAV.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * index, duration: 0.25 }}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center justify-between rounded-2xl px-4 py-3 text-[15px] text-ivory-100 transition hover:bg-white/[0.05]"
                    >
                      {item.label}
                      <span className="text-ivory-600">→</span>
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/r/gallops/menu"
                  className="rounded-2xl bg-lime-500 px-4 py-3 text-center text-sm font-semibold text-ink-950"
                >
                  Open the live menu
                </Link>
                <Link
                  href="/login"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm text-ivory-100"
                >
                  Staff sign in
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* --------------------------------------------------------------- page effects */

/** Decorative, low-risk global effects. Marketing pages only. */
export function SiteEffects() {
  return (
    <>
      <ScrollProgress />
      <Noise opacity={0.35} />
      <CursorGlow />
      <BackToTop />
    </>
  );
}

/* -------------------------------------------------------------------- footer */

const FOOTER_LINKS = [
  {
    title: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/r/gallops/menu', label: 'Gallops live menu' },
      { href: '/register', label: 'Create a restaurant' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/contact', label: 'Contact' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms of service' },
      { href: '/login', label: 'Staff sign in' },
    ],
  },
];

export function SiteFooter({ phone = '+91 84690 07078', email = 'info@gallopsfoodplaza.in' }: { phone?: string; email?: string }) {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-ink-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-500/40 to-transparent" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory-400">
            A QR ordering and restaurant operations platform. Built in India, priced in rupees, designed for family
            restaurants, highway food plazas and multi-outlet groups.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-ivory-500">
            Gallops Restaurant, Ground Floor, Shree Siddh Ganesh Hospitality, Gandhi Bag Road, Near Dr. Bhutaksir
            Clinic, Shree Mandhata Circle, Mahuva, Gujarat 364290
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-ivory-300 transition hover:border-lime-500/30 hover:text-lime-300 focus-ring"
            >
              {phone}
            </a>
            <a
              href={`mailto:${email}`}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-ivory-300 transition hover:border-lime-500/30 hover:text-lime-300 focus-ring"
            >
              {email}
            </a>
            <a
              href="https://instagram.com/gallops_food_plaza_"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-ivory-300 transition hover:border-lime-500/30 hover:text-lime-300 focus-ring"
            >
              <Instagram size={13} /> Instagram
            </a>
          </div>
        </div>

        {FOOTER_LINKS.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ivory-500">{group.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ivory-300">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-lime-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.06] px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-xs text-ivory-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Gallops OS. Made in Gujarat for Indian restaurants.</p>
          <p>
            Menu data shown for Gallops Restaurant is imported from public listings and is awaiting owner
            verification.
          </p>
        </div>
      </div>
    </footer>
  );
}

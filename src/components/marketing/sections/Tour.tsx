'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BarChart3, ChefHat, ClipboardList, Smartphone } from 'lucide-react';
import { clsx } from 'clsx';
import {
  AnalyticsMock,
  DashboardMock,
  KitchenMock,
  PhoneMenuMock,
  TrackingMock,
} from '@/components/marketing/Mockups';
import { CheckList, Section, SectionHeading } from '@/components/marketing/primitives';
import { Reveal } from '@/components/ui/Reveal';

const TABS = [
  {
    id: 'guest',
    label: 'Guest',
    icon: Smartphone,
    title: 'A menu that feels like an app, without the install',
    body: 'One scan opens the table’s menu. Category chips, search, variant sheets, a persistent cart and server-priced totals — engineered for 320px screens and slow connections.',
    points: [
      'Table-scoped QR token; no sign-up, no password, no app store',
      'Variant groups and paid add-ons with per-item notes for the kitchen',
      'Totals recalculated on the server before checkout — never trusted from the phone',
      'Live tracking page after ordering, with web-push opt-in',
    ],
    Mock: () => (
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <PhoneMenuMock floating={false} />
        <TrackingMock />
      </div>
    ),
  },
  {
    id: 'reception',
    label: 'Reception',
    icon: ClipboardList,
    title: 'The counter sees the order before the guest sits down',
    body: 'A dense operational board driven by a persistent WebSocket connection. Accept, reject, progress, take payment — with sound alerts, filters and an audit trail on every action.',
    points: [
      'New orders flash in instantly with a sound cue and table context',
      'Guarded status transitions: new → confirmed → preparing → ready → completed',
      'Optimistic concurrency so two staff members can never double-process',
      'Payment capture is a separate, permission-controlled action',
    ],
    Mock: () => <DashboardMock />,
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    icon: ChefHat,
    title: 'A queue the kitchen can actually work',
    body: 'Preparation-only view with elapsed timers, item notes and one-tap progression. Kitchen staff can move the queue forward — and nothing else.',
    points: [
      'Elapsed-time cards that turn red as orders approach the prep target',
      'Item-level notes (“less spicy”, “pack the naan separately”) stay attached',
      'Role-scoped: kitchen cannot cancel, refund or change prices',
      'Works on a wall-mounted tablet or the existing counter PC',
    ],
    Mock: () => <KitchenMock />,
  },
  {
    id: 'owner',
    label: 'Owner',
    icon: BarChart3,
    title: 'Numbers you can take to the bank',
    body: 'Revenue, average order value, best sellers and hour-of-day demand computed from your own orders. No vanity metrics, no invented popularity scores.',
    points: [
      'Today / 7-day revenue, order count and average order value',
      'Best sellers and category mix to plan the next menu change',
      'Hour-of-day heat to staff the right shifts',
      'Menu provenance: every imported dish keeps its source and verification state',
    ],
    Mock: () => <AnalyticsMock />,
  },
] as const;

export function Tour() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const timer = setInterval(() => setActive((current) => (current + 1) % TABS.length), 8000);
    return () => clearInterval(timer);
  }, [reduced, paused]);

  const tab = TABS[active];

  return (
    <Section id="tour" className="border-y border-white/[0.06] bg-ink-900/40">
      <SectionHeading
        eyebrow="Product tour"
        title="Four screens, one flow — from the table to the till."
        description="Every screen below is a miniature of the real product, built with the same components and the same data. Pick a role to see what that person sees."
        align="center"
      />

      <div className="mt-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {/* tab bar */}
        <div
          role="tablist"
          aria-label="Product tour"
          className="mx-auto flex max-w-2xl flex-wrap justify-center gap-1.5 rounded-2xl border border-white/[0.07] bg-ink-950/60 p-1.5 backdrop-blur"
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') setActive((current) => (current + 1) % TABS.length);
            if (event.key === 'ArrowLeft') setActive((current) => (current - 1 + TABS.length) % TABS.length);
          }}
        >
          {TABS.map((item, index) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={active === index}
              aria-controls={`tour-panel-${item.id}`}
              id={`tour-tab-${item.id}`}
              onClick={() => setActive(index)}
              className={clsx(
                'relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-ring',
                active === index ? 'text-ink-950' : 'text-ivory-300 hover:text-ivory-100',
              )}
            >
              {active === index && (
                <motion.span
                  layoutId="tour-pill"
                  className="absolute inset-0 rounded-xl bg-lime-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <item.icon size={15} />
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* auto-advance progress */}
        {!paused && !reduced && (
          <div className="mx-auto mt-3 h-[2px] w-full max-w-2xl overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              key={active}
              className="h-full bg-lime-400/70"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 8, ease: 'linear' }}
            />
          </div>
        )}

        {/* panel */}
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${tab.id}-copy`}
              role="tabpanel"
              id={`tour-panel-${tab.id}`}
              aria-labelledby={`tour-tab-${tab.id}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -18 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <h3 className="font-display text-2xl leading-tight text-ivory-50 sm:text-3xl">{tab.title}</h3>
              <p className="mt-4 text-[1.02rem] leading-relaxed text-ivory-300">{tab.body}</p>
              <CheckList className="mt-6" items={[...tab.points]} />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${tab.id}-mock`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -16 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <tab.Mock />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Reveal delay={0.1} className="mt-10 text-center">
        <p className="text-xs text-ivory-500">
          Demonstration screens. Figures shown are illustrative samples, not live restaurant data.
        </p>
      </Reveal>
    </Section>
  );
}

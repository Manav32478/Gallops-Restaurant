'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BellRing,
  Database,
  Gauge,
  Languages,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { Section, SectionHeading } from '@/components/marketing/primitives';
import { Spotlight } from '@/components/marketing/effects';
import { QrSheetMock } from '@/components/marketing/Mockups';
import { Reveal, Stagger, StaggerItem } from '@/components/ui/Reveal';

const TILES = [
  {
    icon: QrCode,
    title: 'Table-level QR management',
    body: 'Generate, preview, download and print a code per table. Regenerating a code invalidates the old one instantly, and archived tables stop resolving.',
    className: 'lg:col-span-2',
    tone: 'lime' as const,
  },
  {
    icon: UtensilsCrossed,
    title: 'Menu control in seconds',
    body: 'Add dishes, set variants and paid add-ons, upload photos, mark sold out, reorder categories. Every change is live immediately — no deploy.',
    className: '',
    tone: 'sky' as const,
  },
  {
    icon: ShieldCheck,
    title: 'Server-side money',
    body: 'Prices, taxes and totals are recalculated from database values on every request. The client never sends an amount.',
    className: '',
    tone: 'lime' as const,
  },
  {
    icon: BellRing,
    title: 'Honest notifications',
    body: 'Push, in-app and optional WhatsApp / SMS / email. Each attempt is logged as sent, skipped or failed — nothing is claimed as delivered unless it was.',
    className: '',
    tone: 'ember' as const,
  },
  {
    icon: Lock,
    title: 'Roles & tenant isolation',
    body: 'Owner, manager, receptionist and kitchen capabilities enforced server-side. Every query is scoped by membership, never by a client-supplied restaurant id.',
    className: '',
    tone: 'lime' as const,
  },
  {
    icon: Languages,
    title: 'Built for India',
    body: 'INR-native integer money, GST basis points, Razorpay-ready webhooks and English / Gujarati / Hindi menu scaffolding.',
    className: '',
    tone: 'sky' as const,
  },
  {
    icon: Gauge,
    title: 'Fast on a phone',
    body: 'Server-rendered menus, skeleton states, lazy imagery and GPU-friendly motion. Designed at 320px first, then scaled up.',
    className: '',
    tone: 'lime' as const,
  },
  {
    icon: Database,
    title: 'Relational by design',
    body: 'PostgreSQL with real foreign keys, cascade rules and indexes on the hot paths — orders by tenant and status, menu by category, QR tokens, idempotency keys.',
    className: '',
    tone: 'ember' as const,
  },
];

export function FeatureBento() {
  const reduced = useReducedMotion();
  return (
    <Section id="features" className="border-y border-white/[0.06] bg-ink-900/40">
      <SectionHeading
        eyebrow={<span className="flex items-center gap-1.5"><Sparkles size={12} /> Platform</span>}
        title="Everything a modern floor needs, on one stack."
        description="Not a landing page bolted onto a form. Menu, ordering, kitchen, payments, staff and analytics share one database and one permission model."
        align="center"
      />

      <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => (
          <StaggerItem key={tile.title} className={tile.className}>
            <Spotlight tone={tile.tone} className="h-full">
              <motion.div
                whileHover={reduced ? undefined : { y: -4 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="flex h-full flex-col p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-500/20 bg-lime-500/10 text-lime-400">
                  <tile.icon size={20} />
                </span>
                <h3 className="mt-4 text-base font-medium text-ivory-50">{tile.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ivory-400">{tile.body}</p>
              </motion.div>
            </Spotlight>
          </StaggerItem>
        ))}

        {/* wide tile with the printable QR sheet */}
        <StaggerItem className="lg:col-span-3">
          <Spotlight className="h-full">
            <div className="grid items-center gap-6 p-6 lg:grid-cols-[1fr_0.9fr]">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-500/20 bg-lime-500/10 text-lime-400">
                  <QrCode size={20} />
                </span>
                <h3 className="mt-4 text-lg font-medium text-ivory-50">Print-ready QR sheets</h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-ivory-400">
                  Generate an A4 sheet with one card per table, print it, laminate it. The printable view strips all
                  app chrome so the cards come out clean, and each code can be rotated without reprinting the rest.
                </p>
                <Link
                  href="/features"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-lime-400 transition hover:text-lime-300"
                >
                  See the full feature list <ArrowRight size={15} />
                </Link>
              </div>
              <QrSheetMock />
            </div>
          </Spotlight>
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.1} className="mt-10">
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 text-xs leading-relaxed text-ivory-400">
          <strong className="text-ivory-200">Plain-speaking note.</strong> Online payments, web push, email, SMS and
          WhatsApp are fully wired but stay switched off until you add your own provider keys. The product never
          pretends a message was sent or a payment succeeded — unconfigured channels are logged as skipped, and an
          order is only marked paid after signature or webhook verification.
        </div>
      </Reveal>
    </Section>
  );
}

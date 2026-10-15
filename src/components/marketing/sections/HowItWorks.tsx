'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BellRing, ChefHat, ClipboardList, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section, SectionHeading } from '@/components/marketing/primitives';
import { ScrollLine } from '@/components/marketing/effects';
import { Reveal } from '@/components/ui/Reveal';

const STEPS = [
  {
    icon: QrCode,
    title: 'Guest scans the table code',
    body: 'The URL carries only an unpredictable table identifier — no login, no personal data, no admin access. Rotate or disable a code in one click.',
    meta: 'Unpredictable 12-byte token per table',
  },
  {
    icon: ClipboardList,
    title: 'Order is priced on the server',
    body: 'Live database prices, modifier deltas, tax and service charge are recalculated server-side. Idempotent creation means a double tap never becomes a double order.',
    meta: 'Integer paise · GST basis points · idempotency key',
  },
  {
    icon: ChefHat,
    title: 'Counter and kitchen react instantly',
    body: 'The order is broadcast over Socket.IO to the reception board and kitchen display at the same moment it is written to the database.',
    meta: 'Rooms per restaurant and per order token',
  },
  {
    icon: BellRing,
    title: 'Guest is told when it is ready',
    body: 'The tracking page updates live and pushes “your order is ready”. Every notification attempt is logged — delivered, or skipped with the reason.',
    meta: 'Web push · in-app · optional SMS / WhatsApp / email',
  },
];

export function HowItWorks() {
  const reduced = useReducedMotion();
  return (
    <Section id="how-it-works">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="self-start lg:sticky lg:top-28">
          <SectionHeading
            eyebrow="How it works"
            title="From a scan to “ready for pickup” in four moves."
            description="No tablets to hand out, no app to install, no new hardware on the table. A printed QR card per table is the only physical change to your floor."
          />
          <Reveal delay={0.1}>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/features">
                <Button variant="outline">
                  All features <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="ghost">Talk to us</Button>
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="relative pl-10">
          <ScrollLine />
          <ol className="space-y-5">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <Reveal delay={index * 0.05}>
                  <motion.div
                    whileHover={reduced ? undefined : { x: 4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className="relative rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-lime-500/25"
                  >
                    <span className="absolute -left-10 top-6 flex h-8 w-8 items-center justify-center rounded-full border border-lime-500/30 bg-ink-950 text-xs font-semibold text-lime-400">
                      {index + 1}
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-500/20 bg-lime-500/10 text-lime-400">
                      <step.icon size={20} />
                    </span>
                    <h3 className="mt-4 text-lg font-medium text-ivory-50">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ivory-300">{step.body}</p>
                    <p className="mt-3 inline-flex rounded-lg bg-white/[0.04] px-2 py-1 text-[11px] text-ivory-400">
                      {step.meta}
                    </p>
                  </motion.div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}

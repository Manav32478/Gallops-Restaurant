'use client';

import Link from 'next/link';
import { ArrowRight, Check, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { formatMoney } from '@/lib/money';
import { Section, SectionHeading } from '@/components/marketing/primitives';
import { Spotlight } from '@/components/marketing/effects';
import { Reveal, Stagger, StaggerItem } from '@/components/ui/Reveal';

export type PlanCard = {
  code: string;
  name: string;
  description: string | null;
  priceMinor: number;
  maxTables: number;
  maxStaff: number;
  maxOrdersPerMonth: number;
  features: string[];
  highlighted: boolean;
};

export function PricingTeaser({ plans, billingMode }: { plans: PlanCard[]; billingMode: string }) {
  return (
    <Section id="pricing">
      <SectionHeading
        eyebrow="Pricing"
        title="Plans in rupees. No seat maths, no surprises."
        description="Every plan includes the guest ordering experience, the reception board, the kitchen display, menu control and analytics. Higher tiers raise limits and unlock online payments, coupons and API access."
        align="center"
      />

      <Stagger className="mt-12 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <StaggerItem key={plan.code}>
            <Spotlight tone={plan.highlighted ? 'lime' : 'sky'} className="h-full">
              <div
                className={clsx(
                  'flex h-full flex-col p-6',
                  plan.highlighted && 'bg-gradient-to-b from-lime-500/[0.07] to-transparent',
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl text-ivory-50">{plan.name}</h3>
                  {plan.highlighted && (
                    <span className="rounded-full bg-lime-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-950">
                      Popular
                    </span>
                  )}
                </div>
                {plan.description && <p className="mt-2 text-sm text-ivory-400">{plan.description}</p>}

                <p className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl text-lime-400">{formatMoney(plan.priceMinor)}</span>
                  <span className="text-sm text-ivory-500">/ year</span>
                </p>
                <p className="mt-1 text-[11px] text-ivory-500">
                  ≈ {formatMoney(Math.round(plan.priceMinor / 12))} / month · excl. GST
                </p>

                <ul className="mt-6 space-y-2.5 text-sm text-ivory-300">
                  <li className="flex gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0 text-lime-400" />
                    Up to {plan.maxTables} tables · {plan.maxStaff} staff
                  </li>
                  <li className="flex gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0 text-lime-400" />
                    {plan.maxOrdersPerMonth.toLocaleString('en-IN')} orders / month
                  </li>
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <Check size={15} className="mt-0.5 shrink-0 text-lime-400" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/contact"
                  className={clsx(
                    'mt-7 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition focus-ring',
                    plan.highlighted
                      ? 'bg-lime-500 text-ink-950 hover:bg-lime-400'
                      : 'border border-white/10 bg-white/[0.04] text-ivory-100 hover:bg-white/[0.08]',
                  )}
                >
                  {plan.highlighted ? 'Start with Growth' : `Choose ${plan.name}`} <ArrowRight size={15} />
                </Link>
              </div>
            </Spotlight>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal delay={0.1}>
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs leading-relaxed text-amber-200/90">
            <Info size={15} className="mt-0.5 shrink-0" />
            Billing runs in{' '}
            <strong className="font-semibold">{billingMode === 'live' ? 'live' : 'development'}</strong> mode. Plan and
            subscription records are real, but no payment provider is charged until you connect one — the console says
            so rather than pretending invoices were raised.
          </p>
          <Link
            href="/pricing"
            className="text-sm font-medium text-lime-400 transition hover:text-lime-300"
          >
            Compare every limit and feature →
          </Link>
        </div>
      </Reveal>
    </Section>
  );
}

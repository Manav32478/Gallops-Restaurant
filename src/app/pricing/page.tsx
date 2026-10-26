import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Info, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/money';
import { SiteHeader, SiteFooter, SiteEffects } from '@/components/marketing/SiteChrome';
import { PageHero, Section, SectionHeading } from '@/components/marketing/primitives';
import { Button } from '@/components/ui/button';
import { Reveal, Stagger, StaggerItem } from '@/components/ui/Reveal';
import { Spotlight } from '@/components/marketing/effects';
import { Faq } from '@/components/marketing/Faq';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Three INR plans for Indian restaurants: table QR ordering, reception desk, kitchen display, analytics. Online payments and higher limits on the upper tiers.',
};

const MATRIX: { label: string; starter: string | boolean; growth: string | boolean; pro: string | boolean }[] = [
  { label: 'Table QR codes & printable sheet', starter: true, growth: true, pro: true },
  { label: 'Guest ordering + live tracking', starter: true, growth: true, pro: true },
  { label: 'Reception desk (realtime)', starter: true, growth: true, pro: true },
  { label: 'Menu, categories & sold-out control', starter: true, growth: true, pro: true },
  { label: 'Kitchen display', starter: false, growth: true, pro: true },
  { label: 'Advanced analytics', starter: false, growth: true, pro: true },
  { label: 'Coupons & promotions', starter: false, growth: true, pro: true },
  { label: 'Online payments (Razorpay)', starter: false, growth: false, pro: true },
  { label: 'API access & custom branding', starter: false, growth: false, pro: true },
  { label: 'Priority support', starter: false, growth: false, pro: true },
];

export default async function PricingPage() {
  const plans = await prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sortOrder: 'asc' } });
  const billingMode = process.env.PLATFORM_BILLING_MODE ?? 'development';

  return (
    <div className="relative min-h-screen bg-ink-950">
      <SiteEffects />
      <SiteHeader />

      <main id="main">
        <PageHero
          eyebrow="Pricing"
          title={<>Priced in rupees. Billed per restaurant.</>}
          description="Every plan is billed once a year in rupees and includes the guest ordering experience, the reception board, menu control and analytics. Higher tiers raise limits and unlock the kitchen display, coupons, online payments and API access."
        />

        <Section className="pt-12">
          <Stagger className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const highlighted = plan.code === 'GROWTH';
              const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
              return (
                <StaggerItem key={plan.id}>
                  <Spotlight tone={highlighted ? 'lime' : 'sky'} className="h-full">
                    <div
                      className={clsx(
                        'flex h-full flex-col p-6 sm:p-7',
                        highlighted && 'bg-gradient-to-b from-lime-500/[0.07] to-transparent',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h2 className="font-display text-2xl text-ivory-50">{plan.name}</h2>
                        {highlighted && (
                          <span className="rounded-full bg-lime-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-950">
                            Popular
                          </span>
                        )}
                      </div>
                      {plan.description && <p className="mt-2 text-sm text-ivory-400">{plan.description}</p>}

                      <p className="mt-6 flex items-baseline gap-1.5">
                        <span className="font-display text-4xl text-lime-400">{formatMoney(plan.priceMinor)}</span>
                        <span className="text-sm text-ivory-500">/ year</span>
                      </p>
                      <p className="mt-1 text-[11px] text-ivory-500">
                        ≈ {formatMoney(Math.round(plan.priceMinor / 12))} / month · excluding GST · billed yearly in INR
                      </p>

                      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: 'Tables', value: plan.maxTables },
                          { label: 'Staff', value: plan.maxStaff },
                          { label: 'Orders/mo', value: plan.maxOrdersPerMonth.toLocaleString('en-IN') },
                        ].map((limit) => (
                          <div key={limit.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                            <p className="text-sm font-semibold text-ivory-100">{limit.value}</p>
                            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ivory-500">{limit.label}</p>
                          </div>
                        ))}
                      </div>

                      <ul className="mt-6 space-y-2.5 text-sm text-ivory-300">
                        {features.map((feature) => (
                          <li key={feature} className="flex gap-2.5">
                            <Check size={15} className="mt-0.5 shrink-0 text-lime-400" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <Link
                        href="/contact"
                        className={clsx(
                          'mt-7 inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition focus-ring',
                          highlighted
                            ? 'bg-lime-500 text-ink-950 hover:bg-lime-400'
                            : 'border border-white/10 bg-white/[0.04] text-ivory-100 hover:bg-white/[0.08]',
                        )}
                      >
                        {highlighted ? 'Start with Growth' : `Choose ${plan.name}`}
                      </Link>
                    </div>
                  </Spotlight>
                </StaggerItem>
              );
            })}
          </Stagger>

          <Reveal delay={0.1}>
            <div className="mx-auto mt-8 flex max-w-3xl items-start gap-2.5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3.5 text-xs leading-relaxed text-amber-200/90">
              <Info size={16} className="mt-0.5 shrink-0" />
              <p>
                Billing runs in{' '}
                <strong className="font-semibold">{billingMode === 'live' ? 'live' : 'development'}</strong> mode.
                Plans and subscriptions are real records, but no payment provider is charged until you connect one —
                the platform console says so instead of pretending invoices were raised. Switch{' '}
                <code className="text-amber-100">PLATFORM_BILLING_MODE=live</code> once your provider keys are set.
              </p>
            </div>
          </Reveal>
        </Section>

        <Section id="compare" className="border-y border-white/[0.06] bg-ink-900/40">
          <SectionHeading
            eyebrow="Compare"
            title="What is in each plan"
            description="The same code runs every tier — a plan raises limits and unlocks modules. Nothing is artificially crippled."
            align="center"
          />
          <Reveal delay={0.05}>
            <div className="mt-10 overflow-x-auto rounded-3xl border border-white/[0.07] bg-white/[0.02] thin-scroll">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] text-xs uppercase tracking-wide text-ivory-500">
                    <th scope="col" className="px-5 py-4 font-medium">Feature</th>
                    {plans.map((plan) => (
                      <th
                        key={plan.id}
                        scope="col"
                        className={clsx('px-5 py-4 text-center font-semibold', plan.code === 'GROWTH' ? 'text-lime-300' : 'text-ivory-300')}
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row) => (
                    <tr key={row.label} className="border-b border-white/[0.04] last:border-0">
                      <th scope="row" className="px-5 py-3.5 font-normal text-ivory-300">
                        {row.label}
                      </th>
                      {([row.starter, row.growth, row.pro] as (string | boolean)[]).map((value, index) => (
                        <td key={index} className="px-5 py-3.5 text-center">
                          {typeof value === 'boolean' ? (
                            value ? (
                              <Check size={16} className="mx-auto text-lime-400" />
                            ) : (
                              <Minus size={16} className="mx-auto text-ivory-600" />
                            )
                          ) : (
                            <span className="text-ivory-200">{value}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </Section>

        <Section id="faq">
          <SectionHeading
            eyebrow="Questions"
            title="Pricing, plainly"
            description="One yearly invoice per restaurant, in rupees. GST is added at invoice time once billing is live."
            align="center"
          />
          <div className="mt-8 flex justify-center">
            <Link href="/contact">
              <Button size="lg">Talk to us about your floor</Button>
            </Link>
          </div>
          <Reveal delay={0.05} className="mt-12">
            <Faq />
          </Reveal>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}

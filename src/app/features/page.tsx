import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { SiteHeader, SiteFooter, SiteEffects } from '@/components/marketing/SiteChrome';
import { PageHero, Section, SectionHeading, CheckList } from '@/components/marketing/primitives';
import { Button } from '@/components/ui/button';
import { Reveal, Stagger, StaggerItem } from '@/components/ui/Reveal';
import { Aurora, GridBackdrop, Spotlight } from '@/components/marketing/effects';
import {
  AnalyticsMock,
  DashboardMock,
  KitchenMock,
  PhoneMenuMock,
  QrSheetMock,
  TrackingMock,
} from '@/components/marketing/Mockups';
import { Faq } from '@/components/marketing/Faq';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Table QR codes, a realtime reception desk, kitchen display, ready notifications, menu control, analytics, roles and tenant isolation — one stack for the whole floor.',
};

const GROUPS = [
  {
    id: 'guests',
    eyebrow: 'For guests',
    title: 'Ordering that feels like an app, without the install',
    body: 'One scan and the table’s menu is open. Category chips, search, variant sheets, a persistent cart and server-priced totals — engineered for 320px screens and patchy signal.',
    points: [
      'Table-scoped QR token: no sign-up, no password, no app store',
      'Variant groups and paid add-ons with per-item notes for the kitchen',
      'Live tracking page after checkout with a status timeline',
      'Web-push opt-in for the “your order is ready” moment',
      'Add-to-home-screen support so it behaves like a native app',
    ],
    Mock: () => (
      <div className="flex flex-col items-center gap-6 lg:flex-row">
        <PhoneMenuMock floating={false} />
        <TrackingMock />
      </div>
    ),
  },
  {
    id: 'counter',
    eyebrow: 'For the counter',
    title: 'Orders land before the guest sits back down',
    body: 'A dense operational board driven by a persistent WebSocket connection, with sound alerts, filters, guarded transitions and an audit trail on every action.',
    points: [
      'Instant new-order alerts with table, items and notes',
      'New → confirmed → preparing → ready → completed, with blocked shortcuts',
      'Optimistic concurrency so two staff can never double-process',
      'Payment capture is a separate, permission-controlled action',
      'Connection indicator with automatic reconnection and backfill',
    ],
    Mock: () => <DashboardMock />,
  },
  {
    id: 'kitchen',
    eyebrow: 'For the kitchen',
    title: 'A queue the kitchen can actually work',
    body: 'Preparation-only view with elapsed timers and one-tap progression. Kitchen staff move the queue forward — and nothing else.',
    points: [
      'Elapsed-time cards that escalate as orders approach the prep target',
      'Item-level notes stay attached to the ticket',
      'Role-scoped: kitchen cannot cancel, refund or change prices',
      'Runs on a wall-mounted tablet or the existing counter PC',
    ],
    Mock: () => <KitchenMock />,
  },
  {
    id: 'owner',
    eyebrow: 'For the owner',
    title: 'Numbers you can take to the bank',
    body: 'Revenue, average order value, best sellers and hour-of-day demand computed from your own orders — and a printable QR sheet for the floor.',
    points: [
      'Today / 7-day revenue, order count and average order value',
      'Best sellers and category mix to plan the next menu change',
      'Hour-of-day heat to staff the right shifts',
      'Per-dish provenance: source URL and verification state',
      'A4 printable table QR sheet with clean print styles',
    ],
    Mock: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsMock />
        <QrSheetMock />
      </div>
    ),
  },
];

const RELIABILITY = [
  'PostgreSQL with real foreign keys, cascade rules and indexes on the hot paths',
  'Server-side pricing: the client never sends an amount',
  'Idempotent order creation so a double tap is never a double order',
  'Signed session cookies (http-only, SameSite=Lax, Secure in production) and rate-limited sign-in',
  'Notification attempts logged as sent, skipped or failed — with the reason',
  'Razorpay signature verification and signed webhooks before anything is marked paid',
];

export default function FeaturesPage() {
  return (
    <div className="relative min-h-screen bg-ink-950">
      <SiteEffects />
      <SiteHeader />

      <main id="main">
        <PageHero
          eyebrow={<span className="flex items-center gap-1.5"><Sparkles size={12} /> Features</span>}
          title={<>One stack for the whole floor</>}
          description="Guests, counter, kitchen and owner share one database and one permission model — so a price change is a price change everywhere, instantly."
        >
          <Link href="/r/gallops/menu">
            <Button size="lg">Open the live menu</Button>
          </Link>
          <Link href="/contact">
            <Button size="lg" variant="secondary">
              Book a demo
            </Button>
          </Link>
        </PageHero>

        {GROUPS.map((group, index) => (
          <Section
            key={group.id}
            id={group.id}
            className={index % 2 === 1 ? 'border-y border-white/[0.06] bg-ink-900/40' : ''}
          >
            <div
              className={`grid items-center gap-10 lg:grid-cols-2 ${
                index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
              }`}
            >
              <Reveal className={index % 2 === 1 ? 'lg:order-2' : ''}>
                <SectionHeading eyebrow={group.eyebrow} title={group.title} description={group.body} />
                <CheckList className="mt-6" items={group.points} />
              </Reveal>
              <Reveal delay={0.1} className={index % 2 === 1 ? 'lg:order-1' : ''}>
                <group.Mock />
              </Reveal>
            </div>
          </Section>
        ))}

        <Section id="reliability" className="border-y border-white/[0.06] bg-ink-900/40">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-8 sm:p-12">
            <Aurora orbs={2} className="opacity-50" />
            <GridBackdrop sweep={false} className="opacity-50" />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_1fr]">
              <div>
                <SectionHeading
                  eyebrow="Reliability"
                  title="Built like the till depends on it."
                  description="QR ordering sits between your guests and your money. The boring parts are deliberate."
                />
                <Link href="/contact" className="mt-7 inline-block">
                  <Button variant="outline">
                    Ask us anything <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>
              <Stagger className="grid gap-3 sm:grid-cols-2">
                {RELIABILITY.map((item) => (
                  <StaggerItem key={item}>
                    <Spotlight className="h-full">
                      <p className="p-5 text-sm leading-relaxed text-ivory-300">{item}</p>
                    </Spotlight>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>
        </Section>

        <Section id="faq">
          <SectionHeading
            eyebrow="Questions"
            title="Straight answers"
            description="Including what is not switched on yet, and what we refuse to fake."
            align="center"
          />
          <Reveal delay={0.05} className="mt-10">
            <Faq />
          </Reveal>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}

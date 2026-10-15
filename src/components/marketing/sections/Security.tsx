'use client';

import { FileLock2, KeyRound, ReceiptText, ServerCog, ShieldCheck, Users } from 'lucide-react';
import { Section, SectionHeading, CheckList } from '@/components/marketing/primitives';
import { Spotlight } from '@/components/marketing/effects';
import { Reveal } from '@/components/ui/Reveal';

const GUARANTEES = [
  {
    icon: ShieldCheck,
    title: 'Tenant isolation, server-side',
    body: 'The restaurant id always comes from the caller’s membership record — never from a request body, header or query parameter. Cross-tenant reads and writes are refused.',
  },
  {
    icon: KeyRound,
    title: 'Sessions, not shortcuts',
    body: 'Signed JWT session cookies: http-only, SameSite=Lax, Secure in production. Passwords are bcrypt-hashed, and sign-in is rate-limited per IP.',
  },
  {
    icon: ReceiptText,
    title: 'Payments that cannot be faked',
    body: 'An order is only marked paid after Razorpay signature verification or a signed webhook. With payments disabled the UI says so and falls back to pay at the counter.',
  },
  {
    icon: Users,
    title: 'Least-privilege roles',
    body: 'Kitchen can move the queue and nothing else. Reception cannot edit the menu. Only owners and managers touch settings, staff and billing.',
  },
  {
    icon: FileLock2,
    title: 'Audit trail',
    body: 'Status changes record who did what and when. Notification attempts are logged with their outcome, so “did the guest get told?” has an answer.',
  },
  {
    icon: ServerCog,
    title: 'Your data, your database',
    body: 'Self-hostable on any Node host with PostgreSQL. Nothing is shipped to a third-party analytics or CRM service; uploads go to your own storage bucket.',
  },
];

const SNIPPET = `// Every tenant-scoped query uses the membership-derived id.
const ctx = await requireTenant(slug);          // 403 if not a member

const order = await prisma.order.findFirst({
  where: { id, restaurantId: ctx.restaurant.id },   // ← tenant in the WHERE
  include: ORDER_INCLUDE,
});

if (!order) return fail(404, 'ORDER_NOT_FOUND', 'Order not found.');`;

export function Security() {
  return (
    <Section id="security" className="border-y border-white/[0.06] bg-ink-900/40">
      <SectionHeading
        eyebrow="Trust & reliability"
        title="Engineering you can show your accountant."
        description="QR ordering sits between your guests and your money, so the boring parts are deliberate: where the tenant boundary is, who may change a status, and what counts as proof of payment."
        align="center"
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GUARANTEES.map((item, index) => (
          <Reveal key={item.title} delay={index * 0.04}>
            <Spotlight className="h-full">
              <div className="flex h-full flex-col p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-500/20 bg-lime-500/10 text-lime-400">
                  <item.icon size={20} />
                </span>
                <h3 className="mt-4 text-base font-medium text-ivory-50">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ivory-400">{item.body}</p>
              </div>
            </Spotlight>
          </Reveal>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Reveal>
          <div className="rounded-3xl border border-white/[0.07] bg-ink-950/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-400">The tenant boundary</p>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07] bg-black/50 p-4 text-[11px] leading-relaxed text-ivory-300 thin-scroll">
              <code>{SNIPPET}</code>
            </pre>
            <p className="mt-3 text-xs text-ivory-500">
              From <code className="text-ivory-400">src/app/api/dashboard/[slug]/orders/[id]/route.ts</code> — the same
              pattern the acceptance suite attacks with a second tenant.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="h-full rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-400">Verified by tests</p>
            <CheckList
              className="mt-4"
              items={[
                'Second tenant cannot read or mutate another tenant’s orders (403)',
                'Kitchen role cannot skip the queue or capture payments',
                'Anonymous callers get no dashboard data',
                'Duplicate order submissions are deduplicated by idempotency key',
                'Invalid table tokens and tracking tokens are rejected',
                'Prices are recomputed server-side; client totals are ignored',
              ]}
            />
            <p className="mt-5 text-xs leading-relaxed text-ivory-500">
              Run them yourself: <code className="text-ivory-400">npm test</code> (64 checks) and{' '}
              <code className="text-ivory-400">node scripts/realtime-test.mjs</code> (9 checks).
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

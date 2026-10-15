'use client';

import Link from 'next/link';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';
import { Aurora, GradientFrame, Particles } from '@/components/marketing/effects';
import { DemoForm } from '@/components/marketing/DemoForm';
import { Section } from '@/components/marketing/primitives';
import { Reveal } from '@/components/ui/Reveal';

export function Cta({
  phone,
  email,
  address,
  hours,
}: {
  phone: string | null;
  email: string | null;
  address: string;
  hours: string;
}) {
  return (
    <Section id="demo" className="relative overflow-hidden">
      <AuruaGuard>
        <Aurora orbs={2} className="opacity-60" />
        <Particles count={14} />
      </AuruaGuard>

      <Reveal>
        <GradientFrame rounded="rounded-[2.25rem]">
          <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_0.9fr] lg:gap-14">
            <div>
              <h2 className="font-display text-[2rem] leading-[1.08] text-ivory-50 sm:text-[2.6rem]">
                Put your menu in your guests' hands.
              </h2>
              <p className="mt-4 max-w-lg text-[1.02rem] leading-relaxed text-ivory-300">
                Bring your own menu card, your floor plan and your tax settings — we will import, verify and print the
                table codes. Most restaurants are live the same week.
              </p>

              <dl className="mt-8 space-y-3 text-sm text-ivory-300">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-lime-400" />
                  <dd>
                    {address}
                    <span className="mt-1 block text-xs text-ivory-500">{hours}</span>
                  </dd>
                </div>
                {phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="shrink-0 text-lime-400" />
                    <dd>
                      <a href={`tel:${phone.replace(/\s/g, '')}`} className="transition hover:text-lime-400">
                        {phone}
                      </a>
                    </dd>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="shrink-0 text-lime-400" />
                    <dd>
                      <a href={`mailto:${email}`} className="transition hover:text-lime-400">
                        {email}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/r/gallops/menu"
                  className="inline-flex items-center gap-2 rounded-2xl bg-lime-500 px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-lime-400 focus-ring"
                >
                  Try the live menu <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-ivory-100 transition hover:bg-white/[0.08] focus-ring"
                >
                  Sign in to the demo
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.07] bg-ink-950/70 p-5 sm:p-6">
              <p className="text-sm font-semibold text-ivory-100">Request a walkthrough</p>
              <p className="mt-1 text-xs text-ivory-500">
                We will call you back with a live demo using your own menu.
              </p>
              <div className="mt-5">
                <DemoForm />
              </div>
            </div>
          </div>
        </GradientFrame>
      </Reveal>
    </Section>
  );
}

/** Keeps the decorative layers out of the accessibility tree and above the card. */
function AuruaGuard({ children }: { children: React.ReactNode }) {
  return <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">{children}</div>;
}

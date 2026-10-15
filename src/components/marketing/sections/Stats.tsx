'use client';

import { CountUp, Marquee, Spotlight } from '@/components/marketing/effects';
import { Section } from '@/components/marketing/primitives';

export type StatTone = 'lime' | 'sky' | 'ember';

export function Stats({
  items,
  note,
}: {
  items: { label: string; value: number; suffix?: string; hint: string }[];
  note?: string;
}) {
  return (
    <Section className="py-12 sm:py-16">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <Spotlight key={item.label} tone={(['lime', 'sky', 'ember'] as StatTone[])[index % 3]}>
            <div className="p-6">
              <p className="font-display text-4xl text-lime-400 sm:text-[2.6rem]">
                <CountUp value={item.value} suffix={item.suffix ?? ''} />
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ivory-300">{item.label}</p>
              <p className="mt-2 text-xs leading-relaxed text-ivory-500">{item.hint}</p>
            </div>
          </Spotlight>
        ))}
      </div>
      {note && <p className="mt-5 text-center text-[11px] text-ivory-500">{note}</p>}
    </Section>
  );
}

const STACK = [
  'Next.js 15',
  'React 19',
  'TypeScript (strict)',
  'PostgreSQL',
  'Prisma',
  'Socket.IO',
  'Zod',
  'Tailwind CSS',
  'Framer Motion',
  'Razorpay (optional)',
  'Web Push / VAPID',
  'Node.js',
];

export function StackMarquee() {
  return (
    <Section className="py-10">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-ivory-500">
        Built with
      </p>
      <Marquee speed={40} className="mt-6">
        {STACK.map((item) => (
          <span
            key={item}
            className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-2.5 text-sm text-ivory-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
            {item}
          </span>
        ))}
      </Marquee>
    </Section>
  );
}

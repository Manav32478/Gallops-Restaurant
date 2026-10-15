'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { Marquee } from '@/components/marketing/effects';
import { Section, SectionHeading } from '@/components/marketing/primitives';

export type MarqueeDish = {
  id: string;
  name: string;
  priceMinor: number;
  category: string;
  isFeatured: boolean;
};

function DishCard({ dish }: { dish: MarqueeDish }) {
  const href = `/api/placeholder?name=${encodeURIComponent(dish.name)}&category=${encodeURIComponent(dish.category)}`;
  return (
    <Link
      href="/r/gallops/menu"
      className="group flex w-[260px] shrink-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2.5 transition hover:border-lime-500/30 hover:bg-white/[0.05]"
    >
      <img
        src={href}
        alt=""
        width={56}
        height={56}
        loading="lazy"
        className="h-14 w-14 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ivory-100">{dish.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ivory-500">
          <span className="truncate">{dish.category}</span>
          {dish.isFeatured && (
            <span className="shrink-0 rounded-full bg-lime-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-lime-300">
              Pick
            </span>
          )}
        </p>
        <p className="mt-1 text-[13px] font-semibold text-lime-400 tabular">{formatMoney(dish.priceMinor)}</p>
      </div>
      <ArrowRight
        size={15}
        className="mr-1 shrink-0 text-ivory-600 transition group-hover:translate-x-0.5 group-hover:text-lime-400"
      />
    </Link>
  );
}

export function MenuMarquee({ dishes }: { dishes: MarqueeDish[] }) {
  if (!dishes.length) return null;
  const half = Math.ceil(dishes.length / 2);
  const rowA = dishes.slice(0, half);
  const rowB = dishes.slice(half);

  return (
    <Section id="menu" className="overflow-hidden">
      <SectionHeading
        eyebrow="Live menu"
        title="Real dishes, real prices, straight from the database."
        description="This is the actual Gallops Restaurant menu as the kitchen serves it — every price below is the same value the guest app charges. Menu data is imported from public listings and is awaiting owner verification before publishing."
        align="center"
      />

      <div className="mt-10 space-y-4">
        <Marquee speed={58}>{rowA.map((dish) => <DishCard key={dish.id} dish={dish} />)}</Marquee>
        <Marquee speed={64} reverse>{rowB.map((dish) => <DishCard key={dish.id} dish={dish} />)}</Marquee>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/r/gallops/menu"
          className="inline-flex items-center gap-2 rounded-2xl border border-lime-500/40 bg-lime-500/10 px-5 py-3 text-sm font-semibold text-lime-300 transition hover:bg-lime-500/20 focus-ring"
        >
          Open the full menu <ArrowRight size={16} />
        </Link>
      </div>
    </Section>
  );
}

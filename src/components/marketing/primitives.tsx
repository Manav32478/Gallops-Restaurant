import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '@/components/ui/Reveal';

/** Page section wrapper with consistent rhythm and an optional heading block. */
export function Section({
  id,
  children,
  className,
  width = 'max-w-6xl',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  width?: string;
}) {
  return (
    <section id={id} className={clsx('relative scroll-mt-24 py-16 sm:py-24', className)}>
      <div className={clsx('mx-auto px-4 sm:px-6', width)}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border border-lime-500/25 bg-lime-500/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-lime-300',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  id,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  id?: string;
}) {
  return (
    <Reveal className={clsx(align === 'center' && 'mx-auto max-w-3xl text-center', className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        id={id}
        className={clsx(
          'mt-4 font-display text-[1.9rem] leading-[1.1] tracking-tight text-ivory-50 sm:text-4xl lg:text-[2.7rem]',
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-ivory-300 sm:text-[1.05rem]">{description}</p>
      )}
    </Reveal>
  );
}

/** Tick-list used under feature columns. */
export function CheckList({
  items,
  className,
  tone = 'lime',
}: {
  items: ReactNode[];
  className?: string;
  tone?: 'lime' | 'ivory';
}) {
  return (
    <ul className={clsx('space-y-3 text-sm text-ivory-300', className)}>
      {items.map((item, index) => (
        <li key={index} className="flex gap-2.5">
          <span
            className={clsx(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
              tone === 'lime' ? 'bg-lime-500/15 text-lime-400' : 'bg-white/[0.06] text-ivory-300',
            )}
          >
            <Check size={12} strokeWidth={3} />
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Compact hero used by the inner marketing pages. */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-b border-white/[0.06]">
      <div className="absolute inset-0 bg-[radial-glow] opacity-70" />
      <div className="absolute inset-0 bg-grid-faint bg-[size:56px_56px] opacity-30 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
      <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-5 font-display text-[2.1rem] leading-[1.08] tracking-tight text-ivory-50 sm:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ivory-300 sm:text-lg">{description}</p>
        {children && <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>}
      </div>
    </div>
  );
}

/** Small labelled metric, used in the trust/stats rows. */
export function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="font-display text-2xl text-lime-400 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-ivory-400">{label}</p>
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-ivory-500">{hint}</p>}
    </div>
  );
}

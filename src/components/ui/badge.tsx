import { clsx } from 'clsx';

const TONES = {
  lime: 'bg-lime-500/15 text-lime-400 border-lime-500/25',
  neutral: 'bg-white/5 text-ivory-300 border-white/10',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  red: 'bg-chili/15 text-red-300 border-chili/25',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  blue: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
} as const;

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

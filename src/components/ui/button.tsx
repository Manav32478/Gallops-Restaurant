'use client';
import { forwardRef } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-lime-500 text-ink-950 hover:bg-lime-400 shadow-[0_10px_30px_-12px_rgba(163,230,53,0.75)] font-semibold',
  secondary: 'bg-white/10 text-ivory-100 hover:bg-white/15 border border-white/10',
  ghost: 'bg-transparent text-ivory-200 hover:bg-white/5',
  outline: 'border border-lime-500/40 text-lime-400 hover:bg-lime-500/10',
  danger: 'bg-chili/90 text-white hover:bg-chili',
  success: 'bg-emerald-500 text-ink-950 hover:bg-emerald-400 font-semibold',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl',
  md: 'h-11 px-5 text-sm rounded-2xl',
  lg: 'h-13 px-7 text-base rounded-2xl py-3.5',
  icon: 'h-10 w-10 rounded-full',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 transition-all duration-200 focus-ring select-none active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
});

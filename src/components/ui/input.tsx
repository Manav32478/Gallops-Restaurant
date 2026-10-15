import { clsx } from 'clsx';
import { useId } from 'react';

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string) => React.ReactNode;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-wide text-ivory-400">
        {label} {required && <span className="text-lime-400">*</span>}
      </label>
      {children(id)}
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ivory-500">{hint}</p>
      ) : null}
    </div>
  );
}

const base =
  'w-full rounded-xl border border-white/10 bg-ink-850/70 px-3.5 py-2.5 text-sm text-ivory-100 placeholder:text-ivory-500/60 outline-none transition focus:border-lime-500/60 focus:ring-2 focus:ring-lime-500/20';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(base, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(base, 'min-h-[84px] resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(base, 'appearance-none pr-8', className)} {...props} />;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left transition hover:border-white/20 disabled:opacity-50"
      aria-pressed={checked}
    >
      <span>
        <span className="block text-sm text-ivory-100">{label}</span>
        {description && <span className="block text-xs text-ivory-500">{description}</span>}
      </span>
      <span
        className={clsx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-lime-500' : 'bg-white/15',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}

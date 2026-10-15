import { clsx } from 'clsx';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lime-400">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg text-ivory-100">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ivory-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

import { clsx } from 'clsx';

export function GlassCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('glass rounded-3xl shadow-card', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SoftCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('glass-soft rounded-2xl', className)} {...props}>
      {children}
    </div>
  );
}

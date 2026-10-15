import { formatMoney } from '@/lib/money';

export function Price({
  minor,
  currency = 'INR',
  className,
}: {
  minor: number;
  currency?: string;
  className?: string;
}) {
  return <span className={className}>{formatMoney(minor, currency)}</span>;
}

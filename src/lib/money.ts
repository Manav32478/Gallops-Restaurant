/**
 * Money is handled exclusively in integer MINOR units (paise for INR).
 * Never use floats for currency arithmetic.
 */

export const CURRENCY_SYMBOL: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
};

export function rupeesToPaise(value: number): number {
  return Math.round(value * 100);
}

export function formatMoney(minor: number, currency = 'INR', opts?: { compact?: boolean }): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `;
  const value = minor / 100;
  const hasFraction = minor % 100 !== 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(value);
  return `${symbol}${formatted}`;
}

export function formatMoneyPlain(minor: number): string {
  return (minor / 100).toFixed(minor % 100 === 0 ? 0 : 2);
}

/** Apply basis points (100 bp = 1%) with banker-safe rounding. */
export function applyBp(amountMinor: number, bp: number): number {
  return Math.round((amountMinor * bp) / 10_000);
}

/** Convert a decimal percent (e.g. 5) to basis points (500). */
export function percentToBp(percent: number): number {
  return Math.round(percent * 100);
}

export function bpToPercent(bp: number): number {
  return bp / 100;
}

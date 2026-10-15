import { applyBp } from '@/lib/money';

export type PricedModifier = { groupName: string; groupKind: string; optionName: string; priceDeltaMinor: number; quantity?: number };
export type PricedLineInput = {
  menuItemId: string;
  name: string;
  imageUrl?: string | null;
  servingSize?: string | null;
  basePriceMinor: number;
  quantity: number;
  modifiers: PricedModifier[];
  notes?: string | null;
};
export type PricedLine = PricedLineInput & { unitPriceMinor: number; totalMinor: number };
export type PriceBreakdown = {
  lines: PricedLine[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  serviceChargeMinor: number;
  totalMinor: number;
};

export type PricingConfig = {
  taxBp: number;
  serviceChargeBp: number;
  taxInclusive: boolean;
  minOrderMinor?: number;
};

/**
 * THE single source of truth for money. Runs on the server only;
 * client-side numbers are display-only and are never trusted.
 */
export function priceOrder(
  lines: PricedLineInput[],
  config: PricingConfig,
  discountMinor = 0,
): PriceBreakdown {
  const priced: PricedLine[] = lines.map((line) => {
    const modifierTotal = line.modifiers.reduce(
      (sum, m) => sum + m.priceDeltaMinor * (m.quantity ?? 1),
      0,
    );
    const unitPriceMinor = line.basePriceMinor + modifierTotal;
    return { ...line, unitPriceMinor, totalMinor: unitPriceMinor * line.quantity };
  });

  const subtotalMinor = priced.reduce((sum, line) => sum + line.totalMinor, 0);
  const discount = Math.min(Math.max(discountMinor, 0), subtotalMinor);
  const taxable = subtotalMinor - discount;
  const serviceChargeMinor = applyBp(taxable, config.serviceChargeBp);
  const taxMinor = config.taxInclusive ? 0 : applyBp(taxable, config.taxBp);
  const totalMinor = taxable + taxMinor + serviceChargeMinor;

  return {
    lines: priced,
    subtotalMinor,
    discountMinor: discount,
    taxMinor,
    serviceChargeMinor,
    totalMinor,
  };
}

export function couponDiscount(
  coupon: { type: string; valueBp: number; valueMinor: number; minSubtotalMinor: number } | null,
  subtotalMinor: number,
): number {
  if (!coupon) return 0;
  if (subtotalMinor < coupon.minSubtotalMinor) return 0;
  if (coupon.type === 'PERCENT') return applyBp(subtotalMinor, coupon.valueBp);
  return Math.min(coupon.valueMinor, subtotalMinor);
}

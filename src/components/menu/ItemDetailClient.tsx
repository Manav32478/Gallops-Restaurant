'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Info, Minus, Plus, ShoppingBag } from 'lucide-react';
import { clsx } from 'clsx';
import { DishImage } from './DishImage';
import { useCart, type CartOption } from './CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatMoney } from '@/lib/money';
import { Badge } from '@/components/ui/badge';

export type ItemDetail = {
  id: string;
  name: string;
  description: string | null;
  servingSize: string | null;
  imageUrl: string | null;
  imageIsPlaceholder: boolean;
  priceMinor: number;
  isVeg: boolean | null;
  isVegan: boolean | null;
  isJain: boolean | null;
  spiceLevel: number | null;
  isAvailable: boolean;
  categoryName: string;
  verificationStatus: string;
  sourceName: string | null;
  groups: {
    id: string;
    name: string;
    kind: 'VARIANT' | 'ADDON';
    type: 'SINGLE' | 'MULTI';
    required: boolean;
    minSelect: number;
    maxSelect: number;
    options: { id: string; name: string; priceDeltaMinor: number; isDefault: boolean }[];
  }[];
  related: { id: string; name: string; priceMinor: number; imageUrl: string | null }[];
};

export function ItemDetailClient({
  item,
  slug,
  currency,
  tableToken,
}: {
  item: ItemDetail;
  slug: string;
  currency: string;
  tableToken?: string;
}) {
  const { add, count, subtotalMinor } = useCart();
  const { push } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const group of item.groups) {
      const defaultOption = group.options.find((o) => o.isDefault);
      initial[group.id] = defaultOption ? [defaultOption.id] : [];
    }
    return initial;
  });

  const chosen: CartOption[] = useMemo(() => {
    const out: CartOption[] = [];
    for (const group of item.groups) {
      for (const optionId of selected[group.id] ?? []) {
        const option = group.options.find((o) => o.id === optionId);
        if (option) out.push({ groupId: group.id, optionId, name: option.name, priceDeltaMinor: option.priceDeltaMinor });
      }
    }
    return out;
  }, [item.groups, selected]);

  const extras = chosen.reduce((sum, o) => sum + o.priceDeltaMinor, 0);
  const unit = item.priceMinor + extras;
  const total = unit * quantity;

  function toggle(groupId: string, optionId: string, type: 'SINGLE' | 'MULTI', max: number) {
    setError(null);
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (type === 'SINGLE') return { ...prev, [groupId]: current[0] === optionId ? [] : [optionId] };
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      if (current.length >= max) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  function addToCart() {
    if (!item.isAvailable) {
      push({ tone: 'error', title: 'Sold out', body: `${item.name} is not available right now.` });
      return;
    }
    for (const group of item.groups) {
      const length = (selected[group.id] ?? []).length;
      if (group.required && length < Math.max(1, group.minSelect)) {
        setError(`Choose an option for "${group.name}".`);
        return;
      }
    }
    add({
      itemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      servingSize: item.servingSize,
      basePriceMinor: item.priceMinor,
      quantity,
      notes: notes.trim() || undefined,
      options: chosen,
    });
    push({ tone: 'success', title: `${item.name} added`, body: `${quantity} added to your order.` });
  }

  const suffix = tableToken ? `?table=${tableToken}` : '';

  return (
    <div className="pb-32">
      <div className="relative">
        <DishImage
          src={item.imageUrl}
          name={item.name}
          category={item.categoryName}
          isPlaceholder={item.imageIsPlaceholder}
          ratio="4 / 3"
          priority
          className="w-full"
        />
        <Link
          href={`/r/${slug}/menu${suffix}`}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-ink-950/70 text-ivory-100 backdrop-blur-md transition hover:bg-ink-950/90"
          aria-label="Back to menu"
        >
          <ArrowLeft size={18} />
        </Link>
        {!item.isAvailable && (
          <span className="absolute right-4 top-4 rounded-full border border-chili/40 bg-ink-950/85 px-3 py-1.5 text-xs text-red-300">
            Sold out
          </span>
        )}
      </div>

      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ivory-500">{item.categoryName}</p>
            <h1 className="mt-1.5 font-display text-2xl leading-tight text-ivory-50">{item.name}</h1>
          </div>
          <p className="shrink-0 font-display text-2xl text-lime-400">{formatMoney(item.priceMinor, currency)}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {item.servingSize && <Badge tone="neutral">{item.servingSize}</Badge>}
          {item.isVeg === true && <Badge tone="emerald">Veg</Badge>}
          {item.isVegan === true && <Badge tone="emerald">Vegan</Badge>}
          {item.isJain === true && <Badge tone="amber">Jain</Badge>}
          {item.verificationStatus === 'NEEDS_REVIEW' && <Badge tone="amber">Awaiting confirmation</Badge>}
        </div>

        {item.description && <p className="mt-4 text-sm leading-relaxed text-ivory-300">{item.description}</p>}

        {item.groups.map((group) => (
          <div key={group.id} className="mt-6">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-ivory-100">
                {group.name} {group.required && <span className="text-lime-400">*</span>}
              </p>
              <p className="text-[11px] text-ivory-500">
                {group.type === 'SINGLE' ? 'Choose one' : `Choose up to ${group.maxSelect}`}
              </p>
            </div>
            <div className="mt-2.5 space-y-2">
              {group.options.map((option) => {
                const isSelected = (selected[group.id] ?? []).includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => toggle(group.id, option.id, group.type, group.maxSelect)}
                    aria-pressed={isSelected}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition',
                      isSelected ? 'border-lime-500/50 bg-lime-500/[0.09]' : 'border-white/10 bg-white/[0.02]',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={clsx(
                          'flex h-4 w-4 items-center justify-center border',
                          group.type === 'SINGLE' ? 'rounded-full' : 'rounded',
                          isSelected ? 'border-lime-500 bg-lime-500' : 'border-white/25',
                        )}
                      />
                      <span className="text-sm text-ivory-100">{option.name}</span>
                    </span>
                    {option.priceDeltaMinor > 0 && (
                      <span className="text-xs text-ivory-300">+{formatMoney(option.priceDeltaMinor, currency)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-6">
          <p className="text-sm font-medium text-ivory-100">Preparation instructions</p>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value.slice(0, 300))}
            rows={2}
            placeholder="Less spicy, no onion, extra crispy…"
            className="mt-2 w-full rounded-xl border border-white/10 bg-ink-850/70 px-3.5 py-2.5 text-sm text-ivory-100 placeholder:text-ivory-500/60 outline-none transition focus:border-lime-500/60"
          />
        </div>

        {item.related.length > 0 && (
          <div className="mt-8">
            <p className="text-sm font-medium text-ivory-100">Goes well with</p>
            <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
              {item.related.map((relatedItem) => (
                <Link
                  key={relatedItem.id}
                  href={`/r/${slug}/item/${relatedItem.id}${suffix}`}
                  className="w-[130px] shrink-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]"
                >
                  <DishImage src={relatedItem.imageUrl} name={relatedItem.name} ratio="1 / 1" className="w-full" />
                  <div className="p-2">
                    <p className="line-clamp-2 text-[11px] leading-snug text-ivory-200">{relatedItem.name}</p>
                    <p className="mt-1 text-xs font-semibold text-lime-400">{formatMoney(relatedItem.priceMinor, currency)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {item.verificationStatus === 'NEEDS_REVIEW' && (
          <p className="mt-6 flex items-start gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 text-[11px] leading-relaxed text-ivory-500">
            <Info size={13} className="mt-0.5 shrink-0" />
            This dish was imported from {item.sourceName ?? 'a public listing'} and is awaiting confirmation by the
            restaurant. Dietary and allergen details are shown only once verified.
          </p>
        )}
      </div>

      {error && <p className="px-4 pt-3 text-xs text-red-400">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-ink-950/95 px-4 py-3 backdrop-blur-xl safe-bottom">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-ivory-300" aria-label="Decrease">
              <Minus size={16} />
            </button>
            <motion.span key={quantity} initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="tabular w-6 text-center text-sm">
              {quantity}
            </motion.span>
            <button onClick={() => setQuantity((q) => Math.min(50, q + 1))} className="px-3 py-2.5 text-ivory-300" aria-label="Increase">
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={addToCart}
            disabled={!item.isAvailable}
            className="flex flex-1 items-center justify-between rounded-2xl bg-lime-500 px-4 py-3 text-sm font-semibold text-ink-950 transition hover:bg-lime-400 disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={16} /> Add to order
            </span>
            <span>{formatMoney(total, currency)}</span>
          </button>
        </div>
        {count > 0 && (
          <Link
            href={`/r/${slug}/cart${suffix}`}
            className="mx-auto mt-2 block max-w-md text-center text-[11px] text-ivory-400"
          >
            {count} item{count === 1 ? '' : 's'} in your order · {formatMoney(subtotalMinor, currency)}
          </Link>
        )}
      </div>
    </div>
  );
}

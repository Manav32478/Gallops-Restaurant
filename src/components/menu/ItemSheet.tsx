'use client';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, MessageSquarePlus, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DishImage } from './DishImage';
import { useCart, type CartOption } from './CartProvider';
import { formatMoney } from '@/lib/money';

export type SheetItem = {
  id: string;
  name: string;
  description?: string | null;
  servingSize?: string | null;
  imageUrl?: string | null;
  imageIsPlaceholder?: boolean;
  priceMinor: number;
  isVeg?: boolean | null;
  isVegan?: boolean | null;
  isJain?: boolean | null;
  spiceLevel?: number | null;
  isAvailable?: boolean;
  categoryName?: string;
  variantGroups: {
    id: string;
    name: string;
    kind: 'VARIANT' | 'ADDON';
    type: 'SINGLE' | 'MULTI';
    required: boolean;
    minSelect: number;
    maxSelect: number;
    options: { id: string; name: string; priceDeltaMinor: number; isDefault: boolean }[];
  }[];
};

export function ItemSheet({
  item,
  open,
  onClose,
  currency,
  onAdded,
}: {
  item: SheetItem | null;
  open: boolean;
  onClose: () => void;
  currency: string;
  onAdded?: (quantity: number) => void;
}) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const groups = item?.variantGroups ?? [];

  const initialise = (next: SheetItem) => {
    const defaults: Record<string, string[]> = {};
    for (const group of next.variantGroups) {
      const defaultOption = group.options.find((o) => o.isDefault);
      if (defaultOption) defaults[group.id] = [defaultOption.id];
      else if (group.required && group.type === 'SINGLE' && group.options.length) defaults[group.id] = [group.options[0]!.id];
      else defaults[group.id] = [];
    }
    setSelected(defaults);
    setQuantity(1);
    setNotes('');
    setError(null);
  };

  const chosenOptions: CartOption[] = useMemo(() => {
    if (!item) return [];
    const out: CartOption[] = [];
    for (const group of groups) {
      for (const optionId of selected[group.id] ?? []) {
        const option = group.options.find((o) => o.id === optionId);
        if (option) {
          out.push({ groupId: group.id, optionId, name: option.name, priceDeltaMinor: option.priceDeltaMinor });
        }
      }
    }
    return out;
  }, [item, groups, selected]);

  if (!item) return null;
  const dish = item;

  const extras = chosenOptions.reduce((sum, o) => sum + o.priceDeltaMinor, 0);
  const unitPrice = item.priceMinor + extras;
  const total = unitPrice * quantity;

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

  function submit() {
    for (const group of dish.variantGroups) {
      const count = (selected[group.id] ?? []).length;
      if (group.required && count < Math.max(1, group.minSelect)) {
        setError(`Choose an option for "${group.name}".`);
        return;
      }
    }
    add({
      itemId: dish.id,
      name: dish.name,
      imageUrl: dish.imageUrl ?? null,
      servingSize: dish.servingSize ?? null,
      basePriceMinor: dish.priceMinor,
      quantity,
      notes: notes.trim() || undefined,
      options: chosenOptions,
    });
    onAdded?.(quantity);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={null}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-2.5 text-ivory-300 transition hover:text-lime-400"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <motion.span key={quantity} initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="tabular w-6 text-center text-sm text-ivory-100">
              {quantity}
            </motion.span>
            <button
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              className="px-3 py-2.5 text-ivory-300 transition hover:text-lime-400"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>
          <Button onClick={submit} className="flex-1" size="lg">
            Add {quantity} · {formatMoney(total, currency)}
          </Button>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onAnimationStart={() => initialise(item)}
        >
          <DishImage
            src={item.imageUrl}
            name={item.name}
            category={item.categoryName}
            isPlaceholder={item.imageIsPlaceholder}
            ratio="16 / 9"
            priority
            className="rounded-2xl"
          />

          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-xl leading-snug text-ivory-50">{item.name}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {item.servingSize && <Badge tone="neutral">{item.servingSize}</Badge>}
                {item.isVeg === true && <Badge tone="emerald">Veg</Badge>}
                {item.isVegan === true && <Badge tone="emerald">Vegan</Badge>}
                {item.isJain === true && <Badge tone="amber">Jain</Badge>}
              </div>
            </div>
            <p className="shrink-0 font-display text-xl text-lime-400">{formatMoney(item.priceMinor, currency)}</p>
          </div>

          {item.description && <p className="mt-3 text-sm leading-relaxed text-ivory-400">{item.description}</p>}

          {groups.map((group) => (
            <div key={group.id} className="mt-5">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium text-ivory-100">
                  {group.name}
                  {group.required && <span className="ml-1 text-lime-400">*</span>}
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
                      className={clsx(
                        'flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition',
                        isSelected
                          ? 'border-lime-500/50 bg-lime-500/[0.09]'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20',
                      )}
                      aria-pressed={isSelected}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={clsx(
                            'flex h-4 w-4 items-center justify-center border transition',
                            group.type === 'SINGLE' ? 'rounded-full' : 'rounded',
                            isSelected ? 'border-lime-500 bg-lime-500' : 'border-white/25',
                          )}
                        >
                          {isSelected && (
                            <span className={clsx('bg-ink-950', group.type === 'SINGLE' ? 'h-1.5 w-1.5 rounded-full' : 'h-2 w-2 rounded-[2px]')} />
                          )}
                        </span>
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

          <div className="mt-5">
            <p className="flex items-center gap-1.5 text-sm font-medium text-ivory-100">
              <MessageSquarePlus size={14} className="text-ivory-400" /> Preparation instructions
            </p>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value.slice(0, 300))}
              placeholder="Less spicy, no onion, extra crispy…"
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-850/70 px-3.5 py-2.5 text-sm text-ivory-100 placeholder:text-ivory-500/60 outline-none transition focus:border-lime-500/60"
              rows={2}
            />
            <p className="mt-1 text-[11px] text-ivory-500">{notes.length}/300</p>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-xl border border-chili/30 bg-chili/10 px-3 py-2 text-xs text-red-300">
              {error}
            </motion.p>
          )}

          <p className="mt-4 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-ivory-500">
            <Info size={13} className="mt-0.5 shrink-0" />
            Allergen and dietary details are shown only when the restaurant has verified them. Speak to your server if
            you have an allergy.
          </p>
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}

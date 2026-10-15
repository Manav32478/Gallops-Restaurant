'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useCart, lineTotal } from '@/components/menu/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { DishImage } from '@/components/menu/DishImage';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';

type Priced = {
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  serviceChargeMinor: number;
  totalMinor: number;
  currency: string;
  taxBp: number;
  serviceChargeBp: number;
  minOrderMinor: number;
  issues: { itemId: string; reason: string }[];
  lines: { menuItemId: string; name: string; quantity: number; unitPriceMinor: number; totalMinor: number }[];
};

export default function CartPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params?.slug ?? 'gallops';
  const table = searchParams.get('table') ?? undefined;
  const suffix = table ? `?table=${table}` : '';
  const { items, updateQuantity, remove, clear, count, subtotalMinor } = useCart();
  const { push } = useToast();
  const [priced, setPriced] = useState<Priced | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const payload = useMemo(
    () => ({
      slug,
      items: items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        optionIds: item.options.map((o) => o.optionId),
      })),
    }),
    [items, slug],
  );

  // Re-price against the server whenever the cart changes.
  useEffect(() => {
    if (items.length === 0) {
      setPriced(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
          body: JSON.stringify(payload),
        });
        const json = await response.json();
        if (cancelled) return;
        if (json.ok) {
          setPriced(json.data);
          setError(null);
        } else {
          setError(json.error?.message ?? 'Could not refresh your total.');
        }
      } catch {
        if (!cancelled) setError('You appear to be offline. Reconnecting…');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [payload, items.length]);

  const blocked = priced?.issues?.some((issue) => issue.reason !== 'no-longer-available' && issue.reason !== 'sold-out');

  if (count === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lime-400">
          <ShoppingBag size={26} />
        </div>
        <h1 className="mt-5 font-display text-2xl text-ivory-50">Your order is empty</h1>
        <p className="mt-2 text-sm text-ivory-400">Browse the menu and add your first dish.</p>
        <Link href={`/r/${slug}/menu${suffix}`} className="mt-6">
          <Button size="lg">
            <ArrowLeft size={16} /> Back to the menu
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-40 pt-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/r/${slug}/menu${suffix}`}
          className="flex items-center gap-1.5 text-sm text-ivory-300 transition hover:text-lime-400"
        >
          <ArrowLeft size={16} /> Keep browsing
        </Link>
        <button
          onClick={() => {
            clear();
            push({ tone: 'info', title: 'Cart cleared' });
          }}
          className="flex items-center gap-1.5 text-xs text-ivory-500 transition hover:text-red-400"
        >
          <Trash2 size={13} /> Clear
        </button>
      </div>

      <h1 className="mt-4 font-display text-2xl text-ivory-50">Your order</h1>
      {table && (
        <p className="mt-1 text-xs text-ivory-400">
          Table <span className="text-lime-400">{table.slice(0, 10)}</span> · confirm the table number at checkout
        </p>
      )}

      {priced?.issues?.length ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <p>
            {priced.issues.some((i) => i.reason === 'sold-out')
              ? 'One or more dishes just sold out. Remove them to continue.'
              : 'Some dishes are no longer on the menu and will be skipped.'}
          </p>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const line = priced?.lines.find((l) => l.menuItemId === item.itemId);
            const issue = priced?.issues.find((i) => i.itemId === item.itemId);
            return (
              <motion.div
                key={item.key}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3"
              >
                <DishImage
                  src={item.imageUrl}
                  name={item.name}
                  ratio="1 / 1"
                  className="h-16 w-16 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ivory-100">{item.name}</p>
                  {item.options.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-ivory-400">{item.options.map((o) => o.name).join(' · ')}</p>
                  )}
                  {item.notes && <p className="mt-0.5 text-[11px] italic text-ivory-500">“{item.notes}”</p>}
                  {issue && <p className="mt-1 text-[11px] text-red-400">{issue.reason.replace(/-/g, ' ')}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04]">
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        className="px-2 py-1 text-ivory-300"
                        aria-label={`Decrease ${item.name}`}
                      >
                        <Minus size={13} />
                      </button>
                      <motion.span key={item.quantity} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="tabular w-6 text-center text-xs">
                        {item.quantity}
                      </motion.span>
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        className="px-2 py-1 text-ivory-300"
                        aria-label={`Increase ${item.name}`}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-lime-400">
                      {formatMoney(line?.totalMinor ?? lineTotal(item), priced?.currency ?? 'INR')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => remove(item.key)}
                  className="self-start rounded-lg p-1.5 text-ivory-500 transition hover:bg-white/5 hover:text-red-400"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-6 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between text-ivory-300">
            <dt>Subtotal</dt>
            <dd>{formatMoney(priced?.subtotalMinor ?? subtotalMinor, priced?.currency ?? 'INR')}</dd>
          </div>
          {!!priced?.discountMinor && (
            <div className="flex justify-between text-lime-400">
              <dt>Discount</dt>
              <dd>−{formatMoney(priced.discountMinor, priced.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between text-ivory-300">
            <dt>Taxes {priced ? `(${(priced.taxBp / 100).toFixed(1)}%)` : ''}</dt>
            <dd>{formatMoney(priced?.taxMinor ?? 0, priced?.currency ?? 'INR')}</dd>
          </div>
          {!!priced?.serviceChargeMinor && (
            <div className="flex justify-between text-ivory-300">
              <dt>Service charge</dt>
              <dd>{formatMoney(priced.serviceChargeMinor, priced.currency)}</dd>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-white/10 pt-3 text-base font-semibold text-ivory-50">
            <dt>Total payable</dt>
            <dd className="text-lime-400">{formatMoney(priced?.totalMinor ?? subtotalMinor, priced?.currency ?? 'INR')}</dd>
          </div>
        </dl>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        {loading && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ivory-500">
            <Loader2 size={12} className="animate-spin" /> Recalculating with the kitchen…
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-ink-950/95 px-4 py-3 backdrop-blur-xl safe-bottom">
        <div className="mx-auto max-w-md">
          <Link href={`/r/${slug}/checkout${suffix}`} className="block">
            <Button size="lg" className="w-full" disabled={Boolean(blocked)}>
              Continue to checkout
            </Button>
          </Link>
          <p className="mt-2 text-center text-[11px] text-ivory-500">
            Prices are confirmed by the restaurant when you place the order.
          </p>
        </div>
      </div>
    </div>
  );
}

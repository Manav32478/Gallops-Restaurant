'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { useCart } from '@/components/menu/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Field } from '@/components/ui/input';
import { formatMoney } from '@/lib/money';

const PAYMENT_LABEL: Record<string, { title: string; body: string; icon: typeof Wallet }> = {
  CASH_AT_COUNTER: {
    title: 'Pay at the counter',
    body: 'Settle the bill with the cashier when you leave. No card needed now.',
    icon: Wallet,
  },
  PAY_AT_TABLE: {
    title: 'Pay at the table',
    body: 'A server will bring the bill to your table.',
    icon: CreditCard,
  },
  RAZORPAY: {
    title: 'Pay online (UPI / card)',
    body: 'Only available once the restaurant has configured its payment gateway.',
    icon: CreditCard,
  },
};

export default function CheckoutPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { push } = useToast();
  const slug = params?.slug ?? 'gallops';
  const table = searchParams.get('table') ?? '';
  const suffix = table ? `?table=${table}` : '';
  const { items, count, clear } = useCart();

  const [priced, setPriced] = useState<{
    subtotalMinor: number;
    discountMinor: number;
    taxMinor: number;
    serviceChargeMinor: number;
    totalMinor: number;
    currency: string;
    paymentMethods: string[];
    minOrderMinor: number;
  } | null>(null);
  const [method, setMethod] = useState('CASH_AT_COUNTER');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => {
    if (typeof window === 'undefined') return '';
    const existing = window.sessionStorage.getItem('gallops:idem');
    if (existing) return existing;
    const value = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem('gallops:idem', value);
    return value;
  });

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

  useEffect(() => {
    if (count === 0) return;
    let cancelled = false;
    fetch('/api/cart/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.ok) {
          setPriced(json.data);
          const methods = json.data.paymentMethods as string[];
          if (methods?.length && !methods.includes(method)) setMethod(methods[0]!);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, count]);

  async function placeOrder() {
    setError(null);
    if (!table) {
      setError('We could not detect your table. Please scan the QR code on your table again.');
      return;
    }
    setPending(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify({
          slug,
          table,
          idempotencyKey,
          paymentMethod: method,
          guestName: guestName.trim() || null,
          guestPhone: guestPhone.trim() || null,
          notes: notes.trim() || null,
          items: items.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            notes: item.notes ?? null,
            optionIds: item.options.map((o) => o.optionId),
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json?.error?.message ?? 'Could not place your order. Please try again.');
      }
      // Fresh key for the next order.
      window.sessionStorage.removeItem('gallops:idem');
      clear();
      router.push(`/r/${slug}/order/${json.data.order.trackingToken}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not place your order.';
      setError(message);
      push({ tone: 'error', title: 'Order not placed', body: message });
    } finally {
      setPending(false);
    }
  }

  if (count === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-2xl text-ivory-50">Nothing to check out</h1>
        <p className="mt-2 text-sm text-ivory-400">Add a dish to your order first.</p>
        <Link href={`/r/${slug}/menu${suffix}`} className="mt-6">
          <Button>Browse the menu</Button>
        </Link>
      </div>
    );
  }

  const methods = priced?.paymentMethods?.length ? priced.paymentMethods : ['CASH_AT_COUNTER'];

  return (
    <div className="mx-auto max-w-md px-4 pb-40 pt-4">
      <Link
        href={`/r/${slug}/cart${suffix}`}
        className="flex items-center gap-1.5 text-sm text-ivory-300 transition hover:text-lime-400"
      >
        <ArrowLeft size={16} /> Back to cart
      </Link>

      <h1 className="mt-4 font-display text-2xl text-ivory-50">Checkout</h1>

      <div className="mt-5 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ivory-300">Table</p>
          {table ? (
            <p className="text-sm font-semibold text-lime-400">Confirmed from QR</p>
          ) : (
            <p className="text-sm font-semibold text-red-400">Not detected</p>
          )}
        </div>
        {!table && (
          <p className="mt-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-xs text-amber-200">
            Please scan the QR code on your table so the kitchen knows where to bring your food.
          </p>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3">
          <p className="text-sm text-ivory-300">Items</p>
          <p className="text-sm text-ivory-100">{count}</p>
        </div>
      </div>

      <div className="mt-4 space-y-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
        <Field label="Your name (optional)" hint="So the staff can call you when the order is ready.">
          {(id) => (
            <Input id={id} value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="e.g. Priya" />
          )}
        </Field>
        <Field label="Phone (optional)" hint="Only used if you ask for WhatsApp or SMS updates.">
          {(id) => (
            <Input
              id={id}
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="+91 98765 43210"
              inputMode="tel"
            />
          )}
        </Field>
        <Field label="Special instructions (optional)">
          {(id) => (
            <Textarea
              id={id}
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder="Serve everything together, no cutlery needed…"
            />
          )}
        </Field>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm text-ivory-300">Payment method</p>
        <div className="space-y-2">
          {methods.map((option) => {
            const meta = PAYMENT_LABEL[option] ?? PAYMENT_LABEL.CASH_AT_COUNTER!;
            const Icon = meta.icon;
            const isSelected = method === option;
            return (
              <button
                key={option}
                onClick={() => setMethod(option)}
                aria-pressed={isSelected}
                className={clsx(
                  'flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition',
                  isSelected ? 'border-lime-500/50 bg-lime-500/[0.08]' : 'border-white/10 bg-white/[0.02] hover:border-white/20',
                )}
              >
                <Icon size={17} className={clsx('mt-0.5 shrink-0', isSelected ? 'text-lime-400' : 'text-ivory-400')} />
                <span className="min-w-0">
                  <span className="block text-sm text-ivory-100">{meta.title}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-ivory-500">{meta.body}</span>
                </span>
              </button>
            );
          })}
        </div>
        {method === 'RAZORPAY' && (
          <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-[11px] text-ivory-400">
            Online payments are enabled only after the restaurant configures Razorpay. Until then, choose pay at the
            counter.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between text-ivory-300">
            <dt>Subtotal</dt>
            <dd>{formatMoney(priced?.subtotalMinor ?? 0, priced?.currency ?? 'INR')}</dd>
          </div>
          {!!priced?.discountMinor && (
            <div className="flex justify-between text-lime-400">
              <dt>Discount</dt>
              <dd>−{formatMoney(priced.discountMinor, priced.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between text-ivory-300">
            <dt>Taxes</dt>
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
            <dd className="text-lime-400">{formatMoney(priced?.totalMinor ?? 0, priced?.currency ?? 'INR')}</dd>
          </div>
        </dl>
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ivory-500">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-lime-400" />
          Your total is calculated on the restaurant server from live menu prices. Nothing is charged in this app unless
          the restaurant has enabled online payments.
        </p>
      </div>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-xl border border-chili/30 bg-chili/10 px-3 py-2.5 text-xs text-red-300">
          {error}
        </motion.p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-ink-950/95 px-4 py-3 backdrop-blur-xl safe-bottom">
        <div className="mx-auto max-w-md">
          <Button size="lg" className="w-full" onClick={placeOrder} loading={pending} disabled={!table}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Place order · {formatMoney(priced?.totalMinor ?? 0, priced?.currency ?? 'INR')}
          </Button>
          <p className="mt-2 text-center text-[11px] text-ivory-500">
            You can track your order on the next screen.
          </p>
        </div>
      </div>
    </div>
  );
}

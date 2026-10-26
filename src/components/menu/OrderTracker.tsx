'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { SOCKET_ENABLED, SOCKET_URL, socketOptions } from '@/lib/socket-client';
import {
  BellRing,
  BellOff,
  Check,
  ChefHat,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Receipt,
  ShoppingBag,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';

export type TrackedOrder = {
  code: string;
  trackingToken: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  paymentStatus: string;
  tableCode: string | null;
  guestName: string | null;
  notes: string | null;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  serviceChargeMinor: number;
  totalMinor: number;
  currency: string;
  placedAt: string;
  confirmedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  estimatedReadyAt: string | null;
  items: {
    id: string;
    name: string;
    imageUrl: string | null;
    servingSize: string | null;
    quantity: number;
    notes: string | null;
    unitPriceMinor: number;
    totalMinor: number;
    modifiers: { groupName: string; optionName: string; priceDeltaMinor: number }[];
  }[];
};

const STEPS = [
  { key: 'PLACED', label: 'Order placed', icon: Receipt },
  { key: 'CONFIRMED', label: 'Confirmed', icon: Check },
  { key: 'PREPARING', label: 'Preparing', icon: ChefHat },
  { key: 'READY', label: 'Ready for pickup', icon: BellRing },
  { key: 'COMPLETED', label: 'Completed', icon: ShoppingBag },
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function OrderTracker({
  initialOrder,
  restaurant,
}: {
  initialOrder: TrackedOrder;
  restaurant: { name: string; slug: string; logoUrl: string | null; phone: string | null; currency: string };
}) {
  const [order, setOrder] = useState(initialOrder);
  const [connected, setConnected] = useState(false);
  const [pushState, setPushState] = useState<'idle' | 'granted' | 'denied' | 'unsupported' | 'not-configured'>('idle');
  const [pushEnabled, setPushEnabled] = useState(false);
  const { push } = useToast();
  const previousStatus = useRef(order.status);

  // --- live updates over Socket.IO, with polling as a fallback -------------
  useEffect(() => {
    // No socket server (serverless deploys): stay disconnected and let the
    // 20-second polling fallback below drive status updates.
    if (!SOCKET_ENABLED) return;

    const options = socketOptions({ orderToken: order.trackingToken });
    const socket = SOCKET_URL ? io(SOCKET_URL, options) : io(options);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('order:updated', (payload: TrackedOrder) => {
      setOrder(payload);
    });
    return () => {
      socket.close();
    };
  }, [order.trackingToken]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${order.trackingToken}`, { cache: 'no-store' });
      const json = await response.json();
      if (json?.ok) setOrder(json.data.order);
    } catch {
      /* offline — the UI already shows the connection state */
    }
  }, [order.trackingToken]);

  useEffect(() => {
    if (connected) return;
    const timer = window.setInterval(refresh, 20_000);
    return () => window.clearInterval(timer);
  }, [connected, refresh]);

  // --- announcement when the status changes --------------------------------
  useEffect(() => {
    if (previousStatus.current !== order.status) {
      previousStatus.current = order.status;
      if (order.status === 'READY') {
        push({
          tone: 'success',
          title: `Order #${order.code} is ready!`,
          body: 'Please collect it from the counter.',
        });
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(200);
      } else if (order.status === 'COMPLETED') {
        push({ tone: 'info', title: `Order #${order.code} completed`, body: 'Thank you — enjoy your meal!' });
      } else if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
        push({
          tone: 'error',
          title: `Order #${order.code} was cancelled`,
          body: order.cancelReason ?? 'Please speak to the counter.',
        });
      }
    }
  }, [order.status, order.code, order.cancelReason, push]);

  // --- push availability (honest: only promise what is configured) ---------
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported');
      return;
    }
    if (Notification.permission === 'granted') setPushState('granted');
    if (Notification.permission === 'denied') setPushState('denied');
    fetch('/api/push')
      .then((r) => r.json())
      .then((json) => setPushEnabled(Boolean(json?.data?.enabled)))
      .catch(() => setPushEnabled(false));
  }, []);

  async function enablePush() {
    if (!('serviceWorker' in navigator)) return;
    const config = await fetch('/api/push').then((r) => r.json());
    if (!config?.data?.enabled) {
      setPushState('not-configured');
      push({
        tone: 'info',
        title: 'Push not enabled on this deployment',
        body: 'Keep this page open — it updates live even without push.',
      });
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState('denied');
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.data.publicKey),
      });
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify({
          slug: restaurant.slug,
          orderToken: order.trackingToken,
          subscription: subscription.toJSON(),
        }),
      });
      setPushState('granted');
      push({ tone: 'success', title: 'Notifications enabled', body: 'We will tell you the moment your food is ready.' });
    } catch (error) {
      push({
        tone: 'error',
        title: 'Could not enable notifications',
        body: error instanceof Error ? error.message : 'Keep this page open for live updates.',
      });
    }
  }

  const isTerminal = ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status);
  const currentIndex = STEPS.findIndex((step) => step.key === order.status);
  const activeIndex = currentIndex === -1 ? (order.status === 'CANCELLED' || order.status === 'REJECTED' ? 0 : 0) : currentIndex;

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {restaurant.logoUrl && <img src={restaurant.logoUrl} alt="" className="h-6 w-auto" />}
          <span className="font-display text-lg text-ivory-50">{restaurant.name}</span>
        </div>
        <span
          className={clsx(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px]',
            connected
              ? 'border-lime-500/30 bg-lime-500/10 text-lime-300'
              : 'border-white/10 bg-white/[0.04] text-ivory-400',
          )}
        >
          {connected ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-400" />
              </span>
              Live
            </>
          ) : (
            <>
              <WifiOff size={10} /> Reconnecting
            </>
          )}
        </span>
      </div>

      {/* ------------------------------------------------------- status card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02]"
      >
        <div className="relative border-b border-white/[0.07] px-5 py-6 text-center">
          <div className="absolute inset-0 bg-[radial-glow] opacity-60" />
          <AnimatePresence mode="wait">
            <motion.div
              key={order.status}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-lime-500/30 bg-lime-500/10 text-lime-400">
                {order.status === 'READY' ? (
                  <BellRing size={24} />
                ) : order.status === 'CANCELLED' || order.status === 'REJECTED' ? (
                  <XCircle size={24} className="text-red-400" />
                ) : (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-lime-500/30 border-t-lime-400"
                  />
                )}
              </div>
              <p className="mt-3 font-display text-2xl text-ivory-50">Order #{order.code}</p>
              <p className="mt-1 text-sm text-lime-400">{order.statusLabel}</p>
              {order.tableCode && <p className="mt-1 text-xs text-ivory-400">Table {order.tableCode}</p>}
              {order.status === 'READY' && (
                <p className="mx-auto mt-3 max-w-xs rounded-2xl border border-lime-500/30 bg-lime-500/10 px-3 py-2 text-xs text-lime-200">
                  Your {restaurant.name} order is ready! Please collect it from the counter.
                </p>
              )}
              {order.estimatedReadyAt && !isTerminal && (
                <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-ivory-500">
                  <Clock size={11} /> Estimated ready by{' '}
                  {new Date(order.estimatedReadyAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* -------------------------------------------------------- timeline */}
        {order.status !== 'CANCELLED' && order.status !== 'REJECTED' ? (
          <ol className="space-y-0 px-5 py-4">
            {STEPS.map((step, index) => {
              const done = index <= activeIndex;
              const timestamp =
                order[`${step.key.toLowerCase()}At` as keyof TrackedOrder] as unknown as string | null;
              return (
                <li key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <motion.span
                      animate={done ? { scale: 1 } : { scale: 0.85 }}
                      className={clsx(
                        'flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
                        done ? 'border-lime-500/50 bg-lime-500/15 text-lime-400' : 'border-white/10 bg-white/[0.03] text-ivory-500',
                      )}
                    >
                      <step.icon size={14} />
                    </motion.span>
                    {index < STEPS.length - 1 && (
                      <span className="relative my-1 w-px flex-1 bg-white/10">
                        <motion.span
                          initial={{ height: 0 }}
                          animate={{ height: index < activeIndex ? '100%' : '0%' }}
                          transition={{ duration: 0.6 }}
                          className="absolute inset-x-0 top-0 bg-lime-500/60"
                        />
                      </span>
                    )}
                  </div>
                  <div className={clsx('pb-5 pt-1', index === STEPS.length - 1 && 'pb-0')}>
                    <p className={clsx('text-sm', done ? 'text-ivory-100' : 'text-ivory-500')}>{step.label}</p>
                    {timestamp && (
                      <p className="mt-0.5 text-[11px] text-ivory-500">
                        {new Date(timestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="px-5 py-5 text-center">
            <p className="text-sm text-red-300">
              {order.status === 'REJECTED' ? 'The restaurant could not accept this order.' : 'This order was cancelled.'}
            </p>
            {order.cancelReason && <p className="mt-1 text-xs text-ivory-400">{order.cancelReason}</p>}
            <p className="mt-3 text-xs text-ivory-500">Please speak to the counter if you need help.</p>
          </div>
        )}
      </motion.div>

      {/* ---------------------------------------------------- notifications */}
      {!isTerminal && pushState !== 'granted' && (
        <div className="mt-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/10 text-lime-400">
              {pushState === 'denied' ? <BellOff size={17} /> : <BellRing size={17} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ivory-100">Tell me when it&apos;s ready</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ivory-400">
                {pushState === 'denied'
                  ? 'Notifications are blocked in your browser settings. Keep this page open — it still updates live.'
                  : pushState === 'unsupported'
                    ? 'This browser does not support push notifications. Keep this page open to see live updates.'
                    : 'We will send a notification the moment the kitchen marks your order ready.'}
              </p>
              {pushState !== 'denied' && pushState !== 'unsupported' && (
                <Button size="sm" variant="secondary" className="mt-2.5" onClick={enablePush}>
                  Enable notifications
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- summary */}
      <div className="mt-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-ivory-500">Your order</p>
        <ul className="mt-3 space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-ivory-100">
                  <span className="text-lime-400">{item.quantity}×</span> {item.name}
                </p>
                {item.modifiers.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-ivory-400">
                    {item.modifiers.map((m) => m.optionName).join(' · ')}
                  </p>
                )}
                {item.notes && <p className="mt-0.5 text-[11px] italic text-ivory-500">“{item.notes}”</p>}
              </div>
              <span className="shrink-0 text-sm text-ivory-200">
                {formatMoney(item.totalMinor, order.currency)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-white/[0.07] pt-3 text-sm">
          <div className="flex justify-between text-ivory-400">
            <dt>Subtotal</dt>
            <dd>{formatMoney(order.subtotalMinor, order.currency)}</dd>
          </div>
          {!!order.discountMinor && (
            <div className="flex justify-between text-lime-400">
              <dt>Discount</dt>
              <dd>−{formatMoney(order.discountMinor, order.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between text-ivory-400">
            <dt>Taxes</dt>
            <dd>{formatMoney(order.taxMinor, order.currency)}</dd>
          </div>
          {!!order.serviceChargeMinor && (
            <div className="flex justify-between text-ivory-400">
              <dt>Service charge</dt>
              <dd>{formatMoney(order.serviceChargeMinor, order.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-1 text-base font-semibold text-ivory-50">
            <dt>Total</dt>
            <dd className="text-lime-400">{formatMoney(order.totalMinor, order.currency)}</dd>
          </div>
        </dl>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11px]">
          <span className="text-ivory-400">{order.paymentMethod.replace(/_/g, ' ').toLowerCase()}</span>
          <span
            className={clsx(
              'font-medium',
              order.paymentStatus === 'PAID' ? 'text-lime-400' : order.paymentStatus === 'REFUNDED' ? 'text-amber-300' : 'text-ivory-300',
            )}
          >
            {order.paymentStatus === 'PAID' ? 'Paid' : order.paymentStatus === 'PENDING' ? 'Pay at the counter' : order.paymentStatus}
          </span>
        </div>
        {order.notes && (
          <p className="mt-3 text-[11px] text-ivory-400">
            <span className="text-ivory-500">Your instructions:</span> {order.notes}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" className="flex-1" onClick={refresh}>
          <Loader2 size={14} className={clsx(connected && 'hidden')} /> Refresh status
        </Button>
        <Link href={`/r/${restaurant.slug}/menu`} className="flex-1">
          <Button variant="ghost" className="w-full">
            Order something else
          </Button>
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-ivory-500">
        {restaurant.phone && (
          <a href={`tel:${restaurant.phone.replace(/\s/g, '')}`} className="flex items-center gap-1 hover:text-lime-400">
            <Phone size={11} /> {restaurant.phone}
          </a>
        )}
        <span className="flex items-center gap-1">
          <MapPin size={11} /> Collect from the counter
        </span>
      </div>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-ivory-600">
        Keep this page open to follow your order. This link is private to you — do not share it if you would rather not
        show your order to others.
      </p>
    </div>
  );
}

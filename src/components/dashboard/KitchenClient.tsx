'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChefHat, Clock, Loader2, RefreshCw, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { useSocket } from '@/components/providers/SocketProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty';
import { RowSkeleton } from '@/components/ui/skeleton';
import type { DashboardOrder } from './OrdersClient';

const COLUMNS = [
  { key: 'CONFIRMED', label: 'Incoming', hint: 'Accepted, waiting to fire' },
  { key: 'PREPARING', label: 'On the pass', hint: 'Being cooked now' },
  { key: 'READY', label: 'Ready', hint: 'Waiting for pickup' },
];

export function KitchenClient({ slug, capabilities }: { slug: string; capabilities: string[] }) {
  const { socket, state } = useSocket();
  const { push } = useToast();
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [sound, setSound] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/${slug}/orders?status=ALL`, { cache: 'no-store' });
      const json = await response.json();
      if (json?.ok) setOrders(json.data.orders);
    } catch {
      push({ tone: 'error', title: 'Could not load the kitchen queue' });
    } finally {
      setLoading(false);
    }
  }, [slug, push]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onCreate = (order: DashboardOrder) => {
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      if (sound) beep();
    };
    const onUpdate = (order: DashboardOrder) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    };
    socket.on('order:created', onCreate);
    socket.on('order:updated', onUpdate);
    return () => {
      socket.off('order:created', onCreate);
      socket.off('order:updated', onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, sound]);

  useEffect(() => {
    if (state === 'connected') return;
    const timer = window.setInterval(load, 15_000);
    return () => window.clearInterval(timer);
  }, [state, load]);

  function beep() {
    try {
      const context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.16, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.32);
    } catch {
      /* best effort */
    }
  }

  async function advance(order: DashboardOrder, status: string) {
    setBusy(order.id);
    try {
      const response = await fetch(`/api/dashboard/${slug}/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify({ status, expectedStatus: order.status }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not update.');
      setOrders((prev) => prev.map((o) => (o.id === order.id ? json.data.order : o)));
    } catch (error) {
      push({
        tone: 'error',
        title: 'Could not update',
        body: error instanceof Error ? error.message : 'Another station may have already moved this order.',
      });
      void load();
    } finally {
      setBusy(null);
    }
  }

  const columns = useMemo(
    () =>
      COLUMNS.map((column) => ({
        ...column,
        orders: orders
          .filter((order) => order.status === column.key)
          .sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime()),
      })),
    [orders],
  );

  const nextStatus: Record<string, string> = { CONFIRMED: 'PREPARING', PREPARING: 'READY' };
  const canUpdate = capabilities.includes('kitchen.update') || capabilities.includes('orders.update');

  return (
    <div className="px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Kitchen display</h1>
          <p className="mt-1 text-sm text-ivory-400">
            Only accepted orders reach this screen. Tap once to move a ticket forward.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSound((value) => !value)}
            className={clsx(
              'flex h-10 items-center gap-2 rounded-xl border px-3 text-xs',
              sound ? 'border-lime-500/30 bg-lime-500/10 text-lime-300' : 'border-white/10 text-ivory-400',
            )}
            aria-pressed={sound}
          >
            {sound ? <Volume2 size={14} /> : <VolumeX size={14} />} {sound ? 'Chime on' : 'Chime off'}
          </button>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {!canUpdate && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
          <AlertTriangle size={14} /> Your role can view the kitchen queue but not change it.
        </p>
      )}

      {loading ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <RowSkeleton key={i} rows={3} />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {columns.map((column) => (
            <section key={column.key} className="rounded-3xl border border-white/[0.07] bg-ink-900/50 p-3">
              <header className="flex items-center justify-between px-1 pb-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-ivory-100">
                    <ChefHat size={14} className="text-lime-400" /> {column.label}
                  </p>
                  <p className="text-[10px] text-ivory-500">{column.hint}</p>
                </div>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-ivory-300">{column.orders.length}</span>
              </header>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {column.orders.length === 0 ? (
                    <EmptyState title="Clear" description="Nothing in this stage." className="py-8" />
                  ) : (
                    column.orders.map((order) => {
                      const elapsed = Math.max(0, Math.round((now - new Date(order.placedAt).getTime()) / 60000));
                      const overdue = elapsed > 20;
                      return (
                        <motion.article
                          key={order.id}
                          layout
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.25 }}
                          className={clsx(
                            'rounded-2xl border p-3.5',
                            overdue ? 'border-chili/40 bg-chili/[0.06]' : 'border-white/[0.07] bg-white/[0.02]',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-display text-lg text-ivory-50">#{order.code}</p>
                            <p
                              className={clsx(
                                'flex items-center gap-1 text-[11px]',
                                overdue ? 'text-red-300' : 'text-ivory-400',
                              )}
                            >
                              <Clock size={11} /> {elapsed} min
                            </p>
                          </div>
                          <p className="mt-0.5 text-[11px] text-ivory-400">
                            Table {order.tableCode ?? '—'}
                            {order.guestName ? ` · ${order.guestName}` : ''}
                          </p>

                          <ul className="mt-2.5 space-y-1.5">
                            {order.items.map((item) => (
                              <li key={item.id} className="text-xs">
                                <span className="mr-1.5 font-semibold text-lime-400">{item.quantity}×</span>
                                <span className="text-ivory-100">{item.name}</span>
                                {item.modifiers.length > 0 && (
                                  <span className="ml-1 text-ivory-400">
                                    ({item.modifiers.map((m) => m.optionName).join(', ')})
                                  </span>
                                )}
                                {item.notes && (
                                  <span className="ml-1 italic text-amber-300">“{item.notes}”</span>
                                )}
                              </li>
                            ))}
                          </ul>

                          {order.notes && (
                            <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-2 py-1.5 text-[11px] text-amber-200">
                              {order.notes}
                            </p>
                          )}

                          {canUpdate && nextStatus[order.status] && (
                            <Button
                              size="sm"
                              variant={order.status === 'PREPARING' ? 'success' : 'primary'}
                              className="mt-3 w-full"
                              loading={busy === order.id}
                              onClick={() => advance(order, nextStatus[order.status]!)}
                            >
                              {order.status === 'CONFIRMED' ? 'Start preparing' : 'Mark ready for pickup'}
                              <ArrowRight size={13} />
                            </Button>
                          )}
                        </motion.article>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 flex items-center gap-2 text-[11px] text-ivory-500">
        <Loader2 size={11} className={state === 'connected' ? 'hidden' : 'animate-spin'} />
        {state === 'connected' ? 'Synced with reception and guest tracking pages.' : 'Reconnecting to the live channel…'}
      </p>
    </div>
  );
}

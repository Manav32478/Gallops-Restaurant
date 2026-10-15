'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellRing,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Filter,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Wallet,
  X,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSocket } from '@/components/providers/SocketProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty';
import { RowSkeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/money';
import type { Capability } from '@/lib/auth/rbac';

export type DashboardOrder = {
  id: string;
  code: string;
  status: string;
  statusLabel: string;
  tableCode: string | null;
  guestName: string | null;
  guestPhone: string | null;
  notes: string | null;
  paymentMethod: string;
  paymentStatus: string;
  totalMinor: number;
  currency: string;
  placedAt: string;
  readyAt: string | null;
  estimatedReadyAt: string | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    notes: string | null;
    unitPriceMinor: number;
    totalMinor: number;
    modifiers: { groupName: string; optionName: string; priceDeltaMinor: number }[];
  }[];
};

const TABS = [
  { key: 'PLACED', label: 'New' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY', label: 'Ready' },
  { key: 'COMPLETED', label: 'History' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'ALL', label: 'All' },
];

const NEXT_ACTION: Record<string, { label: string; status: string; tone: 'primary' | 'success' | 'secondary' }> = {
  PLACED: { label: 'Accept order', status: 'CONFIRMED', tone: 'primary' },
  CONFIRMED: { label: 'Start preparing', status: 'PREPARING', tone: 'primary' },
  PREPARING: { label: 'Mark ready', status: 'READY', tone: 'success' },
  READY: { label: 'Mark completed', status: 'COMPLETED', tone: 'secondary' },
};

export function OrdersClient({
  slug,
  capabilities,
  role,
}: {
  slug: string;
  capabilities: Capability[];
  role: string;
}) {
  const { socket, state } = useSocket();
  const { push } = useToast();
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PLACED');
  const [search, setSearch] = useState('');
  const [sound, setSound] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<string[]>([]);
  const audioContext = useRef<AudioContext | null>(null);

  const canUpdate = capabilities.includes('orders.update');
  const canCancel = capabilities.includes('orders.cancel');
  const canPay = capabilities.includes('orders.payment');

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/${slug}/orders?status=ALL`, { cache: 'no-store' });
      const json = await response.json();
      if (json?.ok) setOrders(json.data.orders);
    } catch {
      push({ tone: 'error', title: 'Could not load orders', body: 'Check your connection and retry.' });
    } finally {
      setLoading(false);
    }
  }, [slug, push]);

  useEffect(() => {
    void load();
  }, [load]);

  // --- realtime -----------------------------------------------------------
  useEffect(() => {
    if (!socket) return;
    const onCreate = (order: DashboardOrder) => {
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      setNewIds((prev) => [order.id, ...prev].slice(0, 6));
      playChime();
      push({
        tone: 'info',
        title: `New order #${order.code}`,
        body: `Table ${order.tableCode ?? '—'} · ${formatMoney(order.totalMinor, order.currency)}`,
      });
      window.setTimeout(() => setNewIds((prev) => prev.filter((id) => id !== order.id)), 12_000);
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
  }, [socket, push, slug]);

  // Poll as a safety net if the socket is not connected.
  useEffect(() => {
    if (state === 'connected') return;
    const timer = window.setInterval(load, 15_000);
    return () => window.clearInterval(timer);
  }, [state, load]);

  function playChime() {
    if (!sound) return;
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const context = audioContext.current;
      if (context.state === 'suspended') void context.resume();
      const now = context.currentTime;
      [880, 1174.7].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.35);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * 0.12);
        oscillator.stop(now + index * 0.12 + 0.4);
      });
    } catch {
      /* audio is best-effort */
    }
  }

  async function changeStatus(order: DashboardOrder, status: string, reason?: string) {
    setBusy(order.id);
    try {
      const response = await fetch(`/api/dashboard/${slug}/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify({ status, expectedStatus: order.status, reason: reason ?? null }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not update the order.');
      setOrders((prev) => prev.map((o) => (o.id === order.id ? json.data.order : o)));
      push({ tone: 'success', title: `Order #${order.code} · ${json.data.order.statusLabel}` });
    } catch (error) {
      push({
        tone: 'error',
        title: 'Update failed',
        body: error instanceof Error ? error.message : 'Please retry.',
      });
      void load(); // resync on conflict
    } finally {
      setBusy(null);
    }
  }

  async function markPaid(order: DashboardOrder) {
    setBusy(order.id);
    try {
      const response = await fetch(`/api/dashboard/${slug}/orders/${order.id}/pay`, {
        method: 'POST',
        headers: { 'x-gallops-client': '1' },
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not record the payment.');
      setOrders((prev) => prev.map((o) => (o.id === order.id ? json.data.order : o)));
      push({ tone: 'success', title: `Payment recorded for #${order.code}` });
    } catch (error) {
      push({ tone: 'error', title: 'Payment not recorded', body: error instanceof Error ? error.message : '' });
    } finally {
      setBusy(null);
    }
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: orders.length };
    for (const key of TABS.map((t) => t.key)) {
      if (key === 'ALL') continue;
      map[key] = orders.filter((o) => o.status === key || (key === 'CANCELLED' && o.status === 'REJECTED')).length;
    }
    return map;
  }, [orders]);

  const visible = useMemo(() => {
    let list = orders;
    if (tab !== 'ALL') {
      list = list.filter((o) => (tab === 'CANCELLED' ? o.status === 'CANCELLED' || o.status === 'REJECTED' : o.status === tab));
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      list = list.filter((o) =>
        [o.code, o.guestName ?? '', o.tableCode ?? '', ...o.items.map((i) => i.name)]
          .join(' ')
          .toLowerCase()
          .includes(needle),
      );
    }
    return list.slice(0, 60);
  }, [orders, tab, search]);

  return (
    <div className="px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Reception</h1>
          <p className="mt-1 text-sm text-ivory-400">
            Orders arrive here the moment a guest places them. {counts.PLACED ?? 0} new · {counts.PREPARING ?? 0} preparing
            · {counts.READY ?? 0} ready
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSound((value) => !value)}
            className={clsx(
              'flex h-10 items-center gap-2 rounded-xl border px-3 text-xs transition',
              sound ? 'border-lime-500/30 bg-lime-500/10 text-lime-300' : 'border-white/10 text-ivory-400',
            )}
            aria-pressed={sound}
          >
            {sound ? <Volume2 size={14} /> : <VolumeX size={14} />} {sound ? 'Sound on' : 'Sound off'}
          </button>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={clsx(
              'relative shrink-0 rounded-full px-3.5 py-2 text-xs transition',
              tab === item.key ? 'text-ink-950' : 'text-ivory-300 hover:text-ivory-100',
            )}
          >
            {tab === item.key && (
              <motion.span layoutId="order-tab" className="absolute inset-0 rounded-full bg-lime-500" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {item.label}
              {counts[item.key] ? (
                <span className={clsx('rounded-full px-1.5 text-[10px]', tab === item.key ? 'bg-ink-950/20' : 'bg-white/10')}>
                  {counts[item.key]}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      <div className="relative mt-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ivory-500" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search order number, table or dish…"
          className="pl-10"
          aria-label="Search orders"
        />
      </div>

      {loading ? (
        <div className="mt-5">
          <RowSkeleton rows={4} />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<ClipboardIcon />}
          title={tab === 'PLACED' ? 'No new orders' : 'Nothing here yet'}
          description={
            tab === 'PLACED'
              ? 'New orders appear here instantly when a guest scans a table QR and orders.'
              : 'Orders that reach this stage will show up here.'
          }
        />
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {visible.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isNew={newIds.includes(order.id)}
                busy={busy === order.id}
                canUpdate={canUpdate}
                canCancel={canCancel}
                canPay={canPay}
                role={role}
                onChangeStatus={changeStatus}
                onMarkPaid={markPaid}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ClipboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function OrderCard({
  order,
  isNew,
  busy,
  canUpdate,
  canCancel,
  canPay,
  role,
  onChangeStatus,
  onMarkPaid,
}: {
  order: DashboardOrder;
  isNew: boolean;
  busy: boolean;
  canUpdate: boolean;
  canCancel: boolean;
  canPay: boolean;
  role: string;
  onChangeStatus: (order: DashboardOrder, status: string, reason?: string) => void;
  onMarkPaid: (order: DashboardOrder) => void;
}) {
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const placed = new Date(order.placedAt);
  const minutes = Math.max(0, Math.round((Date.now() - placed.getTime()) / 60000));
  const action = NEXT_ACTION[order.status];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.28 }}
      className={clsx(
        'relative overflow-hidden rounded-3xl border bg-ink-900/60 p-4',
        isNew ? 'border-lime-500/60 shadow-glow' : 'border-white/[0.07]',
      )}
    >
      {isNew && (
        <motion.span
          initial={{ opacity: 0.9, scale: 0.9 }}
          animate={{ opacity: 0, scale: 1.4 }}
          transition={{ duration: 1.6, repeat: 2 }}
          className="pointer-events-none absolute inset-0 bg-lime-500/10"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-display text-lg text-ivory-50">#{order.code}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-0.5 flex items-center gap-2 text-[11px] text-ivory-400">
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-ivory-200">
              Table {order.tableCode ?? '—'}
            </span>
            <Clock size={10} /> {minutes === 0 ? 'just now' : `${minutes} min ago`}
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span className="block text-base font-semibold text-lime-400">
            {formatMoney(order.totalMinor, order.currency)}
          </span>
          <span
            className={clsx(
              'block text-[10px]',
              order.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-ivory-500',
            )}
          >
            {order.paymentStatus === 'PAID' ? 'Paid' : order.paymentMethod.replace(/_/g, ' ').toLowerCase()}
          </span>
        </p>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-white/[0.07] pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="text-xs">
            <span className="mr-1.5 font-semibold text-lime-400">{item.quantity}×</span>
            <span className="text-ivory-100">{item.name}</span>
            {item.modifiers.length > 0 && (
              <span className="ml-1 text-ivory-400">({item.modifiers.map((m) => m.optionName).join(', ')})</span>
            )}
            {item.notes && <span className="ml-1 italic text-amber-300">“{item.notes}”</span>}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="mt-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-2.5 py-2 text-[11px] text-amber-200">
          {order.notes}
        </p>
      )}

      {order.guestName && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-ivory-400">
          <Phone size={11} /> {order.guestName}
          {order.guestPhone ? ` · ${order.guestPhone}` : ''}
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap gap-2">
        {canUpdate && action && (
          <Button
            size="sm"
            variant={action.tone === 'secondary' ? 'secondary' : action.tone === 'success' ? 'success' : 'primary'}
            loading={busy}
            onClick={() => onChangeStatus(order, action.status)}
          >
            {action.label}
          </Button>
        )}
        {canPay && order.paymentStatus !== 'PAID' && (
          <Button size="sm" variant="secondary" loading={busy} onClick={() => onMarkPaid(order)}>
            <Wallet size={13} /> Record payment
          </Button>
        )}
        {canCancel && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status) && (
          <Button size="sm" variant="ghost" onClick={() => setShowCancel((open) => !open)}>
            <X size={13} /> Cancel
          </Button>
        )}
      </div>

      {!canUpdate && role === 'KITCHEN' && (
        <p className="mt-3 text-[11px] text-ivory-500">Kitchen role: use the Kitchen screen to progress preparation.</p>
      )}

      <AnimatePresence>
        {showCancel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-2">
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason for cancelling (shown to the guest)"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  loading={busy}
                  onClick={() => {
                    onChangeStatus(order, 'CANCELLED', reason || 'Cancelled by the restaurant');
                    setShowCancel(false);
                  }}
                >
                  Confirm cancel
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCancel(false)}>
                  Keep order
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'PLACED'
      ? 'amber'
      : status === 'CONFIRMED'
        ? 'blue'
        : status === 'PREPARING'
          ? 'blue'
          : status === 'READY'
            ? 'lime'
            : status === 'COMPLETED'
              ? 'emerald'
              : 'red';
  const label: Record<string, string> = {
    PLACED: 'New',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY: 'Ready',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected',
  };
  return <Badge tone={tone as 'amber'}>{label[status] ?? status}</Badge>;
}

export { BellRing, Check, CheckCircle2, ChefHat, Filter, Loader2, AlertTriangle };

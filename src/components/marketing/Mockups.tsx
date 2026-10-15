'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  BadgeCheck,
  Bell,
  BellRing,
  ChefHat,
  Clock,
  QrCode,
  Search,
  ShoppingBag,
  Star,
  Timer,
} from 'lucide-react';

const DISHES = [
  { name: 'Kathiyawadi Executive Thali', price: '₹344', img: '/img/food/thali.jpg' },
  { name: 'Paneer Tikka Dry', price: '₹461', img: '/img/food/paneer-tikka.jpg' },
  { name: 'Dal Makhani', price: '₹430', img: '/img/food/dal-makhani.jpg' },
];

/** A live-looking miniature of the real customer menu (built with the same design tokens). */
export function PhoneMenuMock({ floating = true }: { floating?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div className="relative mx-auto w-full max-w-[290px] sm:max-w-[320px]">
      <motion.div
        animate={reduced || !floating ? undefined : { y: [0, -12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-ink-900 p-2 shadow-[0_50px_100px_-40px_rgba(0,0,0,1)]"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-ink-950">
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-3 text-[10px] text-ivory-300">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> Gallops · Table T04
            </span>
          </div>

          <div className="relative h-40 w-full">
            <img src="/img/brand/hero.jpg" alt="" className="h-full w-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <p className="font-display text-lg leading-tight text-ivory-50">Gallops Restaurant</p>
              <p className="text-[10px] text-ivory-300">Mahuva · Open till 11:30 pm</p>
            </div>
          </div>

          <div className="relative z-20 -mt-4 px-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-850/90 px-3 py-2 backdrop-blur">
              <Search size={13} className="text-ivory-500" />
              <span className="text-[11px] text-ivory-400">Search 170 dishes…</span>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-hidden px-3 pt-3">
            {['Specials', 'Thali', 'Main Course', 'Breads'].map((chip, index) => (
              <span
                key={chip}
                className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] ${
                  index === 0
                    ? 'border-lime-500/40 bg-lime-500/15 text-lime-300'
                    : 'border-white/10 bg-white/[0.04] text-ivory-400'
                }`}
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="space-y-2.5 p-3">
            {DISHES.map((dish, index) => (
              <motion.div
                key={dish.name}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + index * 0.12, duration: 0.5 }}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2"
              >
                <img src={dish.img} alt="" className="h-14 w-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-ivory-100">{dish.name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Star size={9} className="fill-lime-400 text-lime-400" />
                    <span className="text-[9px] text-ivory-500">House special</span>
                  </div>
                  <p className="mt-1 text-[12px] font-semibold text-lime-400">{dish.price}</p>
                </div>
                <span className="rounded-lg bg-lime-500 px-2 py-1 text-[10px] font-semibold text-ink-950">Add</span>
              </motion.div>
            ))}
          </div>

          <div className="sticky bottom-0 mx-3 mb-3 flex items-center justify-between rounded-2xl border border-lime-500/25 bg-lime-500/10 px-3 py-2.5 backdrop-blur">
            <span className="flex items-center gap-2 text-[11px] text-ivory-100">
              <ShoppingBag size={13} className="text-lime-400" /> 3 items
            </span>
            <span className="text-[12px] font-semibold text-lime-400">View cart · ₹1,235</span>
          </div>
        </div>
      </motion.div>

      {floating && (
        <>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="absolute -left-6 top-24 hidden items-center gap-2 rounded-2xl border border-white/10 bg-ink-850/95 px-3 py-2 shadow-lift backdrop-blur sm:flex"
          >
            <QrCode size={14} className="text-lime-400" />
            <span className="text-[10px] text-ivory-200">Scan at table T04</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.3 }}
            className="absolute -right-5 bottom-24 hidden items-center gap-2 rounded-2xl border border-white/10 bg-ink-850/95 px-3 py-2 shadow-lift backdrop-blur sm:flex"
          >
            <Bell size={14} className="text-lime-400" />
            <span className="text-[10px] text-ivory-200">Order #G104 is ready</span>
          </motion.div>
        </>
      )}
    </div>
  );
}

/** Miniature of the real reception dashboard. */
export function DashboardMock() {
  const columns = [
    { title: 'New', tone: 'border-amber-400/30', items: [{ code: '#G108', table: 'T07', total: '₹1,180', time: 'just now' }] },
    { title: 'Preparing', tone: 'border-sky-400/30', items: [{ code: '#G106', table: 'T03', total: '₹820', time: '4 min' }] },
    { title: 'Ready', tone: 'border-lime-500/40', items: [{ code: '#G104', table: 'T01', total: '₹1,540', time: '9 min' }] },
  ];
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900 shadow-[0_50px_100px_-40px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-chili/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-lime-500/70" />
          <span className="ml-3 text-xs text-ivory-400">Reception · Gallops Restaurant</span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-lime-500/30 bg-lime-500/10 px-2 py-1 text-[10px] text-lime-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-400" />
          </span>
          Live
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 p-4">
        {columns.map((column, index) => (
          <div key={column.title} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-ivory-300">{column.title}</span>
              <span className="rounded-full bg-white/5 px-1.5 text-[10px] text-ivory-400">{column.items.length}</span>
            </div>
            {column.items.map((item) => (
              <motion.div
                key={item.code}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.15 }}
                className={`rounded-2xl border bg-white/[0.03] p-3 ${column.tone}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ivory-100">{item.code}</span>
                  <span className="flex items-center gap-1 text-[10px] text-ivory-400">
                    <Clock size={9} /> {item.time}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-ivory-400">Table {item.table} · 4 items</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-lime-400">{item.total}</span>
                  <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] text-ivory-300">
                    {index === 0 ? 'Accept' : index === 1 ? 'Ready' : 'Complete'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-3 text-[10px] text-ivory-500">
        <span className="flex items-center gap-1.5">
          <ChefHat size={11} className="text-ivory-400" /> Kitchen display synced
        </span>
        <span className="flex items-center gap-1.5">
          <Timer size={11} className="text-ivory-400" /> Avg prep 14 min
        </span>
      </div>
    </div>
  );
}

export function TrustStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-ivory-400">
      <span className="flex items-center gap-1.5">
        <BadgeCheck size={14} className="text-lime-400" /> Server-side pricing
      </span>
      <span className="flex items-center gap-1.5">
        <BadgeCheck size={14} className="text-lime-400" /> Tenant-isolated data
      </span>
      <span className="flex items-center gap-1.5">
        <BadgeCheck size={14} className="text-lime-400" /> Works on 320px screens
      </span>
      <span className="flex items-center gap-1.5">
        <BadgeCheck size={14} className="text-lime-400" /> INR-native, GST-ready
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Live-feel product mockups used by the interactive tour                     */
/* ------------------------------------------------------------------------- */

const KITCHEN_ORDERS = [
  { code: '#G118', table: 'T04', items: '2× Kadai Paneer · 3× Butter Naan', startSeconds: 42, tone: 'amber' },
  { code: '#G117', table: 'T09', items: '1× Punjabi Executive Thali', startSeconds: 128, tone: 'sky' },
  { code: '#G116', table: 'T02', items: '1× Paneer Tikka Dry · 2× Lassi', startSeconds: 260, tone: 'lime' },
] as const;

function formatElapsed(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Kitchen display: order cards with live elapsed timers. */
export function KitchenMock() {
  const [tick, setTick] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [reduced]);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900 shadow-[0_50px_100px_-40px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center gap-2">
          <ChefHat size={15} className="text-lime-400" />
          <span className="text-xs font-medium text-ivory-200">Kitchen display</span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] text-amber-300">
          <Timer size={10} /> Avg prep 14 min
        </span>
      </div>
      <div className="space-y-3 p-4">
        {KITCHEN_ORDERS.map((order, index) => {
          const elapsed = order.startSeconds + tick;
          const late = elapsed > 300;
          const tone =
            order.tone === 'amber'
              ? 'border-amber-400/30'
              : order.tone === 'sky'
                ? 'border-sky-400/30'
                : 'border-lime-500/35';
          return (
            <motion.div
              key={order.code}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + index * 0.12, duration: 0.45 }}
              className={clsx('rounded-2xl border bg-white/[0.03] p-3.5', tone)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ivory-50">{order.code}</span>
                  <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-ivory-300">
                    {order.table}
                  </span>
                </div>
                <span
                  className={clsx(
                    'flex items-center gap-1 text-[11px] tabular',
                    late ? 'text-chili' : 'text-ivory-300',
                  )}
                >
                  <Clock size={10} /> {formatElapsed(elapsed)}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ivory-400">{order.items}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.span
                    className={clsx('block h-full rounded-full', late ? 'bg-chili' : 'bg-lime-400')}
                    animate={{ width: `${Math.min(100, (elapsed / 300) * 100)}%` }}
                    transition={{ duration: 0.8, ease: 'linear' }}
                  />
                </span>
                <span className="ml-3 rounded-lg bg-lime-500 px-2.5 py-1 text-[10px] font-semibold text-ink-950">
                  {order.tone === 'lime' ? 'Mark ready' : 'Start'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-3 text-[10px] text-ivory-500">
        <span>Socket.IO · room restaurant:&lt;id&gt;</span>
        <span>Optimistic concurrency on every transition</span>
      </div>
    </div>
  );
}

const TRACK_STEPS = [
  { label: 'Placed', detail: 'Sent to the counter', tone: 'text-ivory-300' },
  { label: 'Confirmed', detail: 'Accepted by reception', tone: 'text-sky-300' },
  { label: 'Preparing', detail: 'On the stove', tone: 'text-amber-300' },
  { label: 'Ready', detail: 'Collect from the counter', tone: 'text-lime-300' },
] as const;

/** Guest tracking card that walks itself through the order lifecycle. */
export function TrackingMock() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? TRACK_STEPS.length - 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => {
      setStep((current) => (current >= TRACK_STEPS.length - 1 ? 0 : current + 1));
    }, 2400);
    return () => clearInterval(timer);
  }, [reduced]);

  const ready = step === TRACK_STEPS.length - 1;

  return (
    <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900 p-5 shadow-[0_50px_100px_-40px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg text-ivory-50">Order #G118</p>
          <p className="text-[11px] text-ivory-400">Table T04 · Gallops Restaurant</p>
        </div>
        <span className="rounded-xl bg-lime-500/10 px-2 py-1 text-[11px] font-semibold text-lime-300">
          ₹1,235
        </span>
      </div>

      <div className="relative mt-6">
        <div className="absolute left-[11px] top-2 h-[calc(100%-16px)] w-px bg-white/[0.08]" />
        <motion.div
          className="absolute left-[11px] top-2 w-px origin-top bg-gradient-to-b from-lime-400 to-emerald-400"
          style={{ height: 'calc(100% - 16px)' }}
          animate={{ scaleY: step / (TRACK_STEPS.length - 1) }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        <ul className="space-y-5">
          {TRACK_STEPS.map((item, index) => {
            const done = index <= step;
            return (
              <li key={item.label} className="relative flex gap-3 pl-0">
                <span
                  className={clsx(
                    'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    done ? 'border-lime-400 bg-lime-400/15' : 'border-white/15 bg-ink-900',
                  )}
                >
                  {done ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                      className="h-2.5 w-2.5 rounded-full bg-lime-400"
                    />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-white/20" />
                  )}
                </span>
                <div>
                  <p className={clsx('text-sm font-medium', done ? item.tone : 'text-ivory-500')}>{item.label}</p>
                  <p className="text-[11px] text-ivory-500">{item.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <AnimatePresence mode="wait">
        {ready ? (
          <motion.div
            key="ready"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6 flex items-center gap-2.5 rounded-2xl border border-lime-500/30 bg-lime-500/10 px-3.5 py-3"
          >
            <BellRing size={16} className="shrink-0 text-lime-300" />
            <p className="text-[11px] leading-snug text-lime-200">
              Your order is ready — collect from the counter.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
          >
            <ChefHat size={16} className="shrink-0 text-ivory-400" />
            <p className="text-[11px] text-ivory-400">Live updates — no refresh needed.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const BARS = [38, 52, 44, 68, 58, 82, 74, 96, 88, 64, 78, 92];

/** Owner analytics: revenue bars, KPIs and best sellers. */
export function AnalyticsMock() {
  const reduced = useReducedMotion();
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900 shadow-[0_50px_100px_-40px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <span className="text-xs font-medium text-ivory-200">Analytics · last 7 days</span>
        <span className="rounded-full border border-lime-500/30 bg-lime-500/10 px-2 py-1 text-[10px] text-lime-300">
          INR
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-4">
        {[
          { label: 'Revenue', value: '₹1.4L', delta: '+12%' },
          { label: 'Orders', value: '312', delta: '+8%' },
          { label: 'Avg order', value: '₹452', delta: '+3%' },
        ].map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-wide text-ivory-500">{tile.label}</p>
            <p className="mt-1 font-display text-lg text-ivory-50">{tile.value}</p>
            <p className="text-[10px] text-lime-400">{tile.delta}</p>
          </div>
        ))}
      </div>
      <div className="flex h-28 items-end gap-1.5 px-4 pb-2">
        {BARS.map((height, index) => (
          <motion.span
            key={index}
            className="flex-1 rounded-t-md bg-gradient-to-t from-lime-500/25 to-lime-400/80"
            initial={reduced ? { height: `${height}%` } : { height: 0 }}
            whileInView={{ height: `${height}%` }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
      <div className="space-y-2 border-t border-white/[0.07] p-4">
        {['Kadai Paneer', 'Butter Naan', 'Punjabi Executive Thali'].map((dish, index) => (
          <div key={dish} className="flex items-center justify-between text-[11px] text-ivory-300">
            <span>
              <span className="mr-2 text-ivory-500">{index + 1}.</span>
              {dish}
            </span>
            <span className="tabular text-ivory-400">{128 - index * 27} sold</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Printable table-QR sheet preview. */
export function QrSheetMock() {
  const cells = ['T01', 'T02', 'T03', 'T04'];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="grid grid-cols-2 gap-3">
        {cells.map((code) => (
          <div key={code} className="rounded-xl border border-white/10 bg-ink-950 p-3 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-lg bg-white/95 p-1.5">
              <svg viewBox="0 0 33 33" className="h-full w-full" aria-hidden>
                {Array.from({ length: 64 }).map((_, index) => {
                  const x = index % 8;
                  const y = Math.floor(index / 8);
                  const on = (x * 7 + y * 13 + (code.charCodeAt(2) % 5)) % 3 !== 0;
                  return on ? <rect key={index} x={x * 4} y={y * 4} width="3.2" height="3.2" fill="#07070A" /> : null;
                })}
              </svg>
            </div>
            <p className="mt-2 text-[11px] font-semibold text-ivory-100">{code}</p>
            <p className="text-[9px] text-ivory-500">Scan to order</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[10px] text-ivory-500">
        A4 printable sheet · one code per table · regenerating a code invalidates the old one
      </p>
    </div>
  );
}

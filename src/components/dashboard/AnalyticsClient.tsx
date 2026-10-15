'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Loader2, RefreshCw, TrendingUp, UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty';
import { formatMoney } from '@/lib/money';

type Data = {
  today: { orders: number; revenue: number; pipeline: number; averageOrderValue: number; completed: number; cancelled: number };
  live: { pending: number; preparing: number; ready: number };
  series: { label: string; date: string; orders: number; revenue: number }[];
  popularDishes: { name: string; quantity: number; revenueMinor: number }[];
  statusDistribution: { status: string; count: number }[];
  tableActivity: { table: string; orders: number; revenue: number }[];
};

export function AnalyticsClient({ slug }: { slug: string }) {
  const { push } = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/${slug}/analytics`, { cache: 'no-store' });
      const json = await response.json();
      if (json?.ok) setData(json.data);
    } catch {
      push({ tone: 'error', title: 'Could not load analytics' });
    } finally {
      setLoading(false);
    }
  }, [slug, push]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 45_000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="px-4 py-5 lg:px-8">
        <RowSkeleton rows={6} />
      </div>
    );
  }
  if (!data) return null;

  const maxRevenue = Math.max(1, ...data.series.map((point) => point.revenue));
  const hasOrders = data.today.orders > 0 || data.series.some((point) => point.orders > 0);

  return (
    <div className="px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-ivory-400">
            Computed from your real orders. Revenue counts paid orders only; unpaid, refunded and cancelled orders are
            excluded.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders today" value={String(data.today.orders)} hint={`${data.today.completed} completed · ${data.today.cancelled} cancelled`} />
        <Stat label="Revenue today (paid)" value={formatMoney(data.today.revenue)} hint={`Pipeline ${formatMoney(data.today.pipeline)}`} />
        <Stat label="Average order value" value={formatMoney(data.today.averageOrderValue)} hint="Today, excluding cancelled" />
        <Stat label="In the kitchen now" value={String(data.live.preparing + data.live.ready)} hint={`${data.live.pending} new · ${data.live.ready} ready`} />
      </div>

      {!hasOrders ? (
        <EmptyState
          className="mt-8"
          icon={<BarChart3 size={22} />}
          title="No orders recorded yet"
          description="Place a test order from a table QR code and this screen fills in with real numbers — nothing here is simulated."
        />
      ) : (
        <>
          <section className="mt-5 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h2 className="flex items-center gap-2 text-sm text-ivory-100">
              <TrendingUp size={15} className="text-lime-400" /> Last 7 days
            </h2>
            <div className="mt-5 flex h-40 items-end gap-2">
              {data.series.map((point, index) => (
                <div key={point.date} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[10px] text-ivory-500">{point.orders}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, (point.revenue / maxRevenue) * 100)}%` }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-lime-600/40 to-lime-400"
                    title={`${formatMoney(point.revenue)} · ${point.orders} orders`}
                  />
                  <span className="text-[10px] text-ivory-500">{point.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-ivory-500">
              Bar height shows paid revenue for the day; the number above is the order count.
            </p>
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
              <h2 className="flex items-center gap-2 text-sm text-ivory-100">
                <UtensilsCrossed size={15} className="text-lime-400" /> Popular dishes today
              </h2>
              {data.popularDishes.length === 0 ? (
                <p className="mt-3 text-xs text-ivory-500">No dish sales recorded today.</p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {data.popularDishes.map((dish) => (
                    <li key={dish.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-ivory-200">{dish.name}</span>
                      <span className="shrink-0 text-xs text-ivory-400">
                        {dish.quantity} sold · {formatMoney(dish.revenueMinor)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-ivory-500">Ranked by actual quantity ordered — no estimates.</p>
            </section>

            <section className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
              <h2 className="flex items-center gap-2 text-sm text-ivory-100">
                <BarChart3 size={15} className="text-lime-400" /> Table activity (7 days)
              </h2>
              {data.tableActivity.length === 0 ? (
                <p className="mt-3 text-xs text-ivory-500">No table activity yet.</p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {data.tableActivity.map((table) => (
                    <li key={table.table} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ivory-200">Table {table.table}</span>
                      <span className="text-xs text-ivory-400">
                        {table.orders} orders · {formatMoney(table.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
      {loading && <Loader2 size={14} className="mt-4 animate-spin text-ivory-500" />}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-wide text-ivory-500">{label}</p>
      <p className="mt-1.5 font-display text-2xl text-ivory-50">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-ivory-500">{hint}</p>}
    </div>
  );
}

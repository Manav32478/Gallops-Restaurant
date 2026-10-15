'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Rocket,
  Users,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input, Select, Field } from '@/components/ui/input';
import { Sheet } from '@/components/ui/Sheet';
import { Badge } from '@/components/ui/badge';
import { RowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty';
import { formatMoney } from '@/lib/money';

export type PlatformData = {
  overview: {
    restaurants: number;
    activeRestaurants: number;
    users: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
    leads: number;
  };
  restaurants: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    isActive: boolean;
    isPublished: boolean;
    createdAt: string;
    tables: number;
    staff: number;
    items: number;
    orders: number;
    plan: string;
    planCode: string | null;
    status: string;
  }[];
  plans: {
    id: string;
    code: string;
    name: string;
    priceMinor: number;
    maxTables: number;
    maxStaff: number;
    maxOrdersPerMonth: number;
    tenants: number;
    features: string[];
    isPublic: boolean;
  }[];
  subscriptions: {
    id: string;
    restaurant: string;
    slug: string;
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
  }[];
  leads: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    restaurantName: string | null;
    city: string | null;
    message: string | null;
    status: string;
    createdAt: string;
  }[];
  billingMode: string;
};

export function usePlatformData() {
  const { push } = useToast();
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/platform/stats', { cache: 'no-store' });
      const json = await response.json();
      if (json?.ok) setData(json.data);
      else push({ tone: 'error', title: 'Could not load platform data', body: json?.error?.message ?? '' });
    } catch {
      push({ tone: 'error', title: 'Could not load platform data' });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, reload: load };
}

export function PlatformOverview() {
  const { data, loading, reload } = usePlatformData();
  if (loading || !data) {
    return (
      <div className="px-4 py-6 lg:px-8">
        <RowSkeleton rows={5} />
      </div>
    );
  }
  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Platform overview</h1>
          <p className="mt-1 text-sm text-ivory-400">
            Every tenant is isolated: menus, orders, staff and reports are scoped by membership.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={<Building2 size={16} />} label="Restaurants" value={String(data.overview.restaurants)} hint={`${data.overview.activeRestaurants} live`} />
        <Stat icon={<Users size={16} />} label="Users" value={String(data.overview.users)} hint="All roles across tenants" />
        <Stat icon={<CheckCircle2 size={16} />} label="Orders this month" value={String(data.overview.ordersThisMonth)} hint={`${formatMoney(data.overview.revenueThisMonth)} paid`} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
          <h2 className="text-sm text-ivory-100">Tenants</h2>
          <ul className="mt-3 space-y-2">
            {data.restaurants.map((restaurant) => (
              <li key={restaurant.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ivory-100">{restaurant.name}</span>
                  <span className="block truncate text-[11px] text-ivory-500">
                    /r/{restaurant.slug} · {restaurant.plan} · {restaurant.tables} tables · {restaurant.items} dishes
                  </span>
                </span>
                <Badge tone={restaurant.isActive ? 'emerald' : 'neutral'}>{restaurant.status.toLowerCase()}</Badge>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
          <h2 className="text-sm text-ivory-100">Latest demo requests</h2>
          {data.leads.length === 0 ? (
            <p className="mt-3 text-xs text-ivory-500">No demo requests yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.leads.slice(0, 6).map((lead) => (
                <li key={lead.id} className="rounded-xl border border-white/[0.07] px-3 py-2.5">
                  <p className="text-sm text-ivory-100">
                    {lead.name} <span className="text-ivory-500">· {lead.restaurantName ?? '—'}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ivory-500">
                    <Mail size={10} /> {lead.email}
                    {lead.phone && (
                      <>
                        <Phone size={10} /> {lead.phone}
                      </>
                    )}
                  </p>
                  {lead.message && <p className="mt-1 line-clamp-2 text-[11px] text-ivory-400">{lead.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-3.5 text-[11px] text-amber-200">
        Subscription billing is running in <strong>{data.billingMode}</strong> mode. No payment provider is charged and
        no fake checkout exists: integrate Razorpay subscriptions once your keys are configured.
      </p>
    </div>
  );
}

export function RestaurantsAdmin() {
  const { data, loading, reload } = usePlatformData();
  const { push } = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', planCode: 'STARTER', tables: 6 });
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const response = await fetch('/api/platform/restaurants', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not create the restaurant.');
      push({ tone: 'success', title: 'Restaurant created', body: `Menu link: /r/${json.data.restaurant.slug}` });
      setCreating(false);
      setForm({ name: '', city: '', planCode: 'STARTER', tables: 6 });
      await reload();
    } catch (error) {
      push({ tone: 'error', title: 'Could not create', body: error instanceof Error ? error.message : '' });
    } finally {
      setBusy(false);
    }
  }

  async function patch(body: Record<string, unknown>) {
    const response = await fetch('/api/platform/restaurants', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) push({ tone: 'error', title: 'Update failed', body: json?.error?.message ?? '' });
    else push({ tone: 'success', title: 'Updated' });
    await reload();
  }

  if (loading || !data) {
    return (
      <div className="px-4 py-6 lg:px-8">
        <RowSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Restaurants</h1>
          <p className="mt-1 text-sm text-ivory-400">Create tenants, change plans, publish or suspend a restaurant.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus size={14} /> New restaurant
        </Button>
      </div>

      {data.restaurants.length === 0 ? (
        <EmptyState className="mt-8" icon={<Building2 size={22} />} title="No restaurants yet" />
      ) : (
        <div className="mt-5 space-y-2">
          {data.restaurants.map((restaurant) => (
            <motion.div key={restaurant.id} layout className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-ivory-100">{restaurant.name}</p>
                  <p className="mt-0.5 text-[11px] text-ivory-500">
                    /r/{restaurant.slug}
                    {restaurant.city ? ` · ${restaurant.city}` : ''} · {restaurant.tables} tables · {restaurant.staff}{' '}
                    staff · {restaurant.items} dishes · {restaurant.orders} orders
                  </p>
                  <p className="mt-1 text-[11px] text-ivory-500">
                    Joined {new Date(restaurant.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="blue">{restaurant.plan}</Badge>
                  <Badge tone={restaurant.status === 'ACTIVE' ? 'emerald' : 'amber'}>{restaurant.status.toLowerCase()}</Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select
                  value={restaurant.planCode ?? 'STARTER'}
                  onChange={(event) => patch({ id: restaurant.id, planCode: event.target.value, status: 'ACTIVE' })}
                  className="w-36 py-1.5 text-xs"
                  aria-label="Change plan"
                >
                  {data.plans.map((plan) => (
                    <option key={plan.code} value={plan.code}>
                      {plan.name}
                    </option>
                  ))}
                </Select>
                <button
                  onClick={() => patch({ id: restaurant.id, isActive: !restaurant.isActive })}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-ivory-300 hover:border-white/25"
                >
                  {restaurant.isActive ? 'Suspend' : 'Activate'}
                </button>
                <button
                  onClick={() => patch({ id: restaurant.id, isPublished: !restaurant.isPublished })}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-ivory-300 hover:border-white/25"
                >
                  {restaurant.isPublished ? 'Unpublish menu' : 'Publish menu'}
                </button>
                <a
                  href={`/r/${restaurant.slug}/menu`}
                  target="_blank"
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-lime-400 hover:border-lime-500/40"
                >
                  Open menu ↗
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Create a restaurant tenant"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={create} loading={busy}>
              <Rocket size={14} /> Create tenant
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Restaurant name" required>
            {(id) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
          </Field>
          <Field label="City">
            {(id) => <Input id={id} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />}
          </Field>
          <Field label="Plan">
            {(id) => (
              <Select id={id} value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value })}>
                {data.plans.map((plan) => (
                  <option key={plan.code} value={plan.code}>
                    {plan.name} · {formatMoney(plan.priceMinor)}/mo
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Tables to create" hint="Each table gets its own unpredictable QR token.">
            {(id) => (
              <Input id={id} type="number" min={0} max={50} value={form.tables} onChange={(e) => setForm({ ...form, tables: Number(e.target.value) })} />
            )}
          </Field>
        </div>
      </Sheet>
    </div>
  );
}

export function SubscriptionsAdmin() {
  const { data, loading, reload } = usePlatformData();
  const { push } = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    priceRupees: 999,
    maxTables: 12,
    maxStaff: 4,
    maxOrdersPerMonth: 600,
    features: '',
  });
  const [busy, setBusy] = useState(false);

  async function savePlan() {
    setBusy(true);
    try {
      const response = await fetch('/api/platform/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify({
          ...form,
          code: form.code.toUpperCase().replace(/\s+/g, '_'),
          features: form.features.split('\n').map((line) => line.trim()).filter(Boolean),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not save the plan.');
      push({ tone: 'success', title: 'Plan saved' });
      setCreating(false);
      await reload();
    } catch (error) {
      push({ tone: 'error', title: 'Save failed', body: error instanceof Error ? error.message : '' });
    } finally {
      setBusy(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="px-4 py-6 lg:px-8">
        <RowSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Plans &amp; subscriptions</h1>
          <p className="mt-1 text-sm text-ivory-400">
            Plan limits are enforced when tables, staff or orders are created. Billing mode: {data.billingMode}.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus size={14} /> New plan
        </Button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {data.plans.map((plan) => (
          <div key={plan.id} className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl text-ivory-50">{plan.name}</p>
              <Badge tone={plan.isPublic ? 'lime' : 'neutral'}>{plan.isPublic ? 'public' : 'hidden'}</Badge>
            </div>
            <p className="mt-1 text-sm text-lime-400">{formatMoney(plan.priceMinor)} / month</p>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.07] bg-ink-950/40 p-2.5 text-center">
              <Cell label="Tables" value={plan.maxTables} />
              <Cell label="Staff" value={plan.maxStaff} />
              <Cell label="Orders" value={plan.maxOrdersPerMonth} />
            </div>
            <ul className="mt-3 space-y-1.5 text-[11px] text-ivory-400">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-1.5">
                  <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-lime-400" /> {feature}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-ivory-500">{plan.tenants} tenant(s) on this plan</p>
            <button
              onClick={() => {
                setForm({
                  code: plan.code,
                  name: plan.name,
                  priceRupees: plan.priceMinor / 100,
                  maxTables: plan.maxTables,
                  maxStaff: plan.maxStaff,
                  maxOrdersPerMonth: plan.maxOrdersPerMonth,
                  features: plan.features.join('\n'),
                });
                setCreating(true);
              }}
              className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs text-ivory-300 hover:border-lime-500/40 hover:text-lime-400"
            >
              Edit plan
            </button>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h2 className="text-sm text-ivory-100">Active subscriptions</h2>
        <ul className="mt-3 space-y-2">
          {data.subscriptions.map((subscription) => (
            <li key={subscription.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] px-3 py-2.5 text-sm">
              <span className="min-w-0 truncate text-ivory-200">{subscription.restaurant}</span>
              <span className="flex shrink-0 items-center gap-2 text-[11px] text-ivory-500">
                {subscription.plan}
                <Badge tone={subscription.status === 'ACTIVE' ? 'emerald' : 'amber'}>{subscription.status.toLowerCase()}</Badge>
                {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN')
                  : 'trial'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Plan details"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={savePlan} loading={busy}>
              <CreditCard size={14} /> Save plan
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" required hint="e.g. STARTER">
            {(id) => <Input id={id} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />}
          </Field>
          <Field label="Name" required>
            {(id) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
          </Field>
          <Field label="Monthly price (₹)">
            {(id) => (
              <Input id={id} type="number" min={0} value={form.priceRupees} onChange={(e) => setForm({ ...form, priceRupees: Number(e.target.value) })} />
            )}
          </Field>
          <Field label="Max tables">
            {(id) => (
              <Input id={id} type="number" min={1} value={form.maxTables} onChange={(e) => setForm({ ...form, maxTables: Number(e.target.value) })} />
            )}
          </Field>
          <Field label="Max staff">
            {(id) => (
              <Input id={id} type="number" min={1} value={form.maxStaff} onChange={(e) => setForm({ ...form, maxStaff: Number(e.target.value) })} />
            )}
          </Field>
          <Field label="Max orders / month">
            {(id) => (
              <Input
                id={id}
                type="number"
                min={1}
                value={form.maxOrdersPerMonth}
                onChange={(e) => setForm({ ...form, maxOrdersPerMonth: Number(e.target.value) })}
              />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Features" hint="One per line">
              {(id) => (
                <textarea
                  id={id}
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  rows={5}
                  className="w-full rounded-xl border border-white/10 bg-ink-850/70 px-3.5 py-2.5 text-sm text-ivory-100 outline-none transition focus:border-lime-500/60"
                />
              )}
            </Field>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

export function PlatformAnalytics() {
  const { data, loading, reload } = usePlatformData();
  const { push } = useToast();

  async function setLeadStatus(id: string, status: string) {
    await fetch('/api/platform/leads', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
      body: JSON.stringify({ id, status }),
    });
    await reload();
  }

  if (loading || !data) {
    return (
      <div className="px-4 py-6 lg:px-8">
        <RowSkeleton rows={5} />
      </div>
    );
  }

  const maxOrders = Math.max(1, ...data.restaurants.map((restaurant) => restaurant.orders));

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Usage</h1>
          <p className="mt-1 text-sm text-ivory-400">Cross-tenant usage computed from real orders.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat icon={<CheckCircle2 size={16} />} label="Orders this month" value={String(data.overview.ordersThisMonth)} />
        <Stat icon={<CreditCard size={16} />} label="Paid revenue this month" value={formatMoney(data.overview.revenueThisMonth)} />
        <Stat icon={<Mail size={16} />} label="Demo requests" value={String(data.overview.leads)} />
      </div>

      <section className="mt-5 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h2 className="text-sm text-ivory-100">Orders per restaurant</h2>
        <ul className="mt-4 space-y-3">
          {data.restaurants.map((restaurant) => (
            <li key={restaurant.id}>
              <div className="flex items-center justify-between text-xs text-ivory-400">
                <span className="truncate text-ivory-200">{restaurant.name}</span>
                <span>{restaurant.orders}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(restaurant.orders / maxOrders) * 100}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-full bg-lime-500"
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h2 className="text-sm text-ivory-100">Demo requests</h2>
        {data.leads.length === 0 ? (
          <p className="mt-3 text-xs text-ivory-500">No requests yet — they arrive from the website contact form.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.leads.map((lead) => (
              <li key={lead.id} className="rounded-xl border border-white/[0.07] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-ivory-100">
                    {lead.name} <span className="text-ivory-500">· {lead.restaurantName ?? '—'}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge tone={lead.status === 'NEW' ? 'amber' : lead.status === 'WON' ? 'emerald' : 'neutral'}>
                      {lead.status.toLowerCase()}
                    </Badge>
                    <Select
                      value={lead.status}
                      onChange={(event) => setLeadStatus(lead.id, event.target.value)}
                      className="w-32 py-1 text-xs"
                      aria-label="Lead status"
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="WON">Won</option>
                      <option value="LOST">Lost</option>
                    </Select>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-ivory-500">
                  {lead.email}
                  {lead.phone ? ` · ${lead.phone}` : ''}
                  {lead.city ? ` · ${lead.city}` : ''} · {new Date(lead.createdAt).toLocaleString('en-IN')}
                </p>
                {lead.message && <p className="mt-1.5 text-xs text-ivory-400">{lead.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      {loading && <Loader2 size={14} className="mt-4 animate-spin text-ivory-500" />}
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ivory-500">
        <span className="text-lime-400">{icon}</span> {label}
      </p>
      <p className="mt-1.5 font-display text-2xl text-ivory-50">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-ivory-500">{hint}</p>}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ivory-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ivory-500">{label}</p>
    </div>
  );
}

export { clsx };

'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2, Plus, Printer, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input, Select, Field } from '@/components/ui/input';
import { Sheet } from '@/components/ui/Sheet';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty';
import { RowSkeleton } from '@/components/ui/skeleton';

type Table = {
  id: string;
  code: string;
  label: string | null;
  seats: number;
  zone: string | null;
  status: string;
  qrToken: string;
  orders: number;
  lastOrderAt: string | null;
};

export function TablesClient({ slug, canEdit }: { slug: string; canEdit: boolean }) {
  const { push } = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: '', label: '', seats: 4, zone: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/${slug}/tables`, { cache: 'no-store' });
      const json = await response.json();
      if (json?.ok) {
        setTables(json.data.tables);
        setBaseUrl(json.data.baseUrl || window.location.origin);
      }
    } catch {
      push({ tone: 'error', title: 'Could not load tables' });
    } finally {
      setLoading(false);
    }
  }, [slug, push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy('new');
    try {
      const response = await fetch(`/api/dashboard/${slug}/tables`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify({ ...form, code: form.code.toUpperCase() }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not create the table.');
      push({ tone: 'success', title: `Table ${form.code.toUpperCase()} created` });
      setCreating(false);
      setForm({ code: '', label: '', seats: 4, zone: '' });
      await load();
    } catch (error) {
      push({ tone: 'error', title: 'Could not create table', body: error instanceof Error ? error.message : '' });
    } finally {
      setBusy(null);
    }
  }

  async function update(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const response = await fetch(`/api/dashboard/${slug}/tables/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not update.');
      await load();
      push({ tone: 'success', title: 'Table updated' });
    } catch (error) {
      push({ tone: 'error', title: 'Update failed', body: error instanceof Error ? error.message : '' });
    } finally {
      setBusy(null);
    }
  }

  async function remove(table: Table) {
    if (!window.confirm(`Remove table ${table.code}?`)) return;
    await fetch(`/api/dashboard/${slug}/tables/${table.id}`, { method: 'DELETE', headers: { 'x-gallops-client': '1' } });
    await load();
    push({ tone: 'success', title: table.orders > 0 ? 'Table archived' : 'Table removed' });
  }

  return (
    <div className="px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Tables &amp; QR codes</h1>
          <p className="mt-1 text-sm text-ivory-400">
            Each table has its own unpredictable QR identifier. Regenerating one invalidates the printed code.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.open(`/dashboard/tables/sheet`, '_blank')}>
            <Printer size={14} /> Print QR sheet
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus size={14} /> Add table
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-5">
          <RowSkeleton rows={4} />
        </div>
      ) : tables.length === 0 ? (
        <EmptyState className="mt-6" icon={<QrCode size={22} />} title="No tables yet" description="Add your first table to generate a QR code." />
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => {
            const url = `${baseUrl}/r/${slug}/menu?table=${table.qrToken}`;
            return (
              <motion.div
                key={table.id}
                layout
                className={clsx(
                  'rounded-3xl border p-4',
                  table.status === 'ACTIVE' ? 'border-white/[0.07] bg-white/[0.02]' : 'border-white/[0.05] bg-white/[0.01] opacity-70',
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-xl text-ivory-50">{table.code}</p>
                    <p className="text-[11px] text-ivory-500">
                      {table.seats} seats{table.zone ? ` · ${table.zone}` : ''} · {table.orders} orders
                    </p>
                  </div>
                  <Badge tone={table.status === 'ACTIVE' ? 'emerald' : table.status === 'DISABLED' ? 'amber' : 'neutral'}>
                    {table.status.toLowerCase()}
                  </Badge>
                </div>

                <div className="mt-3 flex gap-3">
                  <img
                    src={`/api/dashboard/${slug}/tables/${table.id}/qr?format=svg`}
                    alt={`QR code for table ${table.code}`}
                    className="h-24 w-24 rounded-xl border border-white/10 bg-white p-1"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <a
                      href={`/api/dashboard/${slug}/tables/${table.id}/qr?format=png`}
                      download={`gallops-${table.code}-qr.png`}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-ivory-200 transition hover:border-lime-500/40 hover:text-lime-400"
                    >
                      <Download size={12} /> PNG
                    </a>
                    <a
                      href={`/api/dashboard/${slug}/tables/${table.id}/qr?format=svg`}
                      download={`gallops-${table.code}-qr.svg`}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-ivory-200 transition hover:border-lime-500/40 hover:text-lime-400"
                    >
                      <Download size={12} /> SVG
                    </a>
                    <a href={url} target="_blank" className="block truncate text-[10px] text-ivory-500 hover:text-lime-400">
                      Open table link ↗
                    </a>
                  </div>
                </div>

                {canEdit && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => update(table.id, { status: table.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })}
                      className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-ivory-300 hover:border-white/25"
                    >
                      {table.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Regenerate this QR code? Any printed code for this table stops working.')) {
                          void update(table.id, { regenerateQr: true });
                        }
                      }}
                      className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-ivory-300 hover:border-white/25"
                    >
                      <RefreshCw size={11} /> Regenerate
                    </button>
                    <button onClick={() => remove(table)} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-ivory-300 hover:border-red-400/40 hover:text-red-400">
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
                {busy === table.id && <Loader2 size={13} className="mt-2 animate-spin text-ivory-500" />}
              </motion.div>
            );
          })}
        </div>
      )}

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Add a table"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={create} loading={busy === 'new'}>
              Create table
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Table code" required hint="Shown to guests, e.g. T07">
            {(id) => <Input id={id} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="T07" />}
          </Field>
          <Field label="Display name (optional)">
            {(id) => <Input id={id} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Window side" />}
          </Field>
          <Field label="Seats">
            {(id) => <Input id={id} type="number" min={1} max={40} value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />}
          </Field>
          <Field label="Zone (optional)">
            {(id) => <Input id={id} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} placeholder="Family hall" />}
          </Field>
        </div>
      </Sheet>
    </div>
  );
}

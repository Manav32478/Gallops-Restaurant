'use client';
import { useCallback, useEffect, useState } from 'react';
import { CreditCard, ImagePlus, Loader2, Save, Store } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Field, Switch } from '@/components/ui/input';
import { RowSkeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type Restaurant = {
  name: string;
  tagline: string | null;
  about: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  heroImageUrl: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  taxBp: number;
  serviceChargeBp: number;
  acceptingOrders: boolean;
  autoAcceptOrders: boolean;
  defaultPrepMinutes: number;
  cancellationMinutes: number;
  minOrderMinor: number;
  paymentMethods: string[];
  languages: string[];
  notificationSettings: Record<string, boolean> | null;
  slug: string;
};

const TABS = [
  { key: 'brand', label: 'Branding', icon: Store },
  { key: 'contact', label: 'Contact', icon: Store },
  { key: 'operations', label: 'Operations', icon: Store },
  { key: 'money', label: 'Taxes & payments', icon: CreditCard },
  { key: 'notifications', label: 'Notifications', icon: CreditCard },
];

export function SettingsClient({ slug, canEdit }: { slug: string; canEdit: boolean }) {
  const { push } = useToast();
  const [tab, setTab] = useState('brand');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoInput = useState<React.RefObject<HTMLInputElement | null>>({ current: null })[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/${slug}/settings`, { cache: 'no-store' });
      const json = await response.json();
      if (json?.ok) setRestaurant(json.data.restaurant);
    } catch {
      push({ tone: 'error', title: 'Could not load settings' });
    } finally {
      setLoading(false);
    }
  }, [slug, push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(payload: Record<string, unknown>) {
    if (!canEdit) {
      push({ tone: 'error', title: 'Read only', body: 'Your role cannot change restaurant settings.' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/dashboard/${slug}/settings`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not save.');
      setRestaurant(json.data.restaurant);
      push({ tone: 'success', title: 'Settings saved' });
    } catch (error) {
      push({ tone: 'error', title: 'Save failed', body: error instanceof Error ? error.message : '' });
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File, field: 'logoUrl' | 'heroImageUrl') {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-restaurant-slug': slug, 'x-gallops-client': '1' },
        body: form,
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Upload failed.');
      await save({ [field]: json.data.url });
    } catch (error) {
      push({ tone: 'error', title: 'Upload failed', body: error instanceof Error ? error.message : '' });
    } finally {
      setUploading(false);
    }
  }

  if (loading || !restaurant) {
    return (
      <div className="px-4 py-5 lg:px-8">
        <RowSkeleton rows={6} />
      </div>
    );
  }

  const set = (patch: Partial<Restaurant>) => setRestaurant({ ...restaurant, ...patch });

  return (
    <div className="px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-ivory-400">
            Everything here changes what guests see immediately — no redeployment required.
          </p>
        </div>
        {!canEdit && <Badge tone="amber">Read-only for your role</Badge>}
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={clsx(
              'shrink-0 rounded-full px-3.5 py-2 text-xs transition',
              tab === item.key ? 'bg-lime-500 text-ink-950' : 'text-ivory-300 hover:bg-white/5',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 max-w-2xl space-y-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
        {tab === 'brand' && (
          <>
            <Field label="Restaurant name">
              {(id) => <Input id={id} value={restaurant.name} onChange={(e) => set({ name: e.target.value })} />}
            </Field>
            <Field label="Tagline">
              {(id) => <Input id={id} value={restaurant.tagline ?? ''} onChange={(e) => set({ tagline: e.target.value })} />}
            </Field>
            <Field label="About">
              {(id) => (
                <Textarea id={id} value={restaurant.about ?? ''} onChange={(e) => set({ about: e.target.value })} rows={4} />
              )}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-ivory-400">Logo</p>
                {restaurant.logoUrl && <img src={restaurant.logoUrl} alt="" className="mb-2 h-10 rounded-lg bg-white p-1" />}
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLogo(file, 'logoUrl');
                    event.target.value = '';
                  }}
                />
                <Button size="sm" variant="secondary" loading={uploading} onClick={() => logoInput.current?.click()}>
                  <ImagePlus size={14} /> Upload logo
                </Button>
                <p className="mt-2 text-[11px] text-ivory-500">
                  The current logo is the one published on gallopsfoodplaza.in (low resolution). Upload a larger
                  transparent PNG when you have one.
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-ivory-400">Menu hero image</p>
                {restaurant.heroImageUrl && (
                  <img src={restaurant.heroImageUrl} alt="" className="mb-2 h-16 w-full rounded-lg object-cover" />
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  loading={uploading}
                  onClick={() => {
                    const picker = document.createElement('input');
                    picker.type = 'file';
                    picker.accept = 'image/png,image/jpeg,image/webp';
                    picker.onchange = () => {
                      const file = picker.files?.[0];
                      if (file) void uploadLogo(file, 'heroImageUrl');
                    };
                    picker.click();
                  }}
                >
                  <ImagePlus size={14} /> Upload hero
                </Button>
              </div>
            </div>
            <Button onClick={() => save({ name: restaurant.name, tagline: restaurant.tagline, about: restaurant.about })} loading={saving}>
              <Save size={14} /> Save branding
            </Button>
          </>
        )}

        {tab === 'contact' && (
          <>
            <Field label="Address">
              {(id) => (
                <Textarea id={id} value={restaurant.addressLine ?? ''} onChange={(e) => set({ addressLine: e.target.value })} />
              )}
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="City">
                {(id) => <Input id={id} value={restaurant.city ?? ''} onChange={(e) => set({ city: e.target.value })} />}
              </Field>
              <Field label="State">
                {(id) => <Input id={id} value={restaurant.state ?? ''} onChange={(e) => set({ state: e.target.value })} />}
              </Field>
              <Field label="PIN code">
                {(id) => <Input id={id} value={restaurant.postalCode ?? ''} onChange={(e) => set({ postalCode: e.target.value })} />}
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                {(id) => <Input id={id} value={restaurant.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />}
              </Field>
              <Field label="Email">
                {(id) => <Input id={id} value={restaurant.email ?? ''} onChange={(e) => set({ email: e.target.value })} />}
              </Field>
              <Field label="Website">
                {(id) => <Input id={id} value={restaurant.website ?? ''} onChange={(e) => set({ website: e.target.value })} />}
              </Field>
              <Field label="Instagram">
                {(id) => <Input id={id} value={restaurant.instagram ?? ''} onChange={(e) => set({ instagram: e.target.value })} />}
              </Field>
            </div>
            <p className="text-[11px] text-ivory-500">
              These details were imported from your public listings — correct anything that has changed.
            </p>
            <Button
              onClick={() =>
                save({
                  addressLine: restaurant.addressLine,
                  city: restaurant.city,
                  state: restaurant.state,
                  postalCode: restaurant.postalCode,
                  phone: restaurant.phone,
                  email: restaurant.email,
                  website: restaurant.website,
                  instagram: restaurant.instagram,
                })
              }
              loading={saving}
            >
              <Save size={14} /> Save contact details
            </Button>
          </>
        )}

        {tab === 'operations' && (
          <>
            <Switch
              label="Accepting online orders"
              description="Turn off during a rush or after kitchen hours — guests see a clear notice."
              checked={restaurant.acceptingOrders}
              onChange={(acceptingOrders) => set({ acceptingOrders })}
              disabled={!canEdit}
            />
            <Switch
              label="Auto-accept orders"
              description="Skip the manual accept step; orders go straight to the kitchen."
              checked={restaurant.autoAcceptOrders}
              onChange={(autoAcceptOrders) => set({ autoAcceptOrders })}
              disabled={!canEdit}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Default preparation time (minutes)">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    min={1}
                    max={180}
                    value={restaurant.defaultPrepMinutes}
                    onChange={(e) => set({ defaultPrepMinutes: Number(e.target.value) })}
                  />
                )}
              </Field>
              <Field label="Cancellation window (minutes)">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    max={120}
                    value={restaurant.cancellationMinutes}
                    onChange={(e) => set({ cancellationMinutes: Number(e.target.value) })}
                  />
                )}
              </Field>
            </div>
            <Button
              onClick={() =>
                save({
                  acceptingOrders: restaurant.acceptingOrders,
                  autoAcceptOrders: restaurant.autoAcceptOrders,
                  defaultPrepMinutes: restaurant.defaultPrepMinutes,
                  cancellationMinutes: restaurant.cancellationMinutes,
                })
              }
              loading={saving}
            >
              <Save size={14} /> Save operations
            </Button>
          </>
        )}

        {tab === 'money' && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Tax / GST (%)">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    max={40}
                    step="0.5"
                    value={(restaurant.taxBp / 100).toFixed(2)}
                    onChange={(e) => set({ taxBp: Math.round(Number(e.target.value) * 100) })}
                  />
                )}
              </Field>
              <Field label="Service charge (%)">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    max={40}
                    step="0.5"
                    value={(restaurant.serviceChargeBp / 100).toFixed(2)}
                    onChange={(e) => set({ serviceChargeBp: Math.round(Number(e.target.value) * 100) })}
                  />
                )}
              </Field>
              <Field label="Minimum order (₹)">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    value={restaurant.minOrderMinor / 100}
                    onChange={(e) => set({ minOrderMinor: Math.round(Number(e.target.value) * 100) })}
                  />
                )}
              </Field>
            </div>

            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-ivory-400">Payment methods offered to guests</p>
              <div className="space-y-2">
                {[
                  { key: 'CASH_AT_COUNTER', label: 'Pay at the counter' },
                  { key: 'PAY_AT_TABLE', label: 'Pay at the table' },
                  { key: 'RAZORPAY', label: 'Online (Razorpay UPI / card)' },
                ].map((method) => (
                  <label key={method.key} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-sm text-ivory-200">
                    <input
                      type="checkbox"
                      checked={restaurant.paymentMethods.includes(method.key)}
                      onChange={(event) =>
                        set({
                          paymentMethods: event.target.checked
                            ? [...restaurant.paymentMethods, method.key]
                            : restaurant.paymentMethods.filter((value) => value !== method.key),
                        })
                      }
                    />
                    {method.label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ivory-500">
                Online payments stay unavailable to guests until Razorpay keys are configured on the server
                (RAZORPAY_ENABLED=true). Selecting it here alone will not switch payments on.
              </p>
            </div>

            <Button
              onClick={() =>
                save({
                  taxPercent: restaurant.taxBp / 100,
                  serviceChargePercent: restaurant.serviceChargeBp / 100,
                  minOrderRupees: restaurant.minOrderMinor / 100,
                  paymentMethods: restaurant.paymentMethods,
                })
              }
              loading={saving}
            >
              <Save size={14} /> Save money settings
            </Button>
          </>
        )}

        {tab === 'notifications' && (
          <>
            <p className="text-sm text-ivory-300">
              Choose which channels are used when the kitchen marks an order ready. Channels that are not configured on
              the server are logged as skipped, never reported as sent.
            </p>
            {[
              { key: 'push', label: 'Browser push', hint: 'Requires VAPID keys (npm run vapid) and the guest granting permission.' },
              { key: 'email', label: 'Email', hint: 'Requires an SMTP provider to be configured.' },
              { key: 'sms', label: 'SMS', hint: 'Requires an SMS provider (e.g. MSG91) to be configured.' },
              { key: 'whatsapp', label: 'WhatsApp', hint: 'Requires a WhatsApp Cloud API credential.' },
              { key: 'soundAlerts', label: 'Dashboard sound alerts', hint: 'Chime at the counter when a new order arrives.' },
            ].map((channel) => (
              <Switch
                key={channel.key}
                label={channel.label}
                description={channel.hint}
                checked={Boolean(restaurant.notificationSettings?.[channel.key])}
                disabled={!canEdit}
                onChange={(value) =>
                  set({
                    notificationSettings: { ...(restaurant.notificationSettings ?? {}), [channel.key]: value },
                  })
                }
              />
            ))}
            <Button
              onClick={() => save({ notificationSettings: restaurant.notificationSettings ?? {} })}
              loading={saving}
            >
              <Save size={14} /> Save notification settings
            </Button>
          </>
        )}
      </div>

      {saving && <Loader2 size={14} className="mt-3 animate-spin text-ivory-500" />}
    </div>
  );
}

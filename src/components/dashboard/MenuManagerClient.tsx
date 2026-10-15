'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea, Select, Field, Switch } from '@/components/ui/input';
import { Sheet } from '@/components/ui/Sheet';
import { DishImage } from '@/components/menu/DishImage';
import { EmptyState } from '@/components/ui/empty';
import { RowSkeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/money';

type Group = {
  id?: string;
  name: string;
  kind: 'VARIANT' | 'ADDON';
  type: 'SINGLE' | 'MULTI';
  required: boolean;
  isActive?: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: { id?: string; name: string; priceRupees: number; isDefault: boolean; isAvailable: boolean; sortOrder: number }[];
};

type Item = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  servingSize: string | null;
  imageUrl: string | null;
  imageIsPlaceholder: boolean;
  priceMinor: number;
  isVeg: boolean | null;
  isVegan: boolean | null;
  isJain: boolean | null;
  spiceLevel: number | null;
  allergens: string[];
  isAvailable: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
  prepMinutes: number | null;
  verificationStatus: string;
  verificationNote: string | null;
  sourceName: string | null;
  categoryId: string;
  category: { id: string; name: string };
  variantGroups: (Group & { id: string; isActive: boolean })[];
};

type Category = { id: string; name: string; parentId: string | null; _count: { items: number; sections: number } };

const EMPTY_GROUP: Group = {
  name: '',
  kind: 'VARIANT',
  type: 'SINGLE',
  required: false,
  isActive: true,
  minSelect: 0,
  maxSelect: 1,
  sortOrder: 0,
  options: [{ name: '', priceRupees: 0, isDefault: false, isAvailable: true, sortOrder: 0 }],
};

export function MenuManagerClient({
  slug,
  canEdit,
  initialNeedsReview,
}: {
  slug: string;
  canEdit: boolean;
  initialNeedsReview: number;
}) {
  const { push } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [needsReview, setNeedsReview] = useState(initialNeedsReview);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/${slug}/menu`, { cache: 'no-store' });
      const json = await response.json();
      if (json?.ok) {
        setItems(json.data.items);
        setCategories(json.data.categories);
        setNeedsReview(json.data.items.filter((i: Item) => i.verificationStatus === 'NEEDS_REVIEW').length);
      }
    } catch {
      push({ tone: 'error', title: 'Could not load the menu' });
    } finally {
      setLoading(false);
    }
  }, [slug, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = items;
    if (categoryFilter) list = list.filter((item) => item.categoryId === categoryFilter);
    if (statusFilter === 'needs_review') list = list.filter((item) => item.verificationStatus === 'NEEDS_REVIEW');
    if (statusFilter === 'sold_out') list = list.filter((item) => !item.isAvailable);
    if (statusFilter === 'unpublished') list = list.filter((item) => !item.isPublished);
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(needle));
    }
    return list;
  }, [items, categoryFilter, statusFilter, search]);

  async function patch(id: string, body: Partial<Item> & { priceRupees?: number }) {
    setSaving(true);
    try {
      const response = await fetch(`/api/dashboard/${slug}/menu/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not save.');
      setItems((prev) => prev.map((item) => (item.id === id ? json.data.item : item)));
      return json.data.item as Item;
    } catch (error) {
      push({ tone: 'error', title: 'Save failed', body: error instanceof Error ? error.message : '' });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Item) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    const response = await fetch(`/api/dashboard/${slug}/menu/${item.id}`, {
      method: 'DELETE',
      headers: { 'x-gallops-client': '1' },
    });
    if (response.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      push({ tone: 'success', title: `${item.name} deleted` });
    }
  }

  async function duplicate(item: Item) {
    const response = await fetch(`/api/dashboard/${slug}/menu/${item.id}`, {
      method: 'POST',
      headers: { 'x-gallops-client': '1' },
    });
    const json = await response.json();
    if (json?.ok) {
      await load();
      push({ tone: 'success', title: 'Item duplicated', body: 'The copy is unpublished until you review it.' });
    }
  }

  async function uploadImage(file: File, itemId?: string) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (itemId) form.append('itemId', itemId);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-restaurant-slug': slug, 'x-gallops-client': '1' },
        body: form,
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Upload failed.');
      if (itemId) await load();
      return json.data.url as string;
    } catch (error) {
      push({ tone: 'error', title: 'Upload failed', body: error instanceof Error ? error.message : '' });
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function verifyAll() {
    if (!window.confirm('Mark every imported item as verified? Only do this after checking prices with your kitchen.')) return;
    setSaving(true);
    const targets = items.filter((item) => item.verificationStatus === 'NEEDS_REVIEW');
    await Promise.all(targets.map((item) => patch(item.id, { verificationStatus: 'OWNER_VERIFIED' })));
    setSaving(false);
    await load();
    push({ tone: 'success', title: `${targets.length} items marked verified` });
  }

  return (
    <div className="px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Menu</h1>
          <p className="mt-1 text-sm text-ivory-400">
            {items.length} dishes · changes appear on the guest menu immediately
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/r/${slug}/menu`} target="_blank">
            <Button variant="secondary" size="sm">
              <Eye size={14} /> View live menu
            </Button>
          </Link>
          <Link href="/dashboard/categories">
            <Button variant="ghost" size="sm">
              Sections
            </Button>
          </Link>
          {canEdit && (
            <Button size="sm" onClick={() => {
              setEditing(null);
              setCreating(true);
            }}>
              <Plus size={14} /> Add dish
            </Button>
          )}
        </div>
      </div>

      {needsReview > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm text-amber-100">{needsReview} dishes still need your verification</p>
              <p className="mt-0.5 text-xs text-amber-200/80">
                Prices were imported from public online listings and may differ from your in-house menu. Dietary and
                allergen labels were not published by the source, so they are left unset.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setStatusFilter('needs_review')}>
              Review queue
            </Button>
            {canEdit && (
              <Button size="sm" onClick={verifyAll} loading={saving}>
                <ShieldCheck size={14} /> Mark all verified
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ivory-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dishes…" className="pl-10" />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by section">
          <option value="">All sections</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.parentId ? `— ${category.name}` : category.name} ({category._count.items})
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">Any status</option>
          <option value="needs_review">Needs review</option>
          <option value="sold_out">Sold out</option>
          <option value="unpublished">Unpublished</option>
        </Select>
      </div>

      {loading ? (
        <div className="mt-5">
          <RowSkeleton rows={6} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState className="mt-6" title="No dishes match" description="Try a different filter or add a new dish." />
      ) : (
        <div className="mt-5 space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2.5"
            >
              <DishImage
                src={item.imageUrl}
                name={item.name}
                category={item.category.name}
                isPlaceholder={item.imageIsPlaceholder}
                ratio="1 / 1"
                className="h-14 w-14 shrink-0 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm text-ivory-100">{item.name}</p>
                  {item.verificationStatus === 'NEEDS_REVIEW' && <Badge tone="amber">Needs review</Badge>}
                  {!item.isAvailable && <Badge tone="red">Sold out</Badge>}
                  {!item.isPublished && <Badge tone="neutral">Hidden</Badge>}
                  {item.isFeatured && <Badge tone="lime">Featured</Badge>}
                </div>
                <p className="mt-0.5 text-[11px] text-ivory-500">
                  {item.category.name} · {formatMoney(item.priceMinor, 'INR')}
                  {item.servingSize ? ` · ${item.servingSize}` : ''}
                  {item.variantGroups.length ? ` · ${item.variantGroups.length} option group(s)` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {canEdit && (
                  <>
                    <button
                      onClick={() => patch(item.id, { isAvailable: !item.isAvailable })}
                      className={clsx(
                        'rounded-lg p-2 transition',
                        item.isAvailable ? 'text-ivory-400 hover:bg-white/5' : 'text-red-400',
                      )}
                      title={item.isAvailable ? 'Mark sold out' : 'Mark available'}
                      aria-label="Toggle availability"
                    >
                      {item.isAvailable ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                      onClick={() => patch(item.id, { isFeatured: !item.isFeatured })}
                      className={clsx('rounded-lg p-2 transition hover:bg-white/5', item.isFeatured ? 'text-lime-400' : 'text-ivory-400')}
                      title="Feature on the guest menu"
                      aria-label="Toggle featured"
                    >
                      <Star size={15} />
                    </button>
                    <button onClick={() => setEditing(item)} className="rounded-lg p-2 text-ivory-400 transition hover:bg-white/5 hover:text-lime-400" aria-label="Edit">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => duplicate(item)} className="rounded-lg p-2 text-ivory-400 transition hover:bg-white/5" aria-label="Duplicate">
                      <Copy size={15} />
                    </button>
                    <button onClick={() => remove(item)} className="rounded-lg p-2 text-ivory-400 transition hover:bg-white/5 hover:text-red-400" aria-label="Delete">
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ItemEditor
        slug={slug}
        item={editing}
        creating={creating}
        categories={categories}
        open={Boolean(editing) || creating}
        saving={saving}
        uploading={uploading}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        onUpload={uploadImage}
        onSave={async (payload, id) => {
          setSaving(true);
          try {
            const response = await fetch(id ? `/api/dashboard/${slug}/menu/${id}` : `/api/dashboard/${slug}/menu`, {
              method: id ? 'PATCH' : 'POST',
              headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
              body: JSON.stringify(payload),
            });
            const json = await response.json();
            if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not save the dish.');
            push({ tone: 'success', title: id ? 'Dish updated' : 'Dish added' });
            setEditing(null);
            setCreating(false);
            await load();
          } catch (error) {
            push({ tone: 'error', title: 'Save failed', body: error instanceof Error ? error.message : '' });
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}

function ItemEditor({
  slug,
  item,
  creating,
  categories,
  open,
  saving,
  uploading,
  onClose,
  onSave,
  onUpload,
}: {
  slug: string;
  item: Item | null;
  creating: boolean;
  categories: Category[];
  open: boolean;
  saving: boolean;
  uploading: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, id?: string) => Promise<void>;
  onUpload: (file: File, itemId?: string) => Promise<string | null>;
}) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    servingSize: '',
    imageUrl: '',
    priceRupees: 0,
    categoryId: '',
    isVeg: null as boolean | null,
    isVegan: null as boolean | null,
    isJain: null as boolean | null,
    spiceLevel: null as number | null,
    allergens: '',
    isAvailable: true,
    isPublished: true,
    isFeatured: false,
    prepMinutes: null as number | null,
    verificationStatus: 'OWNER_EDITED' as string,
    groups: [] as Group[],
  });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        name: item.name,
        description: item.description ?? '',
        servingSize: item.servingSize ?? '',
        imageUrl: item.imageUrl ?? '',
        priceRupees: item.priceMinor / 100,
        categoryId: item.categoryId,
        isVeg: item.isVeg,
        isVegan: item.isVegan,
        isJain: item.isJain,
        spiceLevel: item.spiceLevel,
        allergens: item.allergens.join(', '),
        isAvailable: item.isAvailable,
        isPublished: item.isPublished,
        isFeatured: item.isFeatured,
        prepMinutes: item.prepMinutes,
        verificationStatus: item.verificationStatus,
        groups: item.variantGroups.map((group) => ({
          ...group,
          options: group.options.map((option) => ({
            id: (option as { id?: string }).id,
            name: option.name,
            priceRupees: (option as unknown as { priceDeltaMinor: number }).priceDeltaMinor / 100,
            isDefault: option.isDefault,
            isAvailable: option.isAvailable,
            sortOrder: option.sortOrder,
          })),
        })),
      });
    } else {
      setForm({
        name: '',
        description: '',
        servingSize: '',
        imageUrl: '',
        priceRupees: 0,
        categoryId: categories[0]?.id ?? '',
        isVeg: null,
        isVegan: null,
        isJain: null,
        spiceLevel: null,
        allergens: '',
        isAvailable: true,
        isPublished: true,
        isFeatured: false,
        prepMinutes: null,
        verificationStatus: 'OWNER_EDITED',
        groups: [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  function setGroup(index: number, next: Partial<Group>) {
    setForm((prev) => ({ ...prev, groups: prev.groups.map((group, i) => (i === index ? { ...group, ...next } : group)) }));
  }

  function setOption(groupIndex: number, optionIndex: number, next: Partial<Group['options'][number]>) {
    setForm((prev) => ({
      ...prev,
      groups: prev.groups.map((group, i) =>
        i === groupIndex
          ? { ...group, options: group.options.map((option, j) => (j === optionIndex ? { ...option, ...next } : option)) }
          : group,
      ),
    }));
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      maxWidth="max-w-2xl"
      title={item ? `Edit · ${item.name}` : 'Add a dish'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={() =>
              onSave(
                {
                  name: form.name,
                  description: form.description || null,
                  servingSize: form.servingSize || null,
                  imageUrl: form.imageUrl || null,
                  priceRupees: Number(form.priceRupees) || 0,
                  categoryId: form.categoryId,
                  isVeg: form.isVeg,
                  isVegan: form.isVegan,
                  isJain: form.isJain,
                  spiceLevel: form.spiceLevel,
                  allergens: form.allergens
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean),
                  isAvailable: form.isAvailable,
                  isPublished: form.isPublished,
                  isFeatured: form.isFeatured,
                  prepMinutes: form.prepMinutes,
                  verificationStatus: form.verificationStatus,
                  groups: form.groups
                    .filter((group) => group.name.trim())
                    .map((group, index) => ({
                      ...group,
                      sortOrder: index,
                      options: group.options
                        .filter((option) => option.name.trim())
                        .map((option, optionIndex) => ({ ...option, sortOrder: optionIndex })),
                    })),
                },
                item?.id,
              )
            }
          >
            {item ? 'Save changes' : 'Create dish'}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dish name" required>
          {(id) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        </Field>
        <Field label="Price (₹)" required hint="Stored in paise; shown to guests exactly as entered.">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={0}
              step="0.5"
              value={form.priceRupees}
              onChange={(e) => setForm({ ...form, priceRupees: Number(e.target.value) })}
            />
          )}
        </Field>
        <Field label="Section">
          {(id) => (
            <Select id={id} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.parentId ? `— ${category.name}` : category.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Serving size / portion">
          {(id) => (
            <Input
              id={id}
              value={form.servingSize}
              onChange={(e) => setForm({ ...form, servingSize: e.target.value })}
              placeholder="Approx 300 g"
            />
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            {(id) => (
              <Textarea id={id} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            )}
          </Field>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ivory-400">Photo</p>
          <div className="flex flex-wrap items-center gap-3">
            <DishImage
              src={form.imageUrl}
              name={form.name || 'Dish'}
              ratio="1 / 1"
              className="h-20 w-20 rounded-xl"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const url = await onUpload(file, item?.id);
                  if (url) setForm((prev) => ({ ...prev, imageUrl: url }));
                  event.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={uploading}
                  onClick={() => fileInput.current?.click()}
                  disabled={!item?.id}
                >
                  <Upload size={14} /> {item?.id ? 'Upload photo' : 'Save dish first'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}>
                  Use placeholder
                </Button>
              </div>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="/uploads/… or https://cdn…"
              />
              <p className="text-[11px] text-ivory-500">
                JPG, PNG, WEBP, AVIF or GIF up to 6 MB. Photos you upload replace the illustrative placeholder.
              </p>
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ivory-400">
            Dietary (only shown to guests once you set them)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <TriState label="Vegetarian" value={form.isVeg} onChange={(value) => setForm({ ...form, isVeg: value })} />
            <TriState label="Vegan" value={form.isVegan} onChange={(value) => setForm({ ...form, isVegan: value })} />
            <TriState label="Jain" value={form.isJain} onChange={(value) => setForm({ ...form, isJain: value })} />
            <Field label="Spice level">
              {(id) => (
                <Select
                  id={id}
                  value={form.spiceLevel === null ? '' : String(form.spiceLevel)}
                  onChange={(e) => setForm({ ...form, spiceLevel: e.target.value === '' ? null : Number(e.target.value) })}
                >
                  <option value="">Not set</option>
                  <option value="0">Mild</option>
                  <option value="1">Medium</option>
                  <option value="2">Hot</option>
                  <option value="3">Very hot</option>
                </Select>
              )}
            </Field>
          </div>
          <div className="mt-2">
            <Field label="Allergens" hint="Comma separated, e.g. dairy, gluten, nuts">
              {(id) => <Input id={id} value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} />}
            </Field>
          </div>
        </div>

        <div className="sm:col-span-2 space-y-2">
          <Switch label="Available to order" checked={form.isAvailable} onChange={(value) => setForm({ ...form, isAvailable: value })} />
          <Switch label="Published on the guest menu" checked={form.isPublished} onChange={(value) => setForm({ ...form, isPublished: value })} />
          <Switch label="Show in House specials" checked={form.isFeatured} onChange={(value) => setForm({ ...form, isFeatured: value })} />
        </div>

        <div className="sm:col-span-2">
          <Field label="Verification status" hint="Imported rows stay flagged until you confirm them.">
            {(id) => (
              <Select id={id} value={form.verificationStatus} onChange={(e) => setForm({ ...form, verificationStatus: e.target.value })}>
                <option value="NEEDS_REVIEW">Needs review</option>
                <option value="OWNER_VERIFIED">Verified by the restaurant</option>
                <option value="OWNER_EDITED">Edited by the restaurant</option>
                <option value="UNVERIFIED">Unverified</option>
              </Select>
            )}
          </Field>
        </div>

        {/* ------------------------------------------------- variants & add-ons */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ivory-400">Options &amp; add-ons</p>
            <Button size="sm" variant="ghost" onClick={() => setForm((prev) => ({ ...prev, groups: [...prev.groups, { ...EMPTY_GROUP }] }))}>
              <Plus size={13} /> Add group
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-ivory-500">
            Imported sample groups arrive switched off. Switch a group on only after confirming the options and prices
            with your kitchen.
          </p>

          <div className="mt-3 space-y-3">
            {form.groups.map((group, groupIndex) => (
              <div key={groupIndex} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <Input
                    value={group.name}
                    onChange={(e) => setGroup(groupIndex, { name: e.target.value })}
                    placeholder="e.g. Spice level"
                  />
                  <Select value={group.type} onChange={(e) => setGroup(groupIndex, { type: e.target.value as 'SINGLE' | 'MULTI' })}>
                    <option value="SINGLE">Choose one</option>
                    <option value="MULTI">Choose many</option>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => setForm((prev) => ({ ...prev, groups: prev.groups.filter((_, i) => i !== groupIndex) }))}>
                    <X size={14} />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-ivory-300">
                    <input
                      type="checkbox"
                      checked={group.required}
                      onChange={(e) => setGroup(groupIndex, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ivory-300">
                    <input
                      type="checkbox"
                      checked={group.isActive !== false}
                      onChange={(e) => setGroup(groupIndex, { isActive: e.target.checked })}
                    />
                    Shown to guests
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ivory-300">
                    Max
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={group.maxSelect}
                      onChange={(e) => setGroup(groupIndex, { maxSelect: Number(e.target.value) })}
                      className="w-14 rounded-md border border-white/10 bg-ink-850 px-2 py-1 text-xs"
                    />
                  </label>
                </div>

                <div className="mt-2 space-y-2">
                  {group.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <Input
                        value={option.name}
                        onChange={(e) => setOption(groupIndex, optionIndex, { name: e.target.value })}
                        placeholder="Option name"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        value={option.priceRupees}
                        onChange={(e) => setOption(groupIndex, optionIndex, { priceRupees: Number(e.target.value) })}
                        className="w-24"
                        aria-label="Extra price"
                      />
                      <button
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            groups: prev.groups.map((g, i) =>
                              i === groupIndex ? { ...g, options: g.options.filter((_, j) => j !== optionIndex) } : g,
                            ),
                          }))
                        }
                        className="rounded-lg p-2 text-ivory-500 hover:text-red-400"
                        aria-label="Remove option"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        groups: prev.groups.map((g, i) =>
                          i === groupIndex
                            ? { ...g, options: [...g.options, { name: '', priceRupees: 0, isDefault: false, isAvailable: true, sortOrder: g.options.length }] }
                            : g,
                        ),
                      }))
                    }
                  >
                    <Plus size={13} /> Option
                  </Button>
                </div>
              </div>
            ))}
            {form.groups.length === 0 && (
              <p className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[11px] text-ivory-500">
                <ImagePlus size={13} /> No options yet — guests can still add this dish in one tap.
              </p>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function TriState({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ivory-400">{label}</p>
      <div className="flex gap-1">
        {[
          { key: 'yes', label: 'Yes', value: true },
          { key: 'no', label: 'No', value: false },
          { key: 'unknown', label: 'Not set', value: null },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              'flex-1 rounded-lg border px-2 py-2 text-xs transition',
              value === option.value
                ? 'border-lime-500/50 bg-lime-500/10 text-lime-300'
                : 'border-white/10 text-ivory-400 hover:border-white/20',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

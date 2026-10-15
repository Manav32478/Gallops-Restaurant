'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Sheet } from '@/components/ui/Sheet';
import { RowSkeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type Category = {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { items: number; sections: number };
  sections: { id: string; name: string; _count: { items: number } }[];
};

export function CategoriesClient({ slug, canEdit }: { slug: string; canEdit: boolean }) {
  const { push } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', isActive: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/${slug}/categories`, { cache: 'no-store' });
      const json = await response.json();
      if (json?.ok) setCategories(json.data.categories);
    } catch {
      push({ tone: 'error', title: 'Could not load sections' });
    } finally {
      setLoading(false);
    }
  }, [slug, push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    const response = await fetch(editing ? `/api/dashboard/${slug}/categories/${editing.id}` : `/api/dashboard/${slug}/categories`, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
      body: JSON.stringify(editing ? { name: form.name, description: form.description, isActive: form.isActive } : { name: form.name, description: form.description }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      push({ tone: 'error', title: 'Could not save', body: json?.error?.message ?? '' });
      return;
    }
    push({ tone: 'success', title: editing ? 'Section updated' : 'Section created' });
    setEditing(null);
    setCreating(false);
    await load();
  }

  async function reorder(ids: string[]) {
    await fetch(`/api/dashboard/${slug}/categories`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
      body: JSON.stringify({ ids }),
    });
    await load();
  }

  function move(index: number, direction: -1 | 1) {
    const ids = categories.map((category) => category.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    void reorder(ids);
  }

  async function remove(category: Category) {
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    const response = await fetch(`/api/dashboard/${slug}/categories/${category.id}`, {
      method: 'DELETE',
      headers: { 'x-gallops-client': '1' },
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      push({ tone: 'error', title: 'Cannot delete', body: json?.error?.message ?? '' });
      return;
    }
    push({ tone: 'success', title: 'Section deleted' });
    await load();
  }

  const top = categories.filter((category) => !category.parentId);

  return (
    <div className="px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Sections</h1>
          <p className="mt-1 text-sm text-ivory-400">
            Categories and sub-sections, in the order guests see them on the menu.
          </p>
        </div>
        {canEdit && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setForm({ name: '', description: '', isActive: true });
              setCreating(true);
            }}
          >
            <Plus size={14} /> Add section
          </Button>
        )}
      </div>

      {loading ? (
        <div className="mt-5">
          <RowSkeleton rows={5} />
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {top.map((category, index) => (
            <motion.div
              key={category.id}
              layout
              className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-ivory-100">{category.name}</p>
                  <Badge tone="neutral">{category._count.items} dishes</Badge>
                  {!category.isActive && <Badge tone="red">Hidden</Badge>}
                </div>
                {category.sections.length > 0 && (
                  <p className="mt-1 text-[11px] text-ivory-500">
                    {category.sections.map((section) => `${section.name} (${section._count.items})`).join(' · ')}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => move(index, -1)} className="rounded-lg p-2 text-ivory-400 hover:bg-white/5" aria-label="Move up">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => move(index, 1)} className="rounded-lg p-2 text-ivory-400 hover:bg-white/5" aria-label="Move down">
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(category);
                      setForm({ name: category.name, description: '', isActive: category.isActive });
                      setCreating(true);
                    }}
                    className="rounded-lg p-2 text-ivory-400 hover:bg-white/5 hover:text-lime-400"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(category)} className="rounded-lg p-2 text-ivory-400 hover:bg-white/5 hover:text-red-400" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <Sheet
        open={creating}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `Edit · ${editing.name}` : 'New section'}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={save}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Section name" required>
            {(id) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kathiyawadi" />}
          </Field>
          <Field label="Description (optional)">
            {(id) => <Input id={id} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
          </Field>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-ivory-300">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Visible to guests
            </label>
          )}
          <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-[11px] text-ivory-500">
            Sub-sections (for example “Tandoor Starters” inside “Starters”) are created by the menu import. Add dishes to
            them from the Menu screen.
          </p>
        </div>
      </Sheet>
    </div>
  );
}

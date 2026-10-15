'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Loader2, Plus, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input, Select, Field } from '@/components/ui/input';
import { Sheet } from '@/components/ui/Sheet';
import { Badge } from '@/components/ui/badge';
import { RowSkeleton } from '@/components/ui/skeleton';
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/auth/rbac';

type Member = {
  id: string;
  role: string;
  roleLabel: string;
  isActive: boolean;
  user: { id: string; name: string; email: string; lastLoginAt: string | null; isActive: boolean };
};

export function StaffClient({ slug, canEdit }: { slug: string; canEdit: boolean }) {
  const { push } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'RECEPTIONIST' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/${slug}/staff`, { cache: 'no-store' });
      const json = await response.json();
      if (json?.ok) setMembers(json.data.members);
    } catch {
      push({ tone: 'error', title: 'Could not load the team' });
    } finally {
      setLoading(false);
    }
  }, [slug, push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    setBusy(true);
    try {
      const response = await fetch(`/api/dashboard/${slug}/staff`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not add the team member.');
      push({ tone: 'success', title: 'Team member added' });
      setCreating(false);
      setForm({ name: '', email: '', password: '', role: 'RECEPTIONIST' });
      await load();
    } catch (error) {
      push({ tone: 'error', title: 'Could not add', body: error instanceof Error ? error.message : '' });
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/dashboard/${slug}/staff/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      push({ tone: 'error', title: 'Update failed', body: json?.error?.message ?? '' });
      return;
    }
    push({ tone: 'success', title: 'Updated' });
    await load();
  }

  async function remove(member: Member) {
    if (!window.confirm(`Remove ${member.user.name} from this restaurant?`)) return;
    const response = await fetch(`/api/dashboard/${slug}/staff/${member.id}`, {
      method: 'DELETE',
      headers: { 'x-gallops-client': '1' },
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      push({ tone: 'error', title: 'Cannot remove', body: json?.error?.message ?? '' });
      return;
    }
    await load();
  }

  return (
    <div className="px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50 lg:text-3xl">Staff &amp; permissions</h1>
          <p className="mt-1 text-sm text-ivory-400">Roles are enforced on the server, not just in the interface.</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> Add team member
          </Button>
        )}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(['OWNER', 'MANAGER', 'RECEPTIONIST', 'KITCHEN'] as const).map((role) => (
          <div key={role} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
            <p className="flex items-center gap-1.5 text-sm text-ivory-100">
              <ShieldCheck size={14} className="text-lime-400" /> {ROLE_LABEL[role]}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ivory-500">{ROLE_DESCRIPTION[role]}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="mt-5">
          <RowSkeleton rows={4} />
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {members.map((member) => (
            <motion.div key={member.id} layout className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm text-lime-400">
                {member.user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ivory-100">{member.user.name}</p>
                <p className="truncate text-[11px] text-ivory-500">
                  {member.user.email}
                  {member.user.lastLoginAt
                    ? ` · last sign-in ${new Date(member.user.lastLoginAt).toLocaleDateString('en-IN')}`
                    : ' · never signed in'}
                </p>
              </div>
              <Badge tone={member.role === 'OWNER' ? 'lime' : member.role === 'MANAGER' ? 'blue' : 'neutral'}>
                {member.roleLabel}
              </Badge>
              {canEdit && member.role !== 'OWNER' && (
                <div className="flex items-center gap-1.5">
                  <Select
                    value={member.role}
                    onChange={(event) => patch(member.id, { role: event.target.value })}
                    className="w-36 py-1.5 text-xs"
                    aria-label="Change role"
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="KITCHEN">Kitchen</option>
                  </Select>
                  <button
                    onClick={() => patch(member.id, { isActive: !member.isActive })}
                    className={clsx('rounded-lg border border-white/10 px-2 py-1.5 text-[11px]', member.isActive ? 'text-ivory-300' : 'text-red-400')}
                  >
                    {member.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button onClick={() => remove(member)} className="rounded-lg border border-white/10 p-2 text-ivory-400 hover:border-red-400/40 hover:text-red-400" aria-label="Remove">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Add a team member"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={add} loading={busy}>
              Create account
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Full name" required>
            {(id) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
          </Field>
          <Field label="Email" required>
            {(id) => <Input id={id} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
          </Field>
          <Field label="Temporary password" required hint="At least 8 characters. Ask them to change it after signing in.">
            {(id) => (
              <Input id={id} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
            )}
          </Field>
          <Field label="Role" required>
            {(id) => (
              <Select id={id} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="MANAGER">Manager</option>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="KITCHEN">Kitchen</option>
              </Select>
            )}
          </Field>
          <p className="flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-[11px] text-ivory-500">
            <KeyRound size={13} className="mt-0.5 shrink-0" />
            Owners are the only role that can manage billing and other owners. Reception can take payments; kitchen staff
            can only move the preparation queue.
          </p>
        </div>
      </Sheet>
      {busy && <Loader2 className="mt-3 animate-spin text-ivory-500" size={14} />}
    </div>
  );
}

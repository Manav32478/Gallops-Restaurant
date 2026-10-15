'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Lock, Mail, QrCode, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { useToast } from '@/components/providers/ToastProvider';

const DEMO = [
  { role: 'Owner', email: 'owner@gallopsfoodplaza.in', password: 'gallops123', note: 'Full access' },
  { role: 'Manager', email: 'manager@gallopsfoodplaza.in', password: 'gallops123', note: 'Operations' },
  { role: 'Reception', email: 'reception@gallopsfoodplaza.in', password: 'gallops123', note: 'Counter' },
  { role: 'Kitchen', email: 'kitchen@gallopsfoodplaza.in', password: 'gallops123', note: 'Queue only' },
  { role: 'Platform admin', email: 'admin@gallops.app', password: 'platform123', note: 'All tenants' },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not sign in.');
      const next = params.get('next') ?? (json.data.memberships.length ? '/dashboard/orders' : '/platform');
      push({ tone: 'success', title: `Welcome back, ${json.data.name.split(' ')[0]}` });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm text-ivory-400 transition hover:text-lime-400">
        <ArrowLeft size={15} /> Back to website
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-500 text-ink-950">
            <QrCode size={19} strokeWidth={2.5} />
          </span>
          <span className="font-display text-2xl text-ivory-50">Staff sign in</span>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6">
          <Field label="Email" required>
            {(id) => (
              <Input
                id={id}
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@restaurant.in"
                required
              />
            )}
          </Field>
          <Field label="Password" required>
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            )}
          </Field>

          {error && (
            <p className="rounded-xl border border-chili/30 bg-chili/10 px-3 py-2 text-xs text-red-300">{error}</p>
          )}

          <Button type="submit" size="lg" className="w-full" loading={pending}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />} Sign in
          </Button>
          <p className="text-center text-[11px] text-ivory-500">
            Sessions expire after 12 hours and can be revoked by an owner.
          </p>
        </form>

        <div className="mt-6 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ivory-200">
            <ShieldCheck size={14} className="text-lime-400" /> Demo accounts
          </p>
          <p className="mt-1 text-[11px] text-ivory-500">Click an account to fill the form.</p>
          <div className="mt-3 space-y-1.5">
            {DEMO.map((account) => (
              <button
                key={account.email}
                onClick={() => setForm({ email: account.email, password: account.password })}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 text-left transition hover:border-lime-500/40"
              >
                <span className="text-xs text-ivory-200">{account.role}</span>
                <span className="truncate text-[11px] text-ivory-500">
                  {account.email} · {account.note}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ivory-500">
          New restaurant?{' '}
          <Link href="/register" className="text-lime-400 hover:underline">
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}

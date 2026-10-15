'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, PartyPopper, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { useToast } from '@/components/providers/ToastProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', restaurantName: '', city: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ slug: string; name: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json?.error?.message ?? 'Could not create the account.');
      setCreated(json.data);
      push({ tone: 'success', title: 'Restaurant created' });
      window.setTimeout(() => {
        router.push('/dashboard/menu');
        router.refresh();
      }, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm text-ivory-400 transition hover:text-lime-400">
        <ArrowLeft size={15} /> Back to website
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {created ? (
          <div className="rounded-3xl border border-lime-500/25 bg-lime-500/[0.07] p-6 text-center">
            <PartyPopper size={30} className="mx-auto text-lime-400" />
            <h1 className="mt-3 font-display text-2xl text-ivory-50">{created.name} is ready</h1>
            <p className="mt-2 text-sm text-ivory-400">
              We created six tables with QR codes and started your Starter trial. Taking you to the dashboard…
            </p>
            <p className="mt-3 break-all text-[11px] text-ivory-500">/r/{created.slug}/menu</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-500 text-ink-950">
                <Store size={19} />
              </span>
              <span className="font-display text-2xl text-ivory-50">Create your restaurant</span>
            </div>

            <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6">
              <Field label="Your name" required>
                {(id) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />}
              </Field>
              <Field label="Restaurant name" required>
                {(id) => (
                  <Input id={id} value={form.restaurantName} onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} required />
                )}
              </Field>
              <Field label="City">
                {(id) => <Input id={id} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />}
              </Field>
              <Field label="Email" required>
                {(id) => <Input id={id} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />}
              </Field>
              <Field label="Password" required hint="At least 8 characters.">
                {(id) => (
                  <Input id={id} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
                )}
              </Field>
              {error && <p className="rounded-xl border border-chili/30 bg-chili/10 px-3 py-2 text-xs text-red-300">{error}</p>}
              <Button type="submit" size="lg" className="w-full" loading={pending}>
                {pending ? <Loader2 size={16} className="animate-spin" /> : null} Create restaurant
              </Button>
              <p className="text-center text-[11px] text-ivory-500">
                You get an owner account, six tables with QR codes and a Starter trial. No card required.
              </p>
            </form>

            <p className="mt-6 text-center text-xs text-ivory-500">
              Already have an account?{' '}
              <Link href="/login" className="text-lime-400 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}

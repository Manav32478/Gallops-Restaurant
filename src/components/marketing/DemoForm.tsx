'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Field } from '@/components/ui/input';
import { useToast } from '@/components/providers/ToastProvider';
import { CheckCircle2, Loader2 } from 'lucide-react';

export function DemoForm() {
  const { push } = useToast();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', restaurantName: '', city: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-gallops-client': '1' },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        if (json?.error?.details?.fieldErrors) {
          const flat: Record<string, string> = {};
          for (const [key, value] of Object.entries(json.error.details.fieldErrors)) {
            flat[key] = (value as string[])[0];
          }
          setErrors(flat);
        }
        throw new Error(json?.error?.message ?? 'Could not send your request.');
      }
      setDone(true);
      push({ tone: 'success', title: 'Demo request received', body: 'We will contact you on the details provided.' });
    } catch (error) {
      push({
        tone: 'error',
        title: 'Could not send request',
        body: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-lime-500/25 bg-lime-500/[0.07] p-8 text-center">
        <CheckCircle2 size={34} className="text-lime-400" />
        <p className="font-display text-xl text-ivory-100">Request received</p>
        <p className="max-w-sm text-sm text-ivory-400">
          Thank you, {form.name.split(' ')[0] || 'there'}. Your request is stored in the platform admin console and we
          will reach out on {form.email}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Your name" required error={errors.name}>
        {(id) => (
          <Input
            id={id}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Priya Shah"
            required
          />
        )}
      </Field>
      <Field label="Email" required error={errors.email}>
        {(id) => (
          <Input
            id={id}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@restaurant.in"
            required
          />
        )}
      </Field>
      <Field label="Phone" error={errors.phone}>
        {(id) => (
          <Input
            id={id}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+91 98765 43210"
            inputMode="tel"
          />
        )}
      </Field>
      <Field label="Restaurant name" error={errors.restaurantName}>
        {(id) => (
          <Input
            id={id}
            value={form.restaurantName}
            onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
            placeholder="Gallops Restaurant"
          />
        )}
      </Field>
      <Field label="City" error={errors.city}>
        {(id) => (
          <Input id={id} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Mahuva" />
        )}
      </Field>
      <Field label="Anything we should know?">
        {(id) => (
          <Textarea
            id={id}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="We have 14 tables and want QR ordering with a kitchen display."
          />
        )}
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Request a walkthrough
        </Button>
        <p className="mt-3 text-xs text-ivory-500">
          No card required. Submissions are stored in the platform admin console (Platform → Leads).
        </p>
      </div>
    </form>
  );
}

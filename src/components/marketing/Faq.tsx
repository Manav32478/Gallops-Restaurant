'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';

const ITEMS = [
  {
    q: 'Do customers need to install an app?',
    a: 'No. Guests scan the QR code on their table and the menu opens instantly in their phone browser. It supports add-to-home-screen, so it behaves like an app without an install.',
  },
  {
    q: 'What happens if the internet drops at the restaurant?',
    a: 'The customer tracking page and the dashboard both reconnect automatically and re-sync the live order state. Order placement requires connectivity, and the UI shows a clear retry state instead of silently failing.',
  },
  {
    q: 'Can we edit prices and mark items sold out during service?',
    a: 'Yes. Menu changes are saved to the database and appear on the guest menu immediately — no deployment, no app update. Sold-out items are hidden behind a clear "Sold out" state.',
  },
  {
    q: 'How are payments handled?',
    a: 'The core release supports cash at the counter and pay-at-table. Online payments via Razorpay are wired in but stay disabled until you add your own API keys — the platform never marks an order paid without verified server-side confirmation.',
  },
  {
    q: 'Who can change an order status?',
    a: 'Roles are enforced server-side: owners and managers run everything, reception accepts and completes orders, kitchen staff only move the preparation queue forward. Payment status changes require the right capability.',
  },
  {
    q: 'Is the menu data shown for Gallops Restaurant verified?',
    a: 'The 170 imported dishes come from public online listings and are flagged "needs review" in the dashboard. Prices are third-party delivery prices and must be confirmed against your in-house menu before publishing. Dietary labels are intentionally left unset because no source publishes them.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl divide-y divide-white/[0.07] overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02]">
      {ITEMS.map((item, index) => (
        <div key={item.q}>
          <button
            onClick={() => setOpen(open === index ? null : index)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
            aria-expanded={open === index}
          >
            <span className="text-sm font-medium text-ivory-100 sm:text-base">{item.q}</span>
            <motion.span animate={{ rotate: open === index ? 45 : 0 }} transition={{ duration: 0.2 }}>
              <Plus size={18} className="shrink-0 text-lime-400" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <p className="px-5 pb-5 text-sm leading-relaxed text-ivory-400">{item.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

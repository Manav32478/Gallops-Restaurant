'use client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Mobile-first bottom sheet on small screens, centred dialog from `sm` up.
 * Closes on Escape / backdrop click, locks background scroll.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9000] flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            initial={reduced ? { opacity: 0 } : { y: '100%', opacity: 0.6 }}
            animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: '100%', opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className={`relative z-10 max-h-[92vh] w-full ${maxWidth} overflow-hidden rounded-t-3xl border border-white/10 bg-ink-850 shadow-lift sm:rounded-3xl`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
              <div className="min-w-0 text-base font-medium text-ivory-100">{title}</div>
              <button
                onClick={onClose}
                className="-mr-1 rounded-full p-1.5 text-ivory-400 transition hover:bg-white/10 hover:text-ivory-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="thin-scroll max-h-[62vh] overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="border-t border-white/[0.07] px-5 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

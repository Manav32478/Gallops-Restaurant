'use client';

/**
 * PWA plumbing: registers the service worker (production only) and exposes the
 * native "Install app" flow where the browser supports it.
 *
 * On Android/Chrome the `beforeinstallprompt` event gives a real install dialog.
 * On iOS Safari that event never fires, so we show the manual
 * Share → "Add to Home Screen" instruction instead. Nothing is faked: if the
 * browser cannot install, we say so rather than showing a dead button.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Share, Smartphone, X } from 'lucide-react';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PwaInstaller() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register only in a production build AND a secure context (https or localhost).
    // Registering during development would cache stale build output.
    if (
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production' &&
      (window.isSecureContext || window.location.hostname === 'localhost')
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {prompt && !installed && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-lime-500/25 bg-ink-900/95 p-3.5 shadow-lift backdrop-blur-xl sm:bottom-6"
            role="status"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-lime-400">
              <Smartphone size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ivory-50">Install the Gallops app</p>
              <p className="text-[11px] text-ivory-400">Home-screen icon, full screen, works offline.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await prompt.prompt();
                const choice = await prompt.userChoice;
                if (choice.outcome === 'accepted') setInstalled(true);
                setPrompt(null);
              }}
              className="shrink-0 rounded-xl bg-lime-500 px-3 py-2 text-xs font-semibold text-ink-950 transition hover:bg-lime-400 focus-ring"
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => setPrompt(null)}
              className="shrink-0 rounded-xl p-1.5 text-ivory-400 transition hover:bg-white/5 focus-ring"
              aria-label="Dismiss install prompt"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Small button for menus / footers: installs where supported, explains iOS. */
export function InstallAppButton({ className }: { className?: string }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(navigator as { standalone?: boolean }).standalone);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (installed || (!prompt && !isIos)) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
            const choice = await prompt.userChoice;
            if (choice.outcome === 'accepted') setInstalled(true);
            setPrompt(null);
          } else {
            setShowIosHelp(true);
          }
        }}
        className="inline-flex items-center gap-2 rounded-2xl border border-lime-500/30 bg-lime-500/10 px-4 py-2.5 text-sm font-semibold text-lime-300 transition hover:bg-lime-500/20 focus-ring"
      >
        <Download size={15} /> Install app
      </button>

      <AnimatePresence>
        {showIosHelp && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-ivory-400"
          >
            <Share size={14} className="mt-0.5 shrink-0 text-lime-400" />
            On iPhone: tap <strong className="text-ivory-200">Share</strong> →{' '}
            <strong className="text-ivory-200">Add to Home Screen</strong>. It opens full screen, just like an app.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

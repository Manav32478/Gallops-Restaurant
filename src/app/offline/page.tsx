import Link from 'next/link';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-lime-500/20 bg-lime-500/10 text-lime-400">
          <WifiOff size={24} />
        </span>
        <h1 className="mt-5 font-display text-2xl text-ivory-50">You are offline</h1>
        <p className="mt-3 text-sm leading-relaxed text-ivory-400">
          The Gallops menu needs a connection to show live prices and to send your order to the kitchen. Reconnect to
          Wi-Fi or mobile data and try again.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a href="/" className="block">
            <Button className="w-full">
              <RefreshCw size={16} /> Retry
            </Button>
          </a>
          <Link
            href="/r/gallops/menu"
            className="text-xs text-ivory-400 underline-offset-4 transition hover:text-lime-400 hover:underline"
          >
            Go to the menu
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { QrCode } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lime-400">
        <QrCode size={24} />
      </span>
      <h1 className="mt-5 font-display text-3xl text-ivory-50">We could not find that page</h1>
      <p className="mt-2 max-w-md text-sm text-ivory-400">
        If you scanned a table QR code, please scan it again — the link may be for a table that has been disabled or
        replaced.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/r/gallops/menu" className="rounded-2xl bg-lime-500 px-5 py-3 text-sm font-semibold text-ink-950">
          Open the Gallops menu
        </Link>
        <Link href="/" className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-ivory-200">
          Go to the website
        </Link>
      </div>
    </div>
  );
}

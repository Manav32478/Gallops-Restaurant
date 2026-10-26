import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { PwaInstaller } from '@/components/pwa/PwaInstaller';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Gallops — QR Ordering & Restaurant Management',
    template: '%s · Gallops',
  },
  description:
    'Scan, browse and order from your table at Gallops Restaurant, Mahuva. Real-time reception dashboard, kitchen display and ready-for-pickup notifications.',
  applicationName: 'Gallops',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Gallops', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-64.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'Gallops — Your Table. Your Menu. A Smarter Dining Experience.',
    description:
      'Discover the Gallops Restaurant digital menu, order from your table, and stay updated until your food is ready.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#07070A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-ink-950 text-ivory-100 antialiased">
        <ToastProvider>{children}</ToastProvider>
        <PwaInstaller />
      </body>
    </html>
  );
}

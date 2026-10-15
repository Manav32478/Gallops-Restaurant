import { SiteHeader, SiteFooter, SiteEffects } from '@/components/marketing/SiteChrome';
import { Reveal } from '@/components/ui/Reveal';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <SiteEffects />
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-[radial-glow] opacity-60" />
        <div className="absolute inset-0 bg-grid-faint bg-[size:56px_56px] opacity-25 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
        <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-display text-4xl text-ivory-50 sm:text-5xl">Terms of service</h1>
          <p className="mt-2 text-sm text-ivory-500">Last updated 14 October 2026</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-ivory-300">
          <section>
            <h2 className="font-display text-xl text-ivory-50">Using the ordering service</h2>
            <p className="mt-2">
              Scanning a table QR code opens the menu for that restaurant. Placing an order creates a real order with the
              restaurant: it is prepared immediately and can only be cancelled within the restaurant&apos;s cancellation
              window. Prices, taxes and service charges are calculated by the restaurant&apos;s server and confirmed at
              checkout.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ivory-50">Payments</h2>
            <p className="mt-2">
              Unless a restaurant has enabled online payments, orders are paid at the counter or at the table. This
              application does not mark any order paid without verification from the payment provider.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ivory-50">Menu information</h2>
            <p className="mt-2">
              Menu content is supplied by each restaurant. Imported items may carry third-party prices pending review.
              Images without an approved photograph are clearly marked as illustrative. Allergen and dietary information
              is displayed only where the restaurant has verified it; the restaurant is responsible for its accuracy.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ivory-50">Restaurant subscriptions</h2>
            <p className="mt-2">
              Restaurants subscribe to a plan with defined limits on tables, staff accounts and monthly orders. Billing
              runs in development mode until a payment provider is configured; no charges are made by this application in
              that mode.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ivory-50">Availability</h2>
            <p className="mt-2">
              The service is provided on a best-efforts basis. Restaurants can pause online ordering at any time, in which
              case the menu clearly says so and guests order with a server instead.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ivory-50">Contact</h2>
            <p className="mt-2">
              Questions about these terms: info@gallopsfoodplaza.in · +91 84690 07078 · Gallops Restaurant, Shree
              Mandhata Circle, Mahuva, Gujarat 364290.
            </p>
          </section>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

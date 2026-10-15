import { SiteHeader, SiteFooter, SiteEffects } from '@/components/marketing/SiteChrome';
import { Reveal } from '@/components/ui/Reveal';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <SiteEffects />
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-[radial-glow] opacity-60" />
        <div className="absolute inset-0 bg-grid-faint bg-[size:56px_56px] opacity-25 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
        <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-display text-4xl text-ivory-50 sm:text-5xl">Privacy policy</h1>
          <p className="mt-2 text-sm text-ivory-500">Last updated 14 October 2026</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-ivory-300">
          <section>
            <h2 className="font-display text-xl text-ivory-50">Who we are</h2>
            <p className="mt-2">
              This platform (&ldquo;Gallops OS&rdquo;) operates the QR ordering and restaurant management service used by
              Gallops Restaurant in Mahuva, Gujarat, and by other restaurants that subscribe to the service. Each
              restaurant is a separate tenant and controls its own menu, orders and staff.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ivory-50">What we collect from guests</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>The table identifier embedded in the QR code you scanned.</li>
              <li>The items, quantities, options and any preparation notes you choose to send.</li>
              <li>Optional name and phone number, only if you provide them for order updates.</li>
              <li>An unguessable tracking token stored in the order link so only you can view your order.</li>
              <li>If you enable notifications, a browser push subscription (never used for marketing).</li>
            </ul>
            <p className="mt-2">
              Guests do not need an account and we do not ask for payment card details in this application unless a
              restaurant has enabled a payment provider, in which case the provider handles the card data.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ivory-50">How we use it</h2>
            <p className="mt-2">
              Order information is used to prepare your food, show you the status of your order and settle the bill. It
              is visible to the staff of the restaurant you ordered from. It is never sold. Staff access is controlled by
              role and every tenant&apos;s data is isolated from other tenants.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ivory-50">Retention and your choices</h2>
            <p className="mt-2">
              Orders are retained by the restaurant for operational and accounting purposes. You can request deletion of
              your name and phone number by speaking to the restaurant or emailing info@gallopsfoodplaza.in. You can
              disable notifications at any time in your browser settings.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ivory-50">Menu data accuracy</h2>
            <p className="mt-2">
              The Gallops menu was imported from publicly published listings and is flagged for verification by the
              restaurant. Prices shown may differ from the in-house menu until the restaurant confirms them. Dietary,
              allergen and ingredient information is shown only when the restaurant has verified it — always tell your
              server about an allergy.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ivory-50">Contact</h2>
            <p className="mt-2">
              Gallops Restaurant, Shree Mandhata Circle, Mahuva, Gujarat 364290 · +91 84690 07078 ·
              info@gallopsfoodplaza.in
            </p>
          </section>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

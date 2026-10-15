import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { SiteHeader, SiteFooter, SiteEffects } from '@/components/marketing/SiteChrome';
import { Hero } from '@/components/marketing/sections/Hero';
import { Stats, StackMarquee } from '@/components/marketing/sections/Stats';
import { HowItWorks } from '@/components/marketing/sections/HowItWorks';
import { Tour } from '@/components/marketing/sections/Tour';
import { FeatureBento } from '@/components/marketing/sections/FeatureBento';
import { MenuMarquee, type MarqueeDish } from '@/components/marketing/sections/MenuMarquee';
import { Security } from '@/components/marketing/sections/Security';
import { PricingTeaser, type PlanCard } from '@/components/marketing/sections/PricingTeaser';
import { Cta } from '@/components/marketing/sections/Cta';
import { Faq } from '@/components/marketing/Faq';
import { Section, SectionHeading } from '@/components/marketing/primitives';
import { Beam } from '@/components/marketing/effects';
import { Reveal } from '@/components/ui/Reveal';

export const dynamic = 'force-dynamic';

const SLUG = 'gallops';

export const metadata: Metadata = {
  title: 'Gallops OS — QR ordering & restaurant management, built in India',
  description:
    'Guests scan, order and track from the table. Reception, kitchen and analytics update in real time. INR-native, tenant-isolated, and live today at Gallops Restaurant, Mahuva.',
};

export default async function HomePage() {
  const [restaurant, tables, dishCount, categories, dishes, plans] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { slug: SLUG },
      select: {
        name: true,
        phone: true,
        email: true,
        addressLine: true,
        city: true,
        state: true,
        postalCode: true,
        operatingHours: true,
        defaultPrepMinutes: true,
      },
    }),
    prisma.restaurantTable.count({ where: { restaurant: { slug: SLUG }, status: 'ACTIVE' } }),
    prisma.menuItem.count({ where: { restaurant: { slug: SLUG }, isPublished: true } }),
    prisma.menuCategory.count({ where: { restaurant: { slug: SLUG } } }),
    prisma.menuItem.findMany({
      where: { restaurant: { slug: SLUG }, isPublished: true },
      select: {
        id: true,
        name: true,
        priceMinor: true,
        isFeatured: true,
        category: { select: { name: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      take: 18,
    }),
    prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sortOrder: 'asc' } }),
  ]);

  const marqueeDishes: MarqueeDish[] = dishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    priceMinor: dish.priceMinor,
    category: dish.category?.name ?? 'Menu',
    isFeatured: dish.isFeatured,
  }));

  const planCards: PlanCard[] = plans.map((plan) => ({
    code: plan.code,
    name: plan.name,
    description: plan.description,
    priceMinor: plan.priceMinor,
    maxTables: plan.maxTables,
    maxStaff: plan.maxStaff,
    maxOrdersPerMonth: plan.maxOrdersPerMonth,
    features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
    highlighted: plan.code === 'GROWTH',
  }));

  const hours = (() => {
    const raw = restaurant?.operatingHours as Record<string, { open: string; close: string }[]> | null;
    const today = raw?.mon?.[0];
    return today ? `Open ${today.open} – ${today.close}, every day` : 'Open daily';
  })();

  const address = restaurant
    ? [restaurant.addressLine, restaurant.city, restaurant.state, restaurant.postalCode]
        .filter(Boolean)
        .join(', ')
    : 'Mahuva, Gujarat, India';

  const stats = [
    {
      label: 'Dishes live',
      value: dishCount,
      hint: 'Published on the guest menu right now — imported from public listings and awaiting owner verification.',
    },
    {
      label: 'Menu categories',
      value: categories,
      hint: 'Thali, soups, starters, mains, breads, rice, pizza, noodles, snacks and beverages.',
    },
    {
      label: 'Tables with QR codes',
      value: tables,
      hint: 'Each has its own unpredictable token that can be rotated without reprinting the rest.',
    },
    {
      label: 'Staff roles',
      value: 4,
      hint: 'Owner, manager, receptionist and kitchen — capabilities enforced server-side.',
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant?.name ?? 'Gallops Restaurant',
    telephone: restaurant?.phone ?? undefined,
    email: restaurant?.email ?? undefined,
    servesCuisine: ['Indian', 'Kathiyawadi', 'Punjabi', 'Chinese', 'Italian'],
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    address: {
      '@type': 'PostalAddress',
      streetAddress: restaurant?.addressLine ?? undefined,
      addressLocality: restaurant?.city ?? 'Mahuva',
      addressRegion: restaurant?.state ?? 'Gujarat',
      postalCode: restaurant?.postalCode ?? '364290',
      addressCountry: 'IN',
    },
    url: '/r/gallops/menu',
  };

  return (
    <div className="relative min-h-screen bg-ink-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteEffects />
      <SiteHeader />

      <main id="main">
        <Hero menuHref={`/r/${SLUG}/menu`} />

        <Stats
          items={stats}
          note="Counts read live from this installation’s database — nothing on this page is a made-up number."
        />

        <HowItWorks />
        <Tour />
        <FeatureBento />
        <MenuMarquee dishes={marqueeDishes} />
        <StackMarquee />
        <Security />

        <Section id="faq" className="border-t border-white/[0.06]">
          <SectionHeading
            eyebrow="Questions"
            title="The things restaurateurs actually ask."
            description="If something here is not covered, call us — the answers below are the same ones we give on a demo."
            align="center"
          />
          <Reveal delay={0.05} className="mt-10">
            <Faq />
          </Reveal>
        </Section>

        <Beam />

        <PricingTeaser plans={planCards} billingMode={process.env.PLATFORM_BILLING_MODE ?? 'development'} />

        <Cta
          phone={restaurant?.phone ?? null}
          email={restaurant?.email ?? null}
          address={address}
          hours={hours}
        />
      </main>

      <SiteFooter phone={restaurant?.phone ?? undefined} email={restaurant?.email ?? undefined} />
    </div>
  );
}

import type { Metadata } from 'next';
import { Clock, Instagram, Mail, MapPin, Phone, QrCode, Sparkles } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { SiteHeader, SiteFooter, SiteEffects } from '@/components/marketing/SiteChrome';
import { PageHero, Section, SectionHeading } from '@/components/marketing/primitives';
import { DemoForm } from '@/components/marketing/DemoForm';
import { Reveal, Stagger, StaggerItem } from '@/components/ui/Reveal';
import { Aurora, GridBackdrop, Spotlight } from '@/components/marketing/effects';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Bring QR ordering to your restaurant. We import your menu for review, print your table QR sheet and train your team. Based in Mahuva, Gujarat.',
};

export default async function ContactPage() {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: 'gallops' },
    select: {
      name: true,
      phone: true,
      email: true,
      addressLine: true,
      city: true,
      state: true,
      postalCode: true,
      instagram: true,
      website: true,
      operatingHours: true,
    },
  });

  const hours = restaurant?.operatingHours as Record<string, { open: string; close: string }[]> | null;
  const today = hours?.mon?.[0];

  const cards = [
    {
      icon: MapPin,
      title: restaurant?.name ?? 'Gallops Restaurant',
      lines: [
        [restaurant?.addressLine, restaurant?.city, restaurant?.state, restaurant?.postalCode]
          .filter(Boolean)
          .join(', ') || 'Mahuva, Gujarat 364290',
      ],
    },
    {
      icon: Phone,
      title: 'Call the restaurant',
      lines: [restaurant?.phone ?? '+91 84690 07078'],
      href: restaurant?.phone ? `tel:${restaurant.phone.replace(/\s/g, '')}` : undefined,
    },
    {
      icon: Mail,
      title: 'Email',
      lines: [restaurant?.email ?? 'info@gallopsfoodplaza.in'],
      href: restaurant?.email ? `mailto:${restaurant.email}` : undefined,
    },
    {
      icon: Clock,
      title: 'Service hours',
      lines: [today ? `${today.open} – ${today.close}, every day` : 'Open daily', 'Kitchen takes last orders 30 min before close'],
    },
  ];

  return (
    <div className="relative min-h-screen bg-ink-950">
      <SiteEffects />
      <SiteHeader />

      <main id="main">
        <PageHero
          eyebrow={<span className="flex items-center gap-1.5"><Sparkles size={12} /> Contact</span>}
          title={<>Bring QR ordering to your floor</>}
          description="Send us a note and we will set up your restaurant, import your existing menu for review, print your table QR sheet and train your team."
        />

        <Section className="pt-12">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-4">
              <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {cards.map((card) => (
                  <StaggerItem key={card.title}>
                    <Spotlight className="h-full">
                      <div className="flex gap-3.5 p-5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-lime-500/20 bg-lime-500/10 text-lime-400">
                          <card.icon size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ivory-50">{card.title}</p>
                          {card.lines.map((line) =>
                            card.href ? (
                              <a
                                key={line}
                                href={card.href}
                                className="mt-1 block truncate text-sm text-ivory-300 transition hover:text-lime-400"
                              >
                                {line}
                              </a>
                            ) : (
                              <p key={line} className="mt-1 text-sm leading-relaxed text-ivory-400">
                                {line}
                              </p>
                            ),
                          )}
                        </div>
                      </div>
                    </Spotlight>
                  </StaggerItem>
                ))}
              </Stagger>

              <Reveal delay={0.1}>
                <div className="flex flex-wrap gap-2">
                  {restaurant?.instagram && (
                    <a
                      href={`https://instagram.com/${restaurant.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-ivory-300 transition hover:border-lime-500/30 hover:text-lime-300 focus-ring"
                    >
                      <Instagram size={13} /> {restaurant.instagram}
                    </a>
                  )}
                  {restaurant?.website && (
                    <a
                      href={restaurant.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-ivory-300 transition hover:border-lime-500/30 hover:text-lime-300 focus-ring"
                    >
                      <QrCode size={13} /> {restaurant.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.08}>
              <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-6 sm:p-8">
                <Aurora orbs={2} className="opacity-40" />
                <GridBackdrop sweep={false} className="opacity-40" />
                <div className="relative">
                  <SectionHeading
                    eyebrow="Request a walkthrough"
                    title="We will demo it with your menu"
                    description="Tell us about your restaurant and we will call you back — usually the same day."
                  />
                  <div className="mt-7">
                    <DemoForm />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </Section>
      </main>

      <SiteFooter phone={restaurant?.phone ?? undefined} email={restaurant?.email ?? undefined} />
    </div>
  );
}

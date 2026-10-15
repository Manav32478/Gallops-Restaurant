import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { renderQr, tableMenuUrl } from '@/lib/qr';
import { PrintButton } from '@/components/dashboard/PrintButton';

export const dynamic = 'force-dynamic';

/** Printable sheet of table QR codes. */
export default async function QrSheetPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const jar = await cookies();
  const preferred = jar.get('gallops_active_restaurant')?.value;
  const membership = user.memberships.find((m) => m.restaurant.slug === preferred) ?? user.memberships[0];
  if (!membership) redirect('/platform');

  const restaurant = await prisma.restaurant.findUnique({ where: { id: membership.restaurant.id } });
  if (!restaurant) notFound();

  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: restaurant.id, status: { not: 'ARCHIVED' } },
    orderBy: { code: 'asc' },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  const cards = await Promise.all(
    tables.map(async (table) => ({
      code: table.code,
      label: table.label,
      url: tableMenuUrl(base, restaurant.slug, table.qrToken),
      svg: (await renderQr(tableMenuUrl(base, restaurant.slug, table.qrToken), 'svg', 320)) as string,
    })),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ivory-50">Table QR sheet</h1>
          <p className="mt-1 text-sm text-ivory-400">
            Print, cut and place one card on each table. Regenerating a table QR invalidates its printed card.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.code}
            className="break-inside-avoid rounded-3xl border border-black/10 bg-white p-5 text-center text-ink-900"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-ink-900/60">{restaurant.name}</p>
            <p className="mt-1 font-display text-3xl text-ink-950">{card.code}</p>
            {card.label && <p className="text-xs text-ink-900/60">{card.label}</p>}
            <div
              className="mx-auto my-3 h-40 w-40"
              // Inline SVG generated server-side — safe, no external requests.
              dangerouslySetInnerHTML={{ __html: card.svg }}
            />
            <p className="text-xs font-medium text-ink-900">Scan to view the menu &amp; order</p>
            <p className="mt-1 break-all text-[10px] text-ink-900/50">{card.url}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

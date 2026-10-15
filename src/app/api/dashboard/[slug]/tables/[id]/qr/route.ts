import { prisma } from '@/lib/prisma';
import { fail, handler } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { renderQr, tableMenuUrl } from '@/lib/qr';

export const dynamic = 'force-dynamic';

/** Per-table QR code as SVG or PNG, for download or the printable sheet. */
export const GET = handler(async (req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) => {
  const { slug, id } = await params;
  const ctx = await requireCapability(slug, 'tables.view');
  const table = await prisma.restaurantTable.findFirst({ where: { id, restaurantId: ctx.restaurant.id } });
  if (!table) return fail(404, 'NOT_FOUND', 'Table not found.');

  const url = new URL(req.url);
  const format = url.searchParams.get('format') === 'png' ? 'png' : 'svg';
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`;
  const target = tableMenuUrl(base, slug, table.qrToken);

  if (format === 'png') {
    const buffer = (await renderQr(target, 'png', Number(url.searchParams.get('size') ?? 512))) as Buffer;
    return new Response(new Uint8Array(buffer), {
      headers: {
        'content-type': 'image/png',
        'content-disposition': `attachment; filename="gallops-${table.code}-qr.png"`,
      },
    });
  }

  const svg = await renderQr(target, 'svg', 512);
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'content-disposition': `inline; filename="gallops-${table.code}-qr.svg"`,
    },
  });
});

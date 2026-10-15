import { NextResponse } from 'next/server';
import { handler, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getPublicMenu } from '@/lib/menu-cache';

export const dynamic = 'force-dynamic';

/**
 * Public menu read. No authentication, no private data.
 * The optional `table` parameter only resolves a table code for display.
 */
export const GET = handler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const url = new URL(req.url);
  const tableToken = url.searchParams.get('table');

  const data = await getPublicMenu(slug);
  if (!data) return fail(404, 'RESTAURANT_NOT_FOUND', 'This restaurant menu is not available.');

  let table: { code: string; label: string | null; status: string } | null = null;
  let tableError: string | null = null;
  if (tableToken) {
    const found = await prisma.restaurantTable.findFirst({
      where: { restaurantId: data.restaurant.id, qrToken: tableToken },
      select: { code: true, label: true, status: true },
    });
    if (!found) tableError = 'INVALID_TABLE';
    else if (found.status !== 'ACTIVE') tableError = 'TABLE_DISABLED';
    else table = found;
  }

  return NextResponse.json({ ok: true, data: { ...data, table, tableError } });
});

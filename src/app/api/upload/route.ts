import { prisma } from '@/lib/prisma';
import { ok, fail, handler, assertSameOrigin } from '@/lib/api';
import { requireCapability } from '@/lib/tenant';
import { storeImage, UploadError } from '@/lib/storage';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Menu image upload. Authenticated staff only, MIME + magic-byte validated,
 * size capped, and the file is written outside the public bundle.
 */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const slug = (req.headers.get('x-restaurant-slug') ?? new URL(req.url).searchParams.get('slug') ?? '').trim();
  if (!slug) return fail(400, 'MISSING_SLUG', 'Missing restaurant.');
  const ctx = await requireCapability(slug, 'menu.edit');

  const limit = rateLimit(`upload:${ctx.user.id}`, 40, 60 * 60_000);
  if (!limit.allowed) return fail(429, 'RATE_LIMITED', 'Upload limit reached. Try again later.');

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return fail(400, 'NO_FILE', 'Choose an image to upload.');

  try {
    const url = await storeImage(file, `menu/${ctx.restaurant.id}`);
    const itemId = form?.get('itemId');
    if (typeof itemId === 'string' && itemId) {
      const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId: ctx.restaurant.id } });
      if (item) {
        await prisma.menuItem.update({
          where: { id: item.id },
          data: { imageUrl: url, imageIsPlaceholder: false },
        });
        await prisma.itemImage.create({ data: { itemId: item.id, url, isPrimary: true, sortOrder: 0 } });
      }
    }
    return ok({ url, isPlaceholder: false });
  } catch (error) {
    if (error instanceof UploadError) return fail(422, 'UPLOAD_REJECTED', error.message);
    throw error;
  }
});

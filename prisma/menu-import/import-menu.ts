/**
 * Menu importer.
 *
 * Reads the extracted Gallops menu (prisma/menu-import/gallops-menu.json) and
 * upserts it into the database for a given restaurant slug.
 *
 * Rules honoured by this importer:
 *  - nothing is invented: names/prices/serving notes come straight from the
 *    source file, which records where each value came from;
 *  - every imported row keeps its provenance (sourceName/sourceUrl/sourcePrice)
 *    and is flagged NEEDS_REVIEW so the owner must confirm it before publishing;
 *  - dietary flags are deliberately left UNSET because no source publishes them;
 *  - re-running is safe (idempotent upsert) and never overwrites a value the
 *    owner has already verified (OWNER_VERIFIED / OWNER_EDITED rows are skipped).
 */
import { readFile } from 'fs/promises';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { slugify } from '../../src/lib/ids';
import { rupeesToPaise } from '../../src/lib/money';

type SourceItem = { name: string; price: number; serving?: string; note?: string };
type SourceSection = { name: string; items: SourceItem[] };
type SourceCategory = { name: string; sections: SourceSection[] };
type SourceFile = {
  _meta: Record<string, any>;
  categories: SourceCategory[];
};

/** Illustrative imagery. None of these are photographs of the restaurant's food. */
const IMAGE_MAP: Array<{ image: string; match: RegExp }> = [
  { image: '/img/food/thali.jpg', match: /thali/i },
  { image: '/img/food/paneer-tikka.jpg', match: /tikka|tandoori platter|kabab/i },
  { image: '/img/food/manchurian.jpg', match: /manchurian|chilly|chinese bhel|spring roll|crispy|corn thai/i },
  { image: '/img/food/biryani.jpg', match: /biryani|pulao|jeera rice|fried rice|khichdi|kadi$/i },
  { image: '/img/food/khichdi.jpg', match: /khichdi|kadi/i },
  { image: '/img/food/dal-makhani.jpg', match: /^dal|dhaba dal/i },
  { image: '/img/food/pizza.jpg', match: /pizza|sizzler|macaroni|baked/i },
  { image: '/img/food/breads.jpg', match: /naan|kulcha|paratha|roti|roti$|rotla|roti\b/i },
  { image: '/img/food/cold-coffee.jpg', match: /shake|lassi|coffee|butter milk|lime/i },
];

export function imageFor(name: string): string | null {
  for (const entry of IMAGE_MAP) {
    if (entry.match.test(name)) return entry.image;
  }
  return null;
}

export async function importMenu(slug: string, file = path.join(process.cwd(), 'prisma/menu-import/gallops-menu.json')) {
  const raw = await readFile(file, 'utf8');
  const data = JSON.parse(raw) as SourceFile;
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) throw new Error(`Restaurant "${slug}" not found. Run the seed first.`);

  const meta = data._meta;
  const sourceName = meta?.itemSource?.name ?? 'Imported menu';
  const sourceUrl = meta?.itemSource?.url ?? '';
  const provenanceNote = meta?.itemSource?.notes ?? '';

  let categories = 0;
  let items = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const [catIndex, category] of data.categories.entries()) {
      const catSlug = uniqueSlug(slugify(category.name));
      const cat = await tx.menuCategory.upsert({
        where: { restaurantId_slug: { restaurantId: restaurant.id, slug: catSlug } },
        create: {
          restaurantId: restaurant.id,
          name: category.name,
          slug: catSlug,
          sortOrder: catIndex * 10,
          isActive: true,
        },
        update: { name: category.name, sortOrder: catIndex * 10 },
      });
      categories += 1;

      const useSections = category.sections.length > 1 || (category.sections[0]?.name && category.sections.length >= 1);
      for (const [secIndex, section] of category.sections.entries()) {
        const target = useSections
          ? await tx.menuCategory.upsert({
              where: { restaurantId_slug: { restaurantId: restaurant.id, slug: `${catSlug}--${slugify(section.name)}` } },
              create: {
                restaurantId: restaurant.id,
                parentId: cat.id,
                name: section.name || category.name,
                slug: `${catSlug}--${slugify(section.name)}`,
                sortOrder: secIndex * 10,
                isActive: true,
              },
              update: { name: section.name || category.name, sortOrder: secIndex * 10, parentId: cat.id },
            })
          : cat;

        for (const [itemIndex, item] of section.items.entries()) {
          const itemSlug = uniqueSlug(slugify(`${category.name}-${item.name}`));
          const existing = await tx.menuItem.findUnique({
            where: { restaurantId_slug: { restaurantId: restaurant.id, slug: itemSlug } },
            select: { id: true, verificationStatus: true },
          });
          if (existing && (existing.verificationStatus === 'OWNER_VERIFIED' || existing.verificationStatus === 'OWNER_EDITED')) {
            skipped += 1;
            continue; // never clobber owner-confirmed data
          }

          const priceMinor = rupeesToPaise(item.price);
          const imageUrl = imageFor(item.name);
          const payload: Prisma.MenuItemUncheckedCreateInput = {
            restaurantId: restaurant.id,
            categoryId: target.id,
            name: item.name,
            slug: itemSlug,
            description: null,
            servingSize: item.serving ?? null,
            imageUrl,
            imageIsPlaceholder: true,
            priceMinor,
            isAvailable: true,
            isPublished: true,
            isFeatured: false,
            sortOrder: itemIndex * 10,
            sourceName,
            sourceUrl,
            sourcePriceMinor: priceMinor,
            sourceServing: item.serving ?? null,
            sourceNote: [provenanceNote, item.note].filter(Boolean).join(' ') || null,
            verificationStatus: 'NEEDS_REVIEW',
            verificationNote: 'Imported from public online listing. Confirm price, serving and dietary details before publishing.',
          };

          const saved = await tx.menuItem.upsert({
            where: { restaurantId_slug: { restaurantId: restaurant.id, slug: itemSlug } },
            create: payload,
            update: payload,
          });
          if (imageUrl) {
            await tx.itemImage.upsert({
              where: { id: `${saved.id}-primary` },
              create: { id: `${saved.id}-primary`, itemId: saved.id, url: imageUrl, isPrimary: true, sortOrder: 0 },
              update: { url: imageUrl, isPrimary: true },
            });
          }
          items += 1;
        }
      }
    }
  });

  return { categories, items, skipped, sourceName, sourceUrl };
}

const used = new Set<string>();
function uniqueSlug(slug: string) {
  let candidate = slug || `item-${Math.random().toString(36).slice(2, 8)}`;
  let n = 2;
  while (used.has(candidate)) candidate = `${slug}-${n++}`;
  used.add(candidate);
  return candidate;
}

if (require.main === module) {
  const slug = process.argv[2] ?? 'gallops';
  importMenu(slug)
    .then((result) => {
      console.log(`Imported ${result.items} items into ${result.categories} categories for "${slug}" (${result.skipped} owner-verified rows left untouched).`);
      console.log(`Source: ${result.sourceName} — ${result.sourceUrl}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

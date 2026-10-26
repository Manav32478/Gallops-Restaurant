/**
 * Database seed.
 *
 * Idempotent: safe to run repeatedly. Creates
 *  - subscription plans,
 *  - the Gallops Restaurant tenant with the *verified* public facts,
 *  - a second demo tenant (used to prove tenant isolation),
 *  - staff accounts for every role,
 *  - 14 restaurant tables with unpredictable QR tokens,
 *  - the imported Gallops menu (170 items, all flagged NEEDS_REVIEW),
 *  - sample modifier groups that are imported INACTIVE and must be confirmed,
 *  - clearly-labelled DEMO order history so the analytics board is not empty.
 *
 * Demo orders are synthetic: they exist so the dashboard has something to show on
 * a fresh install. They are tagged guestName='Demo Guest' and are re-created
 * (never duplicated) on every seed run. Delete them with:
 *   delete from "Order" where "guestName" = 'Demo Guest';
 */
// Must be the first import: loads .env before the PrismaClient is constructed.
import './load-env';

import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth/password';
import { randomToken } from '../src/lib/ids';
import { importMenu } from './menu-import/import-menu';

const GALLOPS = {
  slug: 'gallops',
  name: 'Gallops Restaurant',
  tagline: 'Good Food · Great Ambience · Happy You',
  about:
    'A unit of Gallops Food Plaza. Multicuisine family restaurant in Mahuva serving Punjabi, Kathiyawadi, Chinese, South Indian, pizza, pasta and beverages in a comfortable, hygienic, family-friendly space with ample parking.',
  phone: '+91 84690 07078',
  email: 'info@gallopsfoodplaza.in',
  website: 'https://gallopsfoodplaza.in',
  instagram: '@gallops_food_plaza_',
  addressLine: 'Ground Floor, Shree Siddh Ganesh Hospitality, Gandhi Bag Road, Near Dr. Bhutaksir Clinic, Shree Mandhata Circle',
  city: 'Mahuva',
  state: 'Gujarat',
  postalCode: '364290',
  country: 'India',
  latitude: 21.0878611,
  longitude: 71.7627372,
};

const OPERATING_HOURS = {
  mon: [{ open: '06:00', close: '23:30' }],
  tue: [{ open: '06:00', close: '23:30' }],
  wed: [{ open: '06:00', close: '23:30' }],
  thu: [{ open: '06:00', close: '23:30' }],
  fri: [{ open: '06:00', close: '23:30' }],
  sat: [{ open: '06:00', close: '23:30' }],
  sun: [{ open: '06:00', close: '23:30' }],
};

async function upsertPlan(code: string, data: {
  name: string;
  description: string;
  priceMinor: number;
  maxTables: number;
  maxStaff: number;
  maxOrdersPerMonth: number;
  features: string[];
  sortOrder: number;
}) {
  return prisma.plan.upsert({
    where: { code },
    create: { code, ...data },
    update: data,
  });
}

async function upsertUser(email: string, name: string, password: string, isPlatformAdmin = false) {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash, isPlatformAdmin },
    update: { name },
  });
}

async function addMembership(userId: string, restaurantId: string, role: 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'KITCHEN') {
  return prisma.membership.upsert({
    where: { userId_restaurantId: { userId, restaurantId } },
    create: { userId, restaurantId, role },
    update: { role, isActive: true },
  });
}

async function main() {
  console.log('Seeding Gallops platform…');

  // ---------------------------------------------------------------- plans
  // Pricing is ANNUAL (billed once a year, in INR, excluding GST).
  await upsertPlan('STARTER', {
    name: 'Starter',
    description: 'One outlet taking its first orders by QR — billed yearly.',
    priceMinor: 1999900, // ₹19,999 / year
    maxTables: 25,
    maxStaff: 8,
    maxOrdersPerMonth: 5000,
    features: [
      'QR table ordering + printable QR sheet',
      'Reception dashboard (realtime)',
      'Menu, categories & sold-out control',
      'Basic analytics',
      'Cash / counter payments',
      'Email support',
    ],
    sortOrder: 1,
  });
  await upsertPlan('GROWTH', {
    name: 'Growth',
    description: 'The plan most restaurants pick — ₹40,000 a year, everything on the floor.',
    priceMinor: 4000000, // ₹40,000 / year
    maxTables: 60,
    maxStaff: 20,
    maxOrdersPerMonth: 20000,
    features: [
      'Everything in Starter',
      'Kitchen display system',
      'Advanced analytics & best sellers',
      'Coupons & promotions',
      'WhatsApp / SMS ready',
      'Multi-language menu',
      'Priority support',
    ],
    sortOrder: 2,
  });
  await upsertPlan('PRO', {
    name: 'Pro',
    description: 'Multi-outlet groups and high-volume restaurants — billed yearly.',
    priceMinor: 7999900, // ₹79,999 / year
    maxTables: 500,
    maxStaff: 100,
    maxOrdersPerMonth: 100000,
    features: [
      'Everything in Growth',
      'Online payments (Razorpay)',
      'API access & webhooks',
      'Custom branding & domain',
      'Multi-outlet management',
      'Dedicated onboarding & account manager',
    ],
    sortOrder: 3,
  });
  const starter = await prisma.plan.findUniqueOrThrow({ where: { code: 'STARTER' } });
  const growth = await prisma.plan.findUniqueOrThrow({ where: { code: 'GROWTH' } });

  // ---------------------------------------------------------- restaurants
  const gallops = await prisma.restaurant.upsert({
    where: { slug: GALLOPS.slug },
    create: {
      ...GALLOPS,
      logoUrl: '/img/brand/logo-source.png',
      heroImageUrl: '/img/brand/hero.jpg',
      operatingHours: OPERATING_HOURS,
      taxBp: 500,
      serviceChargeBp: 0,
      paymentMethods: ['CASH_AT_COUNTER', 'PAY_AT_TABLE'],
      languages: ['en'],
      notificationSettings: { push: true, email: false, sms: false, whatsapp: false, soundAlerts: true },
      defaultPrepMinutes: 18,
    },
    update: {
      ...GALLOPS,
      logoUrl: '/img/brand/logo-source.png',
      heroImageUrl: '/img/brand/hero.jpg',
      operatingHours: OPERATING_HOURS,
    },
  });

  const demo = await prisma.restaurant.upsert({
    where: { slug: 'spice-route-demo' },
    create: {
      slug: 'spice-route-demo',
      name: 'Spice Route Kitchen (demo tenant)',
      tagline: 'Second tenant — used to verify tenant isolation',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      taxBp: 500,
      isPublished: true,
      notificationSettings: { push: false, email: false, sms: false, whatsapp: false, soundAlerts: true },
    },
    update: {},
  });

  await prisma.subscription.upsert({
    where: { id: `${gallops.id}-subscription` },
    create: { id: `${gallops.id}-subscription`, restaurantId: gallops.id, planId: growth.id, status: 'TRIALING' },
    update: {},
  });
  await prisma.subscription.upsert({
    where: { id: `${demo.id}-subscription` },
    create: { id: `${demo.id}-subscription`, restaurantId: demo.id, planId: starter.id, status: 'TRIALING' },
    update: {},
  });

  // ------------------------------------------------------------- accounts
  const owner = await upsertUser('owner@gallopsfoodplaza.in', 'Gallops Owner', 'gallops123');
  const manager = await upsertUser('manager@gallopsfoodplaza.in', 'Gallops Manager', 'gallops123');
  const reception = await upsertUser('reception@gallopsfoodplaza.in', 'Gallops Reception', 'gallops123');
  const kitchen = await upsertUser('kitchen@gallopsfoodplaza.in', 'Gallops Kitchen', 'gallops123');
  const platformAdmin = await upsertUser('admin@gallops.app', 'Platform Admin', 'platform123', true);
  const otherOwner = await upsertUser('owner@spiceroute.in', 'Spice Route Owner', 'spiceroute123');

  await addMembership(owner.id, gallops.id, 'OWNER');
  await addMembership(manager.id, gallops.id, 'MANAGER');
  await addMembership(reception.id, gallops.id, 'RECEPTIONIST');
  await addMembership(kitchen.id, gallops.id, 'KITCHEN');
  await addMembership(otherOwner.id, demo.id, 'OWNER');
  await prisma.user.update({ where: { id: platformAdmin.id }, data: { isPlatformAdmin: true } });

  // --------------------------------------------------------------- tables
  const tableCodes = Array.from({ length: 14 }, (_, i) => `T${String(i + 1).padStart(2, '0')}`);
  for (const code of tableCodes) {
    const existing = await prisma.restaurantTable.findUnique({
      where: { restaurantId_code: { restaurantId: gallops.id, code } },
    });
    if (existing) continue;
    await prisma.restaurantTable.create({
      data: { restaurantId: gallops.id, code, seats: 4, qrToken: randomToken(12), status: 'ACTIVE' },
    });
  }
  for (const code of ['A1', 'A2', 'A3']) {
    const existing = await prisma.restaurantTable.findUnique({
      where: { restaurantId_code: { restaurantId: demo.id, code } },
    });
    if (existing) continue;
    await prisma.restaurantTable.create({
      data: { restaurantId: demo.id, code, seats: 2, qrToken: randomToken(12), status: 'ACTIVE' },
    });
  }

  // ----------------------------------------------------------------- menu
  const result = await importMenu(GALLOPS.slug);
  console.log(`  menu: ${result.items} items / ${result.categories} categories (${result.skipped} owner-verified rows preserved)`);

  // House specials (owner-curated, editable in the dashboard).
  const featured = [
    'Kathiyawadi Executive Thali',
    'Punjabi Executive Thali',
    'Gallops Special Vegetable',
    'Kadai Paneer',
    'Paneer Tikka Dry',
    'Masala Khichdi with Curd',
    'Gallops Special Lassi',
  ];
  await prisma.menuItem.updateMany({
    where: { restaurantId: gallops.id, name: { in: featured } },
    data: { isFeatured: true, sortOrder: 0 },
  });

  // ------------------------------------------- sample modifier groups (OFF)
  // The public sources do not publish customisation options, so these are
  // imported inactive. The owner enables/edits them in Menu → Modifiers.
  const spiceItems = await prisma.menuItem.findMany({
    where: { restaurantId: gallops.id, name: { in: ['Kadai Paneer', 'Paneer Butter Masala', 'Dal Makhani', 'Paneer Tikka Dry', 'Veg Manchurian Dry', 'Schezwan Fried Rice', 'Chana Masala', 'Mixed Vegetable'] } },
    select: { id: true },
  });
  for (const item of spiceItems) {
    const group = await prisma.variantGroup.upsert({
      where: { id: `${item.id}-spice` },
      create: {
        id: `${item.id}-spice`,
        itemId: item.id,
        kind: 'VARIANT',
        type: 'SINGLE',
        name: 'Spice level',
        required: false,
        isActive: false,
        minSelect: 0,
        maxSelect: 1,
        sortOrder: 0,
      },
      update: {},
    });
    for (const [index, name] of ['Mild', 'Medium', 'Hot'].entries()) {
      await prisma.variantOption.upsert({
        where: { id: `${group.id}-${name.toLowerCase()}` },
        create: {
          id: `${group.id}-${name.toLowerCase()}`,
          groupId: group.id,
          name,
          priceDeltaMinor: 0,
          sortOrder: index,
        },
        update: {},
      });
    }
  }

  const addonItems = await prisma.menuItem.findMany({
    where: { restaurantId: gallops.id, name: { in: ['Dal Makhani', 'Kadai Paneer', 'Butter Naan', 'Margharita Pizza'] } },
    select: { id: true },
  });
  for (const item of addonItems) {
    const group = await prisma.variantGroup.upsert({
      where: { id: `${item.id}-addons` },
      create: {
        id: `${item.id}-addons`,
        itemId: item.id,
        kind: 'ADDON',
        type: 'MULTI',
        name: 'Add-ons',
        required: false,
        isActive: false,
        minSelect: 0,
        maxSelect: 3,
        sortOrder: 1,
      },
      update: {},
    });
    const options: [string, number][] = [
      ['Extra butter', 2000],
      ['Extra cheese', 4000],
      ['Extra gravy', 3000],
    ];
    for (const [index, [name, price]] of options.entries()) {
      const key = name.toLowerCase().replace(/\s+/g, '-');
      await prisma.variantOption.upsert({
        where: { id: `${group.id}-${key}` },
        create: { id: `${group.id}-${key}`, groupId: group.id, name, priceDeltaMinor: price, sortOrder: index },
        update: { priceDeltaMinor: price },
      });
    }
  }

  // ------------------------------------------------------- demo order history
  await seedDemoOrders(gallops.id);

  // ------------------------------------------------------------------- out
  const tables = await prisma.restaurantTable.findMany({ where: { restaurantId: gallops.id }, orderBy: { code: 'asc' } });
  console.log('\n  Plans (billed yearly, excl. GST): Starter ₹19,999 · Growth ₹40,000 · Pro ₹79,999')
  console.log('\n  Gallops Restaurant seeded.');
  console.log('  Sign in at /login with:');
  console.log('    owner@gallopsfoodplaza.in   / gallops123      (Owner)');
  console.log('    manager@gallopsfoodplaza.in / gallops123      (Manager)');
  console.log('    reception@gallopsfoodplaza.in / gallops123    (Receptionist)');
  console.log('    kitchen@gallopsfoodplaza.in / gallops123      (Kitchen)');
  console.log('    admin@gallops.app           / platform123     (Platform admin)');
  console.log('    owner@spiceroute.in         / spiceroute123   (Other tenant owner)');
  console.log('\n  Table QR tokens:');
  for (const table of tables.slice(0, 3)) {
    console.log(`    ${table.code} → /r/gallops/menu?table=${table.qrToken}`);
  }
  console.log(`    … ${tables.length} tables total (see /dashboard/tables for QR codes)\n`);
}

/**
 * Synthetic order history for the demo environment only.
 *
 * Prices come from the seeded menu (never hard-coded), tax from the tenant's own
 * taxBp, and every row is tagged with a DEMO note so it can never be mistaken
 * for a real transaction. Re-running the seed replaces this set.
 */
async function seedDemoOrders(restaurantId: string) {
  await prisma.order.deleteMany({ where: { restaurantId, guestName: 'Demo Guest' } });

  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurantId },
    select: { taxBp: true, serviceChargeBp: true },
  });
  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId },
    orderBy: { code: 'asc' },
    select: { id: true, code: true },
  });
  const dishes = await prisma.menuItem.findMany({
    where: { restaurantId, isPublished: true },
    select: { id: true, name: true, priceMinor: true },
  });
  if (!tables.length || !dishes.length) return;

  const pick = (name: string) => dishes.find((d) => d.name === name) ?? dishes[0];
  const baskets: { table: number; lines: [string, number][] }[] = [
    { table: 0, lines: [['Kadai Paneer', 1], ['Butter Naan', 2], ['Gallops Special Lassi', 1]] },
    { table: 1, lines: [['Punjabi Executive Thali', 2], ['Butter Milk', 2]] },
    { table: 2, lines: [['Paneer Tikka Dry', 1], ['Veg Hyderabadi Biryani', 1], ['Plain Rotla', 3]] },
    { table: 3, lines: [['Masala Khichdi with Curd', 1], ['Dal Makhani', 1], ['Tawa Roti', 4]] },
    { table: 4, lines: [['Margharita Pizza', 1], ['Veg Cilantro Soup', 2]] },
    { table: 5, lines: [['Kathiyawadi Executive Thali', 3], ['Sweet Lassi', 2], ['Samosa', 2]] },
    { table: 6, lines: [['Veg Manchurian Dry', 1], ['Triple Fried Rice', 1], ['Schezwan Fried Rice', 1]] },
    { table: 7, lines: [['Paneer Butter Masala', 1], ['Stuffed Naan', 2], ['Steamed Rice', 1]] },
    { table: 8, lines: [['Chole Kulcha', 2], ['Masala Papad', 2], ['Filter Coffee', 2]] },
    { table: 9, lines: [['Veg Pulao', 1], ['Handi Paneer', 1], ['Roti Plain', 3]] },
  ];

  let counter = 0;
  for (let dayOffset = 5; dayOffset >= 0; dayOffset -= 1) {
    for (const basket of baskets.slice(0, dayOffset === 0 ? 3 : 2)) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - dayOffset);
      createdAt.setHours(12 + (counter % 9), (counter * 17) % 60, 0, 0);

      const lines = basket.lines.map(([name, quantity]) => ({ item: pick(name), quantity }));
      const subtotalMinor = lines.reduce((sum, l) => sum + l.item.priceMinor * l.quantity, 0);
      const taxMinor = Math.round((subtotalMinor * restaurant.taxBp) / 10_000);
      const serviceMinor = Math.round((subtotalMinor * restaurant.serviceChargeBp) / 10_000);
      const totalMinor = subtotalMinor + taxMinor + serviceMinor;
      const isToday = dayOffset === 0;
      const status = isToday && counter % 3 === 0 ? 'PREPARING' : isToday && counter % 3 === 1 ? 'READY' : 'COMPLETED';

      counter += 1;
      await prisma.order.create({
        data: {
          restaurantId,
          tableId: tables[basket.table % tables.length].id,
          code: `D${String(counter).padStart(4, '0')}`,
          trackingToken: randomToken(28),
          idempotencyKey: `seed-demo-${counter}`,
          status,
          paymentMethod: 'CASH_AT_COUNTER',
          paymentStatus: 'PAID',
          currency: 'INR',
          guestName: 'Demo Guest',
          notes: 'DEMO DATA — synthetic seeded order, not a real transaction.',
          subtotalMinor,
          discountMinor: 0,
          taxMinor,
          serviceChargeMinor: serviceMinor,
          totalMinor,
          placedAt: createdAt,
          confirmedAt: createdAt,
          preparingAt: createdAt,
          readyAt: status === 'PREPARING' ? null : createdAt,
          completedAt: status === 'COMPLETED' ? createdAt : null,
          createdAt,
          items: {
            create: lines.map((line, index) => ({
              menuItemId: line.item.id,
              name: line.item.name,
              imageUrl: null,
              servingSize: null,
              unitPriceMinor: line.item.priceMinor,
              quantity: line.quantity,
              totalMinor: line.item.priceMinor * line.quantity,
              sortOrder: index,
            })),
          },
          events: {
            create: [
              { type: 'ORDER_PLACED', toStatus: 'PLACED', actorLabel: 'Guest', createdAt },
              { type: 'STATUS_CHANGE', fromStatus: 'PLACED', toStatus: 'CONFIRMED', actorLabel: 'Gallops Reception', createdAt },
            ],
          },
        },
      });
    }
  }
  console.log(`  demo orders: ${counter} synthetic rows (guestName='Demo Guest')`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

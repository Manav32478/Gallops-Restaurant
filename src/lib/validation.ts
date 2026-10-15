import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Enter your full name.').max(80),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  restaurantName: z.string().min(2, 'Enter your restaurant name.').max(80),
  city: z.string().max(60).optional(),
});

export const cartItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().max(300).optional().nullable(),
  optionIds: z.array(z.string().min(1)).max(40).default([]),
});

export const placeOrderSchema = z.object({
  slug: z.string().min(1),
  table: z.string().min(1).max(64),
  items: z.array(cartItemSchema).min(1, 'Your cart is empty.').max(80),
  guestName: z.string().max(80).optional().nullable(),
  guestPhone: z
    .string()
    .max(20)
    .regex(/^[+]?[\d\s-]{6,20}$/, 'Enter a valid phone number.')
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable(),
  paymentMethod: z.enum(['CASH_AT_COUNTER', 'PAY_AT_TABLE', 'RAZORPAY']).default('CASH_AT_COUNTER'),
  couponCode: z.string().max(40).optional().nullable(),
  idempotencyKey: z.string().min(8).max(120),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REJECTED']),
  reason: z.string().max(300).optional().nullable(),
  expectedStatus: z.string().optional().nullable(), // optimistic concurrency
});

export const menuItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(2).max(90),
  description: z.string().max(600).optional().nullable(),
  servingSize: z.string().max(60).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  priceRupees: z.number().min(0).max(100000),
  isVeg: z.boolean().nullable().optional(),
  isVegan: z.boolean().nullable().optional(),
  isJain: z.boolean().nullable().optional(),
  spiceLevel: z.number().int().min(0).max(3).nullable().optional(),
  allergens: z.array(z.string().max(40)).max(20).optional(),
  isAvailable: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  prepMinutes: z.number().int().min(0).max(240).nullable().optional(),
  trackInventory: z.boolean().optional(),
  stockQty: z.number().int().min(0).max(100000).optional(),
  verificationStatus: z.enum(['UNVERIFIED', 'NEEDS_REVIEW', 'OWNER_VERIFIED', 'OWNER_EDITED']).optional(),
  verificationNote: z.string().max(400).optional().nullable(),
  groups: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        kind: z.enum(['VARIANT', 'ADDON']).default('VARIANT'),
        type: z.enum(['SINGLE', 'MULTI']).default('SINGLE'),
        required: z.boolean().default(false),
        minSelect: z.number().int().min(0).max(20).default(0),
        maxSelect: z.number().int().min(1).max(20).default(1),
        sortOrder: z.number().int().min(0).max(1000).default(0),
        options: z
          .array(
            z.object({
              name: z.string().min(1).max(60),
              priceRupees: z.number().min(0).max(100000).default(0),
              isDefault: z.boolean().default(false),
              isAvailable: z.boolean().default(true),
              sortOrder: z.number().int().min(0).max(1000).default(0),
            }),
          )
          .max(30)
          .default([]),
      }),
    )
    .max(12)
    .optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(300).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
});

export const tableSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only.'),
  label: z.string().max(40).optional().nullable(),
  seats: z.number().int().min(1).max(40).optional(),
  zone: z.string().max(40).optional().nullable(),
  status: z.enum(['ACTIVE', 'DISABLED', 'ARCHIVED']).optional(),
});

export const staffSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  role: z.enum(['MANAGER', 'RECEPTIONIST', 'KITCHEN']),
});

export const settingsSchema = z.object({
  name: z.string().min(2).max(90).optional(),
  tagline: z.string().max(160).optional().nullable(),
  about: z.string().max(1200).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  coverUrl: z.string().max(500).optional().nullable(),
  heroImageUrl: z.string().max(500).optional().nullable(),
  addressLine: z.string().max(200).optional().nullable(),
  city: z.string().max(60).optional().nullable(),
  state: z.string().max(60).optional().nullable(),
  postalCode: z.string().max(12).optional().nullable(),
  phone: z.string().max(24).optional().nullable(),
  email: z.string().max(120).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  instagram: z.string().max(80).optional().nullable(),
  taxPercent: z.number().min(0).max(40).optional(),
  serviceChargePercent: z.number().min(0).max(40).optional(),
  acceptingOrders: z.boolean().optional(),
  autoAcceptOrders: z.boolean().optional(),
  defaultPrepMinutes: z.number().int().min(1).max(180).optional(),
  cancellationMinutes: z.number().int().min(0).max(120).optional(),
  minOrderRupees: z.number().min(0).max(10000).optional(),
  paymentMethods: z.array(z.enum(['CASH_AT_COUNTER', 'PAY_AT_TABLE', 'RAZORPAY'])).max(3).optional(),
  languages: z.array(z.string().max(5)).max(5).optional(),
  notificationSettings: z
    .object({
      push: z.boolean().optional(),
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      whatsapp: z.boolean().optional(),
      soundAlerts: z.boolean().optional(),
    })
    .optional(),
});

export const pushSubscriptionSchema = z.object({
  slug: z.string().min(1),
  orderToken: z.string().min(6).max(120).optional().nullable(),
  subscription: z.object({
    endpoint: z.string().url().max(500),
    keys: z.object({ p256dh: z.string().min(1).max(300), auth: z.string().min(1).max(300) }),
  }),
});

export const couponSchema = z.object({
  code: z.string().min(2).max(24).regex(/^[A-Z0-9-]+$/i, 'Use letters, numbers and dashes.'),
  description: z.string().max(200).optional().nullable(),
  type: z.enum(['PERCENT', 'FLAT']),
  percent: z.number().min(0).max(100).optional(),
  amountRupees: z.number().min(0).max(100000).optional(),
  minSubtotalRupees: z.number().min(0).max(100000).optional(),
  maxUses: z.number().int().min(0).max(1000000).nullable().optional(),
  isActive: z.boolean().optional(),
});

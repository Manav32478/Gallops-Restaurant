import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ok, fail, handler, clientIp, assertSameOrigin } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  name: z.string().min(2, 'Please enter your name.').max(80),
  email: z.string().email('Please enter a valid email.'),
  phone: z.string().max(24).optional().or(z.literal('')),
  restaurantName: z.string().max(80).optional().or(z.literal('')),
  city: z.string().max(60).optional().or(z.literal('')),
  message: z.string().max(1000).optional().or(z.literal('')),
});

export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const ip = clientIp(req) ?? 'unknown';
  const limit = rateLimit(`lead:${ip}`, 8, 10 * 60_000);
  if (!limit.allowed) return fail(429, 'RATE_LIMITED', 'Too many requests. Please try again later.');

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Please check the form.', parsed.error.flatten());

  await prisma.lead.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      restaurantName: parsed.data.restaurantName || null,
      city: parsed.data.city || null,
      message: parsed.data.message || null,
    },
  });
  return ok({ received: true });
});

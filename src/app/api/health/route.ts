import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getIO } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET() {
  let database: 'up' | 'down' = 'down';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'up';
  } catch {
    database = 'down';
  }
  return NextResponse.json({
    ok: database === 'up',
    database,
    realtime: getIO() ? 'up' : 'down',
    billingMode: process.env.PLATFORM_BILLING_MODE ?? 'development',
    razorpay: process.env.RAZORPAY_ENABLED === 'true' ? 'configured' : 'development-mode',
    webPush: process.env.WEB_PUSH_ENABLED === 'true' ? 'configured' : 'development-mode',
    time: new Date().toISOString(),
  });
}

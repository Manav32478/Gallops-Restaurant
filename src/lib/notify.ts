import { prisma } from '@/lib/prisma';

export type NotifyEvent = 'ORDER_PLACED' | 'ORDER_CONFIRMED' | 'ORDER_PREPARING' | 'ORDER_READY' | 'ORDER_COMPLETED' | 'ORDER_CANCELLED';

type NotifyInput = {
  restaurantId: string;
  orderId: string;
  event: NotifyEvent;
  title: string;
  body: string;
  channels: ('PUSH' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP')[];
  recipients?: { endpoint?: string; p256dh?: string; auth?: string; email?: string; phone?: string }[];
};

/**
 * Notification dispatcher.
 *
 * Honest behaviour: a channel is only reported as SENT when the provider is
 * configured AND the call succeeds. Unconfigured channels are logged as SKIPPED
 * with the reason, so the UI never claims a notification was delivered.
 */
export async function dispatchNotification(input: NotifyInput) {
  const dedupeKey = `${input.event}:${input.orderId}`;
  const results: { channel: string; status: string; error?: string }[] = [];

  for (const channel of input.channels) {
    const existing = await prisma.notificationLog.findUnique({ where: { dedupeKey: `${dedupeKey}:${channel}` } });
    if (existing && existing.status === 'SENT') {
      results.push({ channel, status: 'SENT (duplicate suppressed)' });
      continue; // duplicate prevention
    }

    const log = await prisma.notificationLog.create({
      data: {
        restaurantId: input.restaurantId,
        orderId: input.orderId,
        channel: channel as never,
        event: input.event,
        title: input.title,
        body: input.body,
        dedupeKey: `${dedupeKey}:${channel}`,
        status: 'QUEUED',
        recipient: input.recipients?.[0]
          ? (input.recipients[0].email ?? input.recipients[0].phone ?? 'guest')
          : channel === 'IN_APP' || channel === 'PUSH'
            ? 'guest-device'
            : null,
      },
    });

    try {
      const outcome = await send(channel, input, log.id);
      await prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: outcome.status, error: outcome.error ?? null, sentAt: outcome.status === 'SENT' ? new Date() : null },
      });
      results.push({ channel, status: outcome.status, error: outcome.error });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await prisma.notificationLog.update({ where: { id: log.id }, data: { status: 'FAILED', error: message } });
      results.push({ channel, status: 'FAILED', error: message });
    }
  }

  return results;
}

async function send(
  channel: string,
  input: NotifyInput,
  _logId: string,
): Promise<{ status: 'SENT' | 'SKIPPED' | 'FAILED'; error?: string }> {
  if (channel === 'IN_APP') return { status: 'SENT' }; // delivered through the socket + tracking page

  if (channel === 'PUSH') {
    if (process.env.WEB_PUSH_ENABLED !== 'true') {
      return { status: 'SKIPPED', error: 'Web Push not configured (set WEB_PUSH_ENABLED=true and VAPID keys).' };
    }
    try {
      const webpush = await import('web-push');
      webpush.default.setVapidDetails(
        process.env.VAPID_SUBJECT ?? 'mailto:info@gallopsfoodplaza.in',
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!,
      );
      const subs = await prisma.pushSubscription.findMany({
        where: { OR: [{ orderId: input.orderId }, { restaurantId: input.restaurantId, orderId: null }] },
      });
      let sent = 0;
      for (const sub of subs) {
        try {
          await webpush.default.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: input.title, body: input.body, tag: input.orderId }),
          );
          sent += 1;
        } catch {
          /* expired subscription — leave logged, do not fail the batch */
        }
      }
      return sent > 0 ? { status: 'SENT' } : { status: 'SKIPPED', error: 'No active push subscriptions for this order.' };
    } catch (error) {
      return { status: 'FAILED', error: error instanceof Error ? error.message : 'Push failed' };
    }
  }

  if (channel === 'EMAIL') {
    if (process.env.SMTP_ENABLED !== 'true') {
      return { status: 'SKIPPED', error: 'Email provider not configured.' };
    }
    return { status: 'SKIPPED', error: 'Email provider configured but no verified SMTP transport is installed yet.' };
  }

  if (channel === 'SMS' || channel === 'WHATSAPP') {
    const enabled = channel === 'SMS' ? process.env.SMS_ENABLED === 'true' : process.env.WHATSAPP_ENABLED === 'true';
    if (!enabled) return { status: 'SKIPPED', error: `${channel} provider not configured.` };
    const url = channel === 'SMS' ? process.env.SMS_PROVIDER_URL : process.env.WHATSAPP_PROVIDER_URL;
    if (!url) return { status: 'SKIPPED', error: `${channel} provider URL missing.` };
    return { status: 'SKIPPED', error: `${channel} provider configured but no credentials validated yet.` };
  }

  return { status: 'SKIPPED', error: 'Unknown channel.' };
}

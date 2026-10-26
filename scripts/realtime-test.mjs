/**
 * Real-time acceptance test.
 *
 * Opens three Socket.IO connections against a running server and proves that:
 *   1. a reception socket receives `order:created` the moment a guest orders,
 *   2. the guest's tracking socket receives `order:updated` when the kitchen
 *      marks the order ready,
 *   3. a socket for a DIFFERENT restaurant receives nothing (room isolation),
 *   4. a guest socket cannot join without the unpredictable tracking token.
 *
 * Usage: node scripts/realtime-test.mjs [base-url]
 */
import { io } from 'socket.io-client';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const PASS = [];
const FAIL = [];

function check(name, condition, detail = '') {
  (condition ? PASS : FAIL).push(name);
  console.log(`  ${condition ? 'PASS' : 'FAIL'}  ${name}${condition ? '' : '  ' + detail}`);
}

async function json(method, path, body, cookie) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
  const response = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { _text: text.slice(0, 200) };
  }
    if (response.status === 429 && attempt < 7) {
      const waitSeconds = Number(/in (\d+)s/.exec(parsed?.error?.message ?? '')?.[1] ?? 20) + 2;
      console.log(`      rate limited on ${path}, retrying in ${waitSeconds}s`);
      await wait(waitSeconds * 1000);
      continue;
    }
    const setCookie = response.headers.get('set-cookie');
    return { status: response.status, body: parsed, cookie: setCookie?.split(';')[0] };
  }
  return { status: 429, body: { error: 'rate limited' }, cookie: undefined };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(options) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      path: '/api/socket',
      transports: ['websocket'],
      extraHeaders: options.cookie ? { cookie: options.cookie } : {},
      auth: options.auth ?? {},
      reconnection: false,
    });
    const timer = setTimeout(() => reject(new Error('connection timeout')), 8000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function main() {
  console.log(`\nGallops realtime test → ${BASE}\n`);

  const owner = await json('POST', '/api/auth/login', {
    email: 'owner@gallopsfoodplaza.in',
    password: 'gallops123',
  });
  const other = await json('POST', '/api/auth/login', {
    email: 'owner@spiceroute.in',
    password: 'spiceroute123',
  });

  if (!owner.cookie || !other.cookie) {
    console.error('login did not return a session cookie', owner.status, other.status, owner.body);
    process.exit(1);
  }
  const reception = await connect({ cookie: owner.cookie, auth: { restaurantSlug: 'gallops' } });
  check('1. staff socket authenticates with the session cookie', reception.connected);

  let bad = null;
  try {
    bad = await connect({});
  } catch (error) {
    bad = { error };
  }
  check('2. socket without credentials is refused', Boolean(bad?.error), 'connection should fail');

  // --- room isolation: the other tenant listens on its own restaurant room ---
  const foreign = await connect({ cookie: other.cookie, auth: { restaurantSlug: 'spice-route-demo' } });
  const foreignEvents = [];
  foreign.onAny((event) => {
    if (event !== 'ready') foreignEvents.push(event);
  });

  const received = [];
  reception.on('order:created', (payload) => received.push({ event: 'order:created', payload: payload?.order ?? payload }));
  reception.on('order:updated', (payload) => received.push({ event: 'order:updated', payload: payload?.order ?? payload }));

  // Wait for the server-side room subscription to settle.
  await wait(500);

  const menuResponse = await json('GET', '/api/menu/gallops?table=' + (await tableToken(owner.cookie)));
  check('3. menu loads for the guest', menuResponse.status === 200);
  const categories = menuResponse.body.data.categories;
  const item =
    categories.flatMap((c) => c.items ?? []).find(Boolean) ??
    categories.flatMap((c) => (c.sections ?? []).flatMap((s) => s.items ?? [])).find(Boolean);
  check('3b. menu exposes orderable dishes', Boolean(item));

  const placed = await json('POST', '/api/orders', {
    slug: 'gallops',
    table: await tableToken(owner.cookie),
    idempotencyKey: `rt-${Date.now()}`,
    paymentMethod: 'CASH_AT_COUNTER',
    guestName: 'Realtime Test',
    items: [{ itemId: item.id, quantity: 1, optionIds: [] }],
  });
  const order = placed.body?.data?.order;
  check('4. guest order accepted', placed.status === 201 && Boolean(order?.trackingToken));

  await wait(1200);
  check(
    '5. reception receives order:created in real time',
    received.some(
      (e) =>
        e.event === 'order:created' &&
        (e.payload?.trackingToken ?? e.payload?.order?.trackingToken) === order.trackingToken,
    ),
    JSON.stringify(received.map((e) => [e.event, e.payload?.trackingToken])).slice(0, 200),
  );

  // --- guest tracking socket, authenticated by the tracking token only ---
  const guest = await connect({ auth: { orderToken: order.trackingToken } });
  const guestEvents = [];
  guest.on('order:updated', (payload) => guestEvents.push(payload?.order ?? payload));
  await wait(400);

  for (const [next, expected] of [
    ['CONFIRMED', 'PLACED'],
    ['PREPARING', 'CONFIRMED'],
    ['READY', 'PREPARING'],
  ]) {
    const response = await json(
      'PATCH',
      `/api/dashboard/gallops/orders/${order.id}`,
      { status: next, expectedStatus: expected },
      owner.cookie,
    );

    await wait(300);
  }

  await wait(1200);
  console.log('      reception events:', received.map((e) => `${e.event}:${e.payload?.status ?? '?'}`).join(', '));
  console.log('      guest events:', guestEvents.map((e) => e?.status ?? '?').join(', '));
  check(
    '6. guest tracking socket receives the READY update',
    guestEvents.some((event) => (event?.status ?? event?.order?.status) === 'READY'),
    JSON.stringify(guestEvents).slice(0, 200),
  );
  check(
    '7. reception also sees the status change',
    received.some((e) => e.event === 'order:updated' && (e.payload?.status ?? e.payload?.order?.status) === 'READY'),
  );

  await wait(500);
  check(
    '8. other tenant received no cross-tenant events',
    foreignEvents.length === 0,
    JSON.stringify(foreignEvents),
  );

  reception.close();
  foreign.close();
  guest.close();

  console.log('\n' + '='.repeat(60));
  console.log(`PASSED ${PASS.length}   FAILED ${FAIL.length}`);
  FAIL.forEach((f) => console.log(`  ✗ ${f}`));
  console.log('='.repeat(60));
  process.exit(FAIL.length ? 1 : 0);
}

let cachedToken;
/** Reads a real table token from the dashboard API (no psql dependency). */
async function tableToken(cookie) {
  if (!cachedToken) {
    const { status, body } = await json('GET', '/api/dashboard/gallops/tables', undefined, cookie);
    const tables = body?.data?.tables ?? [];
    if (status !== 200 || !tables.length) throw new Error('could not read table tokens from the API');
    cachedToken = (tables.find((table) => table.code === 'T01') ?? tables[0]).qrToken;
  }
  return cachedToken;
}

main().catch((error) => {
  console.error('realtime test crashed:', error.message);
  process.exit(1);
});

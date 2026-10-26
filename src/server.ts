/**
 * Custom Node server: Next.js (App Router) + Socket.IO on one HTTP server.
 *
 * A custom server is required because Socket.IO needs a persistent connection —
 * serverless hosts without WebSocket support cannot run it. See README.
 */
// Must run before any Next.js import: sets up AsyncLocalStorage and other globals
// that the App Router relies on when Next is started from a custom server.
import 'next/dist/server/node-environment';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketServer } from 'socket.io';
import { loadEnvConfig } from '@next/env';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = Number(process.env.PORT || 3000);

loadEnvConfig(process.cwd(), dev);

async function main() {
  const { prisma } = await import('./lib/prisma');
  const { setIO, restaurantRoom, orderRoom } = await import('./lib/realtime');
  const { getSessionUserFromToken, parseCookieHeader, SESSION_COOKIE } = await import('./lib/auth/session');

  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? '/', true);
    handle(req, res, parsedUrl).catch((error) => {
      console.error('[next] request failed', error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
  });

  // CORS is only needed in a split deployment: the web app on one origin (e.g.
  // Vercel) connecting to this realtime service on another. Same-origin
  // deployments never send an Origin header, so nothing is enabled by default.
  const corsOrigins = (process.env.SOCKET_CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const io = new SocketServer(httpServer, {
    path: '/api/socket',
    serveClient: false,
    ...(corsOrigins.length > 0
      ? { cors: { origin: corsOrigins, credentials: true } }
      : {}),
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // --- connection authorisation ---------------------------------------------
  // Staff: must present a valid session cookie and be a member of the restaurant.
  // Guest: must present the unpredictable order tracking token.
  io.use(async (socket, nextFn) => {
    try {
      const auth = (socket.handshake.auth ?? {}) as Record<string, string>;
      if (auth.orderToken) {
        const order = await prisma.order.findUnique({
          where: { trackingToken: auth.orderToken },
          select: { id: true, restaurantId: true, trackingToken: true },
        });
        if (!order) return nextFn(new Error('invalid-order-token'));
        socket.data.guest = { orderId: order.id, restaurantId: order.restaurantId, token: order.trackingToken };
        return nextFn();
      }

      const cookieHeader = socket.handshake.headers.cookie;
      const jwt = parseCookieHeader(cookieHeader, SESSION_COOKIE);
      const user = await getSessionUserFromToken(jwt);
      if (!user) return nextFn(new Error('unauthenticated'));

      if (auth.restaurantSlug) {
        const membership = user.memberships.find((m) => m.restaurant.slug === auth.restaurantSlug);
        if (!membership) return nextFn(new Error('forbidden'));
        socket.data.staff = {
          userId: user.id,
          restaurantId: membership.restaurantId,
          role: membership.role,
          slug: membership.restaurant.slug,
        };
        return nextFn();
      }
      if (auth.platform === '1') {
        if (!user.isPlatformAdmin) return nextFn(new Error('forbidden'));
        socket.data.platform = { userId: user.id };
        return nextFn();
      }
      return nextFn(new Error('no-scope'));
    } catch (error) {
      console.error('[socket] auth error', error);
      return nextFn(new Error('auth-error'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.data.staff) {
      socket.join(restaurantRoom(socket.data.staff.restaurantId));
      socket.emit('ready', { scope: 'staff', role: socket.data.staff.role });
    } else if (socket.data.guest) {
      socket.join(orderRoom(socket.data.guest.token));
      socket.emit('ready', { scope: 'guest' });
    } else if (socket.data.platform) {
      socket.emit('ready', { scope: 'platform' });
    }

    socket.on('subscribe:order', async (token: string) => {
      if (typeof token !== 'string' || token.length > 120) return;
      const order = await prisma.order.findUnique({
        where: { trackingToken: token },
        select: { id: true, trackingToken: true },
      });
      if (order) {
        socket.join(orderRoom(order.trackingToken));
        socket.emit('subscribed', { ok: true });
      } else {
        socket.emit('subscribed', { ok: false });
      }
    });

    socket.on('disconnect', () => {
      /* rooms are cleaned up automatically */
    });
  });

  setIO(io);

  httpServer.listen(port, hostname, () => {
    console.log(`\n  ▸ Gallops platform ready on http://${hostname}:${port}`);
    console.log(`    Customer menu : /r/gallops/menu?table=<qr-token>`);
    console.log(`    Reception     : /dashboard/orders`);
    console.log(`    Socket.IO     : /api/socket\n`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[server] ${signal} received, shutting down…`);
    io.close();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 4000).unref();
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();

/**
 * Shared Socket.IO *client* configuration.
 *
 * The platform dashboard and the guest order tracker both open a socket. Whether
 * one is available depends on where the app is deployed:
 *
 *   custom Node server (Render / Railway / Fly / VPS)  → sockets work, same origin
 *   serverless (Vercel)                                → no socket server exists
 *   split: web on Vercel + realtime host elsewhere     → sockets on another origin
 *
 * Two environment variables cover all three, and neither is required for a
 * same-origin deployment:
 *
 *   NEXT_PUBLIC_SOCKET_ENABLED=false   never open a socket (serverless deploys).
 *                                      The UI falls back to its existing polling:
 *                                      reception/kitchen every 15 s, guest order
 *                                      tracker every 20 s.
 *   NEXT_PUBLIC_SOCKET_URL=https://…   connect to a socket server on another
 *                                      origin. Leave unset for same-origin.
 */
import type { ManagerOptions, SocketOptions } from 'socket.io-client';

export const SOCKET_ENABLED = process.env.NEXT_PUBLIC_SOCKET_ENABLED !== 'false';

/** Absolute origin of an external Socket.IO server, or '' for same-origin. */
export const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL ?? '').trim();

export function socketOptions(
  auth: Record<string, unknown>,
): Partial<ManagerOptions & SocketOptions> {
  return {
    path: '/api/socket',
    withCredentials: SOCKET_URL === '',
    transports: ['websocket', 'polling'],
    reconnectionDelay: 800,
    reconnectionDelayMax: 6000,
    auth,
  };
}

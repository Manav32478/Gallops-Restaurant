import type { Server as SocketServer } from 'socket.io';

/**
 * Socket.IO server handle, registered once by the custom Node server
 * (src/server.ts) so that API routes can broadcast order events.
 */
const globalForIo = globalThis as unknown as { __gallops_io?: SocketServer };

export function setIO(io: SocketServer) {
  globalForIo.__gallops_io = io;
}

export function getIO(): SocketServer | undefined {
  return globalForIo.__gallops_io;
}

export const restaurantRoom = (restaurantId: string) => `restaurant:${restaurantId}`;
export const orderRoom = (trackingToken: string) => `order:${trackingToken}`;

export type OrderPayload = Record<string, unknown>;

export function emitOrderCreated(restaurantId: string, order: OrderPayload) {
  getIO()?.to(restaurantRoom(restaurantId)).emit('order:created', order);
}

export function emitOrderUpdated(restaurantId: string, trackingToken: string, order: OrderPayload) {
  getIO()?.to(restaurantRoom(restaurantId)).emit('order:updated', order);
  getIO()?.to(orderRoom(trackingToken)).emit('order:updated', order);
}

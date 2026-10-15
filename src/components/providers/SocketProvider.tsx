'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'unauthorized';

const SocketContext = createContext<{
  socket: Socket | null;
  state: ConnectionState;
  ready: boolean;
}>({ socket: null, state: 'connecting', ready: false });

export function useSocket() {
  return useContext(SocketContext);
}

/**
 * One shared Socket.IO connection per scope.
 * auth = { restaurantSlug } for staff dashboards, { orderToken } for guests,
 * or { platform: true } for the platform console.
 */
export function SocketProvider({
  auth,
  children,
}: {
  auth: { restaurantSlug?: string; orderToken?: string; platform?: boolean };
  children: React.ReactNode;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<ConnectionState>('connecting');
  const authKey = JSON.stringify(auth);

  useEffect(() => {
    let alive = true;
    const instance = io({
      path: '/api/socket',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionDelay: 800,
      reconnectionDelayMax: 6000,
      auth: JSON.parse(authKey) as Record<string, unknown>,
    });

    const update = (next: ConnectionState) => {
      if (alive) setState(next);
    };

    instance.on('connect', () => update('connected'));
    instance.on('disconnect', () => update('disconnected'));
    instance.on('connect_error', (error: Error) => {
      const message = error?.message ?? '';
      update(
        message === 'unauthorized' || message === 'forbidden' || message === 'no-scope'
          ? 'unauthorized'
          : 'error',
      );
    });

    setSocket(instance);

    return () => {
      alive = false;
      instance.close();
    };
  }, [authKey]);

  const value = useMemo(() => ({ socket, state, ready: state === 'connected' }), [socket, state]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

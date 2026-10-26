'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_ENABLED, SOCKET_URL, socketOptions } from '@/lib/socket-client';

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
    // Serverless deploys (Vercel) have no socket server — stay disconnected so the
    // dashboards use their built-in polling instead of retrying a dead endpoint.
    if (!SOCKET_ENABLED) {
      setSocket(null);
      setState('disconnected');
      return;
    }

    let alive = true;
    const options = socketOptions(JSON.parse(authKey) as Record<string, unknown>);
    const instance = SOCKET_URL ? io(SOCKET_URL, options) : io(options);

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

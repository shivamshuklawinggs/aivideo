'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') as string) ||
  'http://localhost:5000';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  subscribe: (params: { chapterId?: string; jobId?: string }) => void;
  unsubscribe: (params: { chapterId?: string; jobId?: string }) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  subscribe: () => {},
  unsubscribe: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('[Socket.IO] connected', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log('[Socket.IO] disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[Socket.IO] connect error', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const subscribe = useCallback(({ chapterId, jobId }: { chapterId?: string; jobId?: string }) => {
    if (!socketRef.current) return;
    socketRef.current.emit('subscribe', { chapterId, jobId });
  }, []);

  const unsubscribe = useCallback(({ chapterId, jobId }: { chapterId?: string; jobId?: string }) => {
    if (!socketRef.current) return;
    socketRef.current.emit('unsubscribe', { chapterId, jobId });
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        connected,
        subscribe,
        unsubscribe,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

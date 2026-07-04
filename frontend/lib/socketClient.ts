import { io, Socket } from 'socket.io-client';
import { config } from './config';
import { useAuthStore } from './stores/authStore';
import * as Sentry from '@sentry/nextjs';

type SocketEventCallback<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => void;

class SocketClient {
  private socket: Socket | null = null;
  private deviceRooms: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    // Initialize in browser only
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  connect() {
    const { session, clearSession } = useAuthStore.getState();

    if (!session) {
      console.warn('Cannot connect socket: no session');
      return;
    }

    // Check token expiry before connecting — if expired, clear session
    // so the user is prompted to re-authenticate rather than getting
    // persistent "Invalid token" errors from the server.
    if (session.expires_at && Date.now() >= session.expires_at * 1000) {
      console.warn('Socket connect skipped: session expired');
      clearSession();
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    try {
      this.socket = io(config.backend.socketUrl, {
        auth: {
          token: session.access_token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('Socket connection failed:', error);
      Sentry.captureException(error);
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;

      // Rejoin device rooms on reconnect
      this.deviceRooms.forEach((deviceId) => {
        this.joinDeviceRoom(deviceId);
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, may need to re-authenticate
        const { clearSession } = useAuthStore.getState();
        clearSession();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        Sentry.captureException(error, {
          tags: { socket_error: 'max_reconnect_attempts' },
        });
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      Sentry.captureException(error);
    });
  }

  joinDeviceRoom(deviceId: string) {
    if (!this.socket?.connected) {
      console.warn('Cannot join room: socket not connected');
      return;
    }

    this.socket.emit('join:device', deviceId);
    this.deviceRooms.add(deviceId);
  }

  leaveDeviceRoom(deviceId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('leave:device', deviceId);
    this.deviceRooms.delete(deviceId);
  }

  on<TArgs extends unknown[]>(event: string, callback: SocketEventCallback<TArgs>) {
    if (!this.socket) {
      console.warn('Socket not initialized');
      return;
    }

    this.socket.on(event, callback as (...args: unknown[]) => void);
  }

  off<TArgs extends unknown[]>(event: string, callback?: SocketEventCallback<TArgs>) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback as (...args: unknown[]) => void);
    } else {
      this.socket.off(event);
    }
  }

  emit(event: string, ...args: unknown[]) {
    if (!this.socket?.connected) {
      console.warn('Cannot emit: socket not connected');
      return;
    }

    this.socket.emit(event, ...args);
  }

  disconnect() {
    if (this.socket) {
      this.deviceRooms.clear();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Singleton instance
let socketClient: SocketClient | null = null;

export function getSocketClient(): SocketClient {
  if (typeof window === 'undefined') {
    throw new Error('Socket client can only be used in browser');
  }

  if (!socketClient) {
    socketClient = new SocketClient();
  }

  return socketClient;
}

export function disconnectSocket() {
  if (socketClient) {
    socketClient.disconnect();
    socketClient = null;
  }
}

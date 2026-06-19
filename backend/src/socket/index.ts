import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as Sentry from '@sentry/node';
import { supabaseAdmin, supabaseAnon } from '../lib/supabase';

let io: SocketIOServer | null = null;

// Initialise Socket.io. Call once from src/index.ts after the HTTP server
// is created. Returns the server instance.
export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT auth middleware — validates the Bearer token via Supabase.
  io.use(async (socket: Socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization ?? '').replace('Bearer ', '');

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data.user) {
      next(new Error('Invalid token'));
      return;
    }

    (socket as any).userId = data.user.id;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId: string = (socket as any).userId;

    // Clients send { deviceId } to join a device room so they receive
    // device-scoped events.
    socket.on('join:device', async (deviceId: string) => {
      if (typeof deviceId !== 'string' || deviceId.length === 0) return;

      const { data, error } = await supabaseAdmin
        .from('devices')
        .select('id')
        .eq('id', deviceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        Sentry.captureException(error, {
          tags: { subsystem: 'socket-room-auth' },
          user: { id: userId },
          extra: { deviceId },
        });
        return;
      }

      if (data) socket.join(deviceId);
    });

    socket.on('leave:device', (deviceId: string) => {
      socket.leave(deviceId);
    });

    socket.on('error', (err: Error) => {
      Sentry.captureException(err, {
        tags: { subsystem: 'socket' },
        user: { id: userId },
      });
    });
  });

  return io;
}

// Returns the Socket.io singleton. Throws if initSocket has not been called.
export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.io not initialised — call initSocket first');
  return io;
}

// Broadcast an event to all sockets in the device room.
export function emitToDevice(
  deviceId: string,
  event: string,
  data: unknown
): void {
  if (!io) return;
  io.to(deviceId).emit(event, data);
}

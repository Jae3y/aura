"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIO = getIO;
exports.emitToDevice = emitToDevice;
const socket_io_1 = require("socket.io");
const Sentry = __importStar(require("@sentry/node"));
const supabase_1 = require("../lib/supabase");
let io = null;
// Initialise Socket.io. Call once from src/index.ts after the HTTP server
// is created. Returns the server instance.
function initSocket(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL ?? '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });
    // JWT auth middleware — validates the Bearer token via Supabase.
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token ??
            (socket.handshake.headers.authorization ?? '').replace('Bearer ', '');
        if (!token) {
            next(new Error('Authentication required'));
            return;
        }
        const { data, error } = await supabase_1.supabaseAnon.auth.getUser(token);
        if (error || !data.user) {
            next(new Error('Invalid token'));
            return;
        }
        socket.userId = data.user.id;
        next();
    });
    io.on('connection', (socket) => {
        const userId = socket.userId;
        // Clients send { deviceId } to join a device room so they receive
        // device-scoped events.
        socket.on('join:device', async (deviceId) => {
            if (typeof deviceId !== 'string' || deviceId.length === 0)
                return;
            const { data, error } = await supabase_1.supabaseAdmin
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
            if (data)
                socket.join(deviceId);
        });
        socket.on('leave:device', (deviceId) => {
            socket.leave(deviceId);
        });
        socket.on('error', (err) => {
            Sentry.captureException(err, {
                tags: { subsystem: 'socket' },
                user: { id: userId },
            });
        });
    });
    return io;
}
// Returns the Socket.io singleton. Throws if initSocket has not been called.
function getIO() {
    if (!io)
        throw new Error('Socket.io not initialised — call initSocket first');
    return io;
}
// Broadcast an event to all sockets in the device room.
function emitToDevice(deviceId, event, data) {
    if (!io)
        return;
    io.to(deviceId).emit(event, data);
}
//# sourceMappingURL=index.js.map
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { authService } from './auth.service';

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const list: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookieStr) => {
    const parts = cookieStr.split('=');
    const name = parts[0]?.trim();
    if (!name) return;
    const val = parts.slice(1).join('=').trim();
    if (!val) return;
    try {
      list[name] = decodeURIComponent(val);
    } catch {
      list[name] = val;
    }
  });
  return list;
}

export class SocketService {
  private io: SocketIOServer | null = null;

  init(httpServer: http.Server): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || origin === env.CLIENT_ORIGIN || origin.startsWith('http://localhost:')) {
            callback(null, true);
          } else {
            callback(new Error('Blocked by Socket.IO CORS'));
          }
        },
        credentials: true,
      },
    });

    // Authentication middleware for socket handshakes
    this.io.use((socket: Socket, next) => {
      try {
        let token: string | undefined;

        // 1. Check handshake cookie
        const rawCookie = socket.handshake.headers.cookie;
        if (rawCookie) {
          const parsed = parseCookies(rawCookie);
          token = parsed.cp_access_token;
        }

        // 2. Check auth object in handshake
        if (!token && socket.handshake.auth && socket.handshake.auth.token) {
          token = socket.handshake.auth.token;
        }

        if (token) {
          try {
            const decoded = authService.verifyAccessToken(token);
            socket.data.user = decoded;
          } catch {
            // Invalid token - allow guest connection without user data
          }
        }

        next();
      } catch {
        next();
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user;

      if (user) {
        // Join private user room
        socket.join(`user:${user.userId}`);

        // Join role-based broadcast rooms
        if (user.role === 'officer' || user.role === 'admin') {
          socket.join('officers');
        } else if (user.role === 'field_worker') {
          socket.join('workers');
        }
      }

      socket.on('disconnect', () => {
        // Cleaned up automatically by socket.io
      });
    });

    return this.io;
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Dispatches real-time notification to a specific user
   */
  notifyUser(userId: string, notification: any): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('notification:new', notification);
  }

  /**
   * Broadcasts incident updates to municipal officers and the reporting citizen
   */
  broadcastIncidentUpdate(incident: any, reporterId?: string): void {
    if (!this.io) return;
    this.io.to('officers').emit('incident:updated', incident);
    if (reporterId) {
      this.io.to(`user:${reporterId}`).emit('incident:updated', incident);
    }
  }

  /**
   * Broadcasts work order assignments to assigned workers and officers
   */
  broadcastWorkOrderAssignment(workerIds: string[], workOrder: any): void {
    if (!this.io) return;
    this.io.to('officers').emit('workorder:assigned', workOrder);
    workerIds.forEach((wid) => {
      this.io?.to(`user:${wid}`).emit('workorder:assigned', workOrder);
    });
  }

  /**
   * Broadcasts work order status updates
   */
  broadcastWorkOrderUpdate(workOrder: any, workerIds?: string[]): void {
    if (!this.io) return;
    this.io.to('officers').emit('workorder:updated', workOrder);
    if (workerIds) {
      workerIds.forEach((wid) => {
        this.io?.to(`user:${wid}`).emit('workorder:updated', workOrder);
      });
    }
  }
}

export const socketService = new SocketService();

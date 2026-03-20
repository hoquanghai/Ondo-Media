import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3001'],
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly config: ConfigService) {}

  async afterInit(server: Server) {
    // Setup Redis adapter for horizontal scaling
    const redisHost = this.config.get<string>('REDIS_HOST', 'localhost');
    const redisPort = parseInt(this.config.get<string>('REDIS_PORT', '6379'), 10);
    const redisPassword = this.config.get<string>('REDIS_PASSWORD') || undefined;

    try {
      const pubClient = createClient({
        url: `redis://${redisHost}:${redisPort}`,
        password: redisPassword,
      });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);
      server.adapter(createAdapter(pubClient, subClient));

      this.logger.log('WebSocket gateway initialized with Redis adapter');
    } catch (err) {
      this.logger.warn(
        'Failed to connect Redis adapter for WebSocket, running without it',
        err,
      );
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token, disconnecting`);
        client.disconnect();
        return;
      }

      // Verify JWT signature (not just decode)
      const secret = this.config.get<string>('JWT_SECRET', '');
      const payload = jwt.verify(token, secret) as any;
      const userId = String(payload.sub);

      if (!userId || userId === 'undefined') {
        this.logger.warn(`Client ${client.id} token missing sub claim, disconnecting`);
        client.disconnect();
        return;
      }

      // Track user -> socket mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user-specific room
      client.join(`user:${userId}`);
      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} JWT verification failed, disconnecting`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Find and clean up user mapping
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Send a notification to a specific user (all their connected sockets).
   */
  sendToUser(userId: string | number, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast to all connected clients.
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}

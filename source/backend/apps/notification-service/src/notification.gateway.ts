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

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
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

  handleConnection(client: Socket) {
    // Extract userId from JWT token (base64 decode, no verification needed - API gateway already verifies)
    let userId: string | undefined;

    const token = client.handshake.auth?.token as string | undefined;
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          userId = String(payload.sub ?? payload.userId ?? payload.shainBangou);
        }
      } catch {
        this.logger.warn(`Failed to decode JWT token for client ${client.id}`);
      }
    }

    // Fallback to query param
    if (!userId || userId === 'undefined') {
      userId = client.handshake.query.userId as string;
    }

    if (!userId) {
      this.logger.warn(`Client ${client.id} connected without userId, disconnecting`);
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

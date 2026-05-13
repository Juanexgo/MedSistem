import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventsService } from './events.service';
import { PrismaService } from '../../common/prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    permissions: string[];
  };
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedUsers = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventsService: EventsService,
    private prisma: PrismaService,
  ) {}

  afterInit() {
    this.eventsService.setServer(this.server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit('socket.error', { message: 'No token provided' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'default-secret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          roleRel: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      });

      if (!user || !user.isActive || user.deletedAt) {
        client.emit('socket.error', { message: 'User not found or inactive' });
        client.disconnect();
        return;
      }

      const userData = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        permissions: user.roleRel?.permissions.map((rp: any) => rp.permission.action) || [],
      };

      client.user = userData;
      client.join(`user:${user.id}`);
      client.join(`role:${user.role}`);

      if (!this.connectedUsers.has(user.id)) {
        this.connectedUsers.set(user.id, new Set());
      }
      this.connectedUsers.get(user.id)!.add(client.id);

      this.logger.log(`Socket connected: ${user.firstName} ${user.lastName} (${user.role})`);

      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entity: 'Socket',
          entityId: client.id,
          comment: 'Socket connection established',
        },
      }).catch(() => {});

      client.emit('socket.connected', { userId: user.id, role: user.role });

    } catch (err: any) {
      this.logger.warn(`Socket connection rejected: ${err.message}`);
      client.emit('socket.error', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      const userId = client.user.id;
      const sessions = this.connectedUsers.get(userId);
      if (sessions) {
        sessions.delete(client.id);
        if (sessions.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
      this.logger.log(`Socket disconnected: ${client.user.firstName} ${client.user.lastName}`);
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: AuthenticatedSocket, payload: { room: string }) {
    if (!client.user || !payload?.room) return;
    client.join(payload.room);
    return { event: 'subscribed', data: { room: payload.room } };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: AuthenticatedSocket, payload: { room: string }) {
    if (!client.user || !payload?.room) return;
    client.leave(payload.room);
    return { event: 'unsubscribed', data: { room: payload.room } };
  }

  getConnectedUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId) && (this.connectedUsers.get(userId)?.size ?? 0) > 0;
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token;
    if (auth) return auth;

    const headers = client.handshake.headers;
    const header = (headers.authorization || headers.Authorization) as string | undefined;
    if (header?.startsWith('Bearer ')) return header.slice(7);

    const query = client.handshake.query?.token as string | undefined;
    if (query) return query;

    return null;
  }
}

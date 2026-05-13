import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, data: any) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, { data, timestamp: new Date().toISOString() });
  }

  emitToRole(role: string, event: string, data: any) {
    if (!this.server) return;
    this.server.to(`role:${role}`).emit(event, { data, timestamp: new Date().toISOString() });
  }

  emitToRoom(room: string, event: string, data: any) {
    if (!this.server) return;
    this.server.to(room).emit(event, { data, timestamp: new Date().toISOString() });
  }

  broadcast(event: string, data: any) {
    if (!this.server) {
      this.logger.warn(`Cannot broadcast ${event}: server not initialized`);
      return;
    }
    this.logger.debug(`Broadcasting ${event}`);
    this.server.emit(event, { data, timestamp: new Date().toISOString() });
  }

  emitToUsers(userIds: string[], event: string, data: any) {
    const srv = this.server;
    if (!srv) return;
    userIds.forEach((uid) => {
      srv.to(`user:${uid}`).emit(event, { data, timestamp: new Date().toISOString() });
    });
  }
}

import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SecurityIncidentsService } from '../security-incidents/security-incidents.service';
import { EventsService } from '../events/events.service';
import { Request } from 'express';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
    private securityIncidentsService: SecurityIncidentsService,
    private eventsService: EventsService,
  ) {}

  async login(email: string, password: string, request: Request) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roleRel: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      await this.auditService.log({
        action: AuditAction.LOGIN_FAILED,
        entity: 'User',
        entityId: email,
        request,
        comment: 'Failed login attempt - user not found or inactive',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        entity: 'User',
        entityId: user.id,
        request,
        comment: 'Failed login attempt - invalid password',
      });

      await this.checkFailedLoginThreshold(user.id, request);

      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        deviceInfo: request.headers['user-agent'],
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: request.ip,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      entity: 'User',
      entityId: user.id,
      request,
      comment: 'Successful login',
    });

    this.eventsService.broadcast('dashboard.metrics_updated', { timestamp: new Date().toISOString() });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        employeeStatus: user.employeeStatus,
        department: user.department,
        permissions: user.roleRel?.permissions.map((rp) => rp.permission.action) || [],
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId: session.id,
    };
  }

  async refreshToken(refreshToken: string, request: Request) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: {
        user: {
          include: {
            roleRel: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!session || session.deletedAt) {
      await this.securityIncidentsService.create({
        type: 'REUSED_OLD_REFRESH_TOKEN',
        severity: 'HIGH',
        description: 'Attempt to use a refresh token that does not exist or was replaced',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { refreshToken },
      });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!session.isActive || session.expiresAt < new Date()) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!session.user.isActive || session.user.deletedAt) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      throw new UnauthorizedException('User account is inactive');
    }

    const tokens = await this.generateTokens(
      session.user.id,
      session.user.email,
      session.user.role,
    );

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.auditService.log({
      userId: session.user.id,
      action: AuditAction.LOGIN,
      entity: 'Session',
      entityId: session.id,
      request,
      comment: 'Token refreshed',
    });

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role,
        employeeStatus: session.user.employeeStatus,
        department: session.user.department,
        permissions: session.user.roleRel?.permissions.map((rp) => rp.permission.action) || [],
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId: session.id,
    };
  }

  async logout(userId: string, refreshToken: string, request: Request) {
    await this.prisma.session.updateMany({
      where: { refreshToken, userId },
      data: { isActive: false },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.LOGOUT,
      entity: 'Session',
      request,
      comment: 'User logged out',
    });

    return { message: 'Logged out successfully' };
  }

  async globalLogout(userId: string, request: Request) {
    await this.prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.LOGOUT,
      entity: 'Session',
      request,
      comment: 'Global logout - all sessions terminated',
    });

    this.securityIncidentsService.create({
      userId,
      type: 'LOGOUT_ALL',
      severity: 'MEDIUM',
      description: 'User terminated all active sessions',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return { message: 'All sessions terminated' };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleRel: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      employeeStatus: user.employeeStatus,
      department: user.department,
      permissions: user.roleRel?.permissions.map((rp) => rp.permission.action) || [],
    };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    return { accessToken, refreshToken };
  }

  private async checkFailedLoginThreshold(userId: string, request: Request) {
    const recentAttempts = await this.prisma.auditLog.count({
      where: {
        userId,
        action: AuditAction.LOGIN_FAILED,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });

    if (recentAttempts >= 5) {
      await this.securityIncidentsService.create({
        userId,
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'HIGH',
        description: `Multiple failed login attempts (${recentAttempts} in 15 minutes)`,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { recentAttempts },
      });
    }
  }
}
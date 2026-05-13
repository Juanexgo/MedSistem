import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionAction, UserRole } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionAction[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        role: {
          users: {
            some: { id: user.id },
          },
        },
        permission: {
          action: { in: requiredPermissions },
        },
      },
      include: { permission: true },
    });

    const userPermissions = rolePermissions.map((rp) => rp.permission.action);

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'VIEW' as any,
            entity: 'Permissions',
            entityId: request.route?.path || request.url,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            comment: `Access denied: missing ${requiredPermissions.join(', ')}`,
          },
        });

        await this.prisma.securityIncident.create({
          data: {
            userId: user.id,
            type: 'ACCESS_DENIED',
            severity: 'LOW',
            description: `User lacked permissions: ${requiredPermissions.join(', ')} for ${request.method} ${request.url}`,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          },
        });
      } catch (error) {
        this.logger.error(`Failed to log access denied: ${error}`);
      }

      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateRoleDto, UpdateRoleDto, AddPermissionDto } from './dto/roles.dto';

const CORE_ROLE_NAMES = ['Administrator', 'Head Nurse', 'Transporter', 'Auditor', 'Doctor'];

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Role already exists');

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissionIds
          ? { create: dto.permissionIds.map((pid) => ({ permissionId: pid })) }
          : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });

    return role;
  }

  async findAll() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } }, users: true },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    if (dto.permissionIds) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((pid) => ({ roleId: id, permissionId: pid })),
      });
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
      include: { permissions: { include: { permission: true } } },
    });

    return updated;
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ConflictException('Cannot delete a system role');
    if (CORE_ROLE_NAMES.includes(role.name)) {
      throw new ConflictException(`Cannot delete core role: ${role.name}`);
    }

    const userCount = await this.prisma.user.count({ where: { roleId: id } });
    if (userCount > 0) {
      throw new ConflictException(`Cannot delete role with ${userCount} active users. Reassign users first.`);
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });

    return { message: 'Role deleted successfully' };
  }

  async addPermission(roleId: string, dto: AddPermissionDto) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const permission = await this.prisma.permission.findUnique({ where: { id: dto.permissionId } });
    if (!permission) throw new NotFoundException('Permission not found');

    const existing = await this.prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId: dto.permissionId } },
    });
    if (existing) throw new ConflictException('Permission already assigned to role');

    await this.prisma.rolePermission.create({
      data: { roleId, permissionId: dto.permissionId },
    });

    return this.findById(roleId);
  }

  async removePermission(roleId: string, permissionId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    if (role.isSystem) {
      const permissionCount = await this.prisma.rolePermission.count({ where: { roleId } });
      if (permissionCount <= 1) {
        throw new BadRequestException('Cannot remove the last permission from a system role');
      }
    }

    const existing = await this.prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
    if (!existing) throw new NotFoundException('Permission not assigned to this role');

    await this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });

    return this.findById(roleId);
  }
}
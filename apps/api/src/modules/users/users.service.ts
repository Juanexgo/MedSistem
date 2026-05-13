import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateUserDto, UpdateUserDto, AssignRoleDto, UpdateEmployeeStatusDto } from './dto/users.dto';

const PROTECTED_ROLES = [UserRole.ADMIN, UserRole.HEAD_NURSE, UserRole.TRANSPORTER, UserRole.AUDITOR, UserRole.DOCTOR];

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        roleId: dto.roleId,
        phone: dto.phone,
        department: dto.department,
      },
    });

    return this.sanitizeUser(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.sanitizeUser(u));
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roleRel: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return {
      ...this.sanitizeUser(user),
      permissions: user.roleRel?.permissions.map((rp) => rp.permission.action) || [],
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const previousData = { ...user };

    const updateData: any = { ...dto };
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 12);
      delete updateData.password;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.sanitizeUser(updated);
  }

  async softDelete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.prisma.session.updateMany({
      where: { userId: id, isActive: true },
      data: { isActive: false },
    });

    return { message: 'User deleted successfully' };
  }

  async restore(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.deletedAt) {
      throw new BadRequestException('User is not deleted');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });

    return this.sanitizeUser(updated);
  }

  async assignRole(id: string, dto: AssignRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        roleId: dto.roleId,
        role: role.name as UserRole,
      },
    });

    return this.sanitizeUser(updated);
  }

  async updateEmployeeStatus(id: string, dto: UpdateEmployeeStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { employeeStatus: dto.employeeStatus },
    });

    return this.sanitizeUser(updated);
  }

  private sanitizeUser(user: any) {
    const { passwordHash, deletedAt, ...sanitized } = user;
    return sanitized;
  }
}
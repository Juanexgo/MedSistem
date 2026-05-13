import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const zones = await this.prisma.hospitalZone.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    const activeTransfers = await this.prisma.transferRequest.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      select: { origin: true, destination: true, status: true },
    });

    const zoneCounts: Record<string, number> = {};
    const delayedZoneCounts: Record<string, number> = {};
    const now = new Date();

    activeTransfers.forEach((t) => {
      zoneCounts[t.origin] = (zoneCounts[t.origin] || 0) + 1;
      zoneCounts[t.destination] = (zoneCounts[t.destination] || 0) + 1;
      if (t.status !== 'COMPLETED' && t.status !== 'CANCELLED') {
        delayedZoneCounts[t.origin] = (delayedZoneCounts[t.origin] || 0) + 0;
      }
    });

    return zones.map((z) => ({
      id: z.id,
      name: z.name,
      code: z.code,
      color: z.color,
      order: z.order,
      activeCount: zoneCounts[z.name] || 0,
      delayedCount: delayedZoneCounts[z.name] || 0,
      isSaturated: (zoneCounts[z.name] || 0) >= 3,
    }));
  }

  async seedDefaultZones() {
    const existing = await this.prisma.hospitalZone.count();
    if (existing > 0) return { message: 'Zones already exist' };

    const zones = [
      { name: 'Emergency', code: 'ER', color: '#ef4444', order: 1 },
      { name: 'Hospitalization', code: 'HOSP', color: '#3b82f6', order: 2 },
      { name: 'X-Ray', code: 'XR', color: '#f59e0b', order: 3 },
      { name: 'CT Scan', code: 'CT', color: '#8b5cf6', order: 4 },
      { name: 'Laboratory', code: 'LAB', color: '#10b981', order: 5 },
      { name: 'Operating Rooms', code: 'OR', color: '#ec4899', order: 6 },
      { name: 'Elevators', code: 'ELEV', color: '#6366f1', order: 7 },
      { name: 'Outpatient Area', code: 'OUT', color: '#14b8a6', order: 8 },
    ];

    await this.prisma.hospitalZone.createMany({ data: zones });
    return { message: 'Zones created', count: zones.length };
  }
}

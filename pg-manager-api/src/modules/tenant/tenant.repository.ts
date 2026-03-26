import prisma from '../../config/db.js';
import type { BedStatus, LeaseStatus } from '@prisma/client';
import type { CreateTenantInput, UpdateTenantInput } from './tenant.schema.js';
import { getPaginationParams, getPaginationMeta } from '../../utils/pagination.js';

export class TenantRepository {
  async findAllByOwner(ownerId: string, query: any = {}) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where = { ownerId, deletedAt: null };

    const [data, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take,
        include: {
          leases: {
            where: { status: 'active' as LeaseStatus },
            include: { bed: { include: { room: true } }, property: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tenant.count({ where }),
    ]);

    return { data, meta: getPaginationMeta(total, page, limit) };
  }

  async findById(id: string, ownerId: string) {
    return prisma.tenant.findFirst({
      where: { id, ownerId, deletedAt: null },
      include: {
        leases: { include: { bed: { include: { room: true } }, property: true } },
        documents: true,
      },
    });
  }

  async createWithLease(ownerId: string, data: CreateTenantInput) {
    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          ownerId,
          name: data.name,
          phone: data.phone,
          email: data.email ?? null,
          emergencyContactName: data.emergencyContactName ?? null,
          emergencyContactPhone: data.emergencyContactPhone ?? null,
        },
      });

      const lease = await tx.lease.create({
        data: {
          tenantId: tenant.id,
          bedId: data.bedId,
          propertyId: data.propertyId,
          rentAmount: data.rentAmount,
          securityDeposit: data.securityDeposit ?? 0,
          billingDay: data.billingDay,
          moveInDate: new Date(data.moveInDate),
        },
      });

      await tx.bed.update({
        where: { id: data.bedId },
        data: { status: 'occupied' as BedStatus },
      });

      return { tenant, lease };
    });
  }

  async update(id: string, ownerId: string, data: UpdateTenantInput) {
    return prisma.tenant.updateMany({
      where: { id, ownerId, deletedAt: null },
      data,
    });
  }

  async softDelete(id: string, ownerId: string) {
    return prisma.tenant.updateMany({
      where: { id, ownerId, deletedAt: null },
      data: { deletedAt: new Date(), status: 'checked_out' },
    });
  }
}

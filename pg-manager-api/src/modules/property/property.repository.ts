import prisma from '../../config/db.js';
import type { CreatePropertyInput, UpdatePropertyInput, CreateRoomInput, CreateFloorInput } from './property.schema.js';
import type { RoomType } from '@prisma/client';

export class PropertyRepository {
  async findAllByOwner(ownerId: string) {
    return prisma.property.findMany({
      where: { ownerId, deletedAt: null },
      include: { _count: { select: { rooms: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, ownerId: string) {
    return prisma.property.findFirst({
      where: { id, ownerId, deletedAt: null },
      include: {
        floors: { orderBy: { createdAt: 'asc' } },
        rooms: {
          include: { beds: true },
          orderBy: { roomNumber: 'asc' },
        },
      },
    });
  }

  async create(ownerId: string, data: CreatePropertyInput) {
    return prisma.property.create({
      data: {
        ownerId,
        name: data.name,
        address: data.address,
        city: data.city,
        totalBeds: data.totalBeds ?? 0,
        amenities: data.amenities ?? [],
      },
    });
  }

  async update(id: string, ownerId: string, data: UpdatePropertyInput) {
    return prisma.property.updateMany({
      where: { id, ownerId, deletedAt: null },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async softDelete(id: string, ownerId: string) {
    return prisma.property.updateMany({
      where: { id, ownerId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async createFloor(propertyId: string, data: CreateFloorInput) {
    return prisma.floor.create({
      data: { propertyId, label: data.label },
    });
  }

  async createRoom(propertyId: string, data: CreateRoomInput) {
    const bedCount = { single: 1, double: 2, triple: 3 }[data.roomType];
    const labels = Array.from({ length: bedCount }, (_, i) =>
      String.fromCharCode(65 + i),
    );

    return prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          propertyId,
          floorId: data.floorId ?? null,
          roomNumber: data.roomNumber,
          roomType: data.roomType as RoomType,
          rentAmount: data.rentAmount,
        },
      });

      await tx.bed.createMany({
        data: labels.map((label) => ({
          roomId: room.id,
          label: `Bed ${label}`,
        })),
      });

      return tx.room.findUnique({
        where: { id: room.id },
        include: { beds: true },
      });
    });
  }

  async getVacancySummary(propertyId: string) {
    const beds = await prisma.bed.groupBy({
      by: ['status'],
      where: { room: { propertyId } },
      _count: true,
    });

    const summary = { total: 0, vacant: 0, occupied: 0, reserved: 0 };
    for (const b of beds) {
      summary[b.status] = b._count;
      summary.total += b._count;
    }
    return summary;
  }

  async getRoomsByProperty(propertyId: string) {
    return prisma.room.findMany({
      where: { propertyId, isActive: true },
      include: { beds: true, floor: true },
      orderBy: { roomNumber: 'asc' },
    });
  }
}

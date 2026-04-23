import prisma from '../../config/db.js';
import type { CreatePropertyInput, UpdatePropertyInput, CreateRoomInput, CreateFloorInput } from './property.schema.js';
import type { RoomType } from '@prisma/client';

type PublicPropertyFilters = {
  q?: string;
  city?: string;
  state?: string;
  pincode?: string;
  availableFor?: 'boys' | 'girls' | 'any';
  hasImages?: boolean;
  hasAbout?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: 'updated' | 'distance';
  limit: number;
  offset: number;
};

export class PropertyRepository {
  async findPublic({
    q,
    city,
    state,
    pincode,
    availableFor,
    hasImages,
    hasAbout,
    lat,
    lng,
    radiusKm,
    sort,
    limit,
    offset,
  }: PublicPropertyFilters) {
    const availableForClause =
      availableFor === 'boys'
        ? { availableFor: { contains: 'boy', mode: 'insensitive' as const } }
        : availableFor === 'girls'
          ? { availableFor: { contains: 'girl', mode: 'insensitive' as const } }
          : availableFor === 'any'
            ? {
                OR: [
                  { availableFor: { contains: 'any', mode: 'insensitive' as const } },
                  { availableFor: { contains: 'all', mode: 'insensitive' as const } },
                ],
              }
            : {};

    const hasGeoContext = Number.isFinite(lat) && Number.isFinite(lng);
    const where = {
      deletedAt: null,
      isActive: true,
      ...(city ? { city: { equals: city, mode: 'insensitive' as const } } : {}),
      ...(state ? { state: { equals: state, mode: 'insensitive' as const } } : {}),
      ...(pincode ? { pincode: { contains: pincode, mode: 'insensitive' as const } } : {}),
      ...availableForClause,
      ...(hasAbout ? { AND: [{ about: { not: null } }, { about: { not: '' } }] } : {}),
      ...(hasImages ? { imageUrls: { not: { equals: [] } } } : {}),
      ...(hasGeoContext ? { latitude: { not: null }, longitude: { not: null } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { city: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const select = {
      id: true,
      name: true,
      city: true,
      state: true,
      pincode: true,
      address: true,
      availableFor: true,
      about: true,
      imageUrls: true,
      commonAmenitiesSummary: true,
      serviceAmenitiesSummary: true,
      foodAmenitiesSummary: true,
      latitude: true,
      longitude: true,
    } as const;

    if (!hasGeoContext) {
      const [items, total] = await prisma.$transaction([
        prisma.property.findMany({
          where,
          select,
          orderBy: [{ updatedAt: 'desc' }],
          take: limit,
          skip: offset,
        }),
        prisma.property.count({ where }),
      ]);
      return { items, total };
    }

    const all = await prisma.property.findMany({
      where,
      select,
      orderBy: [{ updatedAt: 'desc' }],
    });

    const withDistance = all.map((item) => ({
      ...item,
      distanceKm: this.haversineKm(lat!, lng!, Number(item.latitude), Number(item.longitude)),
    }));

    const radiusFiltered = typeof radiusKm === 'number'
      ? withDistance.filter((item) => item.distanceKm <= radiusKm)
      : withDistance;

    const ordered = sort === 'distance'
      ? [...radiusFiltered].sort((a, b) => a.distanceKm - b.distanceKm)
      : radiusFiltered;

    return {
      items: ordered.slice(offset, offset + limit),
      total: ordered.length,
    };
  }

  async findPublicById(id: string) {
    return prisma.property.findFirst({
      where: { id, deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        pincode: true,
        address: true,
        availableFor: true,
        about: true,
        imageUrls: true,
        latitude: true,
        longitude: true,
        commonAmenitiesSummary: true,
        serviceAmenitiesSummary: true,
        foodAmenitiesSummary: true,
      },
    });
  }

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
        state: data.state,
        pincode: data.pincode,
        availableFor: data.availableFor,
        about: data.about,
        imageUrls: data.imageUrls ?? [],
        latitude: data.latitude,
        longitude: data.longitude,
        isActive: data.listPublicly ?? false,
        totalBeds: data.totalBeds ?? 0,
        amenities: data.amenities ?? [],
      },
    });
  }

  async update(id: string, ownerId: string, data: UpdatePropertyInput) {
    const payload: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (data.name !== undefined) payload.name = data.name;
    if (data.address !== undefined) payload.address = data.address;
    if (data.city !== undefined) payload.city = data.city;
    if (data.state !== undefined) payload.state = data.state;
    if (data.pincode !== undefined) payload.pincode = data.pincode;
    if (data.availableFor !== undefined) payload.availableFor = data.availableFor;
    if (data.about !== undefined) payload.about = data.about;
    if (data.imageUrls !== undefined) payload.imageUrls = data.imageUrls;
    if (data.totalBeds !== undefined) payload.totalBeds = data.totalBeds;
    if (data.amenities !== undefined) payload.amenities = data.amenities;
    if (data.listPublicly !== undefined) payload.isActive = data.listPublicly;
    if (data.latitude !== undefined) payload.latitude = data.latitude;
    if (data.longitude !== undefined) payload.longitude = data.longitude;

    return prisma.property.updateMany({
      where: { id, ownerId, deletedAt: null },
      data: payload,
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

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthKm * c;
  }
}

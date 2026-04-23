import prisma from '../../config/db.js';
import type { BookingStatus } from '@prisma/client';

interface CreateBookingInput {
  ownerId: string;
  propertyId: string;
  bedId?: string;
  name: string;
  phone: string;
  email?: string;
  expectedCheckIn: string;
  rentAmount: number;
  advanceAmount?: number;
  advancePaid?: boolean;
  notes?: string;
}

interface UpdateBookingInput {
  bedId?: string;
  name?: string;
  phone?: string;
  email?: string;
  expectedCheckIn?: string;
  rentAmount?: number;
  advanceAmount?: number;
  advancePaid?: boolean;
  status?: BookingStatus;
  notes?: string;
}

export async function createBooking(data: CreateBookingInput) {
  // Verify property belongs to owner
  const property = await prisma.property.findFirst({
    where: { id: data.propertyId, ownerId: data.ownerId, deletedAt: null },
  });
  if (!property) throw new Error('Property not found');

  // If bedId provided, verify it belongs to the property and is vacant
  if (data.bedId) {
    const bed = await prisma.bed.findFirst({
      where: { id: data.bedId, room: { propertyId: data.propertyId }, status: 'vacant' },
    });
    if (!bed) throw new Error('Bed not found or not vacant');

    // Reserve the bed
    await prisma.bed.update({
      where: { id: data.bedId },
      data: { status: 'reserved' },
    });
  }

  return prisma.booking.create({
    data: {
      ownerId: data.ownerId,
      propertyId: data.propertyId,
      bedId: data.bedId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      expectedCheckIn: new Date(data.expectedCheckIn),
      rentAmount: data.rentAmount,
      advanceAmount: data.advanceAmount ?? 0,
      advancePaid: data.advancePaid ?? false,
      notes: data.notes,
    },
    include: { property: true, bed: { include: { room: true } } },
  });
}

export async function updateBooking(id: string, ownerId: string, data: UpdateBookingInput) {
  const booking = await prisma.booking.findFirst({
    where: { id, ownerId },
  });
  if (!booking) throw new Error('Booking not found');

  return prisma.booking.update({
    where: { id },
    data: {
      ...(data.bedId !== undefined ? { bedId: data.bedId } : {}),
      ...(data.name ? { name: data.name } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.expectedCheckIn ? { expectedCheckIn: new Date(data.expectedCheckIn) } : {}),
      ...(data.rentAmount !== undefined ? { rentAmount: data.rentAmount } : {}),
      ...(data.advanceAmount !== undefined ? { advanceAmount: data.advanceAmount } : {}),
      ...(data.advancePaid !== undefined ? { advancePaid: data.advancePaid } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
    include: { property: true, bed: { include: { room: true } } },
  });
}

/**
 * Convert a booking into an actual tenant + lease.
 * Creates the tenant, creates a lease, marks bed as occupied, and updates booking status.
 */
export async function convertBookingToTenant(bookingId: string, ownerId: string, billingDay: number) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, ownerId, status: { in: ['pending', 'confirmed'] } },
  });
  if (!booking) throw new Error('Booking not found or already converted/cancelled');
  if (!booking.bedId) throw new Error('Booking must have a bed assigned before conversion');

  return prisma.$transaction(async (tx) => {
    // 1. Create tenant
    const tenant = await tx.tenant.create({
      data: {
        ownerId,
        name: booking.name,
        phone: booking.phone,
        email: booking.email,
      },
    });

    // 2. Create lease
    const lease = await tx.lease.create({
      data: {
        tenantId: tenant.id,
        bedId: booking.bedId!,
        propertyId: booking.propertyId,
        rentAmount: booking.rentAmount,
        securityDeposit: booking.advanceAmount,
        depositStatus: booking.advancePaid ? 'paid' : 'pending',
        billingDay,
        moveInDate: booking.expectedCheckIn,
      },
    });

    // 3. Mark bed as occupied
    await tx.bed.update({
      where: { id: booking.bedId! },
      data: { status: 'occupied' },
    });

    // 4. Update booking status
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'converted', convertedTenantId: tenant.id },
    });

    return { tenant, lease };
  });
}

import prisma from '../../config/db.js';
import type { LeadSource, LeadStatus } from '@prisma/client';

interface CreateLeadInput {
  ownerId: string;
  propertyId?: string;
  name: string;
  phone: string;
  email?: string;
  source?: LeadSource;
  budget?: number;
  preferredRoomType?: string;
  followUpDate?: string;
  notes?: string;
}

interface UpdateLeadInput {
  propertyId?: string;
  name?: string;
  phone?: string;
  email?: string;
  source?: LeadSource;
  status?: LeadStatus;
  budget?: number;
  preferredRoomType?: string;
  followUpDate?: string;
  notes?: string;
}

export async function createLead(data: CreateLeadInput) {
  if (data.propertyId) {
    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, ownerId: data.ownerId, deletedAt: null },
    });
    if (!property) throw new Error('Property not found');
  }

  return prisma.lead.create({
    data: {
      ownerId: data.ownerId,
      propertyId: data.propertyId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      source: data.source ?? 'other',
      budget: data.budget,
      preferredRoomType: data.preferredRoomType,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      notes: data.notes,
    },
    include: { property: true },
  });
}

export async function updateLead(id: string, ownerId: string, data: UpdateLeadInput) {
  const lead = await prisma.lead.findFirst({ where: { id, ownerId } });
  if (!lead) throw new Error('Lead not found');

  return prisma.lead.update({
    where: { id },
    data: {
      ...(data.propertyId !== undefined ? { propertyId: data.propertyId } : {}),
      ...(data.name ? { name: data.name } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.source ? { source: data.source } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.budget !== undefined ? { budget: data.budget } : {}),
      ...(data.preferredRoomType !== undefined ? { preferredRoomType: data.preferredRoomType } : {}),
      ...(data.followUpDate !== undefined ? { followUpDate: data.followUpDate ? new Date(data.followUpDate) : null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
    include: { property: true },
  });
}

/**
 * Convert a lead into a booking.
 * Creates a booking from lead data and updates lead status.
 */
export async function convertLeadToBooking(
  leadId: string,
  ownerId: string,
  bookingData: {
    propertyId: string;
    bedId?: string;
    expectedCheckIn: string;
    rentAmount: number;
    advanceAmount?: number;
  },
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ownerId, status: { not: 'converted' } },
  });
  if (!lead) throw new Error('Lead not found or already converted');

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        ownerId,
        propertyId: bookingData.propertyId,
        bedId: bookingData.bedId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        expectedCheckIn: new Date(bookingData.expectedCheckIn),
        rentAmount: bookingData.rentAmount,
        advanceAmount: bookingData.advanceAmount ?? 0,
      },
      include: { property: true, bed: { include: { room: true } } },
    });

    // Reserve the bed if provided
    if (bookingData.bedId) {
      await tx.bed.update({
        where: { id: bookingData.bedId },
        data: { status: 'reserved' },
      });
    }

    await tx.lead.update({
      where: { id: leadId },
      data: { status: 'converted', convertedBookingId: booking.id },
    });

    return booking;
  });
}

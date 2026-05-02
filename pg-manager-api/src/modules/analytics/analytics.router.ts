import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import prisma from '../../config/db.js';
import { getMinDaysToNextInvoice } from '../../utils/invoiceSchedule.js';

const router = Router();

router.use(authenticate);
router.use(authorize('owner'));

router.get('/dashboard', async (req, res, next) => {
  try {
    const ownerId = req.user!.sub;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Month boundaries
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const [
      properties,
      beds,
      openComplaints,
      todayPayments,
      monthPayments,
      unpaidInvoices,
      monthDuesInvoices,
      monthExpenses,
      tenantsUnderNotice,
      activeBookings,
      newLeads,
      activeLeases,
    ] = await Promise.all([
      prisma.property.count({ where: { ownerId, deletedAt: null } }),
      prisma.bed.groupBy({
        by: ['status'],
        where: { room: { property: { ownerId, deletedAt: null } } },
        _count: true,
      }),
      prisma.complaint.count({
        where: {
          property: { ownerId },
          status: { in: ['open', 'in_progress'] },
        },
      }),
      // Today's collection
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'success',
          paidAt: { gte: today, lt: tomorrow },
          invoice: { property: { ownerId } },
        },
      }),
      // Month's collection
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'success',
          paidAt: { gte: monthStart, lt: monthEnd },
          invoice: { property: { ownerId } },
        },
      }),
      // Total dues: sum of unpaid invoice totals
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: {
          property: { ownerId },
          status: { in: ['sent', 'partially_paid', 'overdue'] },
        },
      }),
      // Month's dues: invoices due this month that are unpaid
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: {
          property: { ownerId },
          status: { in: ['sent', 'partially_paid', 'overdue'] },
          dueDate: { gte: monthStart, lt: monthEnd },
        },
      }),
      // Month's expenses
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          property: { ownerId },
          date: { gte: monthStart, lt: monthEnd },
        },
      }),
      // Tenants under notice (active lease with move-out date set)
      prisma.lease.count({
        where: {
          property: { ownerId },
          status: 'active',
          moveOutDate: { not: null },
        },
      }),
      // Active bookings
      prisma.booking.count({
        where: {
          ownerId,
          status: { in: ['pending', 'confirmed'] },
        },
      }),
      // New leads this month
      prisma.lead.count({
        where: {
          ownerId,
          status: 'new_lead',
          createdAt: { gte: monthStart, lt: monthEnd },
        },
      }),
      prisma.lease.findMany({
        where: {
          status: 'active',
          property: { ownerId },
        },
        select: { billingDay: true },
      }),
    ]);

    const occupancy = { total: 0, vacant: 0, occupied: 0, reserved: 0 } as Record<string, number>;
    for (const b of beds) {
      occupancy[b.status] = b._count;
      occupancy.total += b._count;
    }

    const daysToNextInvoice = getMinDaysToNextInvoice(activeLeases.map((lease) => lease.billingDay));

    res.json({
      success: true,
      data: {
        totalProperties: properties,
        occupancy,
        openComplaints,
        todayCollection: Number(todayPayments._sum.amount || 0),
        monthCollection: Number(monthPayments._sum.amount || 0),
        totalDues: Number(unpaidInvoices._sum.total || 0),
        monthDues: Number(monthDuesInvoices._sum.total || 0),
        monthExpenses: Number(monthExpenses._sum.amount || 0),
        tenantsUnderNotice,
        activeBookings,
        newLeads,
        daysToNextInvoice,
      },
    });
  } catch (err) { next(err); }
});

/**
 * GET /v1/analytics/property/:id — Per-property analytics
 */
router.get('/property/:id', async (req, res, next) => {
  try {
    const ownerId = req.user!.sub;
    const propertyId = req.params.id as string;

    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId, deletedAt: null },
    });
    if (!property) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Property not found' } });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const [
      beds,
      activeTenants,
      openComplaints,
      monthCollection,
      pendingDues,
      monthExpenses,
    ] = await Promise.all([
      prisma.bed.groupBy({
        by: ['status'],
        where: { room: { propertyId } },
        _count: true,
      }),
      prisma.lease.count({
        where: { propertyId, status: 'active' },
      }),
      prisma.complaint.count({
        where: { propertyId, status: { in: ['open', 'in_progress'] } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'success',
          paidAt: { gte: monthStart, lt: monthEnd },
          invoice: { propertyId },
        },
      }),
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: {
          propertyId,
          status: { in: ['sent', 'partially_paid', 'overdue'] },
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          propertyId,
          date: { gte: monthStart, lt: monthEnd },
        },
      }),
    ]);

    const occupancy = { total: 0, vacant: 0, occupied: 0, reserved: 0 } as Record<string, number>;
    for (const b of beds) {
      occupancy[b.status] = b._count;
      occupancy.total += b._count;
    }

    res.json({
      success: true,
      data: {
        property: { id: property.id, name: property.name },
        occupancy,
        activeTenants,
        openComplaints,
        monthCollection: Number(monthCollection._sum.amount || 0),
        pendingDues: Number(pendingDues._sum.total || 0),
        monthExpenses: Number(monthExpenses._sum.amount || 0),
      },
    });
  } catch (err) { next(err); }
});

export default router;

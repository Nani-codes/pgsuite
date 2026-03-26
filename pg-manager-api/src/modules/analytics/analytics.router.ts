import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import prisma from '../../config/db.js';

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

    const [properties, beds, openComplaints, todayPayments, unpaidInvoices] = await Promise.all([
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
      // Today's collection: sum of payments received today
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'success',
          paidAt: { gte: today, lt: tomorrow },
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
    ]);

    const occupancy = { total: 0, vacant: 0, occupied: 0, reserved: 0 } as Record<string, number>;
    for (const b of beds) {
      occupancy[b.status] = b._count;
      occupancy.total += b._count;
    }

    res.json({
      success: true,
      data: {
        totalProperties: properties,
        occupancy,
        openComplaints,
        todayCollection: Number(todayPayments._sum.amount || 0),
        totalDues: Number(unpaidInvoices._sum.total || 0),
      },
    });
  } catch (err) { next(err); }
});

export default router;

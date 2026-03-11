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

    const [properties, beds, openComplaints] = await Promise.all([
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
    ]);

    const occupancy = { total: 0, vacant: 0, occupied: 0, reserved: 0 };
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
      },
    });
  } catch (err) { next(err); }
});

export default router;

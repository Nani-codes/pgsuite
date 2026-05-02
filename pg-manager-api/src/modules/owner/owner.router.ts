import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import prisma from '../../config/db.js';
import { z } from 'zod/v4';
import { getMinDaysToNextInvoice } from '../../utils/invoiceSchedule.js';

const router = Router();

router.use(authenticate);
router.use(authorize('owner'));

const updateOwnerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
});

/**
 * GET /v1/owners/me
 */
router.get('/me', async (req, res, next) => {
  try {
    const ownerId = req.user!.sub;

    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      include: {
        _count: { select: { properties: true, tenants: true } },
      },
    });

    if (!owner) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Owner not found' },
      });
      return;
    }

    const activeLeases = await prisma.lease.findMany({
      where: {
        status: 'active',
        property: { ownerId },
      },
      select: { billingDay: true },
    });
    const daysToNextInvoice = getMinDaysToNextInvoice(activeLeases.map((lease) => lease.billingDay));

    res.json({
      success: true,
      data: {
        ...owner,
        daysToNextInvoice,
      },
    });
  } catch (err) { next(err); }
});

/**
 * PUT /v1/owners/me
 */
router.put('/me', async (req, res, next) => {
  try {
    const data = updateOwnerSchema.parse(req.body);

    const owner = await prisma.owner.update({
      where: { id: req.user!.sub },
      data,
    });

    res.json({ success: true, data: owner });
  } catch (err) { next(err); }
});

export default router;

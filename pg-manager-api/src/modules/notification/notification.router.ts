import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import prisma from '../../config/db.js';
import { z } from 'zod/v4';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { tenantId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
});

const createNotificationSchema = z.object({
  tenantId: z.string().uuid(),
  type: z.enum(['rent_due', 'payment_success', 'complaint_update', 'notice', 'otp']),
  message: z.string().min(1),
  channel: z.enum(['push', 'whatsapp', 'sms']).optional().default('push'),
});

/**
 * POST /v1/notifications — Owner sends a notification to a tenant
 */
router.post('/', async (req, res, next) => {
  try {
    if (req.user!.role !== 'owner') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only owners can send notifications' },
      });
      return;
    }

    const data = createNotificationSchema.parse(req.body);

    // Verify tenant belongs to this owner
    const tenant = await prisma.tenant.findFirst({
      where: { id: data.tenantId, ownerId: req.user!.sub },
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
      });
      return;
    }

    const notification = await prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        type: data.type,
        channel: data.channel,
        message: data.message,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    res.status(201).json({ success: true, data: notification });
  } catch (err) { next(err); }
});

export default router;

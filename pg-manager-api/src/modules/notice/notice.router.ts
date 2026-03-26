import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import prisma from '../../config/db.js';
import { z } from 'zod/v4';

const router = Router();

router.use(authenticate);
router.use(authorize('owner'));

const createNoticeSchema = z.object({
  propertyId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
});

/**
 * GET /v1/notices — List notices created by this owner
 */
router.get('/', async (req, res, next) => {
  try {
    const notices = await prisma.notice.findMany({
      where: { createdBy: req.user!.sub },
      include: { property: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: notices });
  } catch (err) { next(err); }
});

/**
 * POST /v1/notices — Create a new notice/announcement
 */
router.post('/', async (req, res, next) => {
  try {
    const data = createNoticeSchema.parse(req.body);

    // Verify property belongs to owner (if specified)
    if (data.propertyId) {
      const prop = await prisma.property.findFirst({
        where: { id: data.propertyId, ownerId: req.user!.sub },
      });
      if (!prop) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Property not found' },
        });
        return;
      }
    }

    const notice = await prisma.notice.create({
      data: {
        propertyId: data.propertyId,
        title: data.title,
        body: data.body,
        createdBy: req.user!.sub,
      },
      include: { property: true },
    });

    res.status(201).json({ success: true, data: notice });
  } catch (err) { next(err); }
});

/**
 * DELETE /v1/notices/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const noticeId = req.params.id as string;
    const notice = await prisma.notice.findFirst({
      where: { id: noticeId, createdBy: req.user!.sub },
    });

    if (!notice) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notice not found' },
      });
      return;
    }

    await prisma.notice.delete({ where: { id: noticeId } });
    res.json({ success: true, message: 'Notice deleted' });
  } catch (err) { next(err); }
});

export default router;

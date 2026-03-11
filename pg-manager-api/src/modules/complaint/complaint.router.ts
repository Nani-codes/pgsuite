import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import prisma from '../../config/db.js';
import { z } from 'zod/v4';

const router = Router();

router.use(authenticate);

const createComplaintSchema = z.object({
  propertyId: z.uuid(),
  category: z.enum(['plumbing', 'electrical', 'wifi', 'cleaning', 'furniture', 'security', 'other']),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  photoUrls: z.array(z.string()).optional().default([]),
});

router.get('/', async (req, res, next) => {
  try {
    const where = req.user!.role === 'owner'
      ? { property: { ownerId: req.user!.sub } }
      : { tenantId: req.user!.sub };

    const complaints = await prisma.complaint.findMany({
      where,
      include: { tenant: true, updates: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: complaints });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = createComplaintSchema.parse(req.body);
    const complaint = await prisma.complaint.create({
      data: {
        tenantId: req.user!.sub,
        propertyId: parsed.propertyId,
        category: parsed.category,
        title: parsed.title,
        description: parsed.description,
        photoUrls: parsed.photoUrls,
      },
    });
    res.status(201).json({ success: true, data: complaint });
  } catch (err) { next(err); }
});

export default router;

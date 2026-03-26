import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import prisma from '../../config/db.js';
import { z } from 'zod/v4';
import { getPaginationParams, getPaginationMeta } from '../../utils/pagination.js';

const router = Router();

router.use(authenticate);

const createComplaintSchema = z.object({
  propertyId: z.uuid().optional(),
  category: z.enum(['plumbing', 'electrical', 'wifi', 'cleaning', 'furniture', 'security', 'other']),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  photoUrls: z.array(z.string()).optional().default([]),
});

const updateStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  message: z.string().optional().default(''),
});

router.get('/', async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPaginationParams(req.query);
    const where = req.user!.role === 'owner'
      ? { property: { ownerId: req.user!.sub } }
      : { tenantId: req.user!.sub };

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take,
        include: { tenant: true, updates: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.complaint.count({ where }),
    ]);
    res.json({ success: true, data: complaints, meta: getPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = createComplaintSchema.parse(req.body);
    let propertyId = parsed.propertyId;

    // For tenants, auto-derive propertyId from their active lease
    if (req.user!.role === 'tenant') {
      const lease = await prisma.lease.findFirst({
        where: { tenantId: req.user!.sub, status: 'active' },
      });
      if (lease) {
        propertyId = lease.propertyId;
      } else if (!propertyId) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_ACTIVE_LEASE', message: 'No active lease found for tenant' },
        });
        return;
      }
    }

    if (!propertyId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_PROPERTY', message: 'propertyId is required' },
      });
      return;
    }

    const complaint = await prisma.complaint.create({
      data: {
        tenantId: req.user!.sub,
        propertyId,
        category: parsed.category,
        title: parsed.title,
        description: parsed.description,
        photoUrls: parsed.photoUrls,
      },
    });
    res.status(201).json({ success: true, data: complaint });
  } catch (err) { next(err); }
});

/**
 * PATCH /:id/status — Update complaint status (owner only)
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, message } = updateStatusSchema.parse(req.body);
    const complaintId = req.params.id as string;

    // Find the complaint — owners can update their property's complaints
    const where = req.user!.role === 'owner'
      ? { id: complaintId, property: { ownerId: req.user!.sub } }
      : { id: complaintId, tenantId: req.user!.sub };

    const complaint = await prisma.complaint.findFirst({ where });
    if (!complaint) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Complaint not found' },
      });
      return;
    }

    // Update complaint status and create an update record
    const [updated] = await prisma.$transaction([
      prisma.complaint.update({
        where: { id: complaintId },
        data: {
          status,
          ...(status === 'resolved' ? { resolvedAt: new Date() } : {}),
        },
        include: { tenant: true, updates: { orderBy: { createdAt: 'asc' } } },
      }),
      prisma.complaintUpdate.create({
        data: {
          complaintId,
          updatedBy: req.user!.role,
          message: message || `Status changed to ${status}`,
          status,
        },
      }),
    ]);

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;

import { Router } from 'express';
import { z } from 'zod/v4';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import prisma from '../../config/db.js';
import { getPaginationParams, getPaginationMeta } from '../../utils/pagination.js';
import { createDuesPackage, updateDuesPackage, assignPackageToLease } from './dues-package.service.js';

const router = Router();

router.use(authenticate);
router.use(authorize('owner'));

// ─── Validation Schemas ─────────────────────────────────────────────

const packageItemSchema = z.object({
  type: z.enum(['rent', 'late_fee', 'utility', 'maintenance', 'other']).optional(),
  description: z.string().min(1),
  amount: z.number().positive(),
});

const createPackageSchema = z.object({
  propertyId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  frequency: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly']).optional(),
  autoGenerate: z.boolean().optional(),
  items: z.array(packageItemSchema).min(1),
});

const updatePackageSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  frequency: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly']).optional(),
  autoGenerate: z.boolean().optional(),
  isActive: z.boolean().optional(),
  items: z.array(packageItemSchema).min(1).optional(),
});

const assignPackageSchema = z.object({
  leaseId: z.string().uuid(),
});

// ─── Routes ─────────────────────────────────────────────────────────

/**
 * GET /v1/dues-packages — List all dues packages
 */
router.get('/', async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPaginationParams(req.query);
    const propertyId = req.query.propertyId as string | undefined;

    const where: Record<string, unknown> = { ownerId: req.user!.sub };
    if (propertyId) where.propertyId = propertyId;

    const [packages, total] = await Promise.all([
      prisma.duesPackage.findMany({
        where,
        skip,
        take,
        include: { items: true, property: true, _count: { select: { leases: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.duesPackage.count({ where }),
    ]);

    res.json({ success: true, data: packages, meta: getPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
});

/**
 * GET /v1/dues-packages/:id — Get a single dues package
 */
router.get('/:id', async (req, res, next) => {
  try {
    const pkg = await prisma.duesPackage.findFirst({
      where: { id: req.params.id as string, ownerId: req.user!.sub },
      include: {
        items: true,
        property: true,
        leases: { include: { tenant: true }, where: { status: 'active' } },
      },
    });
    if (!pkg) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Dues package not found' } });
      return;
    }
    res.json({ success: true, data: pkg });
  } catch (err) { next(err); }
});

/**
 * POST /v1/dues-packages — Create a new dues package
 */
router.post('/', async (req, res, next) => {
  try {
    const data = createPackageSchema.parse(req.body);
    const pkg = await createDuesPackage({ ...data, ownerId: req.user!.sub });
    res.status(201).json({ success: true, data: pkg });
  } catch (err) { next(err); }
});

/**
 * PATCH /v1/dues-packages/:id — Update a dues package
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const data = updatePackageSchema.parse(req.body);
    const pkg = await updateDuesPackage(req.params.id as string, req.user!.sub, data);
    res.json({ success: true, data: pkg });
  } catch (err) { next(err); }
});

/**
 * POST /v1/dues-packages/:id/assign — Assign package to a lease
 */
router.post('/:id/assign', async (req, res, next) => {
  try {
    const { leaseId } = assignPackageSchema.parse(req.body);
    const lease = await assignPackageToLease(req.params.id as string, leaseId, req.user!.sub);
    res.json({ success: true, data: lease });
  } catch (err) { next(err); }
});

/**
 * DELETE /v1/dues-packages/:id — Deactivate a dues package
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const pkg = await prisma.duesPackage.findFirst({
      where: { id: req.params.id as string, ownerId: req.user!.sub },
    });
    if (!pkg) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Dues package not found' } });
      return;
    }

    await prisma.duesPackage.update({
      where: { id: pkg.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Dues package deactivated' });
  } catch (err) { next(err); }
});

export default router;

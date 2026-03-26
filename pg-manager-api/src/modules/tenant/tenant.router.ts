import { Router } from 'express';
import { TenantController } from './tenant.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createTenantSchema, updateTenantSchema } from './tenant.schema.js';
import prisma from '../../config/db.js';

const router = Router();
const ctrl = new TenantController();

router.use(authenticate);

// ─── Tenant self-access (before owner-only guard) ───────────────────
router.get('/me', async (req, res, next) => {
  try {
    if (req.user!.role !== 'tenant') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only tenants can access this endpoint' },
      });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.sub },
      include: {
        leases: {
          where: { status: 'active' },
          include: {
            property: true,
            bed: { include: { room: true } },
          },
        },
        documents: true,
      },
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
      });
      return;
    }

    res.json({ success: true, data: tenant });
  } catch (err) { next(err); }
});

// ─── Owner-only routes below ──────────────────────────────────────
router.use(authorize('owner'));

router.get('/', (req, res, next) => { ctrl.list(req, res).catch(next); });
router.post('/', validate(createTenantSchema), (req, res, next) => { ctrl.create(req, res).catch(next); });
router.get('/:id', (req, res, next) => { ctrl.get(req, res).catch(next); });
router.put('/:id', validate(updateTenantSchema), (req, res, next) => { ctrl.update(req, res).catch(next); });
router.delete('/:id', (req, res, next) => { ctrl.delete(req, res).catch(next); });

/**
 * POST /:id/checkout — Checkout a tenant (end lease, free bed)
 */
router.post('/:id/checkout', async (req, res, next) => {
  try {
    const tenantId = req.params.id as string;
    const ownerId = req.user!.sub;

    // Verify tenant belongs to this owner
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, ownerId },
      include: { leases: { where: { status: 'active' } } },
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
      });
      return;
    }

    // Terminate all active leases and free the beds
    await prisma.$transaction(async (tx) => {
      for (const lease of tenant.leases) {
        await tx.lease.update({
          where: { id: lease.id },
          data: { status: 'terminated', moveOutDate: new Date() },
        });
        await tx.bed.update({
          where: { id: lease.bedId },
          data: { status: 'vacant' },
        });
      }

      await tx.tenant.update({
        where: { id: tenantId },
        data: { status: 'checked_out' },
      });
    });

    const updated = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { leases: { include: { property: true, bed: { include: { room: true } } } } },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;

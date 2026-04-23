import { Router } from 'express';
import { z } from 'zod/v4';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import prisma from '../../config/db.js';
import { getPaginationParams, getPaginationMeta } from '../../utils/pagination.js';
import { createLead, updateLead, convertLeadToBooking } from './lead.service.js';

const router = Router();

router.use(authenticate);
router.use(authorize('owner'));

// ─── Validation Schemas ─────────────────────────────────────────────

const createLeadSchema = z.object({
  propertyId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  phone: z.string().min(10).max(20),
  email: z.email().optional(),
  source: z.enum(['walk_in', 'online', 'referral', 'social_media', 'other']).optional(),
  budget: z.number().positive().optional(),
  preferredRoomType: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

const updateLeadSchema = z.object({
  propertyId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.email().optional(),
  source: z.enum(['walk_in', 'online', 'referral', 'social_media', 'other']).optional(),
  status: z.enum(['new_lead', 'contacted', 'interested', 'visit_scheduled', 'visit_done', 'converted', 'lost']).optional(),
  budget: z.number().positive().optional(),
  preferredRoomType: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

const convertLeadSchema = z.object({
  propertyId: z.string().uuid(),
  bedId: z.string().uuid().optional(),
  expectedCheckIn: z.string(),
  rentAmount: z.number().positive(),
  advanceAmount: z.number().min(0).optional(),
});

// ─── Routes ─────────────────────────────────────────────────────────

/**
 * GET /v1/leads — List all leads for the owner
 */
router.get('/', async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPaginationParams(req.query);
    const status = req.query.status as string | undefined;
    const source = req.query.source as string | undefined;
    const propertyId = req.query.propertyId as string | undefined;

    const where: Record<string, unknown> = { ownerId: req.user!.sub };
    if (status) where.status = status;
    if (source) where.source = source;
    if (propertyId) where.propertyId = propertyId;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        include: { property: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ success: true, data: leads, meta: getPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
});

/**
 * GET /v1/leads/:id — Get a single lead
 */
router.get('/:id', async (req, res, next) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id as string, ownerId: req.user!.sub },
      include: { property: true },
    });
    if (!lead) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
      return;
    }
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
});

/**
 * POST /v1/leads — Create a new lead
 */
router.post('/', async (req, res, next) => {
  try {
    const data = createLeadSchema.parse(req.body);
    const lead = await createLead({ ...data, ownerId: req.user!.sub });
    res.status(201).json({ success: true, data: lead });
  } catch (err) { next(err); }
});

/**
 * PATCH /v1/leads/:id — Update a lead
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateLeadSchema.parse(req.body);
    const lead = await updateLead(req.params.id as string, req.user!.sub, data);
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
});

/**
 * POST /v1/leads/:id/convert — Convert lead to a booking
 */
router.post('/:id/convert', async (req, res, next) => {
  try {
    const data = convertLeadSchema.parse(req.body);
    const booking = await convertLeadToBooking(req.params.id as string, req.user!.sub, data);
    res.status(201).json({ success: true, data: booking });
  } catch (err) { next(err); }
});

/**
 * DELETE /v1/leads/:id — Delete/archive a lead
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id as string, ownerId: req.user!.sub },
    });
    if (!lead) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
      return;
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'lost' },
    });

    res.json({ success: true, message: 'Lead archived' });
  } catch (err) { next(err); }
});

export default router;

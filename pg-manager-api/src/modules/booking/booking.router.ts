import { Router } from 'express';
import { z } from 'zod/v4';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import prisma from '../../config/db.js';
import { getPaginationParams, getPaginationMeta } from '../../utils/pagination.js';
import { createBooking, updateBooking, convertBookingToTenant } from './booking.service.js';

const router = Router();

router.use(authenticate);
router.use(authorize('owner'));

// ─── Validation Schemas ─────────────────────────────────────────────

const createBookingSchema = z.object({
  propertyId: z.string().uuid(),
  bedId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  phone: z.string().min(10).max(20),
  email: z.email().optional(),
  expectedCheckIn: z.string(),
  rentAmount: z.number().positive(),
  advanceAmount: z.number().min(0).optional(),
  advancePaid: z.boolean().optional(),
  notes: z.string().optional(),
});

const updateBookingSchema = z.object({
  bedId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.email().optional(),
  expectedCheckIn: z.string().optional(),
  rentAmount: z.number().positive().optional(),
  advanceAmount: z.number().min(0).optional(),
  advancePaid: z.boolean().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  notes: z.string().optional(),
});

const convertBookingSchema = z.object({
  billingDay: z.number().int().min(1).max(28),
});

// ─── Routes ─────────────────────────────────────────────────────────

/**
 * GET /v1/bookings — List all bookings for the owner
 */
router.get('/', async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPaginationParams(req.query);
    const status = req.query.status as string | undefined;
    const propertyId = req.query.propertyId as string | undefined;

    const where: Record<string, unknown> = { ownerId: req.user!.sub };
    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take,
        include: { property: true, bed: { include: { room: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ success: true, data: bookings, meta: getPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
});

/**
 * GET /v1/bookings/:id — Get a single booking
 */
router.get('/:id', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id as string, ownerId: req.user!.sub },
      include: { property: true, bed: { include: { room: true } } },
    });
    if (!booking) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
});

/**
 * POST /v1/bookings — Create a new booking
 */
router.post('/', async (req, res, next) => {
  try {
    const data = createBookingSchema.parse(req.body);
    const booking = await createBooking({ ...data, ownerId: req.user!.sub });
    res.status(201).json({ success: true, data: booking });
  } catch (err) { next(err); }
});

/**
 * PATCH /v1/bookings/:id — Update a booking
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateBookingSchema.parse(req.body);
    const booking = await updateBooking(req.params.id as string, req.user!.sub, data);
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
});

/**
 * POST /v1/bookings/:id/convert — Convert booking to tenant + lease
 */
router.post('/:id/convert', async (req, res, next) => {
  try {
    const { billingDay } = convertBookingSchema.parse(req.body);
    const result = await convertBookingToTenant(req.params.id as string, req.user!.sub, billingDay);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * DELETE /v1/bookings/:id — Cancel a booking
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id as string, ownerId: req.user!.sub },
    });
    if (!booking) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    // Release the bed if it was reserved
    if (booking.bedId && booking.status !== 'converted') {
      await prisma.bed.update({
        where: { id: booking.bedId },
        data: { status: 'vacant' },
      });
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });

    res.json({ success: true, message: 'Booking cancelled' });
  } catch (err) { next(err); }
});

export default router;

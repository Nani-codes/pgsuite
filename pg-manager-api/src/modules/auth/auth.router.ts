import { Router } from 'express';
import prisma from '../../config/db.js';
import { z } from 'zod/v4';

const router = Router();

const sendOtpSchema = z.object({
  phone: z.string().min(10).max(20),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(20),
  otp: z.string().length(6),
});

/**
 * Stub OTP endpoints for development.
 * In production, these would integrate with Exotel and issue real JWTs.
 * For dev, OTP is always "123456".
 */
router.post('/send-otp', async (req, res, next) => {
  try {
    const { phone } = sendOtpSchema.parse(req.body);

    const owner = await prisma.owner.findUnique({ where: { phone } });
    const tenant = owner
      ? null
      : await prisma.tenant.findFirst({ where: { phone } });

    if (!owner && !tenant) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No account found for this phone number' },
      });
      return;
    }

    res.json({ success: true, message: 'OTP sent (dev: use 123456)' });
  } catch (err) { next(err); }
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, otp } = verifyOtpSchema.parse(req.body);

    if (otp !== '123456') {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_OTP', message: 'Invalid OTP' },
      });
      return;
    }

    const owner = await prisma.owner.findUnique({ where: { phone } });
    if (owner) {
      res.json({
        success: true,
        data: {
          accessToken: `dev-token-owner-${owner.id}`,
          user: { id: owner.id, name: owner.name, role: 'owner' },
        },
      });
      return;
    }

    const tenant = await prisma.tenant.findFirst({ where: { phone } });
    if (tenant) {
      res.json({
        success: true,
        data: {
          accessToken: `dev-token-tenant-${tenant.id}`,
          user: { id: tenant.id, name: tenant.name, role: 'tenant' },
        },
      });
      return;
    }

    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Account not found' },
    });
  } catch (err) { next(err); }
});

export default router;

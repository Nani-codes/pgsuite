import { Router } from 'express';
import prisma from '../../config/db.js';
import { env } from '../../config/env.js';
import { sendVerification, checkVerification } from '../../config/twilio.js';
import logger from '../../utils/logger.js';
import { z } from 'zod/v4';
import { generateToken } from '../../utils/token.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authRateLimiter } from '../../utils/rateLimit.js';

const router = Router();

const isDevOtp = env.TWILIO_DEV_OTP === 'true';

const sendOtpSchema = z.object({
  phone: z.string().min(10).max(20),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(20),
  otp: z.string().length(6),
});

const registerSchema = z.object({
  phone: z.string().min(10).max(20),
  name: z.string().min(1).max(255),
  email: z.email().optional(),
});

/**
 * POST /v1/auth/send-otp
 * Sends OTP to any phone number. Works for both existing users and new sign-ups.
 */
router.post('/send-otp', authRateLimiter, async (req, res, next) => {
  try {
    const { phone } = sendOtpSchema.parse(req.body);

    if (isDevOtp) {
      logger.info(`[DEV] Skipping Twilio — OTP is 123456 for ${phone}`);
      res.json({ success: true, message: 'OTP sent (dev: use 123456)' });
      return;
    }

    // Send real OTP via Twilio Verify
    const e164Phone = `+91${phone}`;
    const result = await sendVerification(e164Phone);
    logger.info({ sid: result.sid }, `OTP sent to ${e164Phone}`);

    res.json({ success: true, message: 'OTP sent' });
  } catch (err) { next(err); }
});

/**
 * POST /v1/auth/verify-otp
 * Verifies OTP. If user exists, returns token. If new, returns isNewUser=true.
 */
router.post('/verify-otp', authRateLimiter, async (req, res, next) => {
  try {
    const { phone, otp } = verifyOtpSchema.parse(req.body);

    // ─── Verify the OTP ────────────────────────────────────────────
    if (isDevOtp) {
      if (otp !== '123456') {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_OTP', message: 'Invalid OTP' },
        });
        return;
      }
    } else {
      const e164Phone = `+91${phone}`;
      const result = await checkVerification(e164Phone, otp);

      if (!result.valid) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_OTP',
            message: result.status === 'expired'
              ? 'OTP has expired. Please request a new one.'
              : 'Invalid OTP',
          },
        });
        return;
      }
    }

    // ─── OTP valid — look up existing user ────────────────────────
    const owner = await prisma.owner.findFirst({ where: { phone, deletedAt: null } });
    if (owner) {
      res.json({
        success: true,
        data: {
          isNewUser: false,
          accessToken: generateToken({ sub: owner.id, role: 'owner' }),
          user: { id: owner.id, name: owner.name, role: 'owner' },
        },
      });
      return;
    }

    const tenant = await prisma.tenant.findFirst({ where: { phone, deletedAt: null } });
    if (tenant) {
      res.json({
        success: true,
        data: {
          isNewUser: false,
          accessToken: generateToken({ sub: tenant.id, role: 'tenant' }),
          user: { id: tenant.id, name: tenant.name, role: 'tenant' },
        },
      });
      return;
    }

    // ─── New user — OTP verified but no account exists ────────────
    res.json({
      success: true,
      data: {
        isNewUser: true,
        phone,
      },
    });
  } catch (err) { next(err); }
});

/**
 * POST /v1/auth/register
 * Creates a new owner account. Only after OTP has been verified.
 */
router.post('/register', async (req, res, next) => {
  try {
    const { phone, name, email } = registerSchema.parse(req.body);

    // Check if phone already exists (that isn't deleted)
    const existing = await prisma.owner.findFirst({ where: { phone, deletedAt: null } });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'An account with this phone already exists' },
      });
      return;
    }

    const owner = await prisma.owner.create({
      data: { name, phone, email },
    });

    res.status(201).json({
      success: true,
      data: {
        accessToken: generateToken({ sub: owner.id, role: 'owner' }),
        user: { id: owner.id, name: owner.name, role: 'owner' },
      },
    });
  } catch (err) { next(err); }
});

/**
 * GET /v1/auth/me
 * Validates the current session and returns fresh user data.
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { sub: userId, role } = req.user!;

    if (role === 'owner') {
      const owner = await prisma.owner.findFirst({ where: { id: userId, deletedAt: null } });
      if (!owner || !owner.isActive) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid session' },
        });
        return;
      }
      res.json({
        success: true,
        data: { id: owner.id, name: owner.name, phone: owner.phone, email: owner.email, role: 'owner', plan: owner.plan },
      });
      return;
    }

    if (role === 'tenant') {
      const tenant = await prisma.tenant.findFirst({ where: { id: userId, deletedAt: null } });
      if (!tenant || tenant.status !== 'active') {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid session' },
        });
        return;
      }
      res.json({
        success: true,
        data: { id: tenant.id, name: tenant.name, phone: tenant.phone, email: tenant.email, role: 'tenant' },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid role' },
    });
  } catch (err) { next(err); }
});

export default router;

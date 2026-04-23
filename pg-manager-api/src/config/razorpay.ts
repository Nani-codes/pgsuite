import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from './env.js';
import logger from '../utils/logger.js';

const isDevBypass = env.RAZORPAY_DEV_BYPASS === 'true';

let razorpayInstance: Razorpay | null = null;

function getInstance(): Razorpay {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

// ─── Create Razorpay Order ──────────────────────────────────────────

export interface CreateOrderInput {
  amount: number; // in rupees (will be converted to paise)
  currency?: string;
  receipt: string; // e.g. invoice number
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  amount: number; // in paise
  currency: string;
  receipt: string;
  status: string;
}

export async function createRazorpayOrder(input: CreateOrderInput): Promise<RazorpayOrder> {
  if (isDevBypass) {
    const mockOrderId = `order_dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    logger.info({ mockOrderId }, '[Razorpay DEV] Created mock order');
    return {
      id: mockOrderId,
      amount: Math.round(input.amount * 100),
      currency: input.currency || 'INR',
      receipt: input.receipt,
      status: 'created',
    };
  }

  const razorpay = getInstance();
  const order = await razorpay.orders.create({
    amount: Math.round(input.amount * 100), // Convert to paise
    currency: input.currency || 'INR',
    receipt: input.receipt,
    notes: input.notes || {},
  });

  logger.info({ orderId: order.id }, '[Razorpay] Order created');
  return order as unknown as RazorpayOrder;
}

// ─── Verify Payment Signature ───────────────────────────────────────

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export function verifyPaymentSignature(input: VerifyPaymentInput): boolean {
  if (isDevBypass) {
    logger.info('[Razorpay DEV] Signature verification bypassed');
    return true;
  }

  const body = `${input.razorpay_order_id}|${input.razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return expectedSignature === input.razorpay_signature;
}

// ─── Get public key for client ──────────────────────────────────────

export function getRazorpayKeyId(): string {
  return isDevBypass ? 'rzp_dev_bypass' : env.RAZORPAY_KEY_ID;
}

import { Router } from 'express';
import { z } from 'zod/v4';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import prisma from '../../config/db.js';
import { getPaginationParams, getPaginationMeta } from '../../utils/pagination.js';
import {
  applyPayment,
  generateInvoiceForLease,
  getAgingReport,
  getReconciliationReport,
  getReceiptByPaymentId,
  getReceiptById,
} from './billing.service.js';
import { createRazorpayOrder, verifyPaymentSignature, getRazorpayKeyId } from '../../config/razorpay.js';
import { generateReceiptPdf } from './receiptPdf.js';

const router = Router();

router.use(authenticate);

// ─── Validation Schemas ─────────────────────────────────────────────

const createPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['upi', 'cash', 'bank_transfer', 'card', 'other']),
  referenceNo: z.string().optional(),
  collectedBy: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

const createInvoiceSchema = z.object({
  tenantId: z.string().uuid(),
  propertyId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  dueDate: z.string(),
  items: z.array(z.object({
    description: z.string(),
    amount: z.number().positive(),
    type: z.enum(['rent', 'late_fee', 'utility', 'maintenance', 'other']).optional(),
  })),
});

const lateFeeSchema = z.object({
  leaseId: z.string().uuid(),
  graceDays: z.number().int().min(0).default(5),
  feeType: z.enum(['fixed', 'percentage']),
  feeAmount: z.number().positive(),
  maxFee: z.number().positive().optional(),
});

const tenantPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['upi', 'cash', 'bank_transfer', 'card', 'other']),
});

// ─── Invoice Endpoints ──────────────────────────────────────────────

router.get('/invoices', async (req, res, next) => {
  try {
    const { skip, take, page, limit } = getPaginationParams(req.query);
    const where = req.user!.role === 'tenant'
      ? { tenantId: req.user!.sub }
      : { property: { ownerId: req.user!.sub } };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take,
        include: { tenant: true, items: true, payments: { include: { receipt: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json({ success: true, data: invoices, meta: getPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
});

router.get('/invoices/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const where = req.user!.role === 'tenant'
      ? { id, tenantId: req.user!.sub }
      : { id, property: { ownerId: req.user!.sub } };

    const invoice = await prisma.invoice.findFirst({
      where,
      include: { tenant: true, items: true, payments: { include: { receipt: true } }, lease: true },
    });
    if (!invoice) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
      return;
    }
    res.json({ success: true, data: invoice });
  } catch (err) { next(err); }
});

router.get('/invoices/tenant/:tenantId', async (req, res, next) => {
  try {
    const tenantId = req.params.tenantId as string;
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        property: { ownerId: req.user!.sub },
      },
      include: { payments: { include: { receipt: true } }, items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: invoices });
  } catch (err) { next(err); }
});

router.post('/invoices', authorize('owner'), async (req, res, next) => {
  try {
    const data = createInvoiceSchema.parse(req.body);
    const tenant = await prisma.tenant.findFirst({
      where: { id: data.tenantId, ownerId: req.user!.sub },
    });
    if (!tenant) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
      return;
    }

    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, '0')}`;

    const lease = await prisma.lease.findFirst({
      where: { tenantId: data.tenantId, status: 'active' },
    });

    const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);

    const invoice = await prisma.invoice.create({
      data: {
        leaseId: lease?.id || '',
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        invoiceNumber,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        dueDate: new Date(data.dueDate),
        subtotal,
        total: subtotal,
        status: 'sent',
        items: {
          create: data.items.map((item) => ({
            type: item.type ?? 'other',
            description: item.description,
            amount: item.amount,
          })),
        },
      },
      include: { items: true, tenant: true },
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (err) { next(err); }
});

router.post('/invoices/generate', authorize('owner'), async (req, res, next) => {
  try {
    const { leaseId, year, month } = z.object({
      leaseId: z.string().uuid(),
      year: z.number().int(),
      month: z.number().int().min(0).max(11),
    }).parse(req.body);

    const lease = await prisma.lease.findFirst({
      where: { id: leaseId, property: { ownerId: req.user!.sub } },
    });
    if (!lease) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lease not found' } });
      return;
    }

    const invoice = await generateInvoiceForLease({ leaseId, year, month });
    res.status(201).json({ success: true, data: invoice });
  } catch (err) { next(err); }
});

// ─── Payment Endpoints ──────────────────────────────────────────────

router.post('/payments', authorize('owner'), async (req, res, next) => {
  try {
    const data = createPaymentSchema.parse(req.body);
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, property: { ownerId: req.user!.sub } },
    });
    if (!invoice) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
      return;
    }

    const result = await applyPayment({
      invoiceId: data.invoiceId,
      tenantId: invoice.tenantId,
      amount: data.amount,
      method: data.method,
      referenceNo: data.referenceNo,
      collectedBy: data.collectedBy,
      idempotencyKey: data.idempotencyKey,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/payments/tenant', authorize('tenant'), async (req, res, next) => {
  try {
    const data = tenantPaymentSchema.parse(req.body);
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, tenantId: req.user!.sub },
    });
    if (!invoice) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
      return;
    }

    const result = await applyPayment({
      invoiceId: data.invoiceId,
      tenantId: req.user!.sub,
      amount: data.amount,
      method: data.method,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── Razorpay Payment Flow (Tenant) ─────────────────────────────────

/**
 * POST /billing/payments/tenant/create-order
 * Creates a Razorpay order for the given invoice. Returns order details
 * that the mobile app uses to open the Razorpay checkout.
 */
router.post('/payments/tenant/create-order', authorize('tenant'), async (req, res, next) => {
  try {
    const { invoiceId } = z.object({
      invoiceId: z.string().uuid(),
    }).parse(req.body);

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: req.user!.sub },
      include: { payments: { where: { status: 'success' } } },
    });
    if (!invoice) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
      return;
    }
    if (invoice.status === 'paid') {
      res.status(409).json({ success: false, error: { code: 'ALREADY_PAID', message: 'Invoice is already fully paid' } });
      return;
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const outstanding = Number(invoice.total) - totalPaid;

    const order = await createRazorpayOrder({
      amount: outstanding,
      receipt: invoice.invoiceNumber,
      notes: {
        invoiceId: invoice.id,
        tenantId: req.user!.sub,
      },
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: outstanding,
        amountInPaise: order.amount,
        currency: order.currency,
        keyId: getRazorpayKeyId(),
        invoiceNumber: invoice.invoiceNumber,
      },
    });
  } catch (err) { next(err); }
});

/**
 * POST /billing/payments/tenant/verify
 * Verifies Razorpay payment signature and records the payment.
 */
router.post('/payments/tenant/verify', authorize('tenant'), async (req, res, next) => {
  try {
    const data = z.object({
      invoiceId: z.string().uuid(),
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    }).parse(req.body);

    // Verify signature
    const isValid = verifyPaymentSignature({
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_signature: data.razorpay_signature,
    });

    if (!isValid) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Payment signature verification failed' },
      });
      return;
    }

    // Find invoice and calculate outstanding
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, tenantId: req.user!.sub },
      include: { payments: { where: { status: 'success' } } },
    });
    if (!invoice) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
      return;
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const outstanding = Number(invoice.total) - totalPaid;

    // Record payment
    const result = await applyPayment({
      invoiceId: data.invoiceId,
      tenantId: req.user!.sub,
      amount: outstanding,
      method: 'upi', // Razorpay handles the actual method
      referenceNo: data.razorpay_payment_id,
      idempotencyKey: `razorpay:${data.razorpay_payment_id}`,
    });

    // Store Razorpay IDs on the payment record
    await prisma.payment.update({
      where: { id: result.id },
      data: {
        razorpayPaymentId: data.razorpay_payment_id,
        razorpayOrderId: data.razorpay_order_id,
      },
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── Receipt Endpoints ──────────────────────────────────────────────

router.get('/receipts/:id', async (req, res, next) => {
  try {
    const receipt = await getReceiptById(req.params.id as string);
    if (!receipt) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Receipt not found' } });
      return;
    }
    res.json({ success: true, data: receipt });
  } catch (err) { next(err); }
});

router.get('/payments/:paymentId/receipt', async (req, res, next) => {
  try {
    const receipt = await getReceiptByPaymentId(req.params.paymentId as string);
    if (!receipt) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Receipt not found' } });
      return;
    }
    res.json({ success: true, data: receipt });
  } catch (err) { next(err); }
});

// ─── PDF Receipt Downloads ──────────────────────────────────────────

router.get('/receipts/:id/pdf', async (req, res, next) => {
  try {
    const receipt = await getReceiptById(req.params.id as string);
    if (!receipt) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Receipt not found' } });
      return;
    }

    const pdfBuffer = await generateReceiptPdf(receipt as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt.receiptNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

router.get('/payments/:paymentId/receipt/pdf', async (req, res, next) => {
  try {
    const receipt = await getReceiptByPaymentId(req.params.paymentId as string);
    if (!receipt) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Receipt not found' } });
      return;
    }

    const pdfBuffer = await generateReceiptPdf(receipt as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt.receiptNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// ─── Late Fee Policy ────────────────────────────────────────────────

router.post('/late-fee-policies', authorize('owner'), async (req, res, next) => {
  try {
    const data = lateFeeSchema.parse(req.body);
    const lease = await prisma.lease.findFirst({
      where: { id: data.leaseId, property: { ownerId: req.user!.sub } },
    });
    if (!lease) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lease not found' } });
      return;
    }

    const policy = await prisma.lateFeePolicy.upsert({
      where: { leaseId: data.leaseId },
      update: {
        graceDays: data.graceDays,
        feeType: data.feeType,
        feeAmount: data.feeAmount,
        maxFee: data.maxFee,
      },
      create: {
        leaseId: data.leaseId,
        graceDays: data.graceDays,
        feeType: data.feeType,
        feeAmount: data.feeAmount,
        maxFee: data.maxFee,
      },
    });

    res.status(201).json({ success: true, data: policy });
  } catch (err) { next(err); }
});

router.get('/late-fee-policies/:leaseId', authorize('owner'), async (req, res, next) => {
  try {
    const leaseId = req.params.leaseId as string;
    const policy = await prisma.lateFeePolicy.findUnique({ where: { leaseId } });
    if (!policy) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' } });
      return;
    }
    res.json({ success: true, data: policy });
  } catch (err) { next(err); }
});

// ─── Aging Report ───────────────────────────────────────────────────

router.get('/reports/aging', authorize('owner'), async (req, res, next) => {
  try {
    const buckets = await getAgingReport(req.user!.sub);
    res.json({ success: true, data: buckets });
  } catch (err) { next(err); }
});

// ─── Reconciliation Report ──────────────────────────────────────────

router.get('/reports/reconciliation', authorize('owner'), async (req, res, next) => {
  try {
    const { startDate, endDate } = z.object({
      startDate: z.string(),
      endDate: z.string(),
    }).parse(req.query);

    const report = await getReconciliationReport(
      req.user!.sub,
      new Date(startDate),
      new Date(endDate),
    );
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// ─── Billing Tenants (unchanged) ────────────────────────────────────

router.get('/tenants', async (req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { ownerId: req.user!.sub, status: 'active' },
      include: {
        leases: { where: { status: 'active' }, include: { property: true } },
      },
    });
    res.json({ success: true, data: tenants });
  } catch (err) { next(err); }
});

// ─── Send Reminder ──────────────────────────────────────────────────

router.post('/reminders', authorize('owner'), async (req, res, next) => {
  try {
    const { tenantId, invoiceId } = z.object({
      tenantId: z.string().uuid(),
      invoiceId: z.string().uuid().optional(),
    }).parse(req.body);

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, ownerId: req.user!.sub },
    });
    if (!tenant) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
      return;
    }

    let message = `Hi ${tenant.name}, this is a reminder about your pending rent payment.`;

    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (invoice) {
        message = `Hi ${tenant.name}, your invoice ${invoice.invoiceNumber} of ₹${Number(invoice.total).toLocaleString()} is due on ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}. Please make the payment at the earliest.`;
      }
    }

    const notification = await prisma.notification.create({
      data: {
        tenantId,
        type: 'rent_reminder',
        channel: 'push',
        message,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    res.status(201).json({ success: true, data: notification });
  } catch (err) { next(err); }
});

export default router;

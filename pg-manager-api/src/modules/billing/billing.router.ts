import { Router } from 'express';
import { z } from 'zod/v4';
import { authenticate } from '../../middleware/authenticate.js';
import prisma from '../../config/db.js';

const router = Router();

router.use(authenticate);

const createPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['upi', 'cash', 'bank_transfer', 'card', 'other']),
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
  })),
});

router.get('/invoices', async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        property: { ownerId: req.user!.sub },
      },
      include: { tenant: true, items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: invoices });
  } catch (err) { next(err); }
});

router.get('/invoices/:id', async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        property: { ownerId: req.user!.sub },
      },
      include: { tenant: true, items: true, payments: true, lease: true },
    });
    if (!invoice) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
      return;
    }
    res.json({ success: true, data: invoice });
  } catch (err) { next(err); }
});

router.post('/payments', async (req, res, next) => {
  try {
    const data = createPaymentSchema.parse(req.body);
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, property: { ownerId: req.user!.sub } },
    });
    if (!invoice) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        tenantId: invoice.tenantId,
        amount: data.amount,
        method: data.method,
        status: 'success',
        paidAt: new Date(),
      },
    });

    const payments = await prisma.payment.findMany({ where: { invoiceId: data.invoiceId } });
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const invoiceTotal = Number(invoice.total);

    let status: 'paid' | 'partially_paid' | 'overdue' = 'paid';
    if (totalPaid >= invoiceTotal) status = 'paid';
    else if (totalPaid > 0) status = 'partially_paid';
    else status = 'overdue';

    await prisma.invoice.update({
      where: { id: data.invoiceId },
      data: { status },
    });

    res.status(201).json({ success: true, data: payment });
  } catch (err) { next(err); }
});

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

router.get('/invoices/tenant/:tenantId', async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: req.params.tenantId,
        property: { ownerId: req.user!.sub },
      },
      include: { payments: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: invoices });
  } catch (err) { next(err); }
});

router.post('/invoices', async (req, res, next) => {
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

    const invoice = await prisma.invoice.create({
      data: {
        leaseId: lease?.id || '',
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        invoiceNumber,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        dueDate: new Date(data.dueDate),
        subtotal: data.items.reduce((sum, item) => sum + item.amount, 0),
        total: data.items.reduce((sum, item) => sum + item.amount, 0),
        status: 'sent',
        items: {
          create: data.items.map((item) => ({
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

export default router;

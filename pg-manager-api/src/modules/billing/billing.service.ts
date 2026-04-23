import prisma from '../../config/db.js';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js';
import { sendPushNotification } from '../../config/pushService.js';
import logger from '../../utils/logger.js';
import type { PaymentMethod, InvoiceStatus } from '@prisma/client';

// ─── Invoice Generation ─────────────────────────────────────────────

export interface GenerateInvoiceInput {
  leaseId: string;
  year: number;
  month: number; // 0-indexed (JS Date convention)
}

export async function generateInvoiceForLease({ leaseId, year, month }: GenerateInvoiceInput) {
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: { lateFeePolicy: true },
  });
  if (!lease || lease.status !== 'active') {
    throw new NotFoundError('Active lease not found');
  }

  const idempotencyKey = `lease:${leaseId}:${year}-${String(month + 1).padStart(2, '0')}`;

  const existing = await prisma.invoice.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;

  const periodStart = new Date(year, month, 1);
  const periodEnd = new Date(year, month + 1, 0);
  const dueDate = new Date(year, month, Math.min(lease.billingDay, periodEnd.getDate()));

  const invoiceCount = await prisma.invoice.count();
  const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, '0')}`;
  const rentAmount = Number(lease.rentAmount);

  const invoice = await prisma.invoice.create({
    data: {
      leaseId: lease.id,
      tenantId: lease.tenantId,
      propertyId: lease.propertyId,
      invoiceNumber,
      periodStart,
      periodEnd,
      dueDate,
      subtotal: rentAmount,
      total: rentAmount,
      status: 'sent',
      idempotencyKey,
      items: {
        create: [{ type: 'rent', description: 'Monthly Rent', amount: rentAmount }],
      },
    },
    include: { items: true },
  });

  return invoice;
}

// ─── Payment Application ────────────────────────────────────────────

export interface ApplyPaymentInput {
  invoiceId: string;
  tenantId: string;
  amount: number;
  method: PaymentMethod;
  referenceNo?: string;
  collectedBy?: string;
  idempotencyKey?: string;
}

export async function applyPayment(input: ApplyPaymentInput) {
  if (input.idempotencyKey) {
    const existing = await prisma.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { receipt: true },
    });
    if (existing) return existing;
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { payments: { where: { status: 'success' } } },
  });
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (invoice.status === 'paid') throw new ConflictError('Invoice is already fully paid');

  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const invoiceTotal = Number(invoice.total);
  const remaining = invoiceTotal - totalPaid;

  if (input.amount <= 0) throw new ValidationError('Payment amount must be positive');
  if (input.amount > remaining + 0.01) {
    throw new ValidationError(`Payment amount exceeds remaining balance of ${remaining.toFixed(2)}`);
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId: input.invoiceId,
      tenantId: input.tenantId,
      amount: input.amount,
      method: input.method,
      status: 'success',
      referenceNo: input.referenceNo,
      collectedBy: input.collectedBy,
      idempotencyKey: input.idempotencyKey,
      paidAt: new Date(),
    },
  });

  const newTotalPaid = totalPaid + input.amount;
  let status: InvoiceStatus = 'partially_paid';
  if (newTotalPaid >= invoiceTotal) status = 'paid';

  await prisma.invoice.update({
    where: { id: input.invoiceId },
    data: { status },
  });

  const receipt = await issueReceipt(payment.id, input.amount);

  // ─── Payment confirmation notification (Gap 3) ────────────────
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { name: true, expoPushToken: true },
    });

    const message = `Hi ${tenant?.name ?? 'Tenant'}, your payment of ₹${Number(input.amount).toLocaleString()} has been received. Receipt: ${receipt.receiptNumber}`;

    const notification = await prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        type: 'payment_success',
        channel: 'push',
        message,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    // Send real push if token exists
    if (tenant?.expoPushToken) {
      const pushed = await sendPushNotification(
        tenant.expoPushToken,
        'Payment Successful ✅',
        message,
        { type: 'payment_success', notificationId: notification.id, receiptId: receipt.id },
      );
      if (pushed) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'delivered' },
        });
      }
    }
  } catch (err) {
    // Non-critical: don't fail the payment if notification fails
    logger.error({ err }, '[Billing] Failed to send payment confirmation notification');
  }

  return { ...payment, receipt };
}

// ─── Receipt Issuance ───────────────────────────────────────────────

export async function issueReceipt(paymentId: string, amount: number) {
  const receiptCount = await prisma.receipt.count();
  const receiptNumber = `RCT-${String(receiptCount + 1).padStart(5, '0')}`;

  return prisma.receipt.create({
    data: {
      paymentId,
      receiptNumber,
      amount,
      issuedAt: new Date(),
    },
  });
}

// ─── Late Fee Calculation ───────────────────────────────────────────

export async function applyLateFees() {
  const now = new Date();
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['sent', 'partially_paid'] },
      dueDate: { lt: now },
    },
    include: {
      lease: { include: { lateFeePolicy: true } },
      items: true,
    },
  });

  const results: { invoiceId: string; feeApplied: number }[] = [];

  for (const invoice of overdueInvoices) {
    const policy = invoice.lease?.lateFeePolicy;
    if (!policy || !policy.isActive) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'overdue' },
      });
      continue;
    }

    const daysPastDue = Math.floor(
      (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysPastDue <= policy.graceDays) {
      continue;
    }

    const hasLateFeeItem = invoice.items.some((item) => item.type === 'late_fee');
    if (hasLateFeeItem) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'overdue' },
      });
      continue;
    }

    const rentAmount = Number(invoice.subtotal);
    let fee: number;
    if (policy.feeType === 'percentage') {
      fee = (rentAmount * Number(policy.feeAmount)) / 100;
    } else {
      fee = Number(policy.feeAmount);
    }

    if (policy.maxFee) {
      fee = Math.min(fee, Number(policy.maxFee));
    }

    await prisma.$transaction([
      prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          type: 'late_fee',
          description: `Late fee (${daysPastDue} days overdue)`,
          amount: fee,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          total: Number(invoice.total) + fee,
          status: 'overdue',
        },
      }),
    ]);

    results.push({ invoiceId: invoice.id, feeApplied: fee });
  }

  return results;
}

// ─── Aging Buckets ──────────────────────────────────────────────────

export interface AgingBucket {
  bucket: string;
  count: number;
  totalAmount: number;
  invoices: {
    id: string;
    invoiceNumber: string;
    tenantName: string;
    total: number;
    dueDate: string;
    daysOverdue: number;
  }[];
}

export async function getAgingReport(ownerId: string): Promise<AgingBucket[]> {
  const now = new Date();
  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      property: { ownerId },
      status: { in: ['sent', 'partially_paid', 'overdue'] },
    },
    include: {
      tenant: { select: { name: true } },
      payments: { where: { status: 'success' } },
    },
    orderBy: { dueDate: 'asc' },
  });

  const buckets: Record<string, AgingBucket> = {
    'current': { bucket: 'Current (not yet due)', count: 0, totalAmount: 0, invoices: [] },
    '1-30': { bucket: '1-30 days', count: 0, totalAmount: 0, invoices: [] },
    '31-60': { bucket: '31-60 days', count: 0, totalAmount: 0, invoices: [] },
    '61-90': { bucket: '61-90 days', count: 0, totalAmount: 0, invoices: [] },
    '90+': { bucket: '90+ days', count: 0, totalAmount: 0, invoices: [] },
  };

  for (const inv of unpaidInvoices) {
    const paidAmount = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const outstanding = Number(inv.total) - paidAmount;
    if (outstanding <= 0) continue;

    const dueDate = new Date(inv.dueDate);
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    let key: string;
    if (daysOverdue <= 0) key = 'current';
    else if (daysOverdue <= 30) key = '1-30';
    else if (daysOverdue <= 60) key = '31-60';
    else if (daysOverdue <= 90) key = '61-90';
    else key = '90+';

    buckets[key].count++;
    buckets[key].totalAmount += outstanding;
    buckets[key].invoices.push({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      tenantName: inv.tenant?.name ?? 'Unknown',
      total: outstanding,
      dueDate: inv.dueDate.toISOString(),
      daysOverdue,
    });
  }

  return Object.values(buckets);
}

// ─── Reconciliation Report ──────────────────────────────────────────

export interface ReconciliationRow {
  date: string;
  expected: number;
  collected: number;
  shortfall: number;
  byMethod: Record<string, number>;
}

export async function getReconciliationReport(
  ownerId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  summary: { totalExpected: number; totalCollected: number; totalShortfall: number };
  byMethod: Record<string, number>;
  daily: ReconciliationRow[];
}> {
  const invoices = await prisma.invoice.findMany({
    where: {
      property: { ownerId },
      dueDate: { gte: startDate, lte: endDate },
    },
    include: {
      payments: { where: { status: 'success' } },
    },
  });

  let totalExpected = 0;
  let totalCollected = 0;
  const byMethod: Record<string, number> = {};
  const dailyMap: Record<string, ReconciliationRow> = {};

  for (const inv of invoices) {
    totalExpected += Number(inv.total);

    for (const payment of inv.payments) {
      const amount = Number(payment.amount);
      totalCollected += amount;
      byMethod[payment.method] = (byMethod[payment.method] || 0) + amount;

      if (payment.paidAt) {
        const dateKey = payment.paidAt.toISOString().split('T')[0];
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { date: dateKey, expected: 0, collected: 0, shortfall: 0, byMethod: {} };
        }
        dailyMap[dateKey].collected += amount;
        dailyMap[dateKey].byMethod[payment.method] = (dailyMap[dateKey].byMethod[payment.method] || 0) + amount;
      }
    }

    const dueDateKey = new Date(inv.dueDate).toISOString().split('T')[0];
    if (!dailyMap[dueDateKey]) {
      dailyMap[dueDateKey] = { date: dueDateKey, expected: 0, collected: 0, shortfall: 0, byMethod: {} };
    }
    dailyMap[dueDateKey].expected += Number(inv.total);
  }

  const daily = Object.values(dailyMap)
    .map((row) => ({ ...row, shortfall: row.expected - row.collected }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    summary: {
      totalExpected,
      totalCollected,
      totalShortfall: totalExpected - totalCollected,
    },
    byMethod,
    daily,
  };
}

// ─── Mark Overdue ───────────────────────────────────────────────────

export async function markOverdueInvoices() {
  const now = new Date();
  const result = await prisma.invoice.updateMany({
    where: {
      status: { in: ['sent', 'partially_paid'] },
      dueDate: { lt: now },
    },
    data: { status: 'overdue' },
  });
  return result.count;
}

// ─── Get Receipt ────────────────────────────────────────────────────

export async function getReceiptByPaymentId(paymentId: string) {
  return prisma.receipt.findUnique({
    where: { paymentId },
    include: {
      payment: {
        include: {
          invoice: {
            include: {
              tenant: { select: { name: true, phone: true, email: true } },
              property: { select: { name: true, address: true } },
            },
          },
        },
      },
    },
  });
}

export async function getReceiptById(receiptId: string) {
  return prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      payment: {
        include: {
          invoice: {
            include: {
              tenant: { select: { name: true, phone: true, email: true } },
              property: { select: { name: true, address: true } },
            },
          },
        },
      },
    },
  });
}

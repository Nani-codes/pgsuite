import cron from 'node-cron';
import logger from '../../utils/logger.js';
import prisma from '../../config/db.js';
import {
  generateInvoiceForLease,
  applyLateFees,
  markOverdueInvoices,
} from '../billing/billing.service.js';
import { sendPushNotification } from '../../config/pushService.js';

/**
 * Monthly invoice generation: runs on the 1st of every month at 6:00 AM.
 * Creates invoices for all active leases for the current month.
 */
async function runMonthlyInvoiceGeneration() {
  logger.info('[Scheduler] Starting monthly invoice generation');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  try {
    const activeLeases = await prisma.lease.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    let generated = 0;
    let skipped = 0;

    for (const lease of activeLeases) {
      try {
        await generateInvoiceForLease({ leaseId: lease.id, year, month });
        generated++;
      } catch (err: unknown) {
        if ((err as { code?: string }).code === 'CONFLICT') {
          skipped++;
        } else {
          logger.error({ leaseId: lease.id, err: (err as Error).message }, '[Scheduler] Failed to generate invoice');
        }
      }
    }

    logger.info({ generated, skipped, total: activeLeases.length },
      '[Scheduler] Monthly invoice generation complete');
  } catch (err) {
    logger.error({ err }, '[Scheduler] Monthly invoice generation failed');
  }
}

/**
 * Daily overdue check: runs every day at 8:00 AM.
 * Marks past-due invoices as overdue and applies late fees.
 */
async function runDailyOverdueCheck() {
  logger.info('[Scheduler] Starting daily overdue check');
  try {
    const overdueCount = await markOverdueInvoices();
    logger.info({ overdueCount }, '[Scheduler] Marked invoices as overdue');

    const lateFeeResults = await applyLateFees();
    logger.info({ feesApplied: lateFeeResults.length }, '[Scheduler] Late fees applied');
  } catch (err) {
    logger.error({ err }, '[Scheduler] Daily overdue check failed');
  }
}

/**
 * Reminder dispatch: runs every day at 9:00 AM.
 * Sends reminders for invoices due within 3 days, due today, or overdue.
 * Now sends real push notifications via Expo Push API.
 */
async function runReminderDispatch() {
  logger.info('[Scheduler] Starting reminder dispatch');
  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  let pushSent = 0;

  try {
    // ─── Upcoming invoices (due within 3 days) ────────────────────
    const upcomingInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['sent', 'partially_paid'] },
        dueDate: { gte: now, lte: threeDaysFromNow },
      },
      include: { tenant: { select: { name: true, expoPushToken: true } } },
    });

    for (const invoice of upcomingInvoices) {
      const alreadySent = await prisma.notification.findFirst({
        where: {
          tenantId: invoice.tenantId,
          type: 'rent_reminder',
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        },
      });

      if (!alreadySent) {
        const message = `Hi ${invoice.tenant?.name}, your invoice ${invoice.invoiceNumber} of ₹${Number(invoice.total).toLocaleString()} is due on ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}. Please pay on time.`;

        const notification = await prisma.notification.create({
          data: {
            tenantId: invoice.tenantId,
            type: 'rent_reminder',
            channel: 'push',
            message,
            status: 'sent',
            sentAt: new Date(),
          },
        });

        // Send real push notification
        if (invoice.tenant?.expoPushToken) {
          const pushed = await sendPushNotification(
            invoice.tenant.expoPushToken,
            'Rent Due Soon 📅',
            message,
            { type: 'rent_reminder', notificationId: notification.id, invoiceId: invoice.id },
          );
          if (pushed) {
            pushSent++;
            await prisma.notification.update({
              where: { id: notification.id },
              data: { status: 'delivered' },
            });
          }
        }
      }
    }

    // ─── Overdue invoices ─────────────────────────────────────────
    const overdueInvoices = await prisma.invoice.findMany({
      where: { status: 'overdue' },
      include: { tenant: { select: { name: true, expoPushToken: true } } },
    });

    for (const invoice of overdueInvoices) {
      const alreadySent = await prisma.notification.findFirst({
        where: {
          tenantId: invoice.tenantId,
          type: 'overdue_notice',
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        },
      });

      if (!alreadySent) {
        const daysPast = Math.floor(
          (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
        );

        const message = `Hi ${invoice.tenant?.name}, your invoice ${invoice.invoiceNumber} of ₹${Number(invoice.total).toLocaleString()} is overdue by ${daysPast} day(s). Please clear the dues immediately to avoid late fees.`;

        const notification = await prisma.notification.create({
          data: {
            tenantId: invoice.tenantId,
            type: 'overdue_notice',
            channel: 'push',
            message,
            status: 'sent',
            sentAt: new Date(),
          },
        });

        // Send real push notification
        if (invoice.tenant?.expoPushToken) {
          const pushed = await sendPushNotification(
            invoice.tenant.expoPushToken,
            'Payment Overdue ⚠️',
            message,
            { type: 'overdue_notice', notificationId: notification.id, invoiceId: invoice.id },
          );
          if (pushed) {
            pushSent++;
            await prisma.notification.update({
              where: { id: notification.id },
              data: { status: 'delivered' },
            });
          }
        }
      }
    }

    logger.info({
      upcomingReminders: upcomingInvoices.length,
      overdueReminders: overdueInvoices.length,
      pushSent,
    }, '[Scheduler] Reminder dispatch complete');
  } catch (err) {
    logger.error({ err }, '[Scheduler] Reminder dispatch failed');
  }
}

export function startScheduler() {
  if (process.env.NODE_ENV === 'test') return;

  logger.info('[Scheduler] Initializing scheduled jobs');

  // 1st of every month at 6:00 AM
  cron.schedule('0 6 1 * *', runMonthlyInvoiceGeneration);

  // Every day at 8:00 AM
  cron.schedule('0 8 * * *', runDailyOverdueCheck);

  // Every day at 9:00 AM
  cron.schedule('0 9 * * *', runReminderDispatch);

  logger.info('[Scheduler] Jobs scheduled: monthly-invoices, daily-overdue, daily-reminders');
}

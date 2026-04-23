import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRouter from './modules/auth/auth.router.js';
import propertyRouter from './modules/property/property.router.js';
import tenantRouter from './modules/tenant/tenant.router.js';
import billingRouter from './modules/billing/billing.router.js';
import expenseRouter from './modules/expense/expense.router.js';
import complaintRouter from './modules/complaint/complaint.router.js';
import notificationRouter from './modules/notification/notification.router.js';
import analyticsRouter from './modules/analytics/analytics.router.js';
import ownerRouter from './modules/owner/owner.router.js';
import noticeRouter from './modules/notice/notice.router.js';
import bookingRouter from './modules/booking/booking.router.js';
import leadRouter from './modules/lead/lead.router.js';
import duesPackageRouter from './modules/dues-package/dues-package.router.js';
import { startScheduler } from './modules/scheduler/scheduler.js';

const app = express();

// Allow proxy headers (X-Forwarded-For) so rate limiting uses real client IPs
// when app is accessed through a reverse proxy/load balancer.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/v1/auth', authRouter);
app.use('/v1/properties', propertyRouter);
app.use('/v1/tenants', tenantRouter);
app.use('/v1/billing', billingRouter);
app.use('/v1/expenses', expenseRouter);
app.use('/v1/complaints', complaintRouter);
app.use('/v1/notifications', notificationRouter);
app.use('/v1/analytics', analyticsRouter);
app.use('/v1/owners', ownerRouter);
app.use('/v1/notices', noticeRouter);
app.use('/v1/bookings', bookingRouter);
app.use('/v1/leads', leadRouter);
app.use('/v1/dues-packages', duesPackageRouter);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const host = '0.0.0.0';
  app.listen(env.PORT, host, () => {
    logger.info(`Server running on http://${host}:${env.PORT} in ${env.NODE_ENV} mode`);
    startScheduler();
  });
}

export default app;

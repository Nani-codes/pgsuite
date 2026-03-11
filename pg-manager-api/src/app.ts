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
import complaintRouter from './modules/complaint/complaint.router.js';
import notificationRouter from './modules/notification/notification.router.js';
import analyticsRouter from './modules/analytics/analytics.router.js';

const app = express();

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
app.use('/v1/complaints', complaintRouter);
app.use('/v1/notifications', notificationRouter);
app.use('/v1/analytics', analyticsRouter);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });
}

export default app;

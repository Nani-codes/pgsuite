import request from 'supertest';
import app from '../../src/app.js';

describe('Billing endpoints', () => {
  describe('Authentication', () => {
    it('GET /v1/billing/invoices returns 401 without auth', async () => {
      const res = await request(app).get('/v1/billing/invoices');
      expect(res.status).toBe(401);
    });

    it('POST /v1/billing/payments returns 401 without auth', async () => {
      const res = await request(app)
        .post('/v1/billing/payments')
        .send({ invoiceId: '00000000-0000-0000-0000-000000000000', amount: 100, method: 'cash' });
      expect(res.status).toBe(401);
    });

    it('POST /v1/billing/payments/tenant returns 401 without auth', async () => {
      const res = await request(app)
        .post('/v1/billing/payments/tenant')
        .send({ invoiceId: '00000000-0000-0000-0000-000000000000', amount: 100, method: 'upi' });
      expect(res.status).toBe(401);
    });
  });

  describe('Report endpoints', () => {
    it('GET /v1/billing/reports/aging returns 401 without auth', async () => {
      const res = await request(app).get('/v1/billing/reports/aging');
      expect(res.status).toBe(401);
    });

    it('GET /v1/billing/reports/reconciliation returns 401 without auth', async () => {
      const res = await request(app)
        .get('/v1/billing/reports/reconciliation')
        .query({ startDate: '2026-01-01', endDate: '2026-03-31' });
      expect(res.status).toBe(401);
    });
  });

  describe('Receipt endpoints', () => {
    it('GET /v1/billing/receipts/:id returns 401 without auth', async () => {
      const res = await request(app).get('/v1/billing/receipts/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(401);
    });

    it('GET /v1/billing/payments/:id/receipt returns 401 without auth', async () => {
      const res = await request(app)
        .get('/v1/billing/payments/00000000-0000-0000-0000-000000000000/receipt');
      expect(res.status).toBe(401);
    });
  });

  describe('Late fee policy', () => {
    it('POST /v1/billing/late-fee-policies returns 401 without auth', async () => {
      const res = await request(app)
        .post('/v1/billing/late-fee-policies')
        .send({
          leaseId: '00000000-0000-0000-0000-000000000000',
          graceDays: 5,
          feeType: 'fixed',
          feeAmount: 500,
        });
      expect(res.status).toBe(401);
    });
  });

  describe('Reminder endpoint', () => {
    it('POST /v1/billing/reminders returns 401 without auth', async () => {
      const res = await request(app)
        .post('/v1/billing/reminders')
        .send({ tenantId: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(401);
    });
  });

  describe('Invoice generation', () => {
    it('POST /v1/billing/invoices/generate returns 401 without auth', async () => {
      const res = await request(app)
        .post('/v1/billing/invoices/generate')
        .send({
          leaseId: '00000000-0000-0000-0000-000000000000',
          year: 2026,
          month: 2,
        });
      expect(res.status).toBe(401);
    });
  });
});

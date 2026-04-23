import request from 'supertest';
import app from '../../src/app.js';

describe('Auth onboarding endpoints', () => {
  it('POST /v1/auth/complete-onboarding returns 400 with invalid payload', async () => {
    const res = await request(app)
      .post('/v1/auth/complete-onboarding')
      .send({ phone: '9999999999', name: '', intent: 'explorer' });

    expect(res.status).toBe(400);
  });

  it('POST /v1/auth/complete-onboarding rejects unsupported intent', async () => {
    const res = await request(app)
      .post('/v1/auth/complete-onboarding')
      .send({ phone: '9999999999', name: 'New User', intent: 'tenant' });

    expect(res.status).toBe(400);
  });
});

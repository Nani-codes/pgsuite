import request from 'supertest';
import app from '../../src/app.js';

describe('Health Check', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Auth endpoints', () => {
  it('POST /v1/auth/send-otp returns 404 for unknown phone', async () => {
    const res = await request(app)
      .post('/v1/auth/send-otp')
      .send({ phone: '0000000000' });
    expect(res.status).toBe(404);
  });
});

describe('Property endpoints require auth', () => {
  it('GET /v1/properties returns 401 without auth headers', async () => {
    const res = await request(app).get('/v1/properties');
    expect(res.status).toBe(401);
  });
});

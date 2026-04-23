import request from 'supertest';
import app from '../../src/app.js';

describe('Public property endpoints', () => {
  it('GET /v1/properties requires auth (owner scope)', async () => {
    const res = await request(app).get('/v1/properties');
    expect(res.status).toBe(401);
  });

  it('GET /v1/properties/public does not require auth', async () => {
    const res = await request(app).get('/v1/properties/public');
    expect(res.status).not.toBe(401);
  });
});

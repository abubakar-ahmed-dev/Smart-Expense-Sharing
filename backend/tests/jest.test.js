import request from 'supertest';
import {
  addGroupMemberSchema,
  createSettlementSchema,
  createUserSchema,
  loginSchema,
  updateUserSchema,
} from '../dist/lib/validation.js';
import { createApp } from '../dist/app.js';

describe('Unit Tests - Validation Schemas', () => {
  test('1) createUserSchema accepts valid signup payload', () => {
    const result = createUserSchema.safeParse({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
      phone: '+1234567890',
    });

    expect(result.success).toBe(true);
  });

  test('2) createUserSchema rejects invalid email', () => {
    const result = createUserSchema.safeParse({
      name: 'Alice',
      email: 'alice-at-example.com',
      password: 'secret123',
      phone: '+1234567890',
    });

    expect(result.success).toBe(false);
  });

  test('3) loginSchema rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'alice@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
  });

  test('4) updateUserSchema allows partial update (name only)', () => {
    const result = updateUserSchema.safeParse({
      name: 'New Name',
    });

    expect(result.success).toBe(true);
  });

  test('5) addGroupMemberSchema rejects invalid role', () => {
    const result = addGroupMemberSchema.safeParse({
      userId: 'ckz4x2v4x0000x8a9y0z0abcd',
      phoneId: 'ckz4x2v4x0001x8a9y0z0abce',
      role: 'OWNER',
    });

    expect(result.success).toBe(false);
  });

  test('6) createSettlementSchema requires positive amount', () => {
    const result = createSettlementSchema.safeParse({
      fromUserId: 'ckz4x2v4x0000x8a9y0z0abcd',
      toUserId: 'ckz4x2v4x0001x8a9y0z0abce',
      amount: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe('Integration Tests - API Endpoints', () => {
  const app = createApp();

  test('7) GET /api/v1/health returns 200', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('8) GET unknown route returns 404', async () => {
    const res = await request(app).get('/api/v1/not-a-route');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('9) GET /api/v1/users without auth returns 401', async () => {
    const res = await request(app).get('/api/v1/users');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('10) POST /api/v1/auth/login with invalid body returns 400', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

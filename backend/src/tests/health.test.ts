import { describe, it, expect } from 'vitest';
import { createApp } from '../app';

describe('Health and Readiness API', () => {
  it('should return 200 and healthy status response', async () => {
    const app = createApp();

    // Mock request using express test or fetch with running instance or direct invocation
    const req = {
      method: 'GET',
      url: '/api/health',
      headers: {},
    } as any;

    let statusCode = 0;
    let jsonResult: any = null;

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResult = data;
        return this;
      },
    } as any;

    // Direct route handler execution test
    const handler = (app as any)._router.stack.find(
      (s: any) => s.route && s.route.path === '/api/health'
    )?.route?.stack?.[0]?.handle;

    expect(handler).toBeDefined();
    await handler(req, res, () => {});

    expect(statusCode).toBe(200);
    expect(jsonResult).toBeDefined();
    expect(jsonResult.status).toBe('ok');
    expect(jsonResult.database).toBeDefined();
    expect(jsonResult.integrations).toBeDefined();
  });
});

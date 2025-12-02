import { GET } from '@/app/api/health/route';
import { NextResponse } from 'next/server';
import * as envModule from '@/app/lib/env';

// Mock env
jest.mock('@/app/lib/env');

describe('Health Check API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (envModule as any).env = {
      nodeEnv: 'development',
    };
  });

  describe('GET /api/health', () => {
    it('should return 200 with ok status', async () => {
      const response = await GET();

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe('ok');
      expect(json.timestamp).toBeDefined();
      expect(json.environment).toBe('development');
    });

    it('should return ISO timestamp', async () => {
      const response = await GET();
      const json = await response.json();

      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(json.timestamp)).not.toThrow();
    });

    it('should include environment from config', async () => {
      (envModule as any).env.nodeEnv = 'production';

      const response = await GET();
      const json = await response.json();

      expect(json.environment).toBe('production');
    });

    it('should always return 200 status', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await GET();
        expect(response.status).toBe(200);
      }
    });
  });
});

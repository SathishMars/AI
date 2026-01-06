import * as envModule from '@/app/lib/env';

describe('Environment Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    (process.env as any) = { ...originalEnv };
  });

  afterEach(() => {
    (process.env as any) = originalEnv;
  });

  describe('Rails Base URL', () => {
    it('should use NEXT_PUBLIC_RAILS_BASE_URL when set', () => {
      process.env.NEXT_PUBLIC_RAILS_BASE_URL = 'https://app.groupize.com';
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.railsBaseUrl).toBe('https://app.groupize.com');
    });

    it('should default to http://groupize.local in development', () => {
      delete process.env.NEXT_PUBLIC_RAILS_BASE_URL;
      delete process.env.RAILS_BASE_URL;
      (process.env as any).NODE_ENV = 'development';
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.railsBaseUrl).toBe('http://groupize.local');
    });
  });

  describe('JWKS URL', () => {
  });

  describe('JWT Configuration', () => {
  });

  describe('Cookie Configuration', () => {
    it('should use COOKIE_NAME when set', () => {
      process.env.COOKIE_NAME = 'custom-cookie';
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.cookieName).toBe('custom-cookie');
    });

    it('should default COOKIE_NAME to gpw_session', () => {
      delete process.env.COOKIE_NAME;
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.cookieName).toBe('gpw_session');
    });
  });

  describe('Base Path', () => {
    it('should use NEXT_PUBLIC_BASE_PATH when set', () => {
      process.env.NEXT_PUBLIC_BASE_PATH = '/custom/path';
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.basePath).toBe('/custom/path');
    });

    it('should default NEXT_PUBLIC_BASE_PATH to /aime', () => {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.basePath).toBe('/aime');
    });
  });

  describe('Node Environment', () => {
    it('should detect production environment', () => {
      (process.env as any).NODE_ENV = 'production';
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.nodeEnv).toBe('production');
      expect(env.isProduction).toBe(true);
      expect(env.isDevelopment).toBe(false);
    });

    it('should detect development environment', () => {
      (process.env as any).NODE_ENV = 'development';
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.nodeEnv).toBe('development');
      expect(env.isProduction).toBe(false);
      expect(env.isDevelopment).toBe(true);
    });
  });

  describe('Optional Environment Variables', () => {
    it('should return undefined for ANTHROPIC_API_KEY when not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.anthropicApiKey).toBeUndefined();
    });

    it('should return ANTHROPIC_API_KEY when set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.anthropicApiKey).toBe('sk-ant-test-key');
    });

    it('should return undefined for DOCUMENTDB_URI when not set', () => {
      delete process.env.DOCUMENTDB_URI;
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.documentDbUri).toBeUndefined();
    });

    it('should return undefined for MONGODB_URI when not set', () => {
      delete process.env.MONGODB_URI;
      jest.resetModules();
      const { env } = require('@/app/lib/env');
      expect(env.mongoDbUri).toBeUndefined();
    });
  });
});


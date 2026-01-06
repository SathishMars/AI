import { serverApiFetch } from '@/app/utils/server-api';
import { cookies } from 'next/headers';
import { env } from '@/app/lib/env';

// Mock Next.js modules
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/app/lib/env', () => ({
  env: {
    basePath: '/workflows',
    appUrl: 'https://app.example.com',
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('serverApiFetch', () => {
  let mockCookieStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup cookie mock
    mockCookieStore = {
      get: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('URL construction', () => {
    it('should construct absolute URL from relative path', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      // Act
      await serverApiFetch('/api/test');

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        'https://app.example.com/workflows/api/test',
        expect.any(Object)
      );
    });

    it('should handle paths without leading slash', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      // Act
      await serverApiFetch('api/test');

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        'https://app.example.com/workflowsapi/test',
        expect.any(Object)
      );
    });

    it('should pass through absolute URL unchanged', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const absoluteUrl = 'https://external-api.com/endpoint';

      // Act
      await serverApiFetch(absoluteUrl);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        absoluteUrl,
        undefined
      );
    });

    it('should pass through URL object unchanged', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const urlObject = new URL('https://external-api.com/endpoint');

      // Act
      await serverApiFetch(urlObject);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        urlObject,
        undefined
      );
    });

    it('should handle query parameters in relative paths', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      // Act
      await serverApiFetch('/api/test?param=value&other=test');

      // Assert
      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('param=value');
      expect(callUrl).toContain('other=test');
    });
  });

  describe('Cookie forwarding', () => {
    it('should forward session cookie when present', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'test-session-token',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      // Act
      await serverApiFetch('/api/test');

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const headers = new Headers(fetchCall.headers);
      expect(headers.get('Cookie')).toBe('gpw_session=test-session-token');
    });

    it('should not set Cookie header when session cookie is missing', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue(undefined);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      // Act
      await serverApiFetch('/api/test');

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const headers = new Headers(fetchCall.headers);
      expect(headers.get('Cookie')).toBeNull();
    });

    it('should preserve existing headers', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'test-session-token',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const customHeaders = {
        'x-custom-header': 'custom-value',
        'Content-Type': 'application/json',
      };

      // Act
      await serverApiFetch('/api/test', {
        headers: customHeaders,
      });

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const headers = new Headers(fetchCall.headers);
      expect(headers.get('x-custom-header')).toBe('custom-value');
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Cookie')).toBe('gpw_session=test-session-token');
    });

    it('should not override manually set Cookie header', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'auto-session-token',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const customHeaders = new Headers();
      customHeaders.set('Cookie', 'custom_cookie=manual-value');

      // Act
      await serverApiFetch('/api/test', {
        headers: customHeaders,
      });

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const headers = new Headers(fetchCall.headers);
      // The auto-detected session should override
      expect(headers.get('Cookie')).toBe('gpw_session=auto-session-token');
    });
  });

  describe('Request options', () => {
    beforeEach(() => {
      mockCookieStore.get.mockReturnValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
    });

    it('should pass through method option', async () => {
      // Act
      await serverApiFetch('/api/test', { method: 'POST' });

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchCall.method).toBe('POST');
    });

    it('should pass through body option', async () => {
      // Arrange
      const body = JSON.stringify({ key: 'value' });

      // Act
      await serverApiFetch('/api/test', {
        method: 'POST',
        body,
      });

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchCall.body).toBe(body);
    });

    it('should pass through all RequestInit options', async () => {
      // Arrange
      const options: RequestInit = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: '{"test": true}',
        cache: 'no-cache',
        credentials: 'include',
      };

      // Act
      await serverApiFetch('/api/test', options);

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchCall.method).toBe('PUT');
      expect(fetchCall.body).toBe('{"test": true}');
      expect(fetchCall.cache).toBe('no-cache');
      expect(fetchCall.credentials).toBe('include');
    });

    it('should work without any options', async () => {
      // Act
      await serverApiFetch('/api/test');

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );
    });
  });

  describe('Response handling', () => {
    beforeEach(() => {
      mockCookieStore.get.mockReturnValue(undefined);
    });

    it('should return the Response object', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      } as any;

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const response = await serverApiFetch('/api/test');

      // Assert
      expect(response).toBe(mockResponse);
    });

    it('should allow reading response body', async () => {
      // Arrange
      const mockData = { id: 1, name: 'Test' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockData),
      } as any);

      // Act
      const response = await serverApiFetch('/api/test');
      const data = await response.json();

      // Assert
      expect(data).toEqual(mockData);
    });

    it('should handle error responses', async () => {
      // Arrange
      const mockErrorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response;

      (global.fetch as jest.Mock).mockResolvedValue(mockErrorResponse);

      // Act
      const response = await serverApiFetch('/api/test');

      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      mockCookieStore.get.mockReturnValue(undefined);
    });

    it('should propagate fetch errors', async () => {
      // Arrange
      const networkError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      // Act & Assert
      await expect(serverApiFetch('/api/test')).rejects.toThrow('Network error');
    });

    it('should propagate timeout errors', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Request timeout')
      );

      // Act & Assert
      await expect(serverApiFetch('/api/test')).rejects.toThrow(
        'Request timeout'
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle authenticated API calls with custom headers', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'secure-token-123',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      } as any);

      // Act
      const response = await serverApiFetch('/api/secure-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-account': 'account123',
        },
        body: JSON.stringify({ action: 'test' }),
      });

      // Assert
      expect(response.ok).toBe(true);
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const headers = new Headers(fetchCall[1].headers);
      expect(headers.get('Cookie')).toBe('gpw_session=secure-token-123');
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('x-account')).toBe('account123');
    });
  });
});


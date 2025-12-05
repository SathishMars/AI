import { GET } from './route';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/app/lib/env';

// Mock Next.js modules
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/app/lib/env', () => ({
  env: {
    railsBaseUrl: 'https://api.example.com',
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('GET /api/request-templates/[id]', () => {
  let mockCookieStore: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup cookie mock
    mockCookieStore = {
      get: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Setup default request mock
    mockRequest = {
      headers: {
        get: jest.fn((key: string) => {
          if (key === 'x-account') return 'account123';
          if (key === 'x-organization') return 'org456';
          return null;
        }),
      },
    } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful requests', () => {
    it('should fetch and return a request template successfully', async () => {
      // Arrange
      const mockTemplateData = {
        id: 'template123',
        name: 'Test Template',
        sections: [],
      };

      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockTemplateData),
      });

      const params = { id: 'template123' };

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual(mockTemplateData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/requests/template123'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-jwt-token',
            Cookie: 'gpw_session=mock-jwt-token',
            Accept: 'application/json',
          }),
        })
      );
    });

    it('should include query parameters in the request URL', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      const params = { id: 'template123' };

      // Act
      await GET(mockRequest, { params });

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('account_id=account123');
      expect(fetchCall).toContain('organization_id=org456');
    });

    it('should handle missing organization header', async () => {
      // Arrange
      mockRequest.headers.get = jest.fn((key: string) => {
        if (key === 'x-account') return 'account123';
        return null;
      });

      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      const params = { id: 'template123' };

      // Act
      await GET(mockRequest, { params });

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('organization_id=');
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when account ID is missing', async () => {
      // Arrange
      mockRequest.headers.get = jest.fn(() => null);
      const params = { id: 'template123' };

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Account ID not found in request headers',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 400 when request template ID is missing', async () => {
      // Arrange
      const params = { id: '' };

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Request template ID is required',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 401 when session cookie is missing', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue(undefined);
      const params = { id: 'template123' };

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Not authenticated',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Rails API errors', () => {
    beforeEach(() => {
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });
    });

    it('should handle 404 from Rails API', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: jest.fn().mockResolvedValue('Template not found'),
      });

      const params = { id: 'nonexistent' };

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe('Failed to fetch request template from Rails');
      expect(data.details).toBe('Template not found');
    });

    it('should handle 500 from Rails API', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server error'),
      });

      const params = { id: 'template123' };

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch request template from Rails');
    });
  });

  describe('Network errors', () => {
    beforeEach(() => {
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });
    });

    it('should handle fetch throwing an error', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const params = { id: 'template123' };

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Internal server error',
      });
    });
  });

  describe('URL encoding', () => {
    it('should properly encode special characters in template ID', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      const params = { id: 'template/with/slashes' };

      // Act
      await GET(mockRequest, { params });

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain(encodeURIComponent('template/with/slashes'));
      expect(fetchCall).not.toContain('template/with/slashes');
    });
  });
});


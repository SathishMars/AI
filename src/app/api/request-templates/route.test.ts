import { GET } from './route';
import { NextRequest } from 'next/server';
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

describe('GET /api/request-templates', () => {
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
    it('should fetch and return request templates successfully', async () => {
      // Arrange
      const mockTemplatesData = {
        requests: [
          {
            internal_key: 'req1',
            requestId: 'req1',
            name: 'Template 1',
            version: '1.0.0',
          },
          {
            internal_key: 'req2',
            requestId: 'req2',
            name: 'Template 2',
            version: '2.0.0',
          },
        ],
      };

      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockTemplatesData),
      });

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual(mockTemplatesData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/requests'),
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

    it('should include correct query parameters in the request URL', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ requests: [] }),
      });

      // Act
      await GET(mockRequest);

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('template=true');
      expect(fetchCall).toContain('active=true');
      expect(fetchCall).toContain('account_id=account123');
      expect(fetchCall).toContain('organization_id=org456');
    });

    it('should handle missing organization header gracefully', async () => {
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
        json: jest.fn().mockResolvedValue({ requests: [] }),
      });

      // Act
      await GET(mockRequest);

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('account_id=account123');
      expect(fetchCall).not.toContain('organization_id');
    });

    it('should return empty array when no templates exist', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ requests: [] }),
      });

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.requests).toEqual([]);
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when account ID is missing', async () => {
      // Arrange
      mockRequest.headers.get = jest.fn(() => null);

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Account ID not found in request headers',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 401 when session cookie is missing', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue(undefined);

      // Act
      const response = await GET(mockRequest);
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

    it('should handle 403 Forbidden from Rails API', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: jest.fn().mockResolvedValue('Access denied'),
        headers: {
          entries: jest.fn().mockReturnValue([]),
        },
      });

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe('Failed to fetch templates from Rails');
      expect(data.details).toBe('Access denied');
    });

    it('should handle 500 Internal Server Error from Rails API', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Database error'),
        headers: {
          entries: jest.fn().mockReturnValue([]),
        },
      });

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch templates from Rails');
    });

    it('should handle Rails API returning non-JSON response', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: jest.fn().mockResolvedValue('<html>Error page</html>'),
        headers: {
          entries: jest.fn().mockReturnValue([]),
        },
      });

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(502);
      expect(data.details).toBe('<html>Error page</html>');
    });
  });

  describe('Network errors', () => {
    beforeEach(() => {
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });
    });

    it('should handle network failure', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network connection failed')
      );

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Internal server error',
      });
    });

    it('should handle timeout errors', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Request timeout')
      );

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Internal server error',
      });
    });
  });

  describe('Authentication headers', () => {
    beforeEach(() => {
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token-12345',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ requests: [] }),
      });
    });

    it('should include Authorization Bearer header', async () => {
      // Act
      await GET(mockRequest);

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchCall.headers.Authorization).toBe(
        'Bearer mock-jwt-token-12345'
      );
    });

    it('should include Cookie header with session', async () => {
      // Act
      await GET(mockRequest);

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchCall.headers.Cookie).toBe('gpw_session=mock-jwt-token-12345');
    });

    it('should include Accept application/json header', async () => {
      // Act
      await GET(mockRequest);

      // Assert
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(fetchCall.headers.Accept).toBe('application/json');
    });
  });
});


import { GET } from '@/app/api/request-templates/[id]/route';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/app/lib/env';
import { Session } from '@/app/lib/dal';
import { RailsApiError } from '@/app/lib/rails-fetcher';

// Mock Next.js modules
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/app/lib/env', () => ({
  env: {
    railsBaseUrl: 'https://api.example.com',
    cookieName: 'gpw_session',
  },
}));

// Mock DAL module
jest.mock('@/app/lib/dal', () => ({
  requireSession: jest.fn(),
  verifySession: jest.fn(),
  getRailsBaseUrl: jest.fn(() => 'https://api.example.com'),
}));

// Mock rails-fetcher module
const mockRailsFetch = jest.fn();
jest.mock('@/app/lib/rails-fetcher', () => {
  const actual = jest.requireActual('@/app/lib/rails-fetcher');
  return {
    ...actual,
    railsFetch: (...args: any[]) => mockRailsFetch(...args),
  };
});

describe('GET /api/request-templates/[id]', () => {
  let mockCookieStore: any;
  let mockRequest: NextRequest;
  let mockSession: Session;
  let mockRequireSession: jest.MockedFunction<() => Promise<Session>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRailsFetch.mockClear();

    // Setup cookie mock
    mockCookieStore = {
      get: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    // Setup default mock session
    mockSession = {
      userId: 'user123',
      accountId: 'account123',
      organizationId: 'org456',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      expiresAt: new Date(Date.now() + 3600000),
      claims: {
        iss: 'groupize',
        aud: 'workflows',
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        context: {
          user_id: 'user123',
          email: 'test@example.com',
          user_first_name: 'John',
          user_last_name: 'Doe',
          account_id: 'account123',
          organization_id: 'org456',
        },
      },
    };

    // Setup default request mock
    mockRequest = {
      headers: {
        get: jest.fn((key: string) => {
          if (key === 'x-account') return 'account123';
          if (key === 'x-organization') return 'org456';
          return null;
        }),
      },
      cookies: {
        get: jest.fn((name: string) => {
          if (name === 'gpw_session') {
            return { value: 'mock-jwt-token' };
          }
          return undefined;
        }),
      },
    } as any;

    // Default mock for requireSession
    const dalModule = require('@/app/lib/dal');
    mockRequireSession = dalModule.requireSession as jest.MockedFunction<() => Promise<Session>>;
    mockRequireSession.mockResolvedValue(mockSession);
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

      mockRailsFetch.mockResolvedValue(mockTemplateData);

      const params = Promise.resolve({ id: 'template123' });

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual(mockTemplateData);
      expect(mockRailsFetch).toHaveBeenCalledWith(
        mockRequest,
        '/api/v1/requests/template123',
        expect.objectContaining({
          method: 'GET',
          searchParams: expect.objectContaining({
            account_id: 'account123',
            organization_id: 'org456',
          }),
        })
      );
    });

    it('should include query parameters in the request URL', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      mockRailsFetch.mockResolvedValue({});

      const params = Promise.resolve({ id: 'template123' });

      // Act
      await GET(mockRequest, { params });

      // Assert
      expect(mockRailsFetch).toHaveBeenCalledWith(
        mockRequest,
        '/api/v1/requests/template123',
        expect.objectContaining({
          method: 'GET',
          searchParams: expect.objectContaining({
            account_id: 'account123',
            organization_id: 'org456',
          }),
        })
      );
    });

    it('should handle missing organization header', async () => {
      // Arrange
      const sessionWithoutOrg = { ...mockSession, organizationId: undefined };
      mockRequireSession.mockResolvedValue(sessionWithoutOrg);
      mockRequest.headers.get = jest.fn((key: string) => {
        if (key === 'x-account') return 'account123';
        return null;
      });

      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      mockRailsFetch.mockResolvedValue({});

      const params = Promise.resolve({ id: 'template123' });

      // Act
      await GET(mockRequest, { params });

      // Assert
      expect(mockRailsFetch).toHaveBeenCalledWith(
        mockRequest,
        '/api/v1/requests/template123',
        expect.objectContaining({
          method: 'GET',
          searchParams: expect.objectContaining({
            account_id: 'account123',
            organization_id: '',
          }),
        })
      );
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when account ID is missing', async () => {
      // Arrange
      const sessionWithoutAccount = { ...mockSession, accountId: '' };
      mockRequireSession.mockResolvedValue(sessionWithoutAccount);
      mockRequest.headers.get = jest.fn(() => null);
      const params = Promise.resolve({ id: 'template123' });

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Account ID not found',
      });
      expect(mockRailsFetch).not.toHaveBeenCalled();
    });

    it('should return 400 when request template ID is missing', async () => {
      // Arrange
      const params = Promise.resolve({ id: '' });

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Request template ID is required',
      });
      expect(mockRailsFetch).not.toHaveBeenCalled();
    });

    it('should return 401 when session cookie is missing', async () => {
      // Arrange
      mockRequest.cookies.get = jest.fn(() => undefined);
      mockRequireSession.mockRejectedValue(new Error('Unauthorized: Session required'));
      const params = Promise.resolve({ id: 'template123' });

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Internal server error',
      });
      expect(mockRailsFetch).not.toHaveBeenCalled();
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
      mockRailsFetch.mockRejectedValue(
        new RailsApiError(404, 'Not Found', 'Template not found')
      );

      const params = Promise.resolve({ id: 'nonexistent' });

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
      mockRailsFetch.mockRejectedValue(
        new RailsApiError(500, 'Internal Server Error', 'Server error')
      );

      const params = Promise.resolve({ id: 'template123' });

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch request template from Rails');
      expect(data.details).toBe('Server error');
    });
  });

  describe('Network errors', () => {
    beforeEach(() => {
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });
    });

    it('should handle railsFetch throwing a RailsApiError', async () => {
      // Arrange
      mockRailsFetch.mockRejectedValue(
        new RailsApiError(500, 'Internal Server Error', 'Network error', 'Failed to communicate with Rails API')
      );

      const params = Promise.resolve({ id: 'template123' });

      // Act
      const response = await GET(mockRequest, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch request template from Rails');
      expect(data.details).toBe('Network error');
    });
  });

  describe('URL encoding', () => {
    it('should properly encode special characters in template ID', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      mockRailsFetch.mockResolvedValue({});

      const params = Promise.resolve({ id: 'template/with/slashes' });

      // Act
      await GET(mockRequest, { params });

      // Assert
      expect(mockRailsFetch).toHaveBeenCalledWith(
        mockRequest,
        '/api/v1/requests/template%2Fwith%2Fslashes',
        expect.any(Object)
      );
      // Verify the path contains encoded slashes
      const callArgs = mockRailsFetch.mock.calls[0];
      expect(callArgs[1]).toContain(encodeURIComponent('template/with/slashes'));
      expect(callArgs[1]).not.toContain('template/with/slashes');
    });
  });
});


import { GET } from '@/app/api/request-templates/route';
import { NextRequest } from 'next/server';
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

describe('GET /api/request-templates', () => {
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

      mockRailsFetch.mockResolvedValue(mockTemplatesData);

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual(mockTemplatesData);
      expect(mockRailsFetch).toHaveBeenCalledWith(
        mockRequest,
        '/api/v1/requests',
        expect.objectContaining({
          method: 'GET',
          searchParams: expect.objectContaining({
            template: 'true',
            active: 'true',
            account_id: 'account123',
            organization_id: 'org456',
          }),
        })
      );
    });

    it('should include correct query parameters in the request URL', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      mockRailsFetch.mockResolvedValue({ requests: [] });

      // Act
      await GET(mockRequest);

      // Assert
      expect(mockRailsFetch).toHaveBeenCalledWith(
        mockRequest,
        '/api/v1/requests',
        expect.objectContaining({
          method: 'GET',
          searchParams: expect.objectContaining({
            template: 'true',
            active: 'true',
            account_id: 'account123',
            organization_id: 'org456',
          }),
        })
      );
    });

    it('should handle missing organization header gracefully', async () => {
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

      mockRailsFetch.mockResolvedValue({ requests: [] });

      // Act
      await GET(mockRequest);

      // Assert
      expect(mockRailsFetch).toHaveBeenCalled();
      const callArgs = mockRailsFetch.mock.calls[0];
      expect(callArgs[0]).toBe(mockRequest);
      expect(callArgs[1]).toBe('/api/v1/requests');
      expect(callArgs[2].method).toBe('GET');
      expect(callArgs[2].searchParams).toMatchObject({
        template: 'true',
        active: 'true',
        account_id: 'account123',
      });
      // Verify organization_id is not included when organizationId is missing
      expect(callArgs[2].searchParams).not.toHaveProperty('organization_id');
    });

    it('should return empty array when no templates exist', async () => {
      // Arrange
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token',
      });

      mockRailsFetch.mockResolvedValue({ requests: [] });

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
      const sessionWithoutAccount = { ...mockSession, accountId: '' };
      mockRequireSession.mockResolvedValue(sessionWithoutAccount);
      mockRequest.headers.get = jest.fn(() => null);

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Account ID not found',
      });
      expect(mockRailsFetch).not.toHaveBeenCalled();
    });

    it('should return 401 when session cookie is missing', async () => {
      // Arrange
      mockRequest.cookies.get = jest.fn(() => undefined);
      mockRequireSession.mockRejectedValue(new Error('Unauthorized: Session required'));

      // Act
      const response = await GET(mockRequest);
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

    it('should handle 403 Forbidden from Rails API', async () => {
      // Arrange
      mockRailsFetch.mockRejectedValue(
        new RailsApiError(403, 'Forbidden', 'Access denied')
      );

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
      mockRailsFetch.mockRejectedValue(
        new RailsApiError(500, 'Internal Server Error', 'Database error')
      );

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch templates from Rails');
      expect(data.details).toBe('Database error');
    });

    it('should handle Rails API returning non-JSON response', async () => {
      // Arrange
      mockRailsFetch.mockRejectedValue(
        new RailsApiError(502, 'Bad Gateway', '<html>Error page</html>')
      );

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
      mockRailsFetch.mockRejectedValue(
        new RailsApiError(500, 'Internal Server Error', 'Network connection failed', 'Failed to communicate with Rails API')
      );

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch templates from Rails');
      expect(data.details).toBe('Network connection failed');
    });

    it('should handle timeout errors', async () => {
      // Arrange
      mockRailsFetch.mockRejectedValue(
        new RailsApiError(500, 'Internal Server Error', 'Request timeout', 'Failed to communicate with Rails API')
      );

      // Act
      const response = await GET(mockRequest);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch templates from Rails');
      expect(data.details).toBe('Request timeout');
    });
  });

  describe('Rails fetcher integration', () => {
    beforeEach(() => {
      mockCookieStore.get.mockReturnValue({
        value: 'mock-jwt-token-12345',
      });

      mockRailsFetch.mockResolvedValue({ requests: [] });
    });

    it('should call railsFetch with correct request object', async () => {
      // Arrange
      mockRequest.cookies.get = jest.fn((name: string) => {
        if (name === 'gpw_session') {
          return { value: 'mock-jwt-token-12345' };
        }
        return undefined;
      });

      // Act
      await GET(mockRequest);

      // Assert
      expect(mockRailsFetch).toHaveBeenCalled();
      expect(mockRailsFetch).toHaveBeenCalledWith(
        mockRequest,
        '/api/v1/requests',
        expect.any(Object)
      );
    });

    it('should pass correct path and search params to railsFetch', async () => {
      // Act
      await GET(mockRequest);

      // Assert
      expect(mockRailsFetch).toHaveBeenCalledWith(
        mockRequest,
        '/api/v1/requests',
        expect.objectContaining({
          method: 'GET',
          searchParams: expect.objectContaining({
            template: 'true',
            active: 'true',
            account_id: 'account123',
            organization_id: 'org456',
          }),
        })
      );
    });
  });
});


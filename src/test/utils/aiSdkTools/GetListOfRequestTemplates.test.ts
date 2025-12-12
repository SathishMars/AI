import {
  getListOfRequestTemplates,
  getListOfRequestTemplatesTool,
} from '@/app/utils/aiSdkTools/GetListOfRequestTemplates';
import { serverApiFetch } from '@/app/utils/server-api';

// Mock server-api
jest.mock('@/app/utils/server-api', () => ({
  serverApiFetch: jest.fn(),
}));

describe('GetListOfRequestTemplates', () => {
  const mockServerApiFetch = serverApiFetch as jest.MockedFunction<
    typeof serverApiFetch
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getListOfRequestTemplates', () => {
    const validInput = {
      account: 'account123',
      organization: 'org456',
    };

    describe('Successful requests', () => {
      it('should fetch and return request templates successfully', async () => {
        // Arrange
        const mockResponseData = {
          requests: [
            {
              internal_key: 'req1',
              requestId: 'req1',
              name: 'Budget Request',
              version: '1.0.0',
            },
            {
              internal_key: 'req2',
              requestId: 'req2',
              name: 'Travel Request',
              version: '2.0.0',
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates).toHaveLength(2);
        expect(result.templates[0]).toEqual({
          id: 'req1',
          version: '1.0.0',
          label: 'Budget Request',
          description: null,
        });
        expect(result.templates[1]).toEqual({
          id: 'req2',
          version: '2.0.0',
          label: 'Travel Request',
          description: null,
        });
      });

      it('should call serverApiFetch with correct parameters', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ requests: [] }),
        } as any);

        // Act
        await getListOfRequestTemplates(validInput);

        // Assert
        expect(mockServerApiFetch).toHaveBeenCalledWith(
          '/api/request-templates',
          {
            method: 'GET',
            headers: {
              'x-account': 'account123',
              'x-organization': 'org456',
            },
          }
        );
      });

      it('should handle null organization', async () => {
        // Arrange
        const inputWithNullOrg = {
          account: 'account123',
          organization: null,
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ requests: [] }),
        } as any);

        // Act
        await getListOfRequestTemplates(inputWithNullOrg);

        // Assert
        expect(mockServerApiFetch).toHaveBeenCalledWith(
          '/api/request-templates',
          {
            method: 'GET',
            headers: {
              'x-account': 'account123',
              'x-organization': '',
            },
          }
        );
      });

      it('should handle missing organization', async () => {
        // Arrange
        const inputWithoutOrg = {
          account: 'account123',
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ requests: [] }),
        } as any);

        // Act
        await getListOfRequestTemplates(inputWithoutOrg);

        // Assert
        expect(mockServerApiFetch).toHaveBeenCalledWith(
          '/api/request-templates',
          expect.objectContaining({
            headers: {
              'x-account': 'account123',
              'x-organization': '',
            },
          })
        );
      });

      it('should use internal_key as id when available', async () => {
        // Arrange
        const mockResponseData = {
          requests: [
            {
              internal_key: 'custom_key',
              requestId: 'req123',
              name: 'Test Template',
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates[0].id).toBe('custom_key');
      });

      it('should fallback to requestId when internal_key is missing', async () => {
        // Arrange
        const mockResponseData = {
          requests: [
            {
              requestId: 'req123',
              name: 'Test Template',
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates[0].id).toBe('req123');
      });

      it('should use default version when not provided', async () => {
        // Arrange
        const mockResponseData = {
          requests: [
            {
              internal_key: 'req1',
              name: 'Test Template',
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates[0].version).toBe('1.0.0');
      });

      it('should return empty array when no requests exist', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ requests: [] }),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates).toEqual([]);
      });

      it('should return empty array when requests field is missing', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({}),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates).toEqual([]);
      });

      it('should set description to null for all templates', async () => {
        // Arrange
        const mockResponseData = {
          requests: [
            {
              internal_key: 'req1',
              name: 'Test Template',
              someOtherField: 'value',
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates[0].description).toBeNull();
      });
    });

    describe('Validation', () => {
      it('should throw error when account is missing', async () => {
        // Arrange
        const invalidInput = {
          account: '',
        };

        // Act & Assert
        await expect(
          getListOfRequestTemplates(invalidInput as any)
        ).rejects.toThrow('account is required and must be a string');
      });

      it('should throw error when account is not a string', async () => {
        // Arrange
        const invalidInput = {
          account: 123,
        };

        // Act & Assert
        await expect(
          getListOfRequestTemplates(invalidInput as any)
        ).rejects.toThrow('account is required and must be a string');
      });

      it('should throw error when account is null', async () => {
        // Arrange
        const invalidInput = {
          account: null,
        };

        // Act & Assert
        await expect(
          getListOfRequestTemplates(invalidInput as any)
        ).rejects.toThrow('account is required and must be a string');
      });

      it('should throw error when account is undefined', async () => {
        // Arrange
        const invalidInput = {};

        // Act & Assert
        await expect(
          getListOfRequestTemplates(invalidInput as any)
        ).rejects.toThrow('account is required and must be a string');
      });
    });

    describe('Error handling', () => {
      it('should return empty templates array when API returns 404', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: false,
          status: 404,
          text: jest.fn().mockResolvedValue('Not found'),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates).toEqual([]);
      });

      it('should return empty templates array when API returns 500', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Server error'),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates).toEqual([]);
      });

      it('should return empty templates array when API returns 403', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: false,
          status: 403,
          text: jest.fn().mockResolvedValue('Forbidden'),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates).toEqual([]);
      });

      it('should return empty templates array when fetch throws', async () => {
        // Arrange
        mockServerApiFetch.mockRejectedValue(new Error('Network error'));

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates).toEqual([]);
      });

      it('should return empty templates array when response.text() fails', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: false,
          status: 400,
          text: jest.fn().mockRejectedValue(new Error('Cannot read body')),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates).toEqual([]);
      });

      it('should return empty templates array when JSON parsing fails', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates).toEqual([]);
      });
    });

    describe('Data transformation', () => {
      it('should handle templates with all fields present', async () => {
        // Arrange
        const mockResponseData = {
          requests: [
            {
              internal_key: 'complete_template',
              requestId: 'req_complete',
              name: 'Complete Template',
              version: '3.0.0',
              extraField: 'ignored',
              anotherField: 'also ignored',
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates[0]).toEqual({
          id: 'complete_template',
          version: '3.0.0',
          label: 'Complete Template',
          description: null,
        });
        expect(result.templates[0]).not.toHaveProperty('extraField');
        expect(result.templates[0]).not.toHaveProperty('anotherField');
      });

      it('should handle large number of templates', async () => {
        // Arrange
        const mockRequests = Array.from({ length: 100 }, (_, i) => ({
          internal_key: `req${i}`,
          requestId: `req${i}`,
          name: `Template ${i}`,
          version: '1.0.0',
        }));

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ requests: mockRequests }),
        } as any);

        // Act
        const result = await getListOfRequestTemplates(validInput);

        // Assert
        expect(result.templates).toHaveLength(100);
        expect(result.templates[0].id).toBe('req0');
        expect(result.templates[99].id).toBe('req99');
      });
    });
  });

  describe('getListOfRequestTemplatesTool', () => {
    it('should have correct description', () => {
      // Assert
      expect(getListOfRequestTemplatesTool.description).toContain(
        'Returns a structured object containing published request templates'
      );
      expect(getListOfRequestTemplatesTool.description).toContain(
        'NEVER display the ID'
      );
      expect(getListOfRequestTemplatesTool.description).toContain(
        'category: "template_request"'
      );
    });

    it('should execute successfully', async () => {
      // Arrange
      const mockResponseData = {
        requests: [
          {
            internal_key: 'tool_test',
            requestId: 'tool_test',
            name: 'Tool Test Template',
            version: '1.0.0',
          },
        ],
      };

      mockServerApiFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponseData),
      } as any);

      // Act
      const result = await getListOfRequestTemplatesTool.execute({
        account: 'account123',
        organization: 'org456',
      });

      // Assert
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].id).toBe('tool_test');
    });

    it('should return empty templates array on error in execute', async () => {
      // Arrange
      mockServerApiFetch.mockRejectedValue(new Error('Unexpected error'));

      // Act
      const result = await getListOfRequestTemplatesTool.execute({
        account: 'account123',
        organization: 'org456',
      });

      // Assert
      expect(result.templates).toEqual([]);
    });

    it('should handle null organization in tool execution', async () => {
      // Arrange
      mockServerApiFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ requests: [] }),
      } as any);

      // Act
      const result = await getListOfRequestTemplatesTool.execute({
        account: 'account123',
        organization: null,
      });

      // Assert
      expect(result.templates).toEqual([]);
    });

    it('should handle missing organization in tool execution', async () => {
      // Arrange
      mockServerApiFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ requests: [] }),
      } as any);

      // Act
      const result = await getListOfRequestTemplatesTool.execute({
        account: 'account123',
      });

      // Assert
      expect(result.templates).toEqual([]);
    });
  });
});


import { getListOfRequestFacts, getRequestFactsTool } from '@/app/utils/aiSdkTools/GetRequestFacts';
import { serverApiFetch } from '@/app/utils/server-api';

// Mock server-api
jest.mock('@/app/utils/server-api', () => ({
  serverApiFetch: jest.fn(),
}));

describe('GetRequestFacts', () => {
  const mockServerApiFetch = serverApiFetch as jest.MockedFunction<
    typeof serverApiFetch
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getListOfRequestFacts', () => {
    const validInput = {
      account: 'account123',
      organization: 'org456',
      requestTemplateId: 'template789',
    };

    describe('Successful requests', () => {
      it('should fetch and return request facts successfully', async () => {
        // Arrange
        const mockResponseData = {
          name: 'Budget Request Template',
          sections: [
            {
              questions: [
                {
                  internalKey: 'budget_amount',
                  name: 'Budget Amount',
                  description: 'Total budget requested',
                  fieldType: 'currency',
                },
                {
                  internalKey: 'start_date',
                  name: 'Start Date',
                  fieldType: 'date',
                },
              ],
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toHaveLength(3); // 1 for name + 2 questions
        expect(result.facts[0]).toEqual({
          id: 'requestFormName',
          label: 'Request form Name',
          description: 'Name of this Request template',
        });
        expect(result.facts[1]).toEqual({
          id: 'budget_amount',
          label: 'Budget Amount',
          description: 'Total budget requested',
        });
        expect(result.facts[2]).toEqual({
          id: 'start_date',
          label: 'Start Date',
          description: 'date',
        });
      });

      it('should call serverApiFetch with correct parameters', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ sections: [] }),
        } as any);

        // Act
        await getListOfRequestFacts(validInput);

        // Assert
        expect(mockServerApiFetch).toHaveBeenCalledWith(
          '/api/request-templates/template789',
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
          ...validInput,
          organization: null,
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ sections: [] }),
        } as any);

        // Act
        await getListOfRequestFacts(inputWithNullOrg);

        // Assert
        expect(mockServerApiFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: {
              'x-account': 'account123',
              'x-organization': '',
            },
          })
        );
      });

      it('should include sub-questions in facts', async () => {
        // Arrange
        const mockResponseData = {
          sections: [
            {
              questions: [
                {
                  internalKey: 'main_question',
                  name: 'Main Question',
                  sub_questions: [
                    {
                      internalKey: 'sub_q_1',
                      name: 'Sub Question 1',
                      fieldType: 'text',
                    },
                    {
                      internalKey: 'sub_q_2',
                      name: 'Sub Question 2',
                      description: 'Additional details',
                    },
                  ],
                },
              ],
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toHaveLength(3);
        expect(result.facts[0].id).toBe('main_question');
        expect(result.facts[1]).toEqual({
          id: 'sub_q_1',
          label: 'Sub Question 1',
          description: 'text',
        });
        expect(result.facts[2]).toEqual({
          id: 'sub_q_2',
          label: 'Sub Question 2',
          description: 'Additional details',
        });
      });

      it('should skip deleted questions', async () => {
        // Arrange
        const mockResponseData = {
          sections: [
            {
              questions: [
                {
                  internalKey: 'active_question',
                  name: 'Active Question',
                },
                {
                  internalKey: 'deleted_question',
                  name: 'Deleted Question',
                  deletedAt: '2023-01-01T00:00:00Z',
                },
              ],
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toHaveLength(1);
        expect(result.facts[0].id).toBe('active_question');
      });

      it('should skip deleted sub-questions', async () => {
        // Arrange
        const mockResponseData = {
          sections: [
            {
              questions: [
                {
                  internalKey: 'main_question',
                  name: 'Main Question',
                  sub_questions: [
                    {
                      internalKey: 'active_sub',
                      name: 'Active Sub',
                    },
                    {
                      internalKey: 'deleted_sub',
                      name: 'Deleted Sub',
                      deletedAt: '2023-01-01T00:00:00Z',
                    },
                  ],
                },
              ],
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toHaveLength(2);
        expect(result.facts[0].id).toBe('main_question');
        expect(result.facts[1].id).toBe('active_sub');
      });

      it('should generate IDs for questions without internalKey', async () => {
        // Arrange
        const mockResponseData = {
          sections: [
            {
              questions: [
                {
                  name: 'Question Without Key',
                  fieldType: 'text',
                },
              ],
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toHaveLength(1);
        expect(result.facts[0].id).toBe('question_question_without_key');
        expect(result.facts[0].label).toBe('Question Without Key');
      });

      it('should handle questions with missing name', async () => {
        // Arrange
        const mockResponseData = {
          sections: [
            {
              questions: [
                {
                  internalKey: 'unnamed_question',
                  fieldType: 'text',
                },
              ],
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toHaveLength(1);
        expect(result.facts[0].label).toBe('Unnamed Question');
      });

      it('should handle multiple sections', async () => {
        // Arrange
        const mockResponseData = {
          sections: [
            {
              questions: [
                { internalKey: 'q1', name: 'Question 1' },
              ],
            },
            {
              questions: [
                { internalKey: 'q2', name: 'Question 2' },
              ],
            },
            {
              questions: [
                { internalKey: 'q3', name: 'Question 3' },
              ],
            },
          ],
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponseData),
        } as any);

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toHaveLength(3);
        expect(result.facts[0].id).toBe('q1');
        expect(result.facts[1].id).toBe('q2');
        expect(result.facts[2].id).toBe('q3');
      });

      it('should return empty facts when template has no sections', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({}),
        } as any);

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toEqual([]);
      });
    });

    describe('Validation', () => {
      it('should throw error when account is missing', async () => {
        // Arrange
        const invalidInput = {
          account: '',
          requestTemplateId: 'template789',
        };

        // Act & Assert
        await expect(
          getListOfRequestFacts(invalidInput as any)
        ).rejects.toThrow('account is required and must be a string');
      });

      it('should throw error when account is not a string', async () => {
        // Arrange
        const invalidInput = {
          account: 123,
          requestTemplateId: 'template789',
        };

        // Act & Assert
        await expect(
          getListOfRequestFacts(invalidInput as any)
        ).rejects.toThrow('account is required and must be a string');
      });

      it('should throw error when requestTemplateId is missing', async () => {
        // Arrange
        const invalidInput = {
          account: 'account123',
          requestTemplateId: '',
        };

        // Act & Assert
        await expect(
          getListOfRequestFacts(invalidInput as any)
        ).rejects.toThrow('requestTemplateId is required and must be a string');
      });

      it('should throw error when requestTemplateId is not a string', async () => {
        // Arrange
        const invalidInput = {
          account: 'account123',
          requestTemplateId: null,
        };

        // Act & Assert
        await expect(
          getListOfRequestFacts(invalidInput as any)
        ).rejects.toThrow('requestTemplateId is required and must be a string');
      });
    });

    describe('Error handling', () => {
      it('should return empty facts array when API returns error status', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: false,
          status: 404,
          text: jest.fn().mockResolvedValue('Not found'),
        } as any);

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toEqual([]);
      });

      it('should return empty facts array when API returns 500', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Server error'),
        } as any);

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toEqual([]);
      });

      it('should return empty facts array when fetch throws', async () => {
        // Arrange
        mockServerApiFetch.mockRejectedValue(new Error('Network error'));

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toEqual([]);
      });

      it('should return empty facts array when response.text() fails', async () => {
        // Arrange
        mockServerApiFetch.mockResolvedValue({
          ok: false,
          status: 400,
          text: jest.fn().mockRejectedValue(new Error('Cannot read body')),
        } as any);

        // Act
        const result = await getListOfRequestFacts(validInput);

        // Assert
        expect(result.facts).toEqual([]);
      });
    });

    describe('URL encoding', () => {
      it('should encode special characters in requestTemplateId', async () => {
        // Arrange
        const inputWithSpecialChars = {
          ...validInput,
          requestTemplateId: 'template/with/slashes',
        };

        mockServerApiFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ sections: [] }),
        } as any);

        // Act
        await getListOfRequestFacts(inputWithSpecialChars);

        // Assert
        expect(mockServerApiFetch).toHaveBeenCalledWith(
          '/api/request-templates/template%2Fwith%2Fslashes',
          expect.any(Object)
        );
      });
    });
  });

  describe('getRequestFactsTool', () => {
    it('should have correct description', () => {
      // Assert
      expect(getRequestFactsTool.description).toContain(
        'Returns a structured object containing published request facts'
      );
      expect(getRequestFactsTool.description).toContain(
        'NEVER display the ID'
      );
    });

    it('should execute successfully', async () => {
      // Arrange
      const mockResponseData = {
        sections: [
          {
            questions: [
              {
                internalKey: 'test_fact',
                name: 'Test Fact',
              },
            ],
          },
        ],
      };

      mockServerApiFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponseData),
      } as any);

      // Act
      const result = await getRequestFactsTool.execute({
        account: 'account123',
        organization: 'org456',
        requestTemplateId: 'template789',
      });

      // Assert
      expect(result.facts).toHaveLength(1);
      expect(result.facts[0].id).toBe('test_fact');
    });

    it('should return empty facts array on error in execute', async () => {
      // Arrange
      mockServerApiFetch.mockRejectedValue(new Error('Unexpected error'));

      // Act
      const result = await getRequestFactsTool.execute({
        account: 'account123',
        organization: 'org456',
        requestTemplateId: 'template789',
      });

      // Assert
      expect(result.facts).toEqual([]);
    });

    it('should handle null organization in tool execution', async () => {
      // Arrange
      mockServerApiFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ sections: [] }),
      } as any);

      // Act
      const result = await getRequestFactsTool.execute({
        account: 'account123',
        organization: null,
        requestTemplateId: 'template789',
      });

      // Assert
      expect(result.facts).toEqual([]);
    });
  });
});


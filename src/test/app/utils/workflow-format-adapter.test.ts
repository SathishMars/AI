// src/test/app/utils/workflow-format-adapter.test.ts
import { describe, it, expect } from '@jest/globals';
import {
  isLegacyFormat,
  convertLegacyToNestedArray,
  convertNestedArrayToLegacy,
  ensureNestedArrayFormat
} from '@/app/utils/workflow-format-adapter';
import { WorkflowStep, WorkflowJSON } from '@/app/types/workflow';

describe('workflow-format-adapter', () => {
  describe('isLegacyFormat', () => {
    it('should detect legacy format with numbered keys', () => {
      const legacy = {
        steps: {
          "1": { name: "Start", type: "trigger" },
          "1.1": { name: "Check", type: "condition" }
        }
      };
      
      expect(isLegacyFormat(legacy)).toBe(true);
    });

    it('should detect new format with array', () => {
      const newFormat = {
        steps: [
          { id: "start", name: "Start", type: "trigger" },
          { id: "check", name: "Check", type: "condition" }
        ]
      };
      
      expect(isLegacyFormat(newFormat)).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isLegacyFormat(null)).toBe(false);
      expect(isLegacyFormat(undefined)).toBe(false);
      expect(isLegacyFormat({})).toBe(false);
      expect(isLegacyFormat({ steps: [] })).toBe(false);
    });
  });

  describe('convertLegacyToNestedArray', () => {
    it('should convert simple linear workflow', () => {
      const legacy = {
        steps: {
          "1": {
            name: "Start: On MRF Submission",
            type: "trigger" as const,
            nextSteps: ["1.1"]
          },
          "1.1": {
            name: "Action: Send Email",
            type: "action" as const,
            action: "sendEmail"
          }
        }
      };

      const result = convertLegacyToNestedArray(legacy);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Start: On MRF Submission");
      expect(result[0].id).toMatch(/^start/i);
      expect(result[0].children).toBeDefined();
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].name).toBe("Action: Send Email");
    });

    it('should convert workflow with conditional paths', () => {
      const legacy = {
        steps: {
          "1": {
            name: "Check: Budget Exceeds $10K",
            type: "condition" as const,
            condition: { fact: "budget", operator: "greaterThan", value: 10000 },
            onSuccess: "2",
            onFailure: "3"
          },
          "2": {
            name: "Action: Request Approval",
            type: "action" as const
          },
          "3": {
            name: "Action: Auto Approve",
            type: "action" as const
          }
        }
      };

      const result = convertLegacyToNestedArray(legacy);

      // Only root step (1) should be at top level since 2 and 3 are referenced
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Check: Budget Exceeds $10K");
      expect(result[0].onSuccessGoTo).toBeDefined();
      expect(result[0].onFailureGoTo).toBeDefined();
      
      // References should use human-readable IDs
      expect(result[0].onSuccessGoTo).toMatch(/action/i);
      expect(result[0].onFailureGoTo).toMatch(/action/i);
    });

    it('should generate human-readable IDs', () => {
      const legacy = {
        steps: {
          "1": {
            name: "Start: On MRF Submission",
            type: "trigger" as const
          },
          "2": {
            name: "Check: Attendee Count Over 100",
            type: "condition" as const
          },
          "3": {
            name: "Action: Send Notification Email",
            type: "action" as const
          }
        }
      };

      const result = convertLegacyToNestedArray(legacy);

      // Check that IDs are camelCase and descriptive
      expect(result[0].id).toMatch(/^start/i);
      expect(result[1].id).toMatch(/^check/i);
      expect(result[2].id).toMatch(/^action/i);
      
      // Check uniqueness
      const ids = result.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should handle nested children', () => {
      const legacy = {
        steps: {
          "1": {
            name: "Start: On MRF Submission",
            type: "trigger" as const,
            nextSteps: ["1.1"]
          },
          "1.1": {
            name: "Check: Budget Available",
            type: "condition" as const,
            nextSteps: ["1.1.1"]
          },
          "1.1.1": {
            name: "Action: Approve Request",
            type: "action" as const
          }
        }
      };

      const result = convertLegacyToNestedArray(legacy);

      expect(result).toHaveLength(1);
      expect(result[0].children).toBeDefined();
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].children).toBeDefined();
      expect(result[0].children![0].children).toHaveLength(1);
    });
  });

  describe('convertNestedArrayToLegacy', () => {
    it('should convert new format back to legacy', () => {
      const newFormat: WorkflowStep[] = [
        {
          id: "startWorkflow",
          name: "Start: On MRF Submission",
          type: "trigger",
          children: [
            {
              id: "sendEmail",
              name: "Action: Send Email",
              type: "action"
            }
          ]
        }
      ];

      const result = convertNestedArrayToLegacy(newFormat);

      expect(result["1"]).toBeDefined();
      expect(result["1"].name).toBe("Start: On MRF Submission");
      expect(result["1"].nextSteps).toBeDefined();
      expect(result["1"].nextSteps).toHaveLength(1);
      expect(result["1.1"]).toBeDefined();
      expect(result["1.1"].name).toBe("Action: Send Email");
    });

    it('should preserve step references', () => {
      const newFormat: WorkflowStep[] = [
        {
          id: "checkBudget",
          name: "Check: Budget Exceeds $10K",
          type: "condition",
          onSuccessGoTo: "requestApproval",
          onFailureGoTo: "autoApprove"
        },
        {
          id: "requestApproval",
          name: "Action: Request Approval",
          type: "action"
        },
        {
          id: "autoApprove",
          name: "Action: Auto Approve",
          type: "action"
        }
      ];

      const result = convertNestedArrayToLegacy(newFormat);

      expect(result["1"].onSuccess).toBeDefined();
      expect(result["1"].onFailure).toBeDefined();
      expect(result["2"]).toBeDefined();
      expect(result["3"]).toBeDefined();
    });
  });

  describe('ensureNestedArrayFormat', () => {
    it('should return array as-is if already in new format', () => {
      const newFormat = {
        steps: [
          { id: "start", name: "Start", type: "trigger" as const }
        ]
      } as Partial<WorkflowJSON>;

      const result = ensureNestedArrayFormat(newFormat as WorkflowJSON);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("start");
    });

    it('should convert legacy format to new format', () => {
      const legacy = {
        steps: {
          "1": { name: "Start", type: "trigger" as const }
        }
      };

      const result = ensureNestedArrayFormat(legacy);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBeDefined();
      expect(result[0].name).toBe("Start");
    });

    it('should return empty array for invalid input', () => {
      const invalidInput = {} as WorkflowJSON;
      const result = ensureNestedArrayFormat(invalidInput);
      expect(result).toEqual([]);
    });
  });

  describe('ID generation edge cases', () => {
    it('should handle steps with no name prefix', () => {
      const legacy = {
        steps: {
          "1": {
            name: "Submit Form",
            type: "action" as const
          }
        }
      };

      const result = convertLegacyToNestedArray(legacy);

      expect(result[0].id).toBeDefined();
      expect(result[0].id.length).toBeGreaterThan(2);
    });

    it('should handle duplicate names', () => {
      const legacy = {
        steps: {
          "1": {
            name: "Check: Budget",
            type: "condition" as const
          },
          "2": {
            name: "Check: Budget",
            type: "condition" as const
          }
        }
      };

      const result = convertLegacyToNestedArray(legacy);

      expect(result).toHaveLength(2);
      expect(result[0].id).not.toBe(result[1].id);
    });

    it('should handle special characters in names', () => {
      const legacy = {
        steps: {
          "1": {
            name: "Action: Send Email (Important!)",
            type: "action" as const
          }
        }
      };

      const result = convertLegacyToNestedArray(legacy);

      // Should remove special characters and create valid ID
      expect(result[0].id).toMatch(/^[a-zA-Z][a-zA-Z0-9]*$/);
    });
  });
});

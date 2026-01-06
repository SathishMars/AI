// INSIGHTS-SPECIFIC: Unit tests for NLP context building
import { buildContextSummary, InsightsChatMsg } from '@/app/lib/insights/nlp/context';

describe('NLP Context Building', () => {
  describe('buildContextSummary', () => {
    it('should return empty string for empty history', () => {
      const history: InsightsChatMsg[] = [];
      const result = buildContextSummary(history);
      expect(result).toBe('');
    });

    it('should format single message', () => {
      const history: InsightsChatMsg[] = [
        { role: 'user', text: 'How many attendees?' }
      ];
      const result = buildContextSummary(history);
      expect(result).toContain('USER: How many attendees?');
    });

    it('should format user and assistant messages', () => {
      const history: InsightsChatMsg[] = [
        { role: 'user', text: 'How many attendees?' },
        { role: 'assistant', text: 'There are 50 attendees.' }
      ];
      const result = buildContextSummary(history);
      expect(result).toContain('USER: How many attendees?');
      expect(result).toContain('ASSISTANT: There are 50 attendees.');
    });

    it('should include conversation header', () => {
      const history: InsightsChatMsg[] = [
        { role: 'user', text: 'How many attendees?' }
      ];
      const result = buildContextSummary(history);
      expect(result).toContain('Conversation so far:');
    });

    it('should limit to last 6 messages', () => {
      const history: InsightsChatMsg[] = [
        { role: 'user', text: 'Message 1' },
        { role: 'assistant', text: 'Response 1' },
        { role: 'user', text: 'Message 2' },
        { role: 'assistant', text: 'Response 2' },
        { role: 'user', text: 'Message 3' },
        { role: 'assistant', text: 'Response 3' },
        { role: 'user', text: 'Message 4' },
        { role: 'assistant', text: 'Response 4' },
      ];
      const result = buildContextSummary(history);
      // Should only include last 6 messages (3 user + 3 assistant)
      expect(result).not.toContain('Message 1');
      expect(result).toContain('Message 4');
      expect(result).toContain('Response 4');
    });

    it('should handle messages with special characters', () => {
      const history: InsightsChatMsg[] = [
        { role: 'user', text: 'Show me attendees with "VIP" status?' }
      ];
      const result = buildContextSummary(history);
      expect(result).toContain('"VIP"');
    });

    it('should handle long messages', () => {
      const longText = 'a'.repeat(500);
      const history: InsightsChatMsg[] = [
        { role: 'user', text: longText }
      ];
      const result = buildContextSummary(history);
      expect(result).toContain(longText);
    });

    it('should format role names in uppercase', () => {
      const history: InsightsChatMsg[] = [
        { role: 'user', text: 'test' },
        { role: 'assistant', text: 'response' }
      ];
      const result = buildContextSummary(history);
      expect(result).toContain('USER:');
      expect(result).toContain('ASSISTANT:');
    });

    it('should join messages with newlines', () => {
      const history: InsightsChatMsg[] = [
        { role: 'user', text: 'Question 1' },
        { role: 'assistant', text: 'Answer 1' },
        { role: 'user', text: 'Question 2' }
      ];
      const result = buildContextSummary(history);
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(3); // Header + 3 messages
    });
  });
});


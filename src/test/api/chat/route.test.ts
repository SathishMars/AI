// INSIGHTS-SPECIFIC: Unit tests for Chat API route
import { POST } from '@/app/api/chat/route';
import { NextResponse } from 'next/server';

// Test URL constant - only used to construct Request objects, not actually used by the route handler
const TEST_API_URL = 'http://localhost/api/chat';

// Mock all dependencies
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('@/app/lib/insights/sql/guard', () => ({
  ensureSafeSelect: jest.fn((sql) => sql),
  forceLimit: jest.fn((sql) => sql),
  containsPII: jest.fn(() => false),
  PII_COLUMNS: ['email', 'phone', 'mobile'],
}));

jest.mock('@/app/lib/insights/sql/timeout', () => ({
  queryWithTimeout: jest.fn().mockResolvedValue({
    rows: [{ first_name: 'John', last_name: 'Doe' }],
  }),
}));

jest.mock('@/app/lib/insights/sql/schema', () => ({
  getAttendeeSchemaText: jest.fn().mockResolvedValue('Table: attendee\nColumns: first_name, last_name'),
}));

jest.mock('@/app/lib/insights/nlp/scope', () => ({
  detectScopeAndCategory: jest.fn(() => ({
    scope: 'in_scope',
    category: 'statistics_summaries',
  })),
  outOfScopeMessage: jest.fn(() => 'Out of scope message'),
}));

jest.mock('@/app/lib/insights/nlp/context', () => ({
  buildContextSummary: jest.fn(() => 'Context summary'),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => (modelName: string) => ({
    __mock: true,
    modelName,
  })),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn(() => ({
    __mock: true,
  })),
}));

jest.mock('@ai-sdk/groq', () => ({
  createGroq: jest.fn(() => ({
    __mock: true,
  })),
}));

describe('Chat API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Request validation', () => {
    it('should reject question that is too short', async () => {
      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'ab' }), // Too short (< 3 chars)
      });

      const response = await POST(request);
      expect(response.status).toBe(200); // Returns 200 but with error in body
      const data = await response.json();
      expect(data.ok).toBe(true);
    });

    it('should reject question that is too long', async () => {
      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'a'.repeat(401) }), // Too long (> 400 chars)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
    });

    it('should accept valid question', async () => {
      const { generateText } = require('ai');
      generateText.mockResolvedValueOnce({
        text: '{"sql": "SELECT COUNT(*) FROM attendee", "intent": "count"}',
      }).mockResolvedValueOnce({
        text: 'There are 50 attendees.',
      });

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'How many attendees?' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
    });
  });

  describe('Scope detection', () => {
    it('should handle out-of-scope questions', async () => {
      const { detectScopeAndCategory, outOfScopeMessage } = require('@/app/lib/insights/nlp/scope');
      detectScopeAndCategory.mockReturnValueOnce({
        scope: 'out_of_scope',
        outOfScopeType: 'hotel_proposals',
      });

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Show me hotel proposals' }),
      });

      const response = await POST(request);
      const data = await response.json();
      expect(data.meta.scope).toBe('out_of_scope');
      expect(data.answer).toBe('Out of scope message');
    });

    it('should process in-scope questions', async () => {
      const { generateText } = require('ai');
      generateText.mockResolvedValueOnce({
        text: '{"sql": "SELECT COUNT(*) FROM attendee", "intent": "count"}',
      }).mockResolvedValueOnce({
        text: 'There are 50 attendees.',
      });

      const { detectScopeAndCategory } = require('@/app/lib/insights/nlp/scope');
      detectScopeAndCategory.mockReturnValueOnce({
        scope: 'in_scope',
        category: 'statistics_summaries',
      });

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'How many attendees?' }),
      });

      const response = await POST(request);
      const data = await response.json();
      expect(data.meta.scope).toBe('in_scope');
    });
  });

  describe('PII detection', () => {
    it('should block questions containing PII', async () => {
      const { containsPII } = require('@/app/lib/insights/sql/guard');
      containsPII.mockReturnValueOnce(true);

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Show me all emails' }),
      });

      const response = await POST(request);
      const data = await response.json();
      expect(data.meta.scope).toBe('pii_blocked');
      expect(data.answer).toContain('prohibits the disclosure');
    });

    it('should block SQL containing PII', async () => {
      const { generateText } = require('ai');
      const { containsPII } = require('@/app/lib/insights/sql/guard');
      
      generateText.mockResolvedValueOnce({
        text: '{"sql": "SELECT email FROM attendee", "intent": "get_emails"}',
      });
      
      // First call (question) returns false, second call (SQL) returns true
      containsPII
        .mockReturnValueOnce(false) // Question check
        .mockReturnValueOnce(true);  // SQL check

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Get contact information' }),
      });

      const response = await POST(request);
      const data = await response.json();
      expect(data.meta.scope).toBe('pii_blocked');
    });
  });

  describe('JSON parsing', () => {
    it('should handle valid JSON response from LLM', async () => {
      const { generateText } = require('ai');
      generateText.mockResolvedValueOnce({
        text: 'Here is the SQL: {"sql": "SELECT COUNT(*) FROM attendee", "intent": "count"}',
      }).mockResolvedValueOnce({
        text: 'There are 50 attendees.',
      });

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'How many attendees?' }),
      });

      const response = await POST(request);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.sql).toBeDefined();
    });

    it('should handle invalid JSON response from LLM', async () => {
      const { generateText } = require('ai');
      generateText.mockResolvedValueOnce({
        text: 'Invalid response without JSON',
      });

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'How many attendees?' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.answer).toContain('trouble connecting');
    });

    it('should handle malformed JSON', async () => {
      const { generateText } = require('ai');
      generateText.mockResolvedValueOnce({
        text: '{"sql": "SELECT * FROM attendee", "intent":}',
      });

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'How many attendees?' }),
      });

      const response = await POST(request);
      const data = await response.json();
      expect(data.ok).toBe(true);
    });
  });

  describe('SQL execution', () => {
    it('should execute SQL query and return results', async () => {
      const { generateText } = require('ai');
      const { queryWithTimeout } = require('@/app/lib/insights/sql/timeout');
      
      generateText.mockResolvedValueOnce({
        text: '{"sql": "SELECT first_name, last_name FROM attendee LIMIT 10", "intent": "list"}',
      }).mockResolvedValueOnce({
        text: 'Here are the attendees: John Doe, Jane Smith',
      });

      queryWithTimeout.mockResolvedValueOnce({
        rows: [
          { first_name: 'John', last_name: 'Doe' },
          { first_name: 'Jane', last_name: 'Smith' },
        ],
      });

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'List attendees' }),
      });

      const response = await POST(request);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.rows).toBeDefined();
      expect(Array.isArray(data.rows)).toBe(true);
    });

    it('should apply SQL safety guards', async () => {
      const { generateText } = require('ai');
      const { ensureSafeSelect, forceLimit } = require('@/app/lib/insights/sql/guard');
      
      generateText.mockResolvedValueOnce({
        text: '{"sql": "SELECT * FROM attendee", "intent": "list"}',
      }).mockResolvedValueOnce({
        text: 'Results here',
      });

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'List attendees' }),
      });

      await POST(request);

      expect(ensureSafeSelect).toHaveBeenCalled();
      expect(forceLimit).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { generateText } = require('ai');
      const { queryWithTimeout } = require('@/app/lib/insights/sql/timeout');
      
      generateText.mockResolvedValueOnce({
        text: '{"sql": "SELECT * FROM attendee", "intent": "list"}',
      });

      queryWithTimeout.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'List attendees' }),
      });

      const response = await POST(request);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.answer).toContain('trouble connecting');
    });

    it('should handle LLM API errors', async () => {
      const { generateText } = require('ai');
      generateText.mockRejectedValueOnce(new Error('OpenAI API error'));

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'How many attendees?' }),
      });

      const response = await POST(request);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.answer).toContain('trouble connecting');
    });
  });

  describe('Conversation history', () => {
    it('should include conversation history in context', async () => {
      const { generateText } = require('ai');
      const { buildContextSummary } = require('@/app/lib/insights/nlp/context');
      
      generateText.mockResolvedValueOnce({
        text: '{"sql": "SELECT COUNT(*) FROM attendee", "intent": "count"}',
      }).mockResolvedValueOnce({
        text: 'There are 50 attendees.',
      });

      const request = new Request(TEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'How many are VIP?',
          history: [
            { role: 'user', text: 'How many attendees?' },
            { role: 'assistant', text: 'There are 50 attendees.' },
          ],
        }),
      });

      await POST(request);

      expect(buildContextSummary).toHaveBeenCalled();
    });
  });
});


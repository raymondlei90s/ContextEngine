/**
 * Error Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ContextEngineError,
  RepositoryError,
  DocumentationError,
  AIError,
  DatabaseError,
  ConfigurationError,
  categorizeError,
  formatErrorForLog,
} from '../errors.js';

describe('Error Utilities', () => {
  describe('ContextEngineError', () => {
    it('should create error with all properties', () => {
      const error = new ContextEngineError(
        'Test error',
        'TEST_ERROR',
        'test',
        true,
        { key: 'value' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ContextEngineError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.category).toBe('test');
      expect(error.retryable).toBe(true);
      expect(error.details).toEqual({ key: 'value' });
    });

    it('should default retryable to false', () => {
      const error = new ContextEngineError('Test', 'TEST', 'test');

      expect(error.retryable).toBe(false);
    });

    it('should serialize to JSON', () => {
      const error = new ContextEngineError('Test', 'TEST', 'test', true, { x: 1 });

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'ContextEngineError',
        message: 'Test',
        code: 'TEST',
        category: 'test',
        retryable: true,
        details: { x: 1 },
      });
    });
  });

  describe('RepositoryError', () => {
    it('should create notFound error', () => {
      const error = RepositoryError.notFound('https://github.com/user/repo');

      expect(error).toBeInstanceOf(RepositoryError);
      expect(error.code).toBe('REPO_NOT_FOUND');
      expect(error.category).toBe('repository');
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('https://github.com/user/repo');
    });

    it('should create accessDenied error', () => {
      const error = RepositoryError.accessDenied('https://github.com/user/repo');

      expect(error.code).toBe('REPO_ACCESS_DENIED');
      expect(error.retryable).toBe(false);
    });

    it('should create cloneFailed error', () => {
      const error = RepositoryError.cloneFailed(
        'https://github.com/user/repo',
        'timeout'
      );

      expect(error.code).toBe('REPO_CLONE_FAILED');
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('timeout');
    });

    it('should create analysisFailed error', () => {
      const error = RepositoryError.analysisFailed(
        'https://github.com/user/repo',
        'invalid response'
      );

      expect(error.code).toBe('REPO_ANALYSIS_FAILED');
      expect(error.retryable).toBe(true);
    });
  });

  describe('DocumentationError', () => {
    it('should create generationFailed error', () => {
      const error = DocumentationError.generationFailed(
        'api/reference.mdx',
        'rate limit'
      );

      expect(error).toBeInstanceOf(DocumentationError);
      expect(error.code).toBe('DOC_GENERATION_FAILED');
      expect(error.category).toBe('documentation');
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('api/reference.mdx');
      expect(error.message).toContain('rate limit');
    });

    it('should create invalidContent error', () => {
      const error = DocumentationError.invalidContent(
        'guide.mdx',
        'no frontmatter'
      );

      expect(error.code).toBe('DOC_INVALID_CONTENT');
      expect(error.retryable).toBe(false);
    });

    it('should create planningFailed error', () => {
      const error = DocumentationError.planningFailed('analysis incomplete');

      expect(error.code).toBe('DOC_PLANNING_FAILED');
      expect(error.retryable).toBe(true);
    });
  });

  describe('AIError', () => {
    it('should create rateLimitExceeded error', () => {
      const error = AIError.rateLimitExceeded(60);

      expect(error).toBeInstanceOf(AIError);
      expect(error.code).toBe('AI_RATE_LIMIT');
      expect(error.category).toBe('ai');
      expect(error.retryable).toBe(true);
      expect(error.details?.retryAfter).toBe(60);
    });

    it('should create timeout error', () => {
      const error = AIError.timeout();

      expect(error.code).toBe('AI_TIMEOUT');
      expect(error.retryable).toBe(true);
    });

    it('should create invalidResponse error', () => {
      const error = AIError.invalidResponse('no JSON');

      expect(error.code).toBe('AI_INVALID_RESPONSE');
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('no JSON');
    });

    it('should create overloaded error', () => {
      const error = AIError.overloaded();

      expect(error.code).toBe('AI_OVERLOADED');
      expect(error.retryable).toBe(true);
    });

    it('should create authenticationFailed error', () => {
      const error = AIError.authenticationFailed();

      expect(error.code).toBe('AI_AUTH_FAILED');
      expect(error.retryable).toBe(false);
    });
  });

  describe('DatabaseError', () => {
    it('should create connectionFailed error', () => {
      const error = DatabaseError.connectionFailed('timeout');

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.category).toBe('database');
      expect(error.retryable).toBe(true);
    });

    it('should create queryFailed error', () => {
      const error = DatabaseError.queryFailed('SELECT *', 'syntax error');

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.retryable).toBe(true);
    });

    it('should create notFound error', () => {
      const error = DatabaseError.notFound('Project', 'abc-123');

      expect(error.code).toBe('DB_NOT_FOUND');
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('Project');
      expect(error.message).toContain('abc-123');
    });
  });

  describe('ConfigurationError', () => {
    it('should create missingRequired error', () => {
      const error = ConfigurationError.missingRequired('ANTHROPIC_API_KEY');

      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.code).toBe('CONFIG_MISSING');
      expect(error.category).toBe('configuration');
      expect(error.retryable).toBe(false);
    });

    it('should create invalid error', () => {
      const error = ConfigurationError.invalid('PORT', 'abc', 'must be number');

      expect(error.code).toBe('CONFIG_INVALID');
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('PORT');
      expect(error.message).toContain('must be number');
    });
  });

  describe('categorizeError', () => {
    it('should return ContextEngineError as-is', () => {
      const original = new DocumentationError('test', 'TEST', false);
      const categorized = categorizeError(original);

      expect(categorized).toBe(original);
    });

    it('should categorize rate limit errors', () => {
      const error: any = new Error('Rate limit');
      error.type = 'rate_limit_error';

      const categorized = categorizeError(error);

      expect(categorized).toBeInstanceOf(AIError);
      expect(categorized.code).toBe('AI_RATE_LIMIT');
      expect(categorized.retryable).toBe(true);
    });

    it('should categorize 429 status as rate limit', () => {
      const error: any = new Error('Too many requests');
      error.status = 429;

      const categorized = categorizeError(error);

      expect(categorized).toBeInstanceOf(AIError);
      expect(categorized.code).toBe('AI_RATE_LIMIT');
    });

    it('should categorize overloaded errors', () => {
      const error: any = new Error('Server overloaded');
      error.type = 'overloaded_error';

      const categorized = categorizeError(error);

      expect(categorized).toBeInstanceOf(AIError);
      expect(categorized.code).toBe('AI_OVERLOADED');
      expect(categorized.retryable).toBe(true);
    });

    it('should categorize authentication errors', () => {
      const error: any = new Error('Invalid API key');
      error.type = 'authentication_error';

      const categorized = categorizeError(error);

      expect(categorized).toBeInstanceOf(AIError);
      expect(categorized.code).toBe('AI_AUTH_FAILED');
      expect(categorized.retryable).toBe(false);
    });

    it('should categorize 401 status as authentication error', () => {
      const error: any = new Error('Unauthorized');
      error.statusCode = 401;

      const categorized = categorizeError(error);

      expect(categorized).toBeInstanceOf(AIError);
      expect(categorized.code).toBe('AI_AUTH_FAILED');
    });

    it('should categorize timeout errors', () => {
      const error = new Error('Request timeout');

      const categorized = categorizeError(error);

      expect(categorized).toBeInstanceOf(AIError);
      expect(categorized.code).toBe('AI_TIMEOUT');
      expect(categorized.retryable).toBe(true);
    });

    it('should categorize database errors', () => {
      const error = new Error('Prisma client error');

      const categorized = categorizeError(error);

      expect(categorized).toBeInstanceOf(DatabaseError);
      expect(categorized.code).toBe('DB_QUERY_FAILED');
    });

    it('should categorize unknown errors', () => {
      const error = new Error('Something went wrong');

      const categorized = categorizeError(error);

      expect(categorized).toBeInstanceOf(ContextEngineError);
      expect(categorized.code).toBe('UNKNOWN_ERROR');
      expect(categorized.category).toBe('unknown');
    });

    it('should handle non-Error objects', () => {
      const categorized = categorizeError('string error');

      expect(categorized).toBeInstanceOf(ContextEngineError);
      expect(categorized.message).toBe('string error');
    });

    it('should handle null/undefined', () => {
      const categorized = categorizeError(null);

      expect(categorized).toBeInstanceOf(ContextEngineError);
    });
  });

  describe('formatErrorForLog', () => {
    it('should format ContextEngineError', () => {
      const error = new DocumentationError(
        'Failed',
        'DOC_FAILED',
        true,
        { path: 'test.mdx' }
      );

      const formatted = formatErrorForLog(error);

      expect(formatted).toEqual({
        name: 'DocumentationError',
        message: 'Failed',
        code: 'DOC_FAILED',
        category: 'documentation',
        retryable: true,
        details: { path: 'test.mdx' },
      });
    });

    it('should format standard Error', () => {
      const error = new Error('Standard error');

      const formatted = formatErrorForLog(error);

      expect(formatted).toHaveProperty('name', 'Error');
      expect(formatted).toHaveProperty('message', 'Standard error');
      expect(formatted).toHaveProperty('stack');
    });

    it('should format non-Error objects', () => {
      const formatted = formatErrorForLog('string error');

      expect(formatted).toHaveProperty('message', 'string error');
    });
  });
});

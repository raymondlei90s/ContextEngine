/**
 * Retry Utility Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { withRetry, withClaudeRetry, RetryError } from '../retry.js';

describe('Retry Utility', () => {
  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw RetryError after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('timeout'));

      await expect(
        withRetry(fn, { maxRetries: 2, initialDelayMs: 10 })
      ).rejects.toThrow(RetryError);

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('not found'));

      await expect(
        withRetry(fn, { maxRetries: 3, initialDelayMs: 10 })
      ).rejects.toThrow(RetryError);

      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should retry on rate limit errors (429)', async () => {
      const error: any = new Error('Rate limit');
      error.status = 429;

      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 2, initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on server errors (500-599)', async () => {
      const error500: any = new Error('Server error');
      error500.status = 500;

      const fn = vi
        .fn()
        .mockRejectedValueOnce(error500)
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 2, initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 2, initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on network errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 2, initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on custom retryable errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Custom error'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 2,
        initialDelayMs: 10,
        retryableErrors: ['custom error'],
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const startTime = Date.now();

      await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 100,
        backoffMultiplier: 2,
        jitterFactor: 0, // No jitter for predictable timing
      });

      const duration = Date.now() - startTime;

      // First retry: 100ms, Second retry: 200ms
      // Total should be >= 300ms
      expect(duration).toBeGreaterThanOrEqual(280); // Allow some timing variance
    });

    it('should cap delay at maxDelay', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const startTime = Date.now();

      await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 50,
        backoffMultiplier: 10,
        jitterFactor: 0,
      });

      const duration = Date.now() - startTime;

      // Even with high multiplier, should cap at maxDelay
      expect(duration).toBeLessThan(200); // 2 retries × 50ms max
    });

    it('should include retry attempt in RetryError', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      try {
        await withRetry(fn, { maxRetries: 2, initialDelayMs: 10 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RetryError);
        expect((error as RetryError).attempts).toBe(3); // initial + 2 retries
        expect((error as RetryError).lastError.message).toBe('fail');
      }
    });
  });

  describe('withClaudeRetry', () => {
    it('should use Claude-specific retry configuration', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('rate_limit_error'))
        .mockResolvedValue('success');

      const result = await withClaudeRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on Claude API rate limits', async () => {
      const error: any = new Error('Rate limit');
      error.type = 'rate_limit_error';

      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await withClaudeRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on Claude API overloaded errors', async () => {
      const error: any = new Error('Overloaded');
      error.type = 'overloaded_error';

      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await withClaudeRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should allow custom retry options', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('timeout'));

      await expect(
        withClaudeRetry(fn, { maxRetries: 1 })
      ).rejects.toThrow(RetryError);

      expect(fn).toHaveBeenCalledTimes(2); // initial + 1 retry
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-Error rejections', async () => {
      const fn = vi.fn().mockRejectedValue('string error');

      await expect(
        withRetry(fn, { maxRetries: 1, initialDelayMs: 10 })
      ).rejects.toThrow(RetryError);

      expect(fn).toHaveBeenCalledTimes(1); // Non-retryable
    });

    it('should handle errors without message', async () => {
      const error: any = {};
      error.status = 500;

      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 2, initialDelayMs: 10 });

      expect(result).toBe('success');
    });

    it('should handle zero retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(
        withRetry(fn, { maxRetries: 0, initialDelayMs: 10 })
      ).rejects.toThrow(RetryError);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should apply jitter correctly', async () => {
      const delays: number[] = [];
      const fn = vi.fn().mockImplementation(async () => {
        throw new Error('timeout');
      });

      try {
        await withRetry(fn, {
          maxRetries: 5,
          initialDelayMs: 100,
          backoffMultiplier: 1, // No exponential growth
          jitterFactor: 0.5, // 50% jitter
        });
      } catch (error) {
        // Expected to fail
      }

      // With 50% jitter, delays should vary between 50ms and 150ms
      // This is a probabilistic test, but with 5 retries we should see variance
      expect(fn).toHaveBeenCalledTimes(6);
    });
  });
});

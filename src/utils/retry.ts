/**
 * Retry Utility
 * Implements exponential backoff with jitter for API calls
 */

import logger from './logger.js';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterFactor?: number;
  retryableErrors?: string[];
}

export class RetryError extends Error {
  public readonly attempts: number;
  public readonly lastError: Error;

  constructor(attempts: number, lastError: Error) {
    super(`Failed after ${attempts} attempts: ${lastError.message}`);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorType = error.type?.toLowerCase() || '';
  const errorStatus = error.status || error.statusCode || 0;

  // Always retry on rate limits
  if (errorStatus === 429) return true;

  // Always retry on server errors
  if (errorStatus >= 500 && errorStatus < 600) return true;

  // Check custom retryable error messages
  for (const retryable of retryableErrors) {
    if (errorMessage.includes(retryable.toLowerCase()) || errorType.includes(retryable.toLowerCase())) {
      return true;
    }
  }

  // Retry on common transient errors
  const transientErrors = [
    'timeout',
    'econnreset',
    'econnrefused',
    'etimedout',
    'network error',
    'socket hang up',
    'overloaded',
  ];

  for (const transient of transientErrors) {
    if (errorMessage.includes(transient)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitterFactor: number
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter: random value between (1 - jitter) and (1 + jitter)
  const jitter = 1 + (Math.random() * 2 - 1) * jitterFactor;
  const delayWithJitter = cappedDelay * jitter;

  return Math.floor(delayWithJitter);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    jitterFactor = 0.1,
    retryableErrors = [],
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute the function
      const result = await fn();

      // Log success if this was a retry
      if (attempt > 0) {
        logger.info('Retry succeeded', { attempt, maxRetries });
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry = attempt < maxRetries && isRetryableError(error, retryableErrors);

      if (!shouldRetry) {
        // Log final failure
        logger.error('Operation failed (not retryable or max retries exceeded)', {
          attempt,
          maxRetries,
          error: lastError.message,
          retryable: isRetryableError(error, retryableErrors),
        });

        throw new RetryError(attempt + 1, lastError);
      }

      // Calculate delay for next retry
      const delay = calculateDelay(
        attempt,
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier,
        jitterFactor
      );

      logger.warn('Operation failed, retrying...', {
        attempt: attempt + 1,
        maxRetries,
        nextRetryInMs: delay,
        error: lastError.message,
      });

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never happen (safety check)
  throw new RetryError(maxRetries + 1, lastError || new Error('Unknown error'));
}

/**
 * Retry specifically for Claude API calls
 */
export async function withClaudeRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 3,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
    retryableErrors: [
      'rate_limit',
      'overloaded_error',
      'internal_server_error',
      'timeout',
    ],
    ...options,
  });
}

/**
 * Retry for database operations
 */
export async function withDatabaseRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 5,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    retryableErrors: [
      'connection',
      'timeout',
      'deadlock',
      'lock',
    ],
    ...options,
  });
}

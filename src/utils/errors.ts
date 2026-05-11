/**
 * Error Handling Utilities
 * Provides categorized errors with helpful messages
 */

/**
 * Base error for ContextEngine
 */
export class ContextEngineError extends Error {
  public readonly code: string;
  public readonly category: string;
  public readonly retryable: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    code: string,
    category: string,
    retryable: boolean = false,
    details?: any
  ) {
    super(message);
    this.name = 'ContextEngineError';
    this.code = code;
    this.category = category;
    this.retryable = retryable;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

/**
 * Repository-related errors
 */
export class RepositoryError extends ContextEngineError {
  constructor(message: string, code: string, retryable: boolean = false, details?: any) {
    super(message, code, 'repository', retryable, details);
    this.name = 'RepositoryError';
  }

  static notFound(repoUrl: string): RepositoryError {
    return new RepositoryError(
      `Repository not found: ${repoUrl}`,
      'REPO_NOT_FOUND',
      false,
      { repoUrl }
    );
  }

  static accessDenied(repoUrl: string): RepositoryError {
    return new RepositoryError(
      `Access denied to repository: ${repoUrl}`,
      'REPO_ACCESS_DENIED',
      false,
      { repoUrl }
    );
  }

  static cloneFailed(repoUrl: string, reason: string): RepositoryError {
    return new RepositoryError(
      `Failed to clone repository: ${reason}`,
      'REPO_CLONE_FAILED',
      true,
      { repoUrl, reason }
    );
  }

  static analysisFailed(repoUrl: string, reason: string): RepositoryError {
    return new RepositoryError(
      `Repository analysis failed: ${reason}`,
      'REPO_ANALYSIS_FAILED',
      true,
      { repoUrl, reason }
    );
  }
}

/**
 * Documentation generation errors
 */
export class DocumentationError extends ContextEngineError {
  constructor(message: string, code: string, retryable: boolean = false, details?: any) {
    super(message, code, 'documentation', retryable, details);
    this.name = 'DocumentationError';
  }

  static generationFailed(path: string, reason: string): DocumentationError {
    return new DocumentationError(
      `Documentation generation failed for ${path}: ${reason}`,
      'DOC_GENERATION_FAILED',
      true,
      { path, reason }
    );
  }

  static invalidContent(path: string, reason: string): DocumentationError {
    return new DocumentationError(
      `Invalid documentation content for ${path}: ${reason}`,
      'DOC_INVALID_CONTENT',
      false,
      { path, reason }
    );
  }

  static planningFailed(reason: string): DocumentationError {
    return new DocumentationError(
      `Documentation planning failed: ${reason}`,
      'DOC_PLANNING_FAILED',
      true,
      { reason }
    );
  }
}

/**
 * AI/Claude API errors
 */
export class AIError extends ContextEngineError {
  constructor(message: string, code: string, retryable: boolean = false, details?: any) {
    super(message, code, 'ai', retryable, details);
    this.name = 'AIError';
  }

  static rateLimitExceeded(retryAfter?: number): AIError {
    return new AIError(
      'Claude API rate limit exceeded',
      'AI_RATE_LIMIT',
      true,
      { retryAfter }
    );
  }

  static timeout(): AIError {
    return new AIError(
      'Claude API request timed out',
      'AI_TIMEOUT',
      true
    );
  }

  static invalidResponse(reason: string): AIError {
    return new AIError(
      `Invalid response from Claude: ${reason}`,
      'AI_INVALID_RESPONSE',
      false,
      { reason }
    );
  }

  static overloaded(): AIError {
    return new AIError(
      'Claude API is overloaded',
      'AI_OVERLOADED',
      true
    );
  }

  static authenticationFailed(): AIError {
    return new AIError(
      'Claude API authentication failed',
      'AI_AUTH_FAILED',
      false
    );
  }
}

/**
 * Database errors
 */
export class DatabaseError extends ContextEngineError {
  constructor(message: string, code: string, retryable: boolean = false, details?: any) {
    super(message, code, 'database', retryable, details);
    this.name = 'DatabaseError';
  }

  static connectionFailed(reason: string): DatabaseError {
    return new DatabaseError(
      `Database connection failed: ${reason}`,
      'DB_CONNECTION_FAILED',
      true,
      { reason }
    );
  }

  static queryFailed(query: string, reason: string): DatabaseError {
    return new DatabaseError(
      `Database query failed: ${reason}`,
      'DB_QUERY_FAILED',
      true,
      { query, reason }
    );
  }

  static notFound(entity: string, id: string): DatabaseError {
    return new DatabaseError(
      `${entity} not found: ${id}`,
      'DB_NOT_FOUND',
      false,
      { entity, id }
    );
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ContextEngineError {
  constructor(message: string, code: string, details?: any) {
    super(message, code, 'configuration', false, details);
    this.name = 'ConfigurationError';
  }

  static missingRequired(key: string): ConfigurationError {
    return new ConfigurationError(
      `Missing required configuration: ${key}`,
      'CONFIG_MISSING',
      { key }
    );
  }

  static invalid(key: string, value: any, reason: string): ConfigurationError {
    return new ConfigurationError(
      `Invalid configuration for ${key}: ${reason}`,
      'CONFIG_INVALID',
      { key, value, reason }
    );
  }
}

/**
 * Categorize any error into a ContextEngineError
 */
export function categorizeError(error: any): ContextEngineError {
  // Already a ContextEngineError
  if (error instanceof ContextEngineError) {
    return error;
  }

  const message = error?.message || String(error);
  const statusCode = error?.status || error?.statusCode;

  // Claude API errors
  if (error?.type?.includes('rate_limit') || statusCode === 429) {
    return AIError.rateLimitExceeded(error?.retry_after);
  }

  if (error?.type?.includes('overloaded')) {
    return AIError.overloaded();
  }

  if (error?.type?.includes('authentication') || statusCode === 401) {
    return AIError.authenticationFailed();
  }

  if (message.toLowerCase().includes('timeout')) {
    return AIError.timeout();
  }

  // Database errors
  if (message.toLowerCase().includes('database') || message.toLowerCase().includes('prisma')) {
    return DatabaseError.queryFailed('unknown', message);
  }

  // Default: unknown error
  return new ContextEngineError(
    message,
    'UNKNOWN_ERROR',
    'unknown',
    false,
    { originalError: error }
  );
}

/**
 * Format error for logging
 */
export function formatErrorForLog(error: any): Record<string, any> {
  if (error instanceof ContextEngineError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      category: error.category,
      retryable: error.retryable,
      details: error.details,
    };
  }

  return {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    stack: error?.stack,
  };
}

/**
 * Claude Response Cache Service
 * Caches Claude API responses in Redis to reduce token costs
 */

import Redis from 'ioredis';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { config } from '../core/config.js';

export interface CachedResponse {
  content: string;
  tokensUsed: number;
  cachedAt: string;
}

export class ClaudeCache {
  private redis: Redis;
  private enabled: boolean;
  private ttl: number; // Time to live in seconds

  constructor(options?: { enabled?: boolean; ttl?: number }) {
    this.enabled = options?.enabled ?? config.features.enableLearningLoop; // Use learning loop flag for caching
    this.ttl = options?.ttl ?? 7 * 24 * 60 * 60; // Default: 7 days

    if (this.enabled) {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        keyPrefix: 'claude-cache:',
        maxRetriesPerRequest: 3,
      });

      this.redis.on('error', (error) => {
        logger.error('Redis cache error', { error: error.message });
      });

      logger.info('Claude cache enabled', { ttl: this.ttl });
    } else {
      logger.info('Claude cache disabled');
    }
  }

  /**
   * Generate cache key from prompt and model
   */
  private generateKey(model: string, systemPrompt: string, userPrompt: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(model);
    hash.update(systemPrompt);
    hash.update(userPrompt);
    return hash.digest('hex');
  }

  /**
   * Get cached response
   */
  async get(
    model: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<CachedResponse | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const key = this.generateKey(model, systemPrompt, userPrompt);
      const cached = await this.redis.get(key);

      if (!cached) {
        logger.debug('Cache miss', { key: key.substring(0, 16) });
        return null;
      }

      const response = JSON.parse(cached) as CachedResponse;

      logger.info('Cache hit', {
        key: key.substring(0, 16),
        tokensUsed: response.tokensUsed,
        cachedAt: response.cachedAt,
      });

      return response;
    } catch (error) {
      logger.error('Cache get error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set cached response
   */
  async set(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    content: string,
    tokensUsed: number
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const key = this.generateKey(model, systemPrompt, userPrompt);

      const response: CachedResponse = {
        content,
        tokensUsed,
        cachedAt: new Date().toISOString(),
      };

      await this.redis.setex(key, this.ttl, JSON.stringify(response));

      logger.debug('Cache set', {
        key: key.substring(0, 16),
        tokensUsed,
        ttl: this.ttl,
      });
    } catch (error) {
      logger.error('Cache set error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clear cache for a specific prompt
   */
  async clear(model: string, systemPrompt: string, userPrompt: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const key = this.generateKey(model, systemPrompt, userPrompt);
      await this.redis.del(key);

      logger.info('Cache cleared', { key: key.substring(0, 16) });
    } catch (error) {
      logger.error('Cache clear error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clear all cached responses
   */
  async clearAll(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const keys = await this.redis.keys('*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      logger.info('All cache cleared', { keysDeleted: keys.length });
    } catch (error) {
      logger.error('Cache clear all error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    totalSize: number;
    enabled: boolean;
    ttl: number;
  }> {
    if (!this.enabled) {
      return { totalKeys: 0, totalSize: 0, enabled: false, ttl: 0 };
    }

    try {
      const keys = await this.redis.keys('*');
      let totalSize = 0;

      for (const key of keys) {
        const value = await this.redis.get(key);
        if (value) {
          totalSize += Buffer.byteLength(value, 'utf8');
        }
      }

      return {
        totalKeys: keys.length,
        totalSize,
        enabled: this.enabled,
        ttl: this.ttl,
      };
    } catch (error) {
      logger.error('Cache stats error', {
        error: error instanceof Error ? error.message : String(error),
      });

      return { totalKeys: 0, totalSize: 0, enabled: this.enabled, ttl: this.ttl };
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.enabled && this.redis) {
      await this.redis.quit();
      logger.info('Claude cache disconnected');
    }
  }
}

// Singleton instance
export const claudeCache = new ClaudeCache();

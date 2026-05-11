/**
 * Embedding Generation Service
 * Generates vector embeddings for text using various providers
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../core/config.js';
import logger from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

export type EmbeddingProvider = 'voyage' | 'openai' | 'mock';

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  tokensUsed?: number;
}

export class EmbeddingGenerator {
  private provider: EmbeddingProvider;
  private client?: any;

  constructor(provider: EmbeddingProvider = 'mock') {
    this.provider = provider;

    if (provider === 'voyage' && process.env.VOYAGE_API_KEY) {
      // Voyage AI client would be initialized here
      logger.info('Embedding generator initialized', { provider: 'voyage' });
    } else if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      // OpenAI client would be initialized here
      logger.info('Embedding generator initialized', { provider: 'openai' });
    } else {
      logger.info('Embedding generator initialized', { provider: 'mock' });
      this.provider = 'mock';
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    logger.debug('Generating embedding', {
      textLength: text.length,
      provider: this.provider,
    });

    try {
      switch (this.provider) {
        case 'voyage':
          return await this.generateVoyageEmbedding(text);
        case 'openai':
          return await this.generateOpenAIEmbedding(text);
        default:
          return this.generateMockEmbedding(text);
      }
    } catch (error) {
      logger.error('Failed to generate embedding', {
        provider: this.provider,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    logger.info('Generating batch embeddings', {
      batchSize: texts.length,
      provider: this.provider,
    });

    const results: EmbeddingResult[] = [];

    // Process in batches of 10 to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map((text) => this.generateEmbedding(text))
      );

      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    logger.info('Batch embeddings complete', {
      totalEmbeddings: results.length,
    });

    return results;
  }

  /**
   * Generate embedding using Voyage AI
   */
  private async generateVoyageEmbedding(text: string): Promise<EmbeddingResult> {
    // Voyage AI integration would go here
    // For now, using mock
    //
    // Example with Voyage AI:
    // const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`
    //   },
    //   body: JSON.stringify({
    //     input: text,
    //     model: 'voyage-code-2' // Optimized for code
    //   })
    // });
    //
    // const data = await response.json();
    // return {
    //   embedding: data.data[0].embedding,
    //   dimensions: data.data[0].embedding.length,
    //   model: 'voyage-code-2',
    //   tokensUsed: data.usage?.total_tokens
    // };

    logger.warn('Voyage AI not configured, using mock embeddings');
    return this.generateMockEmbedding(text);
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
    // OpenAI integration would go here
    //
    // Example with OpenAI:
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // const response = await openai.embeddings.create({
    //   model: 'text-embedding-3-small',
    //   input: text
    // });
    //
    // return {
    //   embedding: response.data[0].embedding,
    //   dimensions: response.data[0].embedding.length,
    //   model: 'text-embedding-3-small',
    //   tokensUsed: response.usage?.total_tokens
    // };

    logger.warn('OpenAI not configured, using mock embeddings');
    return this.generateMockEmbedding(text);
  }

  /**
   * Generate mock embedding (for development/testing)
   * Uses simple text features to create a deterministic embedding
   */
  private generateMockEmbedding(text: string): EmbeddingResult {
    const dimensions = 384; // Standard small embedding size
    const embedding = new Array(dimensions).fill(0);

    // Simple hashing-based approach for deterministic embeddings
    const words = text.toLowerCase().split(/\s+/);

    // Feature 1: Word frequency distribution
    for (let i = 0; i < Math.min(words.length, 100); i++) {
      const word = words[i];
      const hash = this.hashString(word);
      const index = Math.abs(hash) % dimensions;
      embedding[index] += 1.0;
    }

    // Feature 2: Character n-grams
    for (let i = 0; i < Math.min(text.length - 2, 100); i++) {
      const trigram = text.substring(i, i + 3);
      const hash = this.hashString(trigram);
      const index = Math.abs(hash) % dimensions;
      embedding[index] += 0.5;
    }

    // Feature 3: Text length signal
    const lengthBucket = Math.floor(Math.log(text.length + 1) / Math.log(2));
    embedding[lengthBucket % dimensions] += 2.0;

    // Normalize to unit vector
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return {
      embedding,
      dimensions,
      model: 'mock-embedding-v1',
    };
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get embedding provider info
   */
  getProviderInfo(): { provider: EmbeddingProvider; dimensions: number; model: string } {
    switch (this.provider) {
      case 'voyage':
        return { provider: 'voyage', dimensions: 1024, model: 'voyage-code-2' };
      case 'openai':
        return { provider: 'openai', dimensions: 1536, model: 'text-embedding-3-small' };
      default:
        return { provider: 'mock', dimensions: 384, model: 'mock-embedding-v1' };
    }
  }
}

// Singleton instance
export const embeddingGenerator = new EmbeddingGenerator(
  (process.env.EMBEDDING_PROVIDER as EmbeddingProvider) || 'mock'
);

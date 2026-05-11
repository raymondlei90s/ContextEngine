/**
 * LLM Documentation Enhancer
 * Uses Claude AI to generate intelligent, context-aware documentation
 */

import Anthropic from '@anthropic-ai/sdk';
import logger from '../utils/logger.js';
import { knowledgeGraphService } from './knowledge-graph.js';

export interface LLMEnhancementOptions {
  includeContext?: boolean;
  includeExamples?: boolean;
  tone?: 'technical' | 'beginner-friendly' | 'concise';
  maxTokens?: number;
}

export interface EnhancedDescription {
  original: string | null;
  enhanced: string;
  confidence: number;
  metadata: {
    modelUsed: string;
    tokensUsed: number;
    generatedAt: Date;
  };
}

export interface CodeExample {
  language: string;
  code: string;
  description: string;
}

export class LLMDocEnhancer {
  private client: Anthropic | null = null;
  private enabled: boolean = false;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.enabled = true;
      logger.info('LLM documentation enhancer initialized');
    } else {
      logger.warn('ANTHROPIC_API_KEY not set, LLM features disabled');
    }
  }

  /**
   * Check if LLM features are available
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate enhanced description for an entity
   */
  async enhanceDescription(
    entityId: string,
    options: LLMEnhancementOptions = {}
  ): Promise<EnhancedDescription> {
    if (!this.enabled || !this.client) {
      throw new Error('LLM features not enabled. Set ANTHROPIC_API_KEY environment variable.');
    }

    logger.info('Enhancing description with LLM', { entityId });

    const entity = await knowledgeGraphService.getEntityWithRelationships(entityId);

    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    let contextInfo = '';
    if (options.includeContext) {
      contextInfo = await this.buildContextPrompt(entity);
    }

    const tone = options.tone || 'technical';
    const toneInstructions = this.getToneInstructions(tone);

    const prompt = `You are a technical documentation expert. Generate a clear, ${tone} description for the following code entity.

Entity Information:
- Name: ${entity.name}
- Type: ${entity.type}
- File: ${entity.filePath || 'N/A'}
${entity.description ? `- Current Description: ${entity.description}` : ''}

${contextInfo}

${toneInstructions}

Generate a comprehensive description that explains:
1. What this entity is
2. What it does
3. When/why it should be used

Keep the description between 2-4 sentences. Be clear and concise.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const enhanced = response.content[0].type === 'text' ? response.content[0].text : '';

      const result: EnhancedDescription = {
        original: entity.description,
        enhanced: enhanced.trim(),
        confidence: 0.85,
        metadata: {
          modelUsed: 'claude-3-5-sonnet-20241022',
          tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
          generatedAt: new Date(),
        },
      };

      logger.info('Description enhanced', {
        entityId,
        tokensUsed: result.metadata.tokensUsed,
        originalLength: entity.description?.length || 0,
        enhancedLength: enhanced.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to enhance description', {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate code examples for an entity
   */
  async generateExamples(
    entityId: string,
    count: number = 2
  ): Promise<CodeExample[]> {
    if (!this.enabled || !this.client) {
      throw new Error('LLM features not enabled. Set ANTHROPIC_API_KEY environment variable.');
    }

    logger.info('Generating code examples with LLM', { entityId, count });

    const entity = await knowledgeGraphService.getEntityWithRelationships(entityId);

    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    const contextInfo = await this.buildContextPrompt(entity);

    const prompt = `You are a code documentation expert. Generate ${count} practical code examples for the following entity.

Entity Information:
- Name: ${entity.name}
- Type: ${entity.type}
- File: ${entity.filePath || 'N/A'}
${entity.description ? `- Description: ${entity.description}` : ''}

${contextInfo}

For each example, provide:
1. A brief description of what the example demonstrates
2. Clean, working code that shows proper usage
3. Comments explaining key parts

Return examples in this format:
EXAMPLE 1: [Brief description]
\`\`\`[language]
[code here]
\`\`\`

EXAMPLE 2: [Brief description]
\`\`\`[language]
[code here]
\`\`\``;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';

      const examples = this.parseExamples(content, entity.type);

      logger.info('Examples generated', {
        entityId,
        exampleCount: examples.length,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      });

      return examples;
    } catch (error) {
      logger.error('Failed to generate examples', {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Batch enhance multiple entities
   */
  async batchEnhance(
    entityIds: string[],
    options: LLMEnhancementOptions = {}
  ): Promise<Map<string, EnhancedDescription>> {
    logger.info('Batch enhancing descriptions', { count: entityIds.length });

    const results = new Map<string, EnhancedDescription>();
    const batchSize = 5;

    for (let i = 0; i < entityIds.length; i += batchSize) {
      const batch = entityIds.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (entityId) => {
          try {
            const enhanced = await this.enhanceDescription(entityId, options);
            results.set(entityId, enhanced);

            await this.delay(200);
          } catch (error) {
            logger.error('Failed to enhance entity in batch', {
              entityId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );

      if (i + batchSize < entityIds.length) {
        await this.delay(1000);
      }
    }

    logger.info('Batch enhancement complete', {
      total: entityIds.length,
      successful: results.size,
    });

    return results;
  }

  /**
   * Build context prompt from entity relationships
   */
  private async buildContextPrompt(entity: any): Promise<string> {
    const lines: string[] = [];

    if (entity.outgoingRelationships && entity.outgoingRelationships.length > 0) {
      lines.push('\nDependencies:');
      const imports = entity.outgoingRelationships.filter((r: any) => r.type === 'imports');
      const uses = entity.outgoingRelationships.filter((r: any) => r.type === 'uses');

      if (imports.length > 0) {
        lines.push('- Imports: ' + imports.map((r: any) => r.target?.name).join(', '));
      }
      if (uses.length > 0) {
        lines.push('- Uses: ' + uses.map((r: any) => r.target?.name).join(', '));
      }
    }

    if (entity.incomingRelationships && entity.incomingRelationships.length > 0) {
      lines.push('\nUsed by:');
      const topUsers = entity.incomingRelationships
        .slice(0, 5)
        .map((r: any) => r.source?.name)
        .join(', ');
      lines.push(`- ${topUsers}`);
      if (entity.incomingRelationships.length > 5) {
        lines.push(`  (and ${entity.incomingRelationships.length - 5} more)`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get tone-specific instructions
   */
  private getToneInstructions(tone: string): string {
    switch (tone) {
      case 'beginner-friendly':
        return 'Use simple language that a beginner can understand. Avoid jargon and explain concepts clearly.';
      case 'concise':
        return 'Be extremely concise. Use the minimum words necessary while maintaining clarity.';
      case 'technical':
      default:
        return 'Use precise technical language appropriate for experienced developers.';
    }
  }

  /**
   * Parse examples from LLM response
   */
  private parseExamples(content: string, entityType: string): CodeExample[] {
    const examples: CodeExample[] = [];

    const exampleRegex = /EXAMPLE \d+: ([^\n]+)\n```(\w+)\n([\s\S]+?)```/g;
    let match;

    while ((match = exampleRegex.exec(content)) !== null) {
      examples.push({
        description: match[1].trim(),
        language: match[2],
        code: match[3].trim(),
      });
    }

    if (examples.length === 0) {
      const codeBlockRegex = /```(\w+)\n([\s\S]+?)```/g;

      while ((match = codeBlockRegex.exec(content)) !== null) {
        examples.push({
          description: `Example usage of ${entityType}`,
          language: match[1],
          code: match[2].trim(),
        });
      }
    }

    return examples;
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const llmDocEnhancer = new LLMDocEnhancer();

/**
 * Documentation Service (API)
 * Provides documentation generation and analysis operations
 */

import { Injectable } from '@nestjs/common';
import { documentationGenerator } from '../../services/documentation-generator.js';
import { documentationAnalyzer } from '../../services/documentation-analyzer.js';
import { llmDocEnhancer } from '../../services/llm-doc-enhancer.js';
import type { DocumentationOptions } from '../../services/documentation-generator.js';
import type { LLMEnhancementOptions } from '../../services/llm-doc-enhancer.js';

@Injectable()
export class DocumentationService {
  /**
   * Generate documentation for entity
   */
  async generateForEntity(entityId: string, options: DocumentationOptions) {
    return await documentationGenerator.generateForEntity(entityId, options);
  }

  /**
   * Generate documentation for project
   */
  async generateForProject(projectId: string, options: DocumentationOptions) {
    return await documentationGenerator.generateForProject(projectId, options);
  }

  /**
   * Generate documentation index
   */
  async generateIndex(projectId: string) {
    return await documentationGenerator.generateIndex(projectId);
  }

  /**
   * Analyze coverage
   */
  async analyzeCoverage(projectId: string) {
    return await documentationAnalyzer.analyzeCoverage(projectId);
  }

  /**
   * Analyze quality
   */
  async analyzeQuality(entityId: string) {
    return await documentationAnalyzer.analyzeQuality(entityId);
  }

  /**
   * Detect staleness
   */
  async detectStaleness(projectId: string, thresholdDays: number) {
    return await documentationAnalyzer.detectStaleness(projectId, thresholdDays);
  }

  /**
   * Find missing relationships
   */
  async findMissingRelationships(projectId: string) {
    return await documentationAnalyzer.findMissingRelationships(projectId);
  }

  /**
   * Get project health
   */
  async getProjectHealth(projectId: string) {
    return await documentationAnalyzer.getProjectHealth(projectId);
  }

  /**
   * Enhance description with LLM
   */
  async enhanceDescription(entityId: string, options: LLMEnhancementOptions) {
    return await llmDocEnhancer.enhanceDescription(entityId, options);
  }

  /**
   * Generate examples with LLM
   */
  async generateExamples(entityId: string, count: number) {
    return await llmDocEnhancer.generateExamples(entityId, count);
  }

  /**
   * Batch enhance
   */
  async batchEnhance(entityIds: string[], options: LLMEnhancementOptions) {
    const results = await llmDocEnhancer.batchEnhance(entityIds, options);

    return Object.fromEntries(results);
  }

  /**
   * Get LLM status
   */
  async getLLMStatus() {
    return {
      enabled: llmDocEnhancer.isEnabled(),
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
    };
  }
}

/**
 * Documentation Controller
 * API endpoints for documentation generation and analysis
 */

import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { DocumentationService } from './documentation.service.js';

@Controller('documentation')
export class DocumentationController {
  constructor(private readonly documentationService: DocumentationService) {}

  /**
   * Generate documentation for a single entity
   */
  @Post('generate/entity/:entityId')
  async generateForEntity(
    @Param('entityId') entityId: string,
    @Body()
    body: {
      format?: 'markdown' | 'jsdoc' | 'openapi';
      includeRelationships?: boolean;
      includeExamples?: boolean;
      includeMetadata?: boolean;
    }
  ) {
    return await this.documentationService.generateForEntity(entityId, body);
  }

  /**
   * Generate documentation for entire project
   */
  @Post('generate/project/:projectId')
  async generateForProject(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      format?: 'markdown' | 'jsdoc' | 'openapi';
      includeRelationships?: boolean;
      includeExamples?: boolean;
      includeMetadata?: boolean;
    }
  ) {
    return await this.documentationService.generateForProject(projectId, body);
  }

  /**
   * Generate documentation index
   */
  @Get('index/:projectId')
  async generateIndex(@Param('projectId') projectId: string) {
    return await this.documentationService.generateIndex(projectId);
  }

  /**
   * Analyze documentation coverage
   */
  @Get('coverage/:projectId')
  async analyzeCoverage(@Param('projectId') projectId: string) {
    return await this.documentationService.analyzeCoverage(projectId);
  }

  /**
   * Analyze documentation quality for entity
   */
  @Get('quality/:entityId')
  async analyzeQuality(@Param('entityId') entityId: string) {
    return await this.documentationService.analyzeQuality(entityId);
  }

  /**
   * Detect stale documentation
   */
  @Get('staleness/:projectId')
  async detectStaleness(
    @Param('projectId') projectId: string,
    @Query('thresholdDays') thresholdDays?: string
  ) {
    return await this.documentationService.detectStaleness(
      projectId,
      thresholdDays ? parseInt(thresholdDays) : 30
    );
  }

  /**
   * Find entities with missing relationships
   */
  @Get('missing-relationships/:projectId')
  async findMissingRelationships(@Param('projectId') projectId: string) {
    return await this.documentationService.findMissingRelationships(projectId);
  }

  /**
   * Get project health report
   */
  @Get('health/:projectId')
  async getProjectHealth(@Param('projectId') projectId: string) {
    return await this.documentationService.getProjectHealth(projectId);
  }

  /**
   * Enhance description with LLM
   */
  @Post('enhance/:entityId')
  async enhanceDescription(
    @Param('entityId') entityId: string,
    @Body()
    body: {
      includeContext?: boolean;
      includeExamples?: boolean;
      tone?: 'technical' | 'beginner-friendly' | 'concise';
      maxTokens?: number;
    }
  ) {
    return await this.documentationService.enhanceDescription(entityId, body);
  }

  /**
   * Generate code examples with LLM
   */
  @Post('examples/:entityId')
  async generateExamples(
    @Param('entityId') entityId: string,
    @Query('count') count?: string
  ) {
    return await this.documentationService.generateExamples(
      entityId,
      count ? parseInt(count) : 2
    );
  }

  /**
   * Batch enhance multiple entities
   */
  @Post('batch-enhance')
  async batchEnhance(
    @Body()
    body: {
      entityIds: string[];
      includeContext?: boolean;
      includeExamples?: boolean;
      tone?: 'technical' | 'beginner-friendly' | 'concise';
      maxTokens?: number;
    }
  ) {
    return await this.documentationService.batchEnhance(body.entityIds, {
      includeContext: body.includeContext,
      includeExamples: body.includeExamples,
      tone: body.tone,
      maxTokens: body.maxTokens,
    });
  }

  /**
   * Check if LLM features are available
   */
  @Get('llm/status')
  async getLLMStatus() {
    return await this.documentationService.getLLMStatus();
  }
}

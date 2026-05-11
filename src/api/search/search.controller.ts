/**
 * Search Controller
 * Semantic search and knowledge graph queries
 */

import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { SearchService } from './search.service.js';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Semantic search across project entities
   */
  @Get('semantic')
  async semanticSearch(
    @Query('projectId') projectId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string
  ) {
    return await this.searchService.semanticSearch(
      projectId,
      query,
      limit ? parseInt(limit) : 10
    );
  }

  /**
   * Find entities related to a given entity
   */
  @Get('related/:entityId')
  async findRelated(
    @Param('entityId') entityId: string,
    @Query('limit') limit?: string
  ) {
    return await this.searchService.findRelated(
      entityId,
      limit ? parseInt(limit) : 10
    );
  }

  /**
   * Get entity details with relationships
   */
  @Get('entity/:entityId')
  async getEntity(@Param('entityId') entityId: string) {
    return await this.searchService.getEntity(entityId);
  }

  /**
   * Build knowledge graph for a project
   */
  @Post('build/:projectId')
  async buildKnowledgeGraph(@Param('projectId') projectId: string) {
    return await this.searchService.buildKnowledgeGraph(projectId);
  }

  /**
   * Get knowledge graph statistics
   */
  @Get('stats/:projectId')
  async getStatistics(@Param('projectId') projectId: string) {
    return await this.searchService.getStatistics(projectId);
  }
}

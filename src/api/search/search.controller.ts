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

  /**
   * Analyze dependency chains for an entity
   */
  @Get('dependencies/:entityId')
  async analyzeDependencies(
    @Param('entityId') entityId: string,
    @Query('projectId') projectId: string,
    @Query('maxDepth') maxDepth?: string
  ) {
    return await this.searchService.analyzeDependencies(
      projectId,
      entityId,
      maxDepth ? parseInt(maxDepth) : 3
    );
  }

  /**
   * Generate graph visualization data
   */
  @Get('graph/:projectId')
  async getGraphVisualization(
    @Param('projectId') projectId: string,
    @Query('entityTypes') entityTypes?: string,
    @Query('relationshipTypes') relationshipTypes?: string,
    @Query('maxNodes') maxNodes?: string
  ) {
    const options: any = {};

    if (entityTypes) {
      options.entityTypes = entityTypes.split(',');
    }

    if (relationshipTypes) {
      options.relationshipTypes = relationshipTypes.split(',');
    }

    if (maxNodes) {
      options.maxNodes = parseInt(maxNodes);
    }

    return await this.searchService.getGraphVisualization(projectId, options);
  }

  /**
   * Find critical entities (high connectivity)
   */
  @Get('critical/:projectId')
  async findCriticalEntities(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string
  ) {
    return await this.searchService.findCriticalEntities(
      projectId,
      limit ? parseInt(limit) : 10
    );
  }

  /**
   * Find orphaned entities (no relationships)
   */
  @Get('orphaned/:projectId')
  async findOrphanedEntities(@Param('projectId') projectId: string) {
    return await this.searchService.findOrphanedEntities(projectId);
  }

  /**
   * Get relationship statistics
   */
  @Get('relationship-stats/:projectId')
  async getRelationshipStatistics(@Param('projectId') projectId: string) {
    return await this.searchService.getRelationshipStatistics(projectId);
  }
}

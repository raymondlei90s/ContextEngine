/**
 * Search Service (API)
 * Provides search and knowledge graph operations
 */

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { knowledgeGraphService } from '../../services/knowledge-graph.js';

const prisma = new PrismaClient();

@Injectable()
export class SearchService {
  /**
   * Semantic search
   */
  async semanticSearch(projectId: string, query: string, limit: number = 10) {
    return await knowledgeGraphService.semanticSearch(projectId, query, limit);
  }

  /**
   * Find related entities
   */
  async findRelated(entityId: string, limit: number = 10) {
    return await knowledgeGraphService.findRelated(entityId, limit);
  }

  /**
   * Get entity with relationships
   */
  async getEntity(entityId: string) {
    return await knowledgeGraphService.getEntityWithRelationships(entityId);
  }

  /**
   * Build knowledge graph
   */
  async buildKnowledgeGraph(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // For now, assume repoUrl is a local path or we've cloned it
    // In production, you'd clone the repo first
    const repoPath = project.repoUrl.replace('https://github.com/', '/tmp/repos/');

    return await knowledgeGraphService.buildFromRepository(projectId, repoPath);
  }

  /**
   * Get statistics
   */
  async getStatistics(projectId: string) {
    return await knowledgeGraphService.getStatistics(projectId);
  }
}

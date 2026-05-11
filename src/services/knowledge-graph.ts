/**
 * Knowledge Graph Service
 * Builds and queries the knowledge graph of code entities and relationships
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import { EntityExtractor, CodeEntity } from './entity-extractor.js';
import { embeddingGenerator } from './embedding-generator.js';
import { metricsService } from './metrics.js';

const prisma = new PrismaClient();

export interface KnowledgeGraphBuildResult {
  entitiesCreated: number;
  relationshipsCreated: number;
  duration: number;
}

export interface SemanticSearchResult {
  entity: {
    id: string;
    name: string;
    type: string;
    description: string;
    filePath: string;
    metadata: any;
  };
  similarity: number;
  rank: number;
}

export class KnowledgeGraphService {
  private extractor: EntityExtractor;

  constructor() {
    this.extractor = new EntityExtractor();
  }

  /**
   * Build knowledge graph from a repository
   */
  async buildFromRepository(
    projectId: string,
    repoPath: string
  ): Promise<KnowledgeGraphBuildResult> {
    const startTime = Date.now();

    logger.info('Building knowledge graph', { projectId, repoPath });

    try {
      // 1. Extract entities and relationships
      const { entities, relationships } = await this.extractor.extractFromDirectory(
        repoPath
      );

      logger.info('Entities extracted', {
        total: entities.length,
        byType: this.countByType(entities),
      });

      // 2. Generate embeddings for all entities
      const descriptions = entities.map(
        (e) => `${e.name}: ${e.description} (${e.type})`
      );

      const embeddings = await embeddingGenerator.generateBatchEmbeddings(descriptions);

      logger.info('Embeddings generated', { total: embeddings.length });

      // 3. Store entities in database
      let entitiesCreated = 0;

      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const embedding = embeddings[i];

        try {
          await prisma.knowledgeEntity.create({
            data: {
              projectId,
              type: entity.type,
              name: entity.name,
              description: entity.description,
              filePath: entity.filePath,
              lineNumber: entity.lineNumber,
              signature: entity.signature,
              metadata: entity.metadata as any,
              embedding: embedding.embedding, // pgvector column
            },
          });

          entitiesCreated++;
        } catch (error) {
          logger.warn('Failed to create entity', {
            entityId: entity.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // 4. Store relationships
      let relationshipsCreated = 0;

      for (const rel of relationships) {
        try {
          // Find source entity
          const sourceEntity = await prisma.knowledgeEntity.findFirst({
            where: {
              projectId,
              OR: [
                { filePath: rel.from },
                { name: rel.from.split(':').pop() },
              ],
            },
          });

          // Find target entity (might be external)
          const targetEntity = await prisma.knowledgeEntity.findFirst({
            where: {
              projectId,
              name: rel.to,
            },
          });

          if (sourceEntity) {
            await prisma.relationship.create({
              data: {
                projectId,
                sourceId: sourceEntity.id,
                targetId: targetEntity?.id,
                targetName: rel.to,
                type: rel.type,
              },
            });

            relationshipsCreated++;
          }
        } catch (error) {
          // Skip duplicate or invalid relationships
        }
      }

      const duration = Date.now() - startTime;

      logger.info('Knowledge graph built', {
        projectId,
        entitiesCreated,
        relationshipsCreated,
        duration,
      });

      return {
        entitiesCreated,
        relationshipsCreated,
        duration,
      };
    } catch (error) {
      logger.error('Failed to build knowledge graph', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Semantic search for entities
   */
  async semanticSearch(
    projectId: string,
    query: string,
    limit: number = 10
  ): Promise<SemanticSearchResult[]> {
    logger.info('Semantic search', { projectId, query, limit });

    try {
      // Generate embedding for query
      const queryEmbedding = await embeddingGenerator.generateEmbedding(query);

      // Semantic search using pgvector
      // Note: This uses raw SQL because Prisma doesn't natively support pgvector operators yet
      const results = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          name,
          type,
          description,
          "filePath",
          metadata,
          1 - (embedding <=> ${queryEmbedding.embedding}::vector) as similarity
        FROM knowledge_entities
        WHERE "projectId" = ${projectId}
        ORDER BY embedding <=> ${queryEmbedding.embedding}::vector
        LIMIT ${limit}
      `;

      const searchResults: SemanticSearchResult[] = results.map((r, index) => ({
        entity: {
          id: r.id,
          name: r.name,
          type: r.type,
          description: r.description,
          filePath: r.filePath,
          metadata: r.metadata,
        },
        similarity: r.similarity,
        rank: index + 1,
      }));

      logger.info('Semantic search complete', {
        query,
        resultsFound: searchResults.length,
      });

      return searchResults;
    } catch (error) {
      logger.error('Semantic search failed', {
        projectId,
        query,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Find related entities
   */
  async findRelated(
    entityId: string,
    limit: number = 10
  ): Promise<SemanticSearchResult[]> {
    logger.info('Finding related entities', { entityId, limit });

    try {
      // Get the source entity
      const entity = await prisma.knowledgeEntity.findUnique({
        where: { id: entityId },
      });

      if (!entity) {
        throw new Error(`Entity not found: ${entityId}`);
      }

      // Find similar entities using embedding similarity
      const results = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          name,
          type,
          description,
          "filePath",
          metadata,
          1 - (embedding <=> ${entity.embedding}::vector) as similarity
        FROM knowledge_entities
        WHERE "projectId" = ${entity.projectId}
          AND id != ${entityId}
        ORDER BY embedding <=> ${entity.embedding}::vector
        LIMIT ${limit}
      `;

      const relatedEntities: SemanticSearchResult[] = results.map((r, index) => ({
        entity: {
          id: r.id,
          name: r.name,
          type: r.type,
          description: r.description,
          filePath: r.filePath,
          metadata: r.metadata,
        },
        similarity: r.similarity,
        rank: index + 1,
      }));

      logger.info('Related entities found', {
        entityId,
        resultsFound: relatedEntities.length,
      });

      return relatedEntities;
    } catch (error) {
      logger.error('Failed to find related entities', {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Get entity with relationships
   */
  async getEntityWithRelationships(entityId: string) {
    const entity = await prisma.knowledgeEntity.findUnique({
      where: { id: entityId },
      include: {
        outgoingRelationships: {
          include: {
            target: true,
          },
        },
        incomingRelationships: {
          include: {
            source: true,
          },
        },
      },
    });

    return entity;
  }

  /**
   * Get knowledge graph statistics
   */
  async getStatistics(projectId: string) {
    const [entities, relationships, byType] = await Promise.all([
      prisma.knowledgeEntity.count({ where: { projectId } }),
      prisma.relationship.count({ where: { projectId } }),
      prisma.knowledgeEntity.groupBy({
        by: ['type'],
        where: { projectId },
        _count: true,
      }),
    ]);

    return {
      totalEntities: entities,
      totalRelationships: relationships,
      entitiesByType: byType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  /**
   * Clear knowledge graph for a project
   */
  async clearGraph(projectId: string): Promise<void> {
    logger.info('Clearing knowledge graph', { projectId });

    await prisma.$transaction([
      prisma.relationship.deleteMany({ where: { projectId } }),
      prisma.knowledgeEntity.deleteMany({ where: { projectId } }),
    ]);

    logger.info('Knowledge graph cleared', { projectId });
  }

  /**
   * Count entities by type
   */
  private countByType(entities: CodeEntity[]): Record<string, number> {
    return entities.reduce(
      (acc, entity) => {
        acc[entity.type] = (acc[entity.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }
}

// Singleton instance
export const knowledgeGraphService = new KnowledgeGraphService();

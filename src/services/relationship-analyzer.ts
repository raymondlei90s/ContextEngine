/**
 * Relationship Analyzer
 * Enhanced relationship detection and dependency analysis
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  group: string;
  size: number;
  metadata?: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

export interface GraphVisualizationData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics: {
    totalNodes: number;
    totalEdges: number;
    density: number;
    clusters: number;
  };
}

export interface DependencyChain {
  entity: string;
  dependencies: string[];
  depth: number;
  circular: boolean;
}

export class RelationshipAnalyzer {
  /**
   * Analyze dependency chains
   */
  async analyzeDependencies(
    projectId: string,
    entityId: string,
    maxDepth: number = 3
  ): Promise<DependencyChain[]> {
    logger.info('Analyzing dependency chains', { projectId, entityId, maxDepth });

    const chains: DependencyChain[] = [];
    const visited = new Set<string>();
    const currentPath = new Set<string>();

    await this.traverseDependencies(
      entityId,
      0,
      maxDepth,
      chains,
      visited,
      currentPath
    );

    logger.info('Dependency analysis complete', {
      chainsFound: chains.length,
      circularDependencies: chains.filter((c) => c.circular).length,
    });

    return chains;
  }

  /**
   * Traverse dependencies recursively
   */
  private async traverseDependencies(
    entityId: string,
    depth: number,
    maxDepth: number,
    chains: DependencyChain[],
    visited: Set<string>,
    currentPath: Set<string>
  ): Promise<void> {
    if (depth > maxDepth || visited.has(entityId)) {
      return;
    }

    // Detect circular dependency
    const circular = currentPath.has(entityId);
    if (circular) {
      logger.warn('Circular dependency detected', { entityId });
    }

    visited.add(entityId);
    currentPath.add(entityId);

    // Get entity relationships
    const entity = await prisma.knowledgeEntity.findUnique({
      where: { id: entityId },
      include: {
        outgoingRelations: {
          include: {
            target: true,
          },
        },
      },
    });

    if (!entity) {
      currentPath.delete(entityId);
      return;
    }

    const dependencies = entity.outgoingRelations
      .filter((rel) => rel.target)
      .map((rel) => rel.target!.name);

    chains.push({
      entity: entity.name,
      dependencies,
      depth,
      circular,
    });

    // Recurse into dependencies
    for (const rel of entity.outgoingRelations) {
      if (rel.targetId) {
        await this.traverseDependencies(
          rel.targetId,
          depth + 1,
          maxDepth,
          chains,
          visited,
          currentPath
        );
      }
    }

    currentPath.delete(entityId);
  }

  /**
   * Generate graph visualization data
   */
  async generateGraphVisualization(
    projectId: string,
    options?: {
      entityTypes?: string[];
      relationshipTypes?: string[];
      maxNodes?: number;
    }
  ): Promise<GraphVisualizationData> {
    logger.info('Generating graph visualization', { projectId, options });

    const maxNodes = options?.maxNodes || 100;

    // Fetch entities
    let entitiesQuery: any = { where: { projectId } };

    if (options?.entityTypes && options.entityTypes.length > 0) {
      entitiesQuery.where.type = { in: options.entityTypes };
    }

    entitiesQuery.take = maxNodes;

    const entities = await prisma.knowledgeEntity.findMany(entitiesQuery);

    // Fetch relationships
    const entityIds = entities.map((e) => e.id);

    let relationshipsQuery: any = {
      where: {
        AND: [
          { sourceId: { in: entityIds } },
          { targetId: { in: entityIds } },
        ],
      },
    };

    if (options?.relationshipTypes && options.relationshipTypes.length > 0) {
      relationshipsQuery.where.type = { in: options.relationshipTypes };
    }

    const relationships = await prisma.relationship.findMany(relationshipsQuery);

    // Build nodes
    const nodes: GraphNode[] = entities.map((entity) => {
      // Calculate node size based on number of relationships
      const outgoing = relationships.filter((r) => r.sourceId === entity.id).length;
      const incoming = relationships.filter((r) => r.targetId === entity.id).length;
      const size = Math.max(10, Math.min(50, (outgoing + incoming) * 5));

      return {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        group: this.getNodeGroup(entity.type),
        size,
        metadata: {
          sourceFile: entity.sourceFile,
          description: entity.description,
          outgoingCount: outgoing,
          incomingCount: incoming,
        },
      };
    });

    // Build edges
    const edges: GraphEdge[] = relationships.map((rel) => ({
      source: rel.sourceId,
      target: rel.targetId!,
      type: rel.type,
      weight: this.getEdgeWeight(rel.type),
    }));

    // Calculate statistics
    const statistics = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      density:
        nodes.length > 1
          ? (2 * edges.length) / (nodes.length * (nodes.length - 1))
          : 0,
      clusters: this.estimateClusters(nodes, edges),
    };

    logger.info('Graph visualization generated', statistics);

    return { nodes, edges, statistics };
  }

  /**
   * Find critical entities (high connectivity)
   */
  async findCriticalEntities(
    projectId: string,
    limit: number = 10
  ): Promise<
    Array<{
      entity: any;
      incomingCount: number;
      outgoingCount: number;
      totalCount: number;
      criticality: number;
    }>
  > {
    logger.info('Finding critical entities', { projectId, limit });

    // Get all entities with relationship counts
    const entities = await prisma.knowledgeEntity.findMany({
      where: { projectId },
      include: {
        outgoingRelations: true,
        incomingRelations: true,
      },
    });

    // Calculate criticality score
    const scored = entities.map((entity) => {
      const incoming = entity.incomingRelations.length;
      const outgoing = entity.outgoingRelations.length;
      const total = incoming + outgoing;

      // Criticality = weighted combination of incoming and total connections
      // Incoming connections indicate usage/importance
      const criticality = incoming * 2 + outgoing;

      return {
        entity: {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          description: entity.description,
          sourceFile: entity.sourceFile,
        },
        incomingCount: incoming,
        outgoingCount: outgoing,
        totalCount: total,
        criticality,
      };
    });

    // Sort by criticality and take top N
    const critical = scored.sort((a, b) => b.criticality - a.criticality).slice(0, limit);

    logger.info('Critical entities found', {
      total: critical.length,
      topEntity: critical[0]?.entity.name,
      topCriticality: critical[0]?.criticality,
    });

    return critical;
  }

  /**
   * Detect orphaned entities (no relationships)
   */
  async findOrphanedEntities(projectId: string): Promise<any[]> {
    logger.info('Finding orphaned entities', { projectId });

    const orphaned = await prisma.knowledgeEntity.findMany({
      where: {
        projectId,
        AND: [
          {
            outgoingRelations: {
              none: {},
            },
          },
          {
            incomingRelations: {
              none: {},
            },
          },
        ],
      },
    });

    logger.info('Orphaned entities found', { count: orphaned.length });

    return orphaned;
  }

  /**
   * Get node group for visualization coloring
   */
  private getNodeGroup(type: string): string {
    const groupMap: Record<string, string> = {
      class: 'classes',
      interface: 'interfaces',
      function: 'functions',
      component: 'components',
      type: 'types',
      constant: 'constants',
    };

    return groupMap[type] || 'other';
  }

  /**
   * Get edge weight based on relationship type
   */
  private getEdgeWeight(type: string): number {
    const weightMap: Record<string, number> = {
      imports: 1,
      uses: 2,
      extends: 3,
      implements: 3,
    };

    return weightMap[type] || 1;
  }

  /**
   * Estimate number of clusters (simplified)
   */
  private estimateClusters(nodes: GraphNode[], edges: GraphEdge[]): number {
    // Simple heuristic: number of unique node groups
    const groups = new Set(nodes.map((n) => n.group));
    return groups.size;
  }

  /**
   * Get relationship statistics
   */
  async getRelationshipStatistics(projectId: string) {
    // Get all entities for this project
    const entities = await prisma.knowledgeEntity.findMany({
      where: { projectId },
      select: { id: true },
    });

    const entityIds = entities.map((e) => e.id);

    // Get relationships where source or target is in this project
    const [relationships, avgPerEntity] = await Promise.all([
      prisma.relationship.findMany({
        where: {
          OR: [{ sourceId: { in: entityIds } }, { targetId: { in: entityIds } }],
        },
        select: { type: true },
      }),
      this.calculateAverageRelationshipsPerEntity(projectId),
    ]);

    // Group by type
    const byType: Record<string, number> = {};
    for (const rel of relationships) {
      byType[rel.type] = (byType[rel.type] || 0) + 1;
    }

    return {
      totalRelationships: relationships.length,
      byType,
      averagePerEntity: avgPerEntity,
    };
  }

  /**
   * Calculate average relationships per entity
   */
  private async calculateAverageRelationshipsPerEntity(
    projectId: string
  ): Promise<number> {
    const entities = await prisma.knowledgeEntity.findMany({
      where: { projectId },
      select: { id: true },
    });

    const entityIds = entities.map((e) => e.id);

    const relationshipCount = await prisma.relationship.count({
      where: {
        OR: [{ sourceId: { in: entityIds } }, { targetId: { in: entityIds } }],
      },
    });

    return entities.length > 0 ? relationshipCount / entities.length : 0;
  }
}

// Singleton instance
export const relationshipAnalyzer = new RelationshipAnalyzer();

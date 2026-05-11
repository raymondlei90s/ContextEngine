/**
 * Documentation Analyzer
 * Analyzes documentation coverage, quality, and identifies gaps
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

export interface CoverageAnalysis {
  projectId: string;
  totalEntities: number;
  documentedEntities: number;
  undocumentedEntities: number;
  coveragePercentage: number;
  byType: Record<
    string,
    {
      total: number;
      documented: number;
      coverage: number;
    }
  >;
  undocumentedList: Array<{
    id: string;
    name: string;
    type: string;
    filePath: string | null;
  }>;
}

export interface QualityMetrics {
  entityId: string;
  entityName: string;
  scores: {
    descriptionQuality: number;
    relationshipDocumentation: number;
    examplePresence: number;
    overall: number;
  };
  issues: string[];
  suggestions: string[];
}

export interface StalenessReport {
  projectId: string;
  staleEntities: Array<{
    id: string;
    name: string;
    type: string;
    lastModified: Date | null;
    docLastUpdated: Date | null;
    daysSinceUpdate: number | null;
  }>;
  totalStale: number;
}

export class DocumentationAnalyzer {
  /**
   * Analyze documentation coverage for a project
   */
  async analyzeCoverage(projectId: string): Promise<CoverageAnalysis> {
    logger.info('Analyzing documentation coverage', { projectId });

    const entities = await prisma.knowledgeEntity.findMany({
      where: { projectId },
    });

    const documented = entities.filter((e) => e.description && e.description.trim().length > 0);
    const undocumented = entities.filter((e) => !e.description || e.description.trim().length === 0);

    const byType: Record<string, { total: number; documented: number; coverage: number }> = {};

    for (const entity of entities) {
      const type = entity.type || 'other';
      if (!byType[type]) {
        byType[type] = { total: 0, documented: 0, coverage: 0 };
      }

      byType[type].total++;
      if (entity.description && entity.description.trim().length > 0) {
        byType[type].documented++;
      }
    }

    for (const type in byType) {
      byType[type].coverage =
        byType[type].total > 0 ? (byType[type].documented / byType[type].total) * 100 : 0;
    }

    const coverage: CoverageAnalysis = {
      projectId,
      totalEntities: entities.length,
      documentedEntities: documented.length,
      undocumentedEntities: undocumented.length,
      coveragePercentage: entities.length > 0 ? (documented.length / entities.length) * 100 : 0,
      byType,
      undocumentedList: undocumented.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        filePath: e.filePath,
      })),
    };

    logger.info('Coverage analysis complete', {
      projectId,
      coverage: coverage.coveragePercentage.toFixed(2) + '%',
      undocumented: undocumented.length,
    });

    return coverage;
  }

  /**
   * Analyze documentation quality for an entity
   */
  async analyzeQuality(entityId: string): Promise<QualityMetrics> {
    logger.info('Analyzing documentation quality', { entityId });

    const entity = await prisma.knowledgeEntity.findUnique({
      where: { id: entityId },
      include: {
        outgoingRelationships: true,
        incomingRelationships: true,
      },
    });

    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    const descriptionQuality = this.scoreDescriptionQuality(entity.description, issues, suggestions);

    const relationshipScore = this.scoreRelationshipDocumentation(
      entity,
      issues,
      suggestions
    );

    const exampleScore = this.scoreExamplePresence(entity.description, issues, suggestions);

    const overall = (descriptionQuality + relationshipScore + exampleScore) / 3;

    const metrics: QualityMetrics = {
      entityId: entity.id,
      entityName: entity.name,
      scores: {
        descriptionQuality,
        relationshipDocumentation: relationshipScore,
        examplePresence: exampleScore,
        overall,
      },
      issues,
      suggestions,
    };

    logger.info('Quality analysis complete', {
      entityId,
      overallScore: overall.toFixed(2),
      issueCount: issues.length,
    });

    return metrics;
  }

  /**
   * Detect stale documentation
   */
  async detectStaleness(projectId: string, thresholdDays: number = 30): Promise<StalenessReport> {
    logger.info('Detecting stale documentation', { projectId, thresholdDays });

    const entities = await prisma.knowledgeEntity.findMany({
      where: { projectId },
    });

    const now = new Date();
    const staleEntities = [];

    for (const entity of entities) {
      if (entity.updatedAt) {
        const daysSinceUpdate = Math.floor(
          (now.getTime() - entity.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceUpdate > thresholdDays) {
          staleEntities.push({
            id: entity.id,
            name: entity.name,
            type: entity.type,
            lastModified: entity.updatedAt,
            docLastUpdated: entity.updatedAt,
            daysSinceUpdate,
          });
        }
      }
    }

    const report: StalenessReport = {
      projectId,
      staleEntities,
      totalStale: staleEntities.length,
    };

    logger.info('Staleness detection complete', {
      projectId,
      staleCount: staleEntities.length,
    });

    return report;
  }

  /**
   * Find entities with missing relationships
   */
  async findMissingRelationships(projectId: string): Promise<
    Array<{
      id: string;
      name: string;
      type: string;
      hasOutgoing: boolean;
      hasIncoming: boolean;
      isOrphan: boolean;
    }>
  > {
    logger.info('Finding missing relationships', { projectId });

    const entities = await prisma.knowledgeEntity.findMany({
      where: { projectId },
      include: {
        outgoingRelationships: true,
        incomingRelationships: true,
      },
    });

    const missing = entities
      .map((entity) => ({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        hasOutgoing: entity.outgoingRelationships.length > 0,
        hasIncoming: entity.incomingRelationships.length > 0,
        isOrphan:
          entity.outgoingRelationships.length === 0 && entity.incomingRelationships.length === 0,
      }))
      .filter((e) => !e.hasOutgoing || !e.hasIncoming || e.isOrphan);

    logger.info('Missing relationships analysis complete', {
      projectId,
      missingCount: missing.length,
    });

    return missing;
  }

  /**
   * Score description quality (0-100)
   */
  private scoreDescriptionQuality(
    description: string | null,
    issues: string[],
    suggestions: string[]
  ): number {
    if (!description || description.trim().length === 0) {
      issues.push('No description provided');
      suggestions.push('Add a clear description explaining what this entity does');
      return 0;
    }

    let score = 50;

    const wordCount = description.split(/\s+/).length;

    if (wordCount < 5) {
      issues.push('Description too short');
      suggestions.push('Expand description to at least 10 words');
      score -= 20;
    } else if (wordCount < 10) {
      suggestions.push('Consider adding more detail to the description');
      score -= 10;
    } else if (wordCount >= 20) {
      score += 20;
    } else {
      score += 10;
    }

    if (description.includes('TODO') || description.includes('FIXME')) {
      issues.push('Description contains placeholder text');
      score -= 15;
    }

    if (!/[.!?]$/.test(description.trim())) {
      issues.push('Description missing proper punctuation');
      score -= 5;
    }

    if (description.toLowerCase().startsWith('this ')) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score relationship documentation (0-100)
   */
  private scoreRelationshipDocumentation(
    entity: any,
    issues: string[],
    suggestions: string[]
  ): number {
    const hasOutgoing = entity.outgoingRelationships?.length > 0;
    const hasIncoming = entity.incomingRelationships?.length > 0;

    if (!hasOutgoing && !hasIncoming) {
      issues.push('Entity has no documented relationships');
      suggestions.push('Add imports, dependencies, or usage relationships');
      return 0;
    }

    let score = 40;

    if (hasOutgoing) {
      score += 30;
    } else {
      suggestions.push('Add dependencies or imports this entity uses');
    }

    if (hasIncoming) {
      score += 30;
    } else {
      suggestions.push('Document entities that use or depend on this one');
    }

    return score;
  }

  /**
   * Score example presence (0-100)
   */
  private scoreExamplePresence(
    description: string | null,
    issues: string[],
    suggestions: string[]
  ): number {
    if (!description) {
      return 0;
    }

    if (description.includes('```') || description.includes('@example')) {
      return 100;
    }

    suggestions.push('Add code examples to demonstrate usage');
    return 0;
  }

  /**
   * Get comprehensive project health report
   */
  async getProjectHealth(projectId: string): Promise<{
    coverage: CoverageAnalysis;
    staleness: StalenessReport;
    qualitySummary: {
      averageOverallScore: number;
      entitiesAbove80: number;
      entitiesBelow50: number;
    };
  }> {
    logger.info('Generating project health report', { projectId });

    const [coverage, staleness] = await Promise.all([
      this.analyzeCoverage(projectId),
      this.detectStaleness(projectId),
    ]);

    const entities = await prisma.knowledgeEntity.findMany({
      where: { projectId },
      take: 100,
    });

    let totalScore = 0;
    let above80 = 0;
    let below50 = 0;

    for (const entity of entities) {
      const quality = await this.analyzeQuality(entity.id);
      totalScore += quality.scores.overall;

      if (quality.scores.overall >= 80) above80++;
      if (quality.scores.overall < 50) below50++;
    }

    const averageScore = entities.length > 0 ? totalScore / entities.length : 0;

    logger.info('Project health report complete', {
      projectId,
      averageScore: averageScore.toFixed(2),
    });

    return {
      coverage,
      staleness,
      qualitySummary: {
        averageOverallScore: averageScore,
        entitiesAbove80: above80,
        entitiesBelow50: below50,
      },
    };
  }
}

// Singleton instance
export const documentationAnalyzer = new DocumentationAnalyzer();

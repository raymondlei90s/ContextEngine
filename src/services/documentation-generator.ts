/**
 * Documentation Generator
 * Generates context-aware documentation from knowledge graph entities
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import { knowledgeGraphService } from './knowledge-graph.js';

const prisma = new PrismaClient();

export type DocumentationFormat = 'markdown' | 'jsdoc' | 'openapi';

export interface DocumentationOptions {
  format: DocumentationFormat;
  includeRelationships?: boolean;
  includeExamples?: boolean;
  includeMetadata?: boolean;
}

export interface GeneratedDocumentation {
  entityId: string;
  entityName: string;
  format: DocumentationFormat;
  content: string;
  metadata?: {
    wordCount: number;
    hasExamples: boolean;
    relationshipCount: number;
  };
}

export interface ProjectDocumentation {
  projectId: string;
  generatedAt: Date;
  entities: GeneratedDocumentation[];
  summary: {
    totalEntities: number;
    documentedEntities: number;
    coverage: number;
  };
}

export class DocumentationGenerator {
  /**
   * Generate documentation for a single entity
   */
  async generateForEntity(
    entityId: string,
    options: DocumentationOptions = { format: 'markdown' }
  ): Promise<GeneratedDocumentation> {
    logger.info('Generating documentation for entity', { entityId, format: options.format });

    const entity = await knowledgeGraphService.getEntityWithRelationships(entityId);

    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    let content = '';

    switch (options.format) {
      case 'markdown':
        content = this.generateMarkdown(entity, options);
        break;
      case 'jsdoc':
        content = this.generateJSDoc(entity, options);
        break;
      case 'openapi':
        content = this.generateOpenAPI(entity, options);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    const doc: GeneratedDocumentation = {
      entityId: entity.id,
      entityName: entity.name,
      format: options.format,
      content,
    };

    if (options.includeMetadata) {
      doc.metadata = {
        wordCount: content.split(/\s+/).length,
        hasExamples: content.includes('```') || content.includes('@example'),
        relationshipCount:
          (entity.outgoingRelationships?.length || 0) + (entity.incomingRelationships?.length || 0),
      };
    }

    logger.info('Documentation generated', {
      entityId,
      format: options.format,
      contentLength: content.length,
    });

    return doc;
  }

  /**
   * Generate documentation for entire project
   */
  async generateForProject(
    projectId: string,
    options: DocumentationOptions = { format: 'markdown' }
  ): Promise<ProjectDocumentation> {
    logger.info('Generating documentation for project', { projectId });

    const entities = await prisma.knowledgeEntity.findMany({
      where: { projectId },
      include: {
        outgoingRelationships: {
          include: { target: true },
        },
        incomingRelationships: {
          include: { source: true },
        },
      },
    });

    const generatedDocs: GeneratedDocumentation[] = [];

    for (const entity of entities) {
      try {
        const doc = await this.generateForEntity(entity.id, options);
        generatedDocs.push(doc);
      } catch (error) {
        logger.error('Failed to generate documentation for entity', {
          entityId: entity.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const documentation: ProjectDocumentation = {
      projectId,
      generatedAt: new Date(),
      entities: generatedDocs,
      summary: {
        totalEntities: entities.length,
        documentedEntities: generatedDocs.length,
        coverage: entities.length > 0 ? (generatedDocs.length / entities.length) * 100 : 0,
      },
    };

    logger.info('Project documentation generated', {
      projectId,
      totalEntities: entities.length,
      documented: generatedDocs.length,
      coverage: documentation.summary.coverage.toFixed(2) + '%',
    });

    return documentation;
  }

  /**
   * Generate Markdown documentation
   */
  private generateMarkdown(entity: any, options: DocumentationOptions): string {
    const lines: string[] = [];

    lines.push(`# ${entity.name}`);
    lines.push('');

    if (entity.type) {
      lines.push(`**Type:** \`${entity.type}\``);
      lines.push('');
    }

    if (entity.description) {
      lines.push('## Description');
      lines.push('');
      lines.push(entity.description);
      lines.push('');
    }

    if (entity.filePath) {
      lines.push('## Location');
      lines.push('');
      lines.push(`\`${entity.filePath}\``);
      lines.push('');
    }

    if (options.includeRelationships && entity.outgoingRelationships?.length > 0) {
      lines.push('## Dependencies');
      lines.push('');

      const grouped = this.groupRelationshipsByType(entity.outgoingRelationships);

      for (const [type, rels] of Object.entries(grouped)) {
        lines.push(`### ${this.capitalizeFirst(type)}`);
        lines.push('');

        for (const rel of rels) {
          if (rel.target) {
            lines.push(`- \`${rel.target.name}\``);
            if (rel.target.description) {
              lines.push(`  - ${rel.target.description}`);
            }
          }
        }
        lines.push('');
      }
    }

    if (options.includeRelationships && entity.incomingRelationships?.length > 0) {
      lines.push('## Used By');
      lines.push('');

      const grouped = this.groupRelationshipsByType(entity.incomingRelationships);

      for (const [type, rels] of Object.entries(grouped)) {
        lines.push(`### ${this.capitalizeFirst(type)}`);
        lines.push('');

        for (const rel of rels) {
          if (rel.source) {
            lines.push(`- \`${rel.source.name}\``);
            if (rel.source.description) {
              lines.push(`  - ${rel.source.description}`);
            }
          }
        }
        lines.push('');
      }
    }

    if (options.includeExamples && entity.type === 'function') {
      lines.push('## Example Usage');
      lines.push('');
      lines.push('```typescript');
      lines.push(`// TODO: Add usage example for ${entity.name}`);
      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate JSDoc documentation
   */
  private generateJSDoc(entity: any, options: DocumentationOptions): string {
    const lines: string[] = [];

    lines.push('/**');

    if (entity.description) {
      lines.push(` * ${entity.description}`);
      lines.push(' *');
    }

    if (entity.type) {
      lines.push(` * @type {${entity.type}}`);
    }

    if (entity.filePath) {
      lines.push(` * @file ${entity.filePath}`);
    }

    if (options.includeRelationships && entity.outgoingRelationships?.length > 0) {
      const imports = entity.outgoingRelationships.filter((r: any) => r.type === 'imports');
      if (imports.length > 0) {
        lines.push(' *');
        for (const rel of imports) {
          if (rel.target) {
            lines.push(` * @requires ${rel.target.name}`);
          }
        }
      }
    }

    if (options.includeExamples) {
      lines.push(' *');
      lines.push(' * @example');
      lines.push(` * // TODO: Add usage example for ${entity.name}`);
    }

    lines.push(' */');

    return lines.join('\n');
  }

  /**
   * Generate OpenAPI documentation
   */
  private generateOpenAPI(entity: any, options: DocumentationOptions): string {
    if (entity.type !== 'function' && entity.type !== 'class') {
      return '# OpenAPI generation only supported for functions and classes';
    }

    const spec: any = {
      openapi: '3.0.0',
      info: {
        title: entity.name,
        version: '1.0.0',
        description: entity.description || '',
      },
      paths: {},
    };

    if (entity.type === 'function') {
      spec.paths[`/${entity.name}`] = {
        post: {
          summary: entity.description || entity.name,
          operationId: entity.name,
          responses: {
            '200': {
              description: 'Successful response',
            },
          },
        },
      };
    }

    return JSON.stringify(spec, null, 2);
  }

  /**
   * Group relationships by type
   */
  private groupRelationshipsByType(relationships: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const rel of relationships) {
      if (!grouped[rel.type]) {
        grouped[rel.type] = [];
      }
      grouped[rel.type].push(rel);
    }

    return grouped;
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate documentation index (table of contents)
   */
  async generateIndex(projectId: string): Promise<string> {
    logger.info('Generating documentation index', { projectId });

    const entities = await prisma.knowledgeEntity.findMany({
      where: { projectId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    const lines: string[] = [];
    lines.push('# Documentation Index');
    lines.push('');

    const byType = this.groupEntitiesByType(entities);

    for (const [type, items] of Object.entries(byType)) {
      lines.push(`## ${this.capitalizeFirst(type)}s`);
      lines.push('');

      for (const entity of items) {
        const anchor = entity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        lines.push(`- [\`${entity.name}\`](#${anchor})`);
        if (entity.description) {
          lines.push(`  - ${entity.description.substring(0, 100)}${entity.description.length > 100 ? '...' : ''}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Group entities by type
   */
  private groupEntitiesByType(entities: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const entity of entities) {
      const type = entity.type || 'other';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(entity);
    }

    return grouped;
  }
}

// Singleton instance
export const documentationGenerator = new DocumentationGenerator();

/**
 * Entity Extraction Service
 * Extracts code entities (classes, functions, components) from source files
 */

import { promises as fs } from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

export interface CodeEntity {
  id: string;
  type: 'class' | 'function' | 'component' | 'interface' | 'type' | 'constant';
  name: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  signature?: string;
  metadata: {
    exported?: boolean;
    async?: boolean;
    parameters?: string[];
    returnType?: string;
    decorators?: string[];
    extends?: string;
    implements?: string[];
  };
}

export interface EntityExtractionResult {
  entities: CodeEntity[];
  relationships: Array<{
    from: string;
    to: string;
    type: 'imports' | 'uses' | 'extends' | 'implements';
  }>;
}

export class EntityExtractor {
  /**
   * Extract entities from a directory of source files
   */
  async extractFromDirectory(dirPath: string): Promise<EntityExtractionResult> {
    logger.info('Extracting entities from directory', { dirPath });

    const files = await this.findSourceFiles(dirPath);
    const entities: CodeEntity[] = [];
    const relationships: EntityExtractionResult['relationships'] = [];

    for (const filePath of files) {
      try {
        const result = await this.extractFromFile(filePath);
        entities.push(...result.entities);
        relationships.push(...result.relationships);
      } catch (error) {
        logger.warn('Failed to extract from file', {
          filePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Entity extraction complete', {
      totalEntities: entities.length,
      totalRelationships: relationships.length,
    });

    return { entities, relationships };
  }

  /**
   * Extract entities from a single file
   */
  async extractFromFile(filePath: string): Promise<EntityExtractionResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);

    // Route to appropriate parser
    if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
      return this.extractFromTypeScript(content, filePath);
    } else if (ext === '.py') {
      return this.extractFromPython(content, filePath);
    } else if (ext === '.go') {
      return this.extractFromGo(content, filePath);
    }

    return { entities: [], relationships: [] };
  }

  /**
   * Extract entities from TypeScript/JavaScript
   */
  private async extractFromTypeScript(
    content: string,
    filePath: string
  ): Promise<EntityExtractionResult> {
    const entities: CodeEntity[] = [];
    const relationships: EntityExtractionResult['relationships'] = [];

    // Extract imports
    const importRegex = /import\s+(?:{[^}]+}|[\w]+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      // Store for relationship building later
      relationships.push({
        from: filePath,
        to: importPath,
        type: 'imports',
      });
    }

    // Extract classes
    const classRegex = /export\s+(?:class|abstract\s+class)\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*{/g;
    while ((match = classRegex.exec(content)) !== null) {
      const [, name, extendsClass, implementsList] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;

      const entity: CodeEntity = {
        id: `${filePath}:${name}`,
        type: 'class',
        name,
        description: this.extractJSDoc(content, match.index) || `${name} class`,
        filePath,
        lineNumber,
        metadata: {
          exported: true,
          extends: extendsClass,
          implements: implementsList
            ? implementsList.split(',').map((i) => i.trim())
            : undefined,
        },
      };

      entities.push(entity);

      // Add relationships
      if (extendsClass) {
        relationships.push({
          from: entity.id,
          to: extendsClass,
          type: 'extends',
        });
      }
      if (implementsList) {
        implementsList.split(',').forEach((impl) => {
          relationships.push({
            from: entity.id,
            to: impl.trim(),
            type: 'implements',
          });
        });
      }
    }

    // Extract interfaces
    const interfaceRegex = /export\s+interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*{/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const [, name, extendsList] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;

      entities.push({
        id: `${filePath}:${name}`,
        type: 'interface',
        name,
        description: this.extractJSDoc(content, match.index) || `${name} interface`,
        filePath,
        lineNumber,
        metadata: {
          exported: true,
          extends: extendsList?.trim(),
        },
      });
    }

    // Extract functions
    const functionRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*{/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const [fullMatch, name, params, returnType] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const isAsync = fullMatch.includes('async');

      entities.push({
        id: `${filePath}:${name}`,
        type: 'function',
        name,
        description: this.extractJSDoc(content, match.index) || `${name} function`,
        filePath,
        lineNumber,
        signature: `${name}(${params})${returnType ? `: ${returnType.trim()}` : ''}`,
        metadata: {
          exported: true,
          async: isAsync,
          parameters: params
            ? params.split(',').map((p) => p.trim().split(':')[0].trim())
            : [],
          returnType: returnType?.trim(),
        },
      });
    }

    // Extract React components (functional)
    const componentRegex = /export\s+(?:const|function)\s+(\w+)\s*(?:=\s*\([^)]*\)\s*=>|:\s*React\.FC|:\s*FC)/g;
    while ((match = componentRegex.exec(content)) !== null) {
      const [, name] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;

      entities.push({
        id: `${filePath}:${name}`,
        type: 'component',
        name,
        description: this.extractJSDoc(content, match.index) || `${name} component`,
        filePath,
        lineNumber,
        metadata: {
          exported: true,
        },
      });
    }

    // Extract constants/enums
    const constRegex = /export\s+const\s+(\w+)\s*[:=]/g;
    while ((match = constRegex.exec(content)) !== null) {
      const [, name] = match;

      // Skip if already captured as component
      if (!entities.some((e) => e.name === name)) {
        const lineNumber = content.substring(0, match.index).split('\n').length;

        entities.push({
          id: `${filePath}:${name}`,
          type: 'constant',
          name,
          description: this.extractJSDoc(content, match.index) || `${name} constant`,
          filePath,
          lineNumber,
          metadata: {
            exported: true,
          },
        });
      }
    }

    return { entities, relationships };
  }

  /**
   * Extract JSDoc comment before a position
   */
  private extractJSDoc(content: string, position: number): string | null {
    const beforeContent = content.substring(0, position);
    const lines = beforeContent.split('\n').reverse();

    let jsdoc = '';
    let inJSDoc = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('*/')) {
        inJSDoc = true;
        continue;
      }

      if (trimmed.startsWith('/**')) {
        inJSDoc = false;
        break;
      }

      if (inJSDoc) {
        const cleanLine = trimmed.replace(/^\*\s*/, '');
        if (cleanLine && !cleanLine.startsWith('@')) {
          jsdoc = cleanLine + ' ' + jsdoc;
        }
      } else if (trimmed && !trimmed.startsWith('//')) {
        // Hit non-comment line
        break;
      }
    }

    return jsdoc.trim() || null;
  }

  /**
   * Extract entities from Python (simplified)
   */
  private async extractFromPython(
    content: string,
    filePath: string
  ): Promise<EntityExtractionResult> {
    const entities: CodeEntity[] = [];
    const relationships: EntityExtractionResult['relationships'] = [];

    // Extract classes
    const classRegex = /class\s+(\w+)(?:\(([^)]+)\))?:/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const [, name, bases] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;

      entities.push({
        id: `${filePath}:${name}`,
        type: 'class',
        name,
        description: `${name} class`,
        filePath,
        lineNumber,
        metadata: {
          extends: bases?.trim(),
        },
      });
    }

    // Extract functions
    const functionRegex = /def\s+(\w+)\s*\(([^)]*)\)/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const [, name, params] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;

      entities.push({
        id: `${filePath}:${name}`,
        type: 'function',
        name,
        description: `${name} function`,
        filePath,
        lineNumber,
        signature: `${name}(${params})`,
        metadata: {
          parameters: params
            ? params.split(',').map((p) => p.trim().split(':')[0].trim())
            : [],
        },
      });
    }

    return { entities, relationships };
  }

  /**
   * Extract entities from Go (simplified)
   */
  private async extractFromGo(
    content: string,
    filePath: string
  ): Promise<EntityExtractionResult> {
    const entities: CodeEntity[] = [];
    const relationships: EntityExtractionResult['relationships'] = [];

    // Extract structs
    const structRegex = /type\s+(\w+)\s+struct\s*{/g;
    let match;
    while ((match = structRegex.exec(content)) !== null) {
      const [, name] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;

      entities.push({
        id: `${filePath}:${name}`,
        type: 'class',
        name,
        description: `${name} struct`,
        filePath,
        lineNumber,
        metadata: {},
      });
    }

    // Extract functions
    const functionRegex = /func\s+(\w+)\s*\(([^)]*)\)\s*(?:\(([^)]*)\)|(\w+))?/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const [, name, params, returnTypes, returnType] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;

      entities.push({
        id: `${filePath}:${name}`,
        type: 'function',
        name,
        description: `${name} function`,
        filePath,
        lineNumber,
        metadata: {
          returnType: returnTypes || returnType,
        },
      });
    }

    return { entities, relationships };
  }

  /**
   * Find source files recursively
   */
  private async findSourceFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const findFiles = async (dir: string, depth: number = 0): Promise<void> => {
      if (depth > 5) return; // Max depth

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          // Skip hidden, node_modules, dist, etc.
          if (
            entry.name.startsWith('.') ||
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === 'build' ||
            entry.name === '__pycache__'
          ) {
            continue;
          }

          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await findFiles(fullPath, depth + 1);
          } else if (
            entry.name.match(/\.(ts|tsx|js|jsx|py|go|rs)$/) &&
            !entry.name.includes('.test.') &&
            !entry.name.includes('.spec.')
          ) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip inaccessible directories
      }
    };

    await findFiles(dirPath);
    return files;
  }
}

/**
 * Repository Analyzer Agent
 * Analyzes ANY repository to understand technology, structure, and documentation needs
 */

import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../core/config.js';
import logger from '../utils/logger.js';
import { RepoAnalysis } from '../core/types.js';
import { claudeCache } from '../services/claude-cache.js';
import { withClaudeRetry } from '../utils/retry.js';

export class RepoAnalyzerAgent {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  /**
   * Analyze a repository
   */
  async analyze(repoPath: string): Promise<RepoAnalysis> {
    logger.info('Analyzing repository', { repoPath });

    // Gather repository information
    const repoInfo = await this.gatherRepoInfo(repoPath);

    // Analyze with Claude
    const analysis = await this.analyzeWithClaude(repoInfo);

    logger.info('Repository analysis complete', {
      technology: analysis.technology.primary,
      projectType: analysis.projectType,
      targetAudience: analysis.targetAudience.primary,
    });

    return analysis;
  }

  /**
   * Gather repository information
   */
  private async gatherRepoInfo(repoPath: string): Promise<any> {
    const info = {
      repoName: path.basename(repoPath),
      structure: await this.getDirectoryStructure(repoPath),
      packageJson: await this.readIfExists(path.join(repoPath, 'package.json')),
      readme: await this.readIfExists(path.join(repoPath, 'README.md')),
      pyprojectToml: await this.readIfExists(path.join(repoPath, 'pyproject.toml')),
      goMod: await this.readIfExists(path.join(repoPath, 'go.mod')),
      cargoToml: await this.readIfExists(path.join(repoPath, 'Cargo.toml')),
      sampleFiles: await this.getSampleFiles(repoPath),
    };

    return info;
  }

  /**
   * Get directory structure
   */
  private async getDirectoryStructure(
    repoPath: string,
    maxDepth: number = 3
  ): Promise<string[]> {
    const structure: string[] = [];

    const traverse = async (
      dir: string,
      currentDepth: number,
      prefix: string = ''
    ) => {
      if (currentDepth > maxDepth) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          // Skip hidden files and node_modules
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          const icon = entry.isDirectory() ? '📁' : '📄';
          structure.push(`${prefix}${icon} ${entry.name}`);

          if (entry.isDirectory() && currentDepth < maxDepth) {
            await traverse(
              path.join(dir, entry.name),
              currentDepth + 1,
              prefix + '  '
            );
          }
        }
      } catch (err) {
        // Skip inaccessible directories
      }
    };

    await traverse(repoPath, 0);
    return structure.slice(0, 100); // Limit to first 100 entries
  }

  /**
   * Get sample files from repository
   */
  private async getSampleFiles(repoPath: string): Promise<Array<{ path: string; content: string }>> {
    const samples: Array<{ path: string; content: string }> = [];

    // Find source files
    const findFiles = async (dir: string, depth: number = 0): Promise<string[]> => {
      if (depth > 3) return [];

      const files: string[] = [];
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            const subFiles = await findFiles(fullPath, depth + 1);
            files.push(...subFiles);
          } else if (
            entry.name.match(/\.(ts|tsx|js|jsx|vue|py|go|rs)$/) &&
            !entry.name.includes('.test.') &&
            !entry.name.includes('.spec.')
          ) {
            files.push(fullPath);
          }
        }
      } catch (err) {
        // Skip
      }

      return files;
    };

    const allFiles = await findFiles(repoPath);

    // Take up to 5 sample files
    for (const filePath of allFiles.slice(0, 5)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = path.relative(repoPath, filePath);
        samples.push({
          path: relativePath,
          content: content.slice(0, 1000), // First 1000 chars
        });
      } catch (err) {
        // Skip
      }
    }

    return samples;
  }

  /**
   * Read file if it exists
   */
  private async readIfExists(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      return null;
    }
  }

  /**
   * Analyze repository with Claude
   */
  private async analyzeWithClaude(repoInfo: any): Promise<RepoAnalysis> {
    const prompt = this.buildAnalysisPrompt(repoInfo);
    const systemPrompt = 'You are a repository analyzer. Return only valid JSON.';

    // Check cache first
    const cached = await claudeCache.get(config.anthropic.model, systemPrompt, prompt);
    if (cached) {
      logger.info('Using cached analysis', {
        repoName: repoInfo.repoName,
        cachedAt: cached.cachedAt,
      });

      // Parse cached content
      const jsonMatch = cached.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);

        return {
          projectType: analysis.projectType || 'unknown',
          technology: {
            primary: analysis.technology?.primary || 'unknown',
            framework: analysis.technology?.framework,
          },
          targetAudience: {
            primary: analysis.targetAudience?.primary || 'developers',
            secondary: analysis.targetAudience?.secondary,
            reasoning: analysis.targetAudience?.reasoning || '',
          },
          documentationStyle: {
            primary: analysis.documentationStyle?.primary || 'api-reference',
            secondary: analysis.documentationStyle?.secondary,
          },
          structure: {
            entrypoint: analysis.structure?.entrypoint,
            components: analysis.structure?.components || [],
            apis: analysis.structure?.apis || [],
            utilities: analysis.structure?.utilities || [],
          },
        };
      }
    }

    // Call Claude API with retry logic
    const response = await withClaudeRetry(async () => {
      return await this.client.messages.create({
        model: config.anthropic.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Cache the response
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
    await claudeCache.set(
      config.anthropic.model,
      systemPrompt,
      prompt,
      content.text,
      tokensUsed
    );

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse analysis response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      projectType: analysis.projectType || 'unknown',
      technology: {
        primary: analysis.technology?.primary || 'unknown',
        framework: analysis.technology?.framework,
      },
      targetAudience: {
        primary: analysis.targetAudience?.primary || 'developers',
        secondary: analysis.targetAudience?.secondary,
        reasoning: analysis.targetAudience?.reasoning || '',
      },
      documentationStyle: {
        primary: analysis.documentationStyle?.primary || 'api-reference',
        secondary: analysis.documentationStyle?.secondary,
      },
      structure: {
        entrypoint: analysis.structure?.entrypoint,
        components: analysis.structure?.components || [],
        apis: analysis.structure?.apis || [],
        utilities: analysis.structure?.utilities || [],
      },
    };
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(repoInfo: any): string {
    return `Analyze this repository and return a JSON object with the analysis.

Repository: ${repoInfo.repoName}

Directory Structure:
${repoInfo.structure.join('\n')}

${repoInfo.packageJson ? `package.json:\n${repoInfo.packageJson.slice(0, 1000)}` : ''}

${repoInfo.readme ? `README:\n${repoInfo.readme.slice(0, 2000)}` : ''}

Sample Files:
${repoInfo.sampleFiles.map((f: any) => `${f.path}:\n${f.content}`).join('\n\n')}

Return a JSON object with this structure:
{
  "projectType": "library" | "application" | "framework" | "tool",
  "technology": {
    "primary": "TypeScript" | "JavaScript" | "Python" | "Go" | "Rust" | etc,
    "framework": "React" | "Vue" | "Lit" | "Express" | etc (optional)
  },
  "targetAudience": {
    "primary": "developers" | "end-users" | "mixed",
    "secondary": "developers" | "end-users" | "contributors" (optional),
    "reasoning": "explanation of audience determination"
  },
  "documentationStyle": {
    "primary": "api-reference" | "user-guide" | "tutorial",
    "secondary": "api-reference" | "user-guide" | "tutorial" (optional)
  },
  "structure": {
    "entrypoint": "main entry point file" (optional),
    "components": ["list of component directories/files"],
    "apis": ["list of API files"],
    "utilities": ["list of utility files"]
  }
}

IMPORTANT: Return ONLY the JSON object, no additional text.`;
  }
}

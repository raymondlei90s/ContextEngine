/**
 * Mintlify Adapter
 * Outputs generated documentation as Mintlify MDX files with proper structure
 */

import { promises as fs } from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

export interface MintlifyConfig {
  name: string;
  logo: {
    light: string;
    dark: string;
  };
  navigation: NavigationGroup[];
  colors: {
    primary: string;
    light: string;
    dark: string;
  };
}

export interface NavigationGroup {
  group: string;
  pages: string[];
}

export interface DocFile {
  path: string;
  content: string;
  title: string;
  category: string;
}

export class MintlifyAdapter {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  /**
   * Initialize Mintlify documentation directory
   */
  async initialize(projectName: string): Promise<void> {
    logger.info('Initializing Mintlify directory', { outputDir: this.outputDir });

    // Create output directory
    await fs.mkdir(this.outputDir, { recursive: true });

    // Create subdirectories
    const subdirs = [
      'getting-started',
      'api',
      'guides',
      'help',
      'tutorials',
      'images',
    ];

    for (const subdir of subdirs) {
      await fs.mkdir(path.join(this.outputDir, subdir), { recursive: true });
    }

    logger.info('Mintlify directory structure created');
  }

  /**
   * Write a documentation file
   */
  async writeDoc(docFile: DocFile): Promise<void> {
    const filePath = path.join(this.outputDir, docFile.path);
    const fileDir = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(fileDir, { recursive: true });

    // Write the MDX content
    await fs.writeFile(filePath, docFile.content, 'utf-8');

    logger.info('Documentation file written', { path: docFile.path });
  }

  /**
   * Write mint.json configuration file
   */
  async writeConfig(config: MintlifyConfig): Promise<void> {
    const configPath = path.join(this.outputDir, 'mint.json');

    const mintConfig = {
      $schema: 'https://mintlify.com/schema.json',
      name: config.name,
      logo: config.logo,
      favicon: '/images/favicon.png',
      colors: config.colors,
      topbarLinks: [],
      topbarCtaButton: {
        name: 'Get Started',
        url: '/getting-started/introduction',
      },
      anchors: [],
      navigation: config.navigation,
      footerSocials: {},
    };

    await fs.writeFile(configPath, JSON.stringify(mintConfig, null, 2), 'utf-8');

    logger.info('mint.json configuration written');
  }

  /**
   * Generate mint.json navigation from doc files
   */
  generateNavigation(docFiles: DocFile[]): NavigationGroup[] {
    // Group docs by category
    const groups = new Map<string, string[]>();

    for (const doc of docFiles) {
      const category = doc.category || 'Other';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      // Remove .mdx extension for navigation
      const navPath = doc.path.replace(/\.mdx$/, '');
      groups.get(category)!.push(navPath);
    }

    // Convert to navigation structure
    const navigation: NavigationGroup[] = [];

    // Preferred order of categories
    const categoryOrder = [
      'Getting Started',
      'Tutorials',
      'Guides',
      'How-To Guides',
      'API Reference',
      'Help',
      'Resources',
    ];

    for (const category of categoryOrder) {
      if (groups.has(category)) {
        navigation.push({
          group: category,
          pages: groups.get(category)!,
        });
        groups.delete(category);
      }
    }

    // Add remaining categories
    for (const [category, pages] of groups.entries()) {
      navigation.push({
        group: category,
        pages,
      });
    }

    return navigation;
  }

  /**
   * Write all documentation files and generate config
   */
  async writeAll(
    projectName: string,
    docFiles: DocFile[],
    options?: {
      logo?: { light: string; dark: string };
      colors?: { primary: string; light: string; dark: string };
    }
  ): Promise<void> {
    logger.info('Writing all documentation files', {
      projectName,
      totalFiles: docFiles.length,
    });

    // Initialize directory structure
    await this.initialize(projectName);

    // Write all doc files
    for (const docFile of docFiles) {
      await this.writeDoc(docFile);
    }

    // Generate and write config
    const navigation = this.generateNavigation(docFiles);

    const config: MintlifyConfig = {
      name: projectName,
      logo: options?.logo || {
        light: '/images/logo-light.svg',
        dark: '/images/logo-dark.svg',
      },
      navigation,
      colors: options?.colors || {
        primary: '#0070F3',
        light: '#0070F3',
        dark: '#0070F3',
      },
    };

    await this.writeConfig(config);

    logger.info('All documentation files written', {
      totalFiles: docFiles.length,
      categories: navigation.length,
    });
  }

  /**
   * Read existing documentation structure
   */
  async readExisting(): Promise<DocFile[]> {
    const docFiles: DocFile[] = [];

    try {
      const files = await this.findMdxFiles(this.outputDir);

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(this.outputDir, file);

        // Extract title from frontmatter
        const titleMatch = content.match(/^---\s+title:\s*["']?([^"'\n]+)["']?/m);
        const title = titleMatch ? titleMatch[1] : path.basename(file, '.mdx');

        // Determine category from path
        const pathParts = relativePath.split(path.sep);
        const category = pathParts.length > 1 ? this.categorize(pathParts[0]) : 'Other';

        docFiles.push({
          path: relativePath,
          content,
          title,
          category,
        });
      }

      logger.info('Existing documentation read', { totalFiles: docFiles.length });

      return docFiles;
    } catch (error) {
      logger.warn('No existing documentation found', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Find all MDX files recursively
   */
  private async findMdxFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findMdxFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.name.endsWith('.mdx')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist yet
    }

    return files;
  }

  /**
   * Categorize a directory name
   */
  private categorize(dirName: string): string {
    const categoryMap: Record<string, string> = {
      'getting-started': 'Getting Started',
      api: 'API Reference',
      guides: 'Guides',
      help: 'Help',
      tutorials: 'Tutorials',
      resources: 'Resources',
    };

    return categoryMap[dirName] || dirName;
  }
}

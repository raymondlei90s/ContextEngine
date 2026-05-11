/**
 * Mintlify Adapter Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MintlifyAdapter, DocFile } from '../mintlify-adapter.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('MintlifyAdapter', () => {
  let tempDir: string;
  let adapter: MintlifyAdapter;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = path.join(os.tmpdir(), `mintlify-test-${Date.now()}`);
    adapter = new MintlifyAdapter(tempDir);
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should create output directory', async () => {
      await adapter.initialize('Test Project');

      const exists = await fs.access(tempDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create subdirectories', async () => {
      await adapter.initialize('Test Project');

      const subdirs = [
        'getting-started',
        'api',
        'guides',
        'help',
        'tutorials',
        'images',
      ];

      for (const subdir of subdirs) {
        const subdirPath = path.join(tempDir, subdir);
        const exists = await fs.access(subdirPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should handle existing directory', async () => {
      await fs.mkdir(tempDir, { recursive: true });
      await adapter.initialize('Test Project');

      const exists = await fs.access(tempDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('writeDoc', () => {
    it('should write documentation file', async () => {
      const docFile: DocFile = {
        path: 'getting-started/introduction.mdx',
        content: '---\ntitle: Introduction\n---\n\n# Introduction\n\nTest content',
        title: 'Introduction',
        category: 'Getting Started',
      };

      await adapter.writeDoc(docFile);

      const filePath = path.join(tempDir, docFile.path);
      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toBe(docFile.content);
    });

    it('should create nested directories', async () => {
      const docFile: DocFile = {
        path: 'deep/nested/path/file.mdx',
        content: '# Test',
        title: 'Test',
        category: 'Test',
      };

      await adapter.writeDoc(docFile);

      const filePath = path.join(tempDir, docFile.path);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should overwrite existing files', async () => {
      const docFile: DocFile = {
        path: 'test.mdx',
        content: 'Original',
        title: 'Test',
        category: 'Test',
      };

      await adapter.writeDoc(docFile);

      docFile.content = 'Updated';
      await adapter.writeDoc(docFile);

      const filePath = path.join(tempDir, docFile.path);
      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toBe('Updated');
    });
  });

  describe('generateNavigation', () => {
    it('should generate navigation from doc files', () => {
      const docFiles: DocFile[] = [
        {
          path: 'getting-started/intro.mdx',
          content: '',
          title: 'Introduction',
          category: 'Getting Started',
        },
        {
          path: 'api/reference.mdx',
          content: '',
          title: 'API Reference',
          category: 'API Reference',
        },
        {
          path: 'guides/best-practices.mdx',
          content: '',
          title: 'Best Practices',
          category: 'Guides',
        },
      ];

      const navigation = adapter.generateNavigation(docFiles);

      expect(navigation).toHaveLength(3);
      expect(navigation[0].group).toBe('Getting Started');
      expect(navigation[0].pages).toContain('getting-started/intro');
    });

    it('should group docs by category', () => {
      const docFiles: DocFile[] = [
        {
          path: 'guide1.mdx',
          content: '',
          title: 'Guide 1',
          category: 'Guides',
        },
        {
          path: 'guide2.mdx',
          content: '',
          title: 'Guide 2',
          category: 'Guides',
        },
      ];

      const navigation = adapter.generateNavigation(docFiles);

      expect(navigation).toHaveLength(1);
      expect(navigation[0].group).toBe('Guides');
      expect(navigation[0].pages).toHaveLength(2);
    });

    it('should order categories correctly', () => {
      const docFiles: DocFile[] = [
        { path: 'help.mdx', content: '', title: 'Help', category: 'Help' },
        { path: 'api.mdx', content: '', title: 'API', category: 'API Reference' },
        { path: 'intro.mdx', content: '', title: 'Intro', category: 'Getting Started' },
      ];

      const navigation = adapter.generateNavigation(docFiles);

      expect(navigation[0].group).toBe('Getting Started');
      expect(navigation[1].group).toBe('API Reference');
      expect(navigation[2].group).toBe('Help');
    });

    it('should remove .mdx extension from paths', () => {
      const docFiles: DocFile[] = [
        {
          path: 'getting-started/intro.mdx',
          content: '',
          title: 'Intro',
          category: 'Getting Started',
        },
      ];

      const navigation = adapter.generateNavigation(docFiles);

      expect(navigation[0].pages[0]).toBe('getting-started/intro');
      expect(navigation[0].pages[0]).not.toContain('.mdx');
    });

    it('should handle empty doc files', () => {
      const navigation = adapter.generateNavigation([]);

      expect(navigation).toEqual([]);
    });
  });

  describe('writeConfig', () => {
    it('should write mint.json file', async () => {
      const config = {
        name: 'Test Project',
        logo: {
          light: '/logo-light.svg',
          dark: '/logo-dark.svg',
        },
        navigation: [
          {
            group: 'Getting Started',
            pages: ['getting-started/intro'],
          },
        ],
        colors: {
          primary: '#0070F3',
          light: '#0070F3',
          dark: '#0070F3',
        },
      };

      await adapter.writeConfig(config);

      const configPath = path.join(tempDir, 'mint.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.$schema).toBe('https://mintlify.com/schema.json');
      expect(parsed.name).toBe('Test Project');
      expect(parsed.navigation).toEqual(config.navigation);
    });

    it('should include Mintlify required fields', async () => {
      const config = {
        name: 'Test',
        logo: { light: '/light.svg', dark: '/dark.svg' },
        navigation: [],
        colors: { primary: '#000', light: '#000', dark: '#000' },
      };

      await adapter.writeConfig(config);

      const configPath = path.join(tempDir, 'mint.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveProperty('$schema');
      expect(parsed).toHaveProperty('favicon');
      expect(parsed).toHaveProperty('topbarLinks');
      expect(parsed).toHaveProperty('topbarCtaButton');
      expect(parsed).toHaveProperty('footerSocials');
    });
  });

  describe('writeAll', () => {
    it('should initialize, write docs, and create config', async () => {
      const docFiles: DocFile[] = [
        {
          path: 'getting-started/intro.mdx',
          content: '# Introduction',
          title: 'Introduction',
          category: 'Getting Started',
        },
        {
          path: 'api/reference.mdx',
          content: '# API',
          title: 'API Reference',
          category: 'API Reference',
        },
      ];

      await adapter.writeAll('Test Project', docFiles);

      // Check directories exist
      const gettingStartedDir = path.join(tempDir, 'getting-started');
      expect(await fs.access(gettingStartedDir).then(() => true).catch(() => false)).toBe(true);

      // Check docs written
      const introPath = path.join(tempDir, 'getting-started/intro.mdx');
      const introContent = await fs.readFile(introPath, 'utf-8');
      expect(introContent).toBe('# Introduction');

      // Check config written
      const configPath = path.join(tempDir, 'mint.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      expect(config.name).toBe('Test Project');
      expect(config.navigation).toHaveLength(2);
    });

    it('should use custom logo and colors', async () => {
      const docFiles: DocFile[] = [
        {
          path: 'intro.mdx',
          content: '# Intro',
          title: 'Intro',
          category: 'Getting Started',
        },
      ];

      const options = {
        logo: {
          light: '/custom-light.svg',
          dark: '/custom-dark.svg',
        },
        colors: {
          primary: '#FF0000',
          light: '#FF0000',
          dark: '#FF0000',
        },
      };

      await adapter.writeAll('Test', docFiles, options);

      const configPath = path.join(tempDir, 'mint.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      expect(config.logo).toEqual(options.logo);
      expect(config.colors).toEqual(options.colors);
    });

    it('should use default logo and colors if not provided', async () => {
      const docFiles: DocFile[] = [
        {
          path: 'intro.mdx',
          content: '# Intro',
          title: 'Intro',
          category: 'Getting Started',
        },
      ];

      await adapter.writeAll('Test', docFiles);

      const configPath = path.join(tempDir, 'mint.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      expect(config.logo.light).toBe('/images/logo-light.svg');
      expect(config.logo.dark).toBe('/images/logo-dark.svg');
      expect(config.colors.primary).toBe('#0070F3');
    });

    it('should handle empty doc files', async () => {
      await adapter.writeAll('Empty Project', []);

      const configPath = path.join(tempDir, 'mint.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      expect(config.name).toBe('Empty Project');
      expect(config.navigation).toEqual([]);
    });
  });
});

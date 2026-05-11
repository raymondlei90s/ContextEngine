/**
 * DocPlanner Agent Tests
 */

import { describe, it, expect } from 'vitest';
import { DocPlannerAgent } from '../doc-planner.js';
import { RepoAnalysis } from '../../core/types.js';

describe('DocPlannerAgent', () => {
  const planner = new DocPlannerAgent();

  describe('Developer Documentation', () => {
    const developerRepoAnalysis: RepoAnalysis = {
      projectType: 'library',
      technology: {
        primary: 'TypeScript',
        framework: 'React',
      },
      targetAudience: {
        primary: 'developers',
        reasoning: 'This is a component library for developers',
      },
      documentationStyle: {
        primary: 'api-reference',
      },
      structure: {
        entrypoint: 'src/index.ts',
        components: ['Button', 'Input', 'Modal'],
        apis: ['createTheme', 'useStyles'],
        utilities: ['formatDate', 'parseColor'],
      },
    };

    it('should create a plan for developer-focused documentation', async () => {
      const result = await planner.plan(developerRepoAnalysis);

      expect(result).toBeDefined();
      expect(result.totalTasks).toBeGreaterThan(0);
      expect(result.tasks).toBeDefined();
      expect(Array.isArray(result.tasks)).toBe(true);
    });

    it('should include getting started docs', async () => {
      const result = await planner.plan(developerRepoAnalysis);

      const gettingStartedTasks = result.tasks.filter(
        (task) => task.category === 'Getting Started'
      );

      expect(gettingStartedTasks.length).toBeGreaterThan(0);

      const titles = gettingStartedTasks.map((t) => t.metadata.title);
      expect(titles).toContain('Introduction');
      expect(titles).toContain('Installation');
      expect(titles).toContain('Quick Start');
    });

    it('should include API reference docs when components exist', async () => {
      const result = await planner.plan(developerRepoAnalysis);

      const apiTasks = result.tasks.filter(
        (task) => task.category === 'API Reference'
      );

      expect(apiTasks.length).toBeGreaterThan(0);
    });

    it('should include guides', async () => {
      const result = await planner.plan(developerRepoAnalysis);

      const guideTasks = result.tasks.filter((task) => task.category === 'Guides');

      expect(guideTasks.length).toBeGreaterThan(0);

      const titles = guideTasks.map((t) => t.metadata.title);
      expect(titles).toContain('Best Practices');
    });

    it('should assign unique IDs to tasks', async () => {
      const result = await planner.plan(developerRepoAnalysis);

      const ids = result.tasks.map((t) => t.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should set correct audience for developer docs', async () => {
      const result = await planner.plan(developerRepoAnalysis);

      for (const task of result.tasks) {
        expect(task.metadata.audience).toBe('developers');
      }
    });

    it('should include context in tasks', async () => {
      const result = await planner.plan(developerRepoAnalysis);

      for (const task of result.tasks) {
        expect(task.context).toBeDefined();
        expect(task.context.audience).toBe('developers');
        expect(task.context.technology).toBeDefined();
      }
    });
  });

  describe('End-User Documentation', () => {
    const endUserRepoAnalysis: RepoAnalysis = {
      projectType: 'application',
      technology: {
        primary: 'TypeScript',
        framework: 'Next.js',
      },
      targetAudience: {
        primary: 'end-users',
        reasoning: 'This is a SaaS application for end users',
      },
      documentationStyle: {
        primary: 'user-guide',
      },
      structure: {
        entrypoint: 'src/app/page.tsx',
        components: [],
        apis: [],
        utilities: [],
      },
    };

    it('should create a plan for end-user documentation', async () => {
      const result = await planner.plan(endUserRepoAnalysis);

      expect(result).toBeDefined();
      expect(result.totalTasks).toBeGreaterThan(0);
    });

    it('should include user-friendly getting started', async () => {
      const result = await planner.plan(endUserRepoAnalysis);

      const gettingStartedTasks = result.tasks.filter(
        (task) => task.category === 'Getting Started'
      );

      expect(gettingStartedTasks.length).toBeGreaterThan(0);

      const titles = gettingStartedTasks.map((t) => t.metadata.title);
      expect(titles).toContain('What is this?');
      expect(titles).toContain('Getting Started');
    });

    it('should include tutorials and how-to guides', async () => {
      const result = await planner.plan(endUserRepoAnalysis);

      const tutorialTasks = result.tasks.filter((task) => task.category === 'Tutorials');
      const howToTasks = result.tasks.filter((task) => task.category === 'How-To Guides');

      expect(tutorialTasks.length).toBeGreaterThan(0);
      expect(howToTasks.length).toBeGreaterThan(0);
    });

    it('should include help documentation', async () => {
      const result = await planner.plan(endUserRepoAnalysis);

      const helpTasks = result.tasks.filter((task) => task.category === 'Help');

      expect(helpTasks.length).toBeGreaterThan(0);

      const titles = helpTasks.map((t) => t.metadata.title);
      expect(titles).toContain('Frequently Asked Questions');
      expect(titles).toContain('Troubleshooting');
    });

    it('should set correct audience for end-user docs', async () => {
      const result = await planner.plan(endUserRepoAnalysis);

      for (const task of result.tasks) {
        expect(task.metadata.audience).toBe('end-users');
      }
    });
  });

  describe('Mixed Audience Documentation', () => {
    const mixedRepoAnalysis: RepoAnalysis = {
      projectType: 'framework',
      technology: {
        primary: 'TypeScript',
      },
      targetAudience: {
        primary: 'mixed',
        reasoning: 'Has both developer API and end-user components',
      },
      documentationStyle: {
        primary: 'api-reference',
        secondary: 'user-guide',
      },
      structure: {
        entrypoint: 'src/index.ts',
        components: ['Component'],
        apis: ['api'],
        utilities: ['util'],
      },
    };

    it('should create a plan for mixed audience', async () => {
      const result = await planner.plan(mixedRepoAnalysis);

      expect(result).toBeDefined();
      expect(result.totalTasks).toBeGreaterThan(0);
    });

    it('should include both developer and end-user docs', async () => {
      const result = await planner.plan(mixedRepoAnalysis);

      const audiences = new Set(result.tasks.map((t) => t.metadata.audience));

      expect(audiences.has('developers')).toBe(true);
      expect(audiences.has('end-users')).toBe(true);
    });

    it('should have more tasks than single-audience plans', async () => {
      const mixedResult = await planner.plan(mixedRepoAnalysis);

      const developerRepoAnalysis: RepoAnalysis = {
        ...mixedRepoAnalysis,
        targetAudience: { primary: 'developers', reasoning: 'test' },
      };
      const developerResult = await planner.plan(developerRepoAnalysis);

      expect(mixedResult.totalTasks).toBeGreaterThan(developerResult.totalTasks);
    });
  });

  describe('Task Structure', () => {
    const sampleAnalysis: RepoAnalysis = {
      projectType: 'library',
      technology: { primary: 'TypeScript' },
      targetAudience: { primary: 'developers', reasoning: 'test' },
      documentationStyle: { primary: 'api-reference' },
      structure: {
        components: [],
        apis: [],
        utilities: [],
      },
    };

    it('should create tasks with required fields', async () => {
      const result = await planner.plan(sampleAnalysis);

      for (const task of result.tasks) {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('type');
        expect(task).toHaveProperty('path');
        expect(task).toHaveProperty('category');
        expect(task).toHaveProperty('metadata');
        expect(task).toHaveProperty('context');

        expect(task.id).toBeTruthy();
        expect(task.type).toBeTruthy();
        expect(task.path).toBeTruthy();
        expect(task.category).toBeTruthy();
      }
    });

    it('should create tasks with valid metadata', async () => {
      const result = await planner.plan(sampleAnalysis);

      for (const task of result.tasks) {
        expect(task.metadata).toHaveProperty('title');
        expect(task.metadata).toHaveProperty('description');
        expect(task.metadata).toHaveProperty('audience');
        expect(task.metadata).toHaveProperty('style');

        expect(task.metadata.title).toBeTruthy();
        expect(task.metadata.description).toBeTruthy();
        expect(task.metadata.audience).toBeTruthy();
        expect(task.metadata.style).toBeTruthy();
      }
    });

    it('should create tasks with MDX file paths', async () => {
      const result = await planner.plan(sampleAnalysis);

      for (const task of result.tasks) {
        expect(task.path).toMatch(/\.mdx$/);
      }
    });

    it('should organize tasks into logical categories', async () => {
      const result = await planner.plan(sampleAnalysis);

      const categories = new Set(result.tasks.map((t) => t.category));

      expect(categories.size).toBeGreaterThan(1);
      expect(categories.has('Getting Started')).toBe(true);
    });
  });
});

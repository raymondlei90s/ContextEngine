/**
 * Documentation Planning Agent
 * Plans appropriate documentation structure based on repo characteristics and entities
 */

import { RepoAnalysis, TargetAudience } from '../core/types.js';
import logger from '../utils/logger.js';

interface DocTask {
  id: string;
  type: string;
  path: string;
  category: string;
  metadata: {
    title: string;
    description: string;
    audience: TargetAudience;
    style: string;
  };
  context: {
    technology?: any;
    projectType?: string;
    audience: TargetAudience;
  };
}

export class DocPlannerAgent {
  /**
   * Plan documentation structure
   */
  async plan(repoAnalysis: RepoAnalysis): Promise<{ totalTasks: number; tasks: DocTask[] }> {
    logger.info('Planning documentation structure', {
      audience: repoAnalysis.targetAudience.primary,
      style: repoAnalysis.documentationStyle.primary,
    });

    let tasks: DocTask[] = [];

    // Route to appropriate planning strategy based on audience
    if (repoAnalysis.targetAudience.primary === 'end-users') {
      tasks = this.planUserGuideDocs(repoAnalysis);
    } else if (repoAnalysis.targetAudience.primary === 'mixed') {
      tasks = this.planHybridDocs(repoAnalysis);
    } else {
      tasks = this.planDeveloperDocs(repoAnalysis);
    }

    // Assign IDs
    tasks.forEach((task, index) => {
      task.id = `doc-${index + 1}`;
    });

    logger.info(`Documentation plan created`, { totalTasks: tasks.length });

    return {
      totalTasks: tasks.length,
      tasks,
    };
  }

  /**
   * Plan developer-focused documentation
   * For libraries, frameworks, SDKs
   */
  private planDeveloperDocs(repoAnalysis: RepoAnalysis): DocTask[] {
    const tasks: DocTask[] = [];

    // 1. Getting Started
    tasks.push({
      id: '',
      type: 'getting-started',
      path: 'getting-started/introduction.mdx',
      category: 'Getting Started',
      metadata: {
        title: 'Introduction',
        description: 'Overview and features',
        audience: 'developers',
        style: 'explanatory',
      },
      context: {
        technology: repoAnalysis.technology,
        projectType: repoAnalysis.projectType,
        audience: 'developers',
      },
    });

    tasks.push({
      id: '',
      type: 'getting-started',
      path: 'getting-started/installation.mdx',
      category: 'Getting Started',
      metadata: {
        title: 'Installation',
        description: 'How to install and set up',
        audience: 'developers',
        style: 'tutorial',
      },
      context: {
        technology: repoAnalysis.technology,
        projectType: repoAnalysis.projectType,
        audience: 'developers',
      },
    });

    tasks.push({
      id: '',
      type: 'getting-started',
      path: 'getting-started/quick-start.mdx',
      category: 'Getting Started',
      metadata: {
        title: 'Quick Start',
        description: 'Get up and running quickly',
        audience: 'developers',
        style: 'tutorial',
      },
      context: {
        technology: repoAnalysis.technology,
        projectType: repoAnalysis.projectType,
        audience: 'developers',
      },
    });

    // 2. Components/APIs (if available)
    if (repoAnalysis.structure.components && repoAnalysis.structure.components.length > 0) {
      tasks.push({
        id: '',
        type: 'api-reference',
        path: 'api/components.mdx',
        category: 'API Reference',
        metadata: {
          title: 'Components',
          description: 'Component API documentation',
          audience: 'developers',
          style: 'api-reference',
        },
        context: {
          technology: repoAnalysis.technology,
          projectType: repoAnalysis.projectType,
          audience: 'developers',
        },
      });
    }

    if (repoAnalysis.structure.apis && repoAnalysis.structure.apis.length > 0) {
      tasks.push({
        id: '',
        type: 'api-reference',
        path: 'api/reference.mdx',
        category: 'API Reference',
        metadata: {
          title: 'API Reference',
          description: 'Complete API documentation',
          audience: 'developers',
          style: 'api-reference',
        },
        context: {
          technology: repoAnalysis.technology,
          projectType: repoAnalysis.projectType,
          audience: 'developers',
        },
      });
    }

    // 3. Advanced Topics
    tasks.push({
      id: '',
      type: 'guide',
      path: 'guides/best-practices.mdx',
      category: 'Guides',
      metadata: {
        title: 'Best Practices',
        description: 'Recommended patterns and practices',
        audience: 'developers',
        style: 'explanatory',
      },
      context: {
        technology: repoAnalysis.technology,
        projectType: repoAnalysis.projectType,
        audience: 'developers',
      },
    });

    return tasks;
  }

  /**
   * Plan user-focused documentation
   * For applications, products, SaaS platforms
   */
  private planUserGuideDocs(repoAnalysis: RepoAnalysis): DocTask[] {
    const tasks: DocTask[] = [];

    // 1. What is this?
    tasks.push({
      id: '',
      type: 'getting-started',
      path: 'getting-started/what-is.mdx',
      category: 'Getting Started',
      metadata: {
        title: 'What is this?',
        description: 'Overview and key features',
        audience: 'end-users',
        style: 'explanatory',
      },
      context: {
        technology: repoAnalysis.technology,
        projectType: repoAnalysis.projectType,
        audience: 'end-users',
      },
    });

    // 2. Getting Started
    tasks.push({
      id: '',
      type: 'getting-started',
      path: 'getting-started/getting-started.mdx',
      category: 'Getting Started',
      metadata: {
        title: 'Getting Started',
        description: 'Sign up and access the platform',
        audience: 'end-users',
        style: 'tutorial',
      },
      context: {
        technology: repoAnalysis.technology,
        projectType: repoAnalysis.projectType,
        audience: 'end-users',
      },
    });

    // 3. First Steps Tutorial
    tasks.push({
      id: '',
      type: 'tutorial',
      path: 'guides/first-steps.mdx',
      category: 'Tutorials',
      metadata: {
        title: 'Your First Steps',
        description: 'Complete your first task',
        audience: 'end-users',
        style: 'tutorial',
      },
      context: {
        technology: repoAnalysis.technology,
        projectType: repoAnalysis.projectType,
        audience: 'end-users',
      },
    });

    // 4. Common Tasks
    tasks.push({
      id: '',
      type: 'how-to',
      path: 'guides/common-tasks.mdx',
      category: 'How-To Guides',
      metadata: {
        title: 'Common Tasks',
        description: 'Frequently performed tasks',
        audience: 'end-users',
        style: 'how-to',
      },
      context: {
        technology: repoAnalysis.technology,
        projectType: repoAnalysis.projectType,
        audience: 'end-users',
      },
    });

    // 5. FAQ
    tasks.push({
      id: '',
      type: 'resource',
      path: 'help/faq.mdx',
      category: 'Help',
      metadata: {
        title: 'Frequently Asked Questions',
        description: 'Common questions and answers',
        audience: 'end-users',
        style: 'reference',
      },
      context: {
        technology: repoAnalysis.technology,
        projectType: repoAnalysis.projectType,
        audience: 'end-users',
      },
    });

    // 6. Troubleshooting
    tasks.push({
      id: '',
      type: 'resource',
      path: 'help/troubleshooting.mdx',
      category: 'Help',
      metadata: {
        title: 'Troubleshooting',
        description: 'Common issues and solutions',
        audience: 'end-users',
        style: 'how-to',
      },
      context: {
        technology: repoAnalysis.technology,
        projectType: repoAnalysis.projectType,
        audience: 'end-users',
      },
    });

    return tasks;
  }

  /**
   * Plan hybrid documentation (mixed audience)
   * For products with both end-users and developers
   */
  private planHybridDocs(repoAnalysis: RepoAnalysis): DocTask[] {
    // Combine both user and developer docs
    const userDocs = this.planUserGuideDocs(repoAnalysis);
    const devDocs = this.planDeveloperDocs(repoAnalysis);

    return [...userDocs, ...devDocs];
  }
}

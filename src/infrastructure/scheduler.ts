/**
 * Scheduler for recurring tasks using node-cron
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import { queueManager } from './job-queue.js';

const prisma = new PrismaClient();

export class Scheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize all scheduled tasks
   */
  async initialize(): Promise<void> {
    logger.info('Initializing scheduler...');

    // Daily: Audit freshness (2 AM)
    this.schedule('daily-freshness-audit', '0 2 * * *', async () => {
      await this.auditFreshness();
    });

    // Weekly: Quality review (3 AM on Sundays)
    this.schedule('weekly-quality-review', '0 3 * * 0', async () => {
      await this.qualityReview();
    });

    // Monthly: Cross-product dependency analysis (4 AM on 1st)
    this.schedule('monthly-dependency-analysis', '0 4 1 * *', async () => {
      await this.dependencyAnalysis();
    });

    // Hourly: Process low-quality docs (every hour at :15)
    this.schedule('hourly-quality-improvement', '15 * * * *', async () => {
      await this.improveQuality();
    });

    logger.info(`Scheduler initialized with ${this.tasks.size} tasks`);
  }

  /**
   * Schedule a task
   */
  schedule(
    name: string,
    cronExpression: string,
    handler: () => Promise<void>
  ): void {
    if (this.tasks.has(name)) {
      logger.warn(`Task already scheduled: ${name}`);
      return;
    }

    const task = cron.schedule(cronExpression, async () => {
      logger.info(`Running scheduled task: ${name}`);
      try {
        await handler();
        logger.info(`Scheduled task completed: ${name}`);
      } catch (error) {
        logger.error(`Scheduled task failed: ${name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.tasks.set(name, task);
    logger.info(`Scheduled task: ${name} (${cronExpression})`);
  }

  /**
   * Stop a scheduled task
   */
  stop(name: string): void {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      logger.info(`Stopped scheduled task: ${name}`);
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stopAll(): void {
    for (const [name, task] of this.tasks.entries()) {
      task.stop();
      logger.info(`Stopped scheduled task: ${name}`);
    }
    this.tasks.clear();
  }

  /**
   * Daily: Audit freshness of all active projects
   */
  private async auditFreshness(): Promise<void> {
    logger.info('Starting freshness audit...');

    const projects = await prisma.project.findMany({
      where: { status: 'active' },
    });

    for (const project of projects) {
      const freshnessScore = await this.calculateFreshness(project.id);

      await prisma.project.update({
        where: { id: project.id },
        data: { freshnessScore },
      });

      // If freshness < 95%, trigger update
      if (freshnessScore.toNumber() < 0.95) {
        logger.warn(`Project below freshness threshold`, {
          projectId: project.id,
          projectName: project.name,
          freshnessScore: freshnessScore.toNumber(),
        });

        // Queue documentation update
        const queue = queueManager.getQueue('doc-update');
        if (queue) {
          await queue.add('doc-update', {
            projectId: project.id,
            trigger: 'schedule',
            triggerPayload: {
              reason: 'freshness-below-threshold',
              freshnessScore: freshnessScore.toNumber(),
            },
          });
        }
      }
    }

    logger.info(`Freshness audit completed for ${projects.length} projects`);
  }

  /**
   * Calculate freshness score for a project
   */
  private async calculateFreshness(projectId: string): Promise<any> {
    const docs = await prisma.generatedDoc.findMany({
      where: {
        projectId,
        status: 'published',
      },
    });

    if (docs.length === 0) {
      return 0;
    }

    const now = new Date();
    const freshDocs = docs.filter((doc) => {
      if (!doc.updatedAt) return false;
      const hoursSinceUpdate =
        (now.getTime() - doc.updatedAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceUpdate <= 24;
    });

    return freshDocs.length / docs.length;
  }

  /**
   * Weekly: Quality review
   */
  private async qualityReview(): Promise<void> {
    logger.info('Starting quality review...');

    const projects = await prisma.project.findMany({
      where: { status: 'active' },
      include: {
        docs: {
          where: { status: 'published' },
        },
      },
    });

    const report = {
      totalProjects: projects.length,
      totalDocs: 0,
      avgQuality: 0,
      lowQualityDocs: 0,
    };

    for (const project of projects) {
      report.totalDocs += project.docs.length;

      const qualityScores = project.docs
        .map((doc) => doc.qualityScore?.toNumber() || 0)
        .filter((score) => score > 0);

      if (qualityScores.length > 0) {
        const avgQuality =
          qualityScores.reduce((sum, score) => sum + score, 0) /
          qualityScores.length;

        await prisma.project.update({
          where: { id: project.id },
          data: { qualityScore: avgQuality },
        });

        report.avgQuality += avgQuality;
        report.lowQualityDocs += qualityScores.filter(
          (score) => score < 0.7
        ).length;
      }
    }

    if (projects.length > 0) {
      report.avgQuality /= projects.length;
    }

    logger.info('Quality review completed', report);

    // TODO: Send report to admins via Slack
  }

  /**
   * Monthly: Cross-product dependency analysis
   */
  private async dependencyAnalysis(): Promise<void> {
    logger.info('Starting dependency analysis...');

    // TODO: Implement cross-product dependency analysis
    // This would analyze relationships between products
    // e.g., StackOps updates → Console docs need updating

    logger.info('Dependency analysis completed');
  }

  /**
   * Hourly: Improve low-quality docs
   */
  private async improveQuality(): Promise<void> {
    logger.info('Starting quality improvement...');

    const lowQualityDocs = await prisma.generatedDoc.findMany({
      where: {
        status: 'published',
        qualityScore: {
          lt: 0.7,
        },
      },
      orderBy: {
        qualityScore: 'asc',
      },
      take: 10,
    });

    if (lowQualityDocs.length === 0) {
      logger.info('No low-quality docs found');
      return;
    }

    logger.info(`Found ${lowQualityDocs.length} low-quality docs`);

    const queue = queueManager.getQueue('doc-improve');
    if (queue) {
      for (const doc of lowQualityDocs) {
        await queue.add('improve-doc', {
          docId: doc.id,
          projectId: doc.projectId,
          currentQuality: doc.qualityScore?.toNumber() || 0,
          trigger: 'schedule',
        });
      }
    }

    logger.info('Quality improvement jobs queued');
  }
}

// Singleton instance
export const scheduler = new Scheduler();

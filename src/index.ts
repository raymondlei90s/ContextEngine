/**
 * ContextEngine - Main Entry Point
 * Autonomous documentation infrastructure
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import logger from './utils/logger.js';
import { config } from './core/config.js';
import { queueManager } from './infrastructure/job-queue.js';
import { scheduler } from './infrastructure/scheduler.js';
import { RepoAnalyzerAgent } from './agents/repo-analyzer.js';
import { DocPlannerAgent } from './agents/doc-planner.js';
import { DocGeneratorAgent } from './agents/doc-generator.js';
import { MintlifyAdapter, DocFile } from './adapters/mintlify-adapter.js';

const prisma = new PrismaClient();

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  logger.info('Initializing ContextEngine...');
  logger.info(`Environment: ${config.app.nodeEnv}`);
  logger.info(`Port: ${config.app.port}`);

  // Test database connection
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }

  // Register queues
  queueManager.registerQueue('doc-update');
  queueManager.registerQueue('doc-improve');
  queueManager.registerQueue('webhook-processing');

  // Register workers
  queueManager.registerWorker('doc-update', async (job) => {
    logger.info('Processing doc-update job', { jobId: job.id, data: job.data });

    const { projectId, trigger, changedFiles } = job.data;

    try {
      // 1. Get project details
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      logger.info('Found project', {
        projectId,
        name: project.name,
        repoUrl: project.repoUrl,
      });

      // 2. Analyze repository
      const analyzer = new RepoAnalyzerAgent();
      logger.info('Starting repository analysis...');
      const analysis = await analyzer.analyze(project.repoUrl);

      logger.info('Repository analysis complete', {
        projectType: analysis.projectType,
        technology: analysis.technology.primary,
        audience: analysis.targetAudience.primary,
      });

      // Update project with analysis results
      await prisma.project.update({
        where: { id: projectId },
        data: {
          targetAudience: analysis.targetAudience.primary,
        },
      });

      // 3. Plan documentation structure
      const planner = new DocPlannerAgent();
      logger.info('Planning documentation structure...');
      const plan = await planner.plan(analysis);

      logger.info('Documentation plan created', {
        totalTasks: plan.totalTasks,
      });

      // 4. Generate each document
      const generator = new DocGeneratorAgent();
      let successCount = 0;
      let totalTokens = 0;
      const generatedDocs: DocFile[] = [];

      for (const task of plan.tasks) {
        try {
          logger.info('Generating documentation', {
            path: task.path,
            title: task.metadata.title,
            audience: task.metadata.audience,
          });

          const doc = await generator.generateDoc(task, analysis);

          // Save to database
          await prisma.generatedDoc.create({
            data: {
              projectId,
              filePath: task.path,
              title: task.metadata.title,
              content: doc.content,
              audience: task.metadata.audience,
              status: 'published',
              lastUpdatedAt: new Date(),
              lastCodeChangeAt: project.lastCodeChangeAt || new Date(),
            },
          });

          // Collect for Mintlify output
          generatedDocs.push({
            path: task.path,
            content: doc.content,
            title: task.metadata.title,
            category: task.category,
          });

          successCount++;
          totalTokens += doc.tokensUsed;

          logger.info('Documentation generated and saved', {
            path: task.path,
            tokensUsed: doc.tokensUsed,
          });
        } catch (error) {
          logger.error('Failed to generate documentation', {
            path: task.path,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with other docs even if one fails
        }
      }

      // 4.5. Write to Mintlify format
      if (generatedDocs.length > 0) {
        const outputDir = path.join(process.cwd(), 'output', projectId);
        const mintlifyAdapter = new MintlifyAdapter(outputDir);

        await mintlifyAdapter.writeAll(project.name, generatedDocs);

        logger.info('Mintlify documentation written', {
          outputDir,
          filesWritten: generatedDocs.length,
        });
      }

      // 5. Update project metrics
      const totalDocs = await prisma.generatedDoc.count({
        where: { projectId, status: 'published' },
      });

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const freshDocs = await prisma.generatedDoc.count({
        where: {
          projectId,
          status: 'published',
          lastUpdatedAt: { gte: oneDayAgo },
        },
      });

      const freshnessScore = totalDocs > 0 ? freshDocs / totalDocs : 0;

      await prisma.project.update({
        where: { id: projectId },
        data: {
          freshnessScore,
          lastGeneratedAt: new Date(),
        },
      });

      logger.info('Doc-update job completed', {
        projectId,
        successCount,
        totalTasks: plan.totalTasks,
        totalTokens,
        freshnessScore,
      });

      return {
        success: true,
        docsGenerated: successCount,
        totalTokens,
        freshnessScore,
      };
    } catch (error) {
      logger.error('Doc-update job failed', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  });

  queueManager.registerWorker('doc-improve', async (job) => {
    logger.info('Processing doc-improve job', { jobId: job.id, data: job.data });

    const { projectId, docId } = job.data;

    try {
      // Get the document to improve
      const doc = await prisma.generatedDoc.findUnique({
        where: { id: docId },
        include: { project: true },
      });

      if (!doc) {
        throw new Error(`Document not found: ${docId}`);
      }

      // Get project for context
      const project = doc.project;

      logger.info('Improving documentation', {
        docId,
        filePath: doc.filePath,
        currentQuality: doc.qualityScore,
      });

      // Re-analyze repository for latest context
      const analyzer = new RepoAnalyzerAgent();
      const analysis = await analyzer.analyze(project.repoUrl);

      // Reconstruct the doc task from saved data
      const docTask = {
        id: doc.id,
        type: 'improvement',
        path: doc.filePath,
        category: 'Improvement',
        metadata: {
          title: doc.title,
          description: `Improved version of ${doc.title}`,
          audience: (doc.audience as any) || 'developers',
          style: 'explanatory',
        },
        context: {
          technology: analysis.technology,
          projectType: analysis.projectType,
          audience: (doc.audience as any) || 'developers',
        },
      };

      // Regenerate with latest context
      const generator = new DocGeneratorAgent();
      const improvedDoc = await generator.generateDoc(docTask, analysis);

      // Update the document
      await prisma.generatedDoc.update({
        where: { id: docId },
        data: {
          content: improvedDoc.content,
          lastUpdatedAt: new Date(),
        },
      });

      logger.info('Documentation improved', {
        docId,
        tokensUsed: improvedDoc.tokensUsed,
      });

      return {
        success: true,
        tokensUsed: improvedDoc.tokensUsed,
      };
    } catch (error) {
      logger.error('Doc-improve job failed', {
        docId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  });

  queueManager.registerWorker('webhook-processing', async (job) => {
    logger.info('Processing webhook', { jobId: job.id, data: job.data });
    // TODO: Implement actual webhook processing logic
    return { success: true };
  });

  // Initialize scheduler
  if (config.features.autonomousMode) {
    await scheduler.initialize();
    logger.info('Scheduler initialized (autonomous mode enabled)');
  } else {
    logger.info('Scheduler disabled (autonomous mode off)');
  }

  logger.info('ContextEngine initialized successfully');
  logger.info('Feature flags:', config.features);
}

/**
 * Shutdown handler
 */
async function shutdown(): Promise<void> {
  logger.info('Shutting down ContextEngine...');

  // Stop scheduler
  scheduler.stopAll();

  // Close all queues and workers
  await queueManager.closeAll();

  // Disconnect database
  await prisma.$disconnect();

  logger.info('ContextEngine shutdown complete');
  process.exit(0);
}

/**
 * Main
 */
async function main(): Promise<void> {
  try {
    await initialize();

    // Handle graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    logger.info('ContextEngine is running...');
    logger.info('Press Ctrl+C to stop');

    // Keep the process running
    await new Promise(() => {});
  } catch (error) {
    logger.error('Fatal error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Run the application
main();

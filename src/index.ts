/**
 * ContextEngine - Main Entry Point
 * Autonomous documentation infrastructure
 */

import { PrismaClient } from '@prisma/client';
import logger from './utils/logger.js';
import { config } from './core/config.js';
import { queueManager } from './infrastructure/job-queue.js';
import { scheduler } from './infrastructure/scheduler.js';

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
    // TODO: Implement actual doc update logic
    return { success: true };
  });

  queueManager.registerWorker('doc-improve', async (job) => {
    logger.info('Processing doc-improve job', { jobId: job.id, data: job.data });
    // TODO: Implement actual doc improvement logic
    return { success: true };
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

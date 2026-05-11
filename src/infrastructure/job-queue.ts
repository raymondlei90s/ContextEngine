/**
 * Job Queue Infrastructure using BullMQ
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../core/config.js';
import logger from '../utils/logger.js';

// Redis connection configuration
const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

/**
 * Create a new queue
 */
export function createQueue(name: string): Queue {
  const queue = new Queue(name, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        count: 100,
      },
      removeOnFail: {
        count: 50,
      },
    },
  });

  logger.info(`Queue created: ${name}`);
  return queue;
}

/**
 * Create a worker for processing jobs
 */
export function createWorker(
  name: string,
  processor: (job: Job) => Promise<any>
): Worker {
  const worker = new Worker(name, processor, {
    connection: redisConnection,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    logger.info(`Job completed: ${job.id}`, {
      queue: name,
      jobType: job.name,
      duration: job.finishedOn! - job.processedOn!,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job failed: ${job?.id}`, {
      queue: name,
      jobType: job?.name,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error(`Worker error in ${name}`, { error: err.message });
  });

  logger.info(`Worker created: ${name}`);
  return worker;
}

/**
 * Create queue events listener
 */
export function createQueueEvents(name: string): QueueEvents {
  const queueEvents = new QueueEvents(name, {
    connection: redisConnection,
  });

  queueEvents.on('completed', ({ jobId }) => {
    logger.debug(`Queue event: completed ${jobId}`, { queue: name });
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.warn(`Queue event: failed ${jobId}`, {
      queue: name,
      reason: failedReason,
    });
  });

  return queueEvents;
}

/**
 * Queue Manager - centralized queue management
 */
export class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();

  /**
   * Register a queue
   */
  registerQueue(name: string): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = createQueue(name);
    this.queues.set(name, queue);
    return queue;
  }

  /**
   * Register a worker
   */
  registerWorker(
    queueName: string,
    processor: (job: Job) => Promise<any>
  ): Worker {
    if (this.workers.has(queueName)) {
      throw new Error(`Worker already registered for queue: ${queueName}`);
    }

    const worker = createWorker(queueName, processor);
    this.workers.set(queueName, worker);

    // Also register queue events
    const events = createQueueEvents(queueName);
    this.queueEvents.set(queueName, events);

    return worker;
  }

  /**
   * Get a queue by name
   */
  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  /**
   * Get all queues
   */
  getAllQueues(): Queue[] {
    return Array.from(this.queues.values());
  }

  /**
   * Close all queues and workers
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all queues and workers...');

    // Close all workers
    for (const [name, worker] of this.workers.entries()) {
      await worker.close();
      logger.info(`Worker closed: ${name}`);
    }

    // Close all queue events
    for (const [name, events] of this.queueEvents.entries()) {
      await events.close();
      logger.info(`Queue events closed: ${name}`);
    }

    // Close all queues
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      logger.info(`Queue closed: ${name}`);
    }

    this.workers.clear();
    this.queueEvents.clear();
    this.queues.clear();
  }

  /**
   * Get queue stats
   */
  async getStats(queueName: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      queue: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }
}

// Singleton instance
export const queueManager = new QueueManager();

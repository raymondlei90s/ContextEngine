/**
 * Event Listener Infrastructure
 * Handles webhook events from GitHub, GitLab, JIRA, Confluence, Slack
 */

import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import logger from '../utils/logger.js';
import { WebhookEvent, GitHubPushEvent, GitLabPushEvent } from '../core/types.js';

const prisma = new PrismaClient();

export class EventListener {
  private queue: Queue;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  /**
   * Process incoming webhook event
   */
  async processWebhook(event: WebhookEvent): Promise<void> {
    logger.info('Processing webhook event', {
      provider: event.provider,
      eventType: event.eventType,
    });

    // Store webhook in database
    const webhook = await prisma.webhook.create({
      data: {
        provider: event.provider,
        eventType: event.eventType,
        payload: event.payload,
        status: 'pending',
      },
    });

    try {
      // Route to appropriate handler
      switch (event.provider) {
        case 'github':
          await this.handleGitHubEvent(event, webhook.id);
          break;
        case 'gitlab':
          await this.handleGitLabEvent(event, webhook.id);
          break;
        case 'jira':
          await this.handleJiraEvent(event, webhook.id);
          break;
        case 'confluence':
          await this.handleConfluenceEvent(event, webhook.id);
          break;
        case 'slack':
          await this.handleSlackEvent(event, webhook.id);
          break;
        default:
          throw new Error(`Unknown provider: ${event.provider}`);
      }

      // Mark webhook as processed
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          status: 'processed',
          processedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error processing webhook', {
        webhookId: webhook.id,
        error: error instanceof Error ? error.message : String(error),
      });

      // Mark webhook as failed
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  /**
   * Handle GitHub events
   */
  private async handleGitHubEvent(
    event: WebhookEvent,
    webhookId: string
  ): Promise<void> {
    const { eventType, payload } = event;

    switch (eventType) {
      case 'push':
        await this.handleGitHubPush(payload as GitHubPushEvent, webhookId);
        break;
      case 'pull_request':
        await this.handleGitHubPullRequest(payload, webhookId);
        break;
      default:
        logger.debug('Ignoring GitHub event', { eventType });
    }
  }

  /**
   * Handle GitHub push events
   */
  private async handleGitHubPush(
    payload: GitHubPushEvent,
    webhookId: string
  ): Promise<void> {
    const repoFullName = payload.repository.full_name;
    logger.info('GitHub push event', { repo: repoFullName });

    // Find project by repo URL
    const project = await prisma.project.findFirst({
      where: {
        repoUrl: {
          contains: repoFullName,
        },
      },
    });

    if (!project) {
      logger.warn('Project not found for repo', { repo: repoFullName });
      return;
    }

    // Update last code change time
    await prisma.project.update({
      where: { id: project.id },
      data: {
        lastCodeChangeAt: new Date(),
      },
    });

    // Extract changed files
    const changedFiles = new Set<string>();
    payload.commits.forEach((commit) => {
      commit.added?.forEach((file) => changedFiles.add(file));
      commit.modified?.forEach((file) => changedFiles.add(file));
      commit.removed?.forEach((file) => changedFiles.add(file));
    });

    // Queue documentation update job
    await this.queue.add('doc-update', {
      projectId: project.id,
      trigger: 'webhook',
      triggerPayload: {
        webhookId,
        ref: payload.ref,
        changedFiles: Array.from(changedFiles),
      },
    });

    logger.info('Queued doc update job', {
      projectId: project.id,
      changedFiles: changedFiles.size,
    });
  }

  /**
   * Handle GitHub pull request events
   */
  private async handleGitHubPullRequest(
    payload: any,
    webhookId: string
  ): Promise<void> {
    // TODO: Implement PR handling
    logger.debug('GitHub PR event received', { action: payload.action });
  }

  /**
   * Handle GitLab events
   */
  private async handleGitLabEvent(
    event: WebhookEvent,
    webhookId: string
  ): Promise<void> {
    const { eventType, payload } = event;

    switch (eventType) {
      case 'Push Hook':
        await this.handleGitLabPush(payload as GitLabPushEvent, webhookId);
        break;
      case 'Merge Request Hook':
        await this.handleGitLabMergeRequest(payload, webhookId);
        break;
      default:
        logger.debug('Ignoring GitLab event', { eventType });
    }
  }

  /**
   * Handle GitLab push events
   */
  private async handleGitLabPush(
    payload: GitLabPushEvent,
    webhookId: string
  ): Promise<void> {
    const projectPath = payload.project.path_with_namespace;
    logger.info('GitLab push event', { project: projectPath });

    // Find project by repo URL
    const project = await prisma.project.findFirst({
      where: {
        repoUrl: {
          contains: projectPath,
        },
      },
    });

    if (!project) {
      logger.warn('Project not found for repo', { project: projectPath });
      return;
    }

    // Update last code change time
    await prisma.project.update({
      where: { id: project.id },
      data: {
        lastCodeChangeAt: new Date(),
      },
    });

    // Extract changed files
    const changedFiles = new Set<string>();
    payload.commits.forEach((commit) => {
      commit.added?.forEach((file) => changedFiles.add(file));
      commit.modified?.forEach((file) => changedFiles.add(file));
      commit.removed?.forEach((file) => changedFiles.add(file));
    });

    // Queue documentation update job
    await this.queue.add('doc-update', {
      projectId: project.id,
      trigger: 'webhook',
      triggerPayload: {
        webhookId,
        ref: payload.ref,
        changedFiles: Array.from(changedFiles),
      },
    });

    logger.info('Queued doc update job', {
      projectId: project.id,
      changedFiles: changedFiles.size,
    });
  }

  /**
   * Handle GitLab merge request events
   */
  private async handleGitLabMergeRequest(
    payload: any,
    webhookId: string
  ): Promise<void> {
    // TODO: Implement MR handling
    logger.debug('GitLab MR event received', { action: payload.object_attributes?.action });
  }

  /**
   * Handle JIRA events
   */
  private async handleJiraEvent(
    event: WebhookEvent,
    webhookId: string
  ): Promise<void> {
    // TODO: Implement JIRA handling
    logger.debug('JIRA event received', { eventType: event.eventType });
  }

  /**
   * Handle Confluence events
   */
  private async handleConfluenceEvent(
    event: WebhookEvent,
    webhookId: string
  ): Promise<void> {
    // TODO: Implement Confluence handling
    logger.debug('Confluence event received', { eventType: event.eventType });
  }

  /**
   * Handle Slack events
   */
  private async handleSlackEvent(
    event: WebhookEvent,
    webhookId: string
  ): Promise<void> {
    // TODO: Implement Slack handling
    logger.debug('Slack event received', { eventType: event.eventType });
  }
}

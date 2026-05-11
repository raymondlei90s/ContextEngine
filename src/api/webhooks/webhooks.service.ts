/**
 * Webhooks Service
 * Processes incoming webhook events
 */

import { Injectable } from '@nestjs/common';
import { EventListener } from '../../infrastructure/event-listener.js';
import { queueManager } from '../../infrastructure/job-queue.js';
import { WebhookEvent } from '../../core/types.js';
import logger from '../../utils/logger.js';

@Injectable()
export class WebhooksService {
  private eventListener: EventListener;

  constructor() {
    const queue = queueManager.getQueue('webhook-processing')!;
    this.eventListener = new EventListener(queue);
  }

  async handleGitHub(payload: any, eventType: string, signature: string) {
    logger.info('Received GitHub webhook', { eventType });

    // TODO: Verify signature

    const event: WebhookEvent = {
      id: crypto.randomUUID(),
      provider: 'github',
      eventType,
      payload,
      receivedAt: new Date(),
    };

    await this.eventListener.processWebhook(event);

    return { message: 'Webhook processed' };
  }

  async handleGitLab(payload: any, eventType: string, token: string) {
    logger.info('Received GitLab webhook', { eventType });

    // TODO: Verify token

    const event: WebhookEvent = {
      id: crypto.randomUUID(),
      provider: 'gitlab',
      eventType,
      payload,
      receivedAt: new Date(),
    };

    await this.eventListener.processWebhook(event);

    return { message: 'Webhook processed' };
  }
}

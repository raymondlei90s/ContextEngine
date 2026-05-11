/**
 * Webhooks Controller
 * Handles incoming webhooks from GitHub, GitLab, etc.
 */

import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { WebhooksService } from './webhooks.service.js';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('github')
  @HttpCode(200)
  async handleGitHub(
    @Body() payload: any,
    @Headers('x-github-event') eventType: string,
    @Headers('x-hub-signature-256') signature: string
  ) {
    return this.webhooksService.handleGitHub(payload, eventType, signature);
  }

  @Post('gitlab')
  @HttpCode(200)
  async handleGitLab(
    @Body() payload: any,
    @Headers('x-gitlab-event') eventType: string,
    @Headers('x-gitlab-token') token: string
  ) {
    return this.webhooksService.handleGitLab(payload, eventType, token);
  }
}

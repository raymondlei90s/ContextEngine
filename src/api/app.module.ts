/**
 * Main Application Module
 * Root module for NestJS application
 */

import { Module } from '@nestjs/common';
import { ProjectsModule } from './projects/projects.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ProjectsModule,
    WebhooksModule,
    JobsModule,
    HealthModule,
  ],
})
export class AppModule {}

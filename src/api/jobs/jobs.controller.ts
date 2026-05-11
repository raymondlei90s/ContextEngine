/**
 * Jobs Controller
 * Monitor generation jobs
 */

import { Controller, Get, Param } from '@nestjs/common';
import { JobsService } from './jobs.service.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.jobsService.findByProject(projectId);
  }
}

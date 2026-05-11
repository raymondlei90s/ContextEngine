/**
 * Projects Controller
 * Manages documentation projects
 */

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  async findAll(@Query('status') status?: string) {
    return this.projectsService.findAll(status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post(':id/generate')
  async triggerGeneration(@Param('id') id: string) {
    return this.projectsService.triggerGeneration(id);
  }

  @Get(':id/metrics')
  async getMetrics(@Param('id') id: string) {
    return this.projectsService.getMetrics(id);
  }
}

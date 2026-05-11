/**
 * Projects Service
 * Business logic for projects
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { queueManager } from '../../infrastructure/job-queue.js';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();

@Injectable()
export class ProjectsService {
  async create(createProjectDto: CreateProjectDto) {
    logger.info('Creating project', { name: createProjectDto.name });

    const project = await prisma.project.create({
      data: {
        name: createProjectDto.name,
        repoUrl: createProjectDto.repoUrl,
        repoType: createProjectDto.repoType || 'github',
        docFramework: createProjectDto.docFramework || 'mintlify',
        targetAudience: createProjectDto.targetAudience || 'developers',
        docStyle: createProjectDto.docStyle || 'api-reference',
        status: 'active',
      },
    });

    // Trigger initial documentation generation
    const queue = queueManager.getQueue('doc-update');
    if (queue) {
      await queue.add('doc-update', {
        projectId: project.id,
        trigger: 'manual',
        triggerPayload: {
          reason: 'initial-creation',
        },
      });
    }

    logger.info('Project created', { projectId: project.id });

    return project;
  }

  async findAll(status?: string) {
    const where = status ? { status } : {};

    return prisma.project.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            jobs: true,
            docs: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  async triggerGeneration(id: string) {
    const project = await this.findOne(id);

    logger.info('Triggering documentation generation', { projectId: id });

    const queue = queueManager.getQueue('doc-update');
    if (!queue) {
      throw new Error('Job queue not available');
    }

    const job = await queue.add('doc-update', {
      projectId: id,
      trigger: 'manual',
      triggerPayload: {
        reason: 'manual-trigger',
      },
    });

    return {
      message: 'Documentation generation queued',
      jobId: job.id,
      projectId: id,
    };
  }

  async getMetrics(id: string) {
    const project = await this.findOne(id);

    // Get docs count by status
    const docsByStatus = await prisma.generatedDoc.groupBy({
      by: ['status'],
      where: { projectId: id },
      _count: true,
    });

    // Get recent jobs
    const recentJobs = await prisma.generationJob.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        triggerType: true,
        createdAt: true,
        completedAt: true,
      },
    });

    // Calculate freshness
    const docs = await prisma.generatedDoc.findMany({
      where: {
        projectId: id,
        status: 'published',
      },
    });

    let freshDocs = 0;
    const now = new Date();

    for (const doc of docs) {
      if (doc.updatedAt) {
        const hoursSinceUpdate =
          (now.getTime() - doc.updatedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate <= 24) {
          freshDocs++;
        }
      }
    }

    const freshnessRate = docs.length > 0 ? freshDocs / docs.length : 0;

    return {
      projectId: id,
      projectName: project.name,
      docsByStatus,
      freshnessRate,
      freshnessScore: project.freshnessScore?.toNumber(),
      qualityScore: project.qualityScore?.toNumber(),
      recentJobs,
      totalDocs: docs.length,
      freshDocs,
      lastGeneratedAt: project.lastGeneratedAt,
      lastCodeChangeAt: project.lastCodeChangeAt,
    };
  }
}

/**
 * Jobs Service
 * Business logic for jobs
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class JobsService {
  async findOne(id: string) {
    const job = await prisma.generationJob.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return job;
  }

  async findByProject(projectId: string) {
    return prisma.generationJob.findMany({
      where: { projectId },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }
}

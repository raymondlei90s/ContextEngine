/**
 * Health Check Controller
 */

import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { config } from '../../core/config.js';

const prisma = new PrismaClient();
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
});

@Controller('health')
export class HealthController {
  @Get()
  async check() {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'ok',
        database: 'unknown',
        redis: 'unknown',
      },
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.services.database = 'ok';
    } catch (error) {
      health.services.database = 'error';
      health.status = 'degraded';
    }

    // Check Redis
    try {
      await redis.ping();
      health.services.redis = 'ok';
    } catch (error) {
      health.services.redis = 'error';
      health.status = 'degraded';
    }

    return health;
  }

  @Get('liveness')
  liveness() {
    return { status: 'ok' };
  }

  @Get('readiness')
  async readiness() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      throw new Error('Database not ready');
    }
  }
}

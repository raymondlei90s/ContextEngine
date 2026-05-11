/**
 * NestJS Application Bootstrap
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { config } from '../core/config.js';
import logger from '../utils/logger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api/v1');

  const port = config.app.port;
  await app.listen(port);

  logger.info(`🚀 ContextEngine API listening on port ${port}`);
  logger.info(`📍 API: http://localhost:${port}/api/v1`);
  logger.info(`💚 Health: http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((error) => {
  logger.error('Failed to start application', { error: error.message });
  process.exit(1);
});

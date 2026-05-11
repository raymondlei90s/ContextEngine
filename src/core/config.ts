/**
 * Configuration loader for ContextEngine
 */

import { config as loadEnv } from 'dotenv';
import { Config } from './types.js';

// Load environment variables
loadEnv();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for ${key}: ${value}`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

export const config: Config = {
  app: {
    nodeEnv: getEnv('NODE_ENV', 'development'),
    port: getEnvNumber('PORT', 3000),
    logLevel: getEnv('LOG_LEVEL', 'info'),
  },
  database: {
    url: getEnv('DATABASE_URL'),
  },
  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: process.env.REDIS_PASSWORD,
  },
  anthropic: {
    apiKey: getEnv('ANTHROPIC_API_KEY'),
    model: getEnv('ANTHROPIC_MODEL', 'claude-sonnet-4-5@20250929'),
  },
  github: process.env.GITHUB_APP_ID
    ? {
        appId: getEnv('GITHUB_APP_ID'),
        privateKey: getEnv('GITHUB_PRIVATE_KEY'),
        webhookSecret: getEnv('GITHUB_WEBHOOK_SECRET'),
      }
    : undefined,
  gitlab: process.env.GITLAB_ACCESS_TOKEN
    ? {
        accessToken: getEnv('GITLAB_ACCESS_TOKEN'),
        webhookSecret: getEnv('GITLAB_WEBHOOK_SECRET'),
      }
    : undefined,
  features: {
    learningLoop: getEnvBoolean('ENABLE_LEARNING_LOOP', false),
    autonomousMode: getEnvBoolean('ENABLE_AUTONOMOUS_MODE', false),
    multiFramework: getEnvBoolean('ENABLE_MULTI_FRAMEWORK', true),
    knowledgeGraph: getEnvBoolean('ENABLE_KNOWLEDGE_GRAPH', true),
  },
};

export default config;

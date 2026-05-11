# Development Guide

This guide covers development workflows, architecture decisions, and best practices for ContextEngine.

---

## 📋 Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Architecture Principles](#architecture-principles)
- [Database Management](#database-management)
- [Testing Strategy](#testing-strategy)
- [Code Style](#code-style)
- [Debugging](#debugging)

---

## 🛠️ Development Setup

### Initial Setup

```bash
# Install dependencies
npm install

# Start infrastructure
docker-compose up -d

# Run database migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Start development server
npm run dev
```

### Environment Variables

Create `.env` file (never commit this!):

```bash
cp .env.example .env
```

Minimum required for development:
```bash
NODE_ENV=development
DATABASE_URL=postgresql://contextengine:password@localhost:5432/contextengine
REDIS_HOST=localhost
ANTHROPIC_API_KEY=sk-ant-...
```

### IDE Setup

**VS Code** (recommended extensions):
- ESLint
- Prettier
- Prisma
- Docker
- GitLens

**Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 📁 Project Structure

```
ContextEngine/
├── src/
│   ├── api/              # API routes & controllers
│   ├── agents/           # Autonomous agents
│   │   ├── repo-analyzer.ts
│   │   ├── doc-planner.ts
│   │   ├── doc-generator.ts
│   │   └── quality-reviewer.ts
│   ├── core/             # Core types & configuration
│   │   ├── types.ts
│   │   └── config.ts
│   ├── infrastructure/   # Infrastructure layer
│   │   ├── event-listener.ts
│   │   ├── job-queue.ts
│   │   └── scheduler.ts
│   ├── adapters/         # Doc framework adapters
│   │   ├── mintlify.ts
│   │   ├── docusaurus.ts
│   │   └── vitepress.ts
│   └── utils/            # Utilities
│       └── logger.ts
├── prisma/
│   └── schema.prisma     # Database schema
├── config/               # Configuration files
├── docs/                 # Documentation
├── scripts/              # Utility scripts
├── tests/                # Test files
└── docker-compose.yml    # Local development stack
```

---

## 🏛️ Architecture Principles

### 1. Event-Driven Design

ContextEngine uses an event-driven architecture:

```typescript
// Event flow
Webhook → Event Listener → Job Queue → Worker → Database
```

**Why:**
- Decouples event sources from processing
- Enables horizontal scaling
- Provides retry & error handling
- Allows async processing

### 2. Type Safety

Everything is typed with TypeScript strict mode:

```typescript
// Good
interface GenerationTask {
  id: string;
  projectId: string;
  type: 'full' | 'incremental';
}

// Bad
const task: any = {...};
```

### 3. Database-First

Prisma schema is the source of truth:

```
1. Update schema.prisma
2. Generate migration: npm run db:migrate
3. Generate client: npm run db:generate
4. Use type-safe Prisma client
```

### 4. Job Queue Pattern

Long-running tasks go through BullMQ:

```typescript
// Enqueue
await queue.add('doc-update', {
  projectId: '123',
  trigger: 'webhook'
});

// Process
queueManager.registerWorker('doc-update', async (job) => {
  // Handle job.data
});
```

**When to use:**
- Doc generation (minutes)
- Webhook processing (seconds)
- Quality analysis (minutes)
- Any background task

**When NOT to use:**
- API responses (milliseconds)
- Health checks
- Simple queries

### 5. Separation of Concerns

```
API Layer        → Express/NestJS routes
Business Logic   → Agents & services
Data Access      → Prisma ORM
Infrastructure   → Queues, schedulers, events
```

---

## 🗄️ Database Management

### Migrations

```bash
# Create a migration
npm run db:migrate -- --name add_quality_metrics

# Apply migrations
npm run db:migrate

# Reset database (DESTRUCTIVE!)
npx prisma migrate reset
```

### Seeding

```bash
# Seed development data
npx prisma db seed
```

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test project
  await prisma.project.create({
    data: {
      name: 'Test Project',
      repoUrl: 'https://github.com/test/repo',
      repoType: 'github',
      docFramework: 'mintlify',
      targetAudience: 'developers',
      docStyle: 'api-reference',
    },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Database Studio

```bash
# Open Prisma Studio (GUI)
npm run db:studio
```

Navigate to http://localhost:5555

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// tests/utils/logger.test.ts
import { describe, it, expect } from 'vitest';
import logger from '../src/utils/logger';

describe('Logger', () => {
  it('should log info messages', () => {
    expect(() => logger.info('test')).not.toThrow();
  });
});
```

Run:
```bash
npm test
npm run test:coverage
```

### Integration Tests

```typescript
// tests/integration/webhook.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Webhook Processing', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should process GitHub push event', async () => {
    // Test implementation
  });
});
```

### E2E Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run E2E tests
npm run test:e2e
```

---

## 🎨 Code Style

### TypeScript Style

```typescript
// Use explicit types
const config: Config = {...};

// Prefer interfaces over types
interface User {
  id: string;
  name: string;
}

// Use async/await, not promises
async function fetchData() {
  const result = await api.get('/data');
  return result;
}

// Handle errors explicitly
try {
  await operation();
} catch (error) {
  logger.error('Operation failed', { error });
  throw error;
}
```

### Naming Conventions

```typescript
// Files: kebab-case
event-listener.ts
job-queue.ts

// Classes: PascalCase
class EventListener {}
class QueueManager {}

// Functions: camelCase
function processWebhook() {}
async function generateDocs() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;

// Enums: PascalCase for enum, UPPER_SNAKE_CASE for values
enum JobStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
}
```

### Linting & Formatting

```bash
# Lint
npm run lint

# Fix lint issues
npm run lint -- --fix

# Format
npm run format
```

---

## 🐛 Debugging

### Logs

```typescript
import logger from './utils/logger';

// Levels: error, warn, info, debug
logger.info('Processing webhook', { webhookId: '123' });
logger.error('Failed to process', { error: err.message });
```

View logs:
```bash
# Real-time logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Docker logs
docker-compose logs -f
```

### Database Debugging

```bash
# Connect to PostgreSQL
docker exec -it contextengine-postgres psql -U contextengine

# Useful queries
SELECT * FROM projects;
SELECT * FROM generation_jobs ORDER BY created_at DESC LIMIT 10;
SELECT * FROM webhooks WHERE status = 'failed';
```

### Queue Debugging

```bash
# Connect to Redis
docker exec -it contextengine-redis redis-cli

# Useful commands
KEYS *                           # List all keys
LLEN bull:doc-update:wait        # Queue length
LRANGE bull:doc-update:wait 0 10 # View jobs
```

### Node.js Debugging

```bash
# VS Code launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug ContextEngine",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

---

## 🚀 Common Tasks

### Add a New Event Type

1. Update `src/core/types.ts`:
```typescript
export interface JiraIssueEvent {
  issue: {
    id: string;
    key: string;
    fields: {...};
  };
}
```

2. Update `src/infrastructure/event-listener.ts`:
```typescript
private async handleJiraEvent(event: WebhookEvent) {
  const payload = event.payload as JiraIssueEvent;
  // Process event
}
```

3. Test:
```bash
curl -X POST http://localhost:3000/webhooks/jira \
  -H "Content-Type: application/json" \
  -d @test-data/jira-issue.json
```

### Add a New Doc Framework Adapter

1. Create `src/adapters/my-framework.ts`:
```typescript
import { DocFrameworkAdapter } from './types';

export class MyFrameworkAdapter implements DocFrameworkAdapter {
  name = 'my-framework';
  
  generateConfig(project) {
    // Implementation
  }
  
  generatePage(doc) {
    // Implementation
  }
}
```

2. Register in adapter registry
3. Add tests

### Add a New Scheduled Task

```typescript
// In src/infrastructure/scheduler.ts
scheduler.schedule('my-task', '0 * * * *', async () => {
  // Run every hour
  await myTaskLogic();
});
```

---

## 📚 Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [BullMQ Guide](https://docs.bullmq.io/)
- [NestJS Docs](https://docs.nestjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript)

---

**Questions?** Open an issue or ask in the team Slack channel.

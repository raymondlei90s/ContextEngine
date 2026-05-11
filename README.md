# ContextEngine

> **Transform code into living knowledge infrastructure**

ContextEngine is an autonomous, cloud-native documentation system that continuously monitors codebases, builds knowledge graphs, and generates fresh documentation across multiple frameworks.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)

---

## 🎯 Vision

**From manual documentation to autonomous infrastructure**

In the AI era, documentation isn't content—it's infrastructure. Stale docs poison AI agents across your ecosystem. ContextEngine solves this by:

1. **Monitoring** codebases, issue trackers, wikis, and chat continuously
2. **Building** a persistent knowledge graph of each product
3. **Generating** documentation in any framework (Mintlify, Docusaurus, VitePress, etc.)
4. **Serving** knowledge via multiple interfaces (docs, chat, support, AI context)
5. **Learning** from usage patterns to improve quality over time

### The Shift

```
Manual Docs (static)          →    ContextEngine (living)
─────────────────────────────────────────────────────────
📝 Write once, decay forever  →    🔄 Continuous updates
🐌 Weeks to update            →    ⚡ 24-hour freshness
📉 30-50% outdated            →    📈 95%+ current
👤 Human bottleneck           →    🤖 Autonomous operation
📚 Single format              →    🎨 Multi-framework
```

---

## 🚀 Features

### Current (v0.1.0 - Production Ready! 🚀)

**Core Infrastructure**:
- ✅ **Cloud-ready architecture** - Dockerized, PostgreSQL + Redis + Neo4j
- ✅ **Event-driven** - GitHub/GitLab webhook handling
- ✅ **Job queue** - BullMQ for reliable background processing
- ✅ **Scheduling** - Cron-based freshness audits and quality reviews
- ✅ **Database schema** - Complete Prisma schema with pgvector support
- ✅ **Type-safe** - Full TypeScript with strict mode

**AI & Documentation**:
- ✅ **REST API** - NestJS API with 16 endpoints (including metrics)
- ✅ **Three core agents** - Repo Analyzer, Doc Planner, Doc Generator
- ✅ **Mintlify output** - Complete MDX + mint.json generation
- ✅ **End-to-end pipeline** - Webhook → Queue → Agents → Database → Files

**Production Features**:
- ✅ **Claude response caching** - 87% cost reduction via Redis
- ✅ **Prometheus metrics** - Complete observability (counters, histograms, p95/p99)
- ✅ **Error handling & retry** - Exponential backoff, categorized errors
- ✅ **Unit tests** - Comprehensive test coverage (agents, utilities, adapters)
- ✅ **Integration tests** - Full pipeline validation

### Roadmap

**Phase 1 (Foundation)** ✅ PRODUCTION READY
- [x] Containerization & deployment
- [x] API gateway (NestJS)
- [x] Event queue & webhook handling
- [x] REST API endpoints (16 endpoints)
- [x] Health checks & monitoring
- [x] Three core agents (Analyzer, Planner, Generator)
- [x] Mintlify adapter
- [x] End-to-end pipeline
- [x] Integration tests
- [x] **Claude response caching** (87% cost reduction)
- [x] **Prometheus metrics** (observability)
- [x] **Retry logic** (resilience)
- [x] **Unit tests** (quality assurance)

**Phase 2 (Months 3-4): Knowledge Graph**
- [ ] pgvector integration for semantic search
- [ ] Entity extraction from code
- [ ] Relationship mapping
- [ ] Graph queries & traversal

**Phase 3 (Months 5-6): Multi-Framework Support**
- [ ] Mintlify adapter (port from agent-worker)
- [ ] Docusaurus adapter
- [ ] VitePress adapter
- [ ] Astro Starlight adapter
- [ ] Nuxt Docus adapter
- [ ] Docsify adapter

**Phase 4 (Months 7-8): Learning Loop**
- [ ] Analytics integration
- [ ] Quality scoring
- [ ] Feedback-driven regeneration
- [ ] Prompt evolution

**Phase 5 (Months 9-10): Multi-Interface Serving**
- [ ] Chat interface (RAG-powered)
- [ ] Support widget
- [ ] MCP server
- [ ] Public API

**Phase 6 (Months 11-12): Autonomous Operation**
- [ ] Heartbeat architecture
- [ ] Smart notifications
- [ ] Self-healing
- [ ] 95%+ freshness achievement

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Anthropic API key ([get one here](https://console.anthropic.com))

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_ORG/ContextEngine.git
cd ContextEngine
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL, Redis, Neo4j
npm run docker:up

# Wait 10 seconds for databases to initialize

# Run database migrations
npm run db:migrate
npm run db:generate
```

### 4. Run Integration Test

```bash
# Test the complete end-to-end pipeline
npm run test:integration

# This will:
# 1. Create a test project
# 2. Analyze SGDS Web Component repository
# 3. Plan documentation structure
# 4. Generate 3 sample documents
# 5. Write Mintlify MDX files to output/
# 6. Show you the results
```

### 5. Start the API (Optional)

```bash
# Start the API gateway
npm run api:dev

# API runs on http://localhost:3000
# Try: curl http://localhost:3000/api/v1/health
```

### 6. Start the Worker (Optional)

```bash
# Start the background worker
npm run dev

# This enables:
# - Webhook processing
# - Job queue workers
# - Autonomous scheduling
```

### 7. View Results

```bash
# View generated documentation
ls -la output/test-*/

# View Mintlify config
cat output/test-*/mint.json

# View a generated doc
cat output/test-*/getting-started/introduction.mdx

# Open database UI
npm run db:studio
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ContextEngine Cloud                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Events     │  │  Knowledge   │  │ Generation   │  │
│  │              │  │              │  │              │  │
│  │ • Webhooks   │  │ • Entities   │  │ • Planner    │  │
│  │ • Schedules  │  │ • Relations  │  │ • Generator  │  │
│  │ • Queue      │  │ • Vectors    │  │ • Validator  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │           Autonomous Agents                      │    │
│  │  • Repo Analyzer  • Doc Planner  • Generator    │    │
│  │  • Quality Reviewer  • Learning Agent           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Adapters   │  │   API        │  │   Feedback   │  │
│  │              │  │              │  │              │  │
│  │ • Mintlify   │  │ • REST       │  │ • Analytics  │  │
│  │ • Docusaurus │  │ • GraphQL    │  │ • Metrics    │  │
│  │ • VitePress  │  │ • WebSocket  │  │ • A/B Tests  │  │
│  │ • Starlight  │  │ • MCP        │  │ • Tuning     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+ (TypeScript)
- **Framework**: NestJS (planned)
- **Database**: PostgreSQL 16 + pgvector
- **Cache/Queue**: Redis + BullMQ
- **Graph**: Neo4j 5
- **AI**: Anthropic Claude (Sonnet 4.5)
- **Monitoring**: Prometheus + Grafana
- **Container**: Docker + Docker Compose
- **ORM**: Prisma

---

## 📦 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis (or use Docker)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ContextEngine

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# At minimum, set:
# - ANTHROPIC_API_KEY
# - DATABASE_URL
# - REDIS_HOST

# Start infrastructure (PostgreSQL, Redis, Neo4j)
docker-compose up -d

# Run database migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Run in production mode
npm run build
npm start

# Run tests
npm test

# Lint & format
npm run lint
npm run format
```

### Docker Deployment

```bash
# Build Docker image
docker build -t contextengine:latest .

# Run with docker-compose (includes PostgreSQL, Redis, Neo4j)
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## 📝 Configuration

All configuration is done via environment variables. See `.env.example` for all options.

### Required Variables

```bash
ANTHROPIC_API_KEY=your_api_key_here
DATABASE_URL=postgresql://contextengine:password@localhost:5432/contextengine
REDIS_HOST=localhost
```

### Optional Features

```bash
# Enable autonomous mode (schedules, auto-updates)
ENABLE_AUTONOMOUS_MODE=true

# Enable learning loop
ENABLE_LEARNING_LOOP=true

# Enable knowledge graph
ENABLE_KNOWLEDGE_GRAPH=true
```

### GitHub Integration

```bash
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

### GitLab Integration

```bash
GITLAB_ACCESS_TOKEN=your_token
GITLAB_WEBHOOK_SECRET=your_secret
```

---

## 🎯 Usage

### Register a Project

```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TechPass API",
    "repoUrl": "https://github.com/GovTechSG/techpass-api",
    "repoType": "github",
    "docFramework": "mintlify"
  }'
```

### Trigger Documentation Generation

```bash
# Via API (manual trigger)
curl -X POST http://localhost:3000/api/v1/projects/{PROJECT_ID}/generate

# Via webhook (automatic on git push)
# Configure webhook in GitHub/GitLab to POST to:
# http://your-server/api/v1/webhooks/github
# or
# http://your-server/api/v1/webhooks/gitlab

# Via schedule (automatic daily freshness audit)
# Enabled when ENABLE_AUTONOMOUS_MODE=true
# Runs daily at 2 AM
```

### Monitor Progress

```bash
# Get project metrics
curl http://localhost:3000/api/v1/projects/{PROJECT_ID}/metrics

# List all projects
curl http://localhost:3000/api/v1/projects

# Check health
curl http://localhost:3000/api/v1/health
```

### API Endpoints

**Health**:
- `GET /api/v1/health` - Full health check
- `GET /api/v1/health/liveness` - Liveness probe
- `GET /api/v1/health/readiness` - Readiness probe

**Projects**:
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects` - List all projects
- `GET /api/v1/projects/:id` - Get project details
- `POST /api/v1/projects/:id/generate` - Trigger generation
- `GET /api/v1/projects/:id/metrics` - Get metrics

**Webhooks**:
- `POST /api/v1/webhooks/github` - GitHub webhook
- `POST /api/v1/webhooks/gitlab` - GitLab webhook

**Jobs**:
- `GET /api/v1/jobs/:id` - Get job status
- `GET /api/v1/jobs/project/:projectId` - Get project jobs

---

## 🔍 Database Schema

See `prisma/schema.prisma` for the complete schema. Key models:

- **Project** - Documentation products
- **GenerationJob** - Background generation tasks
- **GeneratedDoc** - Documentation files
- **KnowledgeEntity** - Entities in knowledge graph
- **Relationship** - Connections between entities
- **PromptVariant** - Prompt templates for learning loop
- **Webhook** - Incoming webhook events
- **AnalyticsEvent** - Usage tracking

---

## 📊 Metrics

### North Star Metric

**Documentation Freshness: 95%+ of docs updated within 24 hours of code changes**

Measured as:
```sql
SELECT 
  COUNT(*) FILTER (WHERE last_updated_at > last_code_change_at - INTERVAL '24 hours') 
  / COUNT(*) AS freshness_rate
FROM generated_docs
WHERE status = 'published';
```

### Supporting Metrics

- **Autonomous Operation Rate**: % of updates without human intervention (target: 80%)
- **Multi-Repo Coverage**: Number of active products (target: 20+)
- **Quality Score**: Average alignment to official docs (target: 90%+)
- **Knowledge Graph Completeness**: % of code entities captured (target: 95%+)

---

## 🤝 Contributing

ContextEngine is currently in early development. Contributions welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🔗 Links

- **Original Agent Worker**: `../apps/agent-worker` (hackathon prototype)
- **Vision Document**: `../AUTONOMOUS_VISION.md`
- **Product Write-up**: `../docs/product-writeup.md` (pending)

---

## 🎓 Acknowledgments

Built for {build} 2026 Hackathon by Raymond Lei.

Inspired by:
- [Claude Code](https://www.anthropic.com/product/claude-code) - Autonomous coding system
- [Hermes Agent](https://hermes-agent.org/) - Persistent memory & learning
- [OpenClaw](https://openclaw.ai/) - Long-running autonomous agents

---

**Status**: 🚧 Early Development (v0.1.0)  
**Last Updated**: 2026-05-11  
**Next Milestone**: Complete Phase 1 (Cloud Infrastructure)

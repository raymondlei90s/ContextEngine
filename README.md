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

### Current (v0.1.0 - Foundation)

- ✅ **Cloud-ready architecture** - Dockerized, PostgreSQL + Redis + Neo4j
- ✅ **Event-driven** - GitHub/GitLab webhook handling
- ✅ **Job queue** - BullMQ for reliable background processing
- ✅ **Scheduling** - Cron-based freshness audits and quality reviews
- ✅ **Database schema** - Complete Prisma schema with pgvector support
- ✅ **Type-safe** - Full TypeScript with strict mode
- ✅ **Logging & monitoring** - Winston logger, Prometheus/Grafana ready

### Roadmap

**Phase 1 (Months 1-2): Cloud Infrastructure** ✅ CURRENT
- [x] Containerization & deployment
- [x] API gateway setup
- [x] Event queue & webhook handling
- [ ] REST API endpoints
- [ ] Health checks & monitoring

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

```typescript
// TODO: API endpoints to be implemented
POST /api/v1/projects
{
  "name": "TechPass API",
  "repoUrl": "https://github.com/GovTechSG/techpass-api",
  "repoType": "github",
  "docFramework": "mintlify",
  "targetAudience": "developers",
  "docStyle": "api-reference"
}
```

### Trigger Documentation Generation

```bash
# Via webhook (automatic on git push)
# Configure webhook in GitHub/GitLab

# Via API (manual trigger)
POST /api/v1/projects/:id/generate

# Via schedule (automatic daily freshness audit)
# Enabled when ENABLE_AUTONOMOUS_MODE=true
```

### Monitor Jobs

```bash
# Check queue stats
GET /api/v1/queues/doc-update/stats

# View job status
GET /api/v1/jobs/:jobId
```

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

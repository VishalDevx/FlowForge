# FlowForge

A distributed workflow execution platform for building, testing, and running automated workflows.

[ ![Build workflows that scale](#) ](#)

## Features

- **Visual Workflow Editor** - Drag and drop nodes to build workflows visually
- **Distributed Execution** - Run workflows at scale with BullMQ workers
- **Real-time Monitoring** - Watch workflows execute in real-time
- **Multi-tenancy** - Workspaces with team collaboration and RBAC
- **Triggers** - Webhook, cron, manual, and event-based triggers
- **Node Types** - HTTP requests, conditions, delays, transformations, emails
- **Reliability** - Retries, dead-letter queues, timeouts
- **Secrets Management** - Encrypted secrets with per-workspace scoping
- **Audit Logging** - Full audit trail for compliance

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL 16+
- **ORM**: Prisma 5.x
- **Queue**: BullMQ
- **Cache**: Redis 7+
- **Auth**: JWT with refresh tokens
- **Validation**: Zod

### Frontend
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Workflow Editor**: React Flow

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/flowforge.git
cd flowforge
```

2. **Start infrastructure**
```bash
docker compose -f docker-compose.dev.yml up -d
```

3. **Install dependencies**
```bash
pnpm install
```

4. **Generate Prisma client**
```bash
cd packages/db
DATABASE_URL="postgresql://flowforge:flowforge@localhost:5432/flowforge" npx prisma generate
DATABASE_URL="postgresql://flowforge:flowforge@localhost:5432/flowforge" npx prisma db push
```

5. **Start API server**
```bash
cd apps/api
DATABASE_URL="postgresql://flowforge:flowforge@localhost:5432/flowforge" pnpm dev
```

6. **Start frontend** (new terminal)
```bash
cd apps/web
pnpm dev
```

The API runs on `http://localhost:3000`
The frontend runs on `http://localhost:3002`

## API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Get current user |

### Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/workspaces` | Create workspace |
| GET | `/api/v1/workspaces` | List workspaces |
| GET | `/api/v1/workspaces/:id` | Get workspace |
| PATCH | `/api/v1/workspaces/:id` | Update workspace |
| DELETE | `/api/v1/workspaces/:id` | Delete workspace |

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/workflows` | Create workflow |
| GET | `/api/v1/workflows` | List workflows |
| GET | `/api/v1/workflows/:id` | Get workflow |
| PATCH | `/api/v1/workflows/:id` | Update workflow |
| DELETE | `/api/v1/workflows/:id` | Delete workflow |

### Executions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/executions` | Run workflow |
| GET | `/api/v1/executions` | List executions |
| GET | `/api/v1/executions/:id` | Get execution |
| POST | `/api/v1/executions/:id/cancel` | Cancel execution |
| POST | `/api/v1/executions/:id/retry` | Retry execution |

### Triggers

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/triggers` | Create trigger |
| PATCH | `/api/v1/triggers/:id` | Update trigger |
| DELETE | `/api/v1/triggers/:id` | Delete trigger |
| GET | `/api/v1/triggers/webhook/:key` | Webhook endpoint |

### Secrets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/secrets` | Create secret |
| GET | `/api/v1/secrets` | List secrets |
| PATCH | `/api/v1/secrets/:id` | Update secret |
| DELETE | `/api/v1/secrets/:id` | Delete secret |

## Environment Variables

### API
```env
DATABASE_URL=postgresql://flowforge:flowforge@localhost:5432/flowforge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=32-character-encryption-key
PORT=3000
```

### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
PORT=3002
```

## Project Structure

```
flowforge/
├── apps/
│   ├── api/           # Fastify API server
│   ├── worker/        # BullMQ worker
│   ├── scheduler/    # Cron/scheduled trigger processor
│   ├── realtime/     # WebSocket gateway
│   └── web/          # Next.js frontend
├── packages/
│   ├── db/           # Prisma schema and client
│   ├── redis/       # Redis client
│   ├── queue/       # BullMQ queues
│   ├── auth/         # JWT authentication
│   ├── workflow-engine/  # DAG parser and executor
│   ├── nodes/        # Node executors
│   ├── contracts/    # Zod schemas
│   ├── logger/       # Pino logging
│   ├── observability/ # Prometheus metrics
│   └── utils/        # Utilities
└── infra/
    └── docker/        # Dockerfiles
```

## Node Types

### Trigger Nodes
- `trigger.webhook` - HTTP webhook trigger
- `trigger.cron` - Cron schedule trigger
- `trigger.manual` - Manual trigger
- `trigger.event` - Internal event trigger

### Action Nodes
- `action.http` - HTTP request
- `action.email` - Send email
- `action.condition` - Conditional branch
- `action.delay` - Delay/wait
- `action.transform` - Transform data
- `action.queue` - Enqueue job
- `action.callWorkflow` - Call another workflow

### Logic Nodes
- `logic.branch` - Branch/if-else
- `logic.loop` - Loop with limits
- `logic.merge` - Merge branches
- `logic.retry` - Retry wrapper
- `logic.errorBoundary` - Error handling

## Deployment

### Docker Compose

```bash
docker compose up -d
```

### Production

1. Build Docker images
2. Set up PostgreSQL and Redis
3. Configure environment variables
4. Run migrations
5. Start services

## Architecture

### Multi-Service Design

```
┌─────────────┐     ┌─────────────┐
│   Web UI    │────▶│  API Server │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Worker  │ │ Scheduler │ │ Realtime │
        └────┬────┘ └──────────┘ └──────────┘
             │
             ▼
        ┌──────────┐
        │  Queue   │
        └────┬────┘
             │
             ▼
        ┌──────────┐
        │  Database │
        └──────────┘
```

### Database Schema

- **users** - User accounts
- **sessions** - Active sessions
- **refresh_tokens** - Token refresh
- **workspaces** - Multi-tenant workspaces
- **workspace_members** - Member roles
- **workflows** - Workflow definitions
- **workflow_versions** - Versioned snapshots
- **workflow_triggers** - Trigger configurations
- **executions** - Runtime executions
- **execution_nodes** - Node-level execution state
- **execution_logs** - Runtime logs
- **secrets** - Encrypted secrets
- **audit_logs** - Audit trail

## Roadmap

- [x] Basic authentication
- [x] Workspace management
- [x] Workflow CRUD
- [ ] Workflow versions
- [ ] Workflow publishing
- [ ] Execution replay
- [ ] Workflow templates
- [ ] API tokens
- [ ] Worker health dashboard
- [ ] More node types
- [ ] Plugin SDK
- [ ] Event-driven triggers

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

- [Documentation](https://flowforge.dev/docs)
- [Discord](https://discord.gg/flowforge)
- [GitHub Issues](https://github.com/flowforge/flowforge/issues)

---

Built with ❤️ for developers who build.
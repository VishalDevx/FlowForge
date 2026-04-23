# FlowForge

A distributed workflow execution platform for building, testing, and running automated workflows.

## Features

- **Visual Workflow Editor** - Drag and drop nodes to build workflows visually
- **Distributed Execution** - Run workflows at scale with BullMQ workers
- **Real-time Monitoring** - Watch workflows execute in real-time with WebSocket updates
- **Multi-tenancy** - Workspaces with team collaboration and RBAC
- **Triggers** - Webhook, cron, manual, and event-based triggers
- **Node Types** - HTTP requests, conditions, delays, transformations, emails
- **Reliability** - Retries, dead-letter queues, timeouts, and circuit breakers
- **Secrets Management** - Encrypted secrets with per-workspace scoping
- **Audit Logging** - Full audit trail for compliance

## Tech Stack

- **Backend**: Fastify, TypeScript, Prisma, BullMQ
- **Frontend**: Next.js, React Flow, Tailwind CSS
- **Database**: PostgreSQL
- **Cache/Queue**: Redis
- **Real-time**: Socket.IO
- **Auth**: JWT with refresh tokens

## Project Structure

```
flowforge/
├── apps/
│   ├── api/          # Fastify API server
│   ├── worker/       # BullMQ worker
│   ├── scheduler/   # Cron/scheduled trigger processor
│   ├── realtime/    # WebSocket gateway
│   └── web/          # Next.js frontend
├── packages/
│   ├── db/          # Prisma schema and client
│   ├── redis/       # Redis client and utilities
│   ├── queue/      # BullMQ queues and job contracts
│   ├── auth/       # JWT and authentication
│   ├── workflow-engine/  # DAG parser and executor
│   ├── nodes/      # Trigger/action node implementations
│   ├── contracts/ # Zod schemas and types
│   ├── logger/     # Pino logging
│   ├── observability/  # Prometheus metrics
│   └── utils/      # Shared utilities
└── infra/
    └── docker/     # Dockerfiles
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Redis 7+

### Local Development

1. Clone the repository

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start infrastructure (PostgreSQL and Redis):
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

4. Set up the database:
   ```bash
   cd packages/db
   pnpm db:generate
   pnpm db:push
   ```

5. Start the API server:
   ```bash
   cd apps/api
   pnpm dev
   ```

6. Start the worker (separate terminal):
   ```bash
   cd apps/worker
   pnpm dev
   ```

7. Start the frontend (separate terminal):
   ```bash
   cd apps/web
   pnpm dev
   ```

The API runs on `http://localhost:3000`
The frontend runs on `http://localhost:3002`

### Environment Variables

```env
DATABASE_URL=postgresql://flowforge:flowforge@localhost:5432/flowforge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef
PORT=3000
```

## API Documentation

### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login and get tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Workspaces

- `POST /api/v1/workspaces` - Create workspace
- `GET /api/v1/workspaces` - List workspaces
- `GET /api/v1/workspaces/:id` - Get workspace
- `PATCH /api/v1/workspaces/:id` - Update workspace
- `DELETE /api/v1/workspaces/:id` - Delete workspace

### Workflows

- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows` - List workflows
- `GET /api/v1/workflows/:id` - Get workflow
- `PATCH /api/v1/workflows/:id` - Update workflow
- `DELETE /api/v1/workflows/:id` - Delete workflow
- `POST /api/v1/workflows/:id/versions` - Create new version
- `POST /api/v1/workflows/:id/publish` - Publish version
- `POST /api/v1/workflows/:id/duplicate` - Duplicate workflow

### Executions

- `POST /api/v1/executions` - Run workflow
- `GET /api/v1/executions` - List executions
- `GET /api/v1/executions/:id` - Get execution
- `POST /api/v1/executions/:id/cancel` - Cancel execution
- `POST /api/v1/executions/:id/retry` - Retry execution
- `GET /api/v1/executions/:id/logs` - Get execution logs

### Triggers

- `POST /api/v1/triggers` - Create trigger
- `PATCH /api/v1/triggers/:id` - Update trigger
- `DELETE /api/v1/triggers/:id` - Delete trigger
- `GET /api/v1/triggers/webhook/:key` - Webhook endpoint

### Secrets

- `POST /api/v1/secrets` - Create secret
- `GET /api/v1/secrets` - List secrets
- `PATCH /api/v1/secrets/:id` - Update secret
- `DELETE /api/v1/secrets/:id` - Delete secret

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

### Logic Nodes

- `logic.branch` - Branch/if-else
- `logic.loop` - Loop with limits
- `logic.retry` - Retry wrapper

## Deployment

### Docker

```bash
docker compose up -d
```

### Production

1. Build Docker images
2. Set up PostgreSQL and Redis
3. Configure environment variables
4. Run migrations
5. Start services

## Roadmap

- [ ] Workflow version comparison
- [ ] Execution replay
- [ ] Workflow templates
- [ ] API tokens
- [ ] Worker health dashboard
- [ ] More node types
- [ ] Plugin SDK

## License

MIT
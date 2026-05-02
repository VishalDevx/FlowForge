# Architecture

FlowForge uses a multi-service architecture designed for reliability, scalability, and observability.

## System Overview

```
                    ┌─────────────────────────────────────┐
                    │       Frontend (Next.js)            │
                    │       http://localhost:3002         │
                    └──────────────────┬──────────────────┘
                                       │ REST + WebSocket
                    ┌──────────────────▼──────────────────┐
                    │      API Gateway (Fastify)          │
                    │      http://localhost:3000          │
                    │  ┌──────┐ ┌────────┐ ┌──────────┐  │
                    │  │Auth  │ │Workspace│ │Workflow  │  │
                    │  │Plugin│ │Plugin  │ │Plugin    │  │
                    │  └──────┘ └────────┘ └──────────┘  │
                    └──┬────────────┬─────────────┬───────┘
                       │            │             │
              ┌────────▼──┐  ┌─────▼──────┐  ┌───▼────────┐
              │ PostgreSQL │  │   Redis    │  │  Socket.IO │
              │  (Neon)    │  │ (Cloud)    │  │  :3001     │
              │            │  │            │  │            │
              │ • Users    │  │ • Queues   │  │ • Live     │
              │ • Sessions │  │ • BullMQ   │  │   Updates  │
              │ • Workflows│  │ • Caching  │  │ • Logs     │
              │ • Executions│ │ • Locks    │  │ • Events   │
              └────────────┘  └───┬────┬───┘  └────────────┘
                                  │    │
                         ┌────────▼┐  │  ┌──────────────┐
                         │ Worker  │  │  │  Scheduler   │
                         │         │  │  │              │
                         │ • Jobs  │  │  │ • Cron       │
                         │ • Retry │  │  │ • Scheduled  │
                         │ • DLQ   │  │  │   Triggers   │
                         └─────────┘  │  └──────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │   Workflow Engine       │
                         │   (Shared Package)      │
                         │                         │
                         │ • DAG Parsing           │
                         │ • Topological Sort      │
                         │ • Execution Planning    │
                         │ • Cycle Detection       │
                         └─────────────────────────┘
```

## Services

### 1. API Server (`apps/api/`)

**Technology**: Fastify + TypeScript

The API server is the central entry point for all client requests. It uses a plugin-based architecture:

- **Auth plugin**: JWT verification, route guards, request decoration
- **Route plugins**: Auth, workspace, workflow, execution, trigger, secret routes
- **Middleware**: CORS, rate limiting, request logging, error handling
- **Controllers**: Request validation with Zod, response formatting
- **Services**: Business logic, database operations via Prisma

**Key responsibilities**:
- RESTful API endpoints
- Input validation with Zod schemas
- JWT authentication and authorization
- Database operations via Prisma ORM
- Rate limiting per IP

### 2. Web App (`apps/web/`)

**Technology**: Next.js 15 + React + Tailwind CSS

The frontend provides:
- User authentication UI (login, register)
- Dashboard with workflow overview
- Visual workflow editor (React Flow)
- Execution monitoring
- API proxy for development (`/api/v1/*` → backend)

**Data fetching**: TanStack Query for server state, Zustand for client state.

### 3. Worker (`apps/worker/`)

**Technology**: BullMQ Worker + TypeScript

The worker processes jobs from the execution queue:

1. Picks up jobs from Redis queue
2. Executes the corresponding node type
3. Records results and metrics
4. Handles retries with exponential backoff
5. Moves failed jobs to dead-letter queue after max attempts

**Worker lifecycle**:
```
Job Enqueued → Worker Picks Up → Execute Node → Success/Fail
                                         ↓
                              Retry (with backoff) → DLQ
```

### 4. Realtime Server (`apps/realtime/`)

**Technology**: Socket.IO

Provides WebSocket connections for:
- Live execution status updates
- Streaming execution logs
- Real-time node execution events
- WebSocket connection metrics

### 5. Scheduler (`apps/scheduler/`)

**Technology**: node-cron + BullMQ

Processes time-based triggers:
- Scans for cron triggers due for execution
- Creates execution jobs in the queue
- Manages scheduled workflow runs

## Packages (Shared Libraries)

| Package | Purpose |
|---------|---------|
| `@flowforge/db` | Prisma schema, client, database types |
| `@flowforge/redis` | Redis client with explicit auth config |
| `@flowforge/queue` | BullMQ queue definitions and helpers |
| `@flowforge/auth` | JWT token generation, verification, password hashing |
| `@flowforge/workflow-engine` | DAG parsing, topological sort, execution planning, cycle detection |
| `@flowforge/nodes` | Node executor implementations (HTTP, email, condition, delay, transform) |
| `@flowforge/contracts` | Zod validation schemas for all data types |
| `@flowforge/logger` | Pino-based structured logging |
| `@flowforge/observability` | Prometheus metrics (counters, histograms, gauges) |
| `@flowforge/utils` | Shared utility functions |

## Data Flow

### Workflow Execution Flow

```
1. User triggers workflow (manual, webhook, cron)
        ↓
2. API creates execution record in PostgreSQL
        ↓
3. API creates initial node execution records
        ↓
4. API adds first node job to BullMQ queue
        ↓
5. Worker picks up job from queue
        ↓
6. Worker executes node (HTTP, email, etc.)
        ↓
7. Worker updates execution record with result
        ↓
8. Worker sends realtime update via Socket.IO
        ↓
9. Worker finds next nodes in execution plan
        ↓
10. Worker enqueues next node jobs
        ↓
11. Repeat steps 5-10 until all nodes complete
        ↓
12. Execution marked as completed/failed
```

### Authentication Flow

```
Client → POST /auth/register → Create user, hash password, generate tokens → Return tokens
Client → POST /auth/login → Verify password, generate tokens → Return tokens
Client → GET /auth/me → Verify JWT → Return user profile
Client → POST /auth/refresh → Verify refresh token, rotate → Return new token pair
Client → PUT /auth/password → Verify current, hash new, revoke all sessions → Success
Client → POST /auth/logout → Revoke specific refresh token → Success
```

## Database Design

### Core Tables

```
users
├── id (UUID)
├── email (unique)
├── name
├── passwordHash
├── emailVerified
└── createdAt, updatedAt

workspaces
├── id (UUID)
├── name
├── slug (unique)
├── ownerId → users.id
└── createdAt, updatedAt

workspace_members
├── id (UUID)
├── workspaceId → workspaces.id
├── userId → users.id
├── role (owner/admin/developer/operator/viewer)
└── createdAt, updatedAt

workflows
├── id (UUID)
├── workspaceId → workspaces.id
├── name
├── status (draft/published/archived)
└── createdAt, updatedAt

workflow_versions
├── id (UUID)
├── workflowId → workflows.id
├── version (integer)
├── nodes (JSON)
├── edges (JSON)
└── createdAt, updatedAt

executions
├── id (UUID)
├── workflowId → workflows.id
├── status (pending/running/completed/failed/cancelled)
├── input, output (JSON)
└── startedAt, completedAt, createdAt

execution_nodes
├── id (UUID)
├── executionId → executions.id
├── nodeId
├── status (pending/running/completed/failed/skipped)
├── input, output (JSON)
├── error
└── startedAt, completedAt, createdAt

execution_logs
├── id (UUID)
├── executionId → executions.id
├── nodeId
├── level (info/warn/error/debug)
├── message
└── createdAt

refresh_tokens
├── id (UUID)
├── userId → users.id
├── token (unique)
├── expiresAt
├── revokedAt
└── createdAt, updatedAt

secrets
├── id (UUID)
├── workspaceId → workspaces.id
├── name
├── value (encrypted)
└── createdAt, updatedAt

audit_logs
├── id (UUID)
├── userId → users.id
├── action
├── entityType, entityId
├── metadata (JSON)
└── createdAt
```

## Deployment

See [Deployment Guide](./deployment.md) for production deployment instructions.

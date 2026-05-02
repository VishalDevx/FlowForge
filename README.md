# FlowForge

**A modern, scalable workflow automation platform** built with TypeScript, designed for teams who need to build, manage, and execute complex workflows with full observability and real-time collaboration.

[ ![Build workflows that scale](#) ](#)

## Features

- **Visual Workflow Editor** — Drag-and-drop interface for building workflows with React Flow
- **Distributed Execution** — Run workflows at scale with BullMQ workers and Redis queues
- **Real-Time Monitoring** — Watch workflows execute live via WebSocket connections
- **Multi-Tenancy** — Workspaces with team collaboration and role-based access control (RBAC)
- **Triggers** — Webhook, cron, manual, event-based, and scheduled triggers
- **Node Types** — HTTP requests, conditions, delays, transformations, emails, webhooks, and more
- **Reliability** — Automatic retries, dead-letter queues, configurable timeouts
- **Secrets Management** — Encrypted secrets with per-workspace scoping
- **Audit Logging** — Full immutable audit trail for compliance
- **JWT Authentication** — Secure auth with access tokens, refresh tokens, password change, and session management

## Tech Stack

### Backend
| Component | Technology |
|---|---|
| **Runtime** | Node.js 20+ |
| **Framework** | Fastify (TypeScript) |
| **Database** | PostgreSQL 16+ (Neon) |
| **ORM** | Prisma 5.x |
| **Queue** | BullMQ |
| **Cache** | Redis 7+ (Redis Cloud) |
| **Auth** | JWT with bcrypt, refresh token rotation |
| **Validation** | Zod |
| **Logging** | Pino |
| **Monitoring** | Prometheus metrics |

### Frontend
| Component | Technology |
|---|---|
| **Framework** | Next.js 15 |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **State** | Zustand |
| **Data Fetching** | TanStack Query |
| **Workflow Editor** | React Flow |

## Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **PostgreSQL** (local or cloud — we use [Neon](https://neon.tech))
- **Redis** (local or cloud — we use [Redis Cloud](https://redis.com))

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/flowforge.git
cd flowforge
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Edit `.env` with your database and Redis credentials:

```env
# DATABASE (PostgreSQL connection string)
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require

# REDIS (separate vars for ioredis compatibility)
REDIS_HOST=your-redis-host.rediscloud.com
REDIS_PORT=14623
REDIS_PASSWORD=your-redis-password

# AUTHENTICATION
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# ENCRYPTION (32 hex characters)
ENCRYPTION_KEY=3afjkaoeutpoiewkdfknkjdsfhkjhdafskjhdnsfjk
```

### 4. Set up the database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (creates all tables)
pnpm db:push
```

### 5. Start the development server

```bash
pnpm dev
```

This starts all services simultaneously via Turborepo:

| Service | URL |
|---|---|
| Web App | http://localhost:3002 |
| API Server | http://localhost:3000 |
| Realtime (WebSocket) | ws://localhost:3001 |

### 6. Create your first account

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Name","email":"you@example.com","password":"securepassword123"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"securepassword123"}'
```

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all services in development mode (watch mode) |
| `pnpm build` | Build all packages and apps for production |
| `pnpm start` | Start production build |
| `pnpm db:generate` | Generate Prisma client from schema |
| `pnpm db:push` | Push Prisma schema to database without migrations |
| `pnpm db:migrate` | Run Prisma migrations (development) |
| `pnpm db:studio` | Open Prisma Studio (database GUI) |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm clean` | Remove all build artifacts |

## API Documentation

### Authentication

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Create a new user account | No |
| `POST` | `/api/v1/auth/login` | Sign in with email and password | No |
| `POST` | `/api/v1/auth/refresh` | Refresh an expired access token | No |
| `GET` | `/api/v1/auth/me` | Get the current authenticated user | Yes |
| `POST` | `/api/v1/auth/logout` | Sign out and revoke token | Yes |
| `PUT` | `/api/v1/auth/password` | Change your password | Yes |

#### Register a new account

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "password": "securepassword123"}'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "john@example.com", "name": "John Doe" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "securepassword123"}'
```

#### Refresh Token

When the access token expires (default: 15 minutes), use the refresh token to get a new pair:

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJ..."}'
```

#### Get Current User

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

#### Change Password

```bash
curl -X PUT http://localhost:3000/api/v1/auth/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"currentPassword": "oldpassword123", "newPassword": "newsecurepassword456"}'
```

#### Logout

```bash
# Logout current session only
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"refreshToken": "eyJ..."}'

# Logout all sessions (revoke all refresh tokens)
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"all": true}'
```

### Authentication Flow

```
┌──────────┐     POST /auth/register     ┌──────────┐
│  Client  │ ──────────────────────────▶ │   API    │
│          │ ◀────────────────────────── │          │
│          │    accessToken + refreshToken│          │
│          │                              │          │
│          │     POST /auth/login         │          │
│          │ ──────────────────────────▶ │          │
│          │ ◀────────────────────────── │          │
│          │    accessToken + refreshToken│          │
│          │                              │          │
│          │  GET /auth/me (with token)   │          │
│          │ ──────────────────────────▶ │          │
│          │ ◀────────────────────────── │          │
│          │        User profile          │          │
│          │                              │          │
│          │  POST /auth/refresh          │          │
│          │ ──────────────────────────▶ │          │
│          │ ◀────────────────────────── │          │
│          │    new accessToken +         │          │
│          │    new refreshToken          │          │
└──────────┘                              └──────────┘
```

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

### Root `.env` (shared across all services)

```env
# ===========================================
# DATABASE
# ===========================================
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require

# ===========================================
# REDIS
# ===========================================
REDIS_HOST=your-redis-host.rediscloud.com
REDIS_PORT=14623
REDIS_PASSWORD=your-redis-password

# ===========================================
# AUTHENTICATION
# ===========================================
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# ===========================================
# ENCRYPTION (32 hex characters)
# ===========================================
ENCRYPTION_KEY=3afjkaoeutpoiewkdfknkjdsfhkjhdafskjhdnsfjk

# ===========================================
# API CONFIGURATION
# ===========================================
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
REALTIME_PORT=3001

# ===========================================
# FRONTEND CONFIGURATION
# ===========================================
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# ===========================================
# CORS
# ===========================================
CORS_ORIGIN=http://localhost:3002

# ===========================================
# RATE LIMITING
# ===========================================
RATE_LIMIT_MAX=100

# ===========================================
# LOGGING
# ===========================================
LOG_LEVEL=info

# ===========================================
# WORKER CONFIGURATION
# ===========================================
WORKER_CONCURRENCY=5

# ===========================================
# EXECUTION TIMEOUTS (milliseconds)
# ===========================================
NODE_TIMEOUT_MS=30000
WORKFLOW_TIMEOUT_MS=300000

# ===========================================
# RETRY CONFIGURATION
# ===========================================
MAX_RETRY_ATTEMPTS=3
RETRY_BACKOFF_MS=1000
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
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│                     http://localhost:3002                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API + WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                       API Gateway (Fastify)                  │
│                     http://localhost:3000                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │   Auth   │  │Workspace │  │ Workflow │  │ Execution  │  │
│  │  Module  │  │  Module  │  │  Module  │  │   Module   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
└──────┬──────────────────────┬───────────────────────┬──────┘
       │                      │                       │
┌──────▼──────┐      ┌───────▼────────┐      ┌───────▼──────┐
│  PostgreSQL │      │     Redis      │      │  Socket.IO   │
│   (Neon)    │      │  (Redis Cloud) │      │  Realtime    │
│             │      │                │      │  Server      │
│ • Users     │      │ • Job Queues   │      │  :3001       │
│ • Sessions  │      │ • BullMQ       │      │              │
│ • Workflows │      │ • Locks        │      │ • Live       │
│ • Executions│      │ • Caching      │      │   Updates    │
└─────────────┘      └───┬────────┬───┘      └──────────────┘
                         │        │
              ┌──────────▼┐  ┌───▼─────────┐
              │  Worker   │  │  Scheduler  │
              │  Process  │  │  Process    │
              │           │  │             │
              │ • Execute │  │ • Cron Jobs │
              │   Nodes   │  │ • Triggers  │
              │ • Queue   │  │             │
              │   Jobs    │  │             │
              └───────────┘  └─────────────┘
```

### Request Flow

1. **User signs in** → Frontend sends credentials to `/api/v1/auth/login`
2. **API validates** → bcrypt compares password, JWT generates tokens
3. **Tokens returned** → Frontend stores in localStorage
4. **Authenticated request** → Frontend sends `Authorization: Bearer <token>`
5. **Auth middleware** → API verifies JWT, attaches user to request
6. **Protected route** → Controller executes business logic
7. **Database queries** → Prisma ORM handles data access
8. **Response returned** → JSON response sent back to frontend

### Authentication Flow

```
Client                          API Server
  │                                │
  │─── POST /auth/register ───────▶│
  │◀─── 201 {user, tokens} ───────│
  │                                │
  │─── POST /auth/login ──────────▶│
  │◀─── 200 {user, tokens} ───────│
  │                                │
  │─── GET /auth/me ──────────────▶│
  │     Header: Bearer <token>     │
  │◀─── 200 {user} ───────────────│
  │                                │
  │─── POST /auth/refresh ────────▶│
  │     {refreshToken}             │
  │◀─── 200 {new tokens} ─────────│
  │                                │
  │─── PUT /auth/password ────────▶│
  │     {current, new}             │
  │◀─── 200 {success} ────────────│
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

## Security

- **Password Hashing**: bcrypt with configurable rounds (default: 12)
- **JWT Tokens**: Short-lived access tokens (15min) + rotating refresh tokens (7 days)
- **Token Revocation**: Refresh tokens are stored in database and can be revoked individually or all at once
- **CORS**: Configurable allowed origins for cross-origin requests
- **Rate Limiting**: 100 requests/minute per IP address
- **Input Validation**: Zod schemas on all API endpoints
- **RBAC**: Workspace roles — owner, admin, developer, operator, viewer
- **Audit Logging**: All critical actions (login, password change, workspace changes) are logged

## Roadmap

- [x] Basic authentication (register, login, JWT)
- [x] Refresh token rotation and revocation
- [x] Password change endpoint
- [x] Workspace management with RBAC
- [x] Workflow CRUD and versioning
- [x] Execution engine with BullMQ
- [x] Real-time WebSocket monitoring
- [x] Scheduled triggers and cron jobs
- [x] API rate limiting
- [ ] Workflow publishing
- [ ] Execution replay
- [ ] Workflow templates
- [ ] API tokens (machine-to-machine auth)
- [ ] Worker health dashboard
- [ ] More node types (Slack, Discord, database, etc.)
- [ ] Plugin SDK
- [ ] Event-driven triggers
- [ ] Team invitations
- [ ] Email verification

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
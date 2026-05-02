# Getting Started

This guide walks you through setting up FlowForge for local development.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 20.0.0 | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| pnpm | >= 9.0.0 | Install with `corepack enable` or `npm i -g pnpm` |
| PostgreSQL | 16+ | Use [Neon](https://neon.tech) for cloud, or local install |
| Redis | 7+ | Use [Redis Cloud](https://redis.com) or `brew install redis` |

## Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/flowforge.git
cd flowforge
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all workspace dependencies for apps and packages.

### 3. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require

# Redis
REDIS_HOST=your-redis-host.rediscloud.com
REDIS_PORT=14623
REDIS_PASSWORD=your-redis-password

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Encryption (32 hex characters for AES-256)
ENCRYPTION_KEY=3afjkaoeutpoiewkdfknkjdsfhkjhdafskjhdnsfjk

# API
PORT=3000
REALTIME_PORT=3001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# CORS
CORS_ORIGIN=http://localhost:3002

# Rate Limiting
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info

# Worker
WORKER_CONCURRENCY=5
NODE_TIMEOUT_MS=30000
WORKFLOW_TIMEOUT_MS=300000
MAX_RETRY_ATTEMPTS=3
RETRY_BACKOFF_MS=1000
```

### 4. Set Up the Database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (creates all tables)
pnpm db:push
```

To view your database in a GUI:

```bash
pnpm db:studio
```

### 5. Start Development Servers

```bash
pnpm dev
```

This starts all services via Turborepo:

| Service | Port | URL |
|---------|------|-----|
| Web App | 3002 | http://localhost:3002 |
| API Server | 3000 | http://localhost:3000 |
| Realtime (WebSocket) | 3001 | ws://localhost:3001 |

### 6. Create Your First Account

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Name","email":"you@example.com","password":"securepassword123"}'
```

Then log in:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"securepassword123"}'
```

## Project Structure

```
flowforge/
├── apps/
│   ├── api/           # Fastify API server
│   ├── worker/        # BullMQ worker process
│   ├── scheduler/     # Cron/scheduled trigger processor
│   ├── realtime/      # Socket.IO WebSocket gateway
│   └── web/           # Next.js frontend
├── packages/
│   ├── db/            # Prisma schema and client
│   ├── redis/         # Redis client wrapper
│   ├── queue/         # BullMQ queue definitions
│   ├── auth/          # JWT utilities
│   ├── workflow-engine/ # DAG parser and execution planner
│   ├── nodes/         # Node executor implementations
│   ├── contracts/     # Zod validation schemas
│   ├── logger/        # Pino logger
│   ├── observability/ # Prometheus metrics
│   └── utils/         # Shared utilities
└── infra/
    └── docker/        # Docker configuration
```

## Common Commands

```bash
pnpm dev              # Start all services in dev mode
pnpm build            # Build all packages and apps
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript type checking
pnpm clean            # Remove build artifacts
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio (GUI)
```

## Troubleshooting

### Database Connection Errors

- Ensure `DATABASE_URL` is correct and accessible
- If using Neon, verify the connection string includes `?sslmode=require`
- Run `pnpm db:push` to ensure schema is synced

### Redis Connection Errors

- Ensure `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` are correct
- Passwords with special characters must be split into separate variables (not in URL format)

### Port Conflicts

- API defaults to port 3000
- Realtime defaults to port 3001
- Web app defaults to port 3002
- Set `REALTIME_PORT` if 3001 is already in use

## Next Steps

- [Architecture](./architecture.md) — Understand the system design
- [API Reference](./api-reference.md) — Explore the REST API
- [Authentication](./authentication.md) — Learn about auth flows
- [Workflows](./workflows.md) — Build your first workflow

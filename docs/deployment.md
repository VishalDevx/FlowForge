# Deployment Guide

This guide covers deploying FlowForge to production environments.

## Prerequisites

- Docker and Docker Compose
- PostgreSQL database (managed or self-hosted)
- Redis instance (managed or self-hosted)
- Domain name and SSL certificate (for production)

## Environment Configuration

### Production `.env`

```env
# Database
DATABASE_URL=postgresql://user:password@production-host:5432/flowforge?sslmode=require

# Redis
REDIS_HOST=production-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-strong-redis-password

# Authentication
JWT_SECRET=<generate-with: openssl rand -hex 64>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Encryption (32 hex characters)
ENCRYPTION_KEY=<generate-with: openssl rand -hex 16>

# API
PORT=3000
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://ws.yourdomain.com

# CORS
CORS_ORIGIN=https://app.yourdomain.com

# Rate Limiting
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=warn

# Worker
WORKER_CONCURRENCY=10
NODE_TIMEOUT_MS=30000
WORKFLOW_TIMEOUT_MS=300000
MAX_RETRY_ATTEMPTS=3
RETRY_BACKOFF_MS=1000
```

## Docker Deployment

### 1. Build Images

```bash
docker compose -f docker-compose.yml build
```

### 2. Start Services

```bash
docker compose -f docker-compose.yml up -d
```

### 3. Run Migrations

```bash
docker compose -f docker-compose.yml run --rm api pnpm db:push
```

### 4. Verify

```bash
docker compose -f docker-compose.yml ps
```

## Docker Compose Services

| Service | Image | Ports | Description |
|---------|-------|-------|-------------|
| `api` | flowforge-api | 3000 | Fastify API server |
| `web` | flowforge-web | 3002 | Next.js frontend |
| `worker` | flowforge-worker | - | BullMQ worker |
| `scheduler` | flowforge-scheduler | - | Cron scheduler |
| `realtime` | flowforge-realtime | 3001 | WebSocket server |
| `postgres` | postgres:16 | 5432 | Database (dev only) |
| `redis` | redis:7 | 6379 | Cache (dev only) |

## Managed Services

### PostgreSQL

**Recommended Providers:**
- [Neon](https://neon.tech) — Serverless PostgreSQL
- [Supabase](https://supabase.com) — PostgreSQL with extras
- [Railway](https://railway.app) — Easy managed PostgreSQL

**Connection Tips:**
- Use connection pooling for production
- Enable SSL (`sslmode=require`)
- Set up automated backups

### Redis

**Recommended Providers:**
- [Redis Cloud](https://redis.com) — Managed Redis
- [Upstash](https://upstash.com) — Serverless Redis
- [AWS ElastiCache](https://aws.amazon.com/elasticache/) — AWS managed

**Connection Tips:**
- Use `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (not URL format)
- Enable TLS for production
- Set up persistence (AOF or RDB snapshots)

## Reverse Proxy (Nginx)

```nginx
upstream api {
    server 127.0.0.1:3000;
}

upstream web {
    server 127.0.0.1:3002;
}

upstream realtime {
    server 127.0.0.1:3001;
}

# API
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 443 ssl;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# WebSocket
server {
    listen 443 ssl;
    server_name ws.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/ws.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ws.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://realtime;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Kubernetes Deployment

### API Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flowforge-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: flowforge-api
  template:
    metadata:
      labels:
        app: flowforge-api
    spec:
      containers:
      - name: api
        image: flowforge/api:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: flowforge-env
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

### Worker Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flowforge-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: flowforge-worker
  template:
    metadata:
      labels:
        app: flowforge-worker
    spec:
      containers:
      - name: worker
        image: flowforge/worker:latest
        envFrom:
        - secretRef:
            name: flowforge-env
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

## Health Checks

All services expose health check endpoints:

```bash
# API health
curl http://localhost:3000/api/v1/health

# Expected response
{ "status": "ok", "uptime": 123, "timestamp": "2026-01-01T00:00:00.000Z" }
```

## Monitoring

### Prometheus Metrics

Metrics are available at `/metrics`:

- HTTP request duration and total
- Workflow execution counts and duration
- Node execution counts and duration
- Queue job counts (pending, active, completed, failed)
- Active worker count
- WebSocket connection count

### Logs

Structured JSON logs with Pino:

```json
{
  "level": "info",
  "time": "2026-01-01T00:00:00.000Z",
  "msg": "Processing node execution",
  "executionId": "uuid",
  "nodeId": "node-1"
}
```

## Scaling

### Horizontal Scaling

- **API**: Scale statelessly (add more replicas behind load balancer)
- **Worker**: Scale based on queue depth (add more replicas to process jobs faster)
- **Realtime**: Scale with sticky sessions (WebSocket connections are stateful)

### Vertical Scaling

- Increase `WORKER_CONCURRENCY` for more parallel jobs per worker
- Increase `NODE_TIMEOUT_MS` for long-running node operations

## Security Checklist

- [ ] Use strong `JWT_SECRET` (minimum 64 hex characters)
- [ ] Use strong `ENCRYPTION_KEY` (32 hex characters for AES-256)
- [ ] Enable TLS for all connections (database, Redis, HTTP, WebSocket)
- [ ] Set `NODE_ENV=production`
- [ ] Set `LOG_LEVEL=warn` or `error` (avoid `debug` in production)
- [ ] Configure CORS with specific origins (not `*`)
- [ ] Use managed database with automated backups
- [ ] Set up monitoring and alerting
- [ ] Regularly rotate secrets and API keys
- [ ] Keep Node.js and dependencies updated

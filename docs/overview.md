# FlowForge Overview

FlowForge is a modern, distributed workflow automation platform built with TypeScript. It enables teams to build, deploy, and execute complex automated workflows with full observability, real-time monitoring, and collaborative multi-tenant workspaces.

## What is FlowForge?

FlowForge provides a visual drag-and-drop interface for constructing workflows from nodes — triggers, actions, and logic blocks. These workflows are executed by a distributed worker system powered by BullMQ and Redis, ensuring reliable, scalable, and fault-tolerant execution.

## Core Concepts

### Workspaces

Workspaces are isolated environments where teams collaborate. Each workspace has its own workflows, secrets, and team members with role-based access control.

### Workflows

A workflow is a directed acyclic graph (DAG) of connected nodes. It defines:

- **Triggers**: What starts the workflow (webhooks, schedules, manual runs)
- **Nodes**: The steps that execute (HTTP requests, emails, conditions, etc.)
- **Edges**: The connections between nodes, defining execution order

### Executions

An execution is a single run of a workflow. Executions track:

- Status (pending, running, completed, failed, cancelled)
- Per-node execution state and timing
- Input/output data for each node
- Runtime logs and error messages

### Nodes

Nodes are the building blocks of workflows. They fall into three categories:

1. **Trigger Nodes**: Start workflows (webhook, cron, manual, event)
2. **Action Nodes**: Perform work (HTTP requests, emails, transformations)
3. **Logic Nodes**: Control flow (conditions, loops, retries, error handling)

## Key Features

| Feature | Description |
|---------|-------------|
| Visual Editor | Build workflows with a React Flow drag-and-drop canvas |
| Distributed Execution | Scale horizontally with BullMQ workers and Redis queues |
| Real-Time Monitoring | Watch executions live via WebSocket streams |
| Multi-Tenancy | Isolated workspaces with team collaboration and RBAC |
| Secrets Management | Encrypted, per-workspace scoped secrets |
| Audit Logging | Immutable audit trail for all critical actions |
| Versioning | Workflow version snapshots for rollback and tracking |
| Retry & Recovery | Automatic retries with exponential backoff and dead-letter queues |
| API-First | Full REST API for programmatic workflow management |

## Architecture at a Glance

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Next.js UI  │────▶│  Fastify API │────▶│  PostgreSQL  │
│  (React)     │     │  (TypeScript)│     │  (Neon)      │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────▼───────┐
                     │    Redis     │
                     │  (BullMQ)    │
                     └──┬───────┬──┘
                        │       │
                 ┌──────▼┐  ┌───▼──────┐
                 │Worker │  │Scheduler │
                 │       │  │          │
                 └───────┘  └──────────┘
```

## Who is FlowForge For?

- **Developers** who want to automate repetitive tasks without managing infrastructure
- **Teams** who need shared workflow management with access controls
- **Operations** who need reliable, observable workflow execution with retry logic
- **Startups** who want to build automation into their product quickly

## Next Steps

- [Getting Started](./getting-started.md) — Set up your development environment
- [Architecture](./architecture.md) — Deep dive into the system design
- [API Reference](./api-reference.md) — Full REST API documentation
- [Authentication](./authentication.md) — Auth flows and token management

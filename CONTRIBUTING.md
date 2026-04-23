# Contributing to FlowForge

Welcome! We're excited that you're interested in contributing to FlowForge.

This guide will help you get started with development, testing, and contributing code.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Style Guide](#style-guide)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

### Understand the Project

FlowForge is a distributed workflow execution platform with:

- **API Server** (Fastify) - REST API for all operations
- **Worker Service** (BullMQ) - Executes workflow nodes
- **Scheduler Service** - Handles cron and scheduled triggers
- **Realtime Service** (Socket.IO) - WebSocket for live updates
- **Web Frontend** (Next.js) - UI for workflow building

### Key Technologies

- Node.js 20+, TypeScript
- PostgreSQL, Prisma, Redis, BullMQ
- Next.js, React Flow, Tailwind CSS

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+

### Local Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/flowforge/flowforge.git
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

4. **Set up database**
```bash
cd packages/db
DATABASE_URL="postgresql://flowforge:flowforge@localhost:5432/flowforge" npx prisma generate
DATABASE_URL="postgresql://flowforge:flowforge@localhost:5432/flowforge" npx prisma db push
```

5. **Start services**

API:
```bash
cd apps/api
DATABASE_URL="postgresql://flowforge:flowforge@localhost:5432/flowforge" pnpm dev
```

Worker (separate terminal):
```bash
cd apps/worker
DATABASE_URL="postgresql://flowforge:flowforge@localhost:5432/flowforge" pnpm dev
```

Frontend (separate terminal):
```bash
cd apps/web
pnpm dev
```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/workflow-editor` - New features
- `fix/authentication` - Bug fixes
- `docs/readme` - Documentation
- `refactor/api-routes` - Code refactoring

### Project Structure

```
apps/
├── api/           # Fastify API server
├── worker/        # BullMQ worker service  
├── scheduler/     # Cron/scheduled processor
├── realtime/      # WebSocket gateway
└── web/          # Next.js frontend

packages/
├── db/            # Prisma schema
├── auth/          # JWT authentication
├── queue/         # BullMQ queues
├── workflow-engine/ # DAG parser
├── nodes/         # Node executors
└── contracts/    # Zod schemas
```

### Coding Conventions

1. **TypeScript** - Use strict mode, proper types
2. **Imports** - Use absolute imports from workspace packages
3. **Error Handling** - Always handle errors gracefully
4. **Logging** - Use the logger for debugging
5. **Testing** - Write tests for new features

### Example: Adding a New API Route

```typescript
// apps/api/src/routes/example.ts
import { FastifyInstance } from 'fastify';

export const exampleRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/example', async (request, reply) => {
    return { success: true, data: { message: 'Hello World!' } };
  });
};
```

Register in main index:
```typescript
// apps/api/src/index.ts
import { exampleRoutes } from './routes/example.js';
await server.register(exampleRoutes, { prefix: '/api/v1/example' });
```

### Example: Adding a New Node Type

```typescript
// packages/nodes/src/index.ts
export const executeHttpNode = async (
  config: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
  },
  input: Record<string, unknown>
): Promise<JobResult> => {
  // Implementation
  return { success: true, output: {} };
};

const nodeRegistry = {
  'action.http': executeHttpNode,
  // Add new nodes here
};

export const executeNode = async (
  nodeType: NodeType,
  config: Record<string, unknown>,
  input: Record<string, unknown>
): Promise<JobResult> => {
  const handler = nodeRegistry[nodeType];
  if (!handler) {
    return { success: false, error: `Unknown node type: ${nodeType}` };
  }
  return handler(config, input);
};
```

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Specific package
cd packages/workflow-engine
pnpm test
```

### Writing Tests

Create test files alongside source files:

```
src/
├── index.ts
└── index.test.ts
```

Example test:
```typescript
import { describe, it, expect } from 'vitest';
import { topologicalSort } from './index';

describe('workflow-engine', () => {
  it('should sort nodes topologically', () => {
    const graph = new Map();
    graph.set('a', { incomingEdges: [], outgoingEdges: ['b'] });
    graph.set('b', { incomingEdges: ['a'], outgoingEdges: [] });
    
    const result = topologicalSort(graph);
    expect(result).toEqual(['a', 'b']);
  });
});
```

### Testing API Endpoints

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test registration
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test","password":"password123"}'
```

## Submitting Changes

### Pull Request Process

1. **Create a feature branch**
```bash
git checkout -b feature/my-awesome-feature
```

2. **Make your changes**
```bash
git add .
git commit -m "Add awesome feature"
```

3. **Push to your fork**
```bash
git push origin feature/my-awesome-feature
```

4. **Create Pull Request**
- Use the GitHub interface
- Fill in the PR template
- Describe your changes
- Link related issues

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
Describe testing done

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console.log or debugger statements
```

## Style Guide

### Git Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

Examples:
```
feat(auth): add user registration endpoint
fix(workflow): resolve execution timeout issue
docs(readme): update installation instructions
```

### Code Style

- Use **2 spaces** for indentation
- Use **single quotes** for strings
- Use **async/await** over promises
- Use **const** over let where possible
- Add **types** to all function parameters
- Use **meaningful variable names**

### File Naming

- **CamelCase** for TypeScript files: `workflowEngine.ts`
- **Kebab-case** for config files: `docker-compose.yml`
- **PascalCase** for React components: `WorkflowEditor.tsx`

## Resources

- [Architecture Documentation](./docs/architecture/)
- [API Documentation](./docs/api/)
- [Database Schema](./packages/db/prisma/schema.prisma)

## Questions?

- Open an issue
- Join our Discord
- Email the maintainers

Thank you for contributing! 🎉
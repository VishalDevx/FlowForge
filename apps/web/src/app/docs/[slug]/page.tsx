'use client';

import { use } from 'react';
import Link from 'next/link';
import { MarketingHeader } from '../../../components/layout/marketing-header';
import { MarketingFooter } from '../../../components/layout/marketing-footer';

const docNav = [
  {
    title: 'Introduction',
    items: [
      { name: 'Overview', slug: 'overview' },
      { name: 'Getting Started', slug: 'getting-started' },
      { name: 'Architecture', slug: 'architecture' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { name: 'Authentication', slug: 'authentication' },
      { name: 'Workflows', slug: 'workflows' },
      { name: 'Node Types', slug: 'node-types' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { name: 'API Reference', slug: 'api-reference' },
      { name: 'Deployment', slug: 'deployment' },
    ],
  },
];

const docContent: Record<string, { title: string; sections: { heading: string; content: string }[] }> = {
  overview: {
    title: 'Overview',
    sections: [
      {
        heading: 'What is FlowForge?',
        content: 'FlowForge is a modern, distributed workflow automation platform built with TypeScript. It enables teams to build, deploy, and execute complex automated workflows with full observability, real-time monitoring, and collaborative multi-tenant workspaces.',
      },
      {
        heading: 'Core Concepts',
        content: 'Workspaces are isolated environments where teams collaborate. Each workspace has its own workflows, secrets, and team members with role-based access control (RBAC).\n\nA workflow is a directed acyclic graph (DAG) of connected nodes. It defines triggers (what starts the workflow), nodes (the steps that execute), and edges (the connections between nodes).\n\nAn execution is a single run of a workflow, tracking status, per-node state, input/output data, and runtime logs.',
      },
      {
        heading: 'Key Features',
        content: '• Visual Editor — Build workflows with a React Flow drag-and-drop canvas\n• Distributed Execution — Scale horizontally with BullMQ workers and Redis queues\n• Real-Time Monitoring — Watch executions live via WebSocket streams\n• Multi-Tenancy — Isolated workspaces with team collaboration and RBAC\n• Secrets Management — Encrypted, per-workspace scoped secrets\n• Audit Logging — Immutable audit trail for all critical actions\n• Versioning — Workflow version snapshots for rollback and tracking\n• Retry & Recovery — Automatic retries with exponential backoff and dead-letter queues\n• API-First — Full REST API for programmatic workflow management',
      },
    ],
  },
  'getting-started': {
    title: 'Getting Started',
    sections: [
      {
        heading: 'Prerequisites',
        content: 'Node.js >= 20.0.0 — Use nvm to manage versions\npnpm >= 9.0.0 — Install with corepack enable or npm i -g pnpm\nPostgreSQL 16+ — Use Neon for cloud, or local install\nRedis 7+ — Use Redis Cloud or brew install redis',
      },
      {
        heading: 'Quick Setup',
        content: '1. Clone the repository: git clone https://github.com/yourusername/flowforge.git && cd flowforge\n\n2. Install dependencies: pnpm install\n\n3. Configure environment variables: cp .env.example .env\n\n4. Set up the database: pnpm db:generate && pnpm db:push\n\n5. Start development servers: pnpm dev\n\nThis starts all services via Turborepo: Web App (3002), API Server (3000), Realtime WebSocket (3001).',
      },
      {
        heading: 'Create Your First Account',
        content: 'Register via the UI at http://localhost:3002/register or via API:\n\ncurl -X POST http://localhost:3000/api/v1/auth/register \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name":"Your Name","email":"you@example.com","password":"securepassword123"}\'',
      },
    ],
  },
  architecture: {
    title: 'Architecture',
    sections: [
      {
        heading: 'System Overview',
        content: 'FlowForge uses a multi-service architecture designed for reliability, scalability, and observability. The system consists of 5 main services: API Server (Fastify), Web App (Next.js), Worker (BullMQ), Realtime Server (Socket.IO), and Scheduler (node-cron).',
      },
      {
        heading: 'API Server',
        content: 'The API server is the central entry point for all client requests. It uses a plugin-based architecture with Auth, Workspace, Workflow, and Execution route plugins. It handles JWT authentication, input validation with Zod, rate limiting, and database operations via Prisma ORM.',
      },
      {
        heading: 'Worker Process',
        content: 'The worker processes jobs from the execution queue. It picks up jobs from Redis, executes the corresponding node type, records results and metrics, handles retries with exponential backoff, and moves failed jobs to dead-letter queue after max attempts.',
      },
      {
        heading: 'Data Flow',
        content: '1. User triggers workflow (manual, webhook, cron)\n2. API creates execution record in PostgreSQL\n3. API adds first node job to BullMQ queue\n4. Worker picks up job from queue\n5. Worker executes node (HTTP, email, etc.)\n6. Worker updates execution record with result\n7. Worker sends realtime update via Socket.IO\n8. Worker finds next nodes in execution plan\n9. Worker enqueues next node jobs\n10. Repeat until all nodes complete',
      },
    ],
  },
  authentication: {
    title: 'Authentication',
    sections: [
      {
        heading: 'Token Types',
        content: 'Access Token (15 minutes) — Used for API request authorization. Stored in client (localStorage).\nRefresh Token (7 days) — Used for obtaining new access tokens. Stored in database (revocable).',
      },
      {
        heading: 'Registration Flow',
        content: '1. Validate input (name, email, password)\n2. Check if email already exists → 409 Conflict\n3. Hash password with bcrypt (12 rounds)\n4. Create user in database\n5. Generate access + refresh token pair\n6. Store refresh token in database\n7. Return tokens to client',
      },
      {
        heading: 'Token Refresh (Rotation)',
        content: 'When an access token expires, the client uses the refresh token to get a new pair. The old refresh token is revoked (rotation), and a new pair is issued. If the refresh token is expired or revoked, the user must re-authenticate.',
      },
      {
        heading: 'Security Measures',
        content: '• Password hashing with bcrypt (12 rounds)\n• Short-lived access tokens (15 minutes)\n• Refresh token rotation prevents replay attacks\n• Database-backed revocation enables immediate session termination\n• Password change revokes all active sessions',
      },
    ],
  },
  workflows: {
    title: 'Workflows',
    sections: [
      {
        heading: 'Workflow Lifecycle',
        content: 'Draft → Published → Archived\n\nDraft: Work-in-progress, can be edited freely\nPublished: Active version, can be executed\nArchived: Historical version, read-only',
      },
      {
        heading: 'Triggers',
        content: 'Webhook Trigger — Executed when an HTTP request hits the webhook URL.\nCron Trigger — Executed on a schedule (e.g., "0 9 * * 1-5" for every weekday at 9 AM).\nManual Trigger — Executed when a user clicks "Run" in the UI or calls the API.\nEvent Trigger — Executed when a specific internal event is emitted.',
      },
      {
        heading: 'Execution Plan',
        content: 'When a workflow is executed, the engine: 1) Validates the DAG (checks for cycles), 2) Topologically sorts nodes (determines execution order), 3) Creates an execution plan (maps dependencies), 4) Finds the trigger node (starts execution there), 5) Executes nodes in order, respecting dependencies.',
      },
      {
        heading: 'Execution Statuses',
        content: 'pending — Waiting to start\nrunning — Currently executing\ncompleted — All nodes finished successfully\nfailed — A node failed after all retries\ncancelled — Manually cancelled by user',
      },
    ],
  },
  'node-types': {
    title: 'Node Types',
    sections: [
      {
        heading: 'Trigger Nodes',
        content: 'trigger.webhook — Receives HTTP requests as workflow input. Supports GET, POST, PUT, PATCH, DELETE.\ntrigger.cron — Executes workflow on a cron schedule.\ntrigger.manual — Executed when a user manually runs the workflow.\ntrigger.event — Executed when an internal event is emitted.',
      },
      {
        heading: 'Action Nodes',
        content: 'action.http — Makes an HTTP request to an external API. Supports custom headers, body, timeout, and retry.\naction.email — Sends an email notification via SMTP.\naction.condition — Evaluates a condition and branches execution (true/false paths).\naction.delay — Pauses execution for a specified duration (ms, s, m, h).\naction.transform — Transforms input data using a JavaScript expression.\naction.queue — Enqueues a job for asynchronous processing.\naction.callWorkflow — Calls another workflow and waits for its completion.',
      },
      {
        heading: 'Logic Nodes',
        content: 'logic.branch — Splits execution into multiple parallel paths.\nlogic.loop — Repeats execution a specified number of times (max 100).\nlogic.merge — Merges results from multiple branches (combine, first, last).\nlogic.retry — Retries a failed operation with configurable backoff.\nlogic.errorBoundary — Catches errors from child nodes and handles them.',
      },
    ],
  },
  'api-reference': {
    title: 'API Reference',
    sections: [
      {
        heading: 'Base URL',
        content: 'http://localhost:3000/api/v1\n\nAll authenticated endpoints require an Authorization: Bearer <accessToken> header.',
      },
      {
        heading: 'Authentication Endpoints',
        content: 'POST /auth/register — Create a new user account\nPOST /auth/login — Sign in with email and password\nPOST /auth/refresh — Refresh an expired access token\nGET /auth/me — Get the currently authenticated user\nPUT /auth/password — Change your password\nPOST /auth/logout — Revoke refresh token(s)',
      },
      {
        heading: 'Workspace Endpoints',
        content: 'POST /workspaces — Create workspace\nGET /workspaces — List workspaces\nGET /workspaces/:id — Get workspace\nPATCH /workspaces/:id — Update workspace\nDELETE /workspaces/:id — Delete workspace',
      },
      {
        heading: 'Workflow Endpoints',
        content: 'POST /workflows — Create workflow\nGET /workflows — List workflows\nGET /workflows/:id — Get workflow\nPATCH /workflows/:id — Update workflow\nDELETE /workflows/:id — Delete workflow',
      },
      {
        heading: 'Execution Endpoints',
        content: 'POST /executions — Run workflow\nGET /executions — List executions\nGET /executions/:id — Get execution\nPOST /executions/:id/cancel — Cancel execution\nPOST /executions/:id/retry — Retry execution',
      },
    ],
  },
  deployment: {
    title: 'Deployment',
    sections: [
      {
        heading: 'Docker Deployment',
        content: 'Build images: docker compose -f docker-compose.yml build\nStart services: docker compose -f docker-compose.yml up -d\nRun migrations: docker compose -f docker-compose.yml run --rm api pnpm db:push',
      },
      {
        heading: 'Managed Services',
        content: 'PostgreSQL: Neon (serverless), Supabase, or Railway\nRedis: Redis Cloud, Upstash, or AWS ElastiCache\n\nUse REDIS_HOST, REDIS_PORT, REDIS_PASSWORD (not URL format) for ioredis compatibility.',
      },
      {
        heading: 'Security Checklist',
        content: '☐ Use strong JWT_SECRET (minimum 64 hex characters)\n☐ Use strong ENCRYPTION_KEY (32 hex characters for AES-256)\n☐ Enable TLS for all connections\n☐ Set NODE_ENV=production\n☐ Set LOG_LEVEL=warn or error\n☐ Configure CORS with specific origins\n☐ Use managed database with automated backups\n☐ Set up monitoring and alerting\n☐ Regularly rotate secrets and API keys',
      },
    ],
  },
};

export default function DocSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const content = docContent[slug] || null;

  if (!content) {
    return (
      <div className="min-h-screen flex flex-col">
        <MarketingHeader />
        <main className="flex-1 container py-16 text-center">
          <h1 className="heading-lg">Page not found</h1>
          <p className="mt-4 text-muted-foreground">The documentation page you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/docs" className="btn-primary mt-6 inline-flex">Back to Docs</Link>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  const currentSlug = slug;
  const allSlugs = docNav.flatMap((s) => s.items.map((i) => i.slug));
  const currentIndex = allSlugs.indexOf(currentSlug);
  const prevSlug = currentIndex > 0 ? allSlugs[currentIndex - 1] : null;
  const nextSlug = currentIndex < allSlugs.length - 1 ? allSlugs[currentIndex + 1] : null;

  return (
    <div className="min-h-screen flex flex-col">
      <MarketingHeader />

      <main className="flex-1 container py-12">
        <div className="flex gap-12">
          {/* Sidebar */}
          <nav className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {docNav.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={`/docs/${item.slug}`}
                          className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                            item.slug === currentSlug
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* Content */}
          <article className="flex-1 min-w-0 max-w-3xl">
            <h1 className="heading-lg mb-8">{content.title}</h1>

            <div className="prose prose-lg max-w-none">
              {content.sections.map((section) => (
                <div key={section.heading} className="mb-10">
                  <h2 className="heading-sm mb-4">{section.heading}</h2>
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-16 pt-8 border-t border-border flex justify-between">
              {prevSlug ? (
                <Link href={`/docs/${prevSlug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Previous
                </Link>
              ) : <div />}
              {nextSlug ? (
                <Link href={`/docs/${nextSlug}`} className="text-sm text-primary hover:text-primary-dark transition-colors flex items-center gap-1 font-medium">
                  Next
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : <div />}
            </div>
          </article>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

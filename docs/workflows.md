# Workflows

Workflows are the core unit of automation in FlowForge. They define a sequence of connected nodes that execute when triggered.

## Workflow Lifecycle

```
Draft ──────▶ Published ──────▶ Archived
  │              │                  │
  │    ┌────────┘                  │
  │    │                           │
  ▼    ▼                           ▼
Edit          Execute          Read-only
```

- **Draft**: Work-in-progress, can be edited freely
- **Published**: Active version, can be executed
- **Archived**: Historical version, read-only

## Workflow Structure

A workflow consists of:

### Nodes

```typescript
interface WorkflowNode {
  id: string;
  type: NodeType;        // 'trigger.webhook', 'action.http', etc.
  label: string;         // Display name
  position: { x: number; y: number };
  config: Record<string, unknown>;  // Node-specific configuration
}
```

### Edges

```typescript
interface WorkflowEdge {
  id: string;
  source: string;   // Source node ID
  target: string;   // Target node ID
}
```

### Versioning

Each time a workflow is published, a snapshot is created:

```typescript
interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;       // Auto-incrementing
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: Date;
}
```

## Creating a Workflow

### Via API

```bash
curl -X POST http://localhost:3000/api/v1/workflows \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "workspace-uuid",
    "name": "Email on Webhook",
    "description": "Sends email when webhook is received"
  }'
```

### Via UI

1. Navigate to the dashboard
2. Click "New Workflow"
3. Enter name and description
4. Use the visual editor to add and connect nodes
5. Click "Publish" to create a version

## Execution Plan

When a workflow is executed, the engine:

1. **Validates the DAG** — checks for cycles
2. **Topologically sorts** nodes — determines execution order
3. **Creates an execution plan** — maps dependencies
4. **Finds the trigger node** — starts execution there
5. **Executes nodes** in order, respecting dependencies

```
Trigger → Node A → Node B → Node C
                    ↓
              Node D (parallel with B)
```

## Triggers

Workflows can be started in several ways:

### Webhook Trigger

```json
{
  "type": "trigger.webhook",
  "config": {
    "method": "POST",
    "path": "/webhook/my-workflow"
  }
}
```

Executed when an HTTP request hits the webhook URL.

### Cron Trigger

```json
{
  "type": "trigger.cron",
  "config": {
    "schedule": "0 9 * * 1-5"  // Every weekday at 9 AM
  }
}
```

Executed on a schedule processed by the scheduler service.

### Manual Trigger

```json
{
  "type": "trigger.manual",
  "config": {}
}
```

Executed when a user clicks "Run" in the UI or calls the API.

### Event Trigger

```json
{
  "type": "trigger.event",
  "config": {
    "eventType": "user.created"
  }
}
```

Executed when a specific internal event is emitted.

## Node Types

See [Node Types](./node-types.md) for the complete list of available node types and their configurations.

## Execution Monitoring

### Execution Statuses

| Status | Description |
|--------|-------------|
| `pending` | Waiting to start |
| `running` | Currently executing |
| `completed` | All nodes finished successfully |
| `failed` | A node failed after all retries |
| `cancelled` | Manually cancelled by user |

### Node Statuses

| Status | Description |
|--------|-------------|
| `pending` | Waiting for dependencies |
| `running` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Failed after retries |
| `skipped` | Skipped due to condition/branch |

### Real-Time Updates

Connect to the WebSocket server for live execution updates:

```typescript
const socket = io('ws://localhost:3001');

socket.on('execution:started', (data) => {
  console.log('Execution started:', data.executionId);
});

socket.on('execution:node:completed', (data) => {
  console.log('Node completed:', data.nodeId, data.output);
});

socket.on('execution:completed', (data) => {
  console.log('Execution completed:', data.output);
});

socket.on('execution:failed', (data) => {
  console.log('Execution failed:', data.error);
});

socket.on('execution:log', (data) => {
  console.log('Log:', data.level, data.message);
});
```

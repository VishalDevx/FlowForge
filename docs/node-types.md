# Node Types

FlowForge provides built-in node types organized into three categories: Triggers, Actions, and Logic.

## Trigger Nodes

Trigger nodes start workflow executions. Each workflow must have exactly one trigger node.

### `trigger.webhook`

Receives HTTP requests as workflow input.

**Configuration:**
```json
{
  "method": "POST",
  "path": "/webhook/my-workflow",
  "responseCode": 200,
  "responseBody": "{\"received\": true}"
}
```

**Input:** HTTP request (headers, body, query params)
**Output:** Request payload passed to next node

---

### `trigger.cron`

Executes workflow on a schedule.

**Configuration:**
```json
{
  "schedule": "0 */6 * * *",
  "timezone": "UTC"
}
```

**Input:** Scheduled execution metadata
**Output:** Timestamp and trigger data

---

### `trigger.manual`

Executed when a user manually runs the workflow.

**Configuration:**
```json
{}
```

**Input:** Optional user-provided input
**Output:** User input passed to next node

---

### `trigger.event`

Executed when an internal event is emitted.

**Configuration:**
```json
{
  "eventType": "user.created"
}
```

**Input:** Event payload
**Output:** Event data passed to next node

## Action Nodes

Action nodes perform work — HTTP requests, emails, data transformation, etc.

### `action.http`

Makes an HTTP request to an external API.

**Configuration:**
```json
{
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer {{secrets.api_key}}",
    "Content-Type": "application/json"
  },
  "body": "{\"query\": \"value\"}",
  "timeout": 10000,
  "retryOnFailure": true,
  "maxRetries": 3
}
```

**Input:** Data from previous node (can be used in URL, headers, body)
**Output:** HTTP response (status, headers, body)

**Supported Methods:** GET, POST, PUT, PATCH, DELETE
**Timeout:** 1-30 seconds (default: 10s)

---

### `action.email`

Sends an email notification.

**Configuration:**
```json
{
  "to": "user@example.com",
  "from": "noreply@flowforge.dev",
  "subject": "Workflow Complete",
  "body": "Your workflow has finished successfully.",
  "html": true,
  "host": "smtp.example.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "{{secrets.smtp_user}}",
    "pass": "{{secrets.smtp_pass}}"
  }
}
```

**Input:** Data from previous node (can be templated into body)
**Output:** Email send status and message ID

---

### `action.condition`

Evaluates a condition and branches execution.

**Configuration:**
```json
{
  "condition": "data.status === 'success'",
  "trueLabel": "Success Path",
  "falseLabel": "Failure Path"
}
```

**Input:** Data from previous node
**Output:** Branches to next nodes based on condition result
**Note:** Creates two outgoing edges — one for true, one for false

---

### `action.delay`

Pauses execution for a specified duration.

**Configuration:**
```json
{
  "duration": 5000,
  "unit": "ms"
}
```

**Duration Options:**
- `ms` — milliseconds
- `s` — seconds
- `m` — minutes
- `h` — hours

**Input:** Data from previous node (passed through)
**Output:** Same data after delay

---

### `action.transform`

Transforms input data using a JavaScript expression.

**Configuration:**
```json
{
  "expression": "return { name: data.user.name, email: data.user.email };"
}
```

**Input:** Data from previous node (available as `data`)
**Output:** Return value of expression

**Available Variables:**
- `data` — Input from previous node

---

### `action.queue`

Enqueues a job for asynchronous processing.

**Configuration:**
```json
{
  "queue": "notifications",
  "priority": 1
}
```

**Input:** Data to enqueue
**Output:** Job ID and status

---

### `action.callWorkflow`

Calls another workflow and waits for its completion.

**Configuration:**
```json
{
  "workflowId": "workflow-uuid",
  "passInput": true,
  "timeout": 60000
}
```

**Input:** Data to pass to called workflow
**Output:** Called workflow's output

## Logic Nodes

Logic nodes control workflow execution flow.

### `logic.branch`

Splits execution into multiple parallel paths.

**Configuration:**
```json
{
  "branches": ["branch_a", "branch_b", "branch_c"]
}
```

**Input:** Data from previous node
**Output:** Same data sent to all branch outputs

---

### `logic.loop`

Repeats execution a specified number of times.

**Configuration:**
```json
{
  "maxIterations": 10,
  "arrayPath": "data.items"
}
```

**Input:** Array of items to iterate over
**Output:** Array of results from each iteration

**Limits:**
- Maximum 100 iterations per loop

---

### `logic.merge`

Merges results from multiple branches.

**Configuration:**
```json
{
  "mergeStrategy": "combine"
}
```

**Strategies:**
- `combine` — Collects all branch outputs into an array
- `first` — Returns the first completed branch result
- `last` — Returns the last completed branch result

**Input:** Outputs from multiple branches
**Output:** Merged result

---

### `logic.retry`

Retries a failed operation with configurable backoff.

**Configuration:**
```json
{
  "maxRetries": 3,
  "backoff": "exponential",
  "initialDelay": 1000
}
```

**Backoff Strategies:**
- `fixed` — Same delay each retry
- `exponential` — Delay doubles each retry
- `linear` — Delay increases by initialDelay each retry

---

### `logic.errorBoundary`

Catches errors from child nodes and handles them.

**Configuration:**
```json
{
  "onError": "continue",
  "fallback": { "status": "error_handled" }
}
```

**Actions:**
- `continue` — Proceed to fallback output
- `fail` — Fail the execution with custom error
- `retry` — Retry the child node

## Using Secrets in Nodes

Reference workspace secrets in node configurations using the `{{secrets.secret_name}}` syntax:

```json
{
  "headers": {
    "Authorization": "Bearer {{secrets.api_key}}"
  }
}
```

Secrets are resolved at execution time and never appear in logs or responses.

## Adding Custom Nodes

To add a custom node type:

1. Define the node type in `packages/contracts/src/index.ts`
2. Implement the executor in `packages/nodes/src/index.ts`
3. Add UI representation in the frontend workflow editor

```typescript
// packages/nodes/src/index.ts
export const executeMyNode = async (config: MyNodeConfig, input: unknown) => {
  const result = await doSomething(config, input);
  return { status: 'success', data: result };
};
```

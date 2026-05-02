import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const workflowExecutionsTotal = new Counter({
  name: 'workflow_executions_total',
  help: 'Total number of workflow executions',
  labelNames: ['workflow_id', 'status'],
  registers: [register],
});

export const workflowExecutionDuration = new Histogram({
  name: 'workflow_execution_duration_seconds',
  help: 'Duration of workflow execution in seconds',
  labelNames: ['workflow_id', 'status'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120],
  registers: [register],
});

export const nodeExecutionsTotal = new Counter({
  name: 'node_executions_total',
  help: 'Total number of node executions',
  labelNames: ['node_type', 'status'],
  registers: [register],
});

export const nodeExecutionDuration = new Histogram({
  name: 'node_execution_duration_seconds',
  help: 'Duration of node execution in seconds',
  labelNames: ['node_type', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [register],
});

export const queueJobsPending = new Gauge({
  name: 'queue_jobs_pending',
  help: 'Number of pending jobs in queue',
  labelNames: ['queue'],
  registers: [register],
});

export const queueJobsActive = new Gauge({
  name: 'queue_jobs_active',
  help: 'Number of active jobs in queue',
  labelNames: ['queue'],
  registers: [register],
});

export const queueJobsCompleted = new Gauge({
  name: 'queue_jobs_completed',
  help: 'Number of completed jobs in queue',
  labelNames: ['queue'],
  registers: [register],
});

export const queueJobsFailed = new Gauge({
  name: 'queue_jobs_failed',
  help: 'Number of failed jobs in queue',
  labelNames: ['queue'],
  registers: [register],
});

export const activeWorkers = new Gauge({
  name: 'active_workers',
  help: 'Number of active workers',
  labelNames: ['worker_id'],
  registers: [register],
});

export const websocketConnections = new Gauge({
  name: 'websocket_connections',
  help: 'Number of active websocket connections',
  registers: [register],
});

export const metricsEndpoint = async () => {
  return register.metrics();
};

export const registerContentType = 'application/openmetrics-text';

export default register;
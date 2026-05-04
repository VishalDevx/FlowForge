"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerContentType = exports.metricsEndpoint = exports.websocketConnections = exports.activeWorkers = exports.queueJobsFailed = exports.queueJobsCompleted = exports.queueJobsActive = exports.queueJobsPending = exports.nodeExecutionDuration = exports.nodeExecutionsTotal = exports.workflowExecutionDuration = exports.workflowExecutionsTotal = exports.httpRequestTotal = exports.httpRequestDuration = void 0;
const prom_client_1 = require("prom-client");
const register = new prom_client_1.Registry();
exports.httpRequestDuration = new prom_client_1.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
    registers: [register],
});
exports.httpRequestTotal = new prom_client_1.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [register],
});
exports.workflowExecutionsTotal = new prom_client_1.Counter({
    name: 'workflow_executions_total',
    help: 'Total number of workflow executions',
    labelNames: ['workflow_id', 'status'],
    registers: [register],
});
exports.workflowExecutionDuration = new prom_client_1.Histogram({
    name: 'workflow_execution_duration_seconds',
    help: 'Duration of workflow execution in seconds',
    labelNames: ['workflow_id', 'status'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120],
    registers: [register],
});
exports.nodeExecutionsTotal = new prom_client_1.Counter({
    name: 'node_executions_total',
    help: 'Total number of node executions',
    labelNames: ['node_type', 'status'],
    registers: [register],
});
exports.nodeExecutionDuration = new prom_client_1.Histogram({
    name: 'node_execution_duration_seconds',
    help: 'Duration of node execution in seconds',
    labelNames: ['node_type', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
    registers: [register],
});
exports.queueJobsPending = new prom_client_1.Gauge({
    name: 'queue_jobs_pending',
    help: 'Number of pending jobs in queue',
    labelNames: ['queue'],
    registers: [register],
});
exports.queueJobsActive = new prom_client_1.Gauge({
    name: 'queue_jobs_active',
    help: 'Number of active jobs in queue',
    labelNames: ['queue'],
    registers: [register],
});
exports.queueJobsCompleted = new prom_client_1.Gauge({
    name: 'queue_jobs_completed',
    help: 'Number of completed jobs in queue',
    labelNames: ['queue'],
    registers: [register],
});
exports.queueJobsFailed = new prom_client_1.Gauge({
    name: 'queue_jobs_failed',
    help: 'Number of failed jobs in queue',
    labelNames: ['queue'],
    registers: [register],
});
exports.activeWorkers = new prom_client_1.Gauge({
    name: 'active_workers',
    help: 'Number of active workers',
    labelNames: ['worker_id'],
    registers: [register],
});
exports.websocketConnections = new prom_client_1.Gauge({
    name: 'websocket_connections',
    help: 'Number of active websocket connections',
    registers: [register],
});
const metricsEndpoint = async () => {
    return register.metrics();
};
exports.metricsEndpoint = metricsEndpoint;
exports.registerContentType = 'application/openmetrics-text';
exports.default = register;

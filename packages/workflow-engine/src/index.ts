import {
  WorkflowNodeSchema,
  WorkflowEdgeSchema,
  WorkflowVersionSchema,
  type ExecutionStatus,
  type ExecutionNodeStatus,
  type Trigger,
  type NodeType,
} from '@flowforge/contracts';
import { z } from 'zod';

export type GraphNode = {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  incomingEdges: string[];
  outgoingEdges: string[];
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
};

export type ExecutionGraph = Map<string, GraphNode>;
export type ExecutionPlan = Array<{ nodeId: string; dependsOn: string[] }>;

const MAX_TRAVERSAL_DEPTH = 100;

export const parseNodes = (
  nodes: z.infer<typeof WorkflowNodeSchema>[],
): Map<string, GraphNode> => {
  const graph: ExecutionGraph = new Map();
  
  for (const node of nodes) {
    graph.set(node.id, {
      id: node.id,
      type: node.type as NodeType,
      label: node.label,
      position: { x: node.positionX, y: node.positionY },
      config: node.config,
      incomingEdges: [],
      outgoingEdges: [],
    });
  }
  
  return graph;
};

export interface EdgeInput {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export const buildGraphFromData = (
  nodes: z.infer<typeof WorkflowNodeSchema>[],
  edges: EdgeInput[],
): { graph: ExecutionGraph; edgeMap: Map<string, GraphEdge> } => {
  const graph = parseNodes(nodes);
  const edgeMap = new Map<string, GraphEdge>();
  
  for (const edge of edges) {
    const sourceNode = graph.get(edge.sourceNodeId);
    const targetNode = graph.get(edge.targetNodeId);
    
    if (!sourceNode || !targetNode) continue;
    
    sourceNode.outgoingEdges.push(edge.id);
    targetNode.incomingEdges.push(edge.id);
    
    edgeMap.set(edge.id, {
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
    });
  }
  
  return { graph, edgeMap };
};

export const detectCycles = (graph: ExecutionGraph): boolean => {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  const dfs = (nodeId: string): boolean => {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const node = graph.get(nodeId);
    if (!node) return false;
    
    for (const targetNodeId of node.outgoingEdges) {
      const targetNode = Array.from(graph.entries()).find(([, n]) => n.outgoingEdges.includes(targetNodeId))?.[1];
      if (!targetNode) continue;
      
      if (recursionStack.has(targetNode.id)) {
        return true;
      }
      
      if (!visited.has(targetNode.id)) {
        if (dfs(targetNode.id)) return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  };
  
  for (const [nodeId] of graph) {
    visited.clear();
    recursionStack.clear();
    if (dfs(nodeId)) return true;
  }
  
  return false;
};

export const topologicalSort = (graph: ExecutionGraph, startNodeId?: string): string[] => {
  const inDegree = new Map<string, number>();
  const queue: string[] = [];
  const result: string[] = [];
  
  for (const [nodeId, node] of graph) {
    inDegree.set(nodeId, node.incomingEdges.length);
    if (node.incomingEdges.length === 0 || (startNodeId && nodeId === startNodeId)) {
      queue.push(nodeId);
    }
  }
  
  let depth = 0;
  while (queue.length > 0 && depth < MAX_TRAVERSAL_DEPTH) {
    const nodeId = queue.shift()!;
    result.push(nodeId);
    
    const node = graph.get(nodeId);
    if (!node) continue;
    
    for (const edgeId of node.outgoingEdges) {
      const targetNode = Array.from(graph.values()).find((n) => n.outgoingEdges.includes(edgeId));
      if (!targetNode) continue;
      
      const targetId = targetNode.id;
      const newDegree = (inDegree.get(targetId) || 0) - 1;
      inDegree.set(targetId, newDegree);
      
      if (newDegree <= 0) {
        queue.push(targetId);
      }
    }
    depth++;
  }
  
  if (result.length !== graph.size) {
    throw new Error('Workflow contains cycles or unreachable nodes');
  }
  
  return result;
};

export const buildExecutionPlan = (
  nodes: z.infer<typeof WorkflowNodeSchema>[],
  edges: EdgeInput[],
  triggerNodeId: string,
): ExecutionPlan => {
  const { graph, edgeMap } = buildGraphFromData(nodes, edges);
  
  if (detectCycles(graph)) {
    throw new Error('Workflow contains cycles');
  }
  
  const sortedIds = topologicalSort(graph, triggerNodeId);
  const triggerIndex = sortedIds.indexOf(triggerNodeId);
  
  if (triggerIndex === -1) {
    throw new Error('Trigger node not found in workflow');
  }
  
  const plan: ExecutionPlan = [];
  for (const nodeId of sortedIds.slice(triggerIndex)) {
    const node = graph.get(nodeId)!;
    
    const dependsOn: string[] = [];
    for (const edgeId of node.incomingEdges) {
      const edge = edgeMap.get(edgeId);
      if (edge && sortedIds.indexOf(edge.source) >= triggerIndex) {
        dependsOn.push(edge.source);
      }
    }
    
    plan.push({ nodeId, dependsOn });
  }
  
  return plan;
};

export const getTriggerNode = (
  nodes: z.infer<typeof WorkflowNodeSchema>[],
): z.infer<typeof WorkflowNodeSchema> | undefined => {
  return nodes.find((n) => n.type.startsWith('trigger.'));
};

export const validateWorkflow = (
  version: z.infer<typeof WorkflowVersionSchema>,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!version.nodes || version.nodes.length === 0) {
    errors.push('Workflow must have at least one node');
  }
  
  const triggerNodes = version.nodes.filter((n) => n.type.startsWith('trigger.'));
  if (triggerNodes.length === 0) {
    errors.push('Workflow must have at least one trigger node');
  }
  
  if (triggerNodes.length > 1) {
    errors.push('Workflow can have only one trigger node');
  }
  
  try {
    const { graph } = buildGraphFromData(version.nodes, version.edges.map(e => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      label: e.label ?? undefined,
    })));
    if (detectCycles(graph)) {
      errors.push('Workflow contains invalid cycle');
    }
    topologicalSort(graph);
  } catch (e) {
    errors.push((e as Error).message);
  }
  
  return { valid: errors.length === 0, errors };
};

export type {
  z,
  WorkflowNodeSchema as Node,
  WorkflowEdgeSchema as Edge,
  WorkflowVersionSchema as Version,
  ExecutionStatus,
  ExecutionNodeStatus,
  Trigger,
  NodeType,
};
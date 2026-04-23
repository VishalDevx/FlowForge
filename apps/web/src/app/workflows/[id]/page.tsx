'use client';

import { useState, useCallback } from 'react';
import { use } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

const nodeTypes = {
  trigger: () => (
    <div className="px-4 py-2 bg-primary-100 border border-primary-300 rounded-md text-primary-800 text-sm font-medium">
      Trigger
    </div>
  ),
  action: () => (
    <div className="px-4 py-2 bg-green-100 border border-green-300 rounded-md text-green-800 text-sm font-medium">
      Action
    </div>
  ),
};

const initialNodes: Node[] = [
  { id: '1', type: 'trigger', position: { x: 250, y: 5 }, data: { label: 'Webhook Trigger' } },
];

const initialEdges: Edge[] = [];

export default function WorkflowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [saving, setSaving] = useState(false);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...connection, markerEnd: { type: MarkerType.ArrowClosed } },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const onSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('accessToken');
    try {
      await fetch(`/api/v1/workflows/${id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            positionX: n.position.x,
            positionY: n.position.y,
            label: n.data?.label || '',
            config: {},
          })),
          edges: edges.map((e) => ({
            id: e.id,
            sourceNodeId: e.source,
            targetNodeId: e.target,
          })),
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-medium">Workflow Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => window.history.back()}>
            Cancel
          </button>
          <button className="btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}
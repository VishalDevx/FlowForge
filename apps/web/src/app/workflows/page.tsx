'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '../../components/layout/dashboard-layout';
import { isAuthenticated } from '../../lib/auth';
import { api } from '../../lib/api';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

function WorkflowsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    async function loadData() {
      try {
        const wsData = await api.get<Record<string, unknown>>('/workspaces');
        const ws = (wsData as { workspaces?: Workspace[] })?.workspaces || [];
        setWorkspaces(ws);

        const urlWsId = searchParams.get('workspace');
        const wsId = urlWsId || ws[0]?.id || '';
        setSelectedWorkspace(wsId);

        if (wsId) {
          const data = await api.get<Record<string, unknown>>(`/workflows?workspaceId=${wsId}`);
          const wfs = (data as { workflows?: Workflow[] })?.workflows || [];
          setWorkflows(wfs);
        }
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, searchParams]);

  const handleWorkspaceChange = async (wsId: string) => {
    setSelectedWorkspace(wsId);
    router.push(`/workflows?workspace=${wsId}`);
    if (wsId) {
      try {
        const data = await api.get<Record<string, unknown>>(`/workflows?workspaceId=${wsId}`);
        const wfs = (data as { workflows?: Workflow[] })?.workflows || [];
        setWorkflows(wfs);
      } catch {
        setError('Failed to load workflows');
      }
    } else {
      setWorkflows([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/workflows', { name: newName, description: newDesc, workspaceId: selectedWorkspace });
      setShowCreateModal(false);
      setNewName('');
      setNewDesc('');

      const data = await api.get<Record<string, unknown>>(`/workflows?workspaceId=${selectedWorkspace}`);
      setWorkflows((data as { workflows?: Workflow[] })?.workflows || []);
      } catch {
        // silently fail
      } finally {
      setCreating(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      draft: { className: 'badge-muted', label: 'Draft' },
      published: { className: 'badge-success', label: 'Published' },
      archived: { className: 'badge-warning', label: 'Archived' },
    };
    const s = map[status] || map.draft;
    return <span className={s.className}>{s.label}</span>;
  };

  return (
    <DashboardLayout
      title="Workflows"
      description="Manage and build your automated workflows."
      actions={
        <div className="flex items-center gap-3">
          {workspaces.length > 0 && (
            <select
              value={selectedWorkspace}
              onChange={(e) => handleWorkspaceChange(e.target.value)}
              className="input py-2 pr-8"
            >
              <option value="">Select workspace...</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
            disabled={!selectedWorkspace}
          >
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Workflow
          </button>
        </div>
      }
    >
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-4 w-48" />
            </div>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <div className="card text-center py-16">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1">No workflows yet</h3>
          <p className="text-muted-foreground mb-6">Create your first workflow to automate your processes.</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Description</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Updated</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((workflow) => (
                <tr key={workflow.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <Link href={`/workflows/${workflow.id}`} className="font-medium text-primary hover:underline">
                      {workflow.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4">{statusBadge(workflow.status)}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{workflow.description || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                    {new Date(workflow.updatedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/workflows/${workflow.id}`} className="text-primary hover:underline text-sm">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="card w-full max-w-md mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-sm mb-1">Create Workflow</h3>
            <p className="text-sm text-muted-foreground mb-6">Give your workflow a name and optional description.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="Email Notification Pipeline" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="input resize-none" rows={3} placeholder="Sends an email when a webhook is received..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <WorkflowsContent />
    </Suspense>
  );
}

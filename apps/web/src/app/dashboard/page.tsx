'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '../../components/layout/dashboard-layout';
import { isAuthenticated, clearTokens } from '../../lib/auth';
import { useAuth } from '../../stores/auth';
import { api } from '../../lib/api';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

interface Stats {
  workflows: number;
  executions: number;
  successRate: number;
  activeTriggers: number;
}

interface Execution {
  id: string;
  workflowName?: string;
  status: string;
  startedAt?: string;
  duration?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [stats, setStats] = useState<Stats>({ workflows: 0, executions: 0, successRate: 0, activeTriggers: 0 });
  const [recentExecutions, setRecentExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceSlug, setNewWorkspaceSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    async function loadUser() {
      try {
        const data = await api.get<{ id: string; email: string; name: string }>('/auth/me');
        setUser(data as { id: string; email: string; name: string });
        setUserLoaded(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        clearTokens();
        router.push('/login');
      }
    }

    loadUser();
  }, [router, setUser]);

  useEffect(() => {
    if (!userLoaded) return;

    async function loadData() {
      try {
        const [wsData, execData] = await Promise.all([
          api.get<Record<string, unknown>>('/workspaces'),
          api.get<Record<string, unknown>>('/executions?limit=4'),
        ]);

        const ws = (wsData as { workspaces?: Workspace[] })?.workspaces || [];
        setWorkspaces(ws);

        const execs = (execData as { executions?: Execution[] })?.executions || [];
        const totalExecutions = execs.length;
        const successful = execs.filter((e) => e.status === 'completed').length;
        const successRate = totalExecutions > 0 ? (successful / totalExecutions) * 100 : 0;

        setStats({
          workflows: ws.length,
          executions: totalExecutions,
          successRate: Math.round(successRate * 10) / 10,
          activeTriggers: 0,
        });

        setRecentExecutions(execs.map((e) => ({
          id: e.id,
          workflowName: e.workflowName || 'Unknown Workflow',
          status: e.status || 'unknown',
          startedAt: e.startedAt || 'Unknown',
          duration: e.duration || '—',
        })));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userLoaded]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await api.post('/workspaces', {
        name: newWorkspaceName,
        slug: newWorkspaceSlug || newWorkspaceName.toLowerCase().replace(/\s+/g, '-'),
      });
      setShowCreateModal(false);
      setNewWorkspaceName('');
      setNewWorkspaceSlug('');

      const wsData = await api.get<Record<string, unknown>>('/workspaces');
      setWorkspaces((wsData as { workspaces?: Workspace[] })?.workspaces || []);
    } catch {
      // workspace creation failed
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              setUserLoaded(false);
              window.location.reload();
            }}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Dashboard"
      description="Welcome back, here's an overview of your workflows."
      actions={
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Workspace
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Workflows</p>
              <p className="mt-1 text-3xl font-bold">{stats.workflows}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Executions</p>
              <p className="mt-1 text-3xl font-bold">{stats.executions.toLocaleString()}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="mt-1 text-3xl font-bold">{stats.successRate}%</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
              <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Triggers</p>
              <p className="mt-1 text-3xl font-bold">{stats.activeTriggers}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="heading-sm mb-4">Your Workspaces</h2>

        {workspaces.length === 0 ? (
          <div className="card text-center py-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-1">No workspaces yet</h3>
            <p className="text-muted-foreground mb-6">Create your first workspace to start building workflows.</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((workspace) => (
              <Link key={workspace.id} href={`/workflows?workspace=${workspace.id}`}>
                <div className="card card-hover cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{workspace.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">/{workspace.slug}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            <button
              onClick={() => setShowCreateModal(true)}
              className="card card-hover cursor-pointer border-dashed flex items-center justify-center min-h-[120px]"
            >
              <div className="text-center">
                <svg className="h-8 w-8 mx-auto text-muted-foreground mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <p className="text-sm font-medium text-muted-foreground">New Workspace</p>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="heading-sm mb-4">Recent Executions</h3>
          {recentExecutions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No executions yet</p>
          ) : (
            <div className="space-y-3">
              {recentExecutions.map((exec) => (
                <div key={exec.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      exec.status === 'completed' ? 'bg-success' :
                      exec.status === 'running' ? 'bg-primary animate-pulse' :
                      exec.status === 'failed' ? 'bg-destructive' :
                      'bg-muted'
                    }`} />
                    <span className="text-sm font-medium">{exec.workflowName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{exec.duration}</span>
                    <span>{exec.startedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="heading-sm mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'New Workflow', icon: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244', href: '/workflows' },
              { label: 'View Logs', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z', href: '/executions' },
              { label: 'API Docs', icon: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5', href: '/docs/api-reference' },
              { label: 'Settings', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z', href: '/settings' },
            ].map((action) => (
              <Link key={action.label} href={action.href} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center">
                <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                </svg>
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="card w-full max-w-md mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-sm mb-1">Create Workspace</h3>
            <p className="text-sm text-muted-foreground mb-6">Give your workspace a name and optional slug.</p>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Workspace name</label>
                <input
                  type="text"
                  required
                  value={newWorkspaceName}
                  onChange={(e) => {
                    setNewWorkspaceName(e.target.value);
                    if (!newWorkspaceSlug) setNewWorkspaceSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }}
                  className="input"
                  placeholder="My Team"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Slug <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={newWorkspaceSlug}
                  onChange={(e) => setNewWorkspaceSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="input"
                  placeholder="my-team"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/**
 * Executions page — monitor and manage all workflow executions.
 * Displays aggregate stats and a sortable table of individual executions.
 *
 * @example
 * ```tsx
 * <ExecutionsPage />
 * ```
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../components/layout/dashboard-layout';
import { isAuthenticated } from '../../lib/auth';
import { api } from '../../lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Execution {
  id: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  duration: string;
  nodes: number;
}

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'default'; label: string }> = {
  pending: { variant: 'secondary', label: 'Pending' },
  running: { variant: 'default', label: 'Running' },
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'destructive', label: 'Failed' },
  cancelled: { variant: 'secondary', label: 'Cancelled' },
};

export default function ExecutionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [executions, setExecutions] = useState<Execution[]>([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    async function loadExecutions() {
      try {
        const data = await api.get<Record<string, unknown>>('/executions');
        const execs = (data as { executions?: Execution[] })?.executions || [];
        setExecutions(execs);
      } catch {
        // Failed to load executions
      } finally {
        setLoading(false);
      }
    }

    loadExecutions();
  }, [router]);

  const statsCards = [
    { label: 'Total (30 days)', value: '1,847', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6' },
    { label: 'Success Rate', value: '99.2%', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Avg Duration', value: '2.4s', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Failed', value: '12', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z' },
  ];

  return (
    <DashboardLayout title="Executions" description="Monitor and manage all workflow executions.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat) => (
          <Card key={stat.label} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Workflow</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Nodes</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Duration</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Started</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((exec) => {
                  const status = statusConfig[exec.status] || statusConfig.pending;
                  return (
                    <tr key={exec.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{exec.workflowName}</td>
                      <td className="py-3 px-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{exec.nodes}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{exec.duration}</td>
                      <td className="py-3 px-4 text-muted-foreground">{exec.startedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}

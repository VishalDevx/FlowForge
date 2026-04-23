'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchWorkflows() {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      try {
        const res = await fetch('/api/v1/workflows?workspaceId=demo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setWorkflows(data.data?.workflows || []);
        }
      } catch {
        setError('Failed to load workflows');
      } finally {
        setLoading(false);
      }
    }
    fetchWorkflows();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-primary-600">FlowForge</Link>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
                <Link href="/dashboard" className="border-transparent text-gray-500 hover:text-gray-700 px-1 pt-1 border-b-2 text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/workflows" className="border-primary-600 text-gray-900 px-1 pt-1 border-b-2 text-sm font-medium">
                  Workflows
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <Link href="/workflows/new" className="btn-primary">
            Create Workflow
          </Link>
        </div>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-600 bg-red-50 rounded">{error}</div>
        )}

        {workflows.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">No workflows yet</h3>
            <p className="mt-2 text-sm text-gray-500">Create your first workflow to automate your processes.</p>
            <Link href="/workflows/new" className="btn-primary mt-4 inline-block">
              Create Workflow
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workflows.map((workflow) => (
                  <tr key={workflow.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/workflows/${workflow.id}`} className="text-primary-600 hover:text-primary-900 font-medium">
                        {workflow.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{workflow.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(workflow.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link href={`/workflows/${workflow.id}`} className="text-primary-600 hover:text-primary-900">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
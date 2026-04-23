import Link from 'next/link';
import { redirect } from 'next/navigation';

async function getWorkspaces() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (!token) redirect('/login');

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/workspaces`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.workspaces || [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const workspaces = await getWorkspaces();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-primary-600">FlowForge</Link>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
                <Link href="/dashboard" className="border-primary-600 text-gray-900 px-1 pt-1 border-b-2 text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/workflows" className="border-transparent text-gray-500 hover:text-gray-700 px-1 pt-1 border-b-2 text-sm font-medium">
                  Workflows
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-sm text-gray-500">Sign out</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <button className="btn-primary">Create Workspace</button>
        </div>

        {workspaces.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">No workspaces yet</h3>
            <p className="mt-2 text-sm text-gray-500">Create your first workspace to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace: any) => (
              <Link key={workspace.id} href={`/workspaces/${workspace.id}`}>
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-medium text-gray-900">{workspace.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">/{workspace.slug}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
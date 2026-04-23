import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <span className="text-xl font-bold text-primary-600">FlowForge</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link href="/features" className="border-primary-600 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Features
                </Link>
                <Link href="/docs" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Docs
                </Link>
                <Link href="/pricing" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Pricing
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden pt-16 pb-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Build workflows that <span className="text-primary-600">scale</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
                A distributed workflow execution platform for building, testing, and running automated workflows. Connect triggers, actions, and logic nodes visually.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/register" className="btn-primary px-8 py-3 text-lg">
                  Start building for free
                </Link>
                <Link href="/docs" className="btn-secondary px-8 py-3 text-lg">
                  Read the docs
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="p-8 border rounded-lg">
                <div className="text-2xl mb-4">🎨</div>
                <h3 className="text-lg font-semibold text-gray-900">Visual Editor</h3>
                <p className="mt-2 text-gray-600">
                  Drag and drop nodes to build workflows visually. Connect triggers to actions with ease.
                </p>
              </div>
              <div className="p-8 border rounded-lg">
                <div className="text-2xl mb-4">⚡</div>
                <h3 className="text-lg font-semibold text-gray-900">Distributed Execution</h3>
                <p className="mt-2 text-gray-600">
                  Run workflows at scale with BullMQ workers. Handle retries, timeouts, and dead-letter queues.
                </p>
              </div>
              <div className="p-8 border rounded-lg">
                <div className="text-2xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-gray-900">Real-time Monitoring</h3>
                <p className="mt-2 text-gray-600">
                  Watch workflows execute in real-time. Stream logs, inspect inputs/outputs, and debug failures.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2026 FlowForge. Built for developers.
          </p>
        </div>
      </footer>
    </div>
  );
}
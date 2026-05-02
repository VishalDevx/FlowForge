import Link from 'next/link';
import { MarketingHeader } from '../../components/layout/marketing-header';
import { MarketingFooter } from '../../components/layout/marketing-footer';

const docNav = [
  {
    title: 'Introduction',
    items: [
      { name: 'Overview', slug: 'overview', description: 'What is FlowForge and its core concepts' },
      { name: 'Getting Started', slug: 'getting-started', description: 'Set up your development environment' },
      { name: 'Architecture', slug: 'architecture', description: 'System design and data flow' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { name: 'Authentication', slug: 'authentication', description: 'JWT auth, tokens, and session management' },
      { name: 'Workflows', slug: 'workflows', description: 'Building, executing, and monitoring workflows' },
      { name: 'Node Types', slug: 'node-types', description: 'Available node types and configurations' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { name: 'API Reference', slug: 'api-reference', description: 'Complete REST API documentation' },
      { name: 'Deployment', slug: 'deployment', description: 'Production deployment guide' },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketingHeader />

      <main className="flex-1 container py-16">
        <div className="mb-12">
          <h1 className="heading-xl">Documentation</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            Comprehensive guides and references for building with FlowForge.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <nav className="sticky top-24 space-y-6">
              {docNav.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={`/docs/${item.slug}`}
                          className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-3 space-y-8">
            {docNav.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-semibold mb-4">{section.title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {section.items.map((item) => (
                    <Link
                      key={item.slug}
                      href={`/docs/${item.slug}`}
                      className="card card-hover block"
                    >
                      <h3 className="font-semibold mb-1">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <div className="mt-3 flex items-center text-sm text-primary font-medium">
                        Read more
                        <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

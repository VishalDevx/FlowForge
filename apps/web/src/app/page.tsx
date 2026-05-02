import Link from 'next/link';
import { MarketingHeader } from '../components/layout/marketing-header';
import { MarketingFooter } from '../components/layout/marketing-footer';

const features = [
  {
    title: 'Visual Workflow Builder',
    description: 'Drag-and-drop interface powered by React Flow. Build complex workflows without writing a single line of code.',
    icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.59.897a2.25 2.25 0 01-2.11 0L5 14.5m14.8.8l1.402 1.402c1.172 1.172 1.172 3.071 0 4.242l-.877.878c-1.172 1.172-3.071 1.172-4.243 0L14.8 20.3M5 14.5l-1.402 1.402c-1.172 1.172-1.172 3.071 0 4.242l.878.878c1.172 1.172 3.071 1.172 4.242 0L5 14.5m0 0V7.5',
  },
  {
    title: 'Distributed Execution',
    description: 'Run workflows at scale with BullMQ workers. Automatic retries, dead-letter queues, and horizontal scaling built in.',
    icon: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125',
  },
  {
    title: 'Real-Time Monitoring',
    description: 'Watch workflows execute live via WebSocket. Stream logs, inspect inputs/outputs, and debug failures instantly.',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  },
  {
    title: 'Webhook & Cron Triggers',
    description: 'Start workflows from HTTP webhooks, cron schedules, manual runs, or internal events. Connect anything.',
    icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'Team Collaboration',
    description: 'Multi-tenant workspaces with role-based access control. Invite team members and manage permissions.',
    icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  },
  {
    title: 'API-First Design',
    description: 'Full REST API for programmatic workflow management. Build custom integrations and automate everything.',
    icon: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5',
  },
];

const stats = [
  { value: '10K+', label: 'Developers' },
  { value: '2M+', label: 'Executions' },
  { value: '99.9%', label: 'Uptime' },
  { value: '<50ms', label: 'Avg Latency' },
];

const testimonials = [
  {
    quote: 'FlowForge replaced 4 different tools we were using. The visual editor is incredibly intuitive and the execution engine is rock solid.',
    name: 'Sarah Chen',
    role: 'CTO, Stackline',
    avatar: 'SC',
  },
  {
    quote: 'We process over 50K executions daily. FlowForge handles it without breaking a sweat. The monitoring dashboard is a game changer.',
    name: 'Marcus Rivera',
    role: 'Engineering Lead, DataPipe',
    avatar: 'MR',
  },
  {
    quote: 'The webhook system is lightning fast. We went from idea to production workflow in under an hour. Incredible developer experience.',
    name: 'Priya Patel',
    role: 'Founder, AutomateLab',
    avatar: 'PP',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 mesh-gradient" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

          <div className="container relative py-24 sm:py-32 lg:py-40">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm mb-8 animate-fade-in">
                <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
                Now in public beta — Start building for free
              </div>

              <h1 className="heading-xl text-balance animate-slide-up">
                Automate anything with{' '}
                <span className="gradient-text">intelligent workflows</span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Build, deploy, and run automated workflows at scale. Visual editor, distributed execution, and real-time monitoring — all in one platform.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <Link href="/register" className="btn-primary btn-lg">
                  Start Building Free
                  <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link href="/docs" className="btn-secondary btn-lg">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  Read the Docs
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  14-day free trial
                </span>
              </div>
            </div>

            {/* Hero visual */}
            <div className="mt-16 sm:mt-20 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="relative rounded-2xl border border-border bg-card p-2 shadow-2xl">
                <div className="rounded-xl bg-slate-900 p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-500/80" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                      <div className="h-3 w-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 text-center">
                      <div className="inline-block rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-400">
                        flowforge.app/dashboard
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-500/20 px-3 py-2 text-xs text-blue-300 font-mono">
                        trigger.webhook
                      </div>
                      <div className="h-px flex-1 bg-slate-700" />
                      <div className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs text-emerald-300 font-mono">
                        action.http
                      </div>
                      <div className="h-px flex-1 bg-slate-700" />
                      <div className="rounded-lg bg-purple-500/20 px-3 py-2 text-xs text-purple-300 font-mono">
                        action.email
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="h-px w-0.5 h-6 bg-slate-700" />
                    </div>
                    <div className="flex justify-center">
                      <div className="rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-300 font-mono">
                        logic.condition
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-border bg-card">
          <div className="container py-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold gradient-text">{stat.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="section">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="heading-lg">Everything you need to automate</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From simple integrations to complex multi-step workflows, FlowForge has you covered.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="card card-hover">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary mb-4">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                    </svg>
                  </div>
                  <h3 className="heading-sm mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="section bg-card">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="heading-lg">Build in minutes, not days</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Three simple steps to automate any process.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  step: '01',
                  title: 'Connect your trigger',
                  description: 'Choose from webhooks, cron schedules, manual triggers, or custom events to start your workflow.',
                },
                {
                  step: '02',
                  title: 'Build your workflow',
                  description: 'Drag and drop nodes, connect them visually, and configure each step with our intuitive editor.',
                },
                {
                  step: '03',
                  title: 'Deploy & monitor',
                  description: 'Publish your workflow and watch it run in real-time. Get alerts when something needs attention.',
                },
              ].map((item) => (
                <div key={item.step} className="relative">
                  <div className="text-6xl font-bold text-primary/10 mb-4">{item.step}</div>
                  <h3 className="heading-sm mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="section">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="heading-lg">Loved by developers</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                See what teams are building with FlowForge.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((testimonial) => (
                <div key={testimonial.name} className="card card-hover">
                  <div className="mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="inline-block h-5 w-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="avatar">{testimonial.avatar}</div>
                    <div>
                      <div className="font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section bg-card">
          <div className="container">
            <div className="relative overflow-hidden rounded-2xl gradient-primary p-12 sm:p-16 lg:p-20 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-balance">
                  Ready to automate your workflows?
                </h2>
                <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
                  Join thousands of developers who trust FlowForge to power their automation.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/register"
                    className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    href="/pricing"
                    className="border border-white/30 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

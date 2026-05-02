import Link from 'next/link';
import { cn } from '../../lib/utils';

interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

interface MarketingNavProps {
  className?: string;
}

export function MarketingNav({ className }: MarketingNavProps) {
  const navLinks: NavLink[] = [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Docs', href: '/docs' },
  ];

  return (
    <nav className={cn('flex items-center gap-1', className)}>
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

interface MarketingHeaderProps {
  className?: string;
}

export function MarketingHeader({ className }: MarketingHeaderProps) {
  return (
    <header className={cn('sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl', className)}>
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-2 mr-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <span className="text-lg font-bold">FlowForge</span>
        </Link>

        <MarketingNav className="hidden md:flex" />

        <div className="ml-auto flex items-center gap-4">
          <Link href="/login" className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary btn-sm">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

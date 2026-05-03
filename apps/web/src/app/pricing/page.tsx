'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarketingHeader } from '../../components/layout/marketing-header';
import { MarketingFooter } from '../../components/layout/marketing-footer';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  limitations: string[];
  cta: string;
  ctaHref: string;
  popular: boolean;
  highlight?: string;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For personal projects and experimentation',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      '1 workspace',
      '5 workflows',
      '100 executions/month',
      'Basic node types (HTTP, Email, Condition)',
      'Community support',
      '7-day execution log retention',
      'Standard API access',
    ],
    limitations: [
      'No custom domains',
      'No team collaboration',
      'No priority support',
    ],
    cta: 'Get Started',
    ctaHref: '/register',
    popular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small teams building production workflows',
    monthlyPrice: 999,
    annualPrice: 799,
    features: [
      '3 workspaces',
      '50 workflows',
      '10,000 executions/month',
      'All node types included',
      'Webhook triggers',
      'Cron scheduling',
      'Real-time execution monitoring',
      'Email support (24h response)',
      '14-day free trial',
      'API access with rate limits',
    ],
    limitations: [],
    cta: 'Start Free Trial',
    ctaHref: '/register?plan=starter',
    popular: true,
    highlight: 'Most popular for growing teams',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For teams that need scale and advanced features',
    monthlyPrice: 4999,
    annualPrice: 3999,
    features: [
      'Unlimited workspaces',
      'Unlimited workflows',
      '100,000 executions/month',
      'All node types + custom nodes',
      'Team collaboration (up to 10 members)',
      'Custom domains for webhooks',
      'Secrets management (encrypted)',
      'Full audit logs',
      'Priority support (4h response)',
      '99.9% uptime SLA',
      'Advanced analytics dashboard',
      'Webhook signature verification',
    ],
    limitations: [],
    cta: 'Start Free Trial',
    ctaHref: '/register?plan=pro',
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For organizations with custom requirements',
    monthlyPrice: -1,
    annualPrice: -1,
    features: [
      'Unlimited everything',
      'Unlimited team members',
      'Custom execution limits',
      'SSO / SAML authentication',
      'Dedicated infrastructure',
      'Custom node development',
      'On-premise deployment option',
      '24/7 phone & email support',
      'Dedicated account manager',
      'Custom SLA (up to 99.99%)',
      'SOC 2 compliance support',
      'Custom integrations',
    ],
    limitations: [],
    cta: 'Contact Sales',
    ctaHref: 'mailto:sales@flowforge.dev',
    popular: false,
  },
];

const faqs = [
  {
    question: 'What counts as an execution?',
    answer: 'An execution is a single run of a workflow from start to finish. If a workflow has 5 nodes and runs once, that counts as 1 execution. Each node within a workflow is tracked separately in your logs but does not count as additional executions toward your monthly limit.',
  },
  {
    question: 'What happens when I exceed my execution limit?',
    answer: 'When you reach 80% of your monthly execution limit, you will receive an email notification. If you exceed 100%, your workflows will be paused until the next billing cycle or until you upgrade your plan. We will never charge you overage fees without prior consent.',
  },
  {
    question: 'Can I change my plan at any time?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect immediately with prorated billing for the remainder of your cycle. Downgrades take effect at the end of your current billing cycle, so you retain access to all features until then.',
  },
  {
    question: 'Do you offer a free trial for paid plans?',
    answer: 'Yes, all paid plans come with a 14-day free trial. No credit card or payment information is required to start your trial. You will only be charged if you choose to continue after the trial period ends.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit/debit cards (Visa, Mastercard, Amex), UPI, net banking, and all Razorpay-supported payment methods including wallets and EMI options. For Enterprise plans, we also support invoicing with NET-30 payment terms.',
  },
  {
    question: 'Is there a discount for annual billing?',
    answer: 'Yes, annual billing saves you 20% compared to monthly billing. For example, the Starter plan is ₹999/month billed monthly, or ₹799/month (₹9,588/year) billed annually. Contact us for Enterprise annual pricing.',
  },
  {
    question: 'Do you offer discounts for startups or nonprofits?',
    answer: 'Yes, we offer 50% off for the first year for verified startups (less than 2 years old, under $1M in funding) and registered nonprofits. Contact our sales team with proof of eligibility to apply.',
  },
  {
    question: 'How does Razorpay integration work?',
    answer: 'Payments are processed securely through Razorpay. When you subscribe to a plan, you will be redirected to Razorpay\'s secure checkout where you can choose your preferred payment method. All transactions are encrypted and PCI-DSS compliant.',
  },
];

function PriceDisplay({ plan, annual }: { plan: Plan; annual: boolean }) {
  if (plan.monthlyPrice === -1) {
    return (
      <div className="flex items-baseline">
        <span className="text-4xl font-bold">Custom</span>
      </div>
    );
  }

  const price = annual ? plan.annualPrice : plan.monthlyPrice;

  return (
    <div className="flex items-baseline">
      <span className="text-lg text-muted-foreground mr-1">₹</span>
      <span className="text-5xl font-bold tracking-tight">{price.toLocaleString('en-IN')}</span>
      <span className="text-muted-foreground ml-2">/{annual ? 'mo, billed annually' : 'month'}</span>
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free' || planId === 'enterprise') return;

    setProcessingPlan(planId);

    // Razorpay integration placeholder
    // Replace this with your actual Razorpay checkout flow
    try {
      // TODO: Create order on your backend
      // const response = await fetch('/api/create-order', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ planId, billingCycle: annual ? 'annual' : 'monthly' }),
      // });
      // const order = await response.json();

      // const options = {
      //   key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      //   amount: order.amount,
      //   currency: 'INR',
      //   name: 'FlowForge',
      //   description: `Plan - ${annual ? 'Annual' : 'Monthly'} Subscription`,
      //   order_id: order.id,
      //   handler: async (response: Record<string, string>) => {
      //     await fetch('/api/verify-payment', {
      //       method: 'POST',
      //       headers: { 'Content-Type': 'application/json' },
      //       body: JSON.stringify({
      //         razorpay_payment_id: response.razorpay_payment_id,
      //         razorpay_order_id: response.razorpay_order_id,
      //         razorpay_signature: response.razorpay_signature,
      //         planId,
      //       }),
      //     });
      //     window.location.href = '/dashboard';
      //   },
      //   prefill: {
      //     name: '',
      //     email: '',
      //   },
      //   theme: { color: '#2563eb' },
      // };

      // const razorpay = new (window as Record<string, unknown>).Razorpay(options);
      // razorpay.open();

      // Subscription handling would go here
    } catch {
      // Payment failed — handle gracefully
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* Header */}
        <section className="container py-16 sm:py-24 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-sm mb-6">
              <span className="text-primary font-medium">Save 20%</span>
              <span className="text-muted-foreground ml-1">with annual billing</span>
            </div>

            <h1 className="heading-xl">Simple, transparent pricing</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. All plans include core workflow features with no hidden fees or surprise charges.
            </p>
          </div>

          {/* Toggle */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!annual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                annual ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  annual ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual <span className="text-success font-semibold">(-20%)</span>
            </span>
          </div>
        </section>

        {/* Plans */}
        <section className="container pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-300 ${
                  plan.popular
                    ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20 scale-[1.02]'
                    : 'border-border hover:border-border/80'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="gradient-primary text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <PriceDisplay plan={plan} annual={annual} />
                  {plan.monthlyPrice > 0 && annual && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Billed ₹{(plan.annualPrice * 12).toLocaleString('en-IN')} annually
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <svg className="h-5 w-5 text-success flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.limitations.length > 0 && (
                  <div className="mb-6 pt-6 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Not included
                    </p>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation) => (
                        <li key={limitation} className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-xs text-muted-foreground">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {plan.id === 'free' || plan.id === 'enterprise' ? (
                  <Link
                    href={plan.ctaHref}
                    className={`block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                      plan.popular
                        ? 'gradient-primary text-white hover:opacity-90'
                        : 'bg-secondary text-secondary-foreground hover:bg-muted border border-border'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={processingPlan === plan.id}
                    className={`w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                      plan.popular
                        ? 'gradient-primary text-white hover:opacity-90 shadow-sm hover:shadow-md'
                        : 'bg-secondary text-secondary-foreground hover:bg-muted border border-border'
                    } ${processingPlan === plan.id ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {processingPlan === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      plan.cta
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Feature Comparison */}
        <section className="bg-card border-y border-border py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="heading-lg">Compare all features</h2>
              <p className="mt-2 text-muted-foreground">A detailed breakdown of what each plan includes.</p>
            </div>

            <div className="overflow-x-auto max-w-5xl mx-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 px-4 text-left font-semibold text-foreground">Feature</th>
                    <th className="py-4 px-4 text-center font-semibold">Free</th>
                    <th className="py-4 px-4 text-center font-semibold text-primary">Starter</th>
                    <th className="py-4 px-4 text-center font-semibold">Pro</th>
                    <th className="py-4 px-4 text-center font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Workspaces', free: '1', starter: '3', pro: 'Unlimited', enterprise: 'Unlimited' },
                    { feature: 'Workflows', free: '5', starter: '50', pro: 'Unlimited', enterprise: 'Unlimited' },
                    { feature: 'Executions/month', free: '100', starter: '10,000', pro: '100,000', enterprise: 'Custom' },
                    { feature: 'Node types', free: 'Basic', starter: 'All', pro: 'All + Custom', enterprise: 'All + Custom' },
                    { feature: 'Team members', free: '1', starter: '1', pro: 'Up to 10', enterprise: 'Unlimited' },
                    { feature: 'Webhook triggers', free: false, starter: true, pro: true, enterprise: true },
                    { feature: 'Cron scheduling', free: false, starter: true, pro: true, enterprise: true },
                    { feature: 'Real-time monitoring', free: true, starter: true, pro: true, enterprise: true },
                    { feature: 'Secrets management', free: false, starter: false, pro: true, enterprise: true },
                    { feature: 'Audit logs', free: false, starter: false, pro: true, enterprise: true },
                    { feature: 'Custom domains', free: false, starter: false, pro: true, enterprise: true },
                    { feature: 'SSO / SAML', free: false, starter: false, pro: false, enterprise: true },
                    { feature: 'Log retention', free: '7 days', starter: '30 days', pro: '90 days', enterprise: 'Unlimited' },
                    { feature: 'API rate limit', free: '100/min', starter: '1,000/min', pro: '10,000/min', enterprise: 'Custom' },
                    { feature: 'Support', free: 'Community', starter: 'Email (24h)', pro: 'Priority (4h)', enterprise: '24/7 Phone' },
                    { feature: 'SLA', free: '—', starter: '—', pro: '99.9%', enterprise: 'Up to 99.99%' },
                  ].map((row, i) => (
                    <tr key={row.feature} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                      <td className="py-3 px-4 font-medium text-foreground">{row.feature}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{typeof row.free === 'boolean' ? (row.free ? 'Yes' : '—') : row.free}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{typeof row.starter === 'boolean' ? (row.starter ? 'Yes' : '—') : row.starter}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{typeof row.pro === 'boolean' ? (row.pro ? 'Yes' : '—') : row.pro}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{typeof row.enterprise === 'boolean' ? (row.enterprise ? 'Yes' : '—') : row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="heading-lg">Frequently asked questions</h2>
              <p className="mt-2 text-muted-foreground">Everything you need to know about FlowForge pricing.</p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <details key={faq.question} className="group border border-border rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between cursor-pointer p-6 font-medium text-foreground hover:bg-muted/50 transition-colors list-none">
                    {faq.question}
                    <svg className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="container">
            <div className="relative overflow-hidden rounded-2xl gradient-primary p-12 sm:p-16 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold text-white">
                  Start building for free today
                </h2>
                <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
                  No credit card required. Get 100 free executions every month, forever.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/register"
                    className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    href="/docs"
                    className="border border-white/30 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                  >
                    Read the Docs
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

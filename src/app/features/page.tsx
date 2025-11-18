'use client'

import Link from 'next/link'
import { CheckCircle2, ArrowRight, Zap, Shield, Brain, Users, Mail, BarChart3, Lock, GitBranch, Clock, FileText } from 'lucide-react'

export default function FeaturesPage() {
  const features = [
    {
      icon: GitBranch,
      title: 'Automated Workflows',
      description: 'Create customizable offboarding workflows with task automation, department routing, and deadline tracking.',
      benefits: ['Task templates', 'Auto-assignments', 'Progress tracking', 'Deadline reminders']
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Coordinate across departments with role-based access, real-time updates, and centralized communication.',
      benefits: ['Role-based permissions', 'Department routing', 'Team notifications', 'Activity logs']
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Leverage artificial intelligence to analyze exit patterns, predict churn risks, and get actionable recommendations.',
      benefits: ['Exit pattern analysis', 'Churn prediction', 'Sentiment analysis', 'Smart recommendations'],
      premium: true
    },
    {
      icon: Shield,
      title: 'Security Scanner',
      description: 'Automatically detect and revoke access to connected apps, ensuring complete account deactivation.',
      benefits: ['OAuth app detection', 'Bulk revocation', 'Access audit logs', 'Compliance reports'],
      premium: true
    },
    {
      icon: Mail,
      title: 'Exit Surveys',
      description: 'Collect confidential feedback with automated survey invitations and AI-powered analysis.',
      benefits: ['Customizable surveys', 'Anonymous responses', 'AI sentiment analysis', 'Trend reporting'],
      premium: true
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Track offboarding metrics, completion rates, and team performance with real-time insights.',
      benefits: ['Completion metrics', 'Time tracking', 'Department performance', 'Custom reports']
    },
    {
      icon: Lock,
      title: 'Enterprise Security',
      description: 'Bank-level encryption, SOC 2 compliance, and advanced security features for enterprise customers.',
      benefits: ['End-to-end encryption', 'SSO/SAML (coming)', 'Audit logs', 'Data residency'],
      premium: true
    },
    {
      icon: Zap,
      title: 'API Access',
      description: 'Integrate OffboardPro with your existing tools using our comprehensive REST API.',
      benefits: ['RESTful API', 'Webhooks', 'API documentation', 'Rate limiting'],
      premium: true
    },
    {
      icon: Clock,
      title: 'Task Management',
      description: 'Assign, track, and complete offboarding tasks with attachments, notes, and progress updates.',
      benefits: ['Task assignments', 'File attachments', 'Completion notes', 'Due date tracking']
    },
    {
      icon: FileText,
      title: 'Template Library',
      description: 'Pre-built offboarding templates for different roles and departments, fully customizable.',
      benefits: ['Role-based templates', 'Custom workflows', 'Task libraries', 'Quick setup']
    },
    {
      icon: Mail,
      title: 'Email Notifications',
      description: 'Automated email alerts for task assignments, completions, reminders, and status updates.',
      benefits: ['10 email types', 'Smart reminders', 'Branding options', 'Delivery tracking']
    },
    {
      icon: Users,
      title: 'Multi-Organization',
      description: 'Manage multiple companies or subsidiaries from a single account with organization switching.',
      benefits: ['Unlimited orgs', 'Quick switching', 'Separate data', 'Centralized billing']
    }
  ]

  const plans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for trying out OffboardPro',
      features: [
        '5 team members',
        '3 offboardings/month',
        'Basic workflows',
        'Task management',
        'Email notifications',
        'Template library'
      ],
      cta: 'Start Free',
      ctaLink: '/signup'
    },
    {
      name: 'Starter',
      price: '$79',
      description: 'For small teams getting started',
      originalPrice: '$99',
      features: [
        '25 team members',
        '10 offboardings/month',
        'All Free features',
        'Priority email support',
        'Custom templates',
        'Basic analytics'
      ],
      cta: 'Start Trial',
      ctaLink: '/signup',
      popular: false
    },
    {
      name: 'Professional',
      price: '$149',
      description: 'For growing companies',
      originalPrice: '$199',
      features: [
        '100 team members',
        '50 offboardings/month',
        'All Starter features',
        '🤖 AI-powered insights',
        '🔐 Security scanner',
        '📊 Exit surveys',
        'Advanced analytics',
        'Priority support'
      ],
      cta: 'Start Free Trial',
      ctaLink: '/signup',
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$399',
      description: 'For large organizations',
      originalPrice: '$499',
      features: [
        'Unlimited team members',
        'Unlimited offboardings',
        'All Professional features',
        'API access',
        'Custom workflows',
        'Dedicated support',
        'SSO/SAML (coming)',
        'Custom contracts'
      ],
      cta: 'Contact Sales',
      ctaLink: '/signup',
      popular: false
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
            OffboardPro
          </Link>
          <div className="flex gap-4">
            <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium">
              Login
            </Link>
            <Link href="/signup" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all font-medium">
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
            ⚡ All Features • No Hidden Fees
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            Everything You Need for
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
              Seamless Offboarding
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            From automated workflows to AI-powered insights, OffboardPro gives you all the tools to manage employee departures efficiently and securely.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg hover:shadow-xl transition-all font-semibold text-lg">
              Start 14-Day Free Trial →
            </Link>
            <Link href="/pricing" className="border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-lg hover:border-slate-400 transition-all font-semibold text-lg">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-slate-600">Built for HR teams, IT departments, and security-conscious organizations</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all hover:border-blue-300 relative">
                {feature.premium && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                      PRO
                    </span>
                  </div>
                )}
                <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-slate-600 mb-4">20% off for founding members • No contracts • Cancel anytime</p>
            <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold">
              🎉 First 50 customers get lifetime discount!
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan, index) => (
              <div key={index} className={`bg-white rounded-xl border-2 p-8 ${plan.popular ? 'border-blue-500 shadow-xl scale-105' : 'border-slate-200'} relative`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  {plan.price !== '$0' && <span className="text-slate-600">/month</span>}
                  {plan.originalPrice && (
                    <span className="ml-2 text-lg text-slate-400 line-through">{plan.originalPrice}</span>
                  )}
                </div>
                <p className="text-slate-600 mb-6">{plan.description}</p>
                <Link href={plan.ctaLink} className={`block text-center py-3 rounded-lg font-semibold mb-6 ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg' : 'border-2 border-slate-300 text-slate-700 hover:border-slate-400'} transition-all`}>
                  {plan.cta}
                </Link>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join companies automating their offboarding process. Start your 14-day free trial today.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg hover:shadow-2xl transition-all font-bold text-lg">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-blue-100 mt-4">No credit card required • Full access to Professional features</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto text-center text-slate-600">
          <p className="mb-4">© 2024 OffboardPro. All rights reserved.</p>
          <div className="flex gap-6 justify-center text-sm">
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/cookies" className="hover:text-slate-900">Cookies</Link>
            <Link href="/dashboard/help" className="hover:text-slate-900">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  )
                  }

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { initializePaddle, Paddle } from '@paddle/paddle-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2, Sparkles, Shield, Users as UsersIcon } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function PricingContent() {
  const [paddle, setPaddle] = useState<Paddle | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Initialize Paddle
    initializePaddle({
      environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'production' | 'sandbox',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    }).then((paddleInstance) => {
      if (paddleInstance) {
        setPaddle(paddleInstance)
      }
    })

    // Check if user is logged in
    checkUser()

    // Check for subscription success/cancel
    const status = searchParams?.get('subscription')
    if (status === 'success') {
      // Show success message
      alert('🎉 Subscription activated! Redirecting to dashboard...')
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  async function handleCheckout(priceId: string, planName: string) {
    if (!paddle) {
      alert('Payment system is loading, please try again in a moment.')
      return
    }

    // Check if user is logged in
    if (!currentUser) {
      // Redirect to signup with return URL
      router.push(`/signup?redirect=/pricing&plan=${planName}`)
      return
    }

    setLoading(priceId)

    try {
      // Open Paddle checkout
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: {
          email: currentUser.email,
        },
        customData: {
          userId: currentUser.id,
          planName: planName,
        },
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'en',
          successUrl: `${window.location.origin}/pricing?subscription=success`,
        },
      })
    } catch (error: any) {
      console.error('Checkout error:', error)
      alert('Failed to open checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const plans = [
    {
      name: 'Starter',
      price: '$79',
      originalPrice: '$99',
      priceId: process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID!,
      description: 'Perfect for growing teams',
      badge: '20% OFF - Founding Member',
      badgeColor: 'bg-blue-100 text-blue-700',
      features: [
        'Unlimited offboardings',
        'Up to 25 employees',
        'Basic templates',
        'Email notifications',
        'Team collaboration',
        'Security scanner',
        'Task management',
        '14-day free trial',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Professional',
      price: '$149',
      originalPrice: '$199',
      priceId: process.env.NEXT_PUBLIC_PADDLE_PROFESSIONAL_PRICE_ID!,
      description: 'Most popular for mid-size teams',
      badge: '25% OFF - Founding Member',
      badgeColor: 'bg-purple-100 text-purple-700',
      features: [
        'Everything in Starter',
        'Up to 100 employees',
        'AI-powered exit surveys',
        'Churn pattern detection',
        'Custom templates',
        'Exit interviews',
        'Priority support',
        'Analytics dashboard',
        '14-day free trial',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$399',
      originalPrice: '$499',
      priceId: process.env.NEXT_PUBLIC_PADDLE_ENTERPRISE_PRICE_ID!,
      description: 'For large organizations',
      badge: '20% OFF - Founding Member',
      badgeColor: 'bg-green-100 text-green-700',
      features: [
        'Everything in Professional',
        'Unlimited employees',
        'White-label branding',
        'Dedicated account manager',
        'Custom integrations',
        'SSO/SAML',
        'SLA guarantee',
        'Advanced security',
        '14-day free trial',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">OffboardPro</span>
          </Link>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <Button onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Log In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full mb-6">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">LIMITED TIME: Founding Member Pricing - First 50 Customers Only!</span>
        </div>
        
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          70% cheaper than Rippling. 10x smarter than BambooHR. Flat-fee pricing, no surprises.
        </p>

        <div className="flex items-center justify-center gap-8 text-sm text-gray-600 mb-12">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span>14-day free trial</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? 'border-2 border-purple-500 shadow-2xl scale-105'
                  : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    ⭐ MOST POPULAR
                  </span>
                </div>
              )}

              <CardHeader>
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
                
                <div className="mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-lg text-gray-400 line-through">{plan.originalPrice}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Billed monthly</p>
                </div>
              </CardHeader>

              <CardContent>
                <Button
                  className={`w-full mb-6 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                      : ''
                  }`}
                  onClick={() => handleCheckout(plan.priceId, plan.name)}
                  disabled={loading === plan.priceId}
                >
                  {loading === plan.priceId ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Opening checkout...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens after the free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  After your 14-day free trial, you'll be charged based on your selected plan. You can cancel anytime during the trial with no charges.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is the Founding Member discount permanent?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes! The first 50 customers lock in their discounted rate for life. The price will never increase for founding members.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans later?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Absolutely! You can upgrade or downgrade your plan anytime from your dashboard settings.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers through our secure payment partner Paddle.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to automate your offboarding?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join forward-thinking companies using OffboardPro to save time and reduce security risks.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <p>© 2025 OffboardPro. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/terms" className="hover:text-blue-600">Terms</Link>
              <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
              <Link href="/cookies" className="hover:text-blue-600">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Wrap in Suspense for useSearchParams
export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}

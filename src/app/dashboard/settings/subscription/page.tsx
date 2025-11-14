'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { initializePaddle, Paddle } from '@paddle/paddle-js'

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [paddle, setPaddle] = useState<Paddle | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
    
    // Initialize Paddle
    initializePaddle({
      environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'production' | 'sandbox',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    }).then((paddleInstance) => {
      if (paddleInstance) {
        setPaddle(paddleInstance)
      }
    })
  }, [])

  async function loadUserData() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) return

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(userData)
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCustomerPortal() {
    if (!paddle || !user?.paddle_subscription_id) {
      alert('Unable to open customer portal')
      return
    }

    // Open Paddle customer portal
    window.open(
      `https://customer-portal.paddle.com/${user.paddle_subscription_id}`,
      '_blank'
    )
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'trialing':
        return <Badge className="bg-blue-500">Trial</Badge>
      case 'canceled':
        return <Badge className="bg-red-500">Canceled</Badge>
      case 'past_due':
        return <Badge className="bg-yellow-500">Past Due</Badge>
      default:
        return <Badge>No Subscription</Badge>
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Subscription & Billing</h1>

      {/* Current Plan Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </CardTitle>
          <CardDescription>Manage your subscription and billing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Plan Info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Plan</p>
                <p className="text-2xl font-bold text-gray-900">
                  {user?.subscription_plan || 'Free Trial'}
                </p>
              </div>
              <div>
                {getStatusBadge(user?.subscription_status || 'none')}
              </div>
            </div>

            {/* Subscription Details */}
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600 mb-1">Started</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium">
                    {formatDate(user?.subscription_start_date)}
                  </p>
                </div>
              </div>

              {user?.trial_ends_at && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Trial Ends</p>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <p className="text-sm font-medium">
                      {formatDate(user.trial_ends_at)}
                    </p>
                  </div>
                </div>
              )}

              {user?.subscription_canceled_at && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Canceled On</p>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm font-medium">
                      {formatDate(user.subscription_canceled_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t space-y-3">
              {user?.paddle_subscription_id ? (
                <>
                  <Button onClick={openCustomerPortal} className="w-full">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                  <p className="text-sm text-gray-500 text-center">
                    Update payment method, billing info, or cancel subscription
                  </p>
                </>
              ) : (
                <Button
                  onClick={() => (window.location.href = '/pricing')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Upgrade to Paid Plan
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>What's Included</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Unlimited offboardings</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">AI-powered insights</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Security scanner</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Priority support</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

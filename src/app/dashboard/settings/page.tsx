'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Mail, User, Building, Save, LogOut, CreditCard, CheckCircle, X, Sparkles } from 'lucide-react'
import { trackUpgradeClicked } from '@/lib/analytics'

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
  })

  useEffect(() => {
    loadUser()
  }, [])

  async function loadUser() {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      router.push('/login')
      return
    }

    // Get full user data including subscription info
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    setUser(userData || authUser)
    setFormData({
      name: userData?.name || authUser.user_metadata?.name || '',
      email: authUser.email || '',
      organization: authUser.user_metadata?.organization_name || '',
    })
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          organization_name: formData.organization,
        }
      })

      if (authError) throw authError

      // Also update users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ name: formData.name })
        .eq('id', user.id)

      if (dbError) {
        console.error('Error updating users table:', dbError)
      }

      toast({
        title: 'Success!',
        description: 'Settings updated successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Get plan display name
  const planName = user?.subscription_plan 
    ? user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1)
    : 'Free Trial'

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={formData.email}
                disabled
                className="bg-slate-50 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="Company Name"
              />
            </div>

            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Billing & Subscription */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Billing & Subscription
            </CardTitle>
            <CardDescription>Manage your subscription and payment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Plan Display */}
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-blue-200">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900">Current Plan</p>
                  <Badge className={
                    user?.subscription_plan === 'enterprise' 
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : user?.subscription_plan === 'professional'
                      ? 'bg-purple-100 text-purple-700 border-purple-300'
                      : 'bg-blue-100 text-blue-700 border-blue-300'
                  }>
                    {planName}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">
                  {user?.subscription_status === 'trialing' 
                    ? '🎉 You\'re on a free trial!' 
                    : user?.subscription_status === 'active'
                    ? '✅ Subscription active'
                    : '💡 Start your free trial today'}
                </p>
                
                {/* Trial Status */}
                {user?.subscription_status === 'trialing' && user?.trial_ends_at && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⏰ Trial ends: {new Date(user.trial_ends_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              <Button 
                onClick={() => {
                  trackUpgradeClicked('settings_page')
                  router.push('/pricing')
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {user?.subscription_status ? 'Manage Billing' : 'View Plans'}
              </Button>
            </div>

            {/* Plan Features Summary */}
            <div className="bg-white rounded-lg border p-4">
              <p className="font-medium text-slate-900 mb-3">Your Plan Includes:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {user?.subscription_plan === 'enterprise' ? (
                  <>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>Unlimited Team Members</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>Unlimited Offboardings</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>AI Insights</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>Security Scanner</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>API Access</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>Priority Support</span>
                    </div>
                  </>
                ) : user?.subscription_plan === 'professional' ? (
                  <>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>Up to 100 Team Members</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>50 Offboardings/month</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>AI Insights</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>Security Scanner</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <X className="w-4 h-4" />
                      <span>API Access</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <X className="w-4 h-4" />
                      <span>Priority Support</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>Up to 25 Team Members</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>10 Offboardings/month</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <X className="w-4 h-4" />
                      <span>AI Insights</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <X className="w-4 h-4" />
                      <span>Security Scanner</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <X className="w-4 h-4" />
                      <span>API Access</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <X className="w-4 h-4" />
                      <span>Priority Support</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Special Offer Banner */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-purple-900">
                    🎉 Founding Member Offer!
                  </p>
                  <p className="text-purple-700">
                    First 50 customers get <strong>25% off for life</strong>
                  </p>
                  <p className="text-purple-600 text-xs">
                    💰 Save $600/year • ✨ 14-day free trial
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
            <CardDescription>Configure organization-wide settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4"
              onClick={() => router.push('/dashboard/settings/department-emails')}
            >
              <Mail className="w-5 h-5 mr-3 flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium">Department Emails</p>
                <p className="text-sm text-slate-500">Configure notification emails for each department</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4 opacity-50 cursor-not-allowed"
              disabled
            >
              <User className="w-5 h-5 mr-3 flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium">User Management</p>
                <p className="text-sm text-slate-500">Invite team members and assign roles (Coming Soon)</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start h-auto py-4 opacity-50 cursor-not-allowed"
              disabled
            >
              <Building className="w-5 h-5 mr-3 flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium">Organization Details</p>
                <p className="text-sm text-slate-500">Update company name and information (Coming Soon)</p>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>View your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm font-medium text-slate-600">User ID</span>
              <span className="text-sm text-slate-900 font-mono">{user?.id?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm font-medium text-slate-600">Account Created</span>
              <span className="text-sm text-slate-900">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-slate-600">Last Sign In</span>
              <span className="text-sm text-slate-900">
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Sign out of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
                }

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Mail, User, Building, Save, LogOut, CreditCard } from 'lucide-react' // ✅ ADD CreditCard

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
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }
    
    setUser(user)
    setFormData({
      name: user.user_metadata?.name || '',
      email: user.email || '',
      organization: user.user_metadata?.organization_name || '',
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
        // Don't throw - auth update was successful
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

        {/* ✅ NEW: Billing & Subscription */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Billing & Subscription
            </CardTitle>
            <CardDescription>Manage your subscription and payment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
              <div>
                <p className="font-medium text-slate-900">Current Plan</p>
                <p className="text-sm text-slate-500">Free Trial or No Active Subscription</p>
              </div>
              <Button 
                onClick={() => router.push('/pricing')}
                className="gap-2"
              >
                <CreditCard className="w-4 h-4" />
                View Plans & Pricing
              </Button>
            </div>

            <div className="text-sm text-slate-600 space-y-2">
              <p>🎉 <strong>Special Offer:</strong> First 50 customers get 25% off for life!</p>
              <p>💰 Plans starting at $79/month</p>
              <p>✨ 14-day free trial, no credit card required</p>
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
                {new Date(user?.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-slate-600">Last Sign In</span>
              <span className="text-sm text-slate-900">
                {new Date(user?.last_sign_in_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone - WITH LOGOUT */}
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

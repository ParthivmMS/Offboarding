'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Users, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function SetupOrganizationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [orgName, setOrgName] = useState('')

  useEffect(() => {
    // Pre-fill org name from URL if available
    const orgNameFromUrl = searchParams.get('orgName')
    if (orgNameFromUrl) {
      setOrgName(decodeURIComponent(orgNameFromUrl))
    }

    // Check if user is authenticated and needs org setup
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if they already have an org
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, current_organization_id')
        .eq('id', user.id)
        .single()

      if (userData?.organization_id || userData?.current_organization_id) {
        // Already has org, go to dashboard
        router.push('/dashboard')
        return
      }

      setChecking(false)
    }

    checkUser()
  }, [router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orgName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your company name',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Call API to create organization
      const response = await fetch('/api/organization/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: orgName,
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization')
      }

      toast({
        title: '🎉 Success!',
        description: 'Your organization has been created. Welcome to OffboardPro!',
      })

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } catch (error: any) {
      console.error('Org creation error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create organization',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl">OffboardPro</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Complete Your Setup</h1>
          <p className="text-slate-600 mt-2">Create your organization to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organization Setup</CardTitle>
            <CardDescription>Tell us about your company</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Company Name</Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="Acme Inc."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-sm text-slate-500">
                  This will be visible to your team members
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Organization...
                  </>
                ) : (
                  'Create Organization & Continue'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SetupOrganizationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <SetupOrganizationContent />
    </Suspense>
  )
}

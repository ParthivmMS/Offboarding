'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SetupOrganizationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    // Check if user is authenticated
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
        .select('organization_id, name')
        .eq('id', user.id)
        .single()

      if (userData?.organization_id) {
        // Already has org, go to dashboard
        router.push('/dashboard')
        return
      }

      // Pre-fill user name
      if (userData?.name) {
        setUserName(userData.name)
      }
    }

    checkUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create organization')
      }

      toast({
        title: 'Success!',
        description: 'Organization created successfully',
      })

      router.push('/dashboard')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
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
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create Organization'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

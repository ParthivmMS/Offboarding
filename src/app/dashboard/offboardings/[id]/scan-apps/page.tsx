'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Shield, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const COMMON_APPS = [
  { name: 'Google Workspace', type: 'productivity', icon: '📧', risk: 'high' },
  { name: 'Microsoft 365', type: 'productivity', icon: '📊', risk: 'high' },
  { name: 'Slack', type: 'communication', icon: '💬', risk: 'high' },
  { name: 'GitHub', type: 'development', icon: '🐙', risk: 'critical' },
  { name: 'GitLab', type: 'development', icon: '🦊', risk: 'critical' },
  { name: 'Jira', type: 'project_management', icon: '📋', risk: 'medium' },
  { name: 'Confluence', type: 'documentation', icon: '📚', risk: 'medium' },
  { name: 'Notion', type: 'productivity', icon: '📝', risk: 'medium' },
  { name: 'Trello', type: 'project_management', icon: '📌', risk: 'low' },
  { name: 'Asana', type: 'project_management', icon: '✓', risk: 'low' },
  { name: 'Zoom', type: 'communication', icon: '🎥', risk: 'low' },
  { name: 'Dropbox', type: 'storage', icon: '📦', risk: 'high' },
  { name: 'Google Drive', type: 'storage', icon: '☁️', risk: 'high' },
  { name: 'OneDrive', type: 'storage', icon: '☁️', risk: 'high' },
  { name: 'AWS Console', type: 'infrastructure', icon: '🔧', risk: 'critical' },
  { name: 'Azure Portal', type: 'infrastructure', icon: '🔧', risk: 'critical' },
  { name: 'Salesforce', type: 'crm', icon: '💼', risk: 'high' },
  { name: 'HubSpot', type: 'crm', icon: '🎯', risk: 'medium' },
  { name: 'Figma', type: 'design', icon: '🎨', risk: 'low' },
  { name: 'Adobe Creative Cloud', type: 'design', icon: '🎨', risk: 'low' },
]

export default function ScanAppsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [offboarding, setOffboarding] = useState<any>(null)
  const [selectedApps, setSelectedApps] = useState<string[]>([])

  useEffect(() => {
    loadOffboarding()
  }, [params.id])

  async function loadOffboarding() {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('offboardings')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setOffboarding(data)
    } catch (error: any) {
      console.error('Failed to load offboarding:', error)
      toast({
        title: 'Error',
        description: 'Failed to load offboarding details',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleScan() {
    if (selectedApps.length === 0) {
      toast({
        title: 'No Apps Selected',
        description: 'Please select at least one app to scan',
        variant: 'destructive',
      })
      return
    }

    setScanning(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Get user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', user?.id)
        .single()

      // Create scan record
      const { data: scanData, error: scanError } = await supabase
        .from('oauth_scans')
        .insert({
          offboarding_id: params.id,
          organization_id: userData?.current_organization_id,
          employee_email: offboarding.employee_email,
          scan_type: 'manual',
          status: 'completed',
          total_apps_found: selectedApps.length,
          initiated_by: user?.id,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (scanError) throw scanError

      // Create OAuth connection records for each selected app
      const connections = selectedApps.map(appName => {
        const app = COMMON_APPS.find(a => a.name === appName)
        return {
          offboarding_id: params.id,
          organization_id: userData?.current_organization_id,
          employee_email: offboarding.employee_email,
          app_name: appName,
          app_type: app?.type || 'other',
          status: 'active',
          metadata: { risk_level: app?.risk, icon: app?.icon },
        }
      })

      const { error: connectionsError } = await supabase
        .from('oauth_connections')
        .insert(connections)

      if (connectionsError) throw connectionsError

      toast({
        title: '✅ Scan Complete',
        description: `Found ${selectedApps.length} apps that need revocation`,
      })

      // Redirect to security dashboard
      router.push('/dashboard/security')

    } catch (error: any) {
      console.error('Scan error:', error)
      toast({
        title: 'Scan Failed',
        description: error.message || 'Failed to complete security scan',
        variant: 'destructive',
      })
    } finally {
      setScanning(false)
    }
  }

  function toggleApp(appName: string) {
    setSelectedApps(prev => 
      prev.includes(appName) 
        ? prev.filter(a => a !== appName)
        : [...prev, appName]
    )
  }

  const riskColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/offboardings/${params.id}`)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-red-600" />
            Security Scan
          </h1>
          <p className="text-slate-600 mt-1">
            Scan OAuth access for {offboarding?.employee_name}
          </p>
        </div>
      </div>

      {/* Warning Alert */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 mt-1" />
            <div>
              <h3 className="font-semibold text-orange-900 mb-1">
                Security Risk Assessment
              </h3>
              <p className="text-orange-700 text-sm">
                Select all apps that {offboarding?.employee_name} has access to. 
                We'll help you revoke access to prevent security breaches.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apps Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Common SaaS Applications</CardTitle>
          <CardDescription>
            Select all apps the employee has OAuth access to ({selectedApps.length} selected)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {COMMON_APPS.map((app) => {
              const isSelected = selectedApps.includes(app.name)
              return (
                <div
                  key={app.name}
                  onClick={() => toggleApp(app.name)}
                  className={`
                    flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition
                    ${isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-slate-300 hover:bg-slate-50'}
                  `}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleApp(app.name)}
                  />
                  <div className="text-2xl">{app.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{app.name}</div>
                    <div className="text-xs text-slate-500">{app.type.replace('_', ' ')}</div>
                  </div>
                  <Badge className={riskColors[app.risk as keyof typeof riskColors]}>
                    {app.risk}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/offboardings/${params.id}`)}
        >
          Cancel
        </Button>
        <Button
          onClick={handleScan}
          disabled={scanning || selectedApps.length === 0}
          className="bg-red-600 hover:bg-red-700"
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Complete Scan ({selectedApps.length} apps)
            </>
          )}
        </Button>
      </div>
    </div>
  )
                }

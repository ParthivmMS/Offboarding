'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import FeatureGate from '@/components/FeatureGate'
import { trackSecurityScan } from '@/lib/analytics'

interface OAuthConnection {
  id: string
  app_name: string
  app_type: string
  status: string
  last_used_date: string | null
  scopes: string[]
  employee_email: string
  offboarding_id: string
  revoked_at: string | null
}

interface SecurityStats {
  totalApps: number
  activeConnections: number
  revokedConnections: number
  pendingRevocations: number
  recentScans: number
}

export default function SecurityScannerPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState<OAuthConnection[]>([])
  const [stats, setStats] = useState<SecurityStats>({
    totalApps: 0,
    activeConnections: 0,
    revokedConnections: 0,
    pendingRevocations: 0,
    recentScans: 0,
  })
  const [revokingAll, setRevokingAll] = useState(false)
  const [userPlan, setUserPlan] = useState<string>('starter')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)

  useEffect(() => {
    loadSecurityData()
    loadUserPlan()
  }, [])

  async function loadUserPlan() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('subscription_plan, subscription_status')
        .eq('id', user.id)
        .single()

      if (userData?.subscription_plan) {
        setUserPlan(userData.subscription_plan)
      }

      if (userData?.subscription_status) {
        setSubscriptionStatus(userData.subscription_status)
      }

      // Track page view
      trackSecurityScan()
    } catch (err) {
      console.error('Error loading user plan:', err)
    }
  }

  async function loadSecurityData() {
    try {
      const supabase = createClient()

      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()

      if (!userData?.current_organization_id) return

      // Get all OAuth connections for this org
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('oauth_connections')
        .select('*')
        .eq('organization_id', userData.current_organization_id)
        .order('created_at', { ascending: false })

      if (connectionsError) throw connectionsError

      setConnections(connectionsData || [])

      // Calculate stats
      const totalApps = connectionsData?.length || 0
      const activeConnections = connectionsData?.filter(c => c.status === 'active').length || 0
      const revokedConnections = connectionsData?.filter(c => c.status === 'revoked').length || 0
      const pendingRevocations = connectionsData?.filter(c => c.status === 'pending_revocation').length || 0

      // Get recent scans count (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: scansData } = await supabase
        .from('oauth_scans')
        .select('id')
        .eq('organization_id', userData.current_organization_id)
        .gte('created_at', sevenDaysAgo.toISOString())

      setStats({
        totalApps,
        activeConnections,
        revokedConnections,
        pendingRevocations,
        recentScans: scansData?.length || 0,
      })

    } catch (error: any) {
      console.error('Failed to load security data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load security data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleRevokeAll() {
    if (!confirm('Are you sure you want to revoke ALL active OAuth connections? This cannot be undone.')) {
      return
    }

    setRevokingAll(true)

    try {
      const response = await fetch('/api/security/revoke-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: '✅ Revocation Complete',
          description: `Successfully revoked ${data.revokedCount} connections`,
        })
        loadSecurityData()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke connections',
        variant: 'destructive',
      })
    } finally {
      setRevokingAll(false)
    }
  }

  const statusColors: Record<string, string> = {
    active: 'bg-red-100 text-red-700 border-red-200',
    revoked: 'bg-green-100 text-green-700 border-green-200',
    pending_revocation: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    error: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  const statusIcons: Record<string, any> = {
    active: AlertTriangle,
    revoked: CheckCircle,
    pending_revocation: RefreshCw,
    error: XCircle,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <FeatureGate feature="security" userPlan={userPlan} subscriptionStatus={subscriptionStatus}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              Security Scanner
            </h1>
            <p className="text-slate-600 mt-1">
              Monitor and revoke OAuth access for departing employees
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSecurityData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {stats.activeConnections > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleRevokeAll}
                disabled={revokingAll}
              >
                {revokingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Revoke All Active
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Apps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalApps}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Active Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.activeConnections}</div>
              <p className="text-xs text-slate-500 mt-1">Need revocation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Secured</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.revokedConnections}</div>
              <p className="text-xs text-slate-500 mt-1">Access revoked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Recent Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.recentScans}</div>
              <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Connections Alert */}
        {stats.activeConnections > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">
                    ⚠️ Security Risk Detected
                  </h3>
                  <p className="text-red-700 text-sm">
                    {stats.activeConnections} active OAuth connection{stats.activeConnections > 1 ? 's' : ''} found for departing employees. 
                    These connections pose a security risk and should be revoked immediately.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connections List */}
        <Card>
          <CardHeader>
            <CardTitle>OAuth Connections</CardTitle>
            <CardDescription>
              All detected SaaS application access for departing employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connections.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Connections Found</h3>
                <p className="text-slate-600 mb-4">
                  No OAuth connections have been scanned yet.
                </p>
                <Link href="/dashboard/offboardings">
                  <Button>View Offboardings</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((connection) => {
                  const StatusIcon = statusIcons[connection.status] || Shield
                  
                  return (
                    <div 
                      key={connection.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Shield className="w-6 h-6 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900">{connection.app_name}</h4>
                            <Badge className={statusColors[connection.status]}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {connection.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            {connection.employee_email}
                            {connection.last_used_date && (
                              <span className="text-slate-400 ml-2">
                                • Last used {new Date(connection.last_used_date).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                          {connection.scopes && connection.scopes.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {connection.scopes.slice(0, 3).map((scope, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {scope}
                                </Badge>
                              ))}
                              {connection.scopes.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{connection.scopes.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {connection.status === 'active' && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {/* TODO: Single revoke */}}
                          >
                            Revoke
                          </Button>
                        )}
                        <Link href={`/dashboard/offboardings/${connection.offboarding_id}`}>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  )
}

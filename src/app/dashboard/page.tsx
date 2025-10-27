'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    activeOffboardings: 0,
    completedLast30Days: 0,
    pendingTasks: 0,
    overdueTasks: 0,
  })
  const [recentOffboardings, setRecentOffboardings] = useState<any[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        router.push('/login')
        return
      }

      // Get user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!userData?.organization_id) {
        console.error('No organization found')
        setLoading(false)
        return
      }

      const orgId = userData.organization_id

      // Get active offboardings count
      const { count: activeCount } = await supabase
        .from('offboardings')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'in_progress')

      // Get completed offboardings in last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: completedCount } = await supabase
        .from('offboardings')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString())

      // Get all tasks for the organization
      const { data: allTasks } = await supabase
        .from('tasks')
        .select(`
          *,
          offboardings!inner (
            organization_id
          )
        `)
        .eq('offboardings.organization_id', orgId)

      const today = new Date().toISOString().split('T')[0]
      
      const pendingTasks = allTasks?.filter(t => !t.completed).length || 0
      const overdueTasks = allTasks?.filter(t => !t.completed && t.due_date < today).length || 0

      // Get recent offboardings
      const { data: recentData } = await supabase
        .from('offboardings')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        activeOffboardings: activeCount || 0,
        completedLast30Days: completedCount || 0,
        pendingTasks,
        overdueTasks,
      })

      setRecentOffboardings(recentData || [])
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Main Content - NO HEADER HERE! Layout provides it */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Welcome back! Your offboarding platform is ready.</p>
          </div>
          <Button onClick={() => router.push('/dashboard/offboardings/new')}>
            Start New Offboarding
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Offboardings</CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeOffboardings}</div>
              <p className="text-xs text-slate-500 mt-1">Currently in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed (30d)</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedLast30Days}</div>
              <p className="text-xs text-slate-500 mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Pending Tasks</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTasks}</div>
              <p className="text-xs text-slate-500 mt-1">Assigned to you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
              <p className="text-xs text-slate-500 mt-1">Needs attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Offboardings or Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>
              {recentOffboardings.length > 0 ? 'Recent Offboardings' : 'Quick Actions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOffboardings.length > 0 ? (
              <div className="space-y-4">
                {recentOffboardings.map((offboarding) => (
                  <div 
                    key={offboarding.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/offboardings/${offboarding.id}`)}
                  >
                    <div>
                      <p className="font-medium">{offboarding.employee_name}</p>
                      <p className="text-sm text-slate-500">
                        {offboarding.role} • {offboarding.department}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium capitalize">
                        {offboarding.status.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-500">
                        Last day: {new Date(offboarding.last_working_day).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/dashboard/offboardings')}
                >
                  View All Offboardings
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold mb-2">No offboardings yet</h3>
                <p className="text-slate-500 mb-6">Start your first employee offboarding process</p>
                <Button onClick={() => router.push('/dashboard/offboardings/new')}>
                  Start New Offboarding
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

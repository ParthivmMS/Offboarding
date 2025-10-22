import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id)
    .single()

  // Get dashboard stats
  const { count: activeOffboardings } = await supabase
    .from('offboardings')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', userData?.organization_id)
    .eq('status', 'in_progress')

  const { count: completedOffboardings } = await supabase
    .from('offboardings')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', userData?.organization_id)
    .eq('status', 'completed')
    .gte('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const { count: myPendingTasks } = await supabase
    .from('tasks')
    .select('*, offboardings!inner(organization_id)', { count: 'exact', head: true })
    .eq('assigned_to', user?.id)
    .eq('completed', false)
    .eq('offboardings.organization_id', userData?.organization_id)

  const { count: overdueTasks } = await supabase
    .from('tasks')
    .select('*, offboardings!inner(organization_id)', { count: 'exact', head: true })
    .eq('offboardings.organization_id', userData?.organization_id)
    .eq('completed', false)
    .lt('due_date', new Date().toISOString().split('T')[0])

  // Get recent offboardings
  const { data: recentOffboardings } = await supabase
    .from('offboardings')
    .select('*')
    .eq('organization_id', userData?.organization_id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <Link href="/dashboard/offboardings/new">
          <Button>Start New Offboarding</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Offboardings</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOffboardings || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed (30d)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOffboardings || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myPendingTasks || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueTasks || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Offboardings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Offboardings</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOffboardings && recentOffboardings.length > 0 ? (
            <div className="space-y-4">
              {recentOffboardings.map((offboarding) => (
                <Link
                  key={offboarding.id}
                  href={`/dashboard/offboardings/${offboarding.id}`}
                  className="block p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{offboarding.employee_name}</p>
                      <p className="text-sm text-slate-500">
                        {offboarding.role} • {offboarding.department}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Last day: {new Date(offboarding.last_working_day).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          offboarding.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : offboarding.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {offboarding.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="mb-4">No offboardings yet</p>
              <Link href="/dashboard/offboardings/new">
                <Button>Start Your First Offboarding</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

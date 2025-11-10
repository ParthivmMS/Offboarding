'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentOrganization } from '@/lib/workspace'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import TaskCard from '@/components/dashboard/TaskCard'
import { Clock, CheckCircle, AlertCircle, ListTodo, PartyPopper, AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

export default function TasksPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      const { organization } = await getCurrentOrganization()

      if (!organization) {
        setError('No organization found. Please create or join an organization.')
        setLoading(false)
        return
      }

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          offboardings!inner (
            id,
            employee_name,
            employee_email,
            last_working_day,
            department,
            organization_id
          )
        `)
        .eq('offboardings.organization_id', organization.id)
        .order('due_date', { ascending: true })

      if (tasksError) {
        throw tasksError
      }

      setTasks(tasksData || [])
    } catch (error: any) {
      console.error('Failed to load tasks:', error)
      setError(error.message || 'Failed to load tasks. Please try again.')
      toast({
        title: 'Error Loading Tasks',
        description: error.message || 'Failed to load tasks',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function refreshTasks() {
    loadTasks()
  }

  const today = new Date().toISOString().split('T')[0]

  const upcomingTasks = tasks.filter(t => !t.completed && t.due_date >= today)
  const overdueTasks = tasks.filter(t => !t.completed && t.due_date < today)
  const completedTasks = tasks.filter(t => t.completed)

  // Calculate completion rate
  const totalTasks = tasks.length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0

  // 🎨 Loading State with Skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-9 w-40 bg-slate-200 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-slate-100 rounded mt-2 animate-pulse"></div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-3 w-32 bg-slate-100 rounded mt-2 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-5 w-48 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-4 w-full bg-slate-100 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ❌ Error State
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-slate-600 mt-1">Manage your assigned offboarding tasks</p>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Tasks</h3>
            <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
            <Button onClick={loadTasks} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-slate-600 mt-1">Manage your assigned offboarding tasks</p>
        </div>
        {tasks.length > 0 && (
          <Button onClick={refreshTasks} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {tasks.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Upcoming</CardTitle>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{upcomingTasks.length}</div>
                <p className="text-xs text-blue-600 mt-1">Tasks due soon</p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-900">Overdue</CardTitle>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-900">{overdueTasks.length}</div>
                <p className="text-xs text-red-600 mt-1">Needs immediate attention</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-900">Completed</CardTitle>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900">{completedTasks.length}</div>
                <p className="text-xs text-green-600 mt-1">Tasks finished</p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">Completion</CardTitle>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900">{completionRate}%</div>
                <p className="text-xs text-purple-600 mt-1">Overall progress</p>
              </CardContent>
            </Card>
          </div>

          {/* Tasks Tabs */}
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900">
                Upcoming ({upcomingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-900">
                Overdue ({overdueTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-900">
                Completed ({completedTasks.length})
              </TabsTrigger>
            </TabsList>

            {/* Upcoming Tasks */}
            <TabsContent value="upcoming" className="space-y-4 mt-6">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={refreshTasks} />
                ))
              ) : (
                <Card className="border-dashed border-2 border-green-200 bg-green-50">
                  <CardContent className="text-center py-16">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-green-900 mb-2">All Caught Up! 🎉</h3>
                    <p className="text-green-700 max-w-md mx-auto">
                      No upcoming tasks on your plate. Great work staying ahead!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Overdue Tasks */}
            <TabsContent value="overdue" className="space-y-4 mt-6">
              {overdueTasks.length > 0 ? (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-900 mb-1">Attention Required</h4>
                        <p className="text-sm text-red-700">
                          You have {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}. 
                          Please complete {overdueTasks.length === 1 ? 'it' : 'them'} as soon as possible to avoid delays.
                        </p>
                      </div>
                    </div>
                  </div>
                  {overdueTasks.map((task) => (
                    <TaskCard key={task.id} task={task} isOverdue onUpdate={refreshTasks} />
                  ))}
                </>
              ) : (
                <Card className="border-dashed border-2 border-green-200 bg-green-50">
                  <CardContent className="text-center py-16">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-green-900 mb-2">No Overdue Tasks! 🌟</h3>
                    <p className="text-green-700 max-w-md mx-auto">
                      Excellent work! You're staying on top of all your deadlines.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Completed Tasks */}
            <TabsContent value="completed" className="space-y-4 mt-6">
              {completedTasks.length > 0 ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <PartyPopper className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-900 mb-1">Great Progress!</h4>
                        <p className="text-sm text-green-700">
                          You've completed {completedTasks.length} task{completedTasks.length !== 1 ? 's' : ''} ({completionRate}% overall completion rate).
                        </p>
                      </div>
                    </div>
                  </div>
                  {completedTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onUpdate={refreshTasks} />
                  ))}
                </>
              ) : (
                <Card className="border-dashed border-2 border-slate-300">
                  <CardContent className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Completed Tasks Yet</h3>
                    <p className="text-slate-600 max-w-md mx-auto">
                      Start completing tasks to see your progress here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        // 🎨 Empty State - No Tasks at All
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ListTodo className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">No Tasks Assigned Yet</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto text-lg">
              You don't have any offboarding tasks assigned to you. Tasks will appear here when an offboarding is created with tasks for your department.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
              <Link href="/dashboard/offboardings">
                <Button variant="outline" size="lg">
                  <ListTodo className="w-5 h-5 mr-2" />
                  View All Offboardings
                </Button>
              </Link>
              <Link href="/dashboard/offboardings/new">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" size="lg">
                  Create Offboarding
                </Button>
              </Link>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto text-left">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                How Tasks Work
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Tasks are automatically assigned when an offboarding is created based on your department</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>You'll receive email notifications when new tasks are assigned to you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Complete tasks on time to ensure smooth employee offboarding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Track your completion rate and stay ahead of deadlines</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TaskCard from '@/components/dashboard/TaskCard'
import { Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function TasksPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
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
        console.error('No organization found for user')
        setLoading(false)
        return
      }

      // Get all tasks for the user's organization
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          offboardings (
            id,
            employee_name,
            employee_email,
            last_working_day,
            department,
            organization_id
          )
        `)
        .order('due_date', { ascending: true })

      if (tasksError) {
        console.error('Error loading tasks:', tasksError)
        throw tasksError
      }

      // Filter tasks that belong to user's organization
      const organizationTasks = tasksData?.filter(
        (task: any) => task.offboardings?.organization_id === userData.organization_id
      ) || []

      console.log('Loaded tasks:', organizationTasks.length)
      setTasks(organizationTasks)
    } catch (error: any) {
      console.error('Failed to load tasks:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function refreshTasks() {
    setLoading(true)
    loadTasks()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  const upcomingTasks = tasks.filter(t => !t.completed && t.due_date >= today)
  const overdueTasks = tasks.filter(t => !t.completed && t.due_date < today)
  const completedTasks = tasks.filter(t => t.completed)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
        <p className="text-slate-600 mt-1">Manage your assigned offboarding tasks</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTasks.length}</div>
            <p className="text-xs text-slate-500 mt-1">Tasks due soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
            <p className="text-xs text-slate-500 mt-1">Needs immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
            <p className="text-xs text-slate-500 mt-1">Tasks finished</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue ({overdueTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {upcomingTasks.length > 0 ? (
            upcomingTasks.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={refreshTasks} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-slate-500">No upcoming tasks! You're all caught up.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4 mt-6">
          {overdueTasks.length > 0 ? (
            overdueTasks.map((task) => (
              <TaskCard key={task.id} task={task} isOverdue onUpdate={refreshTasks} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-slate-500">No overdue tasks! Great work.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {completedTasks.length > 0 ? (
            completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={refreshTasks} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No completed tasks yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

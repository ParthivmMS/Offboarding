import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TaskCard from '@/components/dashboard/TaskCard'
import { Clock, CheckCircle, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  // Get all tasks assigned to current user
  const { data: allTasks } = await supabase
    .from('tasks')
    .select(`
      *,
      offboardings (
        id,
        employee_name,
        employee_email,
        last_working_day,
        department
      )
    `)
    .eq('assigned_to', user?.id)
    .order('due_date', { ascending: true })

  const today = new Date().toISOString().split('T')[0]

  const upcomingTasks = allTasks?.filter(t => !t.completed && t.due_date >= today) || []
  const overdueTasks = allTasks?.filter(t => !t.completed && t.due_date < today) || []
  const completedTasks = allTasks?.filter(t => t.completed) || []

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
              <TaskCard key={task.id} task={task} />
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
              <TaskCard key={task.id} task={task} isOverdue />
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
              <TaskCard key={task.id} task={task} />
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

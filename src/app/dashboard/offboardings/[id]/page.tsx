'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TaskCard from '@/components/dashboard/TaskCard'
import { ArrowLeft, User, Calendar, Briefcase, Mail, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function OffboardingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [offboarding, setOffboarding] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    loadOffboarding()
  }, [params.id])

  async function loadOffboarding() {
    try {
      const supabase = createClient()
      
      // Get offboarding details
      const { data: offboardingData, error: offboardingError } = await supabase
        .from('offboardings')
        .select('*')
        .eq('id', params.id)
        .single()

      if (offboardingError || !offboardingData) {
        console.error('Offboarding error:', offboardingError)
        toast({
          title: 'Error',
          description: 'Offboarding not found',
          variant: 'destructive',
        })
        router.push('/dashboard/offboardings')
        return
      }

      // Get tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('offboarding_id', params.id)
        .order('order_index')

      if (tasksError) {
        console.error('Tasks error:', tasksError)
      }

      setOffboarding(offboardingData)
      setTasks(tasksData || [])

      // Check if all tasks are completed and update offboarding status
      if (tasksData && tasksData.length > 0) {
        const allCompleted = tasksData.every((t: any) => t.completed)
        if (allCompleted && offboardingData.status !== 'completed') {
          await supabase
            .from('offboardings')
            .update({ status: 'completed' })
            .eq('id', params.id)
          
          offboardingData.status = 'completed'
          setOffboarding(offboardingData)
        }
      }
    } catch (error) {
      console.error('Load offboarding error:', error)
      toast({
        title: 'Error',
        description: 'Failed to load offboarding details',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function refreshData() {
    setLoading(true)
    loadOffboarding()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!offboarding) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500">Offboarding not found</p>
      </div>
    )
  }

  const completedTasks = tasks.filter(t => t.completed).length
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
  
  const today = new Date().toISOString().split('T')[0]
  const upcomingTasks = tasks.filter(t => !t.completed && t.due_date >= today)
  const overdueTasks = tasks.filter(t => !t.completed && t.due_date < today)
  const completedTasksList = tasks.filter(t => t.completed)

  const statusColors: Record<string, string> = {
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-slate-100 text-slate-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/offboardings')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">{offboarding.employee_name}</h1>
            <Badge className={statusColors[offboarding.status]}>
              {offboarding.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-slate-600">{offboarding.role} • {offboarding.department}</p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Offboarding Progress</CardTitle>
              <CardDescription>{completedTasks} of {tasks.length} tasks completed</CardDescription>
            </div>
            <div className="text-3xl font-bold text-blue-600">{progress}%</div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3" />
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
              <p className="text-sm text-slate-500">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{upcomingTasks.length}</div>
              <p className="text-sm text-slate-500">Upcoming</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
              <p className="text-sm text-slate-500">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Details */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Full Name</p>
                  <p className="font-medium">{offboarding.employee_name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium">{offboarding.employee_email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Role & Department</p>
                  <p className="font-medium">{offboarding.role} • {offboarding.department}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Last Working Day</p>
                  <p className="font-medium">{new Date(offboarding.last_working_day).toLocaleDateString()}</p>
                </div>
              </div>

              {offboarding.manager_name && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Manager</p>
                    <p className="font-medium">{offboarding.manager_name}</p>
                    {offboarding.manager_email && (
                      <p className="text-sm text-slate-500">{offboarding.manager_email}</p>
                    )}
                  </div>
                </div>
              )}

              {offboarding.reason_for_departure && (
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Reason for Departure</p>
                    <p className="font-medium">{offboarding.reason_for_departure}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks by Status */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Track and complete offboarding tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="overdue">
                Overdue ({overdueTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedTasksList.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4 mt-6">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map(task => (
                  <TaskCard key={task.id} task={task} onUpdate={refreshData} />
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No upcoming tasks</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="overdue" className="space-y-4 mt-6">
              {overdueTasks.length > 0 ? (
                overdueTasks.map(task => (
                  <TaskCard key={task.id} task={task} isOverdue onUpdate={refreshData} />
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No overdue tasks! Great work.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-6">
              {completedTasksList.length > 0 ? (
                completedTasksList.map(task => (
                  <TaskCard key={task.id} task={task} onUpdate={refreshData} />
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>No completed tasks yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

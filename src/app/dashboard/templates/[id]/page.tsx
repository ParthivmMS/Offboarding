'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, AlertCircle } from 'lucide-react'

export default function TemplateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    loadTemplate()
  }, [params.id])

  async function loadTemplate() {
    const supabase = createClient()
    
    // Get template
    const { data: templateData } = await supabase
      .from('templates')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!templateData) {
      router.push('/dashboard/templates')
      return
    }

    // Get template tasks
    const { data: tasksData } = await supabase
      .from('template_tasks')
      .select('*')
      .eq('template_id', params.id)
      .order('order_index')

    setTemplate(templateData)
    setTasks(tasksData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const priorityColors: Record<string, string> = {
    High: 'bg-red-100 text-red-700 border-red-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-green-100 text-green-700 border-green-200',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/templates')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{template.name}</h1>
          <p className="text-slate-600 mt-1">{template.description || 'View template details and tasks'}</p>
        </div>
        {template.organization_id && (
          <Badge>Custom Template</Badge>
        )}
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
          <CardDescription>Details about this offboarding template</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Role Type</p>
              <p className="text-base font-semibold">{template.role_type || 'General'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Tasks</p>
              <p className="text-base font-semibold">{tasks.length}</p>
            </div>
          </div>
          {template.organization_id ? (
            <Badge variant="secondary">Custom template for your organization</Badge>
          ) : (
            <Badge>Default template available to all users</Badge>
          )}
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Template Tasks ({tasks.length})</CardTitle>
          <CardDescription>These tasks will be created when using this template</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                        <h3 className="font-semibold">{task.task_name}</h3>
                        <Badge className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {task.due_date_offset === 0 
                              ? 'Day of departure'
                              : task.due_date_offset > 0 
                              ? `${task.due_date_offset} days after`
                              : `${Math.abs(task.due_date_offset)} days before`
                            }
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Assigned to:</span> {task.assigned_department}
                        </div>
                        <div>
                          <span className="font-medium">Category:</span> {task.category}
                        </div>
                      </div>

                      {task.instructions && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-sm font-medium text-blue-900 mb-1">Instructions:</p>
                          <p className="text-sm text-blue-800 whitespace-pre-line">{task.instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No tasks in this template yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={() => router.push(`/dashboard/offboardings/new?template=${template.id}`)}>
          Use This Template
        </Button>
        <Button variant="outline" onClick={() => router.push('/dashboard/templates')}>
          Back to Templates
        </Button>
      </div>
    </div>
  )
              }

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

interface Task {
  id: string
  task_name: string
  description: string
  assigned_department: string
  due_date_offset: number
  priority: string
  category: string
  instructions: string
}

export default function CreateTemplatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    role_type: '',
    description: '',
  })
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      task_name: '',
      description: '',
      assigned_department: 'IT',
      due_date_offset: 0,
      priority: 'High',
      category: 'Access Revocation',
      instructions: '',
    }
  ])

  function addTask() {
    setTasks([...tasks, {
      id: Date.now().toString(),
      task_name: '',
      description: '',
      assigned_department: 'IT',
      due_date_offset: 0,
      priority: 'Medium',
      category: 'Documentation',
      instructions: '',
    }])
  }

  function removeTask(id: string) {
    if (tasks.length > 1) {
      setTasks(tasks.filter(t => t.id !== id))
    }
  }

  function updateTask(id: string, field: string, value: any) {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Get user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .insert({
          name: formData.name,
          role_type: formData.role_type,
          description: formData.description,
          organization_id: userData?.organization_id,
          created_by: user.id,
        })
        .select()
        .single()

      if (templateError) throw templateError

      // Create template tasks
      const templateTasks = tasks.map((task, index) => ({
        template_id: template.id,
        task_name: task.task_name,
        description: task.description,
        assigned_department: task.assigned_department,
        due_date_offset: Number(task.due_date_offset),
        priority: task.priority,
        category: task.category,
        instructions: task.instructions,
        order_index: index,
      }))

      const { error: tasksError } = await supabase
        .from('template_tasks')
        .insert(templateTasks)

      if (tasksError) throw tasksError

      toast({
        title: 'Success!',
        description: 'Template created successfully',
      })

      router.push('/dashboard/templates')
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/templates')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Template</h1>
          <p className="text-slate-600 mt-1">Create a custom offboarding checklist template</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle>Template Information</CardTitle>
            <CardDescription>Basic details about the template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Senior Engineer Offboarding"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role_type">Role Type *</Label>
              <Select
                value={formData.role_type}
                onValueChange={(value) => setFormData({ ...formData, role_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of when to use this template"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Template Tasks</CardTitle>
                <CardDescription>Add tasks that will be created for each offboarding</CardDescription>
              </div>
              <Button type="button" onClick={addTask} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {tasks.map((task, index) => (
              <div key={task.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Task #{index + 1}</h4>
                  {tasks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTask(task.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Task Name *</Label>
                    <Input
                      placeholder="e.g., Revoke GitHub Access"
                      value={task.task_name}
                      onChange={(e) => updateTask(task.id, 'task_name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <Select
                      value={task.assigned_department}
                      onValueChange={(value) => updateTask(task.id, 'assigned_department', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of the task"
                    value={task.description}
                    onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Due Date (days) *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={task.due_date_offset}
                      onChange={(e) => updateTask(task.id, 'due_date_offset', e.target.value)}
                    />
                    <p className="text-xs text-slate-500">Relative to last working day (negative = before, positive = after)</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority *</Label>
                    <Select
                      value={task.priority}
                      onValueChange={(value) => updateTask(task.id, 'priority', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={task.category}
                      onValueChange={(value) => updateTask(task.id, 'category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Access Revocation">Access Revocation</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Documentation">Documentation</SelectItem>
                        <SelectItem value="Knowledge Transfer">Knowledge Transfer</SelectItem>
                        <SelectItem value="Compliance">Compliance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Instructions</Label>
                  <Textarea
                    placeholder="Step-by-step instructions for completing this task"
                    value={task.instructions}
                    onChange={(e) => updateTask(task.id, 'instructions', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Template'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard/templates')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

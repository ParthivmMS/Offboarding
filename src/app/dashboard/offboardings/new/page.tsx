'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

export default function NewOffboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_email: '',
    department: '',
    role: '',
    last_working_day: '',
    manager_name: '',
    manager_email: '',
    reason_for_departure: '',
    template_id: '',
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
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
        .single()

      // Get templates (both default and organization-specific)
      const { data: templatesData, error } = await supabase
        .from('templates')
        .select(`
          id,
          name,
          role_type,
          description,
          template_tasks(count)
        `)
        .or(`organization_id.is.null,organization_id.eq.${userData?.organization_id}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching templates:', error)
        throw error
      }

      // Format templates with task count
      const formatted = templatesData?.map(t => ({
        ...t,
        task_count: t.template_tasks?.[0]?.count || 0,
      })) || []

      setTemplates(formatted)
    } catch (error: any) {
      console.error('Failed to load templates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      })
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

      if (!userData) {
        throw new Error('User data not found')
      }

      // Create offboarding
      const { data: offboarding, error: offboardingError } = await supabase
        .from('offboardings')
        .insert({
          organization_id: userData.organization_id,
          employee_name: formData.employee_name,
          employee_email: formData.employee_email,
          department: formData.department,
          role: formData.role,
          last_working_day: formData.last_working_day,
          manager_name: formData.manager_name || null,
          manager_email: formData.manager_email || null,
          reason_for_departure: formData.reason_for_departure || null,
          template_id: formData.template_id,
          created_by: user.id,
          status: 'in_progress',
        })
        .select()
        .single()

      if (offboardingError) {
        console.error('Offboarding creation error:', offboardingError)
        throw new Error('Failed to create offboarding')
      }

      // Get template tasks
      const { data: templateTasks, error: tasksError } = await supabase
        .from('template_tasks')
        .select('*')
        .eq('template_id', formData.template_id)
        .order('order_index')

      if (tasksError || !templateTasks || templateTasks.length === 0) {
        console.error('Template tasks error:', tasksError)
        // Clean up offboarding if no tasks
        await supabase.from('offboardings').delete().eq('id', offboarding.id)
        throw new Error('Template has no tasks')
      }

      // Create tasks from template
      const lastWorkingDay = new Date(formData.last_working_day)
      const tasks = templateTasks.map((templateTask) => {
        const dueDate = new Date(lastWorkingDay)
        dueDate.setDate(dueDate.getDate() + templateTask.due_date_offset)

        return {
          offboarding_id: offboarding.id,
          task_name: templateTask.task_name,
          description: templateTask.description,
          instructions: templateTask.instructions,
          assigned_department: templateTask.assigned_department,
          due_date: dueDate.toISOString().split('T')[0],
          priority: templateTask.priority,
          category: templateTask.category,
          order_index: templateTask.order_index,
          completed: false,
        }
      })

      const { error: insertTasksError } = await supabase
        .from('tasks')
        .insert(tasks)

      if (insertTasksError) {
        console.error('Tasks insertion error:', insertTasksError)
        // Clean up offboarding if tasks fail
        await supabase.from('offboardings').delete().eq('id', offboarding.id)
        throw new Error('Failed to create tasks')
      }

      toast({
        title: 'Success!',
        description: `Offboarding process started for ${formData.employee_name}`,
      })

      router.push(`/dashboard/offboardings/${offboarding.id}`)
    } catch (error: any) {
      console.error('Submit error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create offboarding',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Start New Offboarding</h1>
          <p className="text-slate-600 mt-1">Fill in the employee details to begin the offboarding process</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
          <CardDescription>Enter the details of the employee being offboarded</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_name">Employee Name *</Label>
                <Input
                  id="employee_name"
                  placeholder="John Doe"
                  value={formData.employee_name}
                  onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_email">Employee Email *</Label>
                <Input
                  id="employee_email"
                  type="email"
                  placeholder="john@company.com"
                  value={formData.employee_email}
                  onChange={(e) => setFormData({ ...formData, employee_email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
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
                <Label htmlFor="role">Job Title *</Label>
                <Input
                  id="role"
                  placeholder="Software Engineer"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_working_day">Last Working Day *</Label>
              <Input
                id="last_working_day"
                type="date"
                value={formData.last_working_day}
                onChange={(e) => setFormData({ ...formData, last_working_day: e.target.value })}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manager_name">Manager Name</Label>
                <Input
                  id="manager_name"
                  placeholder="Jane Smith"
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager_email">Manager Email</Label>
                <Input
                  id="manager_email"
                  type="email"
                  placeholder="jane@company.com"
                  value={formData.manager_email}
                  onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_id">Select Template *</Label>
              {loadingTemplates ? (
                <div className="flex items-center justify-center p-4 border rounded-md">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-slate-600">Loading templates...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="p-4 border rounded-md bg-yellow-50 text-yellow-800">
                  <p className="text-sm">No templates available. Please create a template first.</p>
                  <Button 
                    type="button"
                    variant="link" 
                    className="p-0 h-auto text-yellow-900"
                    onClick={() => router.push('/dashboard/templates/new')}
                  >
                    Create Template →
                  </Button>
                </div>
              ) : (
                <Select
                  value={formData.template_id}
                  onValueChange={(value) => setFormData({ ...formData, template_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.task_count} tasks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason_for_departure">Reason for Departure (Optional)</Label>
              <Textarea
                id="reason_for_departure"
                placeholder="Resignation, termination, retirement, etc."
                value={formData.reason_for_departure}
                onChange={(e) => setFormData({ ...formData, reason_for_departure: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading || loadingTemplates || templates.length === 0}>
                {loading ? 'Creating...' : 'Start Offboarding'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

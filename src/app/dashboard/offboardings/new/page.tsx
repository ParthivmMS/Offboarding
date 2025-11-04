'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentOrganization } from '@/lib/workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, AlertCircle } from 'lucide-react'

export default function NewOffboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])
  const [organizationId, setOrganizationId] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [canCreateOffboarding, setCanCreateOffboarding] = useState(true)
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('Auth error:', userError)
        router.push('/login')
        return
      }

      // ✅ FIX: Get current organization and role using workspace utility
      const { organization, role } = await getCurrentOrganization()

      if (!organization) {
        throw new Error('User is not associated with an organization')
      }

      setOrganizationId(organization.id)
      setUserRole(role || '')

      // ✅ FIX: Check if user has permission to create offboardings
      const hasPermission = ['admin', 'hr_manager'].includes(role || '')
      setCanCreateOffboarding(hasPermission)

      if (!hasPermission) {
        console.warn('User does not have permission to create offboardings')
      }

      // Get templates (both default and organization-specific)
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('id, name, role_type, description, is_default')
        .or(`is_default.eq.true,organization_id.eq.${organization.id}`)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (templatesError) {
        console.error('Error fetching templates:', templatesError)
        throw templatesError
      }

      if (!templatesData || templatesData.length === 0) {
        console.warn('No templates found')
        setTemplates([])
        return
      }

      // Get task counts separately for each template
      const templatesWithCounts = await Promise.all(
        templatesData.map(async (template) => {
          const { count, error: countError } = await supabase
            .from('template_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('template_id', template.id)

          if (countError) {
            console.error(`Error counting tasks for template ${template.id}:`, countError)
          }

          return {
            ...template,
            task_count: count || 0,
          }
        })
      )

      setTemplates(templatesWithCounts)
    } catch (error: any) {
      console.error('Failed to load templates:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load templates',
        variant: 'destructive',
      })
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ FIX: Check permissions before attempting to create
    if (!canCreateOffboarding) {
      toast({
        title: '⚠️ Permission Denied',
        description: 'You need Admin or HR Manager permissions to create offboardings. Please contact your administrator.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Get current organization
      const { organization } = await getCurrentOrganization()

      if (!organization) {
        throw new Error('Organization not found')
      }

      // Create offboarding
      const { data: offboarding, error: offboardingError } = await supabase
        .from('offboardings')
        .insert({
          organization_id: organization.id,
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
        
        // ✅ FIX: Detect RLS permission error and show helpful message
        if (offboardingError.code === '42501' || offboardingError.message.includes('policy')) {
          throw new Error('Permission denied: You need Admin or HR Manager role to create offboardings.')
        }
        
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
        dueDate.setDate(dueDate.getDate() + (templateTask.due_date_offset || 0))

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

      // Send email notifications to departments
      try {
        // Get unique departments from tasks
        const departments = [...new Set(templateTasks.map(t => t.assigned_department).filter(Boolean))]
        
        // Get current user name
        const { data: currentUser } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', user.id)
          .single()

        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'offboarding_created',
            departments,
            employeeName: formData.employee_name,
            employeeDepartment: formData.department,
            lastWorkingDay: formData.last_working_day,
            taskCount: tasks.length,
            createdBy: currentUser?.name || currentUser?.email || 'Admin',
            offboardingId: offboarding.id,
            managerEmail: formData.manager_email || undefined,
            organizationId: organization.id,
          }),
        })
        
        console.log('Offboarding created emails sent')
      } catch (emailError) {
        console.error('Failed to send offboarding created emails:', emailError)
        // Don't fail the offboarding creation if emails fail
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

  // ✅ FIX: Show permission warning if user doesn't have access
  if (!loadingTemplates && !canCreateOffboarding) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Start New Offboarding</h1>
            <p className="text-slate-600 mt-1">Create a new employee offboarding process</p>
          </div>
        </div>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="w-5 h-5" />
              Permission Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-orange-800">
                You need <strong>Admin</strong> or <strong>HR Manager</strong> permissions to create offboardings.
              </p>
              <p className="text-sm text-orange-700">
                Your current role: <strong className="capitalize">{userRole.replace('_', ' ')}</strong>
              </p>
              <p className="text-sm text-orange-700">
                Please contact your organization administrator to request the appropriate permissions.
              </p>
              <Button onClick={() => router.push('/dashboard')} className="mt-4">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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

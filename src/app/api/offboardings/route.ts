import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      employee_name,
      employee_email,
      department,
      role,
      last_working_day,
      manager_name,
      manager_email,
      reason_for_departure,
      template_id,
    } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create offboarding
    const { data: offboarding, error: offboardingError } = await supabase
      .from('offboardings')
      .insert({
        organization_id: userData.organization_id,
        employee_name,
        employee_email,
        department,
        role,
        last_working_day,
        manager_name,
        manager_email,
        reason_for_departure,
        template_id,
        created_by: user.id,
        status: 'in_progress',
      })
      .select()
      .single()

    if (offboardingError) {
      console.error('Offboarding creation error:', offboardingError)
      return NextResponse.json(
        { error: 'Failed to create offboarding' },
        { status: 500 }
      )
    }

    // Get template tasks
    const { data: templateTasks } = await supabase
      .from('template_tasks')
      .select('*')
      .eq('template_id', template_id)
      .order('order_index')

    if (!templateTasks || templateTasks.length === 0) {
      return NextResponse.json(
        { error: 'Template has no tasks' },
        { status: 400 }
      )
    }

    // Calculate due dates and create tasks
    const lastWorkingDay = new Date(last_working_day)
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

    // Bulk insert tasks
    const { error: tasksError } = await supabase
      .from('tasks')
      .insert(tasks)

    if (tasksError) {
      console.error('Tasks creation error:', tasksError)
      // Rollback: delete offboarding
      await supabase.from('offboardings').delete().eq('id', offboarding.id)
      return NextResponse.json(
        { error: 'Failed to create tasks' },
        { status: 500 }
      )
    }

    // Auto-assign tasks to users based on department
    const { data: orgUsers } = await supabase
      .from('users')
      .select('id, role')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)

    // Simple assignment logic: assign to first user with matching role
    const departmentRoleMap: Record<string, string> = {
      'IT': 'it_manager',
      'HR': 'hr_manager',
      'Finance': 'admin',
      'Manager': 'manager',
    }

    for (const task of tasks) {
      const targetRole = departmentRoleMap[task.assigned_department]
      if (targetRole) {
        const assignedUser = orgUsers?.find(u => u.role === targetRole)
        if (assignedUser) {
          await supabase
            .from('tasks')
            .update({ assigned_to: assignedUser.id })
            .eq('offboarding_id', offboarding.id)
            .eq('task_name', task.task_name)
        }
      }
    }

    return NextResponse.json({
      success: true,
      offboarding,
    })
  } catch (error) {
    console.error('Error creating offboarding:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all offboardings for the organization
    const { data: offboardings, error } = await supabase
      .from('offboardings')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ offboardings })
  } catch (error) {
    console.error('Error fetching offboardings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

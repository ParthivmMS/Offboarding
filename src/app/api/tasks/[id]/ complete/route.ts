import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { notes } = await request.json()
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update task as completed
    const { data: task, error } = await supabase
      .from('tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        notes: notes || null,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error completing task:', error)
      return NextResponse.json(
        { error: 'Failed to complete task' },
        { status: 500 }
      )
    }

    // Check if all tasks for this offboarding are complete
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('completed')
      .eq('offboarding_id', task.offboarding_id)

    const allComplete = allTasks?.every(t => t.completed)

    // If all tasks complete, mark offboarding as completed
    if (allComplete) {
      await supabase
        .from('offboardings')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.offboarding_id)
    }

    // Create notification for admin/HR
    const { data: offboarding } = await supabase
      .from('offboardings')
      .select('employee_name, created_by')
      .eq('id', task.offboarding_id)
      .single()

    if (offboarding) {
      await supabase
        .from('notifications')
        .insert({
          user_id: offboarding.created_by,
          message: `Task "${task.task_name}" completed for ${offboarding.employee_name}`,
          type: 'task_completed',
          related_task_id: task.id,
          related_offboarding_id: task.offboarding_id,
          read: false,
        })
    }

    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error('Error in complete task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

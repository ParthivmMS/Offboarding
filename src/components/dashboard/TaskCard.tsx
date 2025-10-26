'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, Clock, User, Calendar, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TaskCardProps {
  task: any
  isOverdue?: boolean
  onUpdate?: () => void
}

export default function TaskCard({ task, isOverdue = false, onUpdate }: TaskCardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(task.notes || '')

  const handleComplete = async () => {
  if (!notes.trim()) {
    toast({
      title: 'Notes required',
      description: 'Please add notes before completing the task',
      variant: 'destructive',
    })
    return
  }

  setLoading(true)
  try {
    const supabase = createClient()

    // Get current user info
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get user name
    const { data: userData } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user?.id)
      .single()

    // Update task as completed
    const { error } = await supabase
      .from('tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        notes: notes.trim(),
      })
      .eq('id', task.id)

    if (error) {
      console.error('Error completing task:', error)
      throw error
    }

    // Get offboarding details for email
    const { data: offboardingData } = await supabase
      .from('offboardings')
      .select('*, tasks(id, completed)')
      .eq('id', task.offboarding_id)
      .single()

    // Send task completed email to manager and creator
    try {
      const recipients = []
      if (offboardingData?.manager_email) {
        recipients.push(offboardingData.manager_email)
      }
      
      // Also send to the person who created the offboarding
      const { data: creator } = await supabase
        .from('users')
        .select('email')
        .eq('id', offboardingData?.created_by)
        .single()
      
      if (creator?.email && !recipients.includes(creator.email)) {
        recipients.push(creator.email)
      }

      if (recipients.length > 0) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'task_completed',
            to: recipients,
            taskName: task.task_name,
            employeeName: offboardingData?.employee_name || 'Employee',
            completedBy: userData?.name || userData?.email || 'User',
            notes: notes.trim(),
            offboardingId: task.offboarding_id,
          }),
        })
      }
    } catch (emailError) {
      console.error('Failed to send task completed email:', emailError)
      // Don't fail the task completion if email fails
    }

    // Check if all tasks are now completed
    if (offboardingData) {
      const allTasksCompleted = offboardingData.tasks.every((t: any) => 
        t.id === task.id ? true : t.completed
      )

      if (allTasksCompleted) {
        // Update offboarding status to completed
        await supabase
          .from('offboardings')
          .update({ status: 'completed' })
          .eq('id', task.offboarding_id)

        // Send offboarding completed email
        try {
          const recipients = []
          if (offboardingData.manager_email) recipients.push(offboardingData.manager_email)
          
          // Add HR and creator
          const { data: creator } = await supabase
            .from('users')
            .select('email')
            .eq('id', offboardingData.created_by)
            .single()
          
          if (creator?.email && !recipients.includes(creator.email)) {
            recipients.push(creator.email)
          }

          // Add HR department email
          const hrEmail = 'hr@company.com' // From DEPARTMENT_EMAILS
          if (!recipients.includes(hrEmail)) {
            recipients.push(hrEmail)
          }

          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'offboarding_completed',
              to: recipients,
              employeeName: offboardingData.employee_name,
              department: offboardingData.department,
              completionDate: new Date().toISOString(),
              offboardingId: task.offboarding_id,
              totalTasks: offboardingData.tasks.length,
            }),
          })
        } catch (emailError) {
          console.error('Failed to send offboarding completed email:', emailError)
        }

        toast({
          title: '🎉 Offboarding Completed!',
          description: `All tasks completed for ${offboardingData.employee_name}`,
        })
      } else {
        toast({
          title: 'Task completed!',
          description: 'The task has been marked as complete.',
        })
      }
    }

    // Refresh the parent component
    if (onUpdate) {
      onUpdate()
    }
  } catch (error: any) {
    console.error('Failed to complete task:', error)
    toast({
      title: 'Error',
      description: error.message || 'Failed to complete task',
      variant: 'destructive',
    })
  } finally {
    setLoading(false)
  }
}

  const priorityColors: Record<string, string> = {
    High: 'bg-red-100 text-red-700 border-red-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-green-100 text-green-700 border-green-200',
  }
  
  const priorityColor = priorityColors[task.priority] || 'bg-slate-100 text-slate-700'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card className={isOverdue && !task.completed ? 'border-red-200 bg-red-50/50' : ''}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg">{task.task_name}</h3>
              <Badge className={priorityColor}>
                {task.priority}
              </Badge>
              {task.completed && (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
              {isOverdue && !task.completed && (
                <Badge variant="destructive">Overdue</Badge>
              )}
            </div>

            {task.description && (
              <p className="text-slate-600 mb-3">{task.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
              {task.assigned_department && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{task.assigned_department}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Due: {formatDate(task.due_date)}</span>
              </div>
              {task.category && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{task.category}</span>
                </div>
              )}
            </div>

            {task.instructions && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-1">Instructions:</p>
                <p className="text-sm text-blue-800 whitespace-pre-line">{task.instructions}</p>
              </div>
            )}

            {task.completed && task.completed_at && (
              <div className="text-sm text-green-600 font-medium mb-3 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Completed on {formatDate(task.completed_at)}
              </div>
            )}

            {task.notes && (
              <div className="bg-slate-50 border rounded p-3 mb-3">
                <p className="text-sm font-medium mb-1">Completion Notes:</p>
                <p className="text-sm text-slate-600 whitespace-pre-line">{task.notes}</p>
              </div>
            )}
          </div>

          {!task.completed && (
            <div className="ml-4 flex flex-col gap-2">
              <Button
                onClick={() => setShowNotes(!showNotes)}
                variant="outline"
                size="sm"
              >
                {showNotes ? 'Hide Notes' : 'Add Notes'}
              </Button>
            </div>
          )}
        </div>

        {showNotes && !task.completed && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Add completion notes *
              </label>
              <Textarea
                placeholder="Describe what actions were taken to complete this task..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Notes are required to complete the task
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleComplete}
                disabled={loading || !notes.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Completing...' : 'Mark as Complete'}
              </Button>
              <Button
                onClick={() => {
                  setShowNotes(false)
                  setNotes(task.notes || '')
                }}
                variant="outline"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

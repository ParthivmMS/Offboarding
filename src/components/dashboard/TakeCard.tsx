'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, Clock, User, Calendar, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TaskCardProps {
  task: any
  isOverdue?: boolean
}

export default function TaskCard({ task, isOverdue = false }: TaskCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(task.notes || '')

  const handleComplete = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete task')
      }

      toast({
        title: 'Task completed!',
        description: 'The task has been marked as complete.',
      })

      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete task',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const priorityColor = {
    High: 'bg-red-100 text-red-700 border-red-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-green-100 text-green-700 border-green-200',
  }[task.priority] || 'bg-slate-100 text-slate-700'

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
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{task.offboardings.employee_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Due: {formatDate(task.due_date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>{task.category}</span>
              </div>
            </div>

            {task.instructions && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-1">Instructions:</p>
                <p className="text-sm text-blue-800 whitespace-pre-line">{task.instructions}</p>
              </div>
            )}

            {task.completed && task.completed_at && (
              <div className="text-sm text-slate-500 mb-3">
                Completed on {formatDate(task.completed_at)}
              </div>
            )}

            {task.notes && (
              <div className="bg-slate-50 border rounded p-3 mb-3">
                <p className="text-sm font-medium mb-1">Notes:</p>
                <p className="text-sm text-slate-600">{task.notes}</p>
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
            <Textarea
              placeholder="Add notes about completing this task..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleComplete}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Completing...' : 'Mark as Complete'}
              </Button>
              <Button
                onClick={() => setShowNotes(false)}
                variant="outline"
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

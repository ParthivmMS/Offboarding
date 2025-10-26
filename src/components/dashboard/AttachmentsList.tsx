'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Download, Trash2, FileText, Image, File } from 'lucide-react'

interface AttachmentsListProps {
  taskId: string
  refreshTrigger?: number
}

export default function AttachmentsList({ taskId, refreshTrigger }: AttachmentsListProps) {
  const { toast } = useToast()
  const [attachments, setAttachments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAttachments()
  }, [taskId, refreshTrigger])

  async function loadAttachments() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false })

      if (error) throw error

      setAttachments(data || [])
    } catch (error) {
      console.error('Failed to load attachments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(attachment: any) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .download(attachment.file_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Download error:', error)
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  async function handleDelete(attachment: any) {
    if (!confirm('Are you sure you want to delete this attachment?')) return

    try {
      const supabase = createClient()

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([attachment.file_path])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachment.id)

      if (dbError) throw dbError

      toast({
        title: 'Success!',
        description: 'Attachment deleted',
      })

      loadAttachments()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="w-4 h-4 text-blue-500" />
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="w-4 h-4 text-red-500" />
    }
    return <File className="w-4 h-4 text-slate-500" />
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Loading attachments...</div>
  }

  if (attachments.length === 0) {
    return <div className="text-sm text-slate-500">No attachments yet</div>
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getFileIcon(attachment.file_name)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.file_name}</p>
              <p className="text-xs text-slate-500">
                {(attachment.file_size / 1024).toFixed(1)} KB • {' '}
                {new Date(attachment.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(attachment)}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(attachment)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

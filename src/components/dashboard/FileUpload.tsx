'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Upload, X, FileText, Image, File } from 'lucide-react'

interface FileUploadProps {
  taskId: string
  onUploadComplete: () => void
}

export default function FileUpload({ taskId, onUploadComplete }: FileUploadProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 10MB',
          variant: 'destructive',
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${taskId}/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Save attachment metadata to database
      const { error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          uploaded_by: user.id,
        })

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('task-attachments').remove([filePath])
        throw dbError
      }

      toast({
        title: 'Success!',
        description: 'File uploaded successfully',
      })

      setSelectedFile(null)
      onUploadComplete()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="w-4 h-4" />
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="w-4 h-4" />
    }
    return <File className="w-4 h-4" />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={uploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          Choose File
        </Button>
        {selectedFile && (
          <div className="flex items-center gap-2 text-sm">
            {getFileIcon(selectedFile.name)}
            <span className="truncate max-w-[200px]">{selectedFile.name}</span>
            <span className="text-slate-500">
              ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {selectedFile && (
        <Button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          size="sm"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </Button>
      )}
    </div>
  )
}

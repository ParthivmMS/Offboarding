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

      // ✅ FIX: Get current timestamp for proper formatting (UTC for international markets)
      const completedAt = new Date()

      // Update task as completed
      const { error } = await supabase
        .from('tasks')
        .update({
          completed: true,
          completed_at: completedAt.toISOString(), // Store as ISO for database
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

      // ✅ FIX: Format timestamp in UTC for international consistency
      const formattedCompletionTime = completedAt.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short'
      })

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
              completedOn: formattedCompletionTime, // ✅ FIX: Send formatted UTC time
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
                completionDate: formattedCompletionTime, // ✅ FIX: Use formatted UTC time
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

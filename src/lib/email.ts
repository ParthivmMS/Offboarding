import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendTaskAssignedEmailParams {
  to: string
  taskName: string
  employeeName: string
  dueDate: string
  instructions?: string
  offboardingId: string
}

interface SendTaskCompletedEmailParams {
  to: string
  taskName: string
  employeeName: string
  completedBy: string
  notes?: string
  offboardingId: string
}

interface SendOffboardingCompletedEmailParams {
  to: string[]
  employeeName: string
  department: string
  completionDate: string
  offboardingId: string
}

export async function sendTaskAssignedEmail({
  to,
  taskName,
  employeeName,
  dueDate,
  instructions,
  offboardingId,
}: SendTaskAssignedEmailParams) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://offboarding.vercel.app'
    
    await resend.emails.send({
      from: 'OffboardPro <onboarding@resend.dev>',
      to: [to],
      subject: `New Task Assigned: ${taskName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Task Assigned</h2>
          
          <p>You have been assigned a new offboarding task:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">${taskName}</h3>
            <p><strong>Employee:</strong> ${employeeName}</p>
            <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            ${instructions ? `
              <div style="margin-top: 15px;">
                <strong>Instructions:</strong>
                <p style="white-space: pre-line; margin-top: 5px;">${instructions}</p>
              </div>
            ` : ''}
          </div>
          
          <a href="${appUrl}/dashboard/offboardings/${offboardingId}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Task Details
          </a>
          
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            This is an automated notification from OffboardPro.
          </p>
        </div>
      `,
    })
    
    console.log('Task assigned email sent to:', to)
    return { success: true }
  } catch (error) {
    console.error('Failed to send task assigned email:', error)
    return { success: false, error }
  }
}

export async function sendTaskCompletedEmail({
  to,
  taskName,
  employeeName,
  completedBy,
  notes,
  offboardingId,
}: SendTaskCompletedEmailParams) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://offboarding.vercel.app'
    
    await resend.emails.send({
      from: 'OffboardPro <onboarding@resend.dev>',
      to: [to],
      subject: `Task Completed: ${taskName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">✓ Task Completed</h2>
          
          <p>A task has been completed for the offboarding of <strong>${employeeName}</strong>:</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <h3 style="margin-top: 0; color: #15803d;">${taskName}</h3>
            <p><strong>Completed by:</strong> ${completedBy}</p>
            <p><strong>Completed on:</strong> ${new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            ${notes ? `
              <div style="margin-top: 15px;">
                <strong>Completion Notes:</strong>
                <p style="white-space: pre-line; margin-top: 5px;">${notes}</p>
              </div>
            ` : ''}
          </div>
          
          <a href="${appUrl}/dashboard/offboardings/${offboardingId}" 
             style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Offboarding Progress
          </a>
          
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            This is an automated notification from OffboardPro.
          </p>
        </div>
      `,
    })
    
    console.log('Task completed email sent to:', to)
    return { success: true }
  } catch (error) {
    console.error('Failed to send task completed email:', error)
    return { success: false, error }
  }
}

export async function sendOffboardingCompletedEmail({
  to,
  employeeName,
  department,
  completionDate,
  offboardingId,
}: SendOffboardingCompletedEmailParams) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://offboarding.vercel.app'
    
    await resend.emails.send({
      from: 'OffboardPro <onboarding@resend.dev>',
      to,
      subject: `Offboarding Completed: ${employeeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">🎉 Offboarding Completed</h2>
          
          <p>The offboarding process has been successfully completed:</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <h3 style="margin-top: 0; color: #15803d;">${employeeName}</h3>
            <p><strong>Department:</strong> ${department}</p>
            <p><strong>Completed on:</strong> ${new Date(completionDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
          
          <p>All offboarding tasks have been completed. Great work!</p>
          
          <a href="${appUrl}/dashboard/offboardings/${offboardingId}" 
             style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Offboarding Details
          </a>
          
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            This is an automated notification from OffboardPro.
          </p>
        </div>
      `,
    })
    
    console.log('Offboarding completed email sent to:', to)
    return { success: true }
  } catch (error) {
    console.error('Failed to send offboarding completed email:', error)
    return { success: false, error }
  }
}

export async function sendTaskDueReminderEmail({
  to,
  taskName,
  employeeName,
  dueDate,
  offboardingId,
}: Omit<SendTaskAssignedEmailParams, 'instructions'>) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://offboarding.vercel.app'
    const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    
    await resend.emails.send({
      from: 'OffboardPro <onboarding@resend.dev>',
      to: [to],
      subject: `Reminder: Task Due ${daysUntilDue === 1 ? 'Tomorrow' : `in ${daysUntilDue} days`}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⚠️ Task Due Soon</h2>
          
          <p>This is a reminder that you have a task due ${daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}:</p>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #991b1b;">${taskName}</h3>
            <p><strong>Employee:</strong> ${employeeName}</p>
            <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
          
          <p>Please complete this task before the due date.</p>
          
          <a href="${appUrl}/dashboard/offboardings/${offboardingId}" 
             style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Task
          </a>
          
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            This is an automated reminder from OffboardPro.
          </p>
        </div>
      `,
    })
    
    console.log('Task due reminder email sent to:', to)
    return { success: true }
  } catch (error) {
    console.error('Failed to send task due reminder email:', error)
    return { success: false, error }
  }
}

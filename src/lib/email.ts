import { createClient } from '@/lib/supabase/client'
import { sendBrevoEmail } from './email-brevo'

// Fallback department emails (used if database lookup fails)
const FALLBACK_DEPARTMENT_EMAILS: Record<string, string> = {
  'IT': 'it@company.com',
  'HR': 'hr@company.com',
  'Finance': 'finance@company.com',
  'Operations': 'ops@company.com',
  'Sales': 'sales@company.com',
  'Marketing': 'marketing@company.com',
  'Engineering': 'engineering@company.com',
  'Executive': 'exec@company.com',
}

/**
 * Get department emails from database for the organization
 */
async function getDepartmentEmails(organizationId: string): Promise<Record<string, string>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('department_emails')
      .select('department, email')
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error fetching department emails:', error)
      return FALLBACK_DEPARTMENT_EMAILS
    }

    if (!data || data.length === 0) {
      console.warn('No department emails found, using fallback')
      return FALLBACK_DEPARTMENT_EMAILS
    }

    // Convert array to object
    const departmentEmails: Record<string, string> = {}
    data.forEach(item => {
      departmentEmails[item.department] = item.email
    })

    return departmentEmails
  } catch (error) {
    console.error('Failed to get department emails:', error)
    return FALLBACK_DEPARTMENT_EMAILS
  }
}

interface SendTaskAssignedEmailParams {
  to: string[]
  taskName: string
  employeeName: string
  department: string
  dueDate: string
  instructions?: string
  offboardingId: string
  assignedDepartment: string
}

interface SendTaskCompletedEmailParams {
  to: string[]
  taskName: string
  employeeName: string
  completedBy: string
  completedOn: string // ✅ ADDED
  notes?: string
  offboardingId: string
}

interface SendOffboardingCreatedEmailParams {
  departments: string[]
  employeeName: string
  employeeDepartment: string
  lastWorkingDay: string
  taskCount: number
  createdBy: string
  offboardingId: string
  managerEmail?: string
  organizationId: string
}

interface SendOffboardingCompletedEmailParams {
  to: string[]
  employeeName: string
  department: string
  completionDate: string
  offboardingId: string
  totalTasks: number
}

interface TeamInvitationEmailParams {
  to: string[]
  inviterName: string
  organizationName: string
  role: string
  inviteLink: string
}

export async function sendOffboardingCreatedEmail({
  departments,
  employeeName,
  employeeDepartment,
  lastWorkingDay,
  taskCount,
  createdBy,
  offboardingId,
  managerEmail,
  organizationId,
}: SendOffboardingCreatedEmailParams) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://offboarding.vercel.app'
    
    // Get department emails from database
    const departmentEmailsMap = await getDepartmentEmails(organizationId)
    
    // Get unique department emails
    const departmentEmails = departments
      .map(dept => departmentEmailsMap[dept])
      .filter((email, index, self) => email && self.indexOf(email) === index)
    
    // Add manager email if provided
    const recipients = managerEmail 
      ? [...departmentEmails, managerEmail]
      : departmentEmails

    if (recipients.length === 0) {
      console.warn('No recipients for offboarding created email')
      return { success: false, error: 'No valid recipients' }
    }

    const result = await sendBrevoEmail({
      to: recipients,
      subject: `New Offboarding: ${employeeName}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🚀 New Offboarding Started</h2>
          
          <p>A new employee offboarding has been initiated:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <h3 style="margin-top: 0; color: #1e293b;">${employeeName}</h3>
            <p><strong>Department:</strong> ${employeeDepartment}</p>
            <p><strong>Last Working Day:</strong> ${new Date(lastWorkingDay).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p><strong>Total Tasks:</strong> ${taskCount}</p>
            <p><strong>Created by:</strong> ${createdBy}</p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>⚡ Action Required:</strong> You have tasks assigned to your department. 
              Please review and complete them before the due dates.
            </p>
          </div>
          
          <a href="${appUrl}/dashboard/offboardings/${offboardingId}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">
            View Tasks & Details
          </a>
          
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            This is an automated notification from OffboardPro.
          </p>
        </div>
      `,
    })
    
    console.log('Offboarding created email sent to:', recipients)
    return result
  } catch (error) {
    console.error('Failed to send offboarding created email:', error)
    return { success: false, error }
  }
}

export async function sendTaskAssignedEmail({
  to,
  taskName,
  employeeName,
  department,
  dueDate,
  instructions,
  offboardingId,
  assignedDepartment,
}: SendTaskAssignedEmailParams) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://offboarding.vercel.app'
    
    if (to.length === 0) {
      console.warn('No recipients for task assigned email')
      return { success: false, error: 'No recipients' }
    }

    const result = await sendBrevoEmail({
      to,
      subject: `New Task Assigned: ${taskName}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">📋 New Task Assigned</h2>
          
          <p>Your department has been assigned a new offboarding task:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <h3 style="margin-top: 0; color: #1e293b;">${taskName}</h3>
            <p><strong>Employee:</strong> ${employeeName}</p>
            <p><strong>Department:</strong> ${department}</p>
            <p><strong>Assigned to:</strong> ${assignedDepartment} Department</p>
            <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            ${instructions ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                <strong>Instructions:</strong>
                <p style="white-space: pre-line; margin-top: 5px; color: #475569;">${instructions}</p>
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
    return result
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
    
    if (to.length === 0) {
      console.warn('No recipients for task completed email')
      return { success: false, error: 'No recipients' }
    }

    const result = await sendBrevoEmail({
      to,
      subject: `✓ Task Completed: ${taskName}`,
      htmlContent: `
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
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            ${notes ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #bbf7d0;">
                <strong>Completion Notes:</strong>
                <p style="white-space: pre-line; margin-top: 5px; color: #166534;">${notes}</p>
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
    return result
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
  totalTasks,
}: SendOffboardingCompletedEmailParams) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://offboarding.vercel.app'
    
    if (to.length === 0) {
      console.warn('No recipients for offboarding completed email')
      return { success: false, error: 'No recipients' }
    }

    const result = await sendBrevoEmail({
      to,
      subject: `🎉 Offboarding Completed: ${employeeName}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">🎉 Offboarding Successfully Completed</h2>
          
          <p>Great news! The offboarding process has been successfully completed:</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <h3 style="margin-top: 0; color: #15803d;">${employeeName}</h3>
            <p><strong>Department:</strong> ${department}</p>
            <p><strong>Completed on:</strong> ${new Date(completionDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p><strong>Total Tasks Completed:</strong> ${totalTasks}</p>
          </div>
          
          <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;">
              <strong>✅ All Done!</strong> All offboarding tasks have been completed successfully. 
              Great work team!
            </p>
          </div>
          
          <a href="${appUrl}/dashboard/offboardings/${offboardingId}" 
             style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Offboarding Summary
          </a>
          
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            This is an automated notification from OffboardPro.
          </p>
        </div>
      `,
    })
    
    console.log('Offboarding completed email sent to:', to)
    return result
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
}: Omit<SendTaskAssignedEmailParams, 'instructions' | 'department' | 'assignedDepartment'>) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://offboarding.vercel.app'
    const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    
    if (to.length === 0) {
      console.warn('No recipients for task due reminder email')
      return { success: false, error: 'No recipients' }
    }

    const result = await sendBrevoEmail({
      to,
      subject: `⚠️ Reminder: Task Due ${daysUntilDue === 1 ? 'Tomorrow' : `in ${daysUntilDue} days`}`,
      htmlContent: `
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
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>⏰ Please Act:</strong> Complete this task before the due date to avoid delays.
            </p>
          </div>
          
          <a href="${appUrl}/dashboard/offboardings/${offboardingId}" 
             style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            Complete Task Now
          </a>
          
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            This is an automated reminder from OffboardPro.
          </p>
        </div>
      `,
    })
    
    console.log('Task due reminder email sent to:', to)
    return result
  } catch (error) {
    console.error('Failed to send task due reminder email:', error)
    return { success: false, error }
  }
}

export async function sendTeamInvitationEmail({
  to,
  inviterName,
  organizationName,
  role,
  inviteLink,
}: TeamInvitationEmailParams) {
  try {
    if (to.length === 0) {
      console.warn('No recipients for team invitation email')
      return { success: false, error: 'No recipients' }
    }

    const result = await sendBrevoEmail({
      to,
      subject: `You've been invited to join ${organizationName} on OffboardPro`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .role-badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
            .info-box { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px;"><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on OffboardPro.</p>
              
              <p>You've been assigned the role: <span class="role-badge">${role}</span></p>
              
              <div class="info-box">
                <p style="margin: 0; color: #1e40af;">
                  <strong>📋 What is OffboardPro?</strong><br>
                  OffboardPro helps teams manage employee offboarding efficiently and securely. Track tasks, ensure compliance, and streamline the entire process.
                </p>
              </div>
              
              <p>Click the button below to accept your invitation and create your account:</p>
              
              <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Accept Invitation</a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                <strong>⏰ This invitation expires in 7 days.</strong><br>
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              
              <p style="margin-top: 30px; font-size: 15px;">Looking forward to having you on the team!<br><strong>The OffboardPro Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2024 OffboardPro. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (!result.success) {
      console.error('Error sending team invitation email:', result.error)
      return result
    }

    console.log('✅ Team invitation email sent successfully')
    return result
  } catch (error) {
    console.error('Error sending team invitation email:', error)
    return { success: false, error }
  }
}

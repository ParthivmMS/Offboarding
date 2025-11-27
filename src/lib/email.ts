// /src/lib/email.ts
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
  completedOn: string
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

interface ChurnAlertEmailParams {
  to: string[]
  alertMessage: string
  priority: string
  patterns: string[]
  recommendations: any[]
}

interface ExitSurveyInvitationEmailParams {
  to: string[]
  employeeName: string
  organizationName: string
  surveyLink: string
  expiresInDays: number
}

interface TrialEndedEmailParams {
  to: string[]
  userName: string
  upgradeLink?: string
}

const EMAIL_STYLES = `
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6; 
      color: #1e293b; 
      margin: 0; 
      padding: 0;
      background-color: #f8fafc;
    }
    .email-container { 
      max-width: 600px; 
      margin: 40px auto; 
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    }
    .header { 
      background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%);
      color: white; 
      padding: 40px 30px; 
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content { 
      padding: 40px 30px;
    }
    .info-card {
      background: #f8fafc;
      padding: 24px;
      border-radius: 8px;
      margin: 24px 0;
      border-left: 4px solid #2563eb;
    }
    .info-card h3 {
      margin: 0 0 12px 0;
      color: #1e293b;
      font-size: 20px;
      font-weight: 600;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      padding: 8px 0;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-value {
      color: #1e293b;
      font-weight: 600;
      text-align: right;
    }
    .alert-box {
      background: #fef3c7;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 24px 0;
      border-left: 4px solid #f59e0b;
    }
    .alert-box p {
      margin: 0;
      color: #92400e;
      font-weight: 500;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%);
      color: white !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .footer {
      background: #f8fafc;
      padding: 24px 30px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin: 4px 0;
    }
    .badge-primary { background: #dbeafe; color: #1e40af; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    
    @media only screen and (max-width: 600px) {
      .email-container { margin: 0; border-radius: 0; }
      .header { padding: 30px 20px; }
      .content { padding: 30px 20px; }
      .info-row { flex-direction: column; }
      .info-value { text-align: left; margin-top: 4px; }
    }
  </style>
`

const LOGO_SVG = `
  <svg width="40" height="40" viewBox="0 0 40 40" style="display: inline-block; vertical-align: middle; margin-right: 12px;">
    <rect width="40" height="40" rx="8" fill="white" opacity="0.2"/>
    <path d="M12 20L18 26L28 14" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>
`

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
    
    const departmentEmailsMap = await getDepartmentEmails(organizationId)
    
    const departmentEmails = departments
      .map(dept => departmentEmailsMap[dept])
      .filter((email, index, self) => email && self.indexOf(email) === index)
    
    const recipients = managerEmail 
      ? [...departmentEmails, managerEmail]
      : departmentEmails

    if (recipients.length === 0) {
      console.warn('No recipients for offboarding created email')
      return { success: false, error: 'No valid recipients' }
    }

    const formattedDate = new Date(lastWorkingDay).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    const result = await sendBrevoEmail({
      to: recipients,
      subject: `🚀 New Offboarding Started: ${employeeName}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${EMAIL_STYLES}
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              ${LOGO_SVG}
              <h1>New Offboarding Started</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; margin-bottom: 24px;">
                A new employee offboarding has been initiated and requires your attention.
              </p>
              
              <div class="info-card">
                <h3>${employeeName}</h3>
                <div style="border-top: 1px solid #e2e8f0; margin: 12px 0;"></div>
                <div class="info-row">
                  <span class="info-label">Department</span>
                  <span class="info-value">${employeeDepartment}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Last Working Day</span>
                  <span class="info-value">${formattedDate}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Total Tasks</span>
                  <span class="info-value"><span class="badge badge-primary">${taskCount} tasks</span></span>
                </div>
                <div class="info-row">
                  <span class="info-label">Created By</span>
                  <span class="info-value">${createdBy}</span>
                </div>
              </div>
              
              <div class="alert-box">
                <p>
                  <strong>⚡ Action Required:</strong> You have tasks assigned to your department. 
                  Please review and complete them before the due dates.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${appUrl}/dashboard/offboardings/${offboardingId}" class="button">
                  View Tasks & Details →
                </a>
              </div>
              
              <p style="margin-top: 32px; color: #64748b; font-size: 14px;">
                Complete your assigned tasks on time to ensure a smooth offboarding process.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">This is an automated notification from <strong>OffboardPro</strong></p>
              <p style="margin: 8px 0 0 0;">Secure Employee Offboarding Platform</p>
            </div>
          </div>
        </body>
        </html>
      `,
      senderName: 'OffboardPro',
  senderEmail: 'parthivmssince2005@gmail.com',
    })
    
    console.log('✅ Offboarding created email sent to:', recipients)
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

    const formattedDate = new Date(dueDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    const urgencyBadge = daysUntilDue <= 3 
      ? `<span class="badge badge-danger">Due in ${daysUntilDue} days</span>`
      : `<span class="badge badge-warning">Due in ${daysUntilDue} days</span>`

    const result = await sendBrevoEmail({
      to,
      subject: `📋 New Task Assigned: ${taskName}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${EMAIL_STYLES}
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              ${LOGO_SVG}
              <h1>New Task Assigned</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; margin-bottom: 24px;">
                Your department has been assigned a new offboarding task.
              </p>
              
              <div class="info-card">
                <h3>${taskName}</h3>
                ${urgencyBadge}
                <div style="border-top: 1px solid #e2e8f0; margin: 12px 0;"></div>
                <div class="info-row">
                  <span class="info-label">Employee</span>
                  <span class="info-value">${employeeName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Department</span>
                  <span class="info-value">${department}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Assigned To</span>
                  <span class="info-value">${assignedDepartment}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Due Date</span>
                  <span class="info-value" style="color: ${daysUntilDue <= 3 ? '#dc2626' : '#f59e0b'}; font-weight: 700;">${formattedDate}</span>
                </div>
                ${instructions ? `
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: #475569;">📝 Instructions:</p>
                    <p style="white-space: pre-line; margin: 0; color: #64748b; line-height: 1.6;">${instructions}</p>
                  </div>
                ` : ''}
              </div>
              
              <div style="text-align: center;">
                <a href="${appUrl}/dashboard/offboardings/${offboardingId}" class="button">
                  View Task Details →
                </a>
              </div>
              
              <p style="margin-top: 32px; color: #64748b; font-size: 14px; text-align: center;">
                Complete this task before the due date to stay on track.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">This is an automated notification from <strong>OffboardPro</strong></p>
              <p style="margin: 8px 0 0 0;">Secure Employee Offboarding Platform</p>
            </div>
          </div>
        </body>
        </html>
      `,
      senderName: 'OffboardPro',
  senderEmail: 'parthivmssince2005@gmail.com',
    })
    
    console.log('✅ Task assigned email sent to:', to)
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
  completedOn,
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
      subject: `✅ Task Completed: ${taskName}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${EMAIL_STYLES}
          <style>
            .success-header { 
              background: linear-gradient(135deg, #16a34a 0%, #059669 100%);
            }
            .success-card {
              background: #f0fdf4;
              border-left-color: #16a34a;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header success-header">
              <svg width="48" height="48" viewBox="0 0 48 48" style="display: block; margin: 0 auto 12px;">
                <circle cx="24" cy="24" r="22" fill="white" opacity="0.2"/>
                <path d="M14 24L20 30L34 16" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <h1>Task Completed</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; margin-bottom: 24px;">
                Great news! A task has been completed for the offboarding of <strong>${employeeName}</strong>.
              </p>
              
              <div class="info-card success-card">
                <h3 style="color: #15803d;">${taskName}</h3>
                <span class="badge badge-success">✓ Completed</span>
                <div style="border-top: 1px solid #bbf7d0; margin: 12px 0;"></div>
                <div class="info-row">
                  <span class="info-label">Completed By</span>
                  <span class="info-value">${completedBy}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Completed On</span>
                  <span class="info-value">${completedOn}</span>
                </div>
                ${notes ? `
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #bbf7d0;">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: #166534;">📝 Completion Notes:</p>
                    <p style="white-space: pre-line; margin: 0; color: #15803d; line-height: 1.6;">${notes}</p>
                  </div>
                ` : ''}
              </div>
              
              <div style="background: #dcfce7; padding: 16px 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #16a34a;">
                <p style="margin: 0; color: #166534; font-weight: 500;">
                  <strong>🎉 Excellent work!</strong> This brings the team one step closer to completing the offboarding process.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${appUrl}/dashboard/offboardings/${offboardingId}" class="button" style="background: linear-gradient(135deg, #16a34a 0%, #059669 100%);">
                  View Offboarding Progress →
                </a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">This is an automated notification from <strong>OffboardPro</strong></p>
              <p style="margin: 8px 0 0 0;">Secure Employee Offboarding Platform</p>
            </div>
          </div>
        </body>
        </html>
      `,
      senderName: 'OffboardPro',
  senderEmail: 'parthivmssince2005@gmail.com',
    })
    
    console.log('✅ Task completed email sent to:', to)
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
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${EMAIL_STYLES}
          <style>
            .celebration-header { 
              background: linear-gradient(135deg, #16a34a 0%, #059669 100%);
            }
            .celebration-icon {
              font-size: 64px;
              margin: 0 auto 12px;
              display: block;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header celebration-header">
              <div class="celebration-icon">🎉</div>
              <h1>Offboarding Complete!</h1>
            </div>
            <div class="content">
              <p style="font-size: 18px; margin-bottom: 24px; text-align: center; font-weight: 600; color: #16a34a;">
                Congratulations! The offboarding process has been successfully completed.
              </p>
              
              <div class="info-card" style="background: #f0fdf4; border-left-color: #16a34a;">
                <h3 style="color: #15803d;">${employeeName}</h3>
                <span class="badge badge-success">✓ All Tasks Completed</span>
                <div style="border-top: 1px solid #bbf7d0; margin: 12px 0;"></div>
                <div class="info-row">
                  <span class="info-label">Department</span>
                  <span class="info-value">${department}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Completed On</span>
                  <span class="info-value">${completionDate}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Total Tasks</span>
                  <span class="info-value"><span class="badge badge-success">${totalTasks} tasks</span></span>
                </div>
              </div>
              
              <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
                <p style="margin: 0; color: #166534; font-size: 16px; font-weight: 600;">
                  ✅ All offboarding tasks have been completed successfully!
                </p>
                <p style="margin: 8px 0 0 0; color: #15803d;">
                  Great teamwork! All departments completed their tasks on time.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${appUrl}/dashboard/offboardings/${offboardingId}" class="button" style="background: linear-gradient(135deg, #16a34a 0%, #059669 100%);">
                  View Summary Report →
                </a>
              </div>
              
              <p style="margin-top: 32px; color: #64748b; font-size: 14px; text-align: center;">
                Thank you for ensuring a smooth and secure offboarding process.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">This is an automated notification from <strong>OffboardPro</strong></p>
              <p style="margin: 8px 0 0 0;">Secure Employee Offboarding Platform</p>
            </div>
          </div>
        </body>
        </html>
      `,
      senderName: 'OffboardPro',
  senderEmail: 'parthivmssince2005@gmail.com',
    })
    
    console.log('✅ Offboarding completed email sent to:', to)
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

    const urgencyLevel = daysUntilDue === 0 ? 'DUE TODAY' : daysUntilDue === 1 ? 'Due Tomorrow' : `Due in ${daysUntilDue} days`
    const urgencyColor = daysUntilDue <= 1 ? '#dc2626' : '#f59e0b'

    const formattedDate = new Date(dueDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    const result = await sendBrevoEmail({
      to,
      subject: `⚠️ ${urgencyLevel}: ${taskName}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${EMAIL_STYLES}
          <style>
            .urgent-header { 
              background: linear-gradient(135deg, ${urgencyColor} 0%, ${daysUntilDue <= 1 ? '#991b1b' : '#d97706'} 100%);
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header urgent-header">
              <div style="font-size: 48px; margin-bottom: 8px;">⚠️</div>
              <h1>Task Due Reminder</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; margin-bottom: 24px;">
                This is a reminder that you have an important task <strong style="color: ${urgencyColor};">${urgencyLevel.toLowerCase()}</strong>:
              </p>
              
              <div class="info-card" style="background: ${daysUntilDue <= 1 ? '#fef2f2' : '#fef3c7'}; border-left-color: ${urgencyColor};">
                <h3 style="color: ${daysUntilDue <= 1 ? '#991b1b' : '#92400e'};">${taskName}</h3>
                <span class="badge" style="background: ${urgencyColor}; color: white;">${urgencyLevel}</span>
                <div style="border-top: 1px solid ${daysUntilDue <= 1 ? '#fecaca' : '#fde68a'}; margin: 12px 0;"></div>
                <div class="info-row">
                  <span class="info-label">Employee</span>
                  <span class="info-value">${employeeName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Due Date</span>
                  <span class="info-value" style="color: ${urgencyColor}; font-weight: 700;">${formattedDate}</span>
                </div>
              </div>
              
              <div style="background: ${daysUntilDue <= 1 ? '#fee2e2' : '#fef3c7'}; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid ${urgencyColor};">
                <p style="margin: 0; color: ${daysUntilDue <= 1 ? '#991b1b' : '#92400e'}; font-weight: 600; font-size: 16px;">
                  <strong>⏰ Action Required:</strong> Please complete this task ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'by tomorrow' : `within ${daysUntilDue} days`} to avoid delays in the offboarding process.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${appUrl}/dashboard/offboardings/${offboardingId}" class="button" style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${daysUntilDue <= 1 ? '#991b1b' : '#d97706'} 100%);">
                  Complete Task Now →
                </a>
              </div>
              
              <p style="margin-top: 32px; color: #64748b; font-size: 14px; text-align: center;">
                Timely completion helps ensure smooth transitions and security compliance.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">This is an automated reminder from <strong>OffboardPro</strong></p>
              <p style="margin: 8px 0 0 0;">Secure Employee Offboarding Platform</p>
            </div>
          </div>
        </body>
        </html>
      `,
      senderName: 'OffboardPro',
  senderEmail: 'parthivmssince2005@gmail.com',
    })
    
    console.log('✅ Task due reminder email sent to:', to)
    return result
  } catch (error) {
    console.error('Failed to send task due reminder email:', error)
    return { success: false, error }
  }
}

export async function sendTeamInvitationEmail({
  to = [],
  inviterName,
  organizationName,
  role,
  inviteLink,
}: TeamInvitationEmailParams) {
  try {
    if (!to || to.length === 0) {
      console.warn('No recipients for team invitation email')
      return { success: false, error: 'No recipients' }
    }

    if (!inviteLink) {
      console.error('No invite link provided')
      return { success: false, error: 'No invite link' }
    }

    console.log('📧 Sending team invitation email to:', to)
    console.log('📧 Invite link:', inviteLink)

    // ✅ SIMPLE VERSION - Clean and deliverable
    const result = await sendBrevoEmail({
      to,
      subject: `You're invited to join ${organizationName} on OffboardPro`,
      htmlContent: `
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">🎉 You're Invited!</h1>
          
          <p>Hi there!</p>
          
          <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on OffboardPro.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0; color: #1e40af;"><strong>Your Role:</strong> ${role.replace('_', ' ').toUpperCase()}</p>
          </div>
          
          <p><strong>What is OffboardPro?</strong><br>
          OffboardPro helps teams manage employee offboarding efficiently and securely. Track tasks, ensure compliance, and streamline the entire process.</p>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Accept Invitation & Join</a>
          </p>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>⏰ This invitation expires in 7 days.</strong><br>
              If you didn't expect this, you can safely ignore this email.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">Or copy and paste this link:</p>
          <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">${inviteLink}</p>
          
          <p style="margin-top: 30px;">Looking forward to having you on the team!<br>
          <strong>The OffboardPro Team</strong></p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">© 2024 OffboardPro. Secure Employee Offboarding Platform</p>
        </body>
        </html>
      `,
      senderName: 'OffboardPro',
      senderEmail: 'parthivmssince2005@gmail.com',
    })

    if (!result.success) {
      console.error('❌ Error sending team invitation email:', result.error)
      return result
    }

    console.log('✅ Team invitation email sent successfully to:', to)
    return result
  } catch (error: any) {
    console.error('❌ Error sending team invitation email:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}
              

export async function sendChurnAlertEmail({
  to,
  alertMessage,
  priority,
  patterns,
  recommendations,
}: ChurnAlertEmailParams) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://offboarding.vercel.app'
    
    if (to.length === 0) {
      console.warn('No recipients for churn alert email')
      return { success: false, error: 'No recipients' }
    }

    const priorityConfig: Record<string, { color: string; bg: string; icon: string }> = {
      critical: { color: '#dc2626', bg: '#fee2e2', icon: '🚨' },
      high: { color: '#f97316', bg: '#fed7aa', icon: '⚠️' },
      medium: { color: '#f59e0b', bg: '#fef3c7', icon: '⚡' },
      low: { color: '#3b82f6', bg: '#dbeafe', icon: 'ℹ️' },
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium

    const result = await sendBrevoEmail({
      to,
      subject: `${config.icon} ${priority.toUpperCase()} Churn Risk Alert - Immediate Action Required`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${EMAIL_STYLES}
          <style>
            .alert-header { 
              background: linear-gradient(135deg, ${config.color} 0%, ${priority === 'critical' ? '#991b1b' : '#dc2626'} 100%);
            }
            .pattern-item {
              background: #f8fafc;
              padding: 12px 16px;
              border-radius: 6px;
              margin: 8px 0;
              border-left: 3px solid ${config.color};
            }
            .recommendation-card {
              background: white;
              padding: 16px;
              border-radius: 8px;
              margin: 12px 0;
              border: 1px solid #e2e8f0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header alert-header">
              <div style="font-size: 56px; margin-bottom: 8px;">${config.icon}</div>
              <h1>Churn Risk Alert</h1>
              <div style="display: inline-block; background: white; color: ${config.color}; padding: 8px 20px; border-radius: 20px; font-weight: 700; margin-top: 12px; font-size: 14px;">
                ${priority.toUpperCase()} PRIORITY
              </div>
            </div>
            <div class="content">
              <div style="background: ${config.bg}; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid ${config.color};">
                <p style="margin: 0; color: ${config.color}; font-size: 17px; font-weight: 600; line-height: 1.5;">
                  ${alertMessage}
                </p>
              </div>

              ${patterns.length > 0 ? `
                <div style="margin: 32px 0;">
                  <h3 style="color: #1e293b; margin-bottom: 16px; font-size: 20px;">
                    📊 Patterns Detected
                  </h3>
                  ${patterns.map(pattern => `
                    <div class="pattern-item">
                      <p style="margin: 0; color: #475569; font-weight: 500;">${pattern}</p>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${recommendations.length > 0 ? `
                <div style="margin: 32px 0;">
                  <h3 style="color: #1e293b; margin-bottom: 16px; font-size: 20px;">
                    💡 AI-Recommended Actions
                  </h3>
                  <p style="color: #64748b; margin-bottom: 16px;">Take these steps to reduce turnover:</p>
                  ${recommendations.slice(0, 3).map((rec, index) => `
                    <div class="recommendation-card">
                      <div style="display: flex; align-items: start; gap: 12px;">
                        <div style="background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
                          ${index + 1}
                        </div>
                        <div style="flex: 1;">
                          <div style="font-weight: 600; color: #1e293b; margin-bottom: 6px; font-size: 16px;">
                            ${rec.action}
                          </div>
                          <div style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
                            <strong>Department:</strong> ${rec.department} • 
                            <strong>Priority:</strong> <span style="color: ${config.color}; font-weight: 600;">${rec.priority}</span>
                          </div>
                          <div style="color: #475569; font-size: 14px; line-height: 1.5;">
                            <strong>Expected Impact:</strong> ${rec.expected_impact}
                          </div>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <div style="background: #faf5ff; padding: 20px; border-radius: 8px; margin: 32px 0; border-left: 4px solid #9333ea; text-align: center;">
                <p style="margin: 0; color: #6b21a8; font-weight: 600; font-size: 15px;">
                  🤖 This analysis was generated by AI based on ${patterns.length} exit survey${patterns.length !== 1 ? 's' : ''} and recent trends.
                </p>
              </div>

              <div style="text-align: center;">
                <a href="${appUrl}/dashboard/insights" class="button" style="background: linear-gradient(135deg, ${config.color} 0%, ${priority === 'critical' ? '#991b1b' : '#dc2626'} 100%); font-size: 16px; padding: 16px 40px;">
                  View Full Insights Dashboard →
                </a>
              </div>

              <p style="margin-top: 32px; color: #64748b; font-size: 14px; text-align: center;">
                <strong>Act quickly to prevent further turnover.</strong><br>
                Early intervention can significantly improve retention rates.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">This alert was generated by <strong>OffboardPro AI</strong></p>
              <p style="margin: 8px 0 0 0;">Secure Employee Offboarding Platform</p>
            </div>
          </div>
        </body>
        </html>
      `,
      senderName: 'OffboardPro',
  senderEmail: 'parthivmssince2005@gmail.com',
    })
    
    console.log('✅ Churn alert email sent to:', to)
    return result
  } catch (error) {
    console.error('Failed to send churn alert email:', error)
    return { success: false, error }
  }
}
export async function sendExitSurveyInvitationEmail({
  to,
  employeeName,
  organizationName,
  surveyLink,
  expiresInDays,
}: ExitSurveyInvitationEmailParams) {
  try {
    if (to.length === 0) {
      console.warn('No recipients for exit survey invitation email')
      return { success: false, error: 'No recipients' }
    }

    const result = await sendBrevoEmail({
      to,
      subject: `✨ We'd Love Your Feedback - Exit Survey`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${EMAIL_STYLES}
          <style>
            .survey-header { 
              background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            }
            .benefit-item {
              display: flex;
              align-items: center;
              gap: 12px;
              margin: 12px 0;
            }
            .benefit-icon {
              background: #faf5ff;
              color: #9333ea;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              flex-shrink: 0;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header survey-header">
              <div style="font-size: 56px; margin-bottom: 8px;">✨</div>
              <h1>We Value Your Feedback</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; margin-bottom: 24px;">
                Hi <strong>${employeeName}</strong>,
              </p>
              
              <p style="font-size: 16px; line-height: 1.7; color: #475569;">
                Thank you for your contributions to <strong style="color: #9333ea;">${organizationName}</strong>. As part of our commitment to continuous improvement, we'd greatly appreciate your honest feedback about your experience with us.
              </p>
              
              <div style="background: #faf5ff; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #9333ea;">
                <h3 style="margin: 0 0 16px 0; color: #6b21a8; font-size: 18px;">
                  📝 Quick & Confidential Survey
                </h3>
                <p style="margin: 0; color: #7c3aed; line-height: 1.6;">
                  This brief survey takes just <strong>2 minutes</strong> to complete. Your responses are completely <strong>confidential</strong> and will be used only to help us create a better workplace for future team members.
                </p>
              </div>
              
              <div style="margin: 32px 0;">
                <h3 style="color: #1e293b; margin-bottom: 16px; font-size: 18px;">What We'll Ask About:</h3>
                
                <div class="benefit-item">
                  <div class="benefit-icon">🎯</div>
                  <div style="color: #475569;">Your primary reason for leaving</div>
                </div>
                
                <div class="benefit-item">
                  <div class="benefit-icon">⭐</div>
                  <div style="color: #475569;">Likelihood to recommend the company</div>
                </div>
                
                <div class="benefit-item">
                  <div class="benefit-icon">🔄</div>
                  <div style="color: #475569;">Possibility of returning in the future</div>
                </div>
                
                <div class="benefit-item">
                  <div class="benefit-icon">💡</div>
                  <div style="color: #475569;">Suggestions for workplace improvement</div>
                </div>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${surveyLink}" class="button" style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); font-size: 16px; padding: 16px 40px;">
                  Complete Exit Survey (2 min) →
                </a>
              </div>
              
              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 32px 0; text-align: center;">
                <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 15px;">
                  ⏰ This survey link expires in ${expiresInDays} days
                </p>
                <p style="margin: 8px 0 0 0; color: #1e3a8a; font-size: 14px;">
                  Your feedback is anonymous and helps us improve for everyone.
                </p>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 32px 0;">
                <p style="margin: 0 0 12px 0; color: #1e293b; font-weight: 600;">
                  Why Your Feedback Matters:
                </p>
                <p style="margin: 0; color: #64748b; line-height: 1.6; font-size: 14px;">
                  Exit surveys help us identify areas for improvement, understand team dynamics, and create a better work environment. Your honest insights contribute directly to positive changes that benefit current and future employees.
                </p>
              </div>
              
              <p style="margin-top: 32px; font-size: 16px; line-height: 1.7;">
                We wish you all the best in your future endeavors! 🚀
              </p>
              
              <p style="margin-top: 24px; font-size: 16px; text-align: center;">
                Best regards,<br>
                <strong style="color: #2563eb;">The ${organizationName} Team</strong>
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">© 2024 <strong>OffboardPro</strong>. All rights reserved.</p>
              <p style="margin: 8px 0 0 0;">If you have questions, please contact your HR department.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      senderName: 'OffboardPro',
  senderEmail: 'parthivmssince2005@gmail.com',
    })

    if (!result.success) {
      console.error('Error sending exit survey invitation email:', result.error)
      return result
    }

    console.log('✅ Exit survey invitation email sent to:', to)
    return result
  } catch (error) {
    console.error('Error sending exit survey invitation email:', error)
    return { success: false, error }
  }
}
              
              


                

export async function sendTrialEndedEmail({
  to,
  userName,
  upgradeLink = 'https://offboarding.vercel.app/pricing'
}: TrialEndedEmailParams) {
  try {
    if (to.length === 0) {
      console.warn('No recipients for trial ended email')
      return { success: false, error: 'No recipients' }
    }

    const result = await sendBrevoEmail({
      to,
      subject: '⏰ Your OffboardPro Trial Has Ended - Save 20%!',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${EMAIL_STYLES}
          <style>
            .trial-ended-header { 
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header trial-ended-header">
              <div style="font-size: 56px; margin-bottom: 8px;">⏰</div>
              <h1>Your Trial Has Ended</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; margin-bottom: 24px;">
                Hi <strong>${userName}</strong>,
              </p>
              
              <p style="font-size: 16px; line-height: 1.7; color: #475569;">
                Your 14-day free trial of <strong style="color: #9333ea;">OffboardPro Professional</strong> features has ended.
              </p>
              
              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-weight: 600;">
                  ✨ Don't worry! You've been automatically moved to our Free plan, so you can continue using OffboardPro.
                </p>
              </div>
              
              <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #16a34a;">
                <h4 style="margin: 0 0 12px 0; color: #166534; font-size: 16px;">
                  ✅ You Still Have Access To:
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: #15803d;">
                  <li style="margin: 8px 0;">Basic Offboarding Workflows</li>
                  <li style="margin: 8px 0;">Task Management</li>
                  <li style="margin: 8px 0;">Up to 5 Team Members</li>
                  <li style="margin: 8px 0;">3 Offboardings per Month</li>
                  <li style="margin: 8px 0;">Template System</li>
                </ul>
              </div>
              
              <div style="background: #faf5ff; padding: 24px; border-radius: 8px; margin: 32px 0; border-left: 4px solid #9333ea;">
                <h3 style="color: #6b21a8; margin: 0 0 16px 0;">
                  🚀 Want to Keep the Full Features?
                </h3>
                <p style="margin: 0 0 16px 0; color: #7c3aed; line-height: 1.6;">
                  Upgrade now and unlock:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #7c3aed; line-height: 1.8;">
                  <li>🤖 AI-powered exit analysis & insights</li>
                  <li>🔐 Security scanner for OAuth apps</li>
                  <li>📊 Exit surveys & churn detection</li>
                  <li>👥 Up to 100 team members (Professional)</li>
                  <li>💰 <strong style="color: #9333ea;">20% OFF FOR LIFE</strong> as a founding member!</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${upgradeLink}" class="button" style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); font-size: 18px; padding: 18px 48px;">
                  🎉 Upgrade Now & Save 20%
                </a>
              </div>
              
              <div style="background: #dbeafe; padding: 16px 20px; border-radius: 8px; margin: 32px 0; text-align: center;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  <strong>⚡ Founding Member Offer:</strong> First 50 customers get 20% off FOR LIFE<br>
                  <span style="color: #1e3a8a;">Professional: $149/mo (was $199) • Enterprise: $399/mo (was $499)</span>
                </p>
              </div>
              
              <p style="margin-top: 32px; font-size: 14px; color: #64748b; text-align: center;">
                Questions? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/help" style="color: #2563eb; text-decoration: none;">Help Center</a>.
              </p>
              
              <p style="margin-top: 24px; font-size: 16px; text-align: center;">
                Thanks for trying OffboardPro!<br>
                <strong style="color: #2563eb;">The OffboardPro Team</strong>
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">© 2024 <strong>OffboardPro</strong>. All rights reserved.</p>
              <p style="margin: 8px 0 0 0;">
                You're receiving this because your trial period ended.<br>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" style="color: #2563eb;">Manage your account</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      senderName: 'OffboardPro',
  senderEmail: 'parthivmssince2005@gmail.com',
    })

    if (!result.success) {
      console.error('Error sending trial ended email:', result.error)
      return result
    }

    console.log('✅ Trial ended email sent successfully to:', to)
    return result
  } catch (error) {
    console.error('Error sending trial ended email:', error)
    return { success: false, error }
  }
}

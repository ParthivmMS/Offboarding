// /src/app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { 
  sendTaskAssignedEmail, 
  sendTaskCompletedEmail, 
  sendOffboardingCompletedEmail,
  sendTaskDueReminderEmail,
  sendOffboardingCreatedEmail,
  sendTeamInvitationEmail,
  sendChurnAlertEmail,
  sendExitSurveyInvitationEmail
} from '@/lib/email'
import { sendBrevoEmail } from '@/lib/email-brevo'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, to, data, ...params } = body

    let result

    switch (type) {
      case 'email_verification':
        const htmlContent = `
          <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Verify Your Email</h1>
            <p>Hi ${data.name}!</p>
            <p>Thanks for signing up for <strong>${data.organizationName}</strong> on OffboardPro.</p>
            <p>Click the button below to verify your email and activate your 14-day Professional trial:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${data.verificationLink}" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Verify Email Address
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
              ${data.verificationLink}
            </p>
            <p style="margin-top: 30px;">Thanks,<br><strong>OffboardPro Team</strong></p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
          </body>
          </html>
        `
        
        result = await sendBrevoEmail({
          to: [to],
          subject: 'Verify Your Email - OffboardPro',
          htmlContent,
          senderName: 'OffboardPro',
          senderEmail: 'parthivmssince2005@gmail.com',
        })
        break

      case 'offboarding_created':
        result = await sendOffboardingCreatedEmail(params)
        break
        
      case 'task_assigned':
        result = await sendTaskAssignedEmail(params)
        break
        
      case 'task_completed':
        result = await sendTaskCompletedEmail(params)
        break
        
      case 'offboarding_completed':
        result = await sendOffboardingCompletedEmail(params)
        break
        
      case 'task_due_reminder':
        result = await sendTaskDueReminderEmail(params)
        break
        
      case 'team_invitation':
        result = await sendTeamInvitationEmail({
          to: Array.isArray(to) ? to : [to],
          inviterName: params.inviterName,
          organizationName: params.organizationName,
          role: params.role,
          inviteLink: params.inviteLink,
        })
        break
        
      case 'churn_alert':
        result = await sendChurnAlertEmail(params)
        break
        
      case 'exit_survey_invitation':
        console.log('📧 Sending exit survey invitation with params:', {
          to,
          employeeName: params.employeeName,
          organizationName: params.organizationName,
          surveyLink: params.surveyLink,
          expiresInDays: params.expiresInDays
        })
        
        result = await sendExitSurveyInvitationEmail({
          to: Array.isArray(to) ? to : [to],
          employeeName: params.employeeName,
          organizationName: params.organizationName,
          surveyLink: params.surveyLink,
          expiresInDays: params.expiresInDays || 7
        })
        
        console.log('📧 Exit survey email result:', result)
        break
      
      case 'trial_ended':
        const trialEndedHtml = `
          <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">⏰ Your Trial Has Ended</h1>
            <p>Hi ${params.userName || 'there'}!</p>
            <p>Your 14-day free trial of OffboardPro Professional has ended.</p>
            <p style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              ✨ Don't worry! You've been moved to our Free plan so you can keep using OffboardPro.
            </p>
            <h3>🎁 Free Plan Includes:</h3>
            <ul>
              <li>Up to 5 team members</li>
              <li>3 offboardings per month</li>
              <li>Basic workflow automation</li>
              <li>Task management</li>
            </ul>
            <p><strong>Want more?</strong> Upgrade to Professional for just $149/mo (20% off for founding members!)</p>
            <p><a href="${params.upgradeLink || process.env.NEXT_PUBLIC_APP_URL + '/pricing'}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">🚀 Upgrade Now</a></p>
            <p style="margin-top: 30px;">Thanks,<br><strong>OffboardPro Team</strong></p>
          </body>
          </html>
        `
        
        result = await sendBrevoEmail({
          to: [to],
          subject: '⏰ Your OffboardPro Trial Has Ended',
          htmlContent: trialEndedHtml,
          senderName: 'OffboardPro',
          senderEmail: 'parthivmssince2005@gmail.com',
        })
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      throw new Error('Email sending failed')
    }
  } catch (error: any) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

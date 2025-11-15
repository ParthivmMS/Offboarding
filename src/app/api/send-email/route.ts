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
import { sendBrevoEmail } from '@/lib/email-brevo' // ✅ FIXED IMPORT

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, to, data, ...params } = body

    let result

    switch (type) {
      case 'email_verification':
        // Handle email verification using Brevo
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6; 
                color: #333; 
                margin: 0;
                padding: 0;
                background-color: #f8fafc;
              }
              .container { 
                max-width: 600px; 
                margin: 40px auto; 
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header { 
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: white; 
                padding: 40px 30px; 
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
              }
              .content { 
                padding: 40px 30px;
              }
              .content p {
                margin: 0 0 16px 0;
                color: #334155;
              }
              .button { 
                display: inline-block; 
                padding: 16px 32px; 
                background: #2563eb; 
                color: white !important; 
                text-decoration: none; 
                border-radius: 8px; 
                margin: 24px 0;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
              }
              .button:hover {
                background: #1d4ed8;
              }
              .link-box {
                background: #f1f5f9;
                padding: 16px;
                border-radius: 8px;
                margin: 20px 0;
                word-break: break-all;
                font-size: 12px;
                color: #64748b;
              }
              .features {
                margin-top: 30px;
                padding-top: 30px;
                border-top: 2px solid #e2e8f0;
              }
              .feature-item {
                margin: 12px 0;
                padding-left: 24px;
                position: relative;
              }
              .feature-item:before {
                content: "✓";
                position: absolute;
                left: 0;
                color: #10b981;
                font-weight: bold;
                font-size: 18px;
              }
              .footer { 
                text-align: center; 
                padding: 30px;
                background: #f8fafc;
                color: #64748b; 
                font-size: 14px;
                border-top: 1px solid #e2e8f0;
              }
              .footer p {
                margin: 8px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📧 Verify Your Email</h1>
              </div>
              <div class="content">
                <p style="font-size: 18px; font-weight: 600; color: #0f172a;">Hi ${data.name}! 👋</p>
                
                <p>Thank you for signing up for <strong>${data.organizationName}</strong> on OffboardPro!</p>
                
                <p>To complete your registration and start automating your offboarding process, please verify your email address:</p>
                
                <center>
                  <a href="${data.verificationLink}" class="button">✓ Verify Email Address</a>
                </center>
                
                <p style="color: #64748b; font-size: 14px; text-align: center;">
                  Or copy and paste this link into your browser:
                </p>
                <div class="link-box">
                  ${data.verificationLink}
                </div>
                
                <div class="features">
                  <p style="font-weight: 600; margin-bottom: 16px;">After verifying, you'll be able to:</p>
                  <div class="feature-item">Complete your organization setup</div>
                  <div class="feature-item">Invite team members</div>
                  <div class="feature-item">Create your first offboarding workflow</div>
                  <div class="feature-item">Start your 14-day free trial</div>
                </div>
                
                <p style="color: #64748b; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                  <strong>Security Note:</strong> If you didn't create an account with OffboardPro, you can safely ignore this email. This link will expire in 24 hours.
                </p>
              </div>
              <div class="footer">
                <p style="font-weight: 600; color: #0f172a;">OffboardPro</p>
                <p>Automate Employee Offboarding with Confidence</p>
                <p style="font-size: 12px; margin-top: 16px;">
                  © ${new Date().getFullYear()} OffboardPro. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
        
        result = await sendBrevoEmail({
          to: [to], // ✅ Wrap in array
          subject: 'Verify Your Email - OffboardPro',
          htmlContent,
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
        result = await sendTeamInvitationEmail(params)
        break
      case 'churn_alert':
        result = await sendChurnAlertEmail(params)
        break
      case 'exit_survey_invitation':
        result = await sendExitSurveyInvitationEmail(params)
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

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
          to: [to],
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
      
      // ✅ NEW CASE: Trial Ended Email
      case 'trial_ended':
        // Generate beautiful trial ended email
        const trialEndedHtml = `
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
                background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
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
              .highlight-box {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 20px;
                margin: 24px 0;
                border-radius: 8px;
              }
              .highlight-box p {
                margin: 0;
                color: #92400e;
                font-weight: 500;
              }
              .button { 
                display: inline-block; 
                padding: 16px 32px; 
                background: #7c3aed; 
                color: white !important; 
                text-decoration: none; 
                border-radius: 8px; 
                margin: 24px 0;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 6px rgba(124, 58, 237, 0.3);
              }
              .button:hover {
                background: #6d28d9;
              }
              .features {
                margin-top: 30px;
              }
              .feature-card {
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin: 16px 0;
              }
              .feature-card h3 {
                margin: 0 0 8px 0;
                color: #0f172a;
                font-size: 18px;
              }
              .feature-card p {
                margin: 0;
                color: #64748b;
                font-size: 14px;
              }
              .feature-card .price {
                font-size: 24px;
                font-weight: bold;
                color: #7c3aed;
                margin: 12px 0 8px 0;
              }
              .feature-card .discount {
                display: inline-block;
                background: #dcfce7;
                color: #166534;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
              }
              .free-features {
                background: #f1f5f9;
                padding: 20px;
                border-radius: 8px;
                margin: 24px 0;
              }
              .free-features h3 {
                margin: 0 0 12px 0;
                color: #0f172a;
              }
              .free-features ul {
                margin: 0;
                padding-left: 20px;
              }
              .free-features li {
                color: #475569;
                margin: 8px 0;
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
                <h1>⏰ Your Trial Has Ended</h1>
              </div>
              <div class="content">
                <p style="font-size: 18px; font-weight: 600; color: #0f172a;">Hi ${params.userName || 'there'}! 👋</p>
                
                <p>Your 14-day free trial of OffboardPro Professional has come to an end.</p>
                
                <div class="highlight-box">
                  <p>✨ Don't worry! You've been automatically moved to our Free plan, so you can continue using OffboardPro.</p>
                </div>
                
                <div class="free-features">
                  <h3>🎁 What's included in your Free plan:</h3>
                  <ul>
                    <li>Up to 5 team members</li>
                    <li>3 offboardings per month</li>
                    <li>Basic workflow automation</li>
                    <li>Task management</li>
                    <li>Email notifications</li>
                  </ul>
                </div>
                
                <p style="font-weight: 600; margin-top: 30px;">Ready for more? Upgrade to unlock:</p>
                
                <div class="features">
                  <div class="feature-card">
                    <h3>Professional Plan</h3>
                    <div class="price">$149/mo <span class="discount">20% OFF - Founding Member</span></div>
                    <p style="margin-bottom: 12px;">Perfect for growing teams</p>
                    <ul style="margin: 0; padding-left: 20px; color: #64748b;">
                      <li>100 team members</li>
                      <li>50 offboardings/month</li>
                      <li>🤖 AI-powered exit analysis</li>
                      <li>🔐 Security app scanning</li>
                      <li>📊 Advanced analytics</li>
                      <li>Exit surveys</li>
                      <li>Priority email support</li>
                    </ul>
                  </div>
                  
                  <div class="feature-card">
                    <h3>Enterprise Plan</h3>
                    <div class="price">$399/mo <span class="discount">20% OFF - Founding Member</span></div>
                    <p style="margin-bottom: 12px;">For large organizations</p>
                    <ul style="margin: 0; padding-left: 20px; color: #64748b;">
                      <li>Unlimited team members</li>
                      <li>Unlimited offboardings</li>
                      <li>All Professional features</li>
                      <li>API access</li>
                      <li>Custom workflows</li>
                      <li>Dedicated support</li>
                      <li>SSO/SAML (coming soon)</li>
                    </ul>
                  </div>
                </div>
                
                <center>
                  <a href="${params.upgradeLink || process.env.NEXT_PUBLIC_APP_URL + '/dashboard/settings/subscription'}" class="button">🚀 Upgrade Now & Save 20%</a>
                </center>
                
                <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
                  💰 <strong>Founding Member Offer:</strong> As one of our early users, you're eligible for 20% off FOR LIFE on any paid plan!
                </p>
                
                <p style="color: #64748b; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                  Have questions? Reply to this email or check out our <a href="${process.env.NEXT_PUBLIC_APP_URL}/help" style="color: #7c3aed;">Help Center</a>.
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
          to: [to],
          subject: '⏰ Your OffboardPro Trial Has Ended - Save 20% as a Founding Member!',
          htmlContent: trialEndedHtml,
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

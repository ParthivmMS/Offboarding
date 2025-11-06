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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...params } = body

    let result

    switch (type) {
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

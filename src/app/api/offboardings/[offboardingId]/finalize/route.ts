import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendExitSurveyInvitationEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: { offboardingId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get offboarding details
    const { data: offboarding, error: offboardingError } = await supabase
      .from('offboardings')
      .select(`
        *,
        organizations (
          name
        )
      `)
      .eq('id', params.offboardingId)
      .single()

    if (offboardingError || !offboarding) {
      return NextResponse.json({ error: 'Offboarding not found' }, { status: 404 })
    }

    // Mark as completed
    const { error: updateError } = await supabase
      .from('offboardings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', params.offboardingId)

    if (updateError) {
      console.error('Error updating offboarding:', updateError)
      return NextResponse.json({ error: 'Failed to complete offboarding' }, { status: 500 })
    }

    // Create survey token
    const token = crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

    const { error: tokenError } = await supabase
      .from('survey_tokens')
      .insert({
        token,
        offboarding_id: offboarding.id,
        organization_id: offboarding.organization_id,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })

    if (tokenError) {
      console.error('Error creating survey token:', tokenError)
      return NextResponse.json({ 
        success: true, 
        warning: 'Offboarding completed but survey token creation failed' 
      })
    }

    // Send exit survey email
    const surveyLink = `${process.env.NEXT_PUBLIC_APP_URL}/exit-survey/${token}`
    
    const emailResult = await sendExitSurveyInvitationEmail({
      to: [offboarding.employee_email],
      employeeName: offboarding.employee_name,
      organizationName: offboarding.organizations?.name || 'Your Organization',
      surveyLink,
      expiresInDays: 30
    })

    if (!emailResult.success) {
      console.error('Failed to send exit survey email:', emailResult.error)
      return NextResponse.json({ 
        success: true, 
        warning: 'Offboarding completed but email failed to send' 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Offboarding completed and exit survey sent' 
    })

  } catch (error: any) {
    console.error('Error finalizing offboarding:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

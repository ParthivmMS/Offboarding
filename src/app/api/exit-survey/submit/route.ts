import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      token,
      departure_reason,
      likelihood_to_recommend,
      would_return,
      would_return_reason,
      suggestions_for_improvement,
    } = body

    if (!token || !departure_reason || likelihood_to_recommend === undefined || would_return === null) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Validate token first
    const { data: surveyToken, error: tokenError } = await supabase
      .from('survey_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (tokenError || !surveyToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date(surveyToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 400 }
      )
    }

    // Check if already completed
    if (surveyToken.status === 'completed') {
      return NextResponse.json(
        { error: 'Survey already completed' },
        { status: 400 }
      )
    }

    // Save survey response (no submitted_by since this is public)
    const { error: surveyError } = await supabase
      .from('exit_surveys')
      .insert({
        offboarding_id: surveyToken.offboarding_id,
        organization_id: surveyToken.organization_id,
        departure_reason,
        likelihood_to_recommend,
        would_return,
        would_return_reason: would_return_reason || null,
        suggestions_for_improvement: suggestions_for_improvement || null,
        submitted_by: null, // Public survey, no user auth
      })

    if (surveyError) {
      console.error('Error saving survey:', surveyError)
      throw surveyError
    }

    // Mark token as completed
    const { error: updateError } = await supabase
      .from('survey_tokens')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('token', token)

    if (updateError) {
      console.error('Error updating token:', updateError)
    }

    // Trigger AI analysis (don't await, let it run async)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analyze-exits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: surveyToken.organization_id,
      }),
    }).catch(err => console.error('AI analysis trigger failed:', err))

    return NextResponse.json({
      success: true,
      message: 'Survey submitted successfully',
    })
  } catch (error: any) {
    console.error('Submit survey API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit survey' },
      { status: 500 }
    )
  }
}

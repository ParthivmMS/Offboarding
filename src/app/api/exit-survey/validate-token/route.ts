import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get token from database
    const { data: surveyToken, error } = await supabase
      .from('survey_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !surveyToken) {
      return NextResponse.json(
        { valid: false, error: 'Invalid token' },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (new Date(surveyToken.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Token has expired' },
        { status: 400 }
      )
    }

    // Check if already completed
    if (surveyToken.status === 'completed') {
      return NextResponse.json(
        { valid: false, error: 'Survey already completed' },
        { status: 400 }
      )
    }

    // Get offboarding details
    const { data: offboarding } = await supabase
      .from('offboardings')
      .select('employee_name, department, role, last_working_day')
      .eq('id', surveyToken.offboarding_id)
      .single()

    return NextResponse.json({
      valid: true,
      surveyToken: {
        id: surveyToken.id,
        offboardingId: surveyToken.offboarding_id,
        organizationId: surveyToken.organization_id,
        employeeName: surveyToken.employee_name,
        employeeEmail: surveyToken.employee_email,
        expiresAt: surveyToken.expires_at,
      },
      offboarding: offboarding || null,
    })
  } catch (error: any) {
    console.error('Validate token API error:', error)
    return NextResponse.json(
      { valid: false, error: error.message || 'Failed to validate token' },
      { status: 500 }
    )
  }
}

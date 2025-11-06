import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { offboardingId, organizationId, employeeEmail, employeeName } = body

    if (!offboardingId || !organizationId || !employeeEmail || !employeeName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if token already exists for this offboarding
    const { data: existingToken } = await supabase
      .from('survey_tokens')
      .select('*')
      .eq('offboarding_id', offboardingId)
      .single()

    if (existingToken) {
      // Return existing token if not completed
      if (existingToken.status === 'pending' && new Date(existingToken.expires_at) > new Date()) {
        return NextResponse.json({
          success: true,
          token: existingToken.token,
          alreadyExists: true,
        })
      }

      // If expired or completed, create new one
      await supabase
        .from('survey_tokens')
        .delete()
        .eq('offboarding_id', offboardingId)
    }

    // Create new token (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: newToken, error } = await supabase
      .from('survey_tokens')
      .insert({
        offboarding_id: offboardingId,
        organization_id: organizationId,
        employee_email: employeeEmail,
        employee_name: employeeName,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating survey token:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      token: newToken.token,
      expiresAt: newToken.expires_at,
    })
  } catch (error: any) {
    console.error('Create token API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create survey token' },
      { status: 500 }
    )
  }
}

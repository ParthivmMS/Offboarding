// src/app/api/auth/signup/route.ts
// FIXED VERSION - Creates user with trial fields from the start

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkTrialEligibility } from '@/lib/trial'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TRIAL_DURATION_DAYS = 14

export async function POST(request: Request) {
  console.log('🔥 SIGNUP STARTED')
  
  try {
    const { organizationName, name, email, password } = await request.json()
    
    console.log('📧 Email:', email)

    if (!organizationName || !name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check trial eligibility
    console.log('✅ Checking trial eligibility...')
    const eligibility = await checkTrialEligibility(email)
    
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: eligibility.reason || 'Not eligible for trial' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create auth user
    console.log('✅ Creating auth user...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        name,
        organization_name: organizationName,
      },
    })

    if (authError || !authData.user) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    const userId = authData.user.id
    const emailDomain = email.split('@')[1]?.toLowerCase() || ''
    const trialEndDate = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000)

    // ✅ CREATE USER WITH TRIAL FIELDS FROM THE START!
    console.log('✅ Creating user record WITH TRIAL...')
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: email,
        name: name,
        password_hash: 'supabase_auth',
        is_active: false,
        role: 'user',
        // ✅ TRIAL FIELDS
        subscription_plan: 'professional',
        subscription_status: 'trialing',
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEndDate.toISOString(),
        email_domain: emailDomain,
      })

    if (userInsertError) {
      console.error('❌ User insert error:', userInsertError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: `Database error: ${userInsertError.message}` },
        { status: 500 }
      )
    }

    // ✅ LOG TRIAL USAGE (optional - for tracking)
    try {
      await supabaseAdmin
        .from('trial_usage')
        .insert({
          user_id: userId,
          email: email.toLowerCase(),
          email_hash: btoa(email.toLowerCase()),
          email_domain: emailDomain,
          trial_started_at: new Date().toISOString()
        })
    } catch (logError) {
      console.warn('⚠️ Trial logging failed:', logError)
      // Don't fail signup if logging fails
    }

    console.log('✅ User created with Professional trial!')

    // Generate verification link
    console.log('✅ Generating verification link...')
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      password: password,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?orgName=${encodeURIComponent(organizationName)}`
      }
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('❌ Link generation error:', linkError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('users').delete().eq('id', userId)
      return NextResponse.json(
        { error: 'Failed to generate verification link' },
        { status: 500 }
      )
    }

    const verificationLink = linkData.properties.action_link

    // Send verification email
    console.log('✅ Sending verification email...')
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email_verification',
          to: email,
          data: {
            name: name,
            verificationLink: verificationLink,
            organizationName: organizationName,
          }
        })
      })

      if (!emailResponse.ok) {
        console.error('❌ Email failed:', await emailResponse.text())
      } else {
        console.log('✅ Email sent successfully!')
      }
    } catch (emailError) {
      console.error('❌ Email error:', emailError)
    }

    console.log('✅ ✅ ✅ SIGNUP COMPLETE!')

    return NextResponse.json({
      success: true,
      message: 'Account created! Check your email to verify and start your 14-day Professional trial.',
      requiresVerification: true,
    })
  } catch (error: any) {
    console.error('❌ Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

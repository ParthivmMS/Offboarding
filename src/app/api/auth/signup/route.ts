// src/app/api/auth/signup/route.ts
// FIXED - Let trigger handle user creation with trial

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkTrialEligibility } from '@/lib/trial'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

    // Check if user exists in auth
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingAuthUser?.users.some(u => u.email === email)

    if (userExists) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create auth user - trigger will automatically create public.users with trial!
    console.log('✅ Creating auth user (trigger will create public.users with trial)...')
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

    console.log('✅ User created by trigger with Professional trial!')

    // Wait for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verify user was created with trial
    const { data: userData, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('subscription_plan, subscription_status, trial_ends_at')
      .eq('id', userId)
      .single()

    if (userCheckError) {
      console.error('❌ User verification error:', userCheckError)
    } else {
      console.log('✅ Verified trial setup:', userData)
    }

    // Log trial usage (optional - for tracking)
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
      console.log('✅ Trial usage logged')
    } catch (logError) {
      console.warn('⚠️ Trial logging failed (non-critical):', logError)
    }

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
      // Clean up
      await supabaseAdmin.auth.admin.deleteUser(userId)
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

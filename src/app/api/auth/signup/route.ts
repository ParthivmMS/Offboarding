// src/app/api/auth/signup/route.ts
// DEBUG VERSION - Add console.logs everywhere

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkTrialEligibility, startTrial } from '@/lib/trial'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { organizationName, name, email, password } = await request.json()
    
    console.log('🚀 SIGNUP STARTED:', { email, name, organizationName })

    // Validations...
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

    // Trial check
    console.log('✅ Step 1: Checking trial eligibility...')
    const eligibility = await checkTrialEligibility(email)
    
    if (!eligibility.eligible) {
      console.log('❌ Trial not eligible:', eligibility.reason)
      return NextResponse.json(
        { error: eligibility.reason || 'Not eligible for trial' },
        { status: 400 }
      )
    }
    console.log('✅ Trial eligible!')

    // Check existing user
    console.log('✅ Step 2: Checking if user exists...')
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingUser) {
      console.log('❌ User already exists')
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }
    console.log('✅ User does not exist, proceeding...')

    // Create auth user
    console.log('✅ Step 3: Creating Supabase Auth user...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        name,
        organization_name: organizationName,
      },
    })

    if (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      console.error('❌ No user returned from auth')
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    const userId = authData.user.id
    console.log('✅ Auth user created:', userId)

    // Start trial
    console.log('✅ Step 4: Starting trial...')
    const trialStarted = await startTrial(userId, email)
    console.log('Trial started:', trialStarted)

    // Create user record
    console.log('✅ Step 5: Creating user record...')
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email,
        name: name,
        password_hash: 'supabase_auth',
        is_active: false,
        role: 'user',
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })

    if (userInsertError) {
      console.error('❌ User insert error:', userInsertError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: `Database error: ${userInsertError.message}` },
        { status: 500 }
      )
    }
    console.log('✅ User record created')

    // Generate verification link
    console.log('✅ Step 6: Generating verification link...')
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
    console.log('✅ Verification link generated:', verificationLink.substring(0, 50) + '...')

    // Send email - THE CRITICAL PART
    console.log('✅ Step 7: Sending verification email...')
    console.log('📧 Email API URL:', `${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`)
    console.log('📧 Email payload:', {
      type: 'email_verification',
      to: email,
      data: {
        name: name,
        verificationLink: verificationLink.substring(0, 50) + '...',
        organizationName: organizationName,
      }
    })

    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email_verification',
          to: email, // ← String, not array
          data: {
            name: name,
            verificationLink: verificationLink,
            organizationName: organizationName,
          }
        })
      })

      console.log('📬 Email API response status:', emailResponse.status)
      
      const emailResponseText = await emailResponse.text()
      console.log('📬 Email API response body:', emailResponseText)

      if (!emailResponse.ok) {
        console.error('❌ Email API returned error:', emailResponseText)
        throw new Error('Failed to send verification email')
      }

      console.log('✅ Verification email sent successfully!')
    } catch (emailError: any) {
      console.error('❌ Email send error:', emailError)
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('users').delete().eq('id', userId)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    console.log('✅ ✅ ✅ SIGNUP COMPLETE!')

    return NextResponse.json({
      success: true,
      message: 'Account created! Please check your email to verify and start your 14-day free trial.',
      requiresVerification: true,
    })
  } catch (error) {
    console.error('❌ Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

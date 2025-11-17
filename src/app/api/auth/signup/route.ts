import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkTrialEligibility, startTrial } from '@/lib/trial'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { organizationName, name, email, password } = await request.json()

    // Validate input
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

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 🆕 STEP 1: Check trial eligibility FIRST
    const eligibility = await checkTrialEligibility(email)
    
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: eligibility.reason || 'Not eligible for trial' },
        { status: 400 }
      )
    }

    // Step 2: Check if user already exists
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

    // Step 3: Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // 🔒 Requires email verification
      user_metadata: {
        name,
        organization_name: organizationName,
      },
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // 🆕 Step 4: Start trial immediately (will be activated after email verification)
    const trialStarted = await startTrial(userId, email)
    
    if (!trialStarted) {
      console.warn('⚠️ Trial start failed, but continuing with signup')
    }

    // Step 5: Create user record in public.users (trial info already set by startTrial)
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email,
        name: name,
        password_hash: 'supabase_auth',
        is_active: false, // 🔒 Will be activated after email verification
        role: 'user',
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })

    if (userInsertError) {
      console.error('User insert error:', userInsertError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: `Database error: ${userInsertError.message}` },
        { status: 500 }
      )
    }

    // Step 6: Generate verification link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      password: password,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?orgName=${encodeURIComponent(organizationName)}`
      }
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Link generation error:', linkError)
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('users').delete().eq('id', userId)
      return NextResponse.json(
        { error: 'Failed to generate verification link' },
        { status: 500 }
      )
    }

    const verificationLink = linkData.properties.action_link
    console.log('🔗 Verification link generated:', verificationLink)

    // Step 7: Send verification email via Brevo
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
        console.error('Email send failed:', await emailResponse.text())
        throw new Error('Failed to send verification email')
      }

      console.log('✅ Verification email sent to:', email)
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('users').delete().eq('id', userId)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    console.log('✅ Signup complete with trial:', {
      email,
      userId,
      trialStarted
    })

    return NextResponse.json({
      success: true,
      message: 'Account created! Please check your email to verify and start your 14-day free trial.',
      requiresVerification: true,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

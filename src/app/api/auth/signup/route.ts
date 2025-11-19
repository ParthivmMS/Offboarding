// src/app/api/auth/signup/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkTrialEligibility, startTrial } from '@/lib/trial'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { organizationName, name, email, password } = await request.json()

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

    // ✅ FIX: Let Supabase send verification email automatically!
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // ✅ Supabase will send verification email
      user_metadata: {
        name,
        organization_name: organizationName,
      },
      // ✅ Custom redirect after email verification
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?orgName=${encodeURIComponent(organizationName)}`
      }
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

    // Start trial
    const trialStarted = await startTrial(userId, email)
    
    if (!trialStarted) {
      console.warn('⚠️ Trial start failed, but continuing with signup')
    }

    // Create user record
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email,
        name: name,
        password_hash: 'supabase_auth',
        is_active: false, // Will be activated after verification
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

    // ✅ NO MANUAL EMAIL SENDING - Supabase handles it!
    console.log('✅ Signup complete! Supabase will send verification email to:', email)

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

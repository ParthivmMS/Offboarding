// src/app/api/auth/signup/route.ts
// DIAGNOSTIC VERSION v3 - Force email sending

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkTrialEligibility, startTrial } from '@/lib/trial'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  console.log('🔥🔥🔥 SIGNUP ROUTE CALLED - VERSION 3 🔥🔥🔥')
  
  try {
    const { organizationName, name, email, password } = await request.json()
    
    console.log('🚀 SIGNUP STARTED:', { email, name, organizationName })

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

    console.log('✅ Step 3: Creating Supabase Auth user...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Requires manual verification
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

    console.log('✅ Step 4: Starting trial...')
    const trialStarted = await startTrial(userId, email)
    console.log('Trial started:', trialStarted)

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
    console.log('✅ Verification link generated:', verificationLink.substring(0, 80))

    // ============================================
    // STEP 7: SEND EMAIL - CRITICAL SECTION
    // ============================================
    console.log('🔥🔥🔥 STARTING STEP 7 - EMAIL SENDING 🔥🔥🔥')
    console.log('📧 Email API URL:', `${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`)
    console.log('📧 Recipient:', email)
    console.log('📧 Organization:', organizationName)

    const emailPayload = {
      type: 'email_verification',
      to: email,
      data: {
        name: name,
        verificationLink: verificationLink,
        organizationName: organizationName,
      }
    }
    
    console.log('📧 Full email payload:', JSON.stringify(emailPayload, null, 2))

    try {
      console.log('📤 Calling email API...')
      
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload)
      })

      console.log('📬 Email API response status:', emailResponse.status)
      console.log('📬 Email API response ok:', emailResponse.ok)
      
      const emailResponseText = await emailResponse.text()
      console.log('📬 Email API response body:', emailResponseText)

      if (!emailResponse.ok) {
        console.error('❌❌❌ EMAIL API RETURNED ERROR ❌❌❌')
        console.error('Status:', emailResponse.status)
        console.error('Body:', emailResponseText)
        
        // DON'T fail signup - just log the error
        console.warn('⚠️ Email failed but continuing with signup')
      } else {
        console.log('✅✅✅ EMAIL SENT SUCCESSFULLY ✅✅✅')
      }
    } catch (emailError: any) {
      console.error('❌❌❌ EMAIL SEND EXCEPTION ❌❌❌')
      console.error('Error:', emailError)
      console.error('Error message:', emailError.message)
      console.error('Error stack:', emailError.stack)
      
      // DON'T fail signup - just log the error
      console.warn('⚠️ Email exception but continuing with signup')
    }

    console.log('🔥🔥🔥 STEP 7 COMPLETE 🔥🔥🔥')
    console.log('✅ ✅ ✅ SIGNUP COMPLETE!')

    return NextResponse.json({
      success: true,
      message: 'Account created! Please check your email (including spam folder) to verify.',
      requiresVerification: true,
    })
  } catch (error: any) {
    console.error('❌ Signup error:', error)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

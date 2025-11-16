// src/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get('token')
  const name = requestUrl.searchParams.get('name')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const error_code = requestUrl.searchParams.get('error_code')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('🔍 Callback invoked with params:', { code: !!code, type, token: !!token })

  const supabase = await createClient()

  // Handle errors
  if (error_code) {
    console.error('❌ Auth callback error:', error_description)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${error_description}`)
  }

  // CASE 1: Password Recovery with token_hash
  if (token_hash && type === 'recovery') {
    console.log('🔑 Processing password recovery')
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    })
    
    if (error) {
      console.error('❌ Token verification error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid or expired reset link`)
    }
    
    console.log('✅ Password recovery verified, redirecting to reset page')
    return NextResponse.redirect(`${requestUrl.origin}/reset-password`)
  }

  // CASE 2: OAuth code exchange (Google OAuth + password reset + email verification)
  if (code) {
    console.log('🔄 Exchanging OAuth code for session')
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('❌ Code exchange error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid or expired link`)
    }
    
    if (type === 'recovery') {
      console.log('🔑 Recovery type, redirecting to reset password')
      return NextResponse.redirect(`${requestUrl.origin}/reset-password`)
    }

    // Get current user (from Google OAuth or email verification)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('👤 Current user:', { 
      id: user?.id, 
      email: user?.email,
      hasUser: !!user,
      userError: userError?.message 
    })
    
    if (user) {
      // 🔍 ACCOUNT LINKING: Check if a user with this email already exists
      console.log('🔍 Checking for existing users with email:', user.email)
      const { data: existingUsers, error: queryError } = await supabase
        .from('users')
        .select('id, organization_id, current_organization_id, role, email')
        .eq('email', user.email)
        .order('created_at', { ascending: true })

      console.log('📊 Existing users found:', existingUsers?.length, existingUsers)

      if (queryError) {
        console.error('❌ Error checking existing user:', queryError)
      }

      let targetUser = null

      if (existingUsers && existingUsers.length > 0) {
        // Find the user with an organization
        targetUser = existingUsers.find(u => u.organization_id || u.current_organization_id)
        
        console.log('🎯 Target user with org:', targetUser)
        
        if (!targetUser) {
          targetUser = existingUsers[0]
          console.log('⚠️ No user with org, using oldest:', targetUser)
        }

        // If current Google auth user ID is different from the target user ID
        if (targetUser.id !== user.id) {
          console.log('🔗 LINKING ACCOUNTS')
          console.log(`  Email: ${user.email}`)
          console.log(`  Google Auth ID: ${user.id}`)
          console.log(`  Existing User ID: ${targetUser.id}`)
          console.log(`  Org ID: ${targetUser.organization_id}`)
          
          // Copy organization data from email account to Google OAuth account
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0],
              organization_id: targetUser.organization_id,
              current_organization_id: targetUser.current_organization_id,
              role: targetUser.role,
              is_active: true,
              password_hash: 'supabase_auth',
            }, {
              onConflict: 'id'
            })

          if (upsertError) {
            console.error('❌ Error upserting user:', upsertError)
          } else {
            console.log('✅ User upserted successfully')
          }

          // Add Google user to organization_members if target has org
          if (targetUser.organization_id) {
            const { error: memberError } = await supabase
              .from('organization_members')
              .upsert({
                user_id: user.id,
                organization_id: targetUser.organization_id,
                role: targetUser.role || 'admin',
                is_active: true,
              }, {
                onConflict: 'user_id,organization_id'
              })

            if (memberError) {
              console.error('❌ Error adding to org members:', memberError)
            } else {
              console.log('✅ Added to organization_members')
            }
          }

          console.log('✅ Successfully linked accounts. Redirecting to dashboard.')
          return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
        } else {
          console.log('ℹ️ User IDs match, no linking needed')
        }
      } else {
        console.log('ℹ️ No existing users found with this email')
      }

      // Check current user's organization status
      console.log('🔍 Checking user organization status')
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('organization_id, current_organization_id')
        .eq('id', user.id)
        .single()

      console.log('📊 User data:', userData, 'Error:', userDataError?.message)

      // If no organization, redirect to setup
      if (!userData?.organization_id && !userData?.current_organization_id) {
        console.log('⚠️ User has no organization, redirecting to setup')
        return NextResponse.redirect(`${requestUrl.origin}/setup-organization`)
      }

      // User has org - activate them and go to dashboard
      console.log('✅ User has organization, activating and redirecting to dashboard')
      console.log('   Org ID:', userData.organization_id)
      console.log('   Current Org ID:', userData.current_organization_id)
      
      await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', user.id)
        
      console.log('🎉 Redirecting to dashboard')
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    } else {
      console.log('⚠️ No user found after code exchange')
    }
  }

  // Get current user for invitation processing
  const { data: { user } } = await supabase.auth.getUser()

  // CASE 3: Team Invitation
  if (user && token) {
    console.log('📧 Processing team invitation')
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle()

    if (invitation) {
      console.log('✅ Found invitation:', invitation.id)
      await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: name || user.email?.split('@')[0],
          role: invitation.role,
          organization_id: invitation.organization_id,
          current_organization_id: invitation.organization_id,
          is_active: true,
          password_hash: 'supabase_auth',
        })

      await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id)
        
      console.log('✅ Invitation accepted')
    }
  }

  console.log('🔚 No specific case matched, redirecting to dashboard')
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}

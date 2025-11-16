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

  const supabase = await createClient()

  // Handle errors
  if (error_code) {
    console.error('Auth callback error:', error_description)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${error_description}`)
  }

  // CASE 1: Password Recovery with token_hash
  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    })
    
    if (error) {
      console.error('Token verification error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid or expired reset link`)
    }
    
    return NextResponse.redirect(`${requestUrl.origin}/reset-password`)
  }

  // CASE 2: OAuth code exchange (Google OAuth + password reset + email verification)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Code exchange error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid or expired link`)
    }
    
    if (type === 'recovery') {
      return NextResponse.redirect(`${requestUrl.origin}/reset-password`)
    }

    // Get current user (from Google OAuth or email verification)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // 🔍 ACCOUNT LINKING: Check if a user with this email already exists
      const { data: existingUsers, error: queryError } = await supabase
        .from('users')
        .select('id, organization_id, current_organization_id, role, email')
        .eq('email', user.email)
        .order('created_at', { ascending: true }) // Get oldest first

      if (queryError) {
        console.error('Error checking existing user:', queryError)
      }

      let targetUser = null

      if (existingUsers && existingUsers.length > 0) {
        // Find the user with an organization (the original email/password account)
        targetUser = existingUsers.find(u => u.organization_id || u.current_organization_id)
        
        if (!targetUser) {
          // No user with org found, use the oldest one
          targetUser = existingUsers[0]
        }

        // If current Google auth user ID is different from the target user ID
        if (targetUser.id !== user.id) {
          console.log(`🔗 Linking Google OAuth account to existing email account`)
          console.log(`  Email: ${user.email}`)
          console.log(`  Google Auth ID: ${user.id}`)
          console.log(`  Existing User ID: ${targetUser.id}`)
          
          // Copy organization data from email account to Google OAuth account
          await supabase
            .from('users')
            .upsert({
              id: user.id, // Google OAuth auth ID
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

          // Add Google user to organization_members if target has org
          if (targetUser.organization_id) {
            await supabase
              .from('organization_members')
              .upsert({
                user_id: user.id, // Google OAuth auth ID
                organization_id: targetUser.organization_id,
                role: targetUser.role || 'admin',
                is_active: true,
              }, {
                onConflict: 'user_id,organization_id'
              })
          }

          console.log(`✅ Successfully linked accounts. Redirecting to dashboard.`)
          return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
        }
      }

      // Check current user's organization status
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, current_organization_id')
        .eq('id', user.id)
        .single()

      // If no organization, redirect to setup
      if (!userData?.organization_id && !userData?.current_organization_id) {
        return NextResponse.redirect(`${requestUrl.origin}/setup-organization`)
      }

      // User has org - activate them and go to dashboard
      await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', user.id)
        
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    }
  }

  // Get current user for invitation processing
  const { data: { user } } = await supabase.auth.getUser()

  // CASE 3: Team Invitation - Process invitation acceptance
  if (user && token) {
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle()

    if (invitation) {
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
    }
  }

  // Default: Redirect to dashboard
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
